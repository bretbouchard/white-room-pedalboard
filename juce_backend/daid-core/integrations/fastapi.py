"""FastAPI integration for DAID provenance tracking."""

import time
from collections.abc import Callable
from typing import Any

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from ..python.daid_core import DAIDClient, ProvenanceRecord
from .base import BaseIntegration, IntegrationConfig


class DAIDService(BaseIntegration):
    """High-level DAID service for FastAPI applications."""

    async def initialize(self):
        """Initialize the DAID client."""
        if self._initialized:
            return

        self._client = DAIDClient(
            agent_id=self.config.agent_id,
            base_url=self.config.base_url,
            api_key=self.config.api_key,
            timeout=30.0,
        )
        self._initialized = True

    async def cleanup(self):
        """Clean up DAID client resources."""
        if self._client and hasattr(self._client, "close"):
            await self._client.close()
        self._initialized = False

    async def _track_operation_impl(
        self,
        entity_type: str,
        entity_id: str,
        operation: str,
        metadata: dict[str, Any],
        parent_daids: list[str],
        user_id: str | None,
        tags: list[str],
        batch: bool,
    ) -> str:
        """Track operation using DAID client."""
        record = ProvenanceRecord(
            entity_type=entity_type,
            entity_id=entity_id,
            operation=operation,
            metadata=metadata,
            parent_daids=parent_daids,
            agent_id=self.config.agent_id,
        )

        return await self._client.create_provenance_record(record)

    def extract_user_context(self, request: Request) -> str | None:
        """Extract user ID from FastAPI request."""
        # Try common patterns for user identification
        if hasattr(request.state, "user_id"):
            return request.state.user_id
        if hasattr(request.state, "user") and hasattr(request.state.user, "id"):
            return str(request.state.user.id)

        # Check headers
        user_id = request.headers.get("X-User-ID") or request.headers.get(
            "Authorization"
        )
        if user_id and user_id.startswith("Bearer "):
            # Extract user from JWT or similar - this is app-specific
            pass

        return user_id

    def extract_operation_metadata(
        self, request: Request, response: Response = None
    ) -> dict[str, Any]:
        """Extract metadata from FastAPI request/response."""
        metadata = {
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
            "client_host": request.client.host if request.client else None,
        }

        if response:
            metadata.update(
                {
                    "status_code": response.status_code,
                    "response_headers": dict(response.headers),
                }
            )

        return metadata

    def should_track_operation(self, request: Request) -> bool:
        """Determine if FastAPI request should be tracked."""
        # Skip health checks and static files
        if request.url.path in ["/health", "/metrics", "/favicon.ico"]:
            return False

        # Skip OPTIONS requests
        if request.method == "OPTIONS":
            return False

        return self.config.track_all_operations or request.method in [
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
        ]


class DAIDMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for automatic DAID tracking."""

    def __init__(
        self,
        app: ASGIApp,
        daid_service: DAIDService,
        track_requests: bool = True,
        track_responses: bool = True,
        entity_type_extractor: Callable[[Request], str] | None = None,
        entity_id_extractor: Callable[[Request], str] | None = None,
        operation_extractor: Callable[[Request], str] | None = None,
    ):
        super().__init__(app)
        self.daid_service = daid_service
        self.track_requests = track_requests
        self.track_responses = track_responses
        self.entity_type_extractor = (
            entity_type_extractor or self._default_entity_type_extractor
        )
        self.entity_id_extractor = (
            entity_id_extractor or self._default_entity_id_extractor
        )
        self.operation_extractor = (
            operation_extractor or self._default_operation_extractor
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with DAID tracking."""
        start_time = time.time()

        # Initialize service if needed
        if not self.daid_service._initialized:
            await self.daid_service.initialize()

        # Check if we should track this operation
        if not self.daid_service.should_track_operation(request):
            return await call_next(request)

        # Extract operation details
        entity_type = self.entity_type_extractor(request)
        entity_id = self.entity_id_extractor(request)
        operation = self.operation_extractor(request)
        user_id = self.daid_service.extract_user_context(request)

        # Track request if enabled
        request_daid = None
        if self.track_requests and entity_type and entity_id:
            request_metadata = self.daid_service.extract_operation_metadata(request)
            request_metadata["tracking_type"] = "request"

            request_daid = await self.daid_service.track_operation(
                entity_type=entity_type,
                entity_id=f"{entity_id}_request",
                operation=f"{operation}_request",
                metadata=request_metadata,
                user_id=user_id,
                tags=["http_request", request.method.lower()],
                batch=True,
            )

        # Process the request
        response = await call_next(request)

        # Track response if enabled
        if self.track_responses and entity_type and entity_id:
            processing_time = time.time() - start_time
            response_metadata = self.daid_service.extract_operation_metadata(
                request, response
            )
            response_metadata.update(
                {
                    "tracking_type": "response",
                    "processing_time_ms": processing_time * 1000,
                    "success": 200 <= response.status_code < 400,
                }
            )

            parent_daids = [request_daid] if request_daid else []

            await self.daid_service.track_operation(
                entity_type=entity_type,
                entity_id=f"{entity_id}_response",
                operation=f"{operation}_response",
                metadata=response_metadata,
                parent_daids=parent_daids,
                user_id=user_id,
                tags=["http_response", str(response.status_code)],
                batch=True,
            )

        return response

    def _default_entity_type_extractor(self, request: Request) -> str:
        """Extract entity type from request path."""
        path_parts = request.url.path.strip("/").split("/")
        if len(path_parts) >= 2 and path_parts[0] == "api":
            return path_parts[1]  # /api/documents -> documents
        elif path_parts:
            return path_parts[0]  # /documents -> documents
        return "api_call"

    def _default_entity_id_extractor(self, request: Request) -> str:
        """Extract entity ID from request."""
        path_parts = request.url.path.strip("/").split("/")

        # Look for ID-like path segments (numeric or UUID-like)
        for part in path_parts:
            if part.isdigit() or (len(part) > 10 and "-" in part):
                return part

        # Fallback to path-based ID
        return f"{request.method}_{request.url.path.replace('/', '_')}"

    def _default_operation_extractor(self, request: Request) -> str:
        """Extract operation from HTTP method."""
        method_mapping = {
            "GET": "read",
            "POST": "create",
            "PUT": "update",
            "PATCH": "update",
            "DELETE": "delete",
        }
        return method_mapping.get(request.method, "unknown")


# Convenience function for easy setup
def setup_daid_integration(
    app,
    agent_id: str,
    base_url: str | None = None,
    api_key: str | None = None,
    **kwargs,
) -> DAIDService:
    """Set up DAID integration for a FastAPI app."""
    config = IntegrationConfig(
        agent_id=agent_id, base_url=base_url, api_key=api_key, **kwargs
    )

    service = DAIDService(config)
    DAIDMiddleware(app, service)
    app.add_middleware(DAIDMiddleware, daid_service=service)

    return service

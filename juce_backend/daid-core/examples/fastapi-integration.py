"""
FastAPI Integration Example

This example shows how to integrate DAID Core into a FastAPI application
with automatic provenance tracking, health monitoring, and WebSocket support.
"""

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# DAID Core imports
from daid_core import UnifiedDAIDClient, UnifiedDAIDConfig
from daid_core.integrations.base import IntegrationConfig
from daid_core.integrations.fastapi import (
    DAIDService,
)
from daid_core.integrations.websocket import DAIDTrackingMiddleware


# Pydantic models for API
class DocumentCreate(BaseModel):
    title: str
    content: str
    tags: list[str] | None = []


class DocumentResponse(BaseModel):
    id: str
    title: str
    content: str
    tags: list[str]
    daid: str


class HealthResponse(BaseModel):
    status: str
    daid_health: dict
    uptime: float


# Global DAID service instance
daid_service: DAIDService | None = None
websocket_middleware: DAIDTrackingMiddleware | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management with DAID initialization."""
    global daid_service, websocket_middleware

    print("Starting FastAPI application with DAID integration...")

    # Initialize DAID service
    config = UnifiedDAIDConfig(
        agent_id=os.getenv("DAID_AGENT_ID", "fastapi-example-v1"),
        base_url=os.getenv("DAID_BASE_URL", "http://localhost:8080"),
        api_key=os.getenv("DAID_API_KEY"),
        enable_batching=True,
        enable_caching=True,
        enable_health_monitoring=True,
        batch_size=int(os.getenv("DAID_BATCH_SIZE", "100")),
        batch_timeout=float(os.getenv("DAID_BATCH_TIMEOUT", "1.0")),
        system_component="fastapi-api",
        default_tags=["api", "example"],
    )

    # Create unified client
    unified_client = UnifiedDAIDClient(config)
    await unified_client.initialize()

    # Create integration service
    integration_config = IntegrationConfig(
        agent_id=config.agent_id,
        base_url=config.base_url,
        api_key=config.api_key,
        batch_size=config.batch_size,
        batch_timeout=config.batch_timeout,
        track_all_operations=True,
        system_component="fastapi-integration",
    )

    daid_service = DAIDService(integration_config)
    await daid_service.initialize()

    # Initialize WebSocket middleware
    websocket_middleware = DAIDTrackingMiddleware(integration_config)
    await websocket_middleware.initialize()

    # Store clients in app state
    app.state.unified_client = unified_client
    app.state.daid_service = daid_service
    app.state.websocket_middleware = websocket_middleware

    print("DAID integration initialized successfully!")

    yield

    # Cleanup
    print("Shutting down DAID integration...")
    await unified_client.cleanup()
    await daid_service.cleanup()
    await websocket_middleware.cleanup()


# Create FastAPI app
app = FastAPI(
    title="DAID Core FastAPI Example",
    description="Example FastAPI application with DAID provenance tracking",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Add DAID middleware (will be configured during lifespan startup)
@app.middleware("http")
async def daid_tracking_middleware(request, call_next):
    """Custom DAID tracking middleware."""
    if hasattr(app.state, "daid_service") and app.state.daid_service:
        # Extract operation details
        entity_type = request.url.path.strip("/").split("/")[0] or "api"
        entity_id = f"{request.method}_{request.url.path.replace('/', '_')}"
        operation = {
            "GET": "read",
            "POST": "create",
            "PUT": "update",
            "PATCH": "update",
            "DELETE": "delete",
        }.get(request.method, "unknown")

        # Track the request
        start_time = asyncio.get_event_loop().time()

        try:
            response = await call_next(request)

            # Track successful operation
            await app.state.daid_service.track_operation(
                entity_type=entity_type,
                entity_id=entity_id,
                operation=operation,
                metadata={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "processing_time": (asyncio.get_event_loop().time() - start_time)
                    * 1000,
                    "success": 200 <= response.status_code < 400,
                },
                tags=["http_request", request.method.lower()],
                batch=True,
            )

            return response

        except Exception as e:
            # Track failed operation
            await app.state.daid_service.track_operation(
                entity_type=entity_type,
                entity_id=entity_id,
                operation=f"{operation}_failed",
                metadata={
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(e),
                    "processing_time": (asyncio.get_event_loop().time() - start_time)
                    * 1000,
                    "success": False,
                },
                tags=["http_request", "error", request.method.lower()],
                batch=True,
            )
            raise
    else:
        return await call_next(request)


# API Routes
@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "DAID Core FastAPI Example", "version": "1.0.0"}


@app.post("/documents", response_model=DocumentResponse)
async def create_document(document: DocumentCreate):
    """Create a new document with DAID tracking."""
    try:
        # Simulate document creation
        doc_id = f"doc_{len(document.title)}{hash(document.content) % 10000}"

        # Create DAID for the document
        result = await app.state.unified_client.create_daid(
            entity_type="document",
            entity_id=doc_id,
            operation="create",
            metadata={
                "title": document.title,
                "content_length": len(document.content),
                "tags": document.tags,
            },
            tags=["document", "user_created"] + document.tags,
        )

        if not result.success:
            raise HTTPException(
                status_code=500, detail=f"DAID creation failed: {result.error}"
            )

        return DocumentResponse(
            id=doc_id,
            title=document.title,
            content=document.content,
            tags=document.tags,
            daid=result.daid,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    """Get a document by ID with DAID tracking."""
    # Track the read operation
    result = await app.state.unified_client.create_daid(
        entity_type="document",
        entity_id=doc_id,
        operation="read",
        metadata={"access_type": "api_get"},
        tags=["document", "read_access"],
    )

    # Simulate document retrieval
    return DocumentResponse(
        id=doc_id,
        title=f"Document {doc_id}",
        content="Sample content",
        tags=["sample"],
        daid=result.daid or "unknown",
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with DAID system status."""
    try:
        # Perform DAID health check
        health_result = await app.state.unified_client.perform_health_check()

        # Get client statistics
        stats = app.state.unified_client.get_stats()

        return HealthResponse(
            status="healthy" if health_result.success else "unhealthy",
            daid_health={
                "health_check_success": health_result.success,
                "health_data": health_result.health if health_result.success else None,
                "error": health_result.error if not health_result.success else None,
                "stats": stats,
            },
            uptime=stats.get("operations_count", 0),
        )

    except Exception as e:
        return HealthResponse(status="error", daid_health={"error": str(e)}, uptime=0)


@app.get("/daid/stats")
async def get_daid_stats():
    """Get DAID system statistics."""
    return app.state.unified_client.get_stats()


# WebSocket endpoint for real-time DAID tracking
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint with automatic DAID tracking."""
    await websocket.accept()

    try:
        while True:
            # Receive message
            data = await websocket.receive_json()

            # Track the WebSocket message
            if app.state.websocket_middleware:
                daid = await app.state.websocket_middleware.track_message(
                    message=data,
                    user_id=data.get("user_id"),
                    connection_id=str(id(websocket)),
                )

                # Send response with DAID
                response = {
                    "type": "response",
                    "data": {"message": "Message received and tracked"},
                    "daid": daid,
                    "timestamp": asyncio.get_event_loop().time(),
                }
            else:
                response = {
                    "type": "response",
                    "data": {"message": "Message received (no DAID tracking)"},
                    "timestamp": asyncio.get_event_loop().time(),
                }

            await websocket.send_json(response)

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()


if __name__ == "__main__":
    import uvicorn

    # Load environment variables
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"Starting FastAPI server on {host}:{port}")
    print("DAID Configuration:")
    print(f"  Agent ID: {os.getenv('DAID_AGENT_ID', 'fastapi-example-v1')}")
    print(f"  Base URL: {os.getenv('DAID_BASE_URL', 'http://localhost:8080')}")
    print(f"  Batch Size: {os.getenv('DAID_BATCH_SIZE', '100')}")

    uvicorn.run(
        "fastapi-integration:app", host=host, port=port, reload=True, log_level="info"
    )

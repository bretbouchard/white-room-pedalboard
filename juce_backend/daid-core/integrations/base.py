"""Base integration classes and utilities."""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class IntegrationConfig:
    """Configuration for DAID integrations."""

    agent_id: str
    base_url: str | None = None
    api_key: str | None = None
    batch_size: int = 100
    batch_timeout: float = 1.0
    cache_ttl: int = 300
    enable_health_monitoring: bool = True
    enable_auto_recovery: bool = True
    track_all_operations: bool = False
    privacy_level: str = "private"
    system_component: str = "integration"
    default_tags: list[str] = None

    def __post_init__(self):
        if self.default_tags is None:
            self.default_tags = []


class BaseIntegration(ABC):
    """Base class for DAID integrations."""

    def __init__(self, config: IntegrationConfig):
        self.config = config
        self._client = None
        self._initialized = False

    @abstractmethod
    async def initialize(self):
        """Initialize the integration."""
        pass

    @abstractmethod
    async def cleanup(self):
        """Clean up resources."""
        pass

    @property
    def client(self):
        """Get the DAID client instance."""
        if not self._initialized:
            raise RuntimeError("Integration not initialized. Call initialize() first.")
        return self._client

    async def track_operation(
        self,
        entity_type: str,
        entity_id: str,
        operation: str = "create",
        metadata: dict[str, Any] | None = None,
        parent_daids: list[str] | None = None,
        user_id: str | None = None,
        tags: list[str] | None = None,
        batch: bool = True,
    ) -> str | None:
        """Track an operation with DAID provenance."""
        try:
            if not self._initialized:
                logger.warning("Integration not initialized. Skipping DAID tracking.")
                return None

            # Combine default tags with operation-specific tags
            all_tags = self.config.default_tags.copy()
            if tags:
                all_tags.extend(tags)

            # Use integration-specific client method
            return await self._track_operation_impl(
                entity_type=entity_type,
                entity_id=entity_id,
                operation=operation,
                metadata=metadata or {},
                parent_daids=parent_daids or [],
                user_id=user_id,
                tags=all_tags,
                batch=batch,
            )

        except Exception as e:
            logger.error(f"Failed to track DAID operation: {e}")
            return None

    @abstractmethod
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
        """Implementation-specific operation tracking."""
        pass

    def extract_user_context(self, request: Any) -> str | None:
        """Extract user context from request. Override in subclasses."""
        return None

    def extract_operation_metadata(
        self, request: Any, response: Any = None
    ) -> dict[str, Any]:
        """Extract operation metadata. Override in subclasses."""
        return {}

    def should_track_operation(self, request: Any) -> bool:
        """Determine if operation should be tracked. Override in subclasses."""
        return self.config.track_all_operations

"""WebSocket integration for DAID provenance tracking."""

import json
import time
from collections.abc import Callable
from datetime import datetime
from typing import Any

from ..python.daid_core import DAIDClient, ProvenanceRecord
from .base import BaseIntegration, IntegrationConfig


class DAIDTrackingMiddleware(BaseIntegration):
    """WebSocket middleware for automatic DAID provenance tracking."""

    def __init__(
        self,
        config: IntegrationConfig,
        message_type_extractor: Callable[[dict], str] | None = None,
        entity_extractor: Callable[[dict], tuple[str, str]] | None = None,
        operation_extractor: Callable[[dict], str] | None = None,
    ):
        super().__init__(config)
        self.message_type_extractor = (
            message_type_extractor or self._default_message_type_extractor
        )
        self.entity_extractor = entity_extractor or self._default_entity_extractor
        self.operation_extractor = (
            operation_extractor or self._default_operation_extractor
        )
        self.tracking_rules = self._initialize_tracking_rules()

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

    def _initialize_tracking_rules(self) -> dict[str, dict[str, Any]]:
        """Initialize message tracking rules."""
        return {
            # Audio/DAW specific messages
            "track_created": {
                "entity_type": "track",
                "operation": "create",
                "extract_id": lambda msg: msg.get("data", {}).get("track_id"),
                "priority": "high",
            },
            "track_updated": {
                "entity_type": "track",
                "operation": "update",
                "extract_id": lambda msg: msg.get("data", {}).get("track_id"),
                "priority": "high",
            },
            "plugin_added": {
                "entity_type": "plugin",
                "operation": "create",
                "extract_id": lambda msg: msg.get("data", {}).get("plugin_id"),
                "priority": "medium",
            },
            "parameter_changed": {
                "entity_type": "parameter",
                "operation": "update",
                "extract_id": lambda msg: f"{msg.get('data', {}).get('plugin_id')}_{msg.get('data', {}).get('parameter_name')}",
                "priority": "low",
            },
            "automation_recorded": {
                "entity_type": "automation",
                "operation": "create",
                "extract_id": lambda msg: msg.get("data", {}).get("automation_id"),
                "priority": "medium",
            },
            "project_saved": {
                "entity_type": "project",
                "operation": "update",
                "extract_id": lambda msg: msg.get("data", {}).get("project_id"),
                "priority": "high",
            },
            "ai_suggestion_generated": {
                "entity_type": "ai_suggestion",
                "operation": "create",
                "extract_id": lambda msg: msg.get("data", {}).get("suggestion_id"),
                "priority": "high",
            },
            "user_action": {
                "entity_type": "user_action",
                "operation": "user_interaction",
                "extract_id": lambda msg: f"action_{msg.get('timestamp', time.time())}",
                "priority": "low",
            },
        }

    async def track_message(
        self,
        message: dict[str, Any] | str,
        user_id: str | None = None,
        connection_id: str | None = None,
        parent_daids: list[str] | None = None,
    ) -> str | None:
        """Track a WebSocket message with DAID provenance."""
        try:
            if not self._initialized:
                await self.initialize()

            # Parse message if it's a string
            if isinstance(message, str):
                try:
                    message = json.loads(message)
                except json.JSONDecodeError:
                    message = {"raw_message": message, "type": "raw"}

            # Extract message details
            message_type = self.message_type_extractor(message)
            entity_type, entity_id = self.entity_extractor(message)
            operation = self.operation_extractor(message)

            if not entity_type or not entity_id:
                if self.config.track_all_operations:
                    # Track as generic message
                    return await self._track_generic_message(
                        message, user_id, connection_id
                    )
                return None

            # Build operation metadata
            operation_metadata = {
                "message_type": message_type,
                "message_data": message.get("data", {}),
                "timestamp": message.get("timestamp", datetime.utcnow().isoformat()),
                "connection_id": connection_id,
                "websocket_tracking": True,
            }

            # Add rule-specific metadata
            if message_type in self.tracking_rules:
                rule = self.tracking_rules[message_type]
                operation_metadata["priority"] = rule.get("priority", "medium")
                operation_metadata["rule_matched"] = message_type

            # Generate tags
            tags = self._generate_tags(message_type, message)

            # Track the operation
            return await self.track_operation(
                entity_type=entity_type,
                entity_id=entity_id,
                operation=operation,
                metadata=operation_metadata,
                parent_daids=parent_daids or [],
                user_id=user_id,
                tags=tags,
                batch=True,
            )

        except Exception as e:
            print(
                f"Failed to track DAID for WebSocket message {message.get('type', 'unknown')}: {e}"
            )
            return None

    async def _track_generic_message(
        self,
        message: dict[str, Any],
        user_id: str | None = None,
        connection_id: str | None = None,
    ) -> str | None:
        """Track a generic message when comprehensive tracking is enabled."""
        try:
            message_id = message.get("id") or f"msg_{int(time.time() * 1000)}"

            return await self.track_operation(
                entity_type="user_action",
                entity_id=f"message_{message_id}",
                operation="user_interaction",
                metadata={
                    "message_type": message.get("type", "unknown"),
                    "message_data": message.get("data", {}),
                    "timestamp": message.get("timestamp"),
                    "connection_id": connection_id,
                    "generic_tracking": True,
                },
                user_id=user_id,
                tags=["generic_message", message.get("type", "unknown")],
                batch=True,
            )
        except Exception as e:
            print(f"Failed to track generic DAID message: {e}")
            return None

    def _default_message_type_extractor(self, message: dict[str, Any]) -> str:
        """Extract message type from message."""
        return message.get("type", "unknown")

    def _default_entity_extractor(self, message: dict[str, Any]) -> tuple[str, str]:
        """Extract entity type and ID from message."""
        message_type = message.get("type", "unknown")

        # Check tracking rules first
        if message_type in self.tracking_rules:
            rule = self.tracking_rules[message_type]
            entity_type = rule["entity_type"]
            entity_id = rule["extract_id"](message)
            if entity_id:
                return entity_type, str(entity_id)

        # Fallback extraction
        data = message.get("data", {})

        # Look for common ID patterns
        for id_field in ["id", "track_id", "plugin_id", "project_id", "user_id"]:
            if id_field in data:
                entity_type = (
                    id_field.replace("_id", "")
                    if id_field.endswith("_id")
                    else "entity"
                )
                return entity_type, str(data[id_field])

        return "user_action", f"action_{message.get('timestamp', time.time())}"

    def _default_operation_extractor(self, message: dict[str, Any]) -> str:
        """Extract operation from message."""
        message_type = message.get("type", "unknown")

        # Check tracking rules
        if message_type in self.tracking_rules:
            return self.tracking_rules[message_type]["operation"]

        # Infer from message type
        if "create" in message_type or "add" in message_type:
            return "create"
        elif "update" in message_type or "change" in message_type:
            return "update"
        elif "delete" in message_type or "remove" in message_type:
            return "delete"
        else:
            return "user_interaction"

    def _generate_tags(self, message_type: str, message: dict[str, Any]) -> list[str]:
        """Generate tags for the message."""
        tags = ["websocket_message", message_type]

        # Add priority tag if available
        if message_type in self.tracking_rules:
            priority = self.tracking_rules[message_type].get("priority", "medium")
            tags.append(f"priority_{priority}")

        # Add data-specific tags
        data = message.get("data", {})
        if "track_id" in data:
            tags.append("track_operation")
        if "plugin_id" in data:
            tags.append("plugin_operation")
        if "ai" in message_type.lower():
            tags.append("ai_operation")

        return tags

    def should_track_message(self, message: dict[str, Any]) -> bool:
        """Determine if message should be tracked."""
        message_type = message.get("type", "unknown")

        # Always track high-priority messages
        if message_type in self.tracking_rules:
            priority = self.tracking_rules[message_type].get("priority", "medium")
            if priority == "high":
                return True

        # Track based on configuration
        return self.config.track_all_operations

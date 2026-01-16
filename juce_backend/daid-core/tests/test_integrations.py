"""
Tests for DAID Core integrations (FastAPI, WebSocket, decorators)
"""

import asyncio
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI

from daid_core.integrations.base import IntegrationConfig
from daid_core.integrations.decorators import (
    get_global_client,
    initialize_global_client,
    track_provenance,
)
from daid_core.integrations.fastapi import DAIDMiddleware, DAIDService
from daid_core.integrations.websocket import DAIDTrackingMiddleware


@pytest.fixture
def integration_config():
    """Basic integration configuration."""
    return IntegrationConfig(
        agent_id="test-integration-v1",
        base_url="http://localhost:8080",
        api_key="test-key",
        batch_size=10,
        batch_timeout=0.1,
        track_all_operations=True,
        system_component="test-integration",
    )


@pytest.mark.asyncio
class TestDAIDService:
    """Test suite for DAIDService integration."""

    async def test_service_initialization(self, integration_config):
        """Test service initialization and cleanup."""
        service = DAIDService(integration_config)
        assert not service._initialized

        await service.initialize()
        assert service._initialized
        assert service.client is not None

        await service.cleanup()
        assert not service._initialized

    async def test_track_operation(self, integration_config):
        """Test operation tracking."""
        service = DAIDService(integration_config)
        await service.initialize()

        try:
            daid = await service.track_operation(
                entity_type="test_entity",
                entity_id="test-001",
                operation="create",
                metadata={"test": "data"},
                tags=["integration-test"],
                batch=False,
            )

            assert daid is not None
            assert daid.startswith("daid:")

        finally:
            await service.cleanup()

    async def test_should_track_operation(self, integration_config):
        """Test operation tracking decision logic."""
        service = DAIDService(integration_config)

        # Mock request objects
        health_request = MagicMock()
        health_request.url.path = "/health"
        health_request.method = "GET"

        api_request = MagicMock()
        api_request.url.path = "/api/users"
        api_request.method = "POST"

        options_request = MagicMock()
        options_request.url.path = "/api/test"
        options_request.method = "OPTIONS"

        # Health check should not be tracked
        assert not service.should_track_operation(health_request)

        # OPTIONS should not be tracked
        assert not service.should_track_operation(options_request)

        # API POST should be tracked
        assert service.should_track_operation(api_request)


@pytest.mark.asyncio
class TestWebSocketMiddleware:
    """Test suite for WebSocket DAID tracking middleware."""

    async def test_middleware_initialization(self, integration_config):
        """Test middleware initialization."""
        middleware = DAIDTrackingMiddleware(integration_config)
        assert not middleware._initialized

        await middleware.initialize()
        assert middleware._initialized

        await middleware.cleanup()
        assert not middleware._initialized

    async def test_track_message(self, integration_config):
        """Test WebSocket message tracking."""
        middleware = DAIDTrackingMiddleware(integration_config)
        await middleware.initialize()

        try:
            # Test structured message
            message = {
                "type": "track_created",
                "data": {"track_id": "track-123", "name": "Test Track"},
                "timestamp": "2023-01-01T00:00:00Z",
            }

            daid = await middleware.track_message(
                message=message, user_id="user-456", connection_id="conn-789"
            )

            assert daid is not None
            assert daid.startswith("daid:")

        finally:
            await middleware.cleanup()

    async def test_message_type_extraction(self, integration_config):
        """Test message type extraction logic."""
        middleware = DAIDTrackingMiddleware(integration_config)

        # Test various message formats
        test_cases = [
            ({"type": "track_created"}, "track_created"),
            ({"message_type": "user_action"}, "user_action"),
            ({}, "unknown"),
            (
                {"type": "plugin_added", "data": {"plugin_id": "reverb-1"}},
                "plugin_added",
            ),
        ]

        for message, expected_type in test_cases:
            extracted_type = middleware.message_type_extractor(message)
            assert extracted_type == expected_type

    async def test_entity_extraction(self, integration_config):
        """Test entity type and ID extraction."""
        middleware = DAIDTrackingMiddleware(integration_config)

        # Test track creation message
        track_message = {"type": "track_created", "data": {"track_id": "track-123"}}

        entity_type, entity_id = middleware.entity_extractor(track_message)
        assert entity_type == "track"
        assert entity_id == "track-123"

        # Test generic message
        generic_message = {"type": "unknown_type", "data": {"some_id": "test-456"}}

        entity_type, entity_id = middleware.entity_extractor(generic_message)
        # Should fall back to user_action with timestamp-based ID
        assert entity_type == "user_action"
        assert "action_" in entity_id

    async def test_batch_message_tracking(self, integration_config):
        """Test batch processing of WebSocket messages."""
        middleware = DAIDTrackingMiddleware(integration_config)
        await middleware.initialize()

        try:
            # Track multiple messages
            messages = [
                {"type": "track_created", "data": {"track_id": f"track-{i}"}}
                for i in range(5)
            ]

            daids = []
            for message in messages:
                daid = await middleware.track_message(message, batch=True)
                daids.append(daid)

            # All should succeed
            assert all(daid is not None for daid in daids)
            assert all(daid.startswith("daid:") for daid in daids)

        finally:
            await middleware.cleanup()


@pytest.mark.asyncio
class TestDecorators:
    """Test suite for DAID decorators."""

    def test_global_client_management(self):
        """Test global client initialization and retrieval."""
        # Initially no client
        assert get_global_client() is None

        # Initialize global client
        client = initialize_global_client(
            agent_id="test-decorator-agent", base_url="http://localhost:8080"
        )

        assert client is not None
        assert get_global_client() is client

    async def test_async_function_tracking(self):
        """Test decorator on async functions."""
        # Initialize global client
        initialize_global_client(
            agent_id="test-decorator-agent", base_url="http://localhost:8080"
        )

        @track_provenance(
            entity_type="test_function",
            operation="execute",
            entity_id_extractor=lambda data: data.get("id", "default"),
            metadata_extractor=lambda data, result=None, **kwargs: {
                "input_data": data,
                "result_available": result is not None,
            },
        )
        async def test_async_function(data):
            """Test async function with DAID tracking."""
            return {"processed": data, "status": "success"}

        # Call the decorated function
        result = await test_async_function({"id": "test-123", "value": 42})

        # Function should execute normally
        assert result["processed"]["id"] == "test-123"
        assert result["status"] == "success"

    def test_sync_function_tracking(self):
        """Test decorator on sync functions."""
        # Initialize global client
        initialize_global_client(
            agent_id="test-decorator-agent", base_url="http://localhost:8080"
        )

        @track_provenance(entity_type="sync_function", operation="execute")
        def test_sync_function(data):
            """Test sync function with DAID tracking."""
            return {"processed": data}

        # Call the decorated function
        result = test_sync_function({"test": "data"})

        # Function should execute normally (tracking is skipped for sync functions)
        assert result["processed"]["test"] == "data"

    async def test_decorator_error_handling(self):
        """Test decorator behavior with function errors."""
        initialize_global_client(
            agent_id="test-decorator-agent", base_url="http://localhost:8080"
        )

        @track_provenance(
            entity_type="error_function", operation="execute", track_errors=True
        )
        async def failing_function():
            """Function that raises an error."""
            raise ValueError("Test error")

        # Function should still raise the error
        with pytest.raises(ValueError, match="Test error"):
            await failing_function()

    async def test_decorator_without_client(self):
        """Test decorator behavior when no global client is set."""
        # Clear global client
        import daid_core.integrations.decorators

        daid_core.integrations.decorators._global_client = None

        @track_provenance(entity_type="no_client_function", operation="execute")
        async def test_function():
            return "success"

        # Should execute normally without tracking
        result = await test_function()
        assert result == "success"


@pytest.mark.asyncio
class TestFastAPIIntegration:
    """Test FastAPI integration scenarios."""

    def test_fastapi_middleware_setup(self, integration_config):
        """Test FastAPI middleware setup."""
        app = FastAPI()
        service = DAIDService(integration_config)

        # Create middleware
        middleware = DAIDMiddleware(
            app=app, daid_service=service, track_requests=True, track_responses=True
        )

        assert middleware.daid_service is service
        assert middleware.track_requests is True
        assert middleware.track_responses is True

    def test_entity_extractors(self, integration_config):
        """Test default entity extractors."""
        app = FastAPI()
        service = DAIDService(integration_config)
        middleware = DAIDMiddleware(app, service)

        # Mock request
        request = MagicMock()
        request.url.path = "/api/v1/documents/123"
        request.method = "GET"

        # Test entity type extraction
        entity_type = middleware._default_entity_type_extractor(request)
        assert entity_type == "v1"  # Second path segment after 'api'

        # Test entity ID extraction
        entity_id = middleware._default_entity_id_extractor(request)
        assert "123" in entity_id  # Should find the ID-like segment

        # Test operation extraction
        operation = middleware._default_operation_extractor(request)
        assert operation == "read"  # GET -> read


@pytest.mark.asyncio
class TestIntegrationPerformance:
    """Performance tests for integrations."""

    async def test_high_volume_websocket_tracking(self, integration_config):
        """Test WebSocket tracking under high volume."""
        middleware = DAIDTrackingMiddleware(integration_config)
        await middleware.initialize()

        try:
            import time

            start_time = time.time()

            # Track many messages
            tasks = []
            for i in range(100):
                message = {
                    "type": "parameter_changed",
                    "data": {
                        "plugin_id": f"plugin-{i % 10}",
                        "parameter_name": "volume",
                        "value": i / 100.0,
                    },
                }
                task = middleware.track_message(message, batch=True)
                tasks.append(task)

            results = await asyncio.gather(*tasks)

            end_time = time.time()
            duration = end_time - start_time

            # All should succeed
            assert all(daid is not None for daid in results)

            # Should complete reasonably quickly
            assert duration < 2.0  # 2 seconds for 100 messages

            print(f"WebSocket performance: {len(results)} messages in {duration:.2f}s")

        finally:
            await middleware.cleanup()

    async def test_concurrent_service_operations(self, integration_config):
        """Test concurrent operations on DAID service."""
        service = DAIDService(integration_config)
        await service.initialize()

        try:
            # Create many concurrent operations
            tasks = []
            for i in range(50):
                task = service.track_operation(
                    entity_type="concurrent_test",
                    entity_id=f"concurrent-{i}",
                    operation="create",
                    batch=True,
                )
                tasks.append(task)

            results = await asyncio.gather(*tasks)

            # All should succeed
            assert all(daid is not None for daid in results)

            # All DAIDs should be unique
            assert len(set(results)) == len(results)

        finally:
            await service.cleanup()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

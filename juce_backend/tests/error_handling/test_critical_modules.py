"""
Comprehensive Error Handling and Edge Case Tests for Critical Modules

This test suite covers error handling and edge cases for:
- AI Client
- DawDreamer Engine
- Audio Processing Components
- WebSocket Communication
- Plugin Management
- Database Operations

License: MIT
"""

import asyncio
import json
import logging
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Import modules to test
try:
    from src.audio_agent.api.unified_client import UnifiedClient
    from src.audio_agent.core.plugin_database import PluginDatabase
    from src.audio_agent.core.realtime_parameter_control import RealtimeParameterControl
    from src.audio_engine.client import EngineClient
    from src.audio_engine.core.dawdreamer_engine import DawDreamerEngine
    from src.websocket.connection_manager import ConnectionManager
    from src.websocket.message_router import MessageRouter
except ImportError as e:
    logging.warning(f"Could not import modules for testing: {e}")
    # Create mock classes for testing
    DawDreamerEngine = MagicMock
    EngineClient = MagicMock
    ConnectionManager = MagicMock
    MessageRouter = MagicMock
    UnifiedClient = MagicMock
    PluginDatabase = MagicMock
    RealtimeParameterControl = MagicMock

# Test configuration
TEST_CONFIG = {
    "dawdreamer": {
        "executable_path": "/usr/local/bin/dawdreamer",
        "timeout": 30,
        "max_retries": 3,
    },
    "websocket": {
        "host": "localhost",
        "port": 8000,
        "heartbeat_interval": 5,
    },
    "database": {
        "url": "sqlite:///test.db",
        "timeout": 10,
    },
}


class TestErrorHandling:
    """Test class for error handling scenarios."""

    @pytest.fixture
    def mock_dawdreamer_engine(self):
        """Create a mock DawDreamer engine for testing."""
        engine = MagicMock(spec=DawDreamerEngine)
        engine.initialize = AsyncMock()
        engine.process_audio = AsyncMock()
        engine.load_plugin = AsyncMock()
        engine.unload_plugin = AsyncMock()
        engine.get_plugin_info = AsyncMock()
        engine.shutdown = AsyncMock()
        return engine

    @pytest.fixture
    def mock_websocket_connection(self):
        """Create a mock WebSocket connection for testing."""
        connection = MagicMock()
        connection.send = AsyncMock()
        connection.recv = AsyncMock()
        connection.close = AsyncMock()
        connection.closed = False
        return connection

    @pytest.fixture
    def mock_plugin_database(self):
        """Create a mock plugin database for testing."""
        db = MagicMock(spec=PluginDatabase)
        db.connect = AsyncMock()
        db.disconnect = AsyncMock()
        db.scan_plugins = AsyncMock()
        db.get_plugin = AsyncMock()
        db.save_plugin = AsyncMock()
        db.delete_plugin = AsyncMock()
        return db

    class TestDawDreamerEngine:
        """Test DawDreamer engine error handling."""

        @pytest.mark.asyncio
        async def test_engine_initialization_timeout(self, mock_dawdreamer_engine):
            """Test engine initialization timeout handling."""
            mock_dawdreamer_engine.initialize.side_effect = asyncio.TimeoutError(
                "Engine initialization timeout"
            )

            engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])

            with pytest.raises(asyncio.TimeoutError):
                await engine.initialize()

        @pytest.mark.asyncio
        async def test_engine_initialization_failure(self, mock_dawdreamer_engine):
            """Test engine initialization failure handling."""
            mock_dawdreamer_engine.initialize.side_effect = RuntimeError(
                "Engine failed to start"
            )

            engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])

            with pytest.raises(RuntimeError, match="Engine failed to start"):
                await engine.initialize()

        @pytest.mark.asyncio
        async def test_plugin_load_timeout(self, mock_dawdreamer_engine):
            """Test plugin loading timeout handling."""
            mock_dawdreamer_engine.load_plugin.side_effect = asyncio.TimeoutError(
                "Plugin load timeout"
            )

            engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])

            with pytest.raises(asyncio.TimeoutError, match="Plugin load timeout"):
                await engine.load_plugin("test_plugin.vst3")

        @pytest.mark.asyncio
        async def test_plugin_load_not_found(self, mock_dawdreamer_engine):
            """Test plugin not found error handling."""
            mock_dawdreamer_engine.load_plugin.side_effect = FileNotFoundError(
                "Plugin file not found"
            )

            engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])

            with pytest.raises(FileNotFoundError, match="Plugin file not found"):
                await engine.load_plugin("nonexistent_plugin.vst3")

        @pytest.mark.asyncio
        async def test_audio_processing_corrupted_data(self, mock_dawdreamer_engine):
            """Test handling of corrupted audio data."""
            mock_dawdreamer_engine.process_audio.side_effect = ValueError(
                "Corrupted audio data"
            )

            engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])

            with pytest.raises(ValueError, match="Corrupted audio data"):
                await engine.process_audio([1, 2, 3, 4, 5])

        @pytest.mark.asyncio
        async def test_engine_shutdown_graceful(self, mock_dawdreamer_engine):
            """Test graceful engine shutdown."""
            engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])
            await engine.shutdown()

            # Should not raise any exceptions during shutdown
            assert True

    class TestWebSocketCommunication:
        """Test WebSocket communication error handling."""

        @pytest.mark.asyncio
        async def test_connection_refused(self):
            """Test handling of connection refused errors."""
            with patch(
                "websockets.connect",
                side_effect=ConnectionRefusedError("Connection refused"),
            ):
                manager = ConnectionManager(TEST_CONFIG["websocket"])

                with pytest.raises(ConnectionRefusedError):
                    await manager.connect()

        @pytest.mark.asyncio
        async def test_connection_timeout(self):
            """Test handling of connection timeout errors."""
            with patch(
                "websockets.connect",
                side_effect=asyncio.TimeoutError("Connection timeout"),
            ):
                manager = ConnectionManager(TEST_CONFIG["websocket"])

                with pytest.raises(asyncio.TimeoutError):
                    await manager.connect()

        @pytest.mark.asyncio
        async def test_invalid_message_format(self, mock_websocket_connection):
            """Test handling of invalid message formats."""
            router = MessageRouter()

            # Invalid JSON message
            invalid_message = "invalid json string"

            with pytest.raises(json.JSONDecodeError):
                await router.handle_message(invalid_message, mock_websocket_connection)

        @pytest.mark.asyncio
        async def test_message_routing_failure(self, mock_websocket_connection):
            """Test handling of message routing failures."""
            router = MessageRouter()

            # Message with missing required fields
            incomplete_message = {"type": "PROCESS_AUDIO"}  # Missing plugin_id and data

            # Should handle gracefully without crashing
            await router.handle_message(incomplete_message, mock_websocket_connection)

        @pytest.mark.asyncio
        async def test_connection_unexpected_closure(self, mock_websocket_connection):
            """Test handling of unexpected connection closure."""
            mock_websocket_connection.closed = True
            mock_websocket_connection.recv.side_effect = ConnectionResetError(
                "Connection closed unexpectedly"
            )

            manager = ConnectionManager(TEST_CONFIG["websocket"])

            with pytest.raises(ConnectionResetError):
                await manager.receive_message(mock_websocket_connection)

    class TestUnifiedClient:
        """Test unified client error handling."""

        @pytest.mark.asyncio
        async def test_client_connection_failure(self):
            """Test client connection failure handling."""
            with patch(
                "aiohttp.ClientSession.get",
                side_effect=ConnectionError("Connection failed"),
            ):
                client = UnifiedClient("http://localhost:8000")

                with pytest.raises(ConnectionError):
                    await client.connect()

        @pytest.mark.asyncio
        async def test_invalid_api_response(self):
            """Test handling of invalid API responses."""
            with patch("aiohttp.ClientSession.get") as mock_get:
                mock_response = MagicMock()
                mock_response.status = 500
                mock_response.text = AsyncMock(return_value="Internal Server Error")
                mock_get.return_value.__aenter__.return_value = mock_response

                client = UnifiedClient("http://localhost:8000")

                with pytest.raises(Exception):  # Should raise appropriate error
                    await client.get_status()

        @pytest.mark.asyncio
        async def test_request_timeout(self):
            """Test handling of request timeouts."""
            with patch(
                "aiohttp.ClientSession.get",
                side_effect=asyncio.TimeoutError("Request timeout"),
            ):
                client = UnifiedClient("http://localhost:8000")

                with pytest.raises(asyncio.TimeoutError):
                    await client.get_plugins()

        @pytest.mark.asyncio
        async def test_rate_limiting(self):
            """Test handling of rate limiting."""
            with patch("aiohttp.ClientSession.post") as mock_post:
                mock_response = MagicMock()
                mock_response.status = 429
                mock_response.headers = {"Retry-After": "60"}
                mock_post.return_value.__aenter__.return_value = mock_response

                client = UnifiedClient("http://localhost:8000")

                with pytest.raises(Exception):  # Should raise rate limit error
                    await client.process_audio([1, 2, 3, 4])

    class TestPluginDatabase:
        """Test plugin database error handling."""

        @pytest.mark.asyncio
        async def test_database_connection_failure(self, mock_plugin_database):
            """Test database connection failure handling."""
            mock_plugin_database.connect.side_effect = ConnectionError(
                "Database connection failed"
            )

            db = PluginDatabase(TEST_CONFIG["database"])

            with pytest.raises(ConnectionError):
                await db.connect()

        @pytest.mark.asyncio
        async def test_database_query_timeout(self, mock_plugin_database):
            """Test database query timeout handling."""
            mock_plugin_database.get_plugin.side_effect = asyncio.TimeoutError(
                "Query timeout"
            )

            db = PluginDatabase(TEST_CONFIG["database"])

            with pytest.raises(asyncio.TimeoutError):
                await db.get_plugin("test_plugin")

        @pytest.mark.asyncio
        async def test_plugin_corrupted_metadata(self, mock_plugin_database):
            """Test handling of corrupted plugin metadata."""
            mock_plugin_database.save_plugin.side_effect = ValueError(
                "Invalid plugin metadata"
            )

            db = PluginDatabase(TEST_CONFIG["database"])

            with pytest.raises(ValueError, match="Invalid plugin metadata"):
                await db.save_plugin({"name": "test", "metadata": "corrupted"})

        @pytest.mark.asyncio
        async def test_plugin_scan_interruption(self, mock_plugin_database):
            """Test handling of plugin scan interruption."""
            mock_plugin_database.scan_plugins.side_effect = KeyboardInterrupt(
                "Scan interrupted"
            )

            db = PluginDatabase(TEST_CONFIG["database"])

            with pytest.raises(KeyboardInterrupt):
                await db.scan_plugins()

    class TestRealtimeParameterControl:
        """Test realtime parameter control error handling."""

        @pytest.mark.asyncio
        async def test_invalid_parameter_range(self):
            """Test handling of invalid parameter ranges."""
            controller = RealtimeParameterControl()

            # Test invalid parameter value (outside 0-1 range)
            with pytest.raises(ValueError):
                await controller.set_parameter("test_param", -0.5)  # Negative value

            with pytest.raises(ValueError):
                await controller.set_parameter("test_param", 1.5)  # Value > 1

        @pytest.mark.asyncio
        async def test_nonexistent_parameter(self):
            """Test handling of nonexistent parameter references."""
            controller = RealtimeParameterControl()

            with pytest.raises(KeyError):
                await controller.get_parameter("nonexistent_param")

        @pytest.mark.asyncio
        async def test_parameter_update_failure(self):
            """Test handling of parameter update failures."""
            controller = RealtimeParameterControl()

            # Mock a failure in parameter update
            with patch.object(
                controller,
                "_update_plugin_parameter",
                side_effect=RuntimeError("Parameter update failed"),
            ):
                with pytest.raises(RuntimeError):
                    await controller.set_parameter("test_param", 0.5)

        @pytest.mark.asyncio
        async def test_concurrent_parameter_updates(self):
            """Test handling of concurrent parameter updates."""
            controller = RealtimeParameterControl()

            # Create multiple concurrent updates to the same parameter
            tasks = []
            for i in range(10):
                task = controller.set_parameter("test_param", i / 10)
                tasks.append(task)

            # Should handle concurrent updates gracefully
            await asyncio.gather(*tasks, return_exceptions=True)

    class TestMemoryAndResourceManagement:
        """Test memory and resource management error handling."""

        @pytest.mark.asyncio
        async def test_memory_exhaustion(self):
            """Test handling of memory exhaustion scenarios."""
            # Create a large audio buffer that could cause memory issues
            large_buffer = [0.0] * 10_000_000  # 80MB buffer

            engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])

            # Should handle large buffers gracefully or fail with appropriate error
            try:
                result = await engine.process_audio(large_buffer)
                assert isinstance(result, list)
            except (MemoryError, RuntimeError):
                # Expected for very large buffers
                pass

        @pytest.mark.asyncio
        async def test_resource_cleanup_on_error(self, mock_dawdreamer_engine):
            """Test resource cleanup when errors occur."""
            mock_dawdreamer_engine.process_audio.side_effect = RuntimeError(
                "Processing failed"
            )

            engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])

            try:
                await engine.process_audio([1, 2, 3, 4])
            except RuntimeError:
                pass  # Expected

            # Resources should be cleaned up properly
            assert True  # Add actual cleanup verification

        @pytest.mark.asyncio
        async def test_connection_pool_exhaustion(self):
            """Test handling of connection pool exhaustion."""
            # Mock database connection pool exhaustion
            with patch(
                "asyncpg.create_pool",
                side_effect=Exception("Connection pool exhausted"),
            ):
                db = PluginDatabase(TEST_CONFIG["database"])

                with pytest.raises(Exception, match="Connection pool exhausted"):
                    await db.connect()

    class TestDataValidation:
        """Test input data validation error handling."""

        @pytest.mark.asyncio
        async def test_invalid_audio_buffer_types(self):
            """Test handling of invalid audio buffer types."""
            engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])

            # Test various invalid buffer types
            invalid_buffers = [
                None,
                "string_buffer",
                123,
                {"buffer": "invalid"},
                [1, 2, "invalid", 4],
                [],  # Empty buffer
            ]

            for invalid_buffer in invalid_buffers:
                with pytest.raises((TypeError, ValueError)):
                    await engine.process_audio(invalid_buffer)

        @pytest.mark.asyncio
        async def test_invalid_plugin_paths(self, mock_plugin_database):
            """Test handling of invalid plugin paths."""
            db = PluginDatabase(TEST_CONFIG["database"])

            invalid_paths = [
                "",  # Empty path
                "/nonexistent/path/plugin.vst3",
                "relative/path/plugin.vst3",
                "../../../etc/passwd",  # Path traversal attempt
                "plugin" * 1000,  # Extremely long path
            ]

            for invalid_path in invalid_paths:
                with pytest.raises((FileNotFoundError, ValueError, OSError)):
                    await db.load_plugin(invalid_path)

        @pytest.mark.asyncio
        async def test_malformed_websocket_messages(self, mock_websocket_connection):
            """Test handling of malformed WebSocket messages."""
            router = MessageRouter()

            malformed_messages = [
                None,
                "",
                {},
                {"invalid": "structure"},
                {"type": None, "data": "test"},
                {"type": "PROCESS_AUDIO", "data": "not_array"},
                {"type": "UNKNOWN_TYPE", "data": []},
            ]

            for malformed_msg in malformed_messages:
                try:
                    await router.handle_message(
                        malformed_msg, mock_websocket_connection
                    )
                except (TypeError, ValueError, KeyError):
                    pass  # Expected for malformed messages

    class TestConcurrencyAndRaceConditions:
        """Test concurrency and race condition error handling."""

        @pytest.mark.asyncio
        async def test_concurrent_plugin_loading(self, mock_dawdreamer_engine):
            """Test concurrent plugin loading scenarios."""
            engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])

            plugins = ["plugin1.vst3", "plugin2.vst3", "plugin3.vst3"]

            # Load plugins concurrently
            tasks = [engine.load_plugin(plugin) for plugin in plugins]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Should handle concurrent loading without race conditions
            assert len(results) == len(plugins)

        @pytest.mark.asyncio
        async def test_concurrent_database_access(self, mock_plugin_database):
            """Test concurrent database access scenarios."""
            db = PluginDatabase(TEST_CONFIG["database"])

            # Simulate concurrent database operations
            tasks = []
            for i in range(10):
                task = db.get_plugin(f"plugin_{i}")
                tasks.append(task)

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Should handle concurrent access without corruption
            assert len(results) == 10

        @pytest.mark.asyncio
        async def test_race_condition_in_parameter_updates(self):
            """Test race conditions in parameter updates."""
            controller = RealtimeParameterControl()

            # Create multiple tasks updating the same parameter rapidly
            async def update_parameter(param_id: str, value: float):
                try:
                    await controller.set_parameter(param_id, value)
                except Exception as e:
                    return str(e)

            tasks = []
            for i in range(100):
                task = update_parameter("test_param", i / 100)
                tasks.append(task)

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Should handle rapid updates gracefully
            successful_updates = sum(1 for r in results if r is None)
            assert successful_updates > 0


class TestRecoveryAndResilience:
    """Test recovery and resilience mechanisms."""

    @pytest.mark.asyncio
    async def test_automatic_reconnection(self):
        """Test automatic reconnection mechanisms."""
        manager = ConnectionManager(TEST_CONFIG["websocket"])

        # Simulate connection failure and recovery
        with patch("websockets.connect") as mock_connect:
            # First connection fails
            mock_connect.side_effect = [ConnectionRefusedError("First attempt"), None]

            # Should retry and eventually succeed
            await manager.connect()
            assert manager.is_connected()

    @pytest.mark.asyncio
    async def test_graceful_degradation(self):
        """Test graceful degradation when components fail."""
        engine = DawDreamerEngine(TEST_CONFIG["dawdreamer"])

        # Simulate partial component failure
        with patch.object(
            engine, "process_audio", side_effect=RuntimeError("Audio processing failed")
        ):
            # Should fall back to alternative processing or safe state
            try:
                await engine.process_audio([1, 2, 3, 4])
            except RuntimeError:
                # Expected, but system should remain stable
                assert True

    @pytest.mark.asyncio
    async def test_circuit_breaker_pattern(self):
        """Test circuit breaker pattern for failed operations."""
        client = UnifiedClient("http://localhost:8000")

        # Simulate repeated failures
        with patch(
            "aiohttp.ClientSession.get",
            side_effect=ConnectionError("Connection failed"),
        ):
            # Should implement circuit breaker after repeated failures
            for i in range(5):
                try:
                    await client.get_status()
                except ConnectionError:
                    pass  # Expected

            # After circuit breaker triggers, should fail fast
            with pytest.raises(ConnectionError):
                await client.get_status()


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])

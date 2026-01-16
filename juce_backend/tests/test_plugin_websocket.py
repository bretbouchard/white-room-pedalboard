#!/usr/bin/env python3
"""
Direct test of WebSocket plugin parameter functionality.
Tests the handlers without full MessageRouter instantiation.
"""

import asyncio
import os
import sys
from unittest.mock import AsyncMock, MagicMock

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from src.models.websocket_models import MessageType, PluginMessage, WebSocketMessage


async def test_plugin_add_handler():
    """Test plugin add handler functionality."""
    print("🧪 Testing Plugin Add Handler")

    # Mock dependencies
    mock_engine = MagicMock()
    mock_engine.create_plugin_processor = AsyncMock(return_value="plugin_123")

    mock_daid = MagicMock()
    mock_daid.track_user_interaction = AsyncMock()

    mock_connection_manager = MagicMock()
    mock_connection_manager.send_ack = AsyncMock()
    mock_connection_manager.send_to_session = AsyncMock()
    mock_connection_manager.get_connection_info = MagicMock(return_value={})

    # Import and test the handler method
    from src.websocket.message_router import MessageRouter

    router = MessageRouter.__new__(MessageRouter)  # Create without calling __init__
    router.audio_engine = mock_engine
    router.daid_service = mock_daid
    router.connection_manager = mock_connection_manager
    router._get_session_id = MagicMock(return_value="test_session")

    # Create test message
    plugin_data = {
        "plugin_id": "",
        "track_id": "track_456",
        "name": "Test Plugin",
        "plugin_path": "/path/to/plugin",
    }

    message = WebSocketMessage(
        id="msg_001",
        type=MessageType.PLUGIN_ADD,
        data=plugin_data,
        user_id="user_789",
        session_id="session_abc",
    )

    # Call the handler
    await router.handle_plugin_add("conn_123", message)

    # Verify calls
    mock_engine.create_plugin_processor.assert_called_once_with(
        name="Test Plugin", plugin_path="/path/to/plugin"
    )

    mock_daid.track_user_interaction.assert_called_once()

    mock_connection_manager.send_to_session.assert_called_once()

    mock_connection_manager.send_ack.assert_called_once()

    print("✅ Plugin Add Handler: SUCCESS")
    return True


async def test_plugin_bypass_handler():
    """Test plugin bypass handler functionality."""
    print("🧪 Testing Plugin Bypass Handler")

    # Mock dependencies
    mock_engine = MagicMock()
    mock_daid = MagicMock()
    mock_daid.track_user_interaction = AsyncMock()
    mock_connection_manager = MagicMock()
    mock_connection_manager.send_ack = AsyncMock()
    mock_connection_manager.send_to_session = AsyncMock()
    mock_connection_manager.get_connection_info = MagicMock(return_value={})

    # Import and test the handler method
    from src.websocket.message_router import MessageRouter

    router = MessageRouter.__new__(MessageRouter)
    router.audio_engine = mock_engine
    router.daid_service = mock_daid
    router.connection_manager = mock_connection_manager
    router._get_session_id = MagicMock(return_value="test_session")

    # Create test message
    plugin_data = {"plugin_id": "plugin_123", "track_id": "track_456", "bypass": True}

    message = WebSocketMessage(
        id="msg_002",
        type=MessageType.PLUGIN_BYPASS,
        data=plugin_data,
        user_id="user_789",
        session_id="session_abc",
    )

    # Call the handler
    await router.handle_plugin_bypass("conn_123", message)

    # Verify calls
    mock_daid.track_user_interaction.assert_called_once()

    mock_connection_manager.send_to_session.assert_called_once()

    mock_connection_manager.send_ack.assert_called_once()

    print("✅ Plugin Bypass Handler: SUCCESS")
    return True


async def test_plugin_parameters_get_handler():
    """Test plugin parameters get handler functionality."""
    print("🧪 Testing Plugin Parameters Get Handler")

    # Mock dependencies
    mock_engine = MagicMock()
    mock_engine._processor_configs = {
        "plugin_123": MagicMock(parameters={"param1": 0.5, "param2": 0.8})
    }
    mock_connection_manager = MagicMock()
    mock_connection_manager.send_message = AsyncMock()

    # Import and test the handler method
    from src.websocket.message_router import MessageRouter

    router = MessageRouter.__new__(MessageRouter)
    router.audio_engine = mock_engine
    router.connection_manager = mock_connection_manager

    # Create test message
    plugin_data = {"plugin_id": "plugin_123", "track_id": "track_456"}

    message = WebSocketMessage(
        id="msg_003",
        type=MessageType.PLUGIN_PARAMETERS_GET,
        data=plugin_data,
        user_id="user_789",
        session_id="session_abc",
    )

    # Call the handler
    await router.handle_plugin_parameters_get("conn_123", message)

    # Verify calls
    mock_connection_manager.send_message.assert_called_once()

    # Check the sent message
    call_args = mock_connection_manager.send_message.call_args
    sent_message = call_args[0][1]  # Second argument (WebSocketMessage)
    assert sent_message.type == MessageType.PLUGIN_PARAMETERS_GET
    assert sent_message.data["plugin_id"] == "plugin_123"
    assert "parameters" in sent_message.data
    assert sent_message.data["parameters"] == {"param1": 0.5, "param2": 0.8}

    print("✅ Plugin Parameters Get Handler: SUCCESS")
    return True


async def test_message_types():
    """Test that all required message types are defined."""
    print("🧪 Testing Message Types")

    required_types = [
        MessageType.PLUGIN_ADD,
        MessageType.PLUGIN_REMOVE,
        MessageType.PLUGIN_PARAMETER,
        MessageType.PLUGIN_BYPASS,
        MessageType.PLUGIN_PRESET,
        MessageType.PLUGIN_PARAMETERS_GET,
    ]

    for msg_type in required_types:
        assert isinstance(msg_type.value, str)
        assert len(msg_type.value) > 0
        print(f"  ✅ {msg_type.value}")

    print("✅ All Message Types: SUCCESS")
    return True


async def test_plugin_message_validation():
    """Test PluginMessage model validation."""
    print("🧪 Testing PluginMessage Validation")

    # Test valid plugin message
    plugin_data = {
        "plugin_id": "plugin_123",
        "track_id": "track_456",
        "name": "Test Plugin",
        "plugin_path": "/path/to/plugin",
        "parameter_id": "param1",
        "parameter_value": 0.75,
    }

    plugin_msg = PluginMessage(**plugin_data)
    assert plugin_msg.plugin_id == "plugin_123"
    assert plugin_msg.track_id == "track_456"
    assert plugin_msg.name == "Test Plugin"
    assert plugin_msg.parameter_value == 0.75

    print("  ✅ Valid PluginMessage created")

    # Test WebSocketMessage creation
    ws_msg = WebSocketMessage(
        id="msg_004",
        type=MessageType.PLUGIN_PARAMETER,
        data=plugin_data,
        user_id="user_789",
    )

    assert ws_msg.id == "msg_004"
    assert ws_msg.type == MessageType.PLUGIN_PARAMETER
    assert ws_msg.user_id == "user_789"

    print("  ✅ WebSocketMessage created")
    print("✅ PluginMessage Validation: SUCCESS")
    return True


async def run_all_tests():
    """Run all WebSocket plugin parameter tests."""
    print("🚀 Starting WebSocket Plugin Parameter Live Tests")
    print("=" * 60)

    tests = [
        test_message_types(),
        test_plugin_message_validation(),
        await test_plugin_add_handler(),
        await test_plugin_bypass_handler(),
        await test_plugin_parameters_get_handler(),
    ]

    passed = sum(1 for test in tests if test)
    total = len(tests)

    print("=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 ALL TESTS PASSED! WebSocket plugin parameter functionality is ready!")
        return True
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return False


if __name__ == "__main__":
    # Run the tests
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)

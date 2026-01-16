"""Tests for WebSocket bridge for real-time communication."""

import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock

import pytest

from src.audio_agent.core.wam_bridge import (
    BridgeMessage,
    ClientSession,
    MessageType,
    WAMBridge,
    WAMBridgeConfig,
)
from src.audio_agent.core.wam_host import WAMHost, WAMHostConfig
from src.audio_agent.models.audio import (
    AudioAnalysis,
    AudioFeatures,
    AudioFormat,
    ChromaFeatures,
    DynamicFeatures,
    FrequencyBalance,
    HarmonicFeatures,
    MusicalContextFeatures,
    PerceptualFeatures,
    QualityFeatures,
    RhythmFeatures,
    SpatialFeatures,
    SpectralFeatures,
    TimbreFeatures,
)
from src.audio_agent.models.wam import WAMDescriptor, WAMParameter, WAMParameterType


@pytest.fixture
def bridge_config():
    """Create bridge configuration for testing."""
    return WAMBridgeConfig(
        host="localhost",
        port=8766,  # Different port to avoid conflicts
        max_connections=10,
        heartbeat_interval=5,
        connection_timeout=15,
    )


@pytest.fixture
async def wam_host():
    """Create WAM host for testing."""
    config = WAMHostConfig(auto_discover=False)
    host = WAMHost(config=config)
    await host.initialize()
    yield host
    await host.shutdown()


@pytest.fixture
async def wam_bridge(bridge_config, wam_host):
    """Create WAM bridge for testing."""
    bridge = WAMBridge(config=bridge_config, wam_host=wam_host)
    yield bridge
    if bridge.is_running:
        await bridge.stop()


@pytest.fixture
def sample_wam_descriptor():
    """Create sample WAM descriptor."""
    return WAMDescriptor(
        name="Test Reverb",
        vendor="Test Audio",
        version="1.0.0",
        sdk_version="2.0.0",
        identifier="com.testaudio.reverb",
        is_instrument=False,
        is_effect=True,
        audio_input=2,
        audio_output=2,
        parameters=[
            WAMParameter(
                id="room_size",
                label="Room Size",
                type=WAMParameterType.FLOAT,
                default_value=0.5,
                min_value=0.0,
                max_value=1.0,
                current_value=0.5,
            )
        ],
    )


@pytest.fixture
def sample_audio_analysis():
    """Create sample audio analysis."""
    return AudioAnalysis(
        timestamp=1234567890.0,
        sample_rate=48000,
        duration=5.0,
        channels=2,
        format=AudioFormat.WAV,
        features=AudioFeatures(
            spectral=SpectralFeatures(
                centroid=2500.0,
                rolloff=8000.0,
                flux=0.5,
                bandwidth=1000.0,
                flatness=0.3,
                mfcc=[
                    1.0,
                    2.0,
                    3.0,
                    4.0,
                    5.0,
                    6.0,
                    7.0,
                    8.0,
                    9.0,
                    10.0,
                    11.0,
                    12.0,
                    13.0,
                ],
            ),
            dynamic=DynamicFeatures(
                rms_level=0.3,
                peak_level=0.7,
                dynamic_range=20.0,
                transient_density=5.0,
                zero_crossing_rate=0.1,
            ),
            harmonic=HarmonicFeatures(
                fundamental_freq=440.0,
                harmonic_content=[1.0, 0.5, 0.3],
                inharmonicity=0.1,
                pitch_clarity=0.8,
            ),
            perceptual=PerceptualFeatures(
                loudness_lufs=-23.0,
                perceived_brightness=0.6,
                perceived_warmth=0.4,
                roughness=0.2,
                sharpness=1.5,
            ),
            spatial=SpatialFeatures(
                stereo_width=1.0, phase_correlation=0.9, balance=0.0
            ),
            frequency_balance=FrequencyBalance(
                bass=0.3, low_mid=0.25, mid=0.2, high_mid=0.15, treble=0.1
            ),
            chroma=ChromaFeatures(
                chroma=[0.0] * 12,
                chroma_normalized=[0.0] * 12,
                root_note_likelihood=[0.0] * 12,
                key=None,
            ),
            musical_context=MusicalContextFeatures(
                key=None,
                current_chord=None,
                mode=None,
                time_signature=None,
            ),
            rhythm=RhythmFeatures(
                tempo=120.0,
                beats=[],
                beat_strength=[],
                meter=None,
                time_signature=None,
                tempo_confidence=0.0,
            ),
            timbre=TimbreFeatures(
                instruments=[],
                harmonic_percussive_ratio=0.0,
                attack_strength=0.0,
                sustain_length=0.0,
                vibrato_rate=None,
                vibrato_extent=None,
            ),
            quality=QualityFeatures(
                issues=[],
                overall_quality=0.0,
                noise_floor=0.0,
                has_clipping=False,
                dc_offset=0.0,
                hum_frequency=None,
            ),
        ),
    )


class TestWAMBridgeConfig:
    """Test WAM Bridge configuration."""

    def test_default_config(self):
        """Test default configuration values."""
        config = WAMBridgeConfig()

        assert config.host == "localhost"
        assert config.port == 8765
        assert config.max_connections == 100
        assert config.heartbeat_interval == 10
        assert config.connection_timeout == 30

    def test_config_validation(self):
        """Test configuration validation."""
        # Valid config
        config = WAMBridgeConfig(host="0.0.0.0", port=9000, max_connections=50)
        assert config.host == "0.0.0.0"

        # Invalid port
        with pytest.raises(ValueError):
            WAMBridgeConfig(port=100)  # Too low

        with pytest.raises(ValueError):
            WAMBridgeConfig(port=70000)  # Too high


class TestBridgeMessage:
    """Test bridge message model."""

    def test_message_creation(self):
        """Test message creation with validation."""
        message = BridgeMessage(type=MessageType.CONNECT, data={"test": "value"})

        assert message.type == MessageType.CONNECT
        assert message.data == {"test": "value"}
        assert message.id is not None
        assert isinstance(message.timestamp, datetime)

    def test_message_serialization(self):
        """Test message JSON serialization."""
        message = BridgeMessage(
            type=MessageType.PARAM_SET,
            data={"instance_id": "test", "parameter_id": "gain", "value": 0.5},
            client_id="client_123",
            requires_ack=True,
        )

        # Should serialize without errors
        json_data = message.model_dump()
        assert json_data["type"] == "param_set"
        assert json_data["client_id"] == "client_123"
        assert json_data["requires_ack"] is True

    def test_message_validation(self):
        """Test message validation."""
        # Valid message
        message = BridgeMessage(type=MessageType.HEARTBEAT)
        assert message.data == {}

        # Data should default to empty dict when not provided
        message = BridgeMessage(type=MessageType.CONNECT)
        assert message.data == {}


class TestClientSession:
    """Test client session model."""

    def test_session_creation(self):
        """Test client session creation."""
        websocket = AsyncMock()
        session = ClientSession(
            client_id="client_123", session_id="session_456", websocket=websocket
        )

        assert session.client_id == "client_123"
        assert session.session_id == "session_456"
        assert session.websocket == websocket
        assert isinstance(session.connected_at, datetime)
        assert len(session.wam_instances) == 0

    def test_session_alive_check(self):
        """Test session alive check based on heartbeat."""
        websocket = AsyncMock()
        session = ClientSession(
            client_id="client_123", session_id="session_456", websocket=websocket
        )

        # Fresh session should be alive
        assert session.is_alive

        # Old heartbeat should be dead
        session.last_heartbeat = datetime.utcnow() - timedelta(seconds=60)
        assert not session.is_alive


class TestWAMBridge:
    """Test WAM Bridge functionality."""

    @pytest.mark.asyncio
    async def test_bridge_initialization(self, wam_bridge):
        """Test bridge initialization."""
        assert not wam_bridge.is_running
        assert wam_bridge.server is None
        assert len(wam_bridge.clients) == 0
        assert len(wam_bridge.message_handlers) > 0

    @pytest.mark.asyncio
    async def test_bridge_start_stop(self, wam_bridge):
        """Test bridge start and stop."""
        # Start bridge
        success = await wam_bridge.start()
        assert success
        assert wam_bridge.is_running
        assert wam_bridge.server is not None

        # Stop bridge
        await wam_bridge.stop()
        assert not wam_bridge.is_running
        assert wam_bridge.server is None

    @pytest.mark.asyncio
    async def test_bridge_start_already_running(self, wam_bridge):
        """Test starting bridge when already running."""
        await wam_bridge.start()

        # Try to start again
        success = await wam_bridge.start()
        assert not success  # Should return False

        await wam_bridge.stop()

    @pytest.mark.asyncio
    async def test_message_handlers_setup(self, wam_bridge):
        """Test message handlers are properly set up."""
        handlers = wam_bridge.message_handlers

        # Check all required handlers exist
        required_handlers = [
            MessageType.CONNECT,
            MessageType.DISCONNECT,
            MessageType.HEARTBEAT,
            MessageType.WAM_LOAD,
            MessageType.WAM_UNLOAD,
            MessageType.PARAM_SET,
            MessageType.PARAM_GET,
            MessageType.STATE_SYNC,
            MessageType.ACK,
        ]

        for handler_type in required_handlers:
            assert handler_type in handlers
            assert callable(handlers[handler_type])

    @pytest.mark.asyncio
    async def test_client_session_management(self, wam_bridge):
        """Test client session management."""
        # Mock websocket
        websocket = AsyncMock()

        # Create client session
        client_id = "test_client"
        session = ClientSession(
            client_id=client_id, session_id="test_session", websocket=websocket
        )

        wam_bridge.clients[client_id] = session

        # Test disconnect
        await wam_bridge._disconnect_client(client_id, "Test disconnect")

        assert client_id not in wam_bridge.clients

    @pytest.mark.asyncio
    async def test_message_broadcasting(self, wam_bridge):
        """Test message broadcasting to clients."""
        # Create mock clients
        client1_ws = AsyncMock()
        client1_ws.send = AsyncMock()
        client2_ws = AsyncMock()
        client2_ws.send = AsyncMock()

        wam_bridge.clients["client1"] = ClientSession(
            client_id="client1", session_id="session1", websocket=client1_ws
        )
        wam_bridge.clients["client2"] = ClientSession(
            client_id="client2", session_id="session2", websocket=client2_ws
        )

        # Broadcast message
        message = BridgeMessage(
            type=MessageType.STATE_UPDATE, data={"test": "broadcast"}
        )

        sent_count = await wam_bridge._broadcast_message(message)

        assert sent_count == 2
        assert client1_ws.send.called
        assert client2_ws.send.called

    @pytest.mark.asyncio
    async def test_wam_load_handler(self, wam_bridge, sample_wam_descriptor):
        """Test WAM load message handler."""
        # Register WAM in host
        wam_bridge.wam_host.registry.register_wam(sample_wam_descriptor)

        # Create test message
        message = BridgeMessage(
            type=MessageType.WAM_LOAD,
            client_id="test_client",
            data={
                "wam_identifier": sample_wam_descriptor.identifier,
                "instance_id": "test_instance",
            },
        )

        # Mock client
        client_ws = AsyncMock()
        client_ws.send = AsyncMock()
        wam_bridge.clients["test_client"] = ClientSession(
            client_id="test_client", session_id="test_session", websocket=client_ws
        )

        # Handle message
        await wam_bridge._handle_wam_load(message)

        # Check that WAM was loaded
        assert len(wam_bridge.wam_host.registry.active_instances) == 1

        # Check that client received response
        assert client_ws.send.called

    @pytest.mark.asyncio
    async def test_parameter_set_handler(self, wam_bridge, sample_wam_descriptor):
        """Test parameter set message handler."""
        # Set up WAM instance
        wam_bridge.wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_bridge.wam_host.load_wam(sample_wam_descriptor.identifier)

        # Create test message
        message = BridgeMessage(
            type=MessageType.PARAM_SET,
            client_id="test_client",
            data={
                "instance_id": instance.instance_id,
                "parameter_id": "room_size",
                "value": 0.8,
            },
        )

        # Mock client
        client_ws = AsyncMock()
        client_ws.send = AsyncMock()
        wam_bridge.clients["test_client"] = ClientSession(
            client_id="test_client", session_id="test_session", websocket=client_ws
        )

        # Handle message
        await wam_bridge._handle_param_set(message)

        # Check parameter was set
        assert instance.get_parameter_value("room_size") == 0.8

        # Check response was sent
        assert client_ws.send.called

    @pytest.mark.asyncio
    async def test_parameter_get_handler(self, wam_bridge, sample_wam_descriptor):
        """Test parameter get message handler."""
        # Set up WAM instance
        wam_bridge.wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_bridge.wam_host.load_wam(sample_wam_descriptor.identifier)

        # Set a parameter value
        await wam_bridge.wam_host.set_parameter(instance.instance_id, "room_size", 0.7)

        # Create test message
        message = BridgeMessage(
            type=MessageType.PARAM_GET,
            client_id="test_client",
            data={"instance_id": instance.instance_id, "parameter_id": "room_size"},
        )

        # Mock client
        client_ws = AsyncMock()
        client_ws.send = AsyncMock()
        wam_bridge.clients["test_client"] = ClientSession(
            client_id="test_client", session_id="test_session", websocket=client_ws
        )

        # Handle message
        await wam_bridge._handle_param_get(message)

        # Check response was sent
        assert client_ws.send.called

        # Check response contains correct value
        call_args = client_ws.send.call_args[0][0]
        response_data = json.loads(call_args)
        assert response_data["data"]["value"] == 0.7

    @pytest.mark.asyncio
    async def test_state_sync_handler(self, wam_bridge):
        """Test state synchronization handler."""
        message = BridgeMessage(
            type=MessageType.STATE_SYNC, client_id="test_client", data={}
        )

        # Mock client
        client_ws = AsyncMock()
        client_ws.send = AsyncMock()
        wam_bridge.clients["test_client"] = ClientSession(
            client_id="test_client", session_id="test_session", websocket=client_ws
        )

        # Handle message
        await wam_bridge._handle_state_sync(message)

        # Check response was sent
        assert client_ws.send.called

        # Check response contains state data
        call_args = client_ws.send.call_args[0][0]
        response_data = json.loads(call_args)
        assert "server_stats" in response_data["data"]
        assert "wam_instances" in response_data["data"]

    @pytest.mark.asyncio
    async def test_heartbeat_handler(self, wam_bridge):
        """Test heartbeat message handler."""
        # Create client
        client_ws = AsyncMock()
        client_id = "test_client"
        session = ClientSession(
            client_id=client_id, session_id="test_session", websocket=client_ws
        )
        wam_bridge.clients[client_id] = session

        # Set old heartbeat
        old_heartbeat = datetime.utcnow() - timedelta(seconds=30)
        session.last_heartbeat = old_heartbeat

        # Create heartbeat message
        message = BridgeMessage(
            type=MessageType.HEARTBEAT, client_id=client_id, data={}
        )

        # Handle message
        await wam_bridge._handle_heartbeat(message)

        # Check heartbeat was updated
        assert session.last_heartbeat > old_heartbeat

    @pytest.mark.asyncio
    async def test_error_handling(self, wam_bridge):
        """Test error message sending."""
        # Mock client
        client_ws = AsyncMock()
        client_ws.send = AsyncMock()
        client_id = "test_client"

        wam_bridge.clients[client_id] = ClientSession(
            client_id=client_id, session_id="test_session", websocket=client_ws
        )

        # Send error
        await wam_bridge._send_error(client_id, "Test error message")

        # Check error was sent
        assert client_ws.send.called

        # Check error message format
        call_args = client_ws.send.call_args[0][0]
        response_data = json.loads(call_args)
        assert response_data["type"] == "error"
        assert "Test error message" in response_data["data"]["error"]

    @pytest.mark.asyncio
    async def test_wam_host_event_integration(self, wam_bridge, sample_wam_descriptor):
        """Test integration with WAM host events."""
        # Mock client to receive broadcasts
        client_ws = AsyncMock()
        client_ws.send = AsyncMock()
        wam_bridge.clients["test_client"] = ClientSession(
            client_id="test_client", session_id="test_session", websocket=client_ws
        )

        # Register and load WAM (should trigger events)
        wam_bridge.wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_bridge.wam_host.load_wam(sample_wam_descriptor.identifier)

        # Set parameter (should trigger parameter changed event)
        await wam_bridge.wam_host.set_parameter(instance.instance_id, "room_size", 0.9)

        # Check that client received event broadcasts
        assert (
            client_ws.send.call_count >= 2
        )  # At least load and parameter change events

    @pytest.mark.asyncio
    async def test_analysis_update_broadcast(self, wam_bridge, sample_audio_analysis):
        """Test audio analysis update broadcasting."""
        # Mock client
        client_ws = AsyncMock()
        client_ws.send = AsyncMock()
        wam_bridge.clients["test_client"] = ClientSession(
            client_id="test_client", session_id="test_session", websocket=client_ws
        )

        # Send analysis update
        sent_count = await wam_bridge.send_analysis_update(sample_audio_analysis)

        assert sent_count == 1
        assert client_ws.send.called

        # Check message content
        call_args = client_ws.send.call_args[0][0]
        response_data = json.loads(call_args)
        assert response_data["type"] == "analysis_update"
        assert "analysis" in response_data["data"]

    @pytest.mark.asyncio
    async def test_connection_stats(self, wam_bridge):
        """Test connection statistics."""
        # Add mock clients
        for i in range(3):
            client_ws = AsyncMock()
            client_id = f"client_{i}"
            wam_bridge.clients[client_id] = ClientSession(
                client_id=client_id, session_id=f"session_{i}", websocket=client_ws
            )

        # Set one client as stale
        wam_bridge.clients["client_2"].last_heartbeat = datetime.utcnow() - timedelta(
            seconds=60
        )

        stats = wam_bridge.get_connection_stats()

        assert stats["total_clients"] == 3
        assert stats["active_clients"] == 2  # One is stale
        assert "total_messages" in stats
        assert "server_running" in stats

    @pytest.mark.asyncio
    async def test_message_acknowledgment(self, wam_bridge):
        """Test message acknowledgment system."""
        # Create message requiring acknowledgment
        message = BridgeMessage(
            type=MessageType.CONNECT, requires_ack=True, data={"test": "ack"}
        )

        # Mock client
        client_ws = AsyncMock()
        client_ws.send = AsyncMock()
        client_id = "test_client"
        wam_bridge.clients[client_id] = ClientSession(
            client_id=client_id, session_id="test_session", websocket=client_ws
        )

        # Send message
        await wam_bridge._send_message(client_id, message)

        # Check message is in pending
        assert message.id in wam_bridge.pending_messages

        # Send acknowledgment
        ack_message = BridgeMessage(
            type=MessageType.ACK,
            response_to=message.id,
            client_id=client_id,
            data={"status": "received"},
        )

        await wam_bridge._handle_ack(ack_message)

        # Check message is no longer pending
        assert message.id not in wam_bridge.pending_messages


class TestWAMBridgeIntegration:
    """Integration tests for WAM Bridge."""

    @pytest.mark.asyncio
    async def test_full_wam_lifecycle(self, wam_bridge, sample_wam_descriptor):
        """Test complete WAM lifecycle through bridge."""
        await wam_bridge.start()

        try:
            # Register WAM
            wam_bridge.wam_host.registry.register_wam(sample_wam_descriptor)

            # Mock client
            client_ws = AsyncMock()
            client_ws.send = AsyncMock()
            client_id = "test_client"
            wam_bridge.clients[client_id] = ClientSession(
                client_id=client_id, session_id="test_session", websocket=client_ws
            )

            # Load WAM
            load_msg = BridgeMessage(
                type=MessageType.WAM_LOAD,
                client_id=client_id,
                data={"wam_identifier": sample_wam_descriptor.identifier},
            )
            await wam_bridge._handle_wam_load(load_msg)

            # Get instance ID from response
            load_response = json.loads(client_ws.send.call_args[0][0])
            instance_id = load_response["data"]["instance_id"]

            # Activate WAM
            activate_msg = BridgeMessage(
                type=MessageType.WAM_ACTIVATE,
                client_id=client_id,
                data={"instance_id": instance_id},
            )
            await wam_bridge._handle_wam_activate(activate_msg)

            # Set parameter
            param_msg = BridgeMessage(
                type=MessageType.PARAM_SET,
                client_id=client_id,
                data={
                    "instance_id": instance_id,
                    "parameter_id": "room_size",
                    "value": 0.8,
                },
            )
            await wam_bridge._handle_param_set(param_msg)

            # Unload WAM
            unload_msg = BridgeMessage(
                type=MessageType.WAM_UNLOAD,
                client_id=client_id,
                data={"instance_id": instance_id},
            )
            await wam_bridge._handle_wam_unload(unload_msg)

            # Check all operations succeeded
            assert (
                client_ws.send.call_count >= 4
            )  # Load, activate, param set, unload responses

        finally:
            await wam_bridge.stop()


if __name__ == "__main__":
    pytest.main([__file__])

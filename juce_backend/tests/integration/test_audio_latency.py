import asyncio
import logging
from datetime import datetime

import numpy as np
import pytest

from backend.src.audio_agent.core.dawdreamer_engine import DawDreamerEngine
from backend.src.models.websocket_models import MessageType, WebSocketMessage
from backend.src.websocket.connection_manager import ConnectionManager
from backend.src.websocket.message_router import MessageRouter

logger = logging.getLogger(__name__)


# Mock ConnectionManager for testing purposes
class MockConnectionManager(ConnectionManager):
    def __init__(self):
        super().__init__()
        self.sent_messages = []

    async def send_to_connection(self, connection_id: str, message: WebSocketMessage):
        self.sent_messages.append((connection_id, message))
        logger.debug(
            f"MockConnectionManager: Sent message to {connection_id}: {message.type}"
        )

    async def send_to_session(
        self,
        session_id: str,
        message: WebSocketMessage,
        exclude_connection: str | None = None,
    ):
        self.sent_messages.append((session_id, message, exclude_connection))
        logger.debug(
            f"MockConnectionManager: Sent message to session {session_id}: {message.type}"
        )

    async def send_ack(
        self,
        connection_id: str,
        original_message_id: str,
        success: bool,
        message: str | None = None,
        data: dict | None = None,
    ):
        ack_message = WebSocketMessage(
            type=MessageType.ACK,
            user_id="test_user",
            session_id="test_session",
            requires_ack=False,
            data={
                "original_message_id": original_message_id,
                "success": success,
                "message": message,
                "timestamp": datetime.utcnow().isoformat(),
                "data": data if data is not None else {},
            },
        )
        self.sent_messages.append((connection_id, ack_message))
        logger.debug(
            f"MockConnectionManager: Sent ACK for {original_message_id} to {connection_id}"
        )


@pytest.fixture
async def setup_latency_test():
    # Initialize DawDreamerEngine (mocked or real based on DAWDREAMER_AVAILABLE)
    audio_engine = DawDreamerEngine()
    # Ensure the engine is initialized and ready
    audio_engine.reset_engine()

    # Initialize MockConnectionManager
    connection_manager = MockConnectionManager()

    # Initialize MessageRouter with the mocked components
    message_router = MessageRouter(
        connection_manager=connection_manager,
        daw_dreamer_engine=audio_engine,
        daid_service=None,  # DAID not relevant for this test
    )
    message_router.set_audio_engine(audio_engine)

    yield audio_engine, connection_manager, message_router

    # Cleanup (if necessary)
    if audio_engine.is_running():
        audio_engine.stop_real_time_processing()


@pytest.mark.asyncio
async def test_round_trip_audio_latency(setup_latency_test):
    audio_engine, connection_manager, message_router = setup_latency_test

    # 1. Setup: Create a simple audio graph (e.g., a pass-through)
    processor_name = "test_processor"
    faust_code = "process = _"  # Pass-through Faust code
    await audio_engine.create_faust_processor(processor_name, faust_code)
    await audio_engine.load_audio_graph(
        [
            {
                "processor_name": processor_name,
                "input_connections": [],
                "output_connections": [],
            }
        ]
    )

    # 2. Injection: Generate a known audio signal and record T_inject
    sample_rate = audio_engine.audio_config.sample_rate
    duration = 0.1  # seconds
    num_samples = int(duration * sample_rate)
    input_audio_signal = np.zeros((1, num_samples), dtype=np.float32)
    input_audio_signal[0, 0] = 1.0  # A single impulse at the beginning

    t_inject = datetime.utcnow()  # T_inject: Timestamp just before injecting audio

    # Create and send AUDIO_RENDER_REQUEST message
    render_request_message = WebSocketMessage(
        type=MessageType.AUDIO_RENDER_REQUEST,
        user_id="test_user",
        session_id="test_session",
        data={
            "duration": duration,
            "input_audio": input_audio_signal.flatten().tolist(),
            "t_inject": t_inject.isoformat(),
        },
        requires_ack=True,
    )

    await message_router.route_message("test_connection_id", render_request_message)

    # 3. Capture the WAVEFORM_UPDATE message sent back by MessageRouter
    waveform_message = None
    # Wait for the message to be sent (give some time for async processing)
    await asyncio.sleep(0.1)  # Adjust sleep duration as needed

    for _, msg in connection_manager.sent_messages:
        if msg.type == MessageType.WAVEFORM_UPDATE:
            waveform_message = msg
            break

    assert waveform_message is not None, "WAVEFORM_UPDATE message not received"
    assert waveform_message.data["track_id"] == "master"
    assert "audio_data" in waveform_message.data

    # Extract timestamps and calculate latency
    received_t_inject = datetime.fromisoformat(waveform_message.data["t_inject"])
    received_t_output = datetime.fromisoformat(waveform_message.data["t_output"])

    latency_ms = (received_t_output - received_t_inject).total_seconds() * 1000
    logger.info(f"Round-trip audio latency: {latency_ms:.2f} ms")

    # Assert that latency is within an acceptable range (e.g., < 50ms for real-time)
    assert latency_ms < 50.0  # Adjust this threshold as needed

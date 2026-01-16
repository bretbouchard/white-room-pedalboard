from src.audio_agent.api.transformation_api import TransformationAPI
from src.audio_agent.api.unified_client import UnifiedAudioClient


def test_unified_audio_client_initialization():
    """Tests that the UnifiedAudioClient is initialized correctly."""
    client = UnifiedAudioClient()
    assert isinstance(client.transformation_api, TransformationAPI)

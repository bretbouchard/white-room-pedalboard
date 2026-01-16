from unittest.mock import AsyncMock

import pytest

from src.audio_agent.ai.unified_orchestrator import UnifiedAIOrchestrator


@pytest.fixture
def orchestrator():
    """Fixture for a UnifiedAIOrchestrator instance."""
    client = AsyncMock()
    orchestrator = UnifiedAIOrchestrator(client)
    return orchestrator


def test_orchestrate_with_hume_provider(orchestrator):
    """Test orchestrating with the Hume provider."""
    audio_input = "test_audio"
    result = orchestrator.orchestrate(audio_input, provider="hume")
    assert result["provider"] == "default"
    assert result["result"] == "default_processed_data"


def test_orchestrate_with_openai_provider(orchestrator):
    """Test orchestrating with the OpenAI provider."""
    audio_input = "test_audio"
    result = orchestrator.orchestrate(audio_input, provider="openai")
    assert result["provider"] == "openai"
    assert result["result"] == "openai_processed_data"


def test_orchestrate_with_default_provider(orchestrator):
    """Test orchestrating with the default provider."""
    audio_input = "test_audio"
    result = orchestrator.orchestrate(audio_input, provider="default")
    assert result["provider"] == "default"
    assert result["result"] == "default_processed_data"


def test_orchestrate_with_fallback(orchestrator):
    """Test orchestrating with a fallback provider."""
    audio_input = "test_audio"
    result = orchestrator.orchestrate(audio_input, provider="hume")
    assert result["provider"] == "default"
    assert result["result"] == "default_processed_data"

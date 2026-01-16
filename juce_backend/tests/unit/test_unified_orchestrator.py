from unittest.mock import AsyncMock, patch

import pytest
from audio_agent.ai.unified_orchestrator import UnifiedAIOrchestrator


class TestUnifiedAIOrchestrator:
    @pytest.fixture
    def mock_daid_client(self):
        return AsyncMock()

    @pytest.fixture
    def mock_provenance_chain(self):
        return AsyncMock()

    @pytest.fixture
    def orchestrator(self, mock_daid_client, mock_provenance_chain):
        with patch(
            "audio_agent.ai.unified_orchestrator.ProvenanceChain",
            return_value=mock_provenance_chain,
        ):
            return UnifiedAIOrchestrator(client=mock_daid_client)

    def test_init(self, mock_daid_client, mock_provenance_chain, orchestrator):
        assert orchestrator.client == mock_daid_client
        assert orchestrator.provenance == mock_provenance_chain
        assert orchestrator.active_processes == {}
        mock_provenance_chain.assert_not_called()  # Ensure ProvenanceChain is not initialized in __init__

    def test_initialize(self, orchestrator, mock_provenance_chain):
        config = {"key": "value"}
        orchestrator.initialize(config)
        mock_provenance_chain.init_from_config.assert_called_once_with(config)

    def test_orchestrate_default_provider(self, orchestrator):
        audio_input = "dummy_audio_input"
        result = orchestrator.orchestrate(audio_input)
        assert result == {"provider": "default", "result": "default_processed_data"}

    def test_orchestrate_hume_provider(self, orchestrator):
        audio_input = "dummy_audio_input"
        result = orchestrator.orchestrate(audio_input, provider="hume")
        # Hume is treated as unavailable in this environment and should
        # fall back to the default provider.
        assert result == {"provider": "default", "result": "default_processed_data"}

    def test_orchestrate_openai_provider(self, orchestrator):
        audio_input = "dummy_audio_input"
        result = orchestrator.orchestrate(audio_input, provider="openai")
        assert result == {"provider": "openai", "result": "openai_processed_data"}

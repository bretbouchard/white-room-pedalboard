"""Tests for the synthesizer sub-agent."""

from unittest.mock import AsyncMock

import pytest
from audio_agent.core.plugin_instrument_agent import (
    PluginInstrumentConfiguration,
    PluginInstrumentRecommendation,
    PluginInstrumentType,
)
from audio_agent.core.plugin_specialist import PluginSpecialist
from audio_agent.core.synthesizer_sub_agent import SynthesizerSubAgent
from audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)
from audio_agent.models.plugin import PluginCategory, PluginFormat, PluginMetadata
from audio_agent.models.user import PluginPreferences, UserPreferences


class TestSynthesizerSubAgent:
    """Test cases for the synthesizer sub-agent."""

    @pytest.fixture
    def mock_plugin_specialist(self):
        """Create a mock plugin specialist."""
        mock_specialist = AsyncMock(spec=PluginSpecialist)
        mock_db = AsyncMock()

        # Create mock plugins
        synth_plugins = [
            PluginMetadata(
                name="Serum",
                manufacturer="Xfer Records",
                version="1.0",
                unique_id="xfer_serum",
                category=PluginCategory.SYNTHESIZER,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
            PluginMetadata(
                name="Massive X",
                manufacturer="Native Instruments",
                version="1.0",
                unique_id="ni_massive_x",
                category=PluginCategory.SYNTHESIZER,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
            PluginMetadata(
                name="Omnisphere",
                manufacturer="Spectrasonics",
                version="2.6",
                unique_id="spectrasonics_omnisphere",
                category=PluginCategory.SYNTHESIZER,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
        ]

        # Configure mock database
        mock_db.get_plugins_by_category.return_value = synth_plugins

        mock_specialist.db = mock_db
        return mock_specialist

    @pytest.fixture
    def composition_context(self):
        """Create a test composition context."""
        return CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,
        )

    @pytest.fixture
    def user_preferences(self):
        """Create test user preferences."""
        return UserPreferences(
            clerk_user_id="user_test123",
            plugin_preferences=PluginPreferences(
                preferred_brands=["Native Instruments", "Xfer Records"],
                preferred_formats=[PluginFormat.VST3],
                preferred_categories=[PluginCategory.SYNTHESIZER],
            ),
            mixing_preferences=None,
            learning_preferences=None,
        )

    def test_get_instrument_type(self, mock_plugin_specialist):
        """Test getting the instrument type."""
        agent = SynthesizerSubAgent(mock_plugin_specialist)
        assert agent._get_instrument_type() == PluginInstrumentType.SYNTHESIZER

    def test_select_instrument_plugin(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test selecting a synthesizer plugin."""
        agent = SynthesizerSubAgent(mock_plugin_specialist)

        # Test with electronic style
        recommendation = agent.select_instrument_plugin(
            composition_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert recommendation.plugin_type == PluginInstrumentType.SYNTHESIZER
        assert recommendation.agent_id == "synthesizer_sub_agent"
        assert recommendation.clerk_user_id == "user_test123"
        assert len(recommendation.reasoning) > 10
        assert (
            "Serum" in recommendation.plugin_name
            or "Massive X" in recommendation.plugin_name
        )

        # Test with ambient style
        ambient_context = CompositionContext(
            tempo=80.0,
            key_signature=MusicalKey.A_MINOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.AMBIENT,
        )

        recommendation = agent.select_instrument_plugin(
            ambient_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert (
            "Omnisphere" in recommendation.plugin_name
            or "Serum" in recommendation.plugin_name
        )
        assert "ambient" in recommendation.reasoning.lower()

    def test_configure_instrument_plugin(
        self, mock_plugin_specialist, composition_context
    ):
        """Test configuring a synthesizer plugin."""
        agent = SynthesizerSubAgent(mock_plugin_specialist)

        # First get a recommendation
        recommendation = agent.select_instrument_plugin(composition_context, None, None)

        # Test configuration
        config = agent.configure_instrument_plugin(recommendation, composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_type == PluginInstrumentType.SYNTHESIZER
        assert len(config.parameters) > 0
        assert "filter_cutoff" in config.parameters
        assert "attack" in config.parameters
        assert len(config.reasoning) > 10

        # Test with different tempo
        fast_context = CompositionContext(
            tempo=160.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,
        )

        config = agent.configure_instrument_plugin(recommendation, fast_context)

        assert config.parameters["attack"] <= 0.01  # Fast attack for high tempo
        assert "fast attack" in config.reasoning.lower()

        # Test with minor key
        minor_context = CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.A_MINOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,
        )

        config = agent.configure_instrument_plugin(recommendation, minor_context)

        assert (
            config.parameters["oscillator_detune"] > 0.01
        )  # More detune for minor keys
        assert "minor key" in config.reasoning.lower()

"""Tests for the vintage synthesizer sub-agents."""

from unittest.mock import AsyncMock

import pytest
from audio_agent.core.plugin_instrument_agent import (
    PluginInstrumentConfiguration,
    PluginInstrumentRecommendation,
    PluginInstrumentType,
)
from audio_agent.core.plugin_specialist import PluginSpecialist
from audio_agent.core.vintage_synth_agents import (
    DX7Agent,
    MiniMoogAgent,
    TALUNOLXAgent,
)
from audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)
from audio_agent.models.plugin import PluginCategory, PluginFormat, PluginMetadata
from audio_agent.models.user import PluginPreferences, UserPreferences


class TestVintageSynthAgents:
    """Test cases for the vintage synthesizer sub-agents."""

    @pytest.fixture
    def mock_plugin_specialist(self):
        """Create a mock plugin specialist."""
        mock_specialist = AsyncMock(spec=PluginSpecialist)
        mock_db = AsyncMock()

        # Create mock plugins
        vintage_plugins = [
            PluginMetadata(
                name="DX7 V",
                manufacturer="Arturia",
                version="1.0",
                unique_id="arturia_dx7",
                category=PluginCategory.SYNTHESIZER,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
            PluginMetadata(
                name="Minimoog V",
                manufacturer="Arturia",
                version="1.0",
                unique_id="arturia_minimoog",
                category=PluginCategory.SYNTHESIZER,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
            PluginMetadata(
                name="TAL-U-NO-LX",
                manufacturer="TAL",
                version="1.0",
                unique_id="tal_uno_lx",
                category=PluginCategory.SYNTHESIZER,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
        ]

        # Configure mock database
        mock_db.get_plugins_by_category.return_value = vintage_plugins

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
                preferred_brands=["Arturia", "TAL"],
                preferred_formats=[PluginFormat.VST3],
                preferred_categories=[PluginCategory.SYNTHESIZER],
            ),
            mixing_preferences=None,
            learning_preferences=None,
        )

    def test_dx7_agent(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test the DX7 agent."""
        agent = DX7Agent(mock_plugin_specialist)

        # Test synth name and characteristics
        assert agent._get_synth_name() == "DX7"
        assert agent._get_instrument_type() == PluginInstrumentType.CLASSIC_SYNTH

        characteristics = agent._get_synth_characteristics()
        assert "FM" in characteristics["synthesis_type"]
        assert MusicalStyle.POP in characteristics["preferred_styles"]

        # Test plugin selection
        recommendation = agent.select_instrument_plugin(
            composition_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert recommendation.plugin_type == PluginInstrumentType.CLASSIC_SYNTH
        assert "DX7" in recommendation.plugin_name
        assert len(recommendation.reasoning) > 10

        # Test configuration
        config = agent.configure_instrument_plugin(recommendation, composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_type == PluginInstrumentType.CLASSIC_SYNTH
        assert "algorithm" in config.parameters
        assert "feedback" in config.parameters
        assert len(config.reasoning) > 10

        # Test with different style
        pop_context = CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.POP,
        )

        config = agent.configure_instrument_plugin(recommendation, pop_context)

        assert (
            config.parameters["algorithm"] == 5
        )  # Classic DX7 electric piano algorithm
        assert "80s" in config.reasoning.lower()

    def test_minimoog_agent(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test the Minimoog agent."""
        agent = MiniMoogAgent(mock_plugin_specialist)

        # Test synth name and characteristics
        assert agent._get_synth_name() == "Minimoog"
        assert agent._get_instrument_type() == PluginInstrumentType.CLASSIC_SYNTH

        characteristics = agent._get_synth_characteristics()
        assert "Analog" in characteristics["synthesis_type"]
        assert MusicalStyle.ROCK in characteristics["preferred_styles"]

        # Test plugin selection
        recommendation = agent.select_instrument_plugin(
            composition_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert recommendation.plugin_type == PluginInstrumentType.CLASSIC_SYNTH
        assert "Minimoog" in recommendation.plugin_name
        assert len(recommendation.reasoning) > 10

        # Test configuration
        config = agent.configure_instrument_plugin(recommendation, composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_type == PluginInstrumentType.CLASSIC_SYNTH
        assert "osc1_waveform" in config.parameters
        assert "filter_cutoff" in config.parameters
        assert len(config.reasoning) > 10

        # Test with rock style
        rock_context = CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.E_MINOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ROCK,
        )

        config = agent.configure_instrument_plugin(recommendation, rock_context)

        assert config.parameters["osc1_waveform"] == "sawtooth"
        assert "rock" in config.reasoning.lower()

    def test_tal_uno_lx_agent(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test the TAL-U-NO-LX agent."""
        agent = TALUNOLXAgent(mock_plugin_specialist)

        # Test synth name and characteristics
        assert agent._get_synth_name() == "TAL-U-NO-LX"
        assert agent._get_instrument_type() == PluginInstrumentType.CLASSIC_SYNTH

        characteristics = agent._get_synth_characteristics()
        assert "DCO" in characteristics["synthesis_type"]
        assert MusicalStyle.POP in characteristics["preferred_styles"]

        # Test plugin selection
        recommendation = agent.select_instrument_plugin(
            composition_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert recommendation.plugin_type == PluginInstrumentType.CLASSIC_SYNTH
        assert "TAL-U-NO-LX" in recommendation.plugin_name
        assert len(recommendation.reasoning) > 10

        # Test configuration
        config = agent.configure_instrument_plugin(recommendation, composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_type == PluginInstrumentType.CLASSIC_SYNTH
        assert "dco_saw" in config.parameters
        assert "vcf_freq" in config.parameters
        assert "chorus_1" in config.parameters
        assert len(config.reasoning) > 10

        # Test with ambient style
        ambient_context = CompositionContext(
            tempo=80.0,
            key_signature=MusicalKey.A_MINOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.AMBIENT,
        )

        config = agent.configure_instrument_plugin(recommendation, ambient_context)

        assert config.parameters["env_attack"] > 0.5  # Long attack for ambient
        assert config.parameters["chorus_2"] == 1  # Rich chorus for pads
        assert "ambient" in config.reasoning.lower()

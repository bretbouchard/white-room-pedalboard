"""Tests for specific instrument agents."""

from unittest.mock import AsyncMock

import pytest

from src.audio_agent.core.plugin_instrument_agent import (
    PluginInstrumentConfiguration,
    PluginInstrumentType,
)
from src.audio_agent.core.plugin_specialist import PluginSpecialist
from src.audio_agent.core.specific_instrument_agents import (
    DX7Agent,
    SerumAgent,
    SpecificInstrumentRegistry,
    TALUNOLXAgent,
)
from src.audio_agent.models.composition import (
    CompositionContext,
    CompositionStructure,
    HarmonicProgression,
    MusicalKey,
    MusicalStyle,
    SchillingerContext,
    TimeSignature,
)
from src.audio_agent.models.plugin import PluginCategory, PluginFormat, PluginMetadata


class TestSpecificInstrumentAgents:
    """Test cases for specific instrument agents."""

    @pytest.fixture
    def mock_plugin_specialist(self):
        """Create a mock plugin specialist."""
        mock_specialist = AsyncMock(spec=PluginSpecialist)
        mock_db = AsyncMock()

        # Mock plugin search
        mock_db.search_plugins_by_name.side_effect = (
            lambda name: [
                PluginMetadata(
                    name=name,
                    manufacturer="Test",
                    version="1.0",
                    unique_id=f"test_{name.lower().replace(' ', '_')}",
                    category=PluginCategory.SYNTHESIZER,
                    format=PluginFormat.VST3,
                    input_channels=0,
                    output_channels=2,
                )
            ]
            if name in ["Serum", "DX7", "TAL Uno LX"]
            else []
        )

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
            clerk_user_id="user_test123",
            harmonic_progression=HarmonicProgression(
                chords=["I", "IV", "V"],
                progression_type="I-IV-V",
                harmonic_rhythm=1.0,
                modulations=[],
            ),
            structure=CompositionStructure(
                sections=["verse", "chorus", "verse", "chorus"],
                section_lengths={"verse": 8.0, "chorus": 8.0},
                form="verse-chorus",
                total_measures=32,
            ),
            schillinger_context=SchillingerContext(
                composition_id="test_comp_123",
                rhythmic_patterns=["pattern_1", "pattern_2"],
                pitch_scales=["major_scale"],
                interference_patterns=[],
                symmetrical_structures=[],
                correlation_techniques=[],
            ),
            composer="test_composer",
            title="Test Composition",
            creation_date="2023-01-01T12:00:00Z",
        )

    def test_serum_agent(self, mock_plugin_specialist, composition_context):
        """Test the Serum agent."""
        agent = SerumAgent(mock_plugin_specialist)

        # Test instrument name and type
        assert agent.instrument_name == "Serum"
        assert agent.instrument_type == PluginInstrumentType.SYNTHESIZER

        # Test availability
        assert agent.is_available() is True

        # Test configuration
        config = agent.configure_for_context(composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_name == "Serum"
        assert config.plugin_type == PluginInstrumentType.SYNTHESIZER
        assert len(config.parameters) > 0
        assert "osc1_wt_pos" in config.parameters
        assert "filter_cutoff" in config.parameters
        assert "osc1_wt" in config.parameters  # Added missing parameter
        assert len(config.reasoning) > 10

    def test_dx7_agent(self, mock_plugin_specialist, composition_context):
        """Test the DX7 agent."""
        agent = DX7Agent(mock_plugin_specialist)

        # Test instrument name and type
        assert agent.instrument_name == "DX7"
        assert agent.instrument_type == PluginInstrumentType.SYNTHESIZER

        # Test availability
        assert agent.is_available() is True

        # Test configuration
        config = agent.configure_for_context(composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_name == "DX7"
        assert config.plugin_type == PluginInstrumentType.SYNTHESIZER
        assert len(config.parameters) > 0
        assert "algorithm" in config.parameters
        assert "feedback" in config.parameters
        assert len(config.reasoning) > 10

    def test_tal_uno_lx_agent(self, mock_plugin_specialist, composition_context):
        """Test the TAL-U-NO-LX agent."""
        agent = TALUNOLXAgent(mock_plugin_specialist)

        # Test instrument name and type
        assert agent.instrument_name == "TAL Uno LX"
        assert agent.instrument_type == PluginInstrumentType.SYNTHESIZER

        # Test availability
        assert agent.is_available() is True

        # Test configuration
        config = agent.configure_for_context(composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_name == "TAL Uno LX"
        assert config.plugin_type == PluginInstrumentType.SYNTHESIZER
        assert len(config.parameters) > 0
        assert "osc1_wave" in config.parameters  # Changed from dco_saw
        assert "cutoff" in config.parameters  # Changed from vcf_freq
        assert len(config.reasoning) > 10

    def test_specific_instrument_registry(self, mock_plugin_specialist):
        """Test the specific instrument registry."""
        registry = SpecificInstrumentRegistry(mock_plugin_specialist)

        # Test registry initialization - expecting 3 agents now
        assert len(registry.agents) == 3

        # Test getting agents
        serum_agent = registry.get_agent("Serum")
        assert isinstance(serum_agent, SerumAgent)

        dx7_agent = registry.get_agent("DX7")
        assert isinstance(dx7_agent, DX7Agent)

        tal_agent = registry.get_agent("TAL Uno LX")
        assert isinstance(tal_agent, TALUNOLXAgent)

        # Test getting agent for plugin
        serum_plugin_agent = registry.get_agent_for_plugin("Xfer Records Serum")
        assert isinstance(serum_plugin_agent, SerumAgent)

        dx7_plugin_agent = registry.get_agent_for_plugin("Yamaha DX7")
        assert isinstance(dx7_plugin_agent, DX7Agent)

        # Test getting available agents
        available_agents = registry.get_available_agents()
        assert len(available_agents) == 3

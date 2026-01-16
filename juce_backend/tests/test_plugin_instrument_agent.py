"""Tests for the plugin instrument agent."""

from unittest.mock import AsyncMock

import pytest

from src.audio_agent.core.plugin_database import PluginDatabase
from src.audio_agent.core.plugin_instrument_agent import (
    DrumMachineSubAgent,
    OrchestralSubAgent,
    PluginInstrumentAgent,
    PluginInstrumentConfiguration,
    PluginInstrumentRecommendation,
    PluginInstrumentType,
    SynthesizerSubAgent,
)
from src.audio_agent.core.plugin_specialist import PluginSpecialist
from src.audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)
from src.audio_agent.models.plugin import PluginCategory, PluginFormat, PluginMetadata
from src.audio_agent.models.user import UserPreferences


class TestPluginInstrumentAgent:
    """Test cases for the plugin instrument agent."""

    @pytest.fixture
    def mock_plugin_specialist(self):
        """Create a mock plugin specialist."""
        mock_specialist = AsyncMock(spec=PluginSpecialist)
        mock_db = AsyncMock(spec=PluginDatabase)

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
        ]

        classic_synth_plugins = [
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
                name="Jupiter-8V",
                manufacturer="Arturia",
                version="1.0",
                unique_id="arturia_jupiter",
                category=PluginCategory.SYNTHESIZER,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
        ]

        drum_plugins = [
            PluginMetadata(
                name="Battery 4",
                manufacturer="Native Instruments",
                version="1.0",
                unique_id="ni_battery",
                category=PluginCategory.DRUM_MACHINE,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
            PluginMetadata(
                name="Superior Drummer 3",
                manufacturer="Toontrack",
                version="1.0",
                unique_id="toontrack_sd3",
                category=PluginCategory.DRUM_MACHINE,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
        ]

        orchestral_plugins = [
            PluginMetadata(
                name="Spitfire Symphonic Orchestra",
                manufacturer="Spitfire Audio",
                version="1.0",
                unique_id="spitfire_symphonic",
                category=PluginCategory.ORCHESTRAL,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
            PluginMetadata(
                name="Berlin Orchestra",
                manufacturer="Orchestral Tools",
                version="1.0",
                unique_id="ot_berlin",
                category=PluginCategory.ORCHESTRAL,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
        ]

        # Configure mock database
        mock_db.get_plugins_by_category.side_effect = lambda category: {
            PluginCategory.SYNTHESIZER: synth_plugins + classic_synth_plugins,
            PluginCategory.DRUM_MACHINE: drum_plugins,
            PluginCategory.ORCHESTRAL: orchestral_plugins,
        }.get(category, [])

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
            plugin_preferences=None,
            mixing_preferences=None,
            learning_preferences=None,
        )

    def test_synthesizer_sub_agent(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test the synthesizer sub-agent."""
        agent = SynthesizerSubAgent(mock_plugin_specialist)

        # Test instrument type
        assert agent.instrument_type == PluginInstrumentType.SYNTHESIZER

        # Test plugin selection
        recommendation = agent.select_instrument_plugin(
            composition_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert recommendation.plugin_type == PluginInstrumentType.SYNTHESIZER
        assert recommendation.agent_id == "synthesizer_sub_agent"
        assert recommendation.clerk_user_id == "user_test123"
        assert len(recommendation.reasoning) > 10

        # Test plugin configuration
        config = agent.configure_instrument_plugin(recommendation, composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_type == PluginInstrumentType.SYNTHESIZER
        assert len(config.parameters) > 0
        assert len(config.reasoning) > 10

    def test_drum_machine_sub_agent(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test the drum machine sub-agent."""
        agent = DrumMachineSubAgent(mock_plugin_specialist)

        # Test instrument type
        assert agent.instrument_type == PluginInstrumentType.DRUM_MACHINE

        # Test plugin selection
        recommendation = agent.select_instrument_plugin(
            composition_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert recommendation.plugin_type == PluginInstrumentType.DRUM_MACHINE
        assert recommendation.agent_id == "drum_machine_sub_agent"
        assert len(recommendation.reasoning) > 10

        # Test plugin configuration
        config = agent.configure_instrument_plugin(recommendation, composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_type == PluginInstrumentType.DRUM_MACHINE
        assert len(config.parameters) > 0
        assert len(config.reasoning) > 10

    def test_orchestral_sub_agent(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test the orchestral sub-agent."""
        agent = OrchestralSubAgent(mock_plugin_specialist)

        # Test instrument type
        assert agent.instrument_type == PluginInstrumentType.ORCHESTRAL

        # Test plugin selection
        recommendation = agent.select_instrument_plugin(
            composition_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert recommendation.plugin_type == PluginInstrumentType.ORCHESTRAL
        assert recommendation.agent_id == "orchestral_sub_agent"
        assert len(recommendation.reasoning) > 10

        # Test plugin configuration
        config = agent.configure_instrument_plugin(recommendation, composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_type == PluginInstrumentType.ORCHESTRAL
        assert len(config.parameters) > 0
        assert len(config.reasoning) > 10
        assert "active_sections" in config.parameters

    def test_plugin_instrument_agent(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test the main plugin instrument agent."""
        agent = PluginInstrumentAgent(mock_plugin_specialist)

        # Test sub-agent initialization
        assert len(agent.sub_agents) == 4
        assert PluginInstrumentType.SYNTHESIZER in agent.sub_agents
        assert PluginInstrumentType.CLASSIC_SYNTH in agent.sub_agents
        assert PluginInstrumentType.DRUM_MACHINE in agent.sub_agents
        assert PluginInstrumentType.ORCHESTRAL in agent.sub_agents

        # Test instrument selection
        recommendation = agent.select_instrument_plugin(
            PluginInstrumentType.SYNTHESIZER,
            composition_context,
            None,
            user_preferences,
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert recommendation.plugin_type == PluginInstrumentType.SYNTHESIZER

        # Test instrument configuration
        config = agent.configure_instrument_plugin(recommendation, composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_type == PluginInstrumentType.SYNTHESIZER

        # Test performance stats
        stats = agent.get_agent_performance_stats()
        assert PluginInstrumentType.SYNTHESIZER.value in stats
        assert "select" in stats[PluginInstrumentType.SYNTHESIZER.value]
        assert "configure" in stats[PluginInstrumentType.SYNTHESIZER.value]

    def test_fallback_mechanisms(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test fallback mechanisms when sub-agents fail."""
        agent = PluginInstrumentAgent(mock_plugin_specialist)

        # Make the sub-agent fail
        agent.sub_agents[
            PluginInstrumentType.SYNTHESIZER
        ].select_instrument_plugin = AsyncMock(side_effect=Exception("Test failure"))

        # Test fallback recommendation
        recommendation = agent.select_instrument_plugin(
            PluginInstrumentType.SYNTHESIZER,
            composition_context,
            None,
            user_preferences,
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert recommendation.agent_id == "fallback_agent"
        assert "Fallback" in recommendation.reasoning

        # Make configuration fail
        agent.sub_agents[
            PluginInstrumentType.SYNTHESIZER
        ].configure_instrument_plugin = AsyncMock(side_effect=Exception("Test failure"))

        # Test fallback configuration
        config = agent.configure_instrument_plugin(recommendation, composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert "Fallback" in config.reasoning
        assert "volume" in config.parameters

    def test_plugin_knowledge_base(self, mock_plugin_specialist, composition_context):
        """Test the plugin knowledge base and learning system."""
        # Setup
        agent = PluginInstrumentAgent(mock_plugin_specialist)

        # Test initial knowledge base
        assert len(agent.plugin_knowledge_base) > 0

        # Test learning from user feedback
        agent.learn_from_user_feedback(
            plugin_name="Serum",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            context=composition_context,
            parameters={
                "attack": 0.01,
                "decay": 0.3,
                "sustain": 0.7,
                "release": 0.5,
                "filter_cutoff": 0.8,
                "unison_voices": 4,
            },
            success=True,
            user_feedback="Great sound for this track!",
        )

        # Verify knowledge was stored
        assert PluginInstrumentType.SYNTHESIZER in agent.plugin_knowledge_base
        assert "Serum" in agent.plugin_knowledge_base[PluginInstrumentType.SYNTHESIZER]

        plugin_knowledge = agent.plugin_knowledge_base[
            PluginInstrumentType.SYNTHESIZER
        ]["Serum"]
        assert plugin_knowledge["usage_count"] == 1
        assert plugin_knowledge["success_rate"] == 1.0
        assert "attack" in plugin_knowledge["known_parameters"]

        # Test context-specific knowledge
        context_key = f"{composition_context.style.value}_{composition_context.tempo:.0f}_{composition_context.key_signature.value}"
        assert context_key in plugin_knowledge["learned_contexts"]

        # Test retrieving learned configuration
        learned_config = agent.get_learned_configuration(
            plugin_name="Serum",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            context=composition_context,
        )

        assert learned_config is not None
        assert learned_config["attack"] == 0.01
        assert learned_config["filter_cutoff"] == 0.8

        # Test learning from negative feedback
        agent.learn_from_user_feedback(
            plugin_name="Massive X",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            context=composition_context,
            parameters={"attack": 0.5, "decay": 0.5, "sustain": 0.5, "release": 0.5},
            success=False,
            user_feedback="Doesn't fit the track",
        )

        # Verify negative feedback was stored
        assert (
            "Massive X" in agent.plugin_knowledge_base[PluginInstrumentType.SYNTHESIZER]
        )
        plugin_knowledge = agent.plugin_knowledge_base[
            PluginInstrumentType.SYNTHESIZER
        ]["Massive X"]
        assert plugin_knowledge["usage_count"] == 1
        assert plugin_knowledge["success_rate"] == 0.0

        # Test similar context matching
        similar_context = CompositionContext(
            tempo=125.0,  # Slightly different tempo
            key_signature=MusicalKey.C_MAJOR,  # Same key
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,  # Same style
        )

        learned_config = agent.get_learned_configuration(
            plugin_name="Serum",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            context=similar_context,
        )

        # Should still find the configuration due to similarity
        assert learned_config is not None
        assert learned_config["attack"] == 0.01

    def test_scan_for_new_plugins(self, mock_plugin_specialist):
        """Test scanning for new plugins."""
        agent = PluginInstrumentAgent(mock_plugin_specialist)

        # Mock the scan_plugins method to return new plugins
        original_plugins = mock_plugin_specialist.db.get_all_plugins()

        # Add a new plugin to the mock
        new_plugin = PluginMetadata(
            name="New Synth",
            manufacturer="Test",
            version="1.0",
            unique_id="test_new_synth",
            category=PluginCategory.SYNTHESIZER,
            format=PluginFormat.VST3,
            input_channels=0,
            output_channels=2,
        )

        # Update the mock to return the new plugin
        mock_plugin_specialist.db.get_all_plugins = AsyncMock(
            return_value=original_plugins + [new_plugin]
        )

        # Test scanning for new plugins
        new_count = agent.scan_for_new_plugins()

        # Should find the new plugin
        assert new_count >= 1
        assert PluginInstrumentType.SYNTHESIZER in agent.plugin_knowledge_base
        assert (
            "New Synth" in agent.plugin_knowledge_base[PluginInstrumentType.SYNTHESIZER]
        )

    def test_configure_and_validate_plugin(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test configuring and validating a plugin."""
        agent = PluginInstrumentAgent(mock_plugin_specialist)

        # First, get a plugin recommendation
        recommendation = agent.select_instrument_plugin(
            PluginInstrumentType.SYNTHESIZER,
            composition_context,
            None,
            user_preferences,
        )

        # Configure and validate the plugin
        config = agent.configure_and_validate_plugin(
            recommendation, composition_context
        )

        # Verify configuration
        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_name == recommendation.plugin_name
        assert config.plugin_type == recommendation.plugin_type
        assert len(config.parameters) > 0
        assert "volume" in config.parameters or "attack" in config.parameters

        # Test with learned configuration
        # First, add a learned configuration
        agent.learn_from_user_feedback(
            plugin_name=recommendation.plugin_name,
            instrument_type=recommendation.plugin_type,
            context=composition_context,
            parameters={
                "attack": 0.01,
                "decay": 0.3,
                "sustain": 0.7,
                "release": 0.5,
                "filter_cutoff": 0.8,
                "unison_voices": 4,
            },
            success=True,
        )

        # Now configure again - should use learned configuration
        config = agent.configure_and_validate_plugin(
            recommendation, composition_context
        )

        # Verify learned configuration is used
        assert config.parameters["attack"] == 0.01
        assert config.parameters["filter_cutoff"] == 0.8
        assert "learned configuration" in config.reasoning.lower()

    def test_validate_and_correct_configuration(self, mock_plugin_specialist):
        """Test validating and correcting a configuration."""
        agent = PluginInstrumentAgent(mock_plugin_specialist)

        # Test with valid configuration
        params = {
            "attack": 0.05,
            "decay": 0.5,
            "sustain": 0.7,
            "release": 0.5,
            "filter_cutoff": 0.6,
        }

        corrected, errors = agent.validate_and_correct_configuration(
            "Serum", PluginInstrumentType.SYNTHESIZER, params
        )

        # Should be valid with no errors
        assert len(errors) == 0
        assert corrected["attack"] == 0.05

        # Test with invalid configuration
        params = {
            "attack": -0.1,  # Invalid
            "decay": 20.0,  # Invalid
            "filter_cutoff": 1.5,  # Invalid
        }

        corrected, errors = agent.validate_and_correct_configuration(
            "Serum", PluginInstrumentType.SYNTHESIZER, params
        )

        # Should have errors and corrected values
        assert len(errors) > 0
        assert corrected["attack"] >= 0.0  # Corrected to min value
        assert corrected["decay"] <= 10.0  # Corrected to max value
        assert corrected["filter_cutoff"] <= 1.0  # Corrected to max value

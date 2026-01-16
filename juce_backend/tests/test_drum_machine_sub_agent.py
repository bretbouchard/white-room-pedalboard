"""Tests for the drum machine sub-agent."""

from unittest.mock import AsyncMock

import pytest
from audio_agent.core.drum_machine_sub_agent import DrumMachineSubAgent
from audio_agent.core.plugin_instrument_agent import (
    PluginInstrumentConfiguration,
    PluginInstrumentRecommendation,
    PluginInstrumentType,
)
from audio_agent.core.plugin_specialist import PluginSpecialist
from audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)
from audio_agent.models.plugin import PluginCategory, PluginFormat, PluginMetadata
from audio_agent.models.user import PluginPreferences, UserPreferences


class TestDrumMachineSubAgent:
    """Test cases for the drum machine sub-agent."""

    @pytest.fixture
    def mock_plugin_specialist(self):
        """Create a mock plugin specialist."""
        mock_specialist = AsyncMock(spec=PluginSpecialist)
        mock_db = AsyncMock()

        # Create mock plugins
        drum_plugins = [
            PluginMetadata(
                name="Battery 4",
                manufacturer="Native Instruments",
                version="4.0",
                unique_id="ni_battery",
                category=PluginCategory.DRUM_MACHINE,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
            PluginMetadata(
                name="Superior Drummer 3",
                manufacturer="Toontrack",
                version="3.0",
                unique_id="toontrack_sd3",
                category=PluginCategory.DRUM_MACHINE,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
            PluginMetadata(
                name="Addictive Drums 2",
                manufacturer="XLN Audio",
                version="2.0",
                unique_id="xln_addictive_drums",
                category=PluginCategory.DRUM_MACHINE,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
            ),
        ]

        # Configure mock database
        mock_db.get_plugins_by_category.return_value = drum_plugins

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
                preferred_brands=["Native Instruments", "Toontrack"],
                preferred_formats=[PluginFormat.VST3],
                preferred_categories=[PluginCategory.DRUM_MACHINE],
            ),
            mixing_preferences=None,
            learning_preferences=None,
        )

    def test_get_instrument_type(self, mock_plugin_specialist):
        """Test getting the instrument type."""
        agent = DrumMachineSubAgent(mock_plugin_specialist)
        assert agent._get_instrument_type() == PluginInstrumentType.DRUM_MACHINE

    def test_select_instrument_plugin(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test selecting a drum machine plugin."""
        agent = DrumMachineSubAgent(mock_plugin_specialist)

        # Test with electronic style
        recommendation = agent.select_instrument_plugin(
            composition_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert recommendation.plugin_type == PluginInstrumentType.DRUM_MACHINE
        assert recommendation.agent_id == "drum_machine_sub_agent"
        assert recommendation.clerk_user_id == "user_test123"
        assert len(recommendation.reasoning) > 10
        assert "Battery 4" in recommendation.plugin_name

        # Test with rock style
        rock_context = CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.E_MINOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ROCK,
        )

        recommendation = agent.select_instrument_plugin(
            rock_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert (
            "Superior Drummer" in recommendation.plugin_name
            or "Addictive Drums" in recommendation.plugin_name
        )
        assert "rock" in recommendation.reasoning.lower()

        # Test with complex time signature
        complex_context = CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=7, denominator=8),
            style=MusicalStyle.JAZZ,
        )

        recommendation = agent.select_instrument_plugin(
            complex_context, None, user_preferences
        )

        assert isinstance(recommendation, PluginInstrumentRecommendation)
        assert "Superior Drummer" in recommendation.plugin_name
        assert "7/8" in recommendation.reasoning

    def test_configure_instrument_plugin(
        self, mock_plugin_specialist, composition_context
    ):
        """Test configuring a drum machine plugin."""
        agent = DrumMachineSubAgent(mock_plugin_specialist)

        # First get a recommendation
        recommendation = agent.select_instrument_plugin(composition_context, None, None)

        # Test configuration
        config = agent.configure_instrument_plugin(recommendation, composition_context)

        assert isinstance(config, PluginInstrumentConfiguration)
        assert config.plugin_type == PluginInstrumentType.DRUM_MACHINE
        assert len(config.parameters) > 0
        assert "kick_level" in config.parameters
        assert "room_amount" in config.parameters
        assert len(config.reasoning) > 10

        # Test with different tempo
        fast_context = CompositionContext(
            tempo=160.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,
        )

        config = agent.configure_instrument_plugin(recommendation, fast_context)

        if "kick_attack" in config.parameters:
            assert (
                config.parameters["kick_attack"] <= 0.01
            )  # Fast attack for high tempo
        assert "fast tempo" in config.reasoning.lower()

        # Test with different time signature
        waltz_context = CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=3, denominator=4),
            style=MusicalStyle.JAZZ,
        )

        config = agent.configure_instrument_plugin(recommendation, waltz_context)

        if "kick_pattern" in config.parameters:
            assert config.parameters["kick_pattern"] == "waltz"
        assert "3/4" in config.reasoning

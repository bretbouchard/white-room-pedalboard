"""Tests for the hierarchical instrument agent."""

from unittest.mock import AsyncMock, patch

import pytest
from audio_agent.core.hierarchical_instrument_agent import (
    HierarchicalInstrumentAgent,
    InstrumentTypeDetector,
    SubAgentPerformanceMetrics,
)
from audio_agent.core.plugin_instrument_agent import (
    PluginInstrumentConfiguration,
    PluginInstrumentRecommendation,
    PluginInstrumentType,
)
from audio_agent.core.plugin_specialist import PluginSpecialist
from audio_agent.models.audio import (
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
from audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)
from audio_agent.models.plugin import PluginCategory, PluginFormat, PluginMetadata
from audio_agent.models.user import UserPreferences


class TestHierarchicalInstrumentAgent:
    """Test cases for the hierarchical instrument agent."""

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
            )
        ]

        # Configure mock database
        mock_db.get_plugins_by_category.side_effect = lambda category: {
            PluginCategory.SYNTHESIZER: synth_plugins,
            PluginCategory.DRUM_MACHINE: drum_plugins,
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
    def audio_analysis(self):
        """Create a test audio analysis."""
        return AudioAnalysis(
            timestamp=1625097600.0,
            sample_rate=44100,
            duration=180.0,
            channels=2,
            format=AudioFormat.WAV,
            features=AudioFeatures(
                spectral=SpectralFeatures(
                    centroid=2000.0,
                    rolloff=8000.0,
                    flux=0.6,
                    bandwidth=4000.0,
                    flatness=0.5,
                    mfcc=[
                        0.0,
                        0.1,
                        0.2,
                        0.3,
                        0.4,
                        0.5,
                        0.6,
                        0.7,
                        0.8,
                        0.9,
                        1.0,
                        1.1,
                        1.2,
                    ],
                ),
                dynamic=DynamicFeatures(
                    rms_level=0.5,
                    peak_level=0.8,
                    dynamic_range=12.0,
                    transient_density=3.0,
                    zero_crossing_rate=0.4,
                ),
                harmonic=HarmonicFeatures(
                    fundamental_freq=440.0,
                    harmonic_content=[0.8, 0.6, 0.4, 0.2, 0.1],
                    inharmonicity=0.3,
                    pitch_clarity=0.7,
                ),
                perceptual=PerceptualFeatures(
                    loudness_lufs=-14.0,
                    perceived_brightness=0.6,
                    perceived_warmth=0.4,
                    roughness=0.3,
                    sharpness=1.0,
                ),
                spatial=SpatialFeatures(
                    stereo_width=0.8, phase_correlation=0.5, balance=0.0
                ),
                frequency_balance=FrequencyBalance(
                    bass=0.7, low_mid=0.5, mid=0.6, high_mid=0.7, treble=0.4
                ),
                chroma=ChromaFeatures(
                    chroma=[0.1] * 12,
                    chroma_normalized=[0.1] * 12,
                    root_note_likelihood=[0.1] * 12,
                    key="C major",
                ),
                musical_context=MusicalContextFeatures(
                    key="C major",
                    current_chord={"root": "C", "type": "major"},
                    mode="major",
                    time_signature="4/4",
                ),
                rhythm=RhythmFeatures(
                    tempo=120.0,
                    beats=[0.0, 0.5, 1.0],
                    beat_strength=[0.9, 0.8, 0.7],
                    meter="4/4",
                    time_signature="4/4",
                    tempo_confidence=0.9,
                ),
                timbre=TimbreFeatures(
                    instruments=[{"name": "piano", "confidence": 0.8}],
                    harmonic_percussive_ratio=0.6,
                    attack_strength=0.7,
                    sustain_length=0.5,
                    vibrato_rate=None,
                    vibrato_extent=None,
                ),
                quality=QualityFeatures(
                    issues=[],
                    overall_quality=0.9,
                    noise_floor=-70.0,
                    has_clipping=False,
                    dc_offset=0.0,
                    hum_frequency=None,
                ),
            ),
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

    def test_instrument_type_detector(self, audio_analysis, composition_context):
        """Test the instrument type detector."""
        # Test detection from audio
        detected_types = InstrumentTypeDetector.detect_from_audio(audio_analysis)
        assert len(detected_types) > 0
        assert PluginInstrumentType.SYNTHESIZER in detected_types

        # Test detection from composition
        detected_types = InstrumentTypeDetector.detect_from_composition(
            composition_context
        )
        assert len(detected_types) > 0
        assert PluginInstrumentType.SYNTHESIZER in detected_types
        assert PluginInstrumentType.DRUM_MACHINE in detected_types

    def test_sub_agent_performance_metrics(self):
        """Test the sub-agent performance metrics."""
        metrics = SubAgentPerformanceMetrics()

        # Test initial state
        assert metrics.success_count == 0
        assert metrics.failure_count == 0
        assert metrics.success_rate == 0.0
        assert metrics.is_healthy is False

        # Test success updates
        metrics.update_success(0.1)
        assert metrics.success_count == 1
        assert metrics.failure_count == 0
        assert metrics.success_rate == 1.0
        assert metrics.avg_response_time == 0.1
        assert metrics.is_healthy is True

        # Test failure updates
        metrics.update_failure(0.2)
        assert metrics.success_count == 1
        assert metrics.failure_count == 1
        assert metrics.success_rate == 0.5
        assert metrics.avg_response_time == pytest.approx(0.15)  # (0.1 + 0.2) / 2

        # Test multiple updates
        for _ in range(4):
            metrics.update_success(0.1)

        assert metrics.success_count == 5
        assert metrics.failure_count == 1
        assert metrics.success_rate == 0.8333333333333334  # 5/6
        assert metrics.is_healthy is True

    def test_hierarchical_agent_initialization(self, mock_plugin_specialist):
        """Test hierarchical agent initialization."""
        agent = HierarchicalInstrumentAgent(mock_plugin_specialist)

        # Check that sub-agents are initialized
        assert len(agent.sub_agents) > 0
        assert len(agent.performance_metrics) == len(agent.sub_agents)

        # Check that performance metrics are initialized
        for instrument_type in agent.sub_agents:
            assert instrument_type in agent.performance_metrics
            metrics = agent.performance_metrics[instrument_type]
            assert isinstance(metrics, SubAgentPerformanceMetrics)

    def test_detect_instrument_types(
        self, mock_plugin_specialist, composition_context, audio_analysis
    ):
        """Test instrument type detection."""
        agent = HierarchicalInstrumentAgent(mock_plugin_specialist)

        # Test detection from composition
        detected_types = agent.detect_instrument_types(composition_context)
        assert len(detected_types) > 0

        # Test detection from audio
        detected_types = agent.detect_instrument_types(
            composition_context, audio_analysis
        )
        assert len(detected_types) > 0

    def test_select_instrument_plugins(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test instrument plugin selection."""
        agent = HierarchicalInstrumentAgent(mock_plugin_specialist)

        # Mock the sub-agents
        synth_agent = AsyncMock()
        synth_agent.instrument_type = PluginInstrumentType.SYNTHESIZER
        synth_agent.select_instrument_plugin.return_value = (
            PluginInstrumentRecommendation(
                agent_id="synth_agent",
                plugin_name="Serum",
                plugin_type=PluginInstrumentType.SYNTHESIZER,
                confidence=0.8,
                reasoning="Test reasoning",
                style_context="ELECTRONIC",
                composition_context=composition_context,
                alternative_plugins=["Massive X"],
                clerk_user_id=user_preferences.clerk_user_id,
            )
        )

        drum_agent = AsyncMock()
        drum_agent.instrument_type = PluginInstrumentType.DRUM_MACHINE
        drum_agent.select_instrument_plugin.return_value = (
            PluginInstrumentRecommendation(
                agent_id="drum_agent",
                plugin_name="Battery 4",
                plugin_type=PluginInstrumentType.DRUM_MACHINE,
                confidence=0.7,
                reasoning="Test reasoning",
                style_context="ELECTRONIC",
                composition_context=composition_context,
                alternative_plugins=[],
                clerk_user_id=user_preferences.clerk_user_id,
            )
        )

        # Register mock sub-agents
        agent.sub_agents = {
            PluginInstrumentType.SYNTHESIZER: synth_agent,
            PluginInstrumentType.DRUM_MACHINE: drum_agent,
        }

        # Initialize performance metrics
        for instrument_type in agent.sub_agents:
            agent.performance_metrics[instrument_type] = SubAgentPerformanceMetrics()

        # Test selection with specific instrument types
        recommendations = agent.select_instrument_plugins(
            composition_context,
            None,
            user_preferences,
            [PluginInstrumentType.SYNTHESIZER, PluginInstrumentType.DRUM_MACHINE],
        )

        assert len(recommendations) == 2
        assert recommendations[0].plugin_type == PluginInstrumentType.SYNTHESIZER
        assert recommendations[1].plugin_type == PluginInstrumentType.DRUM_MACHINE

        # Test selection with auto-detection
        with patch.object(
            agent,
            "detect_instrument_types",
            return_value=[PluginInstrumentType.SYNTHESIZER],
        ):
            recommendations = agent.select_instrument_plugins(
                composition_context, None, user_preferences
            )

            assert len(recommendations) == 1
            assert recommendations[0].plugin_type == PluginInstrumentType.SYNTHESIZER

    def test_configure_instrument_plugins(
        self, mock_plugin_specialist, composition_context
    ):
        """Test instrument plugin configuration."""
        agent = HierarchicalInstrumentAgent(mock_plugin_specialist)

        # Create test recommendations
        recommendations = [
            PluginInstrumentRecommendation(
                agent_id="synth_agent",
                plugin_name="Serum",
                plugin_type=PluginInstrumentType.SYNTHESIZER,
                confidence=0.8,
                reasoning="Test reasoning",
                style_context="ELECTRONIC",
                composition_context=composition_context,
                alternative_plugins=["Massive X"],
                clerk_user_id=None,
            ),
            PluginInstrumentRecommendation(
                agent_id="drum_agent",
                plugin_name="Battery 4",
                plugin_type=PluginInstrumentType.DRUM_MACHINE,
                confidence=0.7,
                reasoning="Test reasoning",
                style_context="ELECTRONIC",
                composition_context=composition_context,
                alternative_plugins=[],
                clerk_user_id=None,
            ),
        ]

        # Mock the sub-agents
        synth_agent = AsyncMock()
        synth_agent.instrument_type = PluginInstrumentType.SYNTHESIZER
        synth_agent.configure_instrument_plugin.return_value = (
            PluginInstrumentConfiguration(
                plugin_name="Serum",
                plugin_type=PluginInstrumentType.SYNTHESIZER,
                parameters={
                    "attack": 0.05,
                    "decay": 0.5,
                    "sustain": 0.7,
                    "release": 0.5,
                },
                reasoning="Test configuration",
            )
        )

        drum_agent = AsyncMock()
        drum_agent.instrument_type = PluginInstrumentType.DRUM_MACHINE
        drum_agent.configure_instrument_plugin.return_value = (
            PluginInstrumentConfiguration(
                plugin_name="Battery 4",
                plugin_type=PluginInstrumentType.DRUM_MACHINE,
                parameters={"volume": 0.8, "pan": 0.0},
                reasoning="Test configuration",
            )
        )

        # Register mock sub-agents
        agent.sub_agents = {
            PluginInstrumentType.SYNTHESIZER: synth_agent,
            PluginInstrumentType.DRUM_MACHINE: drum_agent,
        }

        # Initialize performance metrics
        for instrument_type in agent.sub_agents:
            agent.performance_metrics[instrument_type] = SubAgentPerformanceMetrics()

        # Test configuration
        configurations = agent.configure_instrument_plugins(
            recommendations, composition_context
        )

        assert len(configurations) == 2
        assert configurations[0].plugin_type == PluginInstrumentType.SYNTHESIZER
        assert configurations[1].plugin_type == PluginInstrumentType.DRUM_MACHINE
        assert "attack" in configurations[0].parameters
        assert "volume" in configurations[1].parameters

    def test_resolve_recommendation_conflicts(
        self, mock_plugin_specialist, composition_context
    ):
        """Test resolving recommendation conflicts."""
        agent = HierarchicalInstrumentAgent(mock_plugin_specialist)

        # Create conflicting recommendations
        recommendations = [
            PluginInstrumentRecommendation(
                agent_id="synth_agent1",
                plugin_name="Serum",
                plugin_type=PluginInstrumentType.SYNTHESIZER,
                confidence=0.8,
                reasoning="Test reasoning",
                style_context="ELECTRONIC",
                composition_context=composition_context,
                alternative_plugins=["Massive X"],
                clerk_user_id=None,
            ),
            PluginInstrumentRecommendation(
                agent_id="synth_agent2",
                plugin_name="Massive X",
                plugin_type=PluginInstrumentType.SYNTHESIZER,
                confidence=0.7,
                reasoning="Test reasoning",
                style_context="ELECTRONIC",
                composition_context=composition_context,
                alternative_plugins=["Serum"],
                clerk_user_id=None,
            ),
            PluginInstrumentRecommendation(
                agent_id="drum_agent",
                plugin_name="Battery 4",
                plugin_type=PluginInstrumentType.DRUM_MACHINE,
                confidence=0.9,
                reasoning="Test reasoning",
                style_context="ELECTRONIC",
                composition_context=composition_context,
                alternative_plugins=[],
                clerk_user_id=None,
            ),
        ]

        # Test conflict resolution
        resolved = agent._resolve_recommendation_conflicts(recommendations)

        # Should have one recommendation per instrument type
        assert len(resolved) == 2

        # Check that the highest confidence recommendation was selected for each type
        synth_rec = next(
            r for r in resolved if r.plugin_type == PluginInstrumentType.SYNTHESIZER
        )
        drum_rec = next(
            r for r in resolved if r.plugin_type == PluginInstrumentType.DRUM_MACHINE
        )

        assert synth_rec.plugin_name == "Serum"
        assert drum_rec.plugin_name == "Battery 4"

        # Check that alternatives were merged
        assert "Massive X" in synth_rec.alternative_plugins

    def test_fallback_mechanisms(
        self, mock_plugin_specialist, composition_context, user_preferences
    ):
        """Test fallback mechanisms when sub-agents fail."""
        agent = HierarchicalInstrumentAgent(mock_plugin_specialist)

        # Mock the sub-agents to fail
        synth_agent = AsyncMock()
        synth_agent.instrument_type = PluginInstrumentType.SYNTHESIZER
        synth_agent.select_instrument_plugin.side_effect = Exception("Test failure")

        # Register mock sub-agents
        agent.sub_agents = {PluginInstrumentType.SYNTHESIZER: synth_agent}

        # Initialize performance metrics
        for instrument_type in agent.sub_agents:
            agent.performance_metrics[instrument_type] = SubAgentPerformanceMetrics()

        # Test selection with failing sub-agent
        recommendations = agent.select_instrument_plugins(
            composition_context,
            None,
            user_preferences,
            [PluginInstrumentType.SYNTHESIZER],
        )

        # Should get a fallback recommendation
        assert len(recommendations) == 1
        assert recommendations[0].agent_id == "fallback_agent"
        assert "Fallback" in recommendations[0].reasoning

        # Test configuration with failing sub-agent
        recommendation = PluginInstrumentRecommendation(
            agent_id="synth_agent",
            plugin_name="Serum",
            plugin_type=PluginInstrumentType.SYNTHESIZER,
            confidence=0.8,
            reasoning="Test reasoning",
            style_context="ELECTRONIC",
            composition_context=composition_context,
            alternative_plugins=[],
            clerk_user_id=None,
        )

        synth_agent.configure_instrument_plugin.side_effect = Exception("Test failure")

        configurations = agent.configure_instrument_plugins(
            [recommendation], composition_context
        )

        # Should get a fallback configuration
        assert len(configurations) == 1
        assert "Fallback" in configurations[0].reasoning
        assert "volume" in configurations[0].parameters

    def test_performance_stats(self, mock_plugin_specialist):
        """Test getting performance statistics."""
        agent = HierarchicalInstrumentAgent(mock_plugin_specialist)

        # Initialize performance metrics with some data
        agent.performance_metrics = {
            PluginInstrumentType.SYNTHESIZER: SubAgentPerformanceMetrics(
                success_count=5, failure_count=1, avg_response_time=0.1
            ),
            PluginInstrumentType.DRUM_MACHINE: SubAgentPerformanceMetrics(
                success_count=3, failure_count=2, avg_response_time=0.2
            ),
        }

        # Get performance stats
        stats = agent.get_performance_stats()

        # Check stats
        assert PluginInstrumentType.SYNTHESIZER.value in stats
        assert PluginInstrumentType.DRUM_MACHINE.value in stats

        synth_stats = stats[PluginInstrumentType.SYNTHESIZER.value]
        assert synth_stats["success_count"] == 5
        assert synth_stats["failure_count"] == 1
        assert synth_stats["success_rate"] == 0.8333333333333334  # 5/6
        assert synth_stats["avg_response_time"] == 0.1
        assert synth_stats["is_healthy"] is True

        drum_stats = stats[PluginInstrumentType.DRUM_MACHINE.value]
        assert drum_stats["success_count"] == 3
        assert drum_stats["failure_count"] == 2
        assert drum_stats["success_rate"] == 0.6  # 3/5
        assert drum_stats["avg_response_time"] == 0.2
        assert drum_stats["is_healthy"] is True

"""Tests for Composition-Aware Mixing Engine."""

from unittest.mock import AsyncMock, patch

import pytest
from audio_agent.core.composition_analyzer import (
    CompositionAnalysisResult,
    CompositionAnalyzer,
    SectionType,
)
from audio_agent.core.composition_aware_mixing import (
    CompositionAwareMixingEngine,
    FrequencyRange,
    MixingAction,
    MixingPlan,
    MixingPriority,
    MixingRole,
    MixingStrategy,
    TrackMixingContext,
    create_mixing_plan_for_composition,
)
from audio_agent.models.composition import (
    CompositionContext,
    CompositionStructure,
    HarmonicProgression,
    MusicalKey,
    MusicalStyle,
    SchillingerContext,
    TimeSignature,
)


@pytest.fixture
def basic_composition_context():
    """Create a basic composition context for testing."""
    return CompositionContext(
        tempo=120.0,
        key_signature=MusicalKey.C_MAJOR,
        time_signature=TimeSignature(numerator=4, denominator=4),
        style=MusicalStyle.POP,
        title="Test Composition",
    )


@pytest.fixture
def detailed_composition_context():
    """Create a detailed composition context with structure and harmony."""
    return CompositionContext(
        tempo=120.0,
        key_signature=MusicalKey.C_MAJOR,
        time_signature=TimeSignature(numerator=4, denominator=4),
        style=MusicalStyle.POP,
        title="Test Composition",
        harmonic_progression=HarmonicProgression(
            chords=["I", "IV", "V", "I"], progression_type="I-IV-V", harmonic_rhythm=1.0
        ),
        structure=CompositionStructure(
            sections=["Intro", "Verse", "Chorus", "Verse", "Chorus", "Outro"],
            section_lengths={"Intro": 4, "Verse": 8, "Chorus": 8, "Outro": 4},
            form="Verse-Chorus",
            total_measures=32,
        ),
        schillinger_context=SchillingerContext(
            composition_id="comp_123456789",
            rhythmic_patterns=["rhythm_interference"],
            pitch_scales=["pitch_resultant"],
            correlation_techniques=["corr_symmetrical"],
        ),
        instrumentation=["piano", "drums", "bass", "guitar"],
    )


@pytest.fixture
def mock_tracks():
    """Create mock tracks for testing."""
    return [
        {"id": "track_1", "name": "Kick", "instrument": "kick", "role": "foundation"},
        {"id": "track_2", "name": "Bass", "instrument": "bass", "role": "foundation"},
        {"id": "track_3", "name": "Piano", "instrument": "piano", "role": "harmony"},
        {
            "id": "track_4",
            "name": "Lead Vocal",
            "instrument": "vocal",
            "role": "melody",
        },
        {"id": "track_5", "name": "Guitar", "instrument": "guitar", "role": "harmony"},
    ]


@pytest.fixture
def mock_analysis_result():
    """Create a mock analysis result."""
    analysis = AsyncMock(spec=CompositionAnalysisResult)
    analysis.dynamic_range_recommendation = 12.0
    analysis.get_mixing_recommendations.return_value = {
        "dynamic_range": 12.0,
        "style_specific": {
            "compression": "moderate",
            "reverb": "medium",
            "eq_approach": "balanced",
        },
    }
    analysis.structural_analysis.section_types = {
        "Intro": SectionType.INTRO,
        "Verse": SectionType.VERSE,
        "Chorus": SectionType.CHORUS,
        "Outro": SectionType.OUTRO,
    }
    analysis.structural_analysis.energy_profile = {
        "Intro": 0.4,
        "Verse": 0.6,
        "Chorus": 0.9,
        "Outro": 0.5,
    }
    analysis.structural_analysis.transitions = [
        {
            "from_section": "Intro",
            "to_section": "Verse",
            "measure": 4,
            "type": "standard",
        },
        {
            "from_section": "Verse",
            "to_section": "Chorus",
            "measure": 12,
            "type": "standard",
        },
    ]
    analysis.spatial_width_profile = {
        "Intro": 0.6,
        "Verse": 0.7,
        "Chorus": 0.9,
        "Outro": 0.7,
    }
    analysis.frequency_balance_profile = {
        "Verse": {"low": 0.7, "low_mid": 0.7, "mid": 0.7, "high_mid": 0.7, "high": 0.7},
        "Chorus": {
            "low": 0.8,
            "low_mid": 0.7,
            "mid": 0.7,
            "high_mid": 0.8,
            "high": 0.8,
        },
    }
    return analysis


class TestCompositionAwareMixingEngine:
    """Tests for CompositionAwareMixingEngine."""

    def test_create_mixing_plan(
        self, detailed_composition_context, mock_tracks, mock_analysis_result
    ):
        """Test creating a mixing plan."""
        with patch.object(
            CompositionAnalyzer,
            "analyze_composition",
            return_value=mock_analysis_result,
        ):
            engine = CompositionAwareMixingEngine()
            plan = engine.create_mixing_plan(detailed_composition_context, mock_tracks)

            assert isinstance(plan, MixingPlan)
            assert plan.composition_id == "comp_123456789"
            assert isinstance(plan.strategy, MixingStrategy)
            assert len(plan.track_contexts) == 5
            assert len(plan.actions) > 0

            # Check track contexts
            assert "track_1" in plan.track_contexts
            assert plan.track_contexts["track_1"].instrument == "kick"
            assert plan.track_contexts["track_1"].role == MixingRole.FOUNDATION

            # Check actions
            master_actions = [a for a in plan.actions if a.track_id == "master"]
            assert len(master_actions) > 0

            # Check sorted actions
            sorted_actions = plan.sorted_actions
            assert len(sorted_actions) == len(plan.actions)
            assert sorted_actions[0].priority >= sorted_actions[-1].priority

    def test_create_mixing_strategy(
        self, detailed_composition_context, mock_analysis_result
    ):
        """Test creating a mixing strategy."""
        engine = CompositionAwareMixingEngine()
        strategy = engine._create_mixing_strategy(
            detailed_composition_context, mock_analysis_result
        )

        assert isinstance(strategy, MixingStrategy)
        assert strategy.target_loudness_lufs == -8.0  # POP style
        assert strategy.dynamic_range_db == 12.0
        assert strategy.stereo_width_overall == 0.8
        assert len(strategy.frequency_balance) == 7  # All frequency ranges
        assert len(strategy.section_characteristics) == 4  # All sections
        assert len(strategy.transitions) == 2
        assert len(strategy.style_specific_settings) > 0

    def test_create_track_contexts(
        self, detailed_composition_context, mock_tracks, mock_analysis_result
    ):
        """Test creating track contexts."""
        engine = CompositionAwareMixingEngine()
        track_contexts = engine._create_track_contexts(
            mock_tracks, detailed_composition_context, mock_analysis_result
        )

        assert len(track_contexts) == 5
        assert all(
            isinstance(ctx, TrackMixingContext) for ctx in track_contexts.values()
        )

        # Check kick drum context
        kick = track_contexts["track_1"]
        assert kick.instrument == "kick"
        assert kick.role == MixingRole.FOUNDATION
        assert kick.priority == MixingPriority.HIGH
        assert FrequencyRange.SUB_BASS in kick.primary_frequency_ranges
        assert kick.transient_content > 0.7  # High transient content for drums
        assert kick.stereo_width < 0.5  # Narrow stereo for foundation elements

        # Check vocal context
        vocal = track_contexts["track_4"]
        assert vocal.instrument == "vocal"
        assert vocal.role == MixingRole.MELODY
        assert vocal.priority == MixingPriority.CRITICAL
        assert FrequencyRange.MIDS in vocal.primary_frequency_ranges
        assert vocal.depth_position < 0.5  # Forward in the mix

    def test_generate_mixing_actions(
        self, detailed_composition_context, mock_tracks, mock_analysis_result
    ):
        """Test generating mixing actions."""
        with patch.object(
            CompositionAnalyzer,
            "analyze_composition",
            return_value=mock_analysis_result,
        ):
            engine = CompositionAwareMixingEngine()
            plan = engine.create_mixing_plan(detailed_composition_context, mock_tracks)

            # Check global actions
            global_actions = [
                a for a in plan.actions if a.track_id == "master" and a.section is None
            ]
            assert len(global_actions) > 0
            assert any(a.parameter == "target_loudness" for a in global_actions)
            assert any(a.parameter == "eq_balance" for a in global_actions)

            # Check track-specific actions
            kick_actions = [
                a for a in plan.actions if a.track_id == "track_1" and a.section is None
            ]
            assert len(kick_actions) > 0
            assert any(a.parameter == "volume" for a in kick_actions)
            assert any(a.parameter == "eq_settings" for a in kick_actions)
            assert any(a.parameter == "compression" for a in kick_actions)

            # Check section-specific actions
            section_actions = [a for a in plan.actions if a.section is not None]
            assert len(section_actions) > 0

            # Check transition actions
            transition_actions = [
                a for a in plan.actions if a.action_type == "add_automation"
            ]
            assert len(transition_actions) > 0

    def test_determine_mixing_role(self):
        """Test determining mixing role from instrument."""
        engine = CompositionAwareMixingEngine()

        assert engine._determine_mixing_role("kick") == MixingRole.FOUNDATION
        assert engine._determine_mixing_role("bass guitar") == MixingRole.FOUNDATION
        assert engine._determine_mixing_role("drums") == MixingRole.RHYTHM
        assert engine._determine_mixing_role("piano") == MixingRole.HARMONY
        assert engine._determine_mixing_role("lead vocal") == MixingRole.MELODY
        assert engine._determine_mixing_role("backing vocal") == MixingRole.COUNTERPOINT
        assert engine._determine_mixing_role("ambient pad") == MixingRole.TEXTURE
        assert engine._determine_mixing_role("tambourine") == MixingRole.PERCUSSION
        assert engine._determine_mixing_role("fx") == MixingRole.EFFECT
        assert engine._determine_mixing_role("unknown") == MixingRole.HARMONY  # Default

    def test_determine_frequency_ranges(self):
        """Test determining frequency ranges from instrument."""
        engine = CompositionAwareMixingEngine()

        assert FrequencyRange.SUB_BASS in engine._determine_frequency_ranges("kick")
        assert FrequencyRange.BASS in engine._determine_frequency_ranges("bass")
        assert FrequencyRange.MIDS in engine._determine_frequency_ranges("piano")
        assert FrequencyRange.HIGH_MIDS in engine._determine_frequency_ranges("vocal")
        assert FrequencyRange.PRESENCE in engine._determine_frequency_ranges("cymbal")
        assert FrequencyRange.BRILLIANCE in engine._determine_frequency_ranges("hi-hat")

    def test_calculate_track_panning(self):
        """Test calculating track panning."""
        engine = CompositionAwareMixingEngine()

        # Create test contexts
        kick = TrackMixingContext(
            track_id="track_1",
            track_name="Kick",
            instrument="kick",
            role=MixingRole.FOUNDATION,
            priority=MixingPriority.HIGH,
            primary_frequency_ranges=[FrequencyRange.SUB_BASS, FrequencyRange.BASS],
            dynamic_range=10.0,
        )

        vocal = TrackMixingContext(
            track_id="track_2",
            track_name="Vocal",
            instrument="vocal",
            role=MixingRole.MELODY,
            priority=MixingPriority.CRITICAL,
            primary_frequency_ranges=[FrequencyRange.MIDS, FrequencyRange.HIGH_MIDS],
            dynamic_range=20.0,
        )

        guitar1 = TrackMixingContext(
            track_id="track_3",
            track_name="Guitar 1",
            instrument="guitar",
            role=MixingRole.HARMONY,
            priority=MixingPriority.MEDIUM,
            primary_frequency_ranges=[FrequencyRange.LOW_MIDS, FrequencyRange.MIDS],
            dynamic_range=15.0,
        )

        guitar2 = TrackMixingContext(
            track_id="track_4",
            track_name="Guitar 2",
            instrument="guitar",
            role=MixingRole.HARMONY,
            priority=MixingPriority.MEDIUM,
            primary_frequency_ranges=[FrequencyRange.LOW_MIDS, FrequencyRange.MIDS],
            dynamic_range=15.0,
        )

        track_contexts = {
            "track_1": kick,
            "track_2": vocal,
            "track_3": guitar1,
            "track_4": guitar2,
        }

        # Foundation elements should be centered
        assert engine._calculate_track_panning(kick, track_contexts) == 0.0

        # Melody elements should be centered
        assert engine._calculate_track_panning(vocal, track_contexts) == 0.0

        # Similar harmony elements should be panned apart
        guitar1_pan = engine._calculate_track_panning(guitar1, track_contexts)
        guitar2_pan = engine._calculate_track_panning(guitar2, track_contexts)

        # Guitars should be panned to opposite sides
        assert abs(guitar1_pan) > 0.0
        assert abs(guitar2_pan) > 0.0
        assert (guitar1_pan * guitar2_pan) < 0.0  # Different signs

    def test_create_mixing_plan_for_composition(
        self, detailed_composition_context, mock_tracks, mock_analysis_result
    ):
        """Test the create_mixing_plan_for_composition utility function."""
        with patch.object(
            CompositionAnalyzer,
            "analyze_composition",
            return_value=mock_analysis_result,
        ):
            result = create_mixing_plan_for_composition(
                detailed_composition_context, mock_tracks
            )

            assert isinstance(result, dict)
            assert "composition_id" in result
            assert "strategy" in result
            assert "actions" in result
            assert len(result["actions"]) > 0
            assert all(isinstance(action, dict) for action in result["actions"])


class TestMixingModels:
    """Tests for mixing models."""

    def test_mixing_strategy_model(self):
        """Test MixingStrategy model."""
        strategy = MixingStrategy(
            target_loudness_lufs=-14.0,
            dynamic_range_db=12.0,
            stereo_width_overall=0.8,
            frequency_balance={
                FrequencyRange.SUB_BASS: 0.7,
                FrequencyRange.BASS: 0.7,
                FrequencyRange.LOW_MIDS: 0.7,
                FrequencyRange.MIDS: 0.7,
                FrequencyRange.HIGH_MIDS: 0.7,
                FrequencyRange.PRESENCE: 0.7,
                FrequencyRange.BRILLIANCE: 0.7,
            },
        )

        assert strategy.target_loudness_lufs == -14.0
        assert strategy.dynamic_range_db == 12.0
        assert strategy.stereo_width_overall == 0.8
        assert len(strategy.frequency_balance) == 7

        # Test validation
        with pytest.raises(ValueError):
            MixingStrategy(
                target_loudness_lufs=-5.0,  # Too loud
                dynamic_range_db=12.0,
                frequency_balance={},
            )

        with pytest.raises(ValueError):
            MixingStrategy(
                target_loudness_lufs=-14.0,
                dynamic_range_db=5.0,  # Too compressed
                frequency_balance={},
            )

    def test_track_mixing_context_model(self):
        """Test TrackMixingContext model."""
        context = TrackMixingContext(
            track_id="track_1",
            track_name="Kick",
            instrument="kick",
            role=MixingRole.FOUNDATION,
            priority=MixingPriority.HIGH,
            primary_frequency_ranges=[FrequencyRange.SUB_BASS, FrequencyRange.BASS],
            dynamic_range=10.0,
            transient_content=0.9,
            stereo_width=0.1,
            depth_position=0.2,
        )

        assert context.track_id == "track_1"
        assert context.track_name == "Kick"
        assert context.instrument == "kick"
        assert context.role == MixingRole.FOUNDATION
        assert context.priority == MixingPriority.HIGH
        assert FrequencyRange.SUB_BASS in context.primary_frequency_ranges
        assert context.dynamic_range == 10.0
        assert context.transient_content == 0.9
        assert context.stereo_width == 0.1
        assert context.depth_position == 0.2

        # Test validation
        with pytest.raises(ValueError):
            TrackMixingContext(
                track_id="track_1",
                track_name="Kick",
                instrument="kick",
                role=MixingRole.FOUNDATION,
                priority=MixingPriority.HIGH,
                primary_frequency_ranges=[],  # Empty list not allowed
                dynamic_range=10.0,
            )

        with pytest.raises(ValueError):
            TrackMixingContext(
                track_id="track_1",
                track_name="Kick",
                instrument="kick",
                role=MixingRole.FOUNDATION,
                priority=MixingPriority.HIGH,
                primary_frequency_ranges=[FrequencyRange.SUB_BASS],
                dynamic_range=-1.0,  # Negative not allowed
            )

    def test_mixing_action_model(self):
        """Test MixingAction model."""
        action = MixingAction(
            track_id="track_1",
            action_type="set_parameter",
            parameter="volume",
            value=-3.0,
            priority=80,
            reasoning="Set initial volume based on priority",
        )

        assert action.track_id == "track_1"
        assert action.action_type == "set_parameter"
        assert action.parameter == "volume"
        assert action.value == -3.0
        assert action.priority == 80
        assert action.reasoning == "Set initial volume based on priority"
        assert action.section is None

        # Test with section
        section_action = MixingAction(
            track_id="track_1",
            action_type="set_parameter",
            parameter="volume",
            value=2.0,
            section="Chorus",
            priority=40,
            reasoning="Boost volume in chorus",
        )

        assert section_action.section == "Chorus"

        # Test with automation
        automation_action = MixingAction(
            track_id="track_1",
            action_type="add_automation",
            parameter="filter_cutoff",
            value={
                "start_measure": 8,
                "end_measure": 12,
                "start_value": 0.3,
                "end_value": 1.0,
                "curve": "exponential",
            },
            priority=30,
            reasoning="Add filter sweep for transition",
        )

        assert automation_action.action_type == "add_automation"
        assert "start_measure" in automation_action.value

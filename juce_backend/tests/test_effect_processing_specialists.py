"""Tests for the Effect Processing Specialist Agents."""

from unittest.mock import AsyncMock

import pytest
from audio_agent.core.dynamics_specialist import (
    DynamicsIssue,
    DynamicsRecommendation,
    DynamicsSpecialist,
)
from audio_agent.core.eq_specialist import (
    EQRecommendation,
    EQSpecialist,
    FrequencyIssue,
)
from audio_agent.core.plugin_specialist import PluginSpecialist
from audio_agent.core.spatial_specialist import (
    SpatialIssue,
    SpatialRecommendation,
    SpatialSpecialist,
)
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
from audio_agent.models.plugin import PluginCategory, PluginRecommendation
from audio_agent.models.user import UserPreferences


class TestEffectProcessingSpecialists:
    """Test cases for the Effect Processing Specialist Agents."""

    @pytest.fixture
    def plugin_specialist(self):
        """Create a mock plugin specialist."""
        specialist = AsyncMock(spec=PluginSpecialist)

        # Mock the get_plugins_by_category method
        def mock_get_plugins(category):
            plugins = []
            if category == PluginCategory.EQ:
                plugins = [
                    AsyncMock(name="FabFilter Pro-Q 3"),
                    AsyncMock(name="Waves SSL E-Channel"),
                    AsyncMock(name="TDR Nova"),
                ]
            elif category == PluginCategory.COMPRESSOR:
                plugins = [
                    AsyncMock(name="FabFilter Pro-C 2"),
                    AsyncMock(name="Waves CLA-76"),
                    AsyncMock(name="TDR Kotelnikov"),
                ]
            elif category == PluginCategory.REVERB:
                plugins = [
                    AsyncMock(name="Valhalla Room"),
                    AsyncMock(name="FabFilter Pro-R"),
                    AsyncMock(name="Waves Abbey Road Plates"),
                ]
            elif category == PluginCategory.DELAY:
                plugins = [
                    AsyncMock(name="FabFilter Timeless 3"),
                    AsyncMock(name="Soundtoys EchoBoy"),
                    AsyncMock(name="Waves H-Delay"),
                ]
            return plugins

        specialist.get_plugins_by_category.side_effect = mock_get_plugins
        return specialist

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
            clerk_user_id="user_123",
            preferred_plugins={
                "eq": ["FabFilter Pro-Q 3", "Waves SSL E-Channel"],
                "compressor": ["FabFilter Pro-C 2", "Waves CLA-76"],
                "reverb": ["Valhalla Room", "FabFilter Pro-R"],
            },
            experience_level="intermediate",
            target_loudness=-14.0,
        )

    def test_eq_specialist_initialization(self, plugin_specialist):
        """Test initialization of the EQ specialist."""
        specialist = EQSpecialist(plugin_specialist)
        assert specialist is not None
        assert specialist.plugin_specialist == plugin_specialist
        assert hasattr(specialist, "frequency_ranges")
        assert hasattr(specialist, "common_issues")

    def test_eq_specialist_analyze_frequency_issues(
        self, plugin_specialist, audio_analysis, composition_context
    ):
        """Test frequency issue analysis."""
        specialist = EQSpecialist(plugin_specialist)
        issues = specialist.analyze_frequency_issues(
            audio_analysis, composition_context
        )

        # Check that issues were identified
        assert len(issues) > 0

        # Check that issues have the correct structure
        for issue in issues:
            assert isinstance(issue, FrequencyIssue)
            assert 0.0 <= issue.severity <= 1.0
            assert isinstance(issue.frequency_range, tuple)
            assert len(issue.frequency_range) == 2
            assert issue.frequency_range[0] < issue.frequency_range[1]
            assert issue.suggested_action in ["cut", "boost"]

    def test_eq_specialist_select_eq_plugin(
        self, plugin_specialist, audio_analysis, composition_context, user_preferences
    ):
        """Test EQ plugin selection."""
        specialist = EQSpecialist(plugin_specialist)
        recommendation = specialist.select_eq_plugin(
            audio_analysis, composition_context, user_preferences
        )

        # Check that a recommendation was made
        assert recommendation is not None
        assert isinstance(recommendation, PluginRecommendation)
        assert recommendation.plugin_category == PluginCategory.EQ
        assert recommendation.plugin_name in [
            "FabFilter Pro-Q 3",
            "Waves SSL E-Channel",
            "TDR Nova",
        ]
        assert recommendation.reasoning is not None
        assert len(recommendation.reasoning) > 0

    def test_eq_specialist_create_eq_recommendation(
        self, plugin_specialist, audio_analysis, composition_context, user_preferences
    ):
        """Test creation of complete EQ recommendation."""
        specialist = EQSpecialist(plugin_specialist)
        recommendation = specialist.create_eq_recommendation(
            audio_analysis, composition_context, user_preferences
        )

        # Check that a recommendation was made with bands
        assert recommendation is not None
        assert isinstance(recommendation, EQRecommendation)
        assert recommendation.plugin_recommendation is not None
        assert recommendation.bands is not None
        assert len(recommendation.bands) > 0

    def test_dynamics_specialist_initialization(self, plugin_specialist):
        """Test initialization of the dynamics specialist."""
        specialist = DynamicsSpecialist(plugin_specialist)
        assert specialist is not None
        assert specialist.plugin_specialist == plugin_specialist
        assert hasattr(specialist, "common_issues")

    def test_dynamics_specialist_analyze_dynamics_issues(
        self, plugin_specialist, audio_analysis, composition_context
    ):
        """Test dynamics issue analysis."""
        specialist = DynamicsSpecialist(plugin_specialist)
        issues = specialist.analyze_dynamics_issues(audio_analysis, composition_context)

        # Check that issues were identified
        assert len(issues) > 0

        # Check that issues have the correct structure
        for issue in issues:
            assert isinstance(issue, DynamicsIssue)
            assert 0.0 <= issue.severity <= 1.0
            assert issue.suggested_action is not None
            assert issue.suggested_processor is not None

    def test_dynamics_specialist_select_dynamics_plugin(
        self, plugin_specialist, audio_analysis, composition_context, user_preferences
    ):
        """Test dynamics plugin selection."""
        specialist = DynamicsSpecialist(plugin_specialist)
        recommendation = specialist.select_dynamics_plugin(
            audio_analysis, composition_context, user_preferences
        )

        # Check that a recommendation was made
        assert recommendation is not None
        assert isinstance(recommendation, PluginRecommendation)
        assert recommendation.plugin_category == PluginCategory.COMPRESSOR
        assert recommendation.plugin_name in [
            "FabFilter Pro-C 2",
            "Waves CLA-76",
            "TDR Kotelnikov",
        ]
        assert recommendation.reasoning is not None
        assert len(recommendation.reasoning) > 0

    def test_dynamics_specialist_create_dynamics_recommendation(
        self, plugin_specialist, audio_analysis, composition_context, user_preferences
    ):
        """Test creation of complete dynamics recommendation."""
        specialist = DynamicsSpecialist(plugin_specialist)
        recommendation = specialist.create_dynamics_recommendation(
            audio_analysis, composition_context, user_preferences
        )

        # Check that a recommendation was made with settings
        assert recommendation is not None
        assert isinstance(recommendation, DynamicsRecommendation)
        assert recommendation.plugin_recommendation is not None
        assert recommendation.settings is not None
        assert recommendation.settings.threshold is not None
        assert recommendation.settings.ratio is not None
        assert recommendation.settings.attack is not None
        assert recommendation.settings.release is not None

    def test_spatial_specialist_initialization(self, plugin_specialist):
        """Test initialization of the spatial specialist."""
        specialist = SpatialSpecialist(plugin_specialist)
        assert specialist is not None
        assert specialist.plugin_specialist == plugin_specialist
        assert hasattr(specialist, "common_issues")
        assert hasattr(specialist, "reverb_presets")
        assert hasattr(specialist, "delay_presets")

    def test_spatial_specialist_analyze_spatial_issues(
        self, plugin_specialist, audio_analysis, composition_context
    ):
        """Test spatial issue analysis."""
        specialist = SpatialSpecialist(plugin_specialist)
        issues = specialist.analyze_spatial_issues(audio_analysis, composition_context)

        # Check that issues were identified
        assert len(issues) >= 0  # May be 0 if no issues detected

        # Check that issues have the correct structure
        for issue in issues:
            assert isinstance(issue, SpatialIssue)
            assert 0.0 <= issue.severity <= 1.0
            assert issue.suggested_action is not None
            assert issue.suggested_processor in [
                "reverb",
                "delay",
                "stereo_enhancer",
                "stereo_tool",
            ]

    def test_spatial_specialist_select_spatial_plugin(
        self, plugin_specialist, audio_analysis, composition_context, user_preferences
    ):
        """Test spatial plugin selection."""
        specialist = SpatialSpecialist(plugin_specialist)

        # Test reverb selection
        reverb_rec = specialist.select_spatial_plugin(
            audio_analysis, composition_context, user_preferences, "reverb"
        )
        assert reverb_rec is not None
        assert isinstance(reverb_rec, PluginRecommendation)
        assert reverb_rec.plugin_category == PluginCategory.REVERB
        assert reverb_rec.plugin_name in [
            "Valhalla Room",
            "FabFilter Pro-R",
            "Waves Abbey Road Plates",
        ]

        # Test delay selection
        delay_rec = specialist.select_spatial_plugin(
            audio_analysis, composition_context, user_preferences, "delay"
        )
        assert delay_rec is not None
        assert isinstance(delay_rec, PluginRecommendation)
        assert delay_rec.plugin_category == PluginCategory.DELAY
        assert delay_rec.plugin_name in [
            "FabFilter Timeless 3",
            "Soundtoys EchoBoy",
            "Waves H-Delay",
        ]

    def test_spatial_specialist_create_spatial_recommendation(
        self, plugin_specialist, audio_analysis, composition_context, user_preferences
    ):
        """Test creation of complete spatial recommendation."""
        specialist = SpatialSpecialist(plugin_specialist)

        # Test reverb recommendation
        reverb_rec = specialist.create_spatial_recommendation(
            audio_analysis, composition_context, user_preferences, "reverb"
        )
        assert reverb_rec is not None
        assert isinstance(reverb_rec, SpatialRecommendation)
        assert reverb_rec.plugin_recommendation is not None
        assert reverb_rec.reverb_settings is not None
        assert reverb_rec.delay_settings is None

        # Test delay recommendation
        delay_rec = specialist.create_spatial_recommendation(
            audio_analysis, composition_context, user_preferences, "delay"
        )
        assert delay_rec is not None
        assert isinstance(delay_rec, SpatialRecommendation)
        assert delay_rec.plugin_recommendation is not None
        assert delay_rec.reverb_settings is None
        assert delay_rec.delay_settings is not None

    def test_specialists_with_different_audio_characteristics(self, plugin_specialist):
        """Test specialists with different audio characteristics."""
        # Create audio analysis with different characteristics
        bright_audio = AudioAnalysis(
            timestamp=1625097600.0,
            sample_rate=44100,
            duration=180.0,
            channels=2,
            format=AudioFormat.WAV,
            features=AudioFeatures(
                spectral=SpectralFeatures(
                    centroid=5000.0,  # Bright
                    rolloff=15000.0,
                    flux=0.6,
                    bandwidth=6000.0,
                    flatness=0.3,
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
                    rms_level=0.6,
                    peak_level=0.9,
                    dynamic_range=25.0,  # Wide dynamic range
                    transient_density=5.0,  # High transient density
                    zero_crossing_rate=0.6,
                ),
                harmonic=HarmonicFeatures(
                    fundamental_freq=440.0,
                    harmonic_content=[0.8, 0.6, 0.4, 0.2, 0.1],
                    inharmonicity=0.3,
                    pitch_clarity=0.7,
                ),
                perceptual=PerceptualFeatures(
                    loudness_lufs=-14.0,
                    perceived_brightness=0.8,  # Bright
                    perceived_warmth=0.2,
                    roughness=0.3,
                    sharpness=1.0,
                ),
                spatial=SpatialFeatures(
                    stereo_width=0.3,  # Narrow stereo
                    phase_correlation=0.2,  # Phase issues
                    balance=0.3,  # Unbalanced
                ),
                frequency_balance=FrequencyBalance(
                    bass=0.3,  # Lacking bass
                    low_mid=0.4,
                    mid=0.5,
                    high_mid=0.8,  # Excessive high-mid
                    treble=0.9,  # Excessive treble
                ),
                chroma=ChromaFeatures(
                    chroma=[0.0] * 12,
                    chroma_normalized=[0.0] * 12,
                    root_note_likelihood=[0.0] * 12,
                    key=None,
                ),
                musical_context=MusicalContextFeatures(
                    key=None,
                    current_chord=None,
                    mode=None,
                    time_signature=None,
                ),
                rhythm=RhythmFeatures(
                    tempo=120.0,
                    beats=[],
                    beat_strength=[],
                    meter=None,
                    time_signature=None,
                    tempo_confidence=0.0,
                ),
                timbre=TimbreFeatures(
                    instruments=[],
                    harmonic_percussive_ratio=0.0,
                    attack_strength=0.0,
                    sustain_length=0.0,
                    vibrato_rate=None,
                    vibrato_extent=None,
                ),
                quality=QualityFeatures(
                    issues=[],
                    overall_quality=0.0,
                    noise_floor=0.0,
                    has_clipping=False,
                    dc_offset=0.0,
                    hum_frequency=None,
                ),
            ),
        )

        # Test with bright audio
        eq_specialist = EQSpecialist(plugin_specialist)
        dynamics_specialist = DynamicsSpecialist(plugin_specialist)
        spatial_specialist = SpatialSpecialist(plugin_specialist)

        # Check EQ issues
        eq_issues = eq_specialist.analyze_frequency_issues(bright_audio)
        assert any(issue.issue_type == "bright" for issue in eq_issues)
        assert any(issue.issue_type == "lacking_sub_bass" for issue in eq_issues)

        # Check dynamics issues
        dynamics_issues = dynamics_specialist.analyze_dynamics_issues(bright_audio)
        assert any(
            issue.issue_type == "dynamic_range_too_wide" for issue in dynamics_issues
        )
        assert any(
            issue.issue_type == "inconsistent_levels" for issue in dynamics_issues
        )

        # Check spatial issues
        spatial_issues = spatial_specialist.analyze_spatial_issues(bright_audio)
        assert any(issue.issue_type == "narrow_stereo" for issue in spatial_issues)
        assert any(
            issue.issue_type == "mono_compatible_issues" for issue in spatial_issues
        )
        assert any(issue.issue_type == "unbalanced_stereo" for issue in spatial_issues)

    def test_specialists_with_different_musical_styles(
        self, plugin_specialist, audio_analysis
    ):
        """Test specialists with different musical styles."""
        # Create different composition contexts
        electronic_context = CompositionContext(
            tempo=130.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,
        )

        classical_context = CompositionContext(
            tempo=80.0,
            key_signature=MusicalKey.A_MINOR,
            time_signature=TimeSignature(numerator=3, denominator=4),
            style=MusicalStyle.CLASSICAL,
        )

        rock_context = CompositionContext(
            tempo=110.0,
            key_signature=MusicalKey.E_MINOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ROCK,
        )

        # Test with different contexts
        spatial_specialist = SpatialSpecialist(plugin_specialist)

        # Check reverb recommendations for different styles
        electronic_reverb = spatial_specialist.create_spatial_recommendation(
            audio_analysis, electronic_context, None, "reverb"
        )
        classical_reverb = spatial_specialist.create_spatial_recommendation(
            audio_analysis, classical_context, None, "reverb"
        )
        rock_reverb = spatial_specialist.create_spatial_recommendation(
            audio_analysis, rock_context, None, "reverb"
        )

        # Check that different styles result in different reverb settings
        assert (
            electronic_reverb.reverb_settings.decay_time
            != classical_reverb.reverb_settings.decay_time
        )
        assert electronic_reverb.reverb_settings.mix != rock_reverb.reverb_settings.mix

        # Check delay recommendations for different styles
        electronic_delay = spatial_specialist.create_spatial_recommendation(
            audio_analysis, electronic_context, None, "delay"
        )
        rock_delay = spatial_specialist.create_spatial_recommendation(
            audio_analysis, rock_context, None, "delay"
        )

        # Check that different styles result in different delay settings
        assert (
            electronic_delay.delay_settings.feedback
            != rock_delay.delay_settings.feedback
        )

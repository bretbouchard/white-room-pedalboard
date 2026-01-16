import pytest

from src.audio_agent.core.dynamics_specialist import DynamicsSpecialist
from src.audio_agent.models.audio import (
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


@pytest.fixture
def full_audio_analysis():
    """Fixture for a complete AudioAnalysis object with default values."""
    return AudioAnalysis(
        timestamp=0.0,
        sample_rate=44100,
        duration=10.0,
        channels=2,
        format=AudioFormat.WAV,
        features=AudioFeatures(
            spectral=SpectralFeatures(
                centroid=1500.0,
                rolloff=3000.0,
                flux=0.5,
                bandwidth=1000.0,
                flatness=0.5,
                mfcc=[0.0] * 13,
            ),
            dynamic=DynamicFeatures(
                rms_level=0.5,
                peak_level=0.9,
                dynamic_range=12.0,
                transient_density=10.0,
                zero_crossing_rate=0.2,
            ),
            harmonic=HarmonicFeatures(
                fundamental_freq=440.0,
                harmonic_content=[0.5] * 5,
                inharmonicity=0.5,
                pitch_clarity=0.5,
            ),
            perceptual=PerceptualFeatures(
                loudness_lufs=-20.0,
                perceived_brightness=0.5,
                perceived_warmth=0.5,
                roughness=0.5,
                sharpness=0.5,
            ),
            spatial=SpatialFeatures(
                stereo_width=0.5,
                phase_correlation=0.5,
                balance=0.0,
            ),
            frequency_balance=FrequencyBalance(
                bass=0.5,
                low_mid=0.5,
                mid=0.5,
                high_mid=0.5,
                treble=0.5,
            ),
            chroma=ChromaFeatures(
                chroma=[0.5] * 12,
                chroma_normalized=[0.5] * 12,
                root_note_likelihood=[0.1] * 12,
            ),
            musical_context=MusicalContextFeatures(),
            rhythm=RhythmFeatures(
                tempo=120.0,
                tempo_confidence=0.5,
            ),
            timbre=TimbreFeatures(
                harmonic_percussive_ratio=0.5,
                attack_strength=0.5,
                sustain_length=0.5,
            ),
            quality=QualityFeatures(
                overall_quality=0.5,
                noise_floor=-60.0,
                has_clipping=False,
                dc_offset=0.0,
            ),
        ),
    )


def test_dynamics_specialist_init():
    """Test DynamicsSpecialist initialization."""
    specialist = DynamicsSpecialist()
    assert specialist.plugin_specialist is not None


def test_analyze_dynamics_issues_no_issues(full_audio_analysis):
    """Test analyze_dynamics_issues with no significant issues."""
    specialist = DynamicsSpecialist()
    issues = specialist.analyze_dynamics_issues(full_audio_analysis)
    assert len(issues) > 0  # Default issue should be created


def test_analyze_dynamics_issues_wide_dynamic_range(full_audio_analysis):
    """Test analyze_dynamics_issues with wide dynamic range."""
    specialist = DynamicsSpecialist()
    full_audio_analysis.features.dynamic.dynamic_range = 25.0
    issues = specialist.analyze_dynamics_issues(full_audio_analysis)
    assert any(issue.issue_type == "dynamic_range_too_wide" for issue in issues)


def test_analyze_dynamics_issues_narrow_dynamic_range(full_audio_analysis):
    """Test analyze_dynamics_issues with narrow dynamic range."""
    specialist = DynamicsSpecialist()
    full_audio_analysis.features.dynamic.dynamic_range = 4.0
    issues = specialist.analyze_dynamics_issues(full_audio_analysis)
    assert any(issue.issue_type == "dynamic_range_too_narrow" for issue in issues)


def test_analyze_dynamics_issues_excessive_peaks(full_audio_analysis):
    """Test analyze_dynamics_issues with excessive peaks."""
    specialist = DynamicsSpecialist()
    full_audio_analysis.features.dynamic.peak_level = 0.98
    full_audio_analysis.features.dynamic.rms_level = 0.5
    issues = specialist.analyze_dynamics_issues(full_audio_analysis)
    assert any(issue.issue_type == "excessive_peaks" for issue in issues)


def test_analyze_dynamics_issues_inconsistent_levels(full_audio_analysis):
    """Test analyze_dynamics_issues with inconsistent levels."""
    specialist = DynamicsSpecialist()
    full_audio_analysis.features.dynamic.transient_density = 5.0
    issues = specialist.analyze_dynamics_issues(full_audio_analysis)
    assert any(issue.issue_type == "inconsistent_levels" for issue in issues)


def test_analyze_dynamics_issues_lack_of_punch(full_audio_analysis):
    """Test analyze_dynamics_issues with lack of punch."""
    specialist = DynamicsSpecialist()
    full_audio_analysis.features.dynamic.dynamic_range = 12.0
    full_audio_analysis.features.dynamic.transient_density = 1.0
    issues = specialist.analyze_dynamics_issues(full_audio_analysis)
    assert any(issue.issue_type == "lack_of_punch" for issue in issues)


def test_analyze_dynamics_issues_pumping(full_audio_analysis):
    """Test analyze_dynamics_issues with potential pumping."""
    specialist = DynamicsSpecialist()
    full_audio_analysis.features.dynamic.dynamic_range = 8.0
    full_audio_analysis.features.dynamic.rms_level = 0.8
    issues = specialist.analyze_dynamics_issues(full_audio_analysis)
    assert any(issue.issue_type == "pumping" for issue in issues)

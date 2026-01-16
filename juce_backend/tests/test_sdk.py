"""
Tests for the Audio Agent SDK
"""

from audio_agent import sdk
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


def test_analyze_composition():
    composition_context = CompositionContext(
        tempo=120,
        key_signature=MusicalKey.C_MAJOR,
        time_signature=TimeSignature(numerator=4, denominator=4),
        style=MusicalStyle.POP,
    )
    recommendations = sdk.analyze_composition(composition_context)
    assert recommendations is not None
    assert "dynamic_range" in recommendations


def test_create_mixing_plan():
    composition_context = CompositionContext(
        tempo=120,
        key_signature=MusicalKey.C_MAJOR,
        time_signature=TimeSignature(numerator=4, denominator=4),
        style=MusicalStyle.POP,
    )
    tracks = [{"id": "track_1", "instrument": "vocal"}]
    mixing_plan = sdk.create_mixing_plan(composition_context, tracks)
    assert mixing_plan is not None
    assert "strategy" in mixing_plan
    assert "actions" in mixing_plan


def test_recommend_dynamics():
    audio_analysis = AudioAnalysis(
        timestamp=0,
        sample_rate=44100,
        duration=10,
        channels=2,
        format=AudioFormat.WAV,
        features=AudioFeatures(
            spectral=SpectralFeatures(
                centroid=2000,
                rolloff=4000,
                flux=0.5,
                bandwidth=1000,
                flatness=0.5,
                mfcc=[0] * 13,
            ),
            dynamic=DynamicFeatures(
                rms_level=0.5,
                peak_level=0.9,
                dynamic_range=12,
                transient_density=2,
                zero_crossing_rate=0.1,
            ),
            harmonic=HarmonicFeatures(inharmonicity=0.5, pitch_clarity=0.5),
            perceptual=PerceptualFeatures(
                loudness_lufs=-14,
                perceived_brightness=0.5,
                perceived_warmth=0.5,
                roughness=0.5,
                sharpness=0.5,
            ),
            spatial=SpatialFeatures(stereo_width=0.8, phase_correlation=0.9, balance=0),
            frequency_balance=FrequencyBalance(
                bass=0.5, low_mid=0.5, mid=0.5, high_mid=0.5, treble=0.5
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
    recommendation = sdk.recommend_dynamics(audio_analysis)
    assert recommendation is not None
    assert hasattr(recommendation, "plugin_recommendation")
    assert hasattr(recommendation, "settings")


def test_recommend_eq():
    audio_analysis = AudioAnalysis(
        timestamp=0,
        sample_rate=44100,
        duration=10,
        channels=2,
        format=AudioFormat.WAV,
        features=AudioFeatures(
            spectral=SpectralFeatures(
                centroid=2000,
                rolloff=4000,
                flux=0.5,
                bandwidth=1000,
                flatness=0.5,
                mfcc=[0] * 13,
            ),
            dynamic=DynamicFeatures(
                rms_level=0.5,
                peak_level=0.9,
                dynamic_range=12,
                transient_density=2,
                zero_crossing_rate=0.1,
            ),
            harmonic=HarmonicFeatures(inharmonicity=0.5, pitch_clarity=0.5),
            perceptual=PerceptualFeatures(
                loudness_lufs=-14,
                perceived_brightness=0.5,
                perceived_warmth=0.5,
                roughness=0.5,
                sharpness=0.5,
            ),
            spatial=SpatialFeatures(stereo_width=0.8, phase_correlation=0.9, balance=0),
            frequency_balance=FrequencyBalance(
                bass=0.5, low_mid=0.5, mid=0.5, high_mid=0.5, treble=0.5
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
    recommendation = sdk.recommend_eq(audio_analysis)
    assert recommendation is not None
    assert hasattr(recommendation, "plugin_recommendation")
    assert hasattr(recommendation, "bands")


def test_recommend_spatial():
    audio_analysis = AudioAnalysis(
        timestamp=0,
        sample_rate=44100,
        duration=10,
        channels=2,
        format=AudioFormat.WAV,
        features=AudioFeatures(
            spectral=SpectralFeatures(
                centroid=2000,
                rolloff=4000,
                flux=0.5,
                bandwidth=1000,
                flatness=0.5,
                mfcc=[0] * 13,
            ),
            dynamic=DynamicFeatures(
                rms_level=0.5,
                peak_level=0.9,
                dynamic_range=12,
                transient_density=2,
                zero_crossing_rate=0.1,
            ),
            harmonic=HarmonicFeatures(inharmonicity=0.5, pitch_clarity=0.5),
            perceptual=PerceptualFeatures(
                loudness_lufs=-14,
                perceived_brightness=0.5,
                perceived_warmth=0.5,
                roughness=0.5,
                sharpness=0.5,
            ),
            spatial=SpatialFeatures(stereo_width=0.8, phase_correlation=0.9, balance=0),
            frequency_balance=FrequencyBalance(
                bass=0.5, low_mid=0.5, mid=0.5, high_mid=0.5, treble=0.5
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
    recommendation = sdk.recommend_spatial(audio_analysis)
    assert recommendation is not None
    assert hasattr(recommendation, "plugin_recommendation")

"""Tests for the context-aware parameter configuration system."""

import pytest

from audio_agent.core.context_aware_config import ContextAwareConfigGenerator
from audio_agent.core.plugin_instrument_agent import PluginInstrumentType
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


class TestContextAwareConfig:
    """Test cases for the context-aware configuration system."""

    @pytest.fixture
    def config_generator(self):
        """Create a context-aware config generator."""
        return ContextAwareConfigGenerator()

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
                    perceived_brightness=0.8,
                    perceived_warmth=0.7,
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

    def test_initialization(self, config_generator):
        """Test initialization of the context-aware config generator."""
        assert config_generator is not None
        assert hasattr(config_generator, "tempo_templates")
        assert hasattr(config_generator, "key_templates")
        assert hasattr(config_generator, "style_templates")
        assert hasattr(config_generator, "instrument_templates")
        assert hasattr(config_generator, "plugin_templates")
        assert hasattr(config_generator, "audio_templates")

    def test_generate_context_aware_config_basic(
        self, config_generator, composition_context
    ):
        """Test basic context-aware configuration generation."""
        config = config_generator.generate_context_aware_config(
            plugin_name="Serum",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            composition_context=composition_context,
        )

        # Check that basic parameters are present
        assert "volume" in config
        assert "pan" in config
        assert "attack" in config
        assert "decay" in config
        assert "sustain" in config
        assert "release" in config
        assert "filter_cutoff" in config
        assert "filter_resonance" in config

        # Check that tempo-based parameters are applied correctly
        assert config["attack"] <= 0.05  # Fast attack for medium tempo

        # Check that key-based parameters are applied correctly
        assert config["oscillator_detune"] <= 0.01  # Clean tuning for major key

        # Check that style-based parameters are applied correctly
        assert config["filter_resonance"] >= 0.3  # Higher resonance for electronic

        # Check that instrument-type parameters are applied correctly
        assert "filter_cutoff" in config  # Synthesizer parameter

        # Check that plugin-specific parameters are applied correctly
        assert "unison_voices" in config  # Serum-specific parameter
        assert "wavetable_position" in config  # Serum-specific parameter
        assert "fx_mix" in config  # Serum-specific parameter

    def test_generate_context_aware_config_with_audio(
        self, config_generator, composition_context, audio_analysis
    ):
        """Test context-aware configuration with audio analysis."""
        config = config_generator.generate_context_aware_config(
            plugin_name="Serum",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            composition_context=composition_context,
            audio_analysis=audio_analysis,
        )

        # Check that audio-based parameters are applied correctly
        assert "filter_cutoff" in config
        # Filter cutoff should be adjusted based on spectral centroid
        assert 0.0 <= config["filter_cutoff"] <= 1.0

        # Attack should be adjusted based on transient density
        assert "attack" in config
        assert 0.01 <= config["attack"] <= 1.0

    def test_generate_context_aware_config_tempo_variations(self, config_generator):
        """Test configuration variations based on tempo."""
        # Test slow tempo
        slow_context = CompositionContext(
            tempo=60.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.AMBIENT,
        )

        slow_config = config_generator.generate_context_aware_config(
            plugin_name="Omnisphere",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            composition_context=slow_context,
        )

        # Test fast tempo
        fast_context = CompositionContext(
            tempo=160.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.TECHNO,
        )

        fast_config = config_generator.generate_context_aware_config(
            plugin_name="Massive X",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            composition_context=fast_context,
        )

        # Check that tempo affects parameters correctly
        assert slow_config["attack"] > fast_config["attack"]
        assert slow_config["release"] > fast_config["release"]

    def test_generate_context_aware_config_key_variations(self, config_generator):
        """Test configuration variations based on key signature."""
        # Test major key
        major_context = CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,
        )

        major_config = config_generator.generate_context_aware_config(
            plugin_name="Jupiter-8V",
            instrument_type=PluginInstrumentType.CLASSIC_SYNTH,
            composition_context=major_context,
        )

        # Test minor key
        minor_context = CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.A_MINOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,
        )

        minor_config = config_generator.generate_context_aware_config(
            plugin_name="Jupiter-8V",
            instrument_type=PluginInstrumentType.CLASSIC_SYNTH,
            composition_context=minor_context,
        )

        # Check that key affects parameters correctly
        assert minor_config["oscillator_detune"] > major_config["oscillator_detune"]
        assert minor_config["reverb_amount"] > major_config["reverb_amount"]

    def test_generate_context_aware_config_style_variations(self, config_generator):
        """Test configuration variations based on musical style."""
        # Test different styles
        styles = [
            (MusicalStyle.ELECTRONIC, "Serum"),
            (MusicalStyle.AMBIENT, "Omnisphere"),
            (MusicalStyle.TECHNO, "Massive X"),
            (MusicalStyle.ROCK, "Minimoog V"),
            (MusicalStyle.JAZZ, "DX7 V"),
        ]

        configs = {}

        for style, plugin in styles:
            context = CompositionContext(
                tempo=120.0,
                key_signature=MusicalKey.C_MAJOR,
                time_signature=TimeSignature(numerator=4, denominator=4),
                style=style,
            )

            configs[style] = config_generator.generate_context_aware_config(
                plugin_name=plugin,
                instrument_type=PluginInstrumentType.SYNTHESIZER,
                composition_context=context,
            )

        # Check that style affects parameters correctly
        assert (
            configs[MusicalStyle.ELECTRONIC]["attack"]
            < configs[MusicalStyle.AMBIENT]["attack"]
        )
        assert (
            configs[MusicalStyle.AMBIENT]["reverb_amount"]
            > configs[MusicalStyle.TECHNO]["reverb_amount"]
        )

    def test_generate_configuration_reasoning(
        self, config_generator, composition_context, audio_analysis
    ):
        """Test generation of human-readable configuration reasoning."""
        config = config_generator.generate_context_aware_config(
            plugin_name="Serum",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            composition_context=composition_context,
            audio_analysis=audio_analysis,
        )

        reasoning = config_generator.generate_configuration_reasoning(
            plugin_name="Serum",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            composition_context=composition_context,
            config=config,
            audio_analysis=audio_analysis,
        )

        # Check that reasoning contains expected information
        assert "Serum" in reasoning
        assert "electronic" in reasoning
        assert "120.0 BPM" in reasoning
        assert "unison" in reasoning  # Serum-specific

        # Check that audio analysis is mentioned in reasoning
        assert "spectral content" in reasoning or "tonal characteristics" in reasoning

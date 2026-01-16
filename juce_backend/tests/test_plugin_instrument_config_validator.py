"""Tests for the plugin instrument config validator."""

import os
import tempfile

import pytest

from audio_agent.core.plugin_instrument_agent import PluginInstrumentType
from audio_agent.core.plugin_instrument_config_validator import (
    ParameterConstraint,
    ParameterType,
    PluginConfigValidator,
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


class TestPluginInstrumentConfigValidator:
    """Test cases for the plugin instrument config validator."""

    @pytest.fixture
    def config_validator(self):
        """Create a plugin config validator."""
        return PluginConfigValidator()

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

    def test_parameter_constraint(self):
        """Test parameter constraint validation."""
        # Test continuous parameter
        constraint = ParameterConstraint(
            min_value=0.0,
            max_value=1.0,
            default_value=0.5,
            parameter_type=ParameterType.CONTINUOUS,
        )

        assert constraint.min_value == 0.0
        assert constraint.max_value == 1.0
        assert constraint.default_value == 0.5
        assert constraint.parameter_type == ParameterType.CONTINUOUS

        # Test discrete parameter
        constraint = ParameterConstraint(
            min_value=1,
            max_value=10,
            default_value=5,
            step_size=1,
            parameter_type=ParameterType.DISCRETE,
        )

        assert constraint.min_value == 1
        assert constraint.max_value == 10
        assert constraint.default_value == 5
        assert constraint.step_size == 1
        assert constraint.parameter_type == ParameterType.DISCRETE

        # Test enum parameter
        constraint = ParameterConstraint(
            allowed_values=["sine", "square", "sawtooth", "triangle"],
            default_value="sine",
            parameter_type=ParameterType.ENUM,
        )

        assert constraint.allowed_values == ["sine", "square", "sawtooth", "triangle"]
        assert constraint.default_value == "sine"
        assert constraint.parameter_type == ParameterType.ENUM

        # Test boolean parameter
        constraint = ParameterConstraint(
            min_value=0,
            max_value=1,
            default_value=0,
            parameter_type=ParameterType.BOOLEAN,
        )

        assert constraint.min_value == 0
        assert constraint.max_value == 1
        assert constraint.default_value == 0
        assert constraint.parameter_type == ParameterType.BOOLEAN

    def test_validate_parameter_continuous(self, config_validator):
        """Test validation of continuous parameters."""
        # Test valid value
        is_valid, corrected, error = config_validator.validate_parameter(
            "filter_cutoff", 0.5, "Serum", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is True
        assert corrected == 0.5
        assert error is None

        # Test value below minimum
        is_valid, corrected, error = config_validator.validate_parameter(
            "filter_cutoff", -0.1, "Serum", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is False
        assert corrected == 0.0
        assert error is not None

        # Test value above maximum
        is_valid, corrected, error = config_validator.validate_parameter(
            "filter_cutoff", 1.5, "Serum", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is False
        assert corrected == 1.0
        assert error is not None

        # Test non-numeric value
        is_valid, corrected, error = config_validator.validate_parameter(
            "filter_cutoff", "invalid", "Serum", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is False
        assert isinstance(corrected, int | float)
        assert error is not None

    def test_validate_parameter_discrete(self, config_validator):
        """Test validation of discrete parameters."""
        # Test valid value
        is_valid, corrected, error = config_validator.validate_parameter(
            "unison_voices", 4, "Serum", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is True
        assert corrected == 4
        assert error is None

        # Test value below minimum
        is_valid, corrected, error = config_validator.validate_parameter(
            "unison_voices", 0, "Serum", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is False
        assert corrected == 1
        assert error is not None

        # Test value above maximum
        is_valid, corrected, error = config_validator.validate_parameter(
            "unison_voices", 20, "Serum", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is False
        assert corrected == 16
        assert error is not None

        # Test non-numeric value
        is_valid, corrected, error = config_validator.validate_parameter(
            "unison_voices", "invalid", "Serum", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is False
        assert isinstance(corrected, int)
        assert error is not None

    def test_validate_parameter_enum(self, config_validator):
        """Test validation of enum parameters."""
        # Test valid value
        is_valid, corrected, error = config_validator.validate_parameter(
            "oscillator_1_waveform",
            "sawtooth",
            "Minimoog V",
            PluginInstrumentType.CLASSIC_SYNTH,
        )
        assert is_valid is True
        assert corrected == "sawtooth"
        assert error is None

        # Test invalid value
        is_valid, corrected, error = config_validator.validate_parameter(
            "oscillator_1_waveform",
            "invalid",
            "Minimoog V",
            PluginInstrumentType.CLASSIC_SYNTH,
        )
        assert is_valid is False
        assert corrected is not None
        assert error is not None

        # Test case-insensitive match
        is_valid, corrected, error = config_validator.validate_parameter(
            "oscillator_1_waveform",
            "SAWTOOTH",
            "Minimoog V",
            PluginInstrumentType.CLASSIC_SYNTH,
        )
        assert is_valid is True
        assert corrected == "sawtooth"
        assert error is None

    def test_validate_parameter_boolean(self, config_validator):
        """Test validation of boolean parameters."""
        # Test boolean value
        is_valid, corrected, error = config_validator.validate_parameter(
            "arpeggiator_enabled", True, "Omnisphere", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is True
        assert corrected is True
        assert error is None

        # Test numeric value (0)
        is_valid, corrected, error = config_validator.validate_parameter(
            "arpeggiator_enabled", 0, "Omnisphere", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is True
        assert corrected is False
        assert error is None

        # Test numeric value (1)
        is_valid, corrected, error = config_validator.validate_parameter(
            "arpeggiator_enabled", 1, "Omnisphere", PluginInstrumentType.SYNTHESIZER
        )
        assert is_valid is True
        assert corrected is True
        assert error is None

        # Test string value ("true")
        is_valid, corrected, error = config_validator.validate_parameter(
            "arpeggiator_enabled",
            "true",
            "Omnisphere",
            PluginInstrumentType.SYNTHESIZER,
        )
        assert is_valid is True
        assert corrected is True
        assert error is None

        # Test string value ("false")
        is_valid, corrected, error = config_validator.validate_parameter(
            "arpeggiator_enabled",
            "false",
            "Omnisphere",
            PluginInstrumentType.SYNTHESIZER,
        )
        assert is_valid is True
        assert corrected is False
        assert error is None

        # Test invalid value
        is_valid, corrected, error = config_validator.validate_parameter(
            "arpeggiator_enabled",
            "invalid",
            "Omnisphere",
            PluginInstrumentType.SYNTHESIZER,
        )
        assert is_valid is False
        assert isinstance(corrected, bool)
        assert error is not None

    def test_validate_configuration(self, config_validator):
        """Test validation of complete configurations."""
        # Test valid configuration
        params = {
            "volume": 0.8,
            "pan": 0.0,
            "attack": 0.05,
            "decay": 0.5,
            "sustain": 0.7,
            "release": 0.5,
            "filter_cutoff": 0.6,
            "filter_resonance": 0.3,
        }

        corrected, errors = config_validator.validate_configuration(
            params, "Serum", PluginInstrumentType.SYNTHESIZER
        )

        assert len(errors) == 0
        assert corrected == params

        # Test configuration with errors
        params = {
            "volume": 1.5,  # Above maximum
            "pan": 2.0,  # Above maximum
            "attack": -0.1,  # Below minimum
            "filter_cutoff": "invalid",  # Invalid type
        }

        corrected, errors = config_validator.validate_configuration(
            params, "Serum", PluginInstrumentType.SYNTHESIZER
        )

        assert len(errors) > 0
        assert corrected["volume"] == 1.0  # Corrected to maximum
        assert corrected["pan"] == 1.0  # Corrected to maximum
        assert corrected["attack"] == 0.0  # Corrected to minimum
        assert isinstance(corrected["filter_cutoff"], float)  # Corrected to default

    def test_validate_configuration_with_context(
        self, config_validator, composition_context, audio_analysis
    ):
        """Test context-aware configuration validation."""
        # Test high tempo configuration
        fast_context = CompositionContext(
            tempo=160.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.TECHNO,
        )

        params = {
            "attack": 0.2,  # Too slow for high tempo
            "release": 1.5,  # Too long for high tempo
            "filter_cutoff": 0.6,
        }

        corrected, errors = config_validator.validate_configuration_with_context(
            params, "Serum", PluginInstrumentType.SYNTHESIZER, fast_context
        )

        assert len(errors) > 0
        assert (
            corrected["attack"] < params["attack"]
        )  # Should be reduced for high tempo
        assert (
            corrected["release"] < params["release"]
        )  # Should be reduced for high tempo

        # Test with audio analysis
        bright_audio = AudioAnalysis(
            timestamp=1625097600.0,
            sample_rate=44100,
            duration=180.0,
            channels=2,
            format=AudioFormat.WAV,
            features=AudioFeatures(
                spectral=SpectralFeatures(
                    centroid=8000.0,  # Very bright
                    rolloff=15000.0,
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
                    perceived_brightness=0.9,  # Very bright
                    perceived_warmth=0.2,
                    roughness=0.3,
                    sharpness=1.0,
                ),
                spatial=SpatialFeatures(
                    stereo_width=0.8, phase_correlation=0.5, balance=0.0
                ),
                frequency_balance=FrequencyBalance(
                    bass=0.3,
                    low_mid=0.4,
                    mid=0.5,
                    high_mid=0.8,
                    treble=0.9,  # Very bright
                ),
            ),
        )

        params = {"filter_cutoff": 0.3}  # Too dark for bright audio

        corrected, errors = config_validator.validate_configuration_with_context(
            params,
            "Serum",
            PluginInstrumentType.SYNTHESIZER,
            composition_context,
            bright_audio,
        )

        assert len(errors) > 0
        assert (
            corrected["filter_cutoff"] > params["filter_cutoff"]
        )  # Should be increased for bright audio

    def test_knowledge_base_save_load(self, config_validator):
        """Test saving and loading the knowledge base."""
        # Create a temporary knowledge base
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as temp_file:
            kb_path = temp_file.name

        try:
            # Create a simple knowledge base
            config_validator.plugin_knowledge_base = {
                PluginInstrumentType.SYNTHESIZER: {
                    "Serum": {
                        "known_parameters": {
                            "filter_cutoff": {
                                "min_value": 0.0,
                                "max_value": 1.0,
                                "default_value": 0.5,
                                "values_seen": [0.3, 0.5, 0.7],
                                "success_values": [0.5, 0.7],
                            }
                        }
                    }
                }
            }

            # Save the knowledge base
            config_validator.save_knowledge_base(kb_path)

            # Create a new validator and load the knowledge base
            new_validator = PluginConfigValidator()
            new_validator.load_knowledge_base(kb_path, PluginInstrumentType)

            # Check that the knowledge base was loaded correctly
            assert (
                PluginInstrumentType.SYNTHESIZER in new_validator.plugin_knowledge_base
            )
            assert (
                "Serum"
                in new_validator.plugin_knowledge_base[PluginInstrumentType.SYNTHESIZER]
            )
            assert (
                "known_parameters"
                in new_validator.plugin_knowledge_base[
                    PluginInstrumentType.SYNTHESIZER
                ]["Serum"]
            )
            assert (
                "filter_cutoff"
                in new_validator.plugin_knowledge_base[
                    PluginInstrumentType.SYNTHESIZER
                ]["Serum"]["known_parameters"]
            )

        finally:
            # Clean up
            if os.path.exists(kb_path):
                os.unlink(kb_path)

    def test_learn_from_configuration(self, config_validator):
        """Test learning from configurations."""
        # Initialize knowledge base
        config_validator.plugin_knowledge_base = {}

        # Learn from a configuration
        config_validator.learn_from_configuration(
            plugin_name="Serum",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            parameters={"filter_cutoff": 0.7, "filter_resonance": 0.3, "attack": 0.05},
            success=True,
        )

        # Check that the knowledge was stored correctly
        assert (
            PluginInstrumentType.SYNTHESIZER in config_validator.plugin_knowledge_base
        )
        assert (
            "Serum"
            in config_validator.plugin_knowledge_base[PluginInstrumentType.SYNTHESIZER]
        )
        assert (
            "known_parameters"
            in config_validator.plugin_knowledge_base[PluginInstrumentType.SYNTHESIZER][
                "Serum"
            ]
        )

        params = config_validator.plugin_knowledge_base[
            PluginInstrumentType.SYNTHESIZER
        ]["Serum"]["known_parameters"]
        assert "filter_cutoff" in params
        assert "filter_resonance" in params
        assert "attack" in params

        assert params["filter_cutoff"]["min_value"] == 0.7
        assert params["filter_cutoff"]["max_value"] == 0.7
        assert params["filter_cutoff"]["values_seen"] == [0.7]
        assert params["filter_cutoff"]["success_values"] == [0.7]

        # Learn from another configuration
        config_validator.learn_from_configuration(
            plugin_name="Serum",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            parameters={"filter_cutoff": 0.5, "filter_resonance": 0.4, "attack": 0.02},
            success=True,
        )

        # Check that the knowledge was updated correctly
        params = config_validator.plugin_knowledge_base[
            PluginInstrumentType.SYNTHESIZER
        ]["Serum"]["known_parameters"]
        assert params["filter_cutoff"]["min_value"] == 0.5  # Updated to lower value
        assert params["filter_cutoff"]["max_value"] == 0.7  # Unchanged
        assert params["filter_cutoff"]["values_seen"] == [0.7, 0.5]
        assert params["filter_cutoff"]["success_values"] == [0.7, 0.5]

        # Learn from an unsuccessful configuration
        config_validator.learn_from_configuration(
            plugin_name="Serum",
            instrument_type=PluginInstrumentType.SYNTHESIZER,
            parameters={"filter_cutoff": 0.3, "filter_resonance": 0.5, "attack": 0.01},
            success=False,
        )

        # Check that the knowledge was updated correctly
        params = config_validator.plugin_knowledge_base[
            PluginInstrumentType.SYNTHESIZER
        ]["Serum"]["known_parameters"]
        assert params["filter_cutoff"]["min_value"] == 0.3  # Updated to lower value
        assert params["filter_cutoff"]["max_value"] == 0.7  # Unchanged
        assert params["filter_cutoff"]["values_seen"] == [0.7, 0.5, 0.3]
        assert params["filter_cutoff"]["success_values"] == [
            0.7,
            0.5,
        ]  # Unsuccessful value not added

    def test_get_parameter_suggestions(self, config_validator):
        """Test getting parameter suggestions."""
        # Initialize knowledge base
        config_validator.plugin_knowledge_base = {
            PluginInstrumentType.SYNTHESIZER: {
                "Serum": {
                    "known_parameters": {
                        "filter_cutoff": {
                            "min_value": 0.3,
                            "max_value": 0.8,
                            "default_value": 0.5,
                            "values_seen": [0.3, 0.5, 0.7, 0.8],
                            "success_values": [0.5, 0.7, 0.7, 0.5],
                        },
                        "filter_resonance": {
                            "min_value": 0.2,
                            "max_value": 0.5,
                            "default_value": 0.3,
                            "values_seen": [0.2, 0.3, 0.4, 0.5],
                            "success_values": [0.3, 0.4],
                        },
                    }
                }
            }
        }

        # Get suggestions
        suggestions = config_validator.get_parameter_suggestions(
            plugin_name="Serum", instrument_type=PluginInstrumentType.SYNTHESIZER
        )

        # Check that suggestions were generated correctly
        assert "filter_cutoff" in suggestions
        assert "filter_resonance" in suggestions

        # Check that the most common values are suggested first
        assert suggestions["filter_cutoff"][0] in [0.5, 0.7]  # Most common values
        assert suggestions["filter_resonance"][0] in [0.3, 0.4]  # Most common values

"""Tests for validation utilities and TypeAdapters."""

import os
import tempfile
from pathlib import Path

import numpy as np
import pytest

from src.audio_agent.models.validation import (
    AudioDataValidator,
    AudioFeatureValidator,
    NumpyArrayValidator,
    PluginParameterValidator,
    SchillingerValidator,
)


class TestAudioDataValidator:
    """Test AudioDataValidator utility functions."""

    def test_sample_rate_validation(self):
        """Test sample rate validation."""
        # Valid sample rates
        assert AudioDataValidator.validate_sample_rate(44100) == 44100
        assert AudioDataValidator.validate_sample_rate(48000) == 48000

        # Non-standard but valid sample rate
        assert AudioDataValidator.validate_sample_rate(47999) == 47999

        # Invalid sample rates
        with pytest.raises(ValueError, match="must be an integer"):
            AudioDataValidator.validate_sample_rate(44100.5)

        with pytest.raises(ValueError, match="must be positive"):
            AudioDataValidator.validate_sample_rate(-44100)

        with pytest.raises(ValueError, match="outside reasonable range"):
            AudioDataValidator.validate_sample_rate(1000000)

    def test_audio_buffer_validation(self):
        """Test audio buffer validation."""
        # Valid mono audio buffer
        mono_audio = np.random.randn(1024).astype(np.float32) * 0.5
        validated = AudioDataValidator.validate_audio_buffer(mono_audio)
        assert validated.shape == (1024,)

        # Valid stereo audio buffer
        stereo_audio = np.random.randn(2, 1024).astype(np.float32) * 0.5
        validated = AudioDataValidator.validate_audio_buffer(stereo_audio)
        assert validated.shape == (2, 1024)

        # Invalid data type
        with pytest.raises(ValueError, match="must be numpy array"):
            AudioDataValidator.validate_audio_buffer([1, 2, 3, 4])

        # Invalid audio data type
        with pytest.raises(ValueError, match="Unsupported audio data type"):
            AudioDataValidator.validate_audio_buffer(
                np.array([1, 2, 3], dtype=np.uint8)
            )

        # Audio exceeding range
        with pytest.raises(ValueError, match="Audio buffer too short: 2 samples"):
            AudioDataValidator.validate_audio_buffer(
                np.array([2.0, -2.0], dtype=np.float32)
            )

        # Audio with NaN values
        with pytest.raises(ValueError, match="NaN or infinite"):
            AudioDataValidator.validate_audio_buffer(
                np.array([1.0, np.nan], dtype=np.float32)
            )

        # Audio too short
        with pytest.raises(ValueError, match="too short"):
            AudioDataValidator.validate_audio_buffer(
                np.array([1.0, 2.0], dtype=np.float32)
            )

    def test_frequency_range_validation(self):
        """Test frequency range validation."""
        # Valid frequencies
        assert AudioDataValidator.validate_frequency_range(1000.0, 48000) == 1000.0
        assert AudioDataValidator.validate_frequency_range(0.0, 48000) == 0.0

        # Invalid frequency type
        with pytest.raises(ValueError, match="must be numeric"):
            AudioDataValidator.validate_frequency_range("1000", 48000)

        # Negative frequency
        with pytest.raises(ValueError, match="cannot be negative"):
            AudioDataValidator.validate_frequency_range(-100.0, 48000)

        # Frequency exceeding Nyquist
        with pytest.raises(ValueError, match="exceeds Nyquist frequency"):
            AudioDataValidator.validate_frequency_range(30000.0, 48000)

    def test_db_value_validation(self):
        """Test dB value validation."""
        # Valid dB values
        assert AudioDataValidator.validate_db_value(-6.0) == -6.0
        assert AudioDataValidator.validate_db_value(0.0) == 0.0

        # Invalid dB value type
        with pytest.raises(ValueError, match="must be numeric"):
            AudioDataValidator.validate_db_value("loud")

        # dB value with NaN
        with pytest.raises(ValueError, match="cannot be NaN"):
            AudioDataValidator.validate_db_value(float("nan"))

        # dB value outside range
        with pytest.raises(ValueError, match="outside range"):
            AudioDataValidator.validate_db_value(-200.0)

    def test_lufs_validation(self):
        """Test LUFS value validation."""
        # Valid LUFS values
        assert AudioDataValidator.validate_lufs_value(-14.0) == -14.0
        assert AudioDataValidator.validate_lufs_value(-23.0) == -23.0

        # Invalid LUFS value (too high)
        with pytest.raises(ValueError, match="outside range"):
            AudioDataValidator.validate_lufs_value(5.0)

    def test_normalized_value_validation(self):
        """Test normalized value validation."""
        # Valid normalized values
        assert AudioDataValidator.validate_normalized_value(0.5) == 0.5
        assert AudioDataValidator.validate_normalized_value(0.0) == 0.0
        assert AudioDataValidator.validate_normalized_value(1.0) == 1.0

        # Invalid normalized value
        with pytest.raises(ValueError, match="must be between 0 and 1"):
            AudioDataValidator.validate_normalized_value(1.5)

    def test_mfcc_validation(self):
        """Test MFCC coefficients validation."""
        # Valid MFCC coefficients
        valid_mfcc = [
            1.0,
            -2.0,
            0.5,
            1.2,
            -0.8,
            0.3,
            -0.1,
            0.7,
            -0.4,
            0.2,
            0.1,
            -0.3,
            0.6,
        ]
        validated = AudioDataValidator.validate_mfcc_coefficients(valid_mfcc)
        assert len(validated) == 13

        # Wrong number of coefficients
        with pytest.raises(ValueError, match="Expected 13 MFCC coefficients"):
            AudioDataValidator.validate_mfcc_coefficients([1.0, 2.0])

        # Invalid coefficient type
        with pytest.raises(ValueError, match="must be numeric"):
            AudioDataValidator.validate_mfcc_coefficients([1.0] * 12 + ["invalid"])

        # Coefficient outside typical range
        with pytest.raises(ValueError, match="outside typical range"):
            AudioDataValidator.validate_mfcc_coefficients([100.0] + [0.0] * 12)

    def test_spectral_features_validation(self):
        """Test spectral features consistency validation."""
        # Valid spectral features
        centroid, rolloff, bandwidth = AudioDataValidator.validate_spectral_features(
            1000.0, 2000.0, 500.0, 48000
        )
        assert centroid == 1000.0
        assert rolloff == 2000.0
        assert bandwidth == 500.0

        # Invalid relationship (rolloff < centroid)
        with pytest.raises(ValueError, match="should be >= centroid"):
            AudioDataValidator.validate_spectral_features(2000.0, 1000.0, 500.0, 48000)

        # Invalid bandwidth
        with pytest.raises(ValueError, match="cannot be negative"):
            AudioDataValidator.validate_spectral_features(1000.0, 2000.0, -100.0, 48000)

    def test_audio_file_path_validation(self):
        """Test audio file path validation."""
        # Create temporary audio file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            tmp_path = Path(tmp_file.name)

        try:
            # Valid audio file path
            validated_path = AudioDataValidator.validate_audio_file_path(tmp_path)
            assert validated_path == tmp_path

            # Non-existent file
            with pytest.raises(ValueError, match="does not exist"):
                AudioDataValidator.validate_audio_file_path("/nonexistent/file.wav")

            # Unsupported format
            with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as txt_file:
                txt_path = Path(txt_file.name)

            try:
                with pytest.raises(ValueError, match="Unsupported audio format"):
                    AudioDataValidator.validate_audio_file_path(txt_path)
            finally:
                os.unlink(txt_path)

        finally:
            os.unlink(tmp_path)


class TestNumpyArrayValidator:
    """Test NumpyArrayValidator utility functions."""

    def test_validate_and_convert_audio_array(self):
        """Test audio array validation and conversion."""
        # Convert list to numpy array
        audio_list = [0.1, 0.2, 0.3, 0.4] + [0.0] * 60  # Minimum 64 samples
        converted = NumpyArrayValidator.validate_and_convert_audio_array(audio_list)
        assert isinstance(converted, np.ndarray)
        assert converted.dtype == np.float32

        # Convert tuple to numpy array
        audio_tuple = tuple([0.1, 0.2, 0.3, 0.4] + [0.0] * 60)
        converted = NumpyArrayValidator.validate_and_convert_audio_array(audio_tuple)
        assert isinstance(converted, np.ndarray)

        # Valid numpy array
        audio_array = np.random.randn(1024).astype(np.float32) * 0.5
        converted = NumpyArrayValidator.validate_and_convert_audio_array(audio_array)
        assert np.array_equal(converted, audio_array)

        # Invalid input type
        with pytest.raises(ValueError, match="Cannot convert"):
            NumpyArrayValidator.validate_and_convert_audio_array("invalid")

    def test_serialize_deserialize_numpy_array(self):
        """Test numpy array serialization and deserialization."""
        # Create test array
        original_array = np.array([[1.0, 2.0, 3.0] * 22], dtype=np.float32)

        # Serialize
        serialized = NumpyArrayValidator.serialize_numpy_array(original_array)
        assert "data" in serialized
        assert "dtype" in serialized
        assert "shape" in serialized

        # Deserialize
        deserialized = NumpyArrayValidator.deserialize_numpy_array(serialized)

        # Check that the deserialized array is equal to the original array
        assert deserialized.dtype == original_array.dtype
        assert deserialized.shape == original_array.shape
        assert np.allclose(deserialized, original_array, atol=1e-6)


class TestAudioFeatureValidator:
    """Test AudioFeatureValidator utility functions."""

    def test_validate_feature_vector(self):
        """Test feature vector validation."""
        # Valid feature vector
        features = [0.1, 0.2, -0.3, 0.4, -0.5]
        validated = AudioFeatureValidator.validate_feature_vector(features)
        assert len(validated) == 5
        assert all(isinstance(f, float) for f in validated)

        # Feature vector too short
        with pytest.raises(ValueError, match="length.*outside range"):
            AudioFeatureValidator.validate_feature_vector([])

        # Feature vector too long
        with pytest.raises(ValueError, match="length.*outside range"):
            AudioFeatureValidator.validate_feature_vector([0.1] * 2000, max_length=1000)

        # Invalid feature value
        with pytest.raises(ValueError, match="must be numeric"):
            AudioFeatureValidator.validate_feature_vector([0.1, "invalid", 0.3])

        # Feature value outside range
        with pytest.raises(ValueError, match="outside range"):
            AudioFeatureValidator.validate_feature_vector([0.1, 15.0, 0.3])

    def test_validate_embedding_similarity(self):
        """Test embedding similarity validation."""
        # Compatible embeddings
        emb1 = [0.1, 0.2, 0.3]
        emb2 = [0.4, 0.5, 0.6]
        validated1, validated2 = AudioFeatureValidator.validate_embedding_similarity(
            emb1, emb2
        )
        assert len(validated1) == len(validated2) == 3

        # Incompatible dimensions
        with pytest.raises(ValueError, match="dimensions don't match"):
            AudioFeatureValidator.validate_embedding_similarity(
                [0.1, 0.2], [0.1, 0.2, 0.3]
            )

    def test_normalize_feature_vector(self):
        """Test feature vector normalization."""
        # Normal vector
        features = [3.0, 4.0]  # Length = 5
        normalized = AudioFeatureValidator.normalize_feature_vector(features)
        assert abs(np.linalg.norm(normalized) - 1.0) < 1e-6

        # Zero vector
        zero_features = [0.0, 0.0, 0.0]
        normalized = AudioFeatureValidator.normalize_feature_vector(zero_features)
        assert normalized == zero_features  # Cannot normalize zero vector


class TestPluginParameterValidator:
    """Test PluginParameterValidator utility functions."""

    def test_validate_parameter_range(self):
        """Test parameter range validation."""
        # Valid parameter value
        validated = PluginParameterValidator.validate_parameter_range(
            5.0, 0.0, 10.0, "gain"
        )
        assert validated == 5.0

        # Invalid parameter type
        with pytest.raises(ValueError, match="must be numeric"):
            PluginParameterValidator.validate_parameter_range("5", 0.0, 10.0, "gain")

        # Parameter value outside range
        with pytest.raises(ValueError, match="outside range"):
            PluginParameterValidator.validate_parameter_range(15.0, 0.0, 10.0, "gain")

    def test_validate_parameter_mapping(self):
        """Test parameter mapping validation."""
        # Valid parameter mapping
        parameters = {"gain": 5.0, "freq": 1000.0}
        specs = {
            "gain": {"min": 0.0, "max": 10.0},
            "freq": {"min": 20.0, "max": 20000.0},
        }
        validated = PluginParameterValidator.validate_parameter_mapping(
            parameters, specs
        )
        assert validated["gain"] == 5.0
        assert validated["freq"] == 1000.0

        # Unknown parameter
        with pytest.raises(ValueError, match="Unknown parameter"):
            PluginParameterValidator.validate_parameter_mapping(
                {"unknown_param": 5.0}, specs
            )


class TestSchillingerValidator:
    """Test SchillingerValidator utility functions."""

    def test_validate_rhythmic_pattern(self):
        """Test rhythmic pattern validation."""
        # Valid rhythmic pattern
        pattern = "2+3+2"
        validated = SchillingerValidator.validate_rhythmic_pattern(pattern)
        assert validated == "2+3+2"

        # Empty pattern
        with pytest.raises(ValueError, match="cannot be empty"):
            SchillingerValidator.validate_rhythmic_pattern("")

        # Pattern too long
        with pytest.raises(ValueError, match="too long"):
            SchillingerValidator.validate_rhythmic_pattern("x" * 200)

    def test_validate_pitch_scale(self):
        """Test pitch scale validation."""
        # Valid pitch scale
        scale = "chromatic"
        validated = SchillingerValidator.validate_pitch_scale(scale)
        assert validated == "chromatic"

        # Empty scale
        with pytest.raises(ValueError, match="cannot be empty"):
            SchillingerValidator.validate_pitch_scale("   ")

    def test_validate_interference_pattern(self):
        """Test interference pattern validation."""
        # Valid interference pattern
        pattern = {"type": "rhythmic", "elements": ["2", "3", "5"]}
        validated = SchillingerValidator.validate_interference_pattern(pattern)
        assert validated["type"] == "rhythmic"
        assert len(validated["elements"]) == 3

        # Missing required key
        with pytest.raises(ValueError, match="missing required key"):
            SchillingerValidator.validate_interference_pattern({"type": "rhythmic"})

        # Invalid pattern type
        with pytest.raises(ValueError, match="Invalid interference pattern type"):
            SchillingerValidator.validate_interference_pattern(
                {"type": "invalid_type", "elements": ["a", "b"]}
            )

        # Too few elements
        with pytest.raises(ValueError, match="at least 2 elements"):
            SchillingerValidator.validate_interference_pattern(
                {"type": "rhythmic", "elements": ["a"]}
            )

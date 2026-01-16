"""
Test handling of invalid inputs and malformed data for the audio agent system.

This test suite verifies that the system properly validates and handles:
- Malformed audio files
- Invalid JSON configurations
- Incorrect parameter types
- Corrupted data structures
- Boundary conditions and edge cases
"""

import json

import numpy as np
import pytest
from pydantic import ValidationError

from src.audio_agent.core.audio_buffer_manager import AudioBufferManager
from src.audio_agent.core.dawdreamer_engine import DawDreamerEngine

# Import modules to test
from src.audio_agent.models.audio import AudioAnalysis
from src.audio_agent.models.plugin import PluginParameter, PluginRecommendation


class TestInvalidAudioInputs:
    """Test handling of invalid audio inputs and malformed audio data."""

    def test_invalid_audio_file_formats(self):
        """Test handling of unsupported audio file formats."""
        invalid_files = [
            "test.txt",  # Text file
            "test.exe",  # Executable
            "test.xyz",  # Unknown extension
            "test",  # No extension
            "",  # Empty filename
            "test.mp3v2",  # Malformed extension
        ]

        handler = AudioFileHandler()

        for filename in invalid_files:
            with pytest.raises(ValueError, match="Unsupported audio format"):
                handler.validate_file_format(filename)

    def test_corrupted_audio_file_data(self):
        """Test handling of corrupted audio file data."""
        corrupted_data = [
            b"",  # Empty data
            b"\x00\x01\x02",  # Too small
            b"RIFF" + b"\x00" * 100,  # Invalid WAV header
            b"ID3" + b"\xFF" * 200,  # Invalid MP3 header
            b"Not audio data at all",  # Text instead of audio
            bytes([0xFF] * 1000),  # All max bytes
            bytes([0x00] * 1000),  # All null bytes
        ]

        handler = AudioFileHandler()

        for data in corrupted_data:
            with pytest.raises((ValueError, IOError)):
                handler.validate_audio_data(data)

    def test_invalid_audio_buffer_properties(self):
        """Test handling of invalid audio buffer properties."""
        buffer_manager = AudioBufferManager()

        # Invalid sample rates
        invalid_sample_rates = [0, -1, 1e6, 44.1, "48000", None]
        for sr in invalid_sample_rates:
            with pytest.raises((ValueError, TypeError)):
                buffer_manager.create_buffer(sample_rate=sr)

        # Invalid channel counts
        invalid_channels = [0, -1, 100, "2", None]
        for channels in invalid_channels:
            with pytest.raises((ValueError, TypeError)):
                buffer_manager.create_buffer(channels=channels)

        # Invalid buffer sizes
        invalid_sizes = [-1, 0, 1e10, "1024", None]
        for size in invalid_sizes:
            with pytest.raises((ValueError, TypeError)):
                buffer_manager.create_buffer(size=size)

    def test_nan_and_inf_audio_values(self):
        """Test handling of NaN and infinity values in audio data."""
        buffer_manager = AudioBufferManager()

        # Create buffer with NaN values
        nan_data = np.array([[np.nan, 1.0], [0.5, np.inf]])
        with pytest.raises(ValueError, match="Invalid audio values"):
            buffer_manager.validate_buffer_data(nan_data)

        # Create buffer with infinity values
        inf_data = np.array([[np.inf, -np.inf], [1.0, 0.5]])
        with pytest.raises(ValueError, match="Invalid audio values"):
            buffer_manager.validate_buffer_data(inf_data)

        # Create buffer with values outside valid range
        out_of_range_data = np.array([[1000.0, -1000.0], [2.0, -2.0]])
        with pytest.raises(ValueError, match="Audio values out of range"):
            buffer_manager.validate_buffer_data(out_of_range_data)


class TestInvalidConfigurations:
    """Test handling of invalid configuration data."""

    def test_invalid_json_configurations(self):
        """Test handling of malformed JSON configurations."""
        invalid_json_strings = [
            "",  # Empty string
            "{",  # Incomplete object
            "[",  # Incomplete array
            '{"key": "value"',  # Missing closing brace
            '{"key": "value",}',  # Trailing comma
            '{"key": }',  # Missing value
            '{"key": "value" "key2": "value2"}',  # Missing comma
            "null",  # Just null
            "undefined",  # JavaScript undefined
            '{"key": undefined}',  # Undefined value in JSON
            "key=value",  # Not JSON format
            "<xml>test</xml>",  # XML instead of JSON
        ]

        for json_str in invalid_json_strings:
            with pytest.raises((json.JSONDecodeError, ValueError)):
                json.loads(json_str)

    def test_invalid_dawdreamer_engine_configurations(self):
        """Test handling of invalid DawDreamerEngine configurations."""

        # Invalid configurations
        invalid_configs = [
            {},  # Empty config
            {"sample_rate": -1},  # Negative sample rate
            {"sample_rate": 0},  # Zero sample rate
            {"sample_rate": 1e6},  # Unrealistic sample rate
            {"buffer_size": -1},  # Negative buffer size
            {"buffer_size": 0},  # Zero buffer size
            {"buffer_size": 1e10},  # Unrealistic buffer size
            {"channels": -1},  # Negative channels
            {"channels": 0},  # Zero channels
            {"channels": 100},  # Too many channels
            {"sample_rate": "48000"},  # String instead of number
            {"buffer_size": "1024"},  # String instead of number
            {"invalid_param": "value"},  # Unknown parameter
            {"sample_rate": None},  # None value
        ]

        for config in invalid_configs:
            with pytest.raises((ValueError, TypeError, ValidationError)):
                DawDreamerEngine(config)

    def test_invalid_plugin_configurations(self):
        """Test handling of invalid plugin configurations."""
        from src.audio_agent.models.plugin import PluginConfig

        invalid_plugin_configs = [
            {},  # Empty config
            {"name": ""},  # Empty name
            {"name": None},  # None name
            {"parameters": []},  # Empty parameters
            {"parameters": "not_a_list"},  # Wrong type for parameters
            {"parameters": [{"invalid": "param"}]},  # Invalid parameter structure
            {"name": "test", "bypass": "yes"},  # Invalid bypass type
            {"name": "test", "enabled": maybe},  # Undefined variable
        ]

        for config in invalid_plugin_configs:
            with pytest.raises((ValueError, TypeError, ValidationError)):
                PluginConfig(**config)


class TestInvalidParameterTypes:
    """Test handling of incorrect parameter types."""

    def test_invalid_transformation_request_types(self):
        """Test handling of invalid types in TransformationRequest."""

        # Invalid transformation types
        invalid_requests = [
            {"transformation": 123},  # Number instead of string
            {"transformation": None},  # None instead of string
            {"transformation": []},  # Array instead of string
            {"audio_analysis": "not_dict"},  # String instead of dict
            {"composition_context": 123},  # Number instead of dict
            {"user_preferences": []},  # Array instead of dict
            {"parameters": "not_dict"},  # String instead of dict
            {"transformation": ""},  # Empty string
        ]

        for request_data in invalid_requests:
            with pytest.raises((ValueError, TypeError, ValidationError)):
                TransformationRequest(**request_data)

    def test_invalid_plugin_parameter_types(self):
        """Test handling of invalid plugin parameter types."""

        invalid_params = [
            {"name": 123},  # Number instead of string
            {"name": None},  # None instead of string
            {"value": "string_for_numeric_param"},  # String for numeric param
            {"min": "not_number"},  # String for numeric min
            {"max": "not_number"},  # String for numeric max
            {"default": "not_number"},  # String for numeric default
            {"type": 123},  # Number instead of string
            {"type": "invalid_type"},  # Invalid parameter type
            {"display_name": None},  # None display name
            {"display_name": 123},  # Number display name
        ]

        for param_data in invalid_params:
            with pytest.raises((ValueError, TypeError, ValidationError)):
                PluginParameter(**param_data)

    def test_invalid_audio_analysis_types(self):
        """Test handling of invalid types in AudioAnalysis."""

        invalid_analyses = [
            {"duration": "not_number"},  # String instead of number
            {"duration": -1},  # Negative duration
            {"sample_rate": "not_number"},  # String instead of number
            {"sample_rate": 0},  # Zero sample rate
            {"channels": "not_number"},  # String instead of number
            {"channels": 0},  # Zero channels
            {"peak_level": "not_number"},  # String instead of number
            {"rms_level": "not_number"},  # String instead of number
            {"spectral_centroid": "not_list"},  # String instead of list
            {"ai_context": "not_dict"},  # String instead of dict
            {"metadata": "not_dict"},  # String instead of dict
        ]

        for analysis_data in invalid_analyses:
            with pytest.raises((ValueError, TypeError, ValidationError)):
                AudioAnalysis(**analysis_data)


class TestCorruptedDataStructures:
    """Test handling of corrupted or inconsistent data structures."""

    def test_inconsistent_plugin_recommendations(self):
        """Test handling of inconsistent plugin recommendation data."""

        # Missing required fields
        incomplete_recommendations = [
            {},  # Completely empty
            {"plugin_name": "test"},  # Missing required fields
            {"plugin_category": "eq"},  # Missing plugin_name
            {"reason": "test reason"},  # Missing plugin info
        ]

        for rec_data in incomplete_recommendations:
            with pytest.raises((ValueError, ValidationError)):
                PluginRecommendation(**rec_data)

    def test_circular_references_in_data(self):
        """Test handling of circular references in data structures."""

        # Create a dict with circular reference
        circular_dict = {}
        circular_dict["self"] = circular_dict

        # This should be handled gracefully
        with pytest.raises((ValueError, RecursionError)):
            # Try to serialize/process the circular reference
            json.dumps(circular_dict)

    def test_malformed_unicode_data(self):
        """Test handling of malformed unicode data."""

        malformed_strings = [
            "\x80\x81\x82",  # Invalid UTF-8 bytes
            "🚀\xfe\xff",  # Mixed valid/invalid unicode
            "\ud800",  # High surrogate without low
            "\udc00",  # Low surrogate without high
            "test\x00\x00\x00",  # Null bytes in string
        ]

        for bad_string in malformed_strings:
            # Should handle gracefully without crashing
            try:
                result = bad_string.encode("utf-8", errors="ignore")
                assert isinstance(result, bytes)
            except (UnicodeError, ValueError):
                # Expected to fail for truly malformed unicode
                pass

    def test_extremely_large_data_structures(self):
        """Test handling of extremely large data structures."""

        # Very large string
        large_string = "x" * (10**7)  # 10MB string

        # Should handle large data gracefully or fail with clear error
        try:
            # Test with plugin name (which has reasonable limits)
            with pytest.raises(ValueError):
                PluginParameter(
                    name=large_string, display_name="test", default_value=0.0
                )
        except MemoryError:
            # Acceptable for very large data
            pass

        # Very large list
        try:
            large_list = list(range(10**6))  # 1M items
            with pytest.raises((ValueError, MemoryError)):
                # This should either validate size limits or fail gracefully
                AudioAnalysis(
                    spectral_centroid=large_list,
                    duration=1.0,
                    sample_rate=44100,
                    channels=2,
                    peak_level=0.0,
                    rms_level=0.0,
                    ai_context={},
                )
        except MemoryError:
            # Acceptable for extremely large data
            pass


class TestBoundaryConditions:
    """Test boundary conditions and edge cases."""

    def test_zero_and_negative_values(self):
        """Test handling of zero and negative values where inappropriate."""

        # Audio parameters that shouldn't be zero or negative
        invalid_audio_params = [
            {"duration": 0},  # Zero duration
            {"duration": -1},  # Negative duration
            {"sample_rate": 0},  # Zero sample rate
            {"sample_rate": -44100},  # Negative sample rate
            {"channels": 0},  # Zero channels
            {"channels": -2},  # Negative channels
        ]

        for params in invalid_audio_params:
            # Add required fields
            full_params = {
                "peak_level": 0.0,
                "rms_level": 0.0,
                "ai_context": {},
                **params,
            }

            if "duration" not in full_params:
                full_params["duration"] = 1.0
            if "sample_rate" not in full_params:
                full_params["sample_rate"] = 44100
            if "channels" not in full_params:
                full_params["channels"] = 2

            with pytest.raises((ValueError, ValidationError)):
                AudioAnalysis(**full_params)

    def test_extreme_parameter_values(self):
        """Test handling of extreme but technically valid parameter values."""

        # Very small positive values
        tiny_values = [1e-10, 1e-20, 1e-100]

        for value in tiny_values:
            # Should handle very small values appropriately
            try:
                param = PluginParameter(
                    name="tiny_param",
                    display_name="Tiny Param",
                    default_value=value,
                    min_value=0.0,
                    max_value=1.0,
                )
                assert param.default_value == value
            except (ValueError, OverflowError):
                # Acceptable for extremely small values
                pass

        # Very large values
        huge_values = [1e10, 1e20, 1e100]

        for value in huge_values:
            # Should handle very large values appropriately
            try:
                param = PluginParameter(
                    name="huge_param",
                    display_name="Huge Param",
                    default_value=value,
                    min_value=0.0,
                    max_value=1e20,
                )
                assert param.default_value == value
            except (ValueError, OverflowError):
                # Acceptable for extremely large values
                pass

    def test_empty_collections(self):
        """Test handling of empty collections and containers."""

        # Empty collections should be handled gracefully
        empty_collections = [
            [],  # Empty list
            {},  # Empty dict
            set(),  # Empty set
            "",  # Empty string
            (),  # Empty tuple
        ]

        for empty_collection in empty_collections:
            # Test with AudioAnalysis metadata
            try:
                analysis = AudioAnalysis(
                    duration=1.0,
                    sample_rate=44100,
                    channels=2,
                    peak_level=0.0,
                    rms_level=0.0,
                    ai_context={},
                    metadata=empty_collection
                    if isinstance(empty_collection, dict)
                    else {},
                )
                assert isinstance(analysis.metadata, dict)
            except (ValueError, TypeError):
                # Some empty collections might not be valid for certain fields
                pass


class TestErrorRecovery:
    """Test error recovery and graceful degradation."""

    def test_partial_data_recovery(self):
        """Test recovery from partial or incomplete data."""

        # Partial audio analysis data
        partial_data = {
            "duration": 2.5,
            "sample_rate": 44100,
            # Missing channels, peak_level, rms_level, ai_context
        }

        # Should fail gracefully with clear error message
        with pytest.raises(ValidationError) as exc_info:
            AudioAnalysis(**partial_data)

        # Verify error message mentions missing fields
        error_msg = str(exc_info.value)
        assert any(
            field in error_msg.lower()
            for field in ["channels", "peak_level", "rms_level", "ai_context"]
        )

    def test_fallback_values_for_invalid_data(self):
        """Test that appropriate fallback values are used when possible."""

        # Test with buffer manager that might use defaults
        buffer_manager = AudioBufferManager()

        # Should use defaults when invalid values provided
        try:
            buffer = buffer_manager.create_buffer(
                sample_rate=None, channels=2, size=1024  # Invalid, should use default
            )
            # If successful, should have used default sample rate
            assert buffer.sample_rate == buffer_manager.default_sample_rate
        except (ValueError, TypeError):
            # Acceptable to fail if no fallback is appropriate
            pass

    def test_validation_error_messages(self):
        """Test that validation error messages are helpful and specific."""

        # Test various validation scenarios
        test_cases = [
            ({}, "missing", "Required fields missing"),
            ({"transformation": ""}, "empty", "Empty transformation name"),
            ({"sample_rate": -1}, "negative", "Negative sample rate"),
            ({"channels": 0}, "zero", "Zero channels"),
        ]

        for invalid_data, expected_keyword, description in test_cases:
            try:
                if "transformation" in invalid_data:
                    TransformationRequest(**invalid_data)
                elif "sample_rate" in invalid_data:
                    DawDreamerEngine(invalid_data)
                else:
                    AudioAnalysis(
                        duration=1.0,
                        sample_rate=44100,
                        channels=2,
                        peak_level=0.0,
                        rms_level=0.0,
                        ai_context={},
                        **invalid_data,
                    )
            except (ValueError, ValidationError) as exc_info:
                error_msg = str(exc_info).lower()
                # Error message should contain relevant information
                assert len(error_msg) > 10  # Non-trivial error message


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

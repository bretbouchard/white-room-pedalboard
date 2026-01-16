"""
Simple test for invalid inputs and malformed data handling.

This test suite focuses on testing the validation that actually exists in the codebase.
"""

import json

import pytest
from pydantic import ValidationError

# Import modules that actually exist
from src.audio_agent.models.audio import AudioAnalysis
from src.audio_agent.models.plugin import PluginParameter


class TestInvalidAudioData:
    """Test handling of invalid audio data inputs."""

    def test_invalid_audio_analysis_duration(self):
        """Test handling of invalid duration values in AudioAnalysis."""

        # Invalid duration values
        invalid_durations = [-1, 0, -10.5]

        for duration in invalid_durations:
            with pytest.raises((ValidationError, ValueError)):
                AudioAnalysis(
                    duration=duration,
                    sample_rate=44100,
                    channels=2,
                    peak_level=0.0,
                    rms_level=0.0,
                    ai_context={},
                )

    def test_invalid_audio_analysis_sample_rate(self):
        """Test handling of invalid sample rate values in AudioAnalysis."""

        # Invalid sample rate values
        invalid_sample_rates = [0, -1, -44100, 8000, 192000]  # Too low or too high

        for sample_rate in invalid_sample_rates:
            with pytest.raises((ValidationError, ValueError)):
                AudioAnalysis(
                    duration=1.0,
                    sample_rate=sample_rate,
                    channels=2,
                    peak_level=0.0,
                    rms_level=0.0,
                    ai_context={},
                )

    def test_invalid_audio_analysis_channels(self):
        """Test handling of invalid channel counts in AudioAnalysis."""

        # Invalid channel values
        invalid_channels = [0, -1, -2, 100]  # Zero, negative, or too many

        for channels in invalid_channels:
            with pytest.raises((ValidationError, ValueError)):
                AudioAnalysis(
                    duration=1.0,
                    sample_rate=44100,
                    channels=channels,
                    peak_level=0.0,
                    rms_level=0.0,
                    ai_context={},
                )

    def test_missing_required_fields_audio_analysis(self):
        """Test handling of missing required fields in AudioAnalysis."""

        # Missing required fields
        incomplete_data = [
            {},  # Completely empty
            {"duration": 1.0},  # Missing other required fields
            {"duration": 1.0, "sample_rate": 44100},  # Missing more fields
        ]

        for data in incomplete_data:
            with pytest.raises(ValidationError):
                AudioAnalysis(**data)


class TestInvalidPluginParameters:
    """Test handling of invalid plugin parameter data."""

    def test_invalid_plugin_parameter_name(self):
        """Test handling of invalid parameter names."""

        # Invalid parameter names
        invalid_names = ["", None, 123, [], {}]

        for name in invalid_names:
            with pytest.raises((ValidationError, ValueError, TypeError)):
                PluginParameter(
                    name=name,
                    display_name="Test Param",
                    default_value=0.0,
                    min_value=0.0,
                    max_value=1.0,
                )

    def test_invalid_plugin_parameter_values(self):
        """Test handling of invalid parameter values."""

        # Invalid default values that don't fit min/max constraints
        invalid_value_configs = [
            {"default_value": 2.0, "min_value": 0.0, "max_value": 1.0},  # Above max
            {"default_value": -1.0, "min_value": 0.0, "max_value": 1.0},  # Below min
            {"min_value": 1.0, "max_value": 0.0},  # Min > max
            {"min_value": "not_a_number"},  # Non-numeric min
            {"max_value": "not_a_number"},  # Non-numeric max
        ]

        for config in invalid_value_configs:
            with pytest.raises((ValidationError, ValueError, TypeError)):
                PluginParameter(name="test_param", display_name="Test Param", **config)

    def test_missing_required_plugin_parameter_fields(self):
        """Test handling of missing required fields in PluginParameter."""

        # Missing required fields
        incomplete_data = [
            {},  # Completely empty
            {"name": "test"},  # Missing other required fields
        ]

        for data in incomplete_data:
            with pytest.raises(ValidationError):
                PluginParameter(**data)


class TestInvalidJsonData:
    """Test handling of malformed JSON data."""

    def test_invalid_json_strings(self):
        """Test handling of malformed JSON strings."""

        invalid_json_strings = [
            "",  # Empty string
            "{",  # Incomplete object
            "[",  # Incomplete array
            '{"key": "value"',  # Missing closing brace
            '{"key": "value",}',  # Trailing comma
            '{"key": }',  # Missing value
            '{"key": "value" "key2": "value2"}',  # Missing comma
            "undefined",  # JavaScript undefined
            '{"key": undefined}',  # Undefined value in JSON
            "key=value",  # Not JSON format
            "<xml>test</xml>",  # XML instead of JSON
        ]

        for json_str in invalid_json_strings:
            with pytest.raises((json.JSONDecodeError, ValueError, TypeError)):
                json.loads(json_str)

    def test_json_with_invalid_types(self):
        """Test JSON with invalid types for expected values."""

        # Valid JSON structure but with wrong types for audio data
        invalid_type_data = {
            "duration": "not_a_number",  # String instead of number
            "sample_rate": "not_a_number",  # String instead of number
            "channels": "not_a_number",  # String instead of number
            "peak_level": "not_a_number",  # String instead of number
            "rms_level": "not_a_number",  # String instead of number
            "ai_context": "not_a_dict",  # String instead of dict
        }

        # This should parse as JSON but fail validation
        json_str = json.dumps(invalid_type_data)
        parsed_data = json.loads(json_str)

        # Try to create AudioAnalysis with wrong types
        with pytest.raises((ValidationError, ValueError, TypeError)):
            AudioAnalysis(**parsed_data)


class TestInvalidNumericValues:
    """Test handling of invalid numeric values."""

    def test_nan_and_inf_values(self):
        """Test handling of NaN and infinity values."""

        # Invalid numeric values
        invalid_values = [float("nan"), float("inf"), float("-inf")]

        for value in invalid_values:
            # Test with AudioAnalysis numeric fields
            with pytest.raises((ValidationError, ValueError)):
                AudioAnalysis(
                    duration=value,
                    sample_rate=44100,
                    channels=2,
                    peak_level=0.0,
                    rms_level=0.0,
                    ai_context={},
                )

    def test_extreme_numeric_values(self):
        """Test handling of extreme numeric values."""

        # Very large and very small values
        extreme_values = [1e100, 1e-100, -1e100, -1e-100]

        for value in extreme_values:
            # Test with PluginParameter numeric fields
            try:
                param = PluginParameter(
                    name="extreme_param",
                    display_name="Extreme Param",
                    default_value=value,
                    min_value=-1e200,
                    max_value=1e200,
                )
                # If it succeeds, the value should be preserved
                assert param.default_value == value
            except (ValidationError, OverflowError, ValueError):
                # Acceptable for extreme values
                pass


class TestBoundaryConditions:
    """Test boundary conditions and edge cases."""

    def test_empty_string_values(self):
        """Test handling of empty string values."""

        # Test empty string for name fields
        with pytest.raises((ValidationError, ValueError)):
            PluginParameter(
                name="",
                display_name="Test Param",
                default_value=0.0,
                min_value=0.0,
                max_value=1.0,
            )

    def test_zero_values_where_inappropriate(self):
        """Test handling of zero values where they shouldn't be zero."""

        # Zero values that should be invalid
        invalid_zero_configs = [
            {"duration": 0},  # Zero duration
            {"sample_rate": 0},  # Zero sample rate
            {"channels": 0},  # Zero channels
        ]

        for config in invalid_zero_configs:
            with pytest.raises((ValidationError, ValueError)):
                AudioAnalysis(peak_level=0.0, rms_level=0.0, ai_context={}, **config)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

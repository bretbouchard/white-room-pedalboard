"""
Improved test suite for invalid inputs and malformed data handling.

This refactored version demonstrates improved maintainability through:
- Better use of fixtures and helper functions
- Reduced code duplication
- Clearer test organization
- More descriptive documentation
- Improved error handling in tests themselves
"""

import json

import pytest
from pydantic import ValidationError

# Import modules to test
from src.audio_agent.models.audio import AudioAnalysis
from src.audio_agent.models.plugin import PluginParameter

# Import helper functions and fixtures
from .test_helpers import (
    generate_invalid_json_examples,
)


class TestInvalidAudioData:
    """Test handling of invalid audio data inputs."""

    def test_invalid_audio_analysis_duration(self, mock_audio_analysis):
        """Test handling of invalid duration values in AudioAnalysis."""
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

    def test_invalid_audio_analysis_sample_rate(self, mock_audio_analysis):
        """Test handling of invalid sample rate values in AudioAnalysis."""
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

    def test_invalid_audio_analysis_channels(self, mock_audio_analysis):
        """Test handling of invalid channel counts in AudioAnalysis."""
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

    def test_missing_required_fields_audio_analysis(self, mock_audio_analysis):
        """Test handling of missing required fields in AudioAnalysis."""
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
        invalid_json_examples = generate_invalid_json_examples()

        for json_str in invalid_json_examples:
            with pytest.raises((json.JSONDecodeError, ValueError, TypeError)):
                json.loads(json_str)

    def test_json_with_invalid_types(self, mock_audio_analysis):
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
        huge_values = [1e100, 1e-100, -1e100, -1e-100]

        for value in huge_values:
            # Test with PluginParameter numeric fields
            try:
                param = PluginParameter(
                    name="extreme_param",
                    display_name="Extreme Param",
                    default_value=value,
                    min_value=0.0,
                    max_value=1e20,
                )
                # If it succeeds, the value should be preserved
                assert param.default_value == value
            except (ValidationError, OverflowError, ValueError):
                # Acceptable for extremely large values
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
        # Audio parameters that shouldn't be zero
        invalid_zero_configs = [
            {"duration": 0},  # Zero duration
            {"sample_rate": 0},  # Zero sample rate
            {"channels": 0},  # Zero channels
        ]

        for config in invalid_zero_configs:
            with pytest.raises((ValidationError, ValueError)):
                AudioAnalysis(peak_level=0.0, rms_level=0.0, ai_context={}, **config)

    def test_boundary_numeric_values(self):
        """Test handling of boundary numeric values."""
        boundary_cases = [
            # Duration boundaries
            {
                "duration": 0.001,
                "sample_rate": 44100,
                "channels": 2,
            },  # Very short audio
            {
                "duration": 3600.0,
                "sample_rate": 44100,
                "channels": 2,
            },  # Very long audio (1 hour)
            # Sample rate boundaries
            {"duration": 1.0, "sample_rate": 8000, "channels": 1},  # Low sample rate
            {"duration": 1.0, "sample_rate": 192000, "channels": 2},  # High sample rate
            # Channel boundaries
            {"duration": 1.0, "sample_rate": 44100, "channels": 1},  # Mono
            {"duration": 1.0, "sample_rate": 44100, "channels": 8},  # Multi-channel
        ]

        for config in boundary_cases:
            # These should either work or fail gracefully
            try:
                analysis = AudioAnalysis(
                    peak_level=0.0, rms_level=0.0, ai_context={}, **config
                )
                # If successful, verify the values were preserved
                for key, expected_value in config.items():
                    assert getattr(analysis, key) == expected_value
            except (ValidationError, ValueError):
                # Acceptable for truly boundary cases
                pass


class TestErrorRecoveryPatterns:
    """Test error recovery patterns and graceful degradation."""

    def test_graceful_degradation_on_invalid_data(self):
        """Test that system degrades gracefully when given invalid data."""
        # This would be tested against actual system components
        # For now, we test that validation errors provide helpful information

        with pytest.raises(ValidationError) as exc_info:
            AudioAnalysis(
                duration=-1,  # Invalid
                sample_rate=44100,
                channels=2,
                peak_level=0.0,
                rms_level=0.0,
                ai_context={},
            )

        # Verify error message is informative
        error_msg = str(exc_info.value)
        assert len(error_msg) > 10  # Non-trivial error message
        assert "duration" in error_msg.lower()  # Should mention the problematic field

    def test_partial_data_recovery(self):
        """Test system behavior with partial data."""
        # Test with partially complete data
        partial_data = {
            "duration": 2.5,
            "sample_rate": 44100,
            # Missing channels, peak_level, rms_level, ai_context
        }

        with pytest.raises(ValidationError) as exc_info:
            AudioAnalysis(**partial_data)

        # Verify error message mentions missing required fields
        error_msg = str(exc_info.value)
        assert any(
            field in error_msg.lower()
            for field in ["channels", "peak_level", "rms_level", "ai_context"]
        )


class TestSystemStability:
    """Test system stability under various stress conditions."""

    def test_bulk_validation_stability(self):
        """Test system stability when validating many invalid items."""
        invalid_items = []

        # Generate many invalid analysis objects
        for i in range(100):
            invalid_data = {
                "duration": -1 if i % 2 == 0 else 1.0,
                "sample_rate": 0 if i % 3 == 0 else 44100,
                "channels": 0 if i % 5 == 0 else 2,
                "peak_level": 0.0,
                "rms_level": 0.0,
                "ai_context": {},
            }
            invalid_items.append(invalid_data)

        # Validate all items - system should remain stable
        error_count = 0
        for data in invalid_items:
            try:
                AudioAnalysis(**data)
            except (ValidationError, ValueError):
                error_count += 1

        # All should fail validation, but system should handle gracefully
        assert error_count == len(
            invalid_items
        ), "All invalid items should fail validation"

    def test_memory_usage_during_validation(self):
        """Test that validation doesn't cause memory leaks."""
        import gc

        initial_memory = psutil.Process().memory_info().rss / (1024 * 1024)

        # Perform many validation operations
        for _ in range(1000):
            try:
                AudioAnalysis(
                    duration=1.0,
                    sample_rate=44100,
                    channels=2,
                    peak_level=0.0,
                    rms_level=0.0,
                    ai_context={},
                )
            except (ValidationError, ValueError):
                pass

        # Force garbage collection
        gc.collect()

        final_memory = psutil.Process().memory_info().rss / (1024 * 1024)
        memory_increase = final_memory - initial_memory

        # Memory increase should be minimal
        assert (
            memory_increase < 50
        ), f"Memory usage increased by {memory_increase}MB during validation"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

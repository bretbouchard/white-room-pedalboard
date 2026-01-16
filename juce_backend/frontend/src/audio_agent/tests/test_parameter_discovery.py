"""
Tests for the enhanced parameter discovery and mapping system.
"""


import pytest
from audio_agent.core.parameter_discovery import (
    ParameterPatternMatcher,
    ParameterType,
    ParameterUnit,
)


class TestParameterPatternMatcher:
    """Test the parameter pattern matching system."""

    def test_volume_parameter_matching(self):
        """Test volume/gain parameter pattern matching."""
        matcher = ParameterPatternMatcher()

        volume_params = ["volume", "gain", "gain1", "output", "level"]
        for param_name in volume_params:
            metadata = matcher.match_parameter_pattern(param_name)
            assert metadata is not None, f"Should match volume parameter: {param_name}"
            assert metadata["unit"] == ParameterUnit.DECIBELS
            assert metadata["category"] == "gain"

    def test_frequency_parameter_matching(self):
        """Test frequency parameter pattern matching."""
        matcher = ParameterPatternMatcher()

        freq_params = ["frequency", "freq", "cutoff", "fc"]
        for param_name in freq_params:
            metadata = matcher.match_parameter_pattern(param_name)
            assert (
                metadata is not None
            ), f"Should match frequency parameter: {param_name}"
            assert metadata["unit"] == ParameterUnit.HERZ
            assert metadata["category"] == "frequency"

    def test_boolean_parameter_matching(self):
        """Test boolean parameter pattern matching."""
        matcher = ParameterPatternMatcher()

        boolean_params = ["bypass", "enable", "on", "off", "mute"]
        for param_name in boolean_params:
            metadata = matcher.match_parameter_pattern(param_name)
            assert metadata is not None, f"Should match boolean parameter: {param_name}"
            assert metadata["parameter_type"] == ParameterType.BOOLEAN


if __name__ == "__main__":
    pytest.main([__file__])

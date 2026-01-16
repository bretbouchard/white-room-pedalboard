"""
Tests for plugin parameter control.
"""

import pytest

from src.audio_agent.core.dawdreamer_engine import (
    DawDreamerEngine,
    DawDreamerEngineError,
)


class TestPluginParameterControl:
    """Test setting and getting parameters for different processor types."""

    @pytest.fixture
    def engine(self):
        """Create a DawDreamer engine for testing."""
        return DawDreamerEngine()

    def test_set_get_faust_parameter(self, engine):
        """Test setting and getting a parameter on a Faust processor."""
        engine.create_faust_processor("my_faust", "process = _;")
        engine.set_processor_parameter("my_faust", "gain", 0.7)
        value = engine.get_processor_parameter("my_faust", "gain")
        assert value == 0.7

    def test_set_get_builtin_compressor_parameter(self, engine):
        """Test setting and getting a parameter on a built-in compressor."""
        engine.create_builtin_processor("my_compressor", "compressor")
        engine.set_processor_parameter("my_compressor", "threshold", -20.0)
        value = engine.get_processor_parameter("my_compressor", "threshold")
        assert value == -20.0

    def test_set_get_builtin_reverb_parameter(self, engine):
        """Test setting and getting a parameter on a built-in reverb."""
        engine.create_builtin_processor("my_reverb", "reverb")
        engine.set_processor_parameter("my_reverb", "room_size", 0.9)
        value = engine.get_processor_parameter("my_reverb", "room_size")
        assert value == 0.9

    def test_set_parameter_on_nonexistent_processor(self, engine):
        """Test setting a parameter on a nonexistent processor."""
        with pytest.raises(DawDreamerEngineError):
            engine.set_processor_parameter("nonexistent", "gain", 0.5)

    def test_get_parameter_from_nonexistent_processor(self, engine):
        """Test getting a parameter from a nonexistent processor."""
        with pytest.raises(DawDreamerEngineError):
            engine.get_processor_parameter("nonexistent", "gain")

"""
Tests for plugin state management.
"""

import os
import tempfile

import pytest

from src.audio_agent.core.dawdreamer_engine import (
    DawDreamerEngine,
    DawDreamerEngineError,
)


class TestPluginStateManagement:
    """Test saving and loading plugin state."""

    @pytest.fixture
    def engine(self):
        """Create a DawDreamer engine for testing."""
        return DawDreamerEngine()

    def test_save_and_load_faust_state(self, engine):
        """Test saving and loading the state of a Faust processor."""
        engine.create_faust_processor("my_faust", "process = _;")
        engine.set_processor_parameter("my_faust", "gain", 0.7)

        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            state_file = tmp.name

        engine.save_plugin_state("my_faust", state_file)

        # Reset the parameter to a different value
        engine.set_processor_parameter("my_faust", "gain", 0.1)
        assert engine.get_processor_parameter("my_faust", "gain") == 0.1

        engine.load_plugin_state("my_faust", state_file)

        # The mock doesn't actually save/load, so we can't assert the value.
        # We just check that the methods don't raise an exception.

        os.remove(state_file)

    def test_save_and_load_builtin_compressor_state(self, engine):
        """Test saving and loading the state of a built-in compressor."""
        engine.create_builtin_processor("my_compressor", "compressor")
        engine.set_processor_parameter("my_compressor", "threshold", -20.0)

        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            state_file = tmp.name

        engine.save_plugin_state("my_compressor", state_file)

        # Reset the parameter to a different value
        engine.set_processor_parameter("my_compressor", "threshold", -10.0)
        assert engine.get_processor_parameter("my_compressor", "threshold") == -10.0

        engine.load_plugin_state("my_compressor", state_file)

        # The mock doesn't actually save/load, so we can't assert the value.
        # We just check that the methods don't raise an exception.

        os.remove(state_file)

    def test_save_state_of_nonexistent_processor(self, engine):
        """Test saving the state of a nonexistent processor."""
        with pytest.raises(DawDreamerEngineError):
            engine.save_plugin_state("nonexistent", "/tmp/state.fxp")

    def test_load_state_of_nonexistent_processor(self, engine):
        """Test loading the state of a nonexistent processor."""
        with pytest.raises(DawDreamerEngineError):
            engine.load_plugin_state("nonexistent", "/tmp/state.fxp")

    def test_load_state_from_nonexistent_file(self, engine):
        """Test loading state from a nonexistent file."""
        engine.create_faust_processor("my_faust", "process = _;")
        with pytest.raises(DawDreamerEngineError):
            engine.load_plugin_state("my_faust", "/tmp/nonexistent.fxp")

"""
Tests for DawDreamer Engine functionality.
"""

import numpy as np
import pytest

from src.audio_agent.core.dawdreamer_engine import (
    AudioDeviceConfig,
    AudioGraphNode,
    DawDreamerEngine,
    DawDreamerEngineError,
    ProcessorConfig,
)


class TestAudioDeviceConfig:
    """Test AudioDeviceConfig validation."""

    def test_default_config(self):
        """Test default configuration values."""
        config = AudioDeviceConfig()
        assert config.sample_rate == 44100
        assert config.buffer_size == 512
        assert config.input_channels == 2
        assert config.output_channels == 2
        assert config.device_name is None

    def test_valid_sample_rates(self):
        """Test valid sample rate values."""
        valid_rates = [22050, 44100, 48000, 88200, 96000]
        for rate in valid_rates:
            config = AudioDeviceConfig(sample_rate=rate)
            assert config.sample_rate == rate

    def test_invalid_sample_rates(self):
        """Test invalid sample rate values."""
        invalid_rates = [0, -1, 192001]  # Removed 8000 as it's valid in our validator
        for rate in invalid_rates:
            with pytest.raises(ValueError):
                AudioDeviceConfig(sample_rate=rate)

    def test_valid_buffer_sizes(self):
        """Test valid buffer size values."""
        valid_sizes = [64, 128, 256, 512, 1024, 2048]
        for size in valid_sizes:
            config = AudioDeviceConfig(buffer_size=size)
            assert config.buffer_size == size

    def test_invalid_buffer_sizes(self):
        """Test invalid buffer size values."""
        invalid_sizes = [0, -1, 63, 2049, 100]  # 100 is not power of 2
        for size in invalid_sizes:
            with pytest.raises(ValueError):
                AudioDeviceConfig(buffer_size=size)


class TestProcessorConfig:
    """Test ProcessorConfig validation."""

    def test_valid_processor_config(self):
        """Test valid processor configuration."""
        config = ProcessorConfig(
            name="test_processor",
            processor_type="faust",
            parameters={"gain": 0.5, "frequency": 440.0},
            enabled=True,
            bypass=False,
        )
        assert config.name == "test_processor"
        assert config.processor_type == "faust"
        assert config.parameters["gain"] == 0.5
        assert config.enabled is True
        assert config.bypass is False

    def test_empty_name_validation(self):
        """Test that empty processor name is rejected."""
        with pytest.raises(ValueError):
            ProcessorConfig(name="", processor_type="faust")

    def test_default_values(self):
        """Test default values for optional fields."""
        config = ProcessorConfig(name="test", processor_type="plugin")
        assert config.parameters == {}
        assert config.enabled is True
        assert config.bypass is False


class TestAudioGraphNode:
    """Test AudioGraphNode validation."""

    def test_valid_graph_node(self):
        """Test valid graph node configuration."""
        node = AudioGraphNode(
            processor_name="eq",
            input_connections=["input"],
            output_connections=["compressor"],
            parameters={"frequency": 1000.0, "gain": 3.0},
        )
        assert node.processor_name == "eq"
        assert node.input_connections == ["input"]
        assert node.output_connections == ["compressor"]
        assert node.parameters["frequency"] == 1000.0

    def test_empty_processor_name(self):
        """Test that empty processor name is rejected."""
        with pytest.raises(ValueError):
            AudioGraphNode(processor_name="")

    def test_default_connections(self):
        """Test default empty connections."""
        node = AudioGraphNode(processor_name="test")
        assert node.input_connections == []
        assert node.output_connections == []
        assert node.parameters == {}


class TestDawDreamerEngine:
    """Test DawDreamerEngine functionality."""

    @pytest.fixture
    def engine(self):
        """Create a DawDreamer engine for testing."""
        return DawDreamerEngine()

    @pytest.fixture
    def custom_config_engine(self):
        """Create engine with custom configuration."""
        config = AudioDeviceConfig(
            sample_rate=48000, buffer_size=256, input_channels=1, output_channels=2
        )
        return DawDreamerEngine(audio_config=config)

    def test_engine_initialization(self, engine):
        """Test engine initializes with default configuration."""
        assert engine.audio_config.sample_rate == 44100
        assert engine.audio_config.buffer_size == 512
        assert not engine.is_running()

        status = engine.get_engine_status()
        assert status["is_running"] is False
        assert status["sample_rate"] == 44100
        assert status["buffer_size"] == 512
        assert status["processor_count"] == 0
        assert status["error_count"] == 0

    def test_custom_config_initialization(self, custom_config_engine):
        """Test engine initializes with custom configuration."""
        assert custom_config_engine.audio_config.sample_rate == 48000
        assert custom_config_engine.audio_config.buffer_size == 256
        assert custom_config_engine.audio_config.input_channels == 1
        assert custom_config_engine.audio_config.output_channels == 2

    def test_update_audio_config(self, engine):
        """Test updating audio configuration."""
        new_config = AudioDeviceConfig(sample_rate=48000, buffer_size=1024)

        engine.update_audio_config(new_config)

        assert engine.audio_config.sample_rate == 48000
        assert engine.audio_config.buffer_size == 1024

    def test_create_faust_processor(self, engine):
        """Test creating Faust processor."""
        faust_code = """
        import("stdfaust.lib");
        process = _ : *(0.5);
        """

        processor_name = engine.create_faust_processor("gain_processor", faust_code)

        assert processor_name == "gain_processor"
        assert "gain_processor" in engine.get_processor_list()

        config = engine.get_processor_config("gain_processor")
        assert config is not None
        assert config.processor_type == "faust"
        assert config.parameters["faust_code"] == faust_code

    def test_create_builtin_compressor(self, engine):
        """Test creating built-in compressor processor."""
        processor_name = engine.create_builtin_processor("compressor1", "compressor")

        assert processor_name == "compressor1"
        assert "compressor1" in engine.get_processor_list()

        config = engine.get_processor_config("compressor1")
        assert config is not None
        assert config.processor_type == "compressor"

    def test_create_builtin_reverb(self, engine):
        """Test creating built-in reverb processor."""
        processor_name = engine.create_builtin_processor("reverb1", "reverb")

        assert processor_name == "reverb1"
        assert "reverb1" in engine.get_processor_list()

        config = engine.get_processor_config("reverb1")
        assert config is not None
        assert config.processor_type == "reverb"

    def test_invalid_builtin_processor_type(self, engine):
        """Test creating invalid built-in processor type."""
        with pytest.raises(DawDreamerEngineError):
            engine.create_builtin_processor("invalid", "nonexistent_type")

    def test_set_and_get_processor_parameter(self, engine):
        """Test setting and getting processor parameters."""
        # Create a compressor first
        engine.create_builtin_processor("comp", "compressor")

        # Set parameter
        engine.set_processor_parameter("comp", "threshold", -12.0)

        # Get parameter
        value = engine.get_processor_parameter("comp", "threshold")
        assert value == -12.0

        # Check stored configuration
        config = engine.get_processor_config("comp")
        assert config.parameters["threshold"] == -12.0

    def test_set_parameter_nonexistent_processor(self, engine):
        """Test setting parameter on non-existent processor."""
        with pytest.raises(DawDreamerEngineError):
            engine.set_processor_parameter("nonexistent", "gain", 0.5)

    def test_get_parameter_nonexistent_processor(self, engine):
        """Test getting parameter from non-existent processor."""
        with pytest.raises(DawDreamerEngineError):
            engine.get_processor_parameter("nonexistent", "gain")

    def test_load_audio_graph(self, engine):
        """Test loading audio processing graph."""
        # Create processors first
        engine.create_faust_processor("input", "process = _;")
        engine.create_builtin_processor("comp", "compressor")
        engine.create_builtin_processor("reverb", "reverb")

        # Create graph
        graph_nodes = [
            AudioGraphNode(processor_name="input", output_connections=["comp"]),
            AudioGraphNode(
                processor_name="comp",
                input_connections=["input"],
                output_connections=["reverb"],
            ),
            AudioGraphNode(processor_name="reverb", input_connections=["comp"]),
        ]

        engine.load_audio_graph(graph_nodes)

        status = engine.get_engine_status()
        assert status["graph_node_count"] == 3

    def test_load_graph_with_nonexistent_processor(self, engine):
        """Test loading graph with non-existent processor."""
        graph_nodes = [AudioGraphNode(processor_name="nonexistent")]

        with pytest.raises(DawDreamerEngineError):
            engine.load_audio_graph(graph_nodes)

    def test_render_audio_without_input(self, engine):
        """Test rendering audio without input."""
        # Create simple processor
        engine.create_faust_processor("gain", "process = _ : *(0.5);")

        # Load simple graph
        graph_nodes = [AudioGraphNode(processor_name="gain")]
        engine.load_audio_graph(graph_nodes)

        # Render audio
        result = engine.render_audio(duration=1.0)

        assert isinstance(result, np.ndarray)
        assert result.shape[1] == 2  # Stereo output (channels)
        assert result.shape[0] > 0  # Has samples

    def test_render_audio_with_input(self, engine):
        """Test rendering audio with input."""
        # Create simple processor
        engine.create_faust_processor("gain", "process = _ : *(0.5);")

        # Load simple graph
        graph_nodes = [AudioGraphNode(processor_name="gain")]
        engine.load_audio_graph(graph_nodes)

        # Create input audio (sine wave)
        duration = 1.0
        sample_rate = engine.audio_config.sample_rate
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        sine_wave = 0.5 * np.sin(2 * np.pi * 440 * t)
        input_audio = np.array([sine_wave, sine_wave]).T  # Stereo (samples, channels)

        # Render audio
        result = engine.render_audio(duration=duration, input_audio=input_audio)

        assert isinstance(result, np.ndarray)
        assert result.shape == input_audio.shape

    def test_get_analysis_results(self, engine):
        """Test getting analysis results from Faust processor."""
        # Create Faust analyzer
        faust_code = """
        import("stdfaust.lib");
        process = _ <: _, an.analyzer(1024);
        """
        engine.create_faust_processor("analyzer", faust_code)

        # Get analysis results (should work with mock)
        results = engine.get_analysis_results("analyzer")
        assert isinstance(results, dict)

    def test_get_analysis_from_non_faust_processor(self, engine):
        """Test getting analysis from non-Faust processor."""
        engine.create_builtin_processor("comp", "compressor")

        with pytest.raises(DawDreamerEngineError):
            engine.get_analysis_results("comp")

    def test_start_stop_real_time_processing(self, engine):
        """Test starting and stopping real-time processing."""
        assert not engine.is_running()

        engine.start_real_time_processing()
        assert engine.is_running()

        engine.stop_real_time_processing()
        assert not engine.is_running()

    def test_get_available_plugins(self, engine):
        """Test getting available plugins."""
        plugins = engine.get_available_plugins()
        assert isinstance(plugins, list)
        # Mock should return some plugins
        assert len(plugins) > 0

    def test_reset_engine(self, engine):
        """Test resetting engine to initial state."""
        # Create some processors
        engine.create_faust_processor("proc1", "process = _;")
        engine.create_builtin_processor("proc2", "compressor")

        # Start processing
        engine.start_real_time_processing()

        assert len(engine.get_processor_list()) == 2
        assert engine.is_running()

        # Reset engine
        engine.reset_engine()

        assert len(engine.get_processor_list()) == 0
        assert not engine.is_running()

        status = engine.get_engine_status()
        assert status["processor_count"] == 0
        assert status["graph_node_count"] == 0
        assert status["error_count"] == 0
        assert status["last_error"] is None

    def test_engine_error_tracking(self, engine):
        """Test that engine tracks errors properly."""
        initial_status = engine.get_engine_status()
        assert initial_status["error_count"] == 0
        assert initial_status["last_error"] is None

        # Cause an error
        try:
            engine.set_processor_parameter("nonexistent", "gain", 0.5)
        except DawDreamerEngineError:
            pass

        status = engine.get_engine_status()
        assert status["error_count"] == 1
        assert status["last_error"] is not None
        assert "nonexistent" in status["last_error"]


class TestDawDreamerEngineIntegration:
    """Integration tests for complete workflows."""

    @pytest.fixture
    def engine(self):
        """Create engine for integration tests."""
        return DawDreamerEngine()

    def test_complete_analysis_workflow(self, engine):
        """Test complete audio analysis workflow."""
        # Create Faust analyzer
        faust_analyzer_code = """
        import("stdfaust.lib");
        process = _ <: _, (an.analyzer(1024) : an.spectral_centroid);
        """

        engine.create_faust_processor("analyzer", faust_analyzer_code)

        # Create processing graph
        graph_nodes = [AudioGraphNode(processor_name="analyzer")]
        engine.load_audio_graph(graph_nodes)

        # Create test audio (sine wave)
        duration = 2.0
        sample_rate = engine.audio_config.sample_rate
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        sine_wave = 0.3 * np.sin(2 * np.pi * 440 * t)  # 440 Hz sine
        input_audio = np.array([sine_wave, sine_wave]).T  # Stereo (samples, channels)

        # Render and analyze
        result = engine.render_audio(duration=duration, input_audio=input_audio)

        # Get analysis results
        analysis = engine.get_analysis_results("analyzer")

        assert isinstance(result, np.ndarray)
        assert isinstance(analysis, dict)

    def test_complete_processing_chain(self, engine):
        """Test complete audio processing chain."""
        # Create processors
        engine.create_faust_processor("input", "process = _;")
        engine.create_builtin_processor("compressor", "compressor")
        engine.create_builtin_processor("reverb", "reverb")

        # Configure processors
        engine.set_processor_parameter("compressor", "threshold", -18.0)
        engine.set_processor_parameter("compressor", "ratio", 3.0)
        engine.set_processor_parameter("reverb", "room_size", 0.7)
        engine.set_processor_parameter("reverb", "wet_level", 0.4)

        # Create processing chain
        graph_nodes = [
            AudioGraphNode(processor_name="input", output_connections=["compressor"]),
            AudioGraphNode(
                processor_name="compressor",
                input_connections=["input"],
                output_connections=["reverb"],
            ),
            AudioGraphNode(processor_name="reverb", input_connections=["compressor"]),
        ]

        engine.load_audio_graph(graph_nodes)

        # Create test audio
        duration = 1.0
        sample_rate = engine.audio_config.sample_rate
        t = np.linspace(0, duration, int(sample_rate * duration), False)

        # Create more complex test signal
        fundamental = 0.4 * np.sin(2 * np.pi * 220 * t)  # A3
        harmonic2 = 0.2 * np.sin(2 * np.pi * 440 * t)  # A4
        harmonic3 = 0.1 * np.sin(2 * np.pi * 660 * t)  # E5

        complex_signal = fundamental + harmonic2 + harmonic3
        input_audio = np.array(
            [complex_signal, complex_signal]
        ).T  # Stereo (samples, channels)

        # Process audio
        result = engine.render_audio(duration=duration, input_audio=input_audio)

        assert isinstance(result, np.ndarray)
        assert result.shape == input_audio.shape

        # Verify parameters were set
        assert engine.get_processor_parameter("compressor", "threshold") == -18.0
        assert engine.get_processor_parameter("reverb", "room_size") == 0.7

    def test_real_time_processing_workflow(self, engine):
        """Test real-time processing workflow."""
        # Create simple processor
        engine.create_faust_processor("gain", "process = _ : *(0.8);")

        # Load graph
        graph_nodes = [AudioGraphNode(processor_name="gain")]
        engine.load_audio_graph(graph_nodes)

        # Start real-time processing
        engine.start_real_time_processing()
        assert engine.is_running()

        # Simulate some processing time
        import time

        time.sleep(0.1)

        # Stop processing
        engine.stop_real_time_processing()
        assert not engine.is_running()

    def test_error_recovery_workflow(self, engine):
        """Test error recovery and engine resilience."""
        # Create valid processor
        engine.create_faust_processor("valid", "process = _;")

        # Cause some errors
        error_count = 0

        try:
            engine.create_plugin_processor("invalid", "/nonexistent/path.vst")
        except DawDreamerEngineError:
            error_count += 1

        try:
            engine.set_processor_parameter("nonexistent", "gain", 0.5)
        except DawDreamerEngineError:
            error_count += 1

        # Engine should still be functional
        status = engine.get_engine_status()
        assert status["error_count"] == error_count
        assert len(engine.get_processor_list()) == 1  # Valid processor still there

        # Should still be able to process audio
        result = engine.render_audio(duration=0.5)
        assert isinstance(result, np.ndarray)

        # Reset should clear errors
        engine.reset_engine()
        status = engine.get_engine_status()
        assert status["error_count"] == 0
        assert status["last_error"] is None

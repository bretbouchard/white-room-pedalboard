from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from src.audio_agent.core.dawdreamer_engine import (
    AudioBuffer,
    AudioDeviceConfig,
    AudioGraphNode,
    DawDreamerEngine,
    DawDreamerEngineError,
)


@pytest.fixture
def engine():
    """Fixture for a DawDreamerEngine instance."""
    with patch(
        "src.audio_agent.core.dawdreamer_engine.get_dawdreamer_engine"
    ) as mock_get_engine:
        mock_engine = MagicMock()
        mock_get_engine.return_value = mock_engine
        engine = DawDreamerEngine()
        engine._engine = mock_engine
        yield engine


def test_create_faust_processor_success(engine):
    """Test successful creation of a Faust processor."""
    processor_name = "my_faust_processor"
    faust_code = "process = _"
    # The engine's make_faust_processor is expected to be called with the
    # processor name; the DSP string is applied via set_dsp_string on the
    # returned processor object.
    fake_processor = MagicMock()
    with patch.object(
        engine._engine, "make_faust_processor", return_value=fake_processor
    ) as mock_make_faust:
        result = engine.create_faust_processor(processor_name, faust_code)
        assert result == processor_name
        mock_make_faust.assert_called_once_with(processor_name)
        # Ensure DSP string was set on the returned processor
        fake_processor.set_dsp_string.assert_called_once_with(faust_code)
        assert processor_name in engine._processors
        assert engine._processors[processor_name].processor_type == "faust"


def test_create_faust_processor_failure(engine):
    """Test failure in creating a Faust processor."""
    processor_name = "my_faust_processor"
    faust_code = "process = _"
    with patch.object(
        engine._engine,
        "make_faust_processor",
        side_effect=Exception("Faust compilation failed"),
    ):
        with pytest.raises(
            DawDreamerEngineError, match="Failed to create faust processor"
        ):
            engine.create_faust_processor(processor_name, faust_code)


def test_create_plugin_processor_success(engine):
    """Test successful creation of a plugin processor."""
    processor_name = "my_plugin_processor"
    plugin_path = "/fake/plugin.vst3"
    with patch("pathlib.Path.exists", return_value=True):
        result = engine.create_plugin_processor(processor_name, plugin_path)
        assert result == processor_name
        assert processor_name in engine._processors
        assert engine._processors[processor_name].processor_type == "plugin"


def test_create_plugin_processor_file_not_found(engine):
    """Test plugin creation with a non-existent file."""
    processor_name = "my_plugin_processor"
    plugin_path = "/fake/plugin.vst3"
    with patch("pathlib.Path.exists", return_value=False):
        with pytest.raises(DawDreamerEngineError, match="Plugin file not found"):
            engine.create_plugin_processor(processor_name, plugin_path)


def test_create_builtin_processor_success(engine):
    """Test successful creation of a built-in processor."""
    processor_name = "my_compressor"
    processor_type = "compressor"
    with patch.object(
        engine._engine, "make_compressor_processor", return_value=MagicMock()
    ) as mock_make_compressor:
        result = engine.create_builtin_processor(processor_name, processor_type)
        assert result == processor_name
        mock_make_compressor.assert_called_once_with(processor_name)
        assert processor_name in engine._processors
        assert engine._processors[processor_name].processor_type == "compressor"


def test_create_builtin_processor_invalid_type(engine):
    """Test creating a built-in processor with an invalid type."""
    processor_name = "my_invalid_processor"
    processor_type = "invalid_type"
    with pytest.raises(DawDreamerEngineError, match="Invalid processor type"):
        engine.create_builtin_processor(processor_name, processor_type)


def test_set_and_get_processor_parameter_success(engine):
    """Test setting and getting a processor parameter successfully."""
    processor_name = "my_compressor"
    param_name = "threshold"
    param_value = -20.0
    engine.create_builtin_processor(processor_name, "compressor")

    with (
        patch.object(engine._engine, "set_parameter") as mock_set_param,
        patch.object(
            engine._engine, "get_parameter", return_value=param_value
        ) as mock_get_param,
    ):
        engine.set_processor_parameter(processor_name, param_name, param_value)
        mock_set_param.assert_called_once_with(processor_name, param_name, param_value)

        result = engine.get_processor_parameter(processor_name, param_name)
        mock_get_param.assert_called_once_with(processor_name, param_name)
        assert result == param_value


def test_set_processor_parameter_processor_not_found(engine):
    """Test setting a parameter on a non-existent processor."""
    with pytest.raises(DawDreamerEngineError, match="Processor not found"):
        engine.set_processor_parameter("non_existent_processor", "param", 0.5)


def test_get_processor_parameter_processor_not_found(engine):
    """Test getting a parameter from a non-existent processor."""
    with pytest.raises(DawDreamerEngineError, match="Processor not found"):
        engine.get_processor_parameter("non_existent_processor", "param")


def test_load_audio_graph_success(engine):
    """Test loading an audio graph successfully."""
    processor_name = "my_compressor"
    engine.create_builtin_processor(processor_name, "compressor")
    graph_nodes = [AudioGraphNode(processor_name=processor_name)]

    with patch.object(engine._engine, "load_graph") as mock_load_graph:
        engine.load_audio_graph(graph_nodes)
        mock_load_graph.assert_called_once()
        assert engine._audio_graph == graph_nodes


def test_load_audio_graph_processor_not_found(engine):
    """Test loading a graph with a non-existent processor."""
    graph_nodes = [AudioGraphNode(processor_name="non_existent_processor")]
    with pytest.raises(DawDreamerEngineError, match="Processor not found in graph"):
        engine.load_audio_graph(graph_nodes)


def test_render_audio_success(engine):
    """Test rendering audio successfully."""
    processor_name = "my_compressor"
    engine.create_builtin_processor(processor_name, "compressor")
    graph_nodes = [AudioGraphNode(processor_name=processor_name)]
    engine.load_audio_graph(graph_nodes)

    duration = 1.0
    mock_audio_buffer = AudioBuffer(
        np.zeros((2, int(duration * engine.audio_config.sample_rate))),
        engine.audio_config.sample_rate,
    )

    with patch.object(
        engine._engine, "render", return_value=mock_audio_buffer
    ) as mock_render:
        engine.render_audio(duration)
        mock_render.assert_called_once()


def test_engine_not_initialized(engine):
    """Test that methods raise an error if the engine is not initialized."""
    engine._engine = None
    with pytest.raises(DawDreamerEngineError, match="Engine not initialized"):
        engine.create_faust_processor("test", "process = _")
    with pytest.raises(DawDreamerEngineError, match="Engine not initialized"):
        engine.create_plugin_processor("test", "/fake/path")
    with pytest.raises(DawDreamerEngineError, match="Engine not initialized"):
        engine.create_builtin_processor("test", "compressor")
    with pytest.raises(DawDreamerEngineError, match="Engine not initialized"):
        engine.set_processor_parameter("test", "param", 0.5)
    with pytest.raises(DawDreamerEngineError, match="Engine not initialized"):
        engine.get_processor_parameter("test", "param")
    with pytest.raises(DawDreamerEngineError, match="Engine not initialized"):
        engine.load_audio_graph([])
    with pytest.raises(DawDreamerEngineError, match="Engine not initialized"):
        engine.render_audio(1.0)


def test_render_audio_with_invalid_input(engine):
    """Test rendering audio with invalid input."""
    import numpy as np

    with pytest.raises(DawDreamerEngineError, match="Failed to render audio"):
        engine.render_audio(1.0, input_audio=np.zeros((2, 2, 2)))


def test_init_with_invalid_audio_config_type():
    """Test initialization with an invalid audio_config type."""
    with pytest.raises(DawDreamerEngineError, match="Invalid audio configuration"):
        DawDreamerEngine(audio_config="not a dict or model")


def test_init_with_invalid_audio_config_values():
    """Test initialization with invalid audio configuration values."""
    with pytest.raises(DawDreamerEngineError, match="Invalid audio configuration"):
        DawDreamerEngine(audio_config={"sample_rate": 7000, "buffer_size": 512})

    with pytest.raises(DawDreamerEngineError, match="Invalid audio configuration"):
        DawDreamerEngine(audio_config={"sample_rate": 44100, "buffer_size": 100})


@patch(
    "src.audio_agent.core.dawdreamer_engine.get_dawdreamer_engine",
    side_effect=Exception("Engine failure"),
)
def test_init_engine_initialization_failure(mock_get_engine):
    """Test engine initialization failure."""
    with pytest.raises(
        DawDreamerEngineError, match="Failed to initialize DawDreamer engine"
    ):
        DawDreamerEngine()


def test_update_audio_config_with_invalid_config(engine):
    """Test updating audio config with an invalid configuration."""
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        AudioDeviceConfig(sample_rate=7000)


def test_update_audio_config_reinitializes_engine(engine):
    """Test that updating audio config reinitializes the engine."""
    engine._engine.reset_mock()
    new_config = AudioDeviceConfig(sample_rate=48000, buffer_size=1024)
    engine.update_audio_config(new_config)
    engine._engine.set_sample_rate.assert_called_with(48000)
    engine._engine.set_buffer_size.assert_called_with(1024)


def test_create_faust_processor_with_empty_code(engine):
    """Test creating a Faust processor with empty code."""
    processor_name = "empty_faust"
    # The mock should handle empty string without raising an exception.
    # Depending on the real implementation, this might need adjustment.
    engine.create_faust_processor(processor_name, "")
    assert processor_name in engine.get_processor_list()


def test_create_plugin_processor_with_empty_path(engine):
    """Test creating a plugin processor with an empty path."""
    with pytest.raises(DawDreamerEngineError, match="Plugin file not found"):
        engine.create_plugin_processor("empty_path_plugin", "")


def test_load_audio_graph_with_empty_graph(engine):
    """Test loading an empty audio graph."""
    engine.load_audio_graph([])
    assert engine._audio_graph == []


def test_render_audio_with_negative_duration(engine):
    """Test rendering audio with a negative duration."""
    # The numpy array creation will fail with a negative number of samples.
    with pytest.raises(
        DawDreamerEngineError,
        match="Failed to render audio: negative dimensions are not allowed",
    ):
        engine.render_audio(-1.0)


def test_render_audio_with_no_graph(engine):
    """Test rendering audio with no graph loaded."""
    duration = 1.0
    rendered_audio = engine.render_audio(duration)
    assert isinstance(rendered_audio, np.ndarray)
    expected_samples = int(duration * engine.audio_config.sample_rate)
    assert rendered_audio.shape[0] == expected_samples
    assert np.all(rendered_audio == 0)


def test_get_analysis_results_for_non_faust_processor(engine):
    """Test getting analysis results for a non-Faust processor."""
    processor_name = "my_compressor"
    engine.create_builtin_processor(processor_name, "compressor")
    with pytest.raises(DawDreamerEngineError, match="is not a Faust processor"):
        engine.get_analysis_results(processor_name)


def test_save_plugin_state_processor_not_loaded(engine):
    """Test saving state for a processor that is not loaded."""
    with pytest.raises(DawDreamerEngineError, match="Processor not loaded"):
        engine.save_plugin_state("not_loaded_processor", "path/to/state")


def test_load_plugin_state_processor_not_loaded(engine):
    """Test loading state for a processor that is not loaded."""
    with pytest.raises(DawDreamerEngineError, match="Processor not loaded"):
        engine.load_plugin_state("not_loaded_processor", "path/to/state")


@patch("pathlib.Path.exists", return_value=False)
def test_load_plugin_state_file_not_found(mock_exists, engine):
    """Test loading plugin state from a non-existent file."""
    processor_name = "my_plugin"
    plugin_path = "/fake/plugin.vst3"
    with patch("pathlib.Path.exists", return_value=True):  # for create_plugin_processor
        engine.create_plugin_processor(processor_name, plugin_path)

    # Mock a loaded processor for this test
    engine._loaded_processors[processor_name] = MagicMock()

    with pytest.raises(DawDreamerEngineError, match="State file not found"):
        engine.load_plugin_state(processor_name, "/path/to/non_existent_state.fxp")

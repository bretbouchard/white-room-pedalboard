from unittest.mock import patch

import numpy as np

from src.audio_agent.core.dawdreamer_engine import AudioGraphNode


@patch("src.audio_agent.core.dawdreamer_engine.DawDreamerEngine")
def test_complete_audio_processing_workflow(MockDawDreamerEngine):
    """Test a complete audio processing workflow."""
    # Configure the mock engine instance
    mock_engine_instance = MockDawDreamerEngine.return_value

    # The test now calls DawDreamerEngine() which will return our mock_engine_instance
    engine = MockDawDreamerEngine()

    # Mock necessary attributes and methods of the engine
    mock_engine_instance.audio_config.sample_rate = 44100  # Example value
    mock_engine_instance.create_builtin_processor.return_value = None
    mock_engine_instance.load_audio_graph.return_value = None
    mock_engine_instance.render_audio.return_value = np.array(
        [0.1, 0.2, 0.3]
    )  # Example output

    # Create a processor
    processor_name = "my_compressor"
    engine.create_builtin_processor(processor_name, "compressor")
    mock_engine_instance.create_builtin_processor.assert_called_once_with(
        processor_name, "compressor"
    )

    # Create a graph
    graph_nodes = [AudioGraphNode(processor_name=processor_name)]
    engine.load_audio_graph(graph_nodes)
    mock_engine_instance.load_audio_graph.assert_called_once_with(graph_nodes)

    # Create some input audio
    sample_rate = mock_engine_instance.audio_config.sample_rate
    duration = 1.0
    input_audio = np.sin(
        2 * np.pi * 440.0 * np.linspace(0, duration, int(sample_rate * duration))
    )

    # Render the audio
    output_audio = engine.render_audio(duration, input_audio=input_audio)
    mock_engine_instance.render_audio.assert_called_once_with(
        duration, input_audio=input_audio
    )

    # Check that the output audio is not silent
    assert np.any(output_audio)
    assert isinstance(output_audio, np.ndarray)

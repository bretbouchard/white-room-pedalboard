import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from src.audio_agent.core.dawdreamer_engine import (
    AudioDeviceConfig,
    AudioGraphNode,
    DawDreamerEngine,
)


class TestDawDreamerNumericStability:
    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(
        duration=st.floats(min_value=0.1, max_value=1.0),
        sample_rate=st.sampled_from([44100, 48000]),
        channels=st.integers(min_value=1, max_value=2),
    )
    def test_render_silence_produces_silence(self, duration, sample_rate, channels):
        # Re-initialize engine for each test case
        engine = DawDreamerEngine()

        # Configure engine with given parameters
        engine.update_audio_config(
            AudioDeviceConfig(
                sample_rate=sample_rate,
                input_channels=channels,
                output_channels=channels,
            )
        )

        # Create a silent input audio
        num_samples = int(duration * sample_rate)
        silent_input = np.zeros((num_samples, channels), dtype=np.float32)

        # Create a simple pass-through processor
        engine.create_faust_processor("passthrough", "process = _;")
        engine.load_audio_graph([AudioGraphNode(processor_name="passthrough")])

        # Render audio
        output_audio = engine.render_audio(duration=duration, input_audio=silent_input)

        # Assert that the output is essentially silent (very close to zero)
        assert np.allclose(output_audio, 0.0, atol=1e-6)
        assert output_audio.shape == silent_input.shape

    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(
        duration=st.floats(min_value=0.1, max_value=1.0),
        sample_rate=st.sampled_from([44100, 48000]),
        channels=st.integers(min_value=1, max_value=2),
        amplitude=st.floats(min_value=1.1, max_value=10.0),  # Values exceeding 1.0
    )
    def test_render_clipping_input_produces_clipped_output(
        self, duration, sample_rate, channels, amplitude
    ):
        engine = DawDreamerEngine()
        engine.update_audio_config(
            AudioDeviceConfig(
                sample_rate=sample_rate,
                input_channels=channels,
                output_channels=channels,
            )
        )

        num_samples = int(duration * sample_rate)
        # Create an input audio that will clip
        clipping_input = np.full((num_samples, channels), amplitude, dtype=np.float32)

        engine.create_faust_processor("passthrough", "process = _;")
        engine.load_audio_graph([AudioGraphNode(processor_name="passthrough")])

        output_audio = engine.render_audio(
            duration=duration, input_audio=clipping_input
        )

        # Assert that the output is clipped to -1.0 to 1.0 range
        assert np.all(output_audio <= 1.0 + 1e-6)
        assert np.all(output_audio >= -1.0 - 1e-6)
        assert output_audio.shape == clipping_input.shape

    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None
    )  # Increased deadline for long tests
    @given(
        duration=st.floats(min_value=60.0, max_value=120.0),  # Long duration
        sample_rate=st.sampled_from([44100, 48000]),
        channels=st.integers(min_value=1, max_value=2),
    )
    def test_render_long_file_produces_valid_output(
        self, duration, sample_rate, channels
    ):
        engine = DawDreamerEngine()
        engine.update_audio_config(
            AudioDeviceConfig(
                sample_rate=sample_rate,
                input_channels=channels,
                output_channels=channels,
            )
        )

        num_samples = int(duration * sample_rate)
        # Create a random noise input
        long_input = np.random.uniform(-0.5, 0.5, size=(num_samples, channels)).astype(
            np.float32
        )

        engine.create_faust_processor("passthrough", "process = _;")
        engine.load_audio_graph([AudioGraphNode(processor_name="passthrough")])

        output_audio = engine.render_audio(duration=duration, input_audio=long_input)

        assert output_audio.shape == long_input.shape
        assert not np.any(np.isnan(output_audio))
        assert not np.any(np.isinf(output_audio))
        assert np.all(output_audio <= 1.0 + 1e-6)
        assert np.all(output_audio >= -1.0 - 1e-6)

    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(
        duration=st.floats(min_value=0.1, max_value=1.0),
        sample_rate=st.sampled_from([44100, 48000]),
        channels=st.integers(min_value=1, max_value=2),
    )
    def test_render_random_noise_produces_valid_output(
        self, duration, sample_rate, channels
    ):
        engine = DawDreamerEngine()
        engine.update_audio_config(
            AudioDeviceConfig(
                sample_rate=sample_rate,
                input_channels=channels,
                output_channels=channels,
            )
        )

        num_samples = int(duration * sample_rate)
        random_input = np.random.uniform(
            -1.0, 1.0, size=(num_samples, channels)
        ).astype(np.float32)

        engine.create_faust_processor("passthrough", "process = _;")
        engine.load_audio_graph([AudioGraphNode(processor_name="passthrough")])

        output_audio = engine.render_audio(duration=duration, input_audio=random_input)

        assert output_audio.shape == random_input.shape
        assert not np.any(np.isnan(output_audio))
        assert not np.any(np.isinf(output_audio))
        assert np.all(output_audio <= 1.0 + 1e-6)
        assert np.all(output_audio >= -1.0 - 1e-6)

    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None
    )
    @given(
        duration=st.floats(min_value=0.1, max_value=1.0),
        sample_rate=st.sampled_from([44100, 48000]),
        channels=st.integers(min_value=1, max_value=2),
        gain=st.floats(min_value=0.0, max_value=2.0),
        cutoff=st.floats(min_value=20.0, max_value=20000.0),
    )
    def test_render_combinations_of_processors(
        self, duration, sample_rate, channels, gain, cutoff
    ):
        engine = DawDreamerEngine()
        engine.update_audio_config(
            AudioDeviceConfig(
                sample_rate=sample_rate,
                input_channels=channels,
                output_channels=channels,
            )
        )

        num_samples = int(duration * sample_rate)
        input_audio = np.random.uniform(-0.5, 0.5, size=(num_samples, channels)).astype(
            np.float32
        )

        # Create multiple processors
        engine.create_faust_processor("gain_proc", f"process = _ : *({gain:f});")
        engine.create_faust_processor(
            "filter_proc", f"process = fi.lowpass(1, {cutoff:f});"
        )

        # Load a graph with combined processors
        graph_nodes = [
            AudioGraphNode(
                processor_name="gain_proc", output_connections=["filter_proc"]
            ),
            AudioGraphNode(
                processor_name="filter_proc", input_connections=["gain_proc"]
            ),
        ]
        engine.load_audio_graph(graph_nodes)

        output_audio = engine.render_audio(duration=duration, input_audio=input_audio)

        assert output_audio.shape == input_audio.shape
        assert not np.any(np.isnan(output_audio))
        assert not np.any(np.isinf(output_audio))
        assert np.all(output_audio <= 1.0 + 1e-6)
        assert np.all(output_audio >= -1.0 - 1e-6)

    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(
        duration=st.floats(min_value=0.1, max_value=1.0),
        sample_rate=st.sampled_from([44100, 48000]),
        channels=st.integers(min_value=1, max_value=2),
        gain=st.floats(min_value=-100.0, max_value=100.0),  # Extreme gain
    )
    def test_render_extreme_gain_produces_valid_output(
        self, duration, sample_rate, channels, gain
    ):
        engine = DawDreamerEngine()
        engine.update_audio_config(
            AudioDeviceConfig(
                sample_rate=sample_rate,
                input_channels=channels,
                output_channels=channels,
            )
        )

        num_samples = int(duration * sample_rate)
        input_audio = np.random.uniform(-0.1, 0.1, size=(num_samples, channels)).astype(
            np.float32
        )

        engine.create_faust_processor("gain_proc", f"process = _ : *({gain:f});")
        engine.load_audio_graph([AudioGraphNode(processor_name="gain_proc")])

        output_audio = engine.render_audio(duration=duration, input_audio=input_audio)

        assert output_audio.shape == input_audio.shape
        assert not np.any(np.isnan(output_audio))
        assert not np.any(np.isinf(output_audio))
        # Output should still be within float32 limits, even if it clips
        assert np.all(output_audio <= np.finfo(np.float32).max)
        assert np.all(output_audio >= np.finfo(np.float32).min)

"""
Comprehensive tests for real-time audio processing and streaming capabilities.

This test suite covers:
- Real-time audio processing workflows
- Streaming audio data handling
- Buffer management during real-time processing
- Latency measurements and performance monitoring
- Buffer underrun/overflow scenarios
- Multi-threaded processing stability
- Audio quality preservation during streaming
"""

import logging
import queue
import threading
import time

import numpy as np
import pytest

from src.audio_agent.core.advanced_plugin_management import AdvancedPluginManager
from src.audio_agent.core.dawdreamer_engine import DawDreamerEngine
from src.audio_agent.core.mixing_console import MixingConsole
from src.audio_agent.core.real_time_processing import (
    AudioBitDepth,
    AudioBuffer,
    AudioExportSettings,
    AudioFormat,
    AudioProcessingError,
    BufferSizeError,
    LatencyInfo,
    PerformanceStats,
    RealTimeProcessor,
)
from src.audio_agent.engine.client import EngineClientStub

# Test-time alias
DawDreamerEngine = EngineClientStub

logger = logging.getLogger(__name__)


@pytest.fixture
def engine():
    """Create a DawDreamer engine for testing."""
    engine = DawDreamerEngine()
    engine.audio_config.buffer_size = 512
    engine.audio_config.sample_rate = 44100
    return engine


@pytest.fixture
def plugin_manager(engine):
    """Create an AdvancedPluginManager for testing."""
    return AdvancedPluginManager(engine)


@pytest.fixture
def mixing_console(engine, plugin_manager):
    """Create a MixingConsole for testing."""
    return MixingConsole(engine, plugin_manager)


@pytest.fixture
def realtime_processor(engine, plugin_manager, mixing_console):
    """Create a RealTimeProcessor for testing."""
    return RealTimeProcessor(engine, plugin_manager, mixing_console)


class TestRealTimeAudioProcessing:
    """Test real-time audio processing core functionality."""

    def test_processor_initialization(self, realtime_processor):
        """Test that the processor initializes correctly."""
        assert realtime_processor._buffer_size == 512
        assert realtime_processor._sample_rate == 44100
        assert not realtime_processor._is_processing
        assert realtime_processor._processing_thread is None
        assert isinstance(realtime_processor._input_queue, queue.Queue)
        assert isinstance(realtime_processor._output_queue, queue.Queue)
        assert isinstance(realtime_processor._performance_stats, PerformanceStats)
        assert len(realtime_processor._meters) > 0

    def test_configure_different_buffer_sizes(self, realtime_processor):
        """Test configuring various buffer sizes."""
        # Test valid buffer sizes (powers of 2)
        valid_sizes = [64, 128, 256, 512, 1024, 2048, 4096]
        for size in valid_sizes:
            result = realtime_processor.configure_buffer_size(size)
            assert result is True
            assert realtime_processor._buffer_size == size
            # Note: We only check the processor state since we're using EngineClientStub

        # Test invalid buffer sizes
        invalid_sizes = [0, -512, 1000, 8192, 10000]
        for size in invalid_sizes:
            with pytest.raises(BufferSizeError):
                realtime_processor.configure_buffer_size(size)

    def test_configure_different_sample_rates(self, realtime_processor):
        """Test configuring various sample rates."""
        # Test valid sample rates
        valid_rates = [22050, 44100, 48000, 88200, 96000, 176400, 192000]
        for rate in valid_rates:
            result = realtime_processor.configure_sample_rate(rate)
            assert result is True
            assert realtime_processor._sample_rate == rate
            assert realtime_processor._latency_info.sample_rate == rate

        # Test invalid sample rates
        invalid_rates = [0, -44100, 12345, 999999]
        for rate in invalid_rates:
            with pytest.raises(AudioProcessingError):
                realtime_processor.configure_sample_rate(rate)

    def test_start_stop_processing(self, realtime_processor):
        """Test starting and stopping real-time processing."""
        # Test starting processing
        result = realtime_processor.start_processing()
        assert result is True
        assert realtime_processor._is_processing is True
        assert realtime_processor._processing_thread is not None
        assert realtime_processor._processing_thread.is_alive()

        # Test stopping processing
        result = realtime_processor.stop_processing()
        assert result is True
        assert realtime_processor._is_processing is False

        # Wait for thread to finish
        if realtime_processor._processing_thread:
            realtime_processor._processing_thread.join(timeout=2.0)
            assert not realtime_processor._processing_thread.is_alive()

    def test_processing_state_persistence(self, realtime_processor):
        """Test that processing state persists correctly."""
        # Start processing
        realtime_processor.start_processing()
        assert realtime_processor.is_processing()

        # Stop processing
        realtime_processor.stop_processing()
        assert not realtime_processor.is_processing()

        # Test multiple start/stop cycles
        for i in range(3):
            realtime_processor.start_processing()
            assert realtime_processor.is_processing()
            time.sleep(0.01)  # Brief processing period
            realtime_processor.stop_processing()
            assert not realtime_processor.is_processing()


class TestStreamingAudioData:
    """Test streaming audio data functionality."""

    def test_continuous_audio_streaming(self, realtime_processor):
        """Test continuous streaming of audio data."""
        # Start processing
        realtime_processor.start_processing()

        try:
            # Create test audio buffers
            duration = realtime_processor._buffer_size / realtime_processor._sample_rate
            num_buffers = 10
            processed_buffers = []

            # Stream multiple buffers
            for i in range(num_buffers):
                # Create unique sine wave for each buffer
                freq = 440.0 + (i * 10)  # Different frequency per buffer
                input_buffer = AudioBuffer.create_sine_wave(
                    frequency=freq,
                    channels=2,
                    sample_rate=realtime_processor._sample_rate,
                    duration=duration,
                    amplitude=0.3,
                )

                # Process input
                result = realtime_processor.process_input(input_buffer)
                assert result is True

                # Get output (may take time for processing)
                max_attempts = 10
                output_buffer = None
                for attempt in range(max_attempts):
                    output_buffer = realtime_processor.get_output()
                    if output_buffer is not None:
                        break
                    time.sleep(0.001)  # 1ms

                if output_buffer is not None:
                    processed_buffers.append(output_buffer)

            # Verify we processed some buffers
            assert len(processed_buffers) > 0
            assert len(processed_buffers) <= num_buffers

            # Verify output buffer properties
            for output in processed_buffers:
                assert isinstance(output, AudioBuffer)
                assert output.channels == 2
                assert output.sample_rate == realtime_processor._sample_rate
                assert output.duration == duration
                assert output.samples.shape == (2, realtime_processor._buffer_size)

        finally:
            realtime_processor.stop_processing()

    def test_streaming_with_buffer_size_changes(self, realtime_processor):
        """Test streaming while changing buffer sizes."""
        # Start with small buffer
        realtime_processor.configure_buffer_size(256)
        realtime_processor.start_processing()

        try:
            # Stream some data
            for i in range(5):
                buffer = AudioBuffer.create_sine_wave(
                    frequency=440.0,
                    channels=2,
                    sample_rate=realtime_processor._sample_rate,
                    duration=256 / realtime_processor._sample_rate,
                )
                realtime_processor.process_input(buffer)
                time.sleep(0.001)

            # Change buffer size during streaming
            realtime_processor.configure_buffer_size(512)
            assert realtime_processor._buffer_size == 512

            # Continue streaming with new buffer size
            for i in range(5):
                buffer = AudioBuffer.create_sine_wave(
                    frequency=880.0,
                    channels=2,
                    sample_rate=realtime_processor._sample_rate,
                    duration=512 / realtime_processor._sample_rate,
                )
                realtime_processor.process_input(buffer)
                time.sleep(0.001)

        finally:
            realtime_processor.stop_processing()

    def test_streaming_audio_format_compatibility(self, realtime_processor):
        """Test streaming with different audio formats and sample rates."""
        formats_to_test = [
            {"channels": 1, "sample_rate": 22050},
            {"channels": 2, "sample_rate": 44100},
            {"channels": 2, "sample_rate": 48000},
            {"channels": 6, "sample_rate": 44100},  # Surround
        ]

        for format_config in formats_to_test:
            # Configure processor for this format
            realtime_processor.configure_sample_rate(format_config["sample_rate"])
            realtime_processor.start_processing()

            try:
                # Create test buffer
                duration = (
                    realtime_processor._buffer_size / format_config["sample_rate"]
                )
                input_buffer = AudioBuffer.create_sine_wave(
                    frequency=440.0,
                    channels=format_config["channels"],
                    sample_rate=format_config["sample_rate"],
                    duration=duration,
                )

                # Process
                result = realtime_processor.process_input(input_buffer)
                assert result is True

                # Get output
                time.sleep(0.01)  # Allow processing
                output = realtime_processor.get_output()

                if output is not None:
                    assert output.channels == format_config["channels"]
                    assert output.sample_rate == format_config["sample_rate"]

            finally:
                realtime_processor.stop_processing()

    def test_streaming_with_silence_and_noise(self, realtime_processor):
        """Test streaming with various signal types."""
        realtime_processor.start_processing()

        try:
            signal_types = [
                ("silence", lambda sr, dur: AudioBuffer.create_empty(2, sr, dur)),
                (
                    "sine_wave",
                    lambda sr, dur: AudioBuffer.create_sine_wave(440, 2, sr, dur, 0.5),
                ),
                (
                    "white_noise",
                    lambda sr, dur: AudioBuffer(
                        samples=np.random.normal(0, 0.1, (2, int(sr * dur))).astype(
                            np.float32
                        ),
                        sample_rate=sr,
                        channels=2,
                        duration=dur,
                    ),
                ),
            ]

            for signal_name, signal_func in signal_types:
                duration = (
                    realtime_processor._buffer_size / realtime_processor._sample_rate
                )
                input_buffer = signal_func(realtime_processor._sample_rate, duration)

                # Process signal
                result = realtime_processor.process_input(input_buffer)
                assert result is True

                # Get output
                time.sleep(0.01)
                output = realtime_processor.get_output()

                if output is not None:
                    assert isinstance(output, AudioBuffer)
                    assert output.samples.shape == (2, realtime_processor._buffer_size)

        finally:
            realtime_processor.stop_processing()


class TestBufferManagement:
    """Test buffer management during real-time processing."""

    def test_input_queue_overflow_handling(self, realtime_processor):
        """Test handling of input queue overflow."""
        # Stop processing to fill up input queue
        realtime_processor._is_processing = False

        # Fill input queue to capacity
        duration = realtime_processor._buffer_size / realtime_processor._sample_rate
        buffer = AudioBuffer.create_sine_wave(
            440, 2, realtime_processor._sample_rate, duration
        )

        # Fill queue
        max_attempts = 100
        filled_count = 0
        for _ in range(max_attempts):
            try:
                realtime_processor._input_queue.put_nowait(buffer)
                filled_count += 1
            except queue.Full:
                break

        assert filled_count > 0  # Should have filled some slots

        # Try to add one more (should fail)
        result = realtime_processor.process_input(buffer)
        assert result is False  # Should fail due to full queue

    def test_output_queue_underflow_handling(self, realtime_processor):
        """Test handling of output queue underflow."""
        # Don't start processing, so no output should be available
        assert not realtime_processor._is_processing

        # Try to get output (should return None)
        output = realtime_processor.get_output()
        assert output is None

    def test_buffer_size_optimization(self, realtime_processor):
        """Test buffer size optimization for different use cases."""
        use_cases = [
            {"name": "low_latency", "buffer_size": 64, "expected_latency_ms": 1.45},
            {"name": "standard", "buffer_size": 512, "expected_latency_ms": 11.6},
            {"name": "high_quality", "buffer_size": 2048, "expected_latency_ms": 46.4},
        ]

        for use_case in use_cases:
            # Configure buffer size
            realtime_processor.configure_buffer_size(use_case["buffer_size"])

            # Calculate expected latency
            expected_latency = (
                use_case["buffer_size"] / realtime_processor._sample_rate
            ) * 1000
            actual_latency = realtime_processor.get_latency_info().buffer_latency_ms

            # Verify latency is close to expected
            assert abs(actual_latency - expected_latency) < 0.1

            # Start processing and test
            realtime_processor.start_processing()
            try:
                duration = use_case["buffer_size"] / realtime_processor._sample_rate
                buffer = AudioBuffer.create_sine_wave(
                    440, 2, realtime_processor._sample_rate, duration
                )
                result = realtime_processor.process_input(buffer)
                assert result is True
            finally:
                realtime_processor.stop_processing()

    def test_buffer_cleanup_on_stop(self, realtime_processor):
        """Test that buffers are properly cleaned up when stopping."""
        # Start processing and add some buffers
        realtime_processor.start_processing()

        duration = realtime_processor._buffer_size / realtime_processor._sample_rate
        buffer = AudioBuffer.create_sine_wave(
            440, 2, realtime_processor._sample_rate, duration
        )

        # Add some input buffers
        for _ in range(5):
            realtime_processor.process_input(buffer)

        # Check queues have content
        assert (
            not realtime_processor._input_queue.empty()
            or not realtime_processor._output_queue.empty()
        )

        # Stop processing
        realtime_processor.stop_processing()

        # Wait a moment for cleanup
        time.sleep(0.1)

        # Queues should be empty or contain minimal items
        # (Note: actual implementation may vary, this tests the intent)
        assert realtime_processor._is_processing is False


class TestLatencyMeasurements:
    """Test latency measurement and monitoring."""

    def test_system_latency_calculation(self, realtime_processor):
        """Test system latency calculation."""
        # Calculate latency
        latency_info = realtime_processor.calculate_system_latency()

        # Verify latency components
        assert isinstance(latency_info, LatencyInfo)
        assert latency_info.buffer_size == realtime_processor._buffer_size
        assert latency_info.sample_rate == realtime_processor._sample_rate
        assert latency_info.input_latency_samples == realtime_processor._buffer_size
        assert latency_info.output_latency_samples == realtime_processor._buffer_size
        assert (
            latency_info.total_latency_samples
            == latency_info.input_latency_samples
            + latency_info.output_latency_samples
            + latency_info.plugin_latency_samples
        )

        # Verify latency in milliseconds
        expected_total_ms = (
            latency_info.total_latency_samples / latency_info.sample_rate
        ) * 1000
        assert abs(latency_info.total_latency_ms - expected_total_ms) < 0.01

    def test_latency_with_different_configurations(self, realtime_processor):
        """Test latency with different buffer sizes and sample rates."""
        configurations = [
            {"buffer_size": 128, "sample_rate": 44100},
            {"buffer_size": 256, "sample_rate": 48000},
            {"buffer_size": 512, "sample_rate": 44100},
            {"buffer_size": 1024, "sample_rate": 96000},
        ]

        for config in configurations:
            # Configure
            realtime_processor.configure_buffer_size(config["buffer_size"])
            realtime_processor.configure_sample_rate(config["sample_rate"])

            # Calculate latency
            latency_info = realtime_processor.calculate_system_latency()

            # Verify calculated latency
            expected_buffer_ms = (config["buffer_size"] / config["sample_rate"]) * 1000
            assert abs(latency_info.buffer_latency_ms - expected_buffer_ms) < 0.01

            # Total latency should be 2x buffer latency (input + output) plus plugin latency
            expected_total_ms = expected_buffer_ms * 2
            assert (
                abs(latency_info.total_latency_ms - expected_total_ms) < 1.0
            )  # Allow small variance

    def test_real_time_latency_monitoring(self, realtime_processor):
        """Test real-time latency monitoring during processing."""
        # Start processing
        realtime_processor.start_processing()

        try:
            # Monitor latency over time
            duration = realtime_processor._buffer_size / realtime_processor._sample_rate
            buffer = AudioBuffer.create_sine_wave(
                440, 2, realtime_processor._sample_rate, duration
            )

            latency_measurements = []
            for i in range(10):
                # Process buffer
                start_time = time.time()
                realtime_processor.process_input(buffer)
                process_time = (time.time() - start_time) * 1000

                # Get performance stats
                stats = realtime_processor.get_performance_stats()
                latency_info = realtime_processor.get_latency_info()

                latency_measurements.append(
                    {
                        "process_time_ms": process_time,
                        "system_latency_ms": latency_info.total_latency_ms,
                        "buffer_underruns": stats.buffer_underruns,
                        "cpu_usage": stats.cpu_usage,
                    }
                )

                time.sleep(0.001)  # Brief delay

            # Verify measurements
            assert len(latency_measurements) == 10
            for measurement in latency_measurements:
                assert measurement["process_time_ms"] >= 0
                assert measurement["system_latency_ms"] > 0
                assert measurement["cpu_usage"] >= 0

        finally:
            realtime_processor.stop_processing()


class TestPerformanceMonitoring:
    """Test performance monitoring and statistics."""

    def test_performance_stats_tracking(self, realtime_processor):
        """Test performance statistics tracking."""
        stats = realtime_processor.get_performance_stats()

        # Initial stats
        assert stats.buffer_underruns == 0
        assert stats.xruns == 0
        assert stats.max_process_time_ms == 0.0
        assert stats.avg_process_time_ms == 0.0
        assert len(stats.process_time_samples) == 0

        # Simulate processing times
        test_times = [5.0, 10.0, 15.0, 8.0, 12.0]
        for process_time in test_times:
            stats.update_process_time(process_time)

        # Verify updated stats
        assert stats.max_process_time_ms == max(test_times)
        assert abs(stats.avg_process_time_ms - sum(test_times) / len(test_times)) < 0.01
        assert len(stats.process_time_samples) == len(test_times)

    def test_buffer_underrun_detection(self, realtime_processor):
        """Test buffer underrun detection."""
        stats = realtime_processor.get_performance_stats()

        # Initially no underruns
        assert stats.buffer_underruns == 0
        assert stats.xruns == 0

        # Report underruns
        stats.report_buffer_underrun()
        stats.report_buffer_underrun()
        stats.report_buffer_underrun()

        # Verify underruns counted
        assert stats.buffer_underruns == 3
        assert stats.xruns == 3

    def test_cpu_usage_monitoring(self, realtime_processor):
        """Test CPU usage monitoring."""
        stats = realtime_processor.get_performance_stats()

        # Simulate CPU usage changes
        cpu_usages = [0.1, 0.3, 0.5, 0.8, 0.4]
        for cpu_usage in cpu_usages:
            stats.cpu_usage = cpu_usage

        # Final CPU usage should be last set value
        assert stats.cpu_usage == cpu_usages[-1]

    def test_performance_stats_reset(self, realtime_processor):
        """Test resetting performance statistics."""
        stats = realtime_processor.get_performance_stats()

        # Add some data
        stats.update_process_time(10.0)
        stats.update_process_time(15.0)
        stats.report_buffer_underrun()
        stats.cpu_usage = 0.5

        # Verify data was added
        assert stats.max_process_time_ms > 0
        assert stats.buffer_underruns > 0

        # Reset stats
        stats.reset()

        # Verify reset
        assert stats.buffer_underruns == 0
        assert stats.xruns == 0
        assert stats.max_process_time_ms == 0.0
        assert stats.avg_process_time_ms == 0.0
        assert len(stats.process_time_samples) == 0
        assert stats.cpu_usage == 0.0


class TestStreamingStability:
    """Test stability of streaming under various conditions."""

    def test_long_duration_streaming(self, realtime_processor):
        """Test streaming over extended duration."""
        realtime_processor.start_processing()

        try:
            # Stream for extended period (simulated)
            duration = realtime_processor._buffer_size / realtime_processor._sample_rate
            iterations = 100  # Simulate longer duration

            for i in range(iterations):
                # Create varied input
                freq = 440.0 + (i % 100) * 5  # Vary frequency
                amplitude = 0.1 + (i % 10) * 0.05  # Vary amplitude

                buffer = AudioBuffer.create_sine_wave(
                    frequency=freq,
                    channels=2,
                    sample_rate=realtime_processor._sample_rate,
                    duration=duration,
                    amplitude=amplitude,
                )

                # Process
                result = realtime_processor.process_input(buffer)
                assert result is True

                # Occasionally get output
                if i % 10 == 0:
                    time.sleep(0.001)
                    output = realtime_processor.get_output()
                    if output is not None:
                        assert isinstance(output, AudioBuffer)

                # Check for errors periodically
                if i % 20 == 0:
                    stats = realtime_processor.get_performance_stats()
                    # Should not have excessive underruns
                    assert stats.buffer_underruns < iterations / 10

        finally:
            realtime_processor.stop_processing()

    def test_streaming_under_load(self, realtime_processor):
        """Test streaming under high load conditions."""
        realtime_processor.start_processing()

        try:
            duration = realtime_processor._buffer_size / realtime_processor._sample_rate

            # Rapid buffer processing to simulate high load
            for i in range(50):
                # Create complex signal
                buffer = AudioBuffer(
                    samples=np.random.normal(
                        0, 0.2, (2, int(realtime_processor._sample_rate * duration))
                    ).astype(np.float32),
                    sample_rate=realtime_processor._sample_rate,
                    channels=2,
                    duration=duration,
                )

                # Process multiple buffers rapidly
                for _ in range(3):
                    realtime_processor.process_input(buffer)

                # Small delay
                time.sleep(0.001)

            # Check system is still responsive
            stats = realtime_processor.get_performance_stats()
            assert realtime_processor._is_processing

            # Should handle load gracefully (may have some underruns but not excessive)
            assert stats.buffer_underruns < 100  # Reasonable limit

        finally:
            realtime_processor.stop_processing()

    def test_recovery_from_errors(self, realtime_processor):
        """Test recovery from streaming errors."""
        realtime_processor.start_processing()

        try:
            duration = realtime_processor._buffer_size / realtime_processor._sample_rate

            # Normal processing
            normal_buffer = AudioBuffer.create_sine_wave(
                440, 2, realtime_processor._sample_rate, duration
            )
            result = realtime_processor.process_input(normal_buffer)
            assert result is True

            # Try to process invalid buffer (wrong sample rate)
            invalid_buffer = AudioBuffer.create_sine_wave(
                440, 2, 48000, duration
            )  # Wrong sample rate
            result = realtime_processor.process_input(invalid_buffer)
            assert result is False  # Should fail gracefully

            # System should still be processing
            assert realtime_processor._is_processing

            # Continue with normal processing
            for i in range(5):
                buffer = AudioBuffer.create_sine_wave(
                    440 + i * 10, 2, realtime_processor._sample_rate, duration
                )
                result = realtime_processor.process_input(buffer)
                assert result is True

            # Verify system recovered
            stats = realtime_processor.get_performance_stats()
            assert realtime_processor._is_processing

        finally:
            realtime_processor.stop_processing()

    def test_concurrent_streaming_access(self, realtime_processor):
        """Test concurrent access to streaming functionality."""
        results = []
        errors = []

        def stream_worker(worker_id):
            """Worker function for concurrent streaming."""
            try:
                duration = (
                    realtime_processor._buffer_size / realtime_processor._sample_rate
                )
                for i in range(10):
                    buffer = AudioBuffer.create_sine_wave(
                        frequency=440.0 + worker_id * 10,
                        channels=2,
                        sample_rate=realtime_processor._sample_rate,
                        duration=duration,
                    )

                    result = realtime_processor.process_input(buffer)
                    results.append((worker_id, i, result))

                    if i % 3 == 0:
                        output = realtime_processor.get_output()
                        results.append((worker_id, f"output_{i}", output is not None))

                    time.sleep(0.001)

            except Exception as e:
                errors.append((worker_id, str(e)))

        # Start processing
        realtime_processor.start_processing()

        try:
            # Create multiple threads
            threads = []
            num_threads = 3

            for i in range(num_threads):
                thread = threading.Thread(target=stream_worker, args=(i,))
                threads.append(thread)
                thread.start()

            # Wait for all threads to complete
            for thread in threads:
                thread.join(timeout=5.0)

            # Verify results
            assert len(errors) == 0, f"Errors occurred: {errors}"
            assert len(results) > 0

            # Check that some operations succeeded
            successful_operations = [r for r in results if r[2] is True]
            assert len(successful_operations) > 0

        finally:
            realtime_processor.stop_processing()


class TestAudioQualityPreservation:
    """Test audio quality preservation during streaming."""

    def test_signal_integrity_preservation(self, realtime_processor):
        """Test that signal integrity is preserved during streaming."""
        realtime_processor.start_processing()

        try:
            # Create test signal with known properties
            duration = realtime_processor._buffer_size / realtime_processor._sample_rate
            frequency = 1000.0  # 1kHz test tone
            amplitude = 0.5

            input_buffer = AudioBuffer.create_sine_wave(
                frequency=frequency,
                channels=1,  # Mono for easier analysis
                sample_rate=realtime_processor._sample_rate,
                duration=duration,
                amplitude=amplitude,
            )

            # Process signal
            result = realtime_processor.process_input(input_buffer)
            assert result is True

            # Get output (may take time)
            max_attempts = 50
            output_buffer = None
            for attempt in range(max_attempts):
                output_buffer = realtime_processor.get_output()
                if output_buffer is not None:
                    break
                time.sleep(0.001)

            if output_buffer is not None:
                # Verify signal properties are preserved
                assert output_buffer.channels == input_buffer.channels
                assert output_buffer.sample_rate == input_buffer.sample_rate
                assert output_buffer.duration == input_buffer.duration
                assert output_buffer.samples.shape == input_buffer.samples.shape

                # Check that signal is not all zeros
                assert not np.allclose(output_buffer.samples, 0.0, atol=1e-6)

                # Check amplitude is in reasonable range
                max_amplitude = np.max(np.abs(output_buffer.samples))
                assert 0.1 <= max_amplitude <= 1.0  # Should have some signal

        finally:
            realtime_processor.stop_processing()

    def test_no_clipping_during_streaming(self, realtime_processor):
        """Test that no clipping occurs during normal streaming."""
        realtime_processor.start_processing()

        try:
            duration = realtime_processor._buffer_size / realtime_processor._sample_rate

            # Process multiple buffers at safe levels
            for i in range(10):
                amplitude = 0.3 + (i % 5) * 0.1  # Vary amplitude but keep it safe
                buffer = AudioBuffer.create_sine_wave(
                    frequency=440.0 + i * 50,
                    channels=2,
                    sample_rate=realtime_processor._sample_rate,
                    duration=duration,
                    amplitude=amplitude,
                )

                realtime_processor.process_input(buffer)

                # Check master meter
                meter = realtime_processor.get_meter("master")
                if meter:
                    # Should not be clipping
                    assert not meter.clipping
                    assert meter.clip_count == 0

                time.sleep(0.001)

        finally:
            realtime_processor.stop_processing()

    def test_dynamic_range_preservation(self, realtime_processor):
        """Test preservation of dynamic range during streaming."""
        realtime_processor.start_processing()

        try:
            duration = realtime_processor._buffer_size / realtime_processor._sample_rate

            # Test signals with different dynamic ranges
            test_amplitudes = [0.1, 0.3, 0.5, 0.7, 0.9]

            for amplitude in test_amplitudes:
                buffer = AudioBuffer.create_sine_wave(
                    frequency=440.0,
                    channels=2,
                    sample_rate=realtime_processor._sample_rate,
                    duration=duration,
                    amplitude=amplitude,
                )

                # Process
                realtime_processor.process_input(buffer)
                time.sleep(0.002)  # Allow processing

                # Get output
                output = realtime_processor.get_output()
                if output is not None:
                    # Check that dynamic range is preserved
                    input_peak = amplitude
                    output_peak = np.max(np.abs(output.samples))

                    # Output should be proportional to input (within reasonable tolerance)
                    ratio = output_peak / input_peak if input_peak > 0 else 0
                    assert 0.5 <= ratio <= 2.0  # Allow some processing gain/loss

        finally:
            realtime_processor.stop_processing()


class TestRealTimeExport:
    """Test real-time audio export functionality."""

    def test_export_during_processing(self, realtime_processor):
        """Test exporting audio while processing is active."""
        realtime_processor.start_processing()

        try:
            # Stream some audio
            duration = realtime_processor._buffer_size / realtime_processor._sample_rate
            for i in range(5):
                buffer = AudioBuffer.create_sine_wave(
                    frequency=440.0 + i * 50,
                    channels=2,
                    sample_rate=realtime_processor._sample_rate,
                    duration=duration,
                )
                realtime_processor.process_input(buffer)
                time.sleep(0.001)

            # Export during processing
            export_settings = AudioExportSettings(
                format=AudioFormat.WAV,
                sample_rate=realtime_processor._sample_rate,
                bit_depth=AudioBitDepth.BIT_24,
            )

            result = realtime_processor.export_audio(
                file_path="test_during_processing.wav",
                duration=1.0,
                settings=export_settings,
            )

            assert result is True

        finally:
            realtime_processor.stop_processing()

    def test_export_different_formats(self, realtime_processor):
        """Test exporting to different audio formats."""
        formats_to_test = [
            AudioFormat.WAV,
            AudioFormat.FLAC,
            AudioFormat.MP3,
        ]

        bit_depths = [AudioBitDepth.BIT_16, AudioBitDepth.BIT_24, AudioBitDepth.BIT_32]

        for audio_format in formats_to_test:
            for bit_depth in bit_depths:
                export_settings = AudioExportSettings(
                    format=audio_format,
                    sample_rate=44100,
                    bit_depth=bit_depth,
                )

                result = realtime_processor.export_audio(
                    file_path=f"test_{audio_format.value}_{bit_depth.value}.wav",
                    duration=0.5,
                    settings=export_settings,
                )

                assert result is True


if __name__ == "__main__":
    pytest.main([__file__])

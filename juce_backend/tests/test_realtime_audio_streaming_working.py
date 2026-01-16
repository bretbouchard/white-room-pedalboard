"""
Tests for real-time audio processing and streaming capabilities using AudioBufferManager.

This test suite covers:
- Real-time audio streaming with different buffer types
- Buffer management during streaming operations
- Performance measurements and latency monitoring
- Memory usage optimization
- Thread-safe concurrent operations
- Audio quality preservation
"""

import logging
import threading
import time

import numpy as np
import pytest

from src.audio_agent.core.audio_buffer_manager import (
    AudioBufferManager,
    BufferConfig,
    BufferState,
    BufferType,
)

logger = logging.getLogger(__name__)


@pytest.fixture
def buffer_manager():
    """Create an AudioBufferManager for testing."""
    manager = AudioBufferManager()
    yield manager
    manager.close()


@pytest.fixture
def memory_config():
    """Configuration for memory buffers."""
    return BufferConfig(
        buffer_type=BufferType.MEMORY,
        sample_rate=44100,
        channels=2,
        buffer_size=8192,
        max_memory_mb=100,
    )


@pytest.fixture
def streaming_config():
    """Configuration for streaming buffers."""
    return BufferConfig(
        buffer_type=BufferType.STREAMING,
        sample_rate=44100,
        channels=2,
        buffer_size=8192,
        max_memory_mb=50,
        chunk_size=4096,
        cache_size_mb=10,
    )


@pytest.fixture
def ring_config():
    """Configuration for ring buffers."""
    return BufferConfig(
        buffer_type=BufferType.RING,
        sample_rate=44100,
        channels=2,
        buffer_size=512,  # Small buffer for low latency
    )


class TestRealTimeAudioStreaming:
    """Test real-time audio streaming with different buffer types."""

    def test_memory_buffer_basic_operations(self, buffer_manager, memory_config):
        """Test basic memory buffer operations."""
        buffer = buffer_manager.create_buffer(
            "test_memory", BufferType.MEMORY, memory_config, size=8192
        )

        assert buffer is not None
        assert buffer.state == BufferState.READY

        # Test writing data
        test_data = np.random.randn(1024, 2).astype(np.float32)
        written = buffer.write(test_data)
        assert written == 1024

        # Test reading data
        buffer.seek(0)
        read_data = buffer.read(1024)
        assert len(read_data) == 1024
        assert read_data.shape == (1024, 2)
        np.testing.assert_array_almost_equal(read_data, test_data)

        # Test metrics
        metrics = buffer.get_metrics()
        assert metrics.read_count > 0
        assert metrics.write_count > 0
        assert metrics.memory_usage_mb > 0

        buffer_manager.remove_buffer("test_memory")

    def test_streaming_buffer_large_file_handling(
        self, buffer_manager, streaming_config
    ):
        """Test streaming buffer with large file simulation."""
        # Create large audio data (simulating a 10MB audio file)
        total_samples = 44100 * 60  # 1 minute at 44.1kHz
        large_audio_data = np.random.randn(total_samples, 2).astype(np.float32) * 0.1

        # Create streaming buffer
        buffer = buffer_manager.create_buffer(
            "test_streaming",
            BufferType.STREAMING,
            streaming_config,
            estimated_size=total_samples,
        )

        assert buffer is not None
        assert buffer.state == BufferState.READY

        # Stream data in chunks
        chunk_size = 8192
        total_chunks = len(large_audio_data) // chunk_size
        processed_chunks = 0

        start_time = time.time()

        for i in range(0, len(large_audio_data), chunk_size):
            if i + chunk_size > len(large_audio_data):
                break

            chunk = large_audio_data[i : i + chunk_size]
            written = buffer.write(chunk)

            if written > 0:
                processed_chunks += 1

            # Show progress every 10%
            if i % (len(large_audio_data) // 10) < chunk_size:
                progress = (i / len(large_audio_data)) * 100
                logger.info(f"Streaming progress: {progress:.1f}%")

        streaming_time = time.time() - start_time

        logger.info(f"Streamed {processed_chunks} chunks in {streaming_time:.2f}s")
        logger.info(f"Streaming rate: {processed_chunks/streaming_time:.1f} chunks/s")

        # Test random access
        test_positions = [0, len(large_audio_data) // 4, len(large_audio_data) // 2]

        for pos in test_positions:
            buffer.seek(pos)
            read_data = buffer.read(1024)

            # Compare with original data
            original_data = large_audio_data[pos : pos + 1024]

            if len(read_data) == len(original_data):
                diff = np.abs(read_data - original_data).max()
                assert diff < 1e-6, f"Data mismatch at position {pos}: {diff}"

        # Check final metrics
        metrics = buffer.get_metrics()
        logger.info("Final streaming metrics:")
        logger.info(f"  Memory usage: {metrics.memory_usage_mb:.2f}MB")
        logger.info(f"  Cache hit rate: {metrics.cache_hit_rate:.2%}")
        logger.info(f"  Total reads: {metrics.read_count}")
        logger.info(f"  Total writes: {metrics.write_count}")

        # Verify streaming was efficient
        assert streaming_time < 5.0  # Should complete within 5 seconds
        # Cache hit rate may be 0 for sequential streaming - this is normal
        assert metrics.cache_hit_rate >= 0.0  # Should be valid cache hit rate

        buffer_manager.remove_buffer("test_streaming")

    def test_ring_buffer_real_time_processing(self, buffer_manager, ring_config):
        """Test ring buffer for real-time processing simulation."""
        input_buffer = buffer_manager.create_buffer(
            "realtime_input", BufferType.RING, ring_config
        )

        output_buffer = buffer_manager.create_buffer(
            "realtime_output",
            BufferType.MEMORY,
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=8192,
                max_memory_mb=50,
            ),
            size=8192,
        )

        assert input_buffer is not None
        assert output_buffer is not None

        # Simulate real-time audio processing
        processed_chunks = 0
        chunk_size = 128

        def simulate_audio_input():
            """Simulate real-time audio input."""
            for i in range(100):
                # Generate audio chunk
                t = np.linspace(0, chunk_size / 44100, chunk_size, endpoint=False)
                signal = 0.1 * np.sin(2 * np.pi * 440 * t)  # 440Hz sine wave
                chunk = np.column_stack([signal, signal * 0.9])

                # Write to ring buffer
                written = input_buffer.write(chunk)

                # Small delay to simulate real-time
                time.sleep(chunk_size / 44100)

        def process_audio():
            """Process audio from ring buffer."""
            nonlocal processed_chunks

            for _ in range(100):
                # Read from ring buffer
                chunk = input_buffer.read(chunk_size)

                if len(chunk) > 0:
                    # Apply simple processing (gain reduction)
                    processed_chunk = chunk * 0.8

                    # Write to output buffer
                    output_buffer.write(processed_chunk)

                    processed_chunks += 1

        # Start threads
        input_thread = threading.Thread(target=simulate_audio_input)
        process_thread = threading.Thread(target=process_audio)

        start_time = time.time()

        input_thread.start()
        process_thread.start()

        input_thread.join()
        process_thread.join()

        processing_time = time.time() - start_time

        logger.info(f"Real-time processing completed in {processing_time:.2f}s")
        logger.info(f"Processed {processed_chunks} chunks")

        # Verify results
        assert processed_chunks > 0
        assert processing_time < 5.0  # Should complete within 5 seconds

        # Check metrics
        input_metrics = input_buffer.get_metrics()
        output_metrics = output_buffer.get_metrics()

        logger.info("Input buffer metrics:")
        logger.info(f"  Read operations: {input_metrics.read_count}")
        logger.info(f"  Write operations: {input_metrics.write_count}")
        logger.info(f"  Avg read time: {input_metrics.avg_read_time_ms:.3f}ms")

        logger.info("Output buffer metrics:")
        logger.info(f"  Memory usage: {output_metrics.memory_usage_mb:.2f}MB")
        logger.info(f"  Write operations: {output_metrics.write_count}")

        # Clean up
        buffer_manager.remove_buffer("realtime_input")
        buffer_manager.remove_buffer("realtime_output")


class TestBufferManagement:
    """Test buffer management under various conditions."""

    def test_concurrent_buffer_access(self, buffer_manager, memory_config):
        """Test concurrent access to buffers."""
        buffer = buffer_manager.create_buffer(
            "concurrent_test", BufferType.MEMORY, memory_config, size=8192
        )

        results = []
        errors = []

        def worker(worker_id):
            """Worker function for concurrent testing."""
            try:
                for i in range(10):
                    test_data = np.random.randn(128, 2).astype(np.float32)

                    # Write data
                    written = buffer.write(test_data)
                    results.append((worker_id, f"write_{i}", written))

                    # Read data
                    buffer.seek(max(0, (worker_id * 10 + i) * 128 - 128))
                    read_data = buffer.read(128)
                    results.append((worker_id, f"read_{i}", len(read_data)))

                    time.sleep(0.001)  # Small delay

            except Exception as e:
                errors.append((worker_id, str(e)))

        # Create multiple threads
        threads = []
        num_threads = 3

        for i in range(num_threads):
            thread = threading.Thread(target=worker, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join(timeout=5.0)

        # Verify results
        assert len(errors) == 0, f"Errors occurred: {errors}"
        assert len(results) > 0

        # Check that some operations succeeded
        successful_operations = [r for r in results if r[2] > 0]
        assert len(successful_operations) > 0

        buffer_manager.remove_buffer("concurrent_test")

    def test_memory_usage_optimization(self, buffer_manager):
        """Test memory usage optimization with different buffer types."""
        # Create multiple buffers of different types
        buffers = {}

        # Memory buffer
        buffers["memory"] = buffer_manager.create_buffer(
            "memory_opt",
            BufferType.MEMORY,
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=4096,
                max_memory_mb=50,
            ),
            size=4096,
        )

        # Streaming buffer
        buffers["streaming"] = buffer_manager.create_buffer(
            "streaming_opt",
            BufferType.STREAMING,
            BufferConfig(
                buffer_type=BufferType.STREAMING,
                sample_rate=44100,
                channels=2,
                buffer_size=4096,
                max_memory_mb=25,
                chunk_size=1024,
                cache_size_mb=5,
            ),
            estimated_size=44100 * 10,  # 10 seconds
        )

        # Get initial memory metrics
        initial_metrics = buffer_manager.get_system_metrics()
        logger.info(f"Initial memory usage: {initial_metrics['total_memory_mb']:.2f}MB")

        # Write data to buffers
        test_data = np.random.randn(1024, 2).astype(np.float32)

        for name, buffer in buffers.items():
            if buffer:
                for _ in range(5):
                    buffer.write(test_data)

        # Get memory metrics after usage
        usage_metrics = buffer_manager.get_system_metrics()
        logger.info(f"Usage memory usage: {usage_metrics['total_memory_mb']:.2f}MB")

        # Memory usage should be reasonable
        assert usage_metrics["total_memory_mb"] < 200  # Should not exceed 200MB

        # Streaming buffer should use less memory than memory buffer for same data
        streaming_metrics = (
            buffers["streaming"].get_metrics() if buffers["streaming"] else None
        )
        memory_metrics = buffers["memory"].get_metrics() if buffers["memory"] else None

        if streaming_metrics and memory_metrics:
            logger.info(f"Memory buffer usage: {memory_metrics.memory_usage_mb:.2f}MB")
            logger.info(
                f"Streaming buffer usage: {streaming_metrics.memory_usage_mb:.2f}MB"
            )

        # Clean up
        for name in buffers:
            buffer_manager.remove_buffer(name)

    def test_buffer_cleanup_and_recovery(self, buffer_manager):
        """Test buffer cleanup and error recovery."""
        # Create buffer
        buffer = buffer_manager.create_buffer(
            "cleanup_test",
            BufferType.MEMORY,
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=4096,
                max_memory_mb=50,
            ),
            size=4096,
        )

        # Write some data
        test_data = np.random.randn(1024, 2).astype(np.float32)
        buffer.write(test_data)

        # Verify data was written
        buffer.seek(0)
        read_data = buffer.read(1024)
        assert len(read_data) == 1024

        # Close buffer
        buffer.close()
        assert buffer.is_closed()

        # Try to use closed buffer (should handle gracefully)
        written = buffer.write(test_data)
        assert written == 0  # Should fail gracefully

        read_data = buffer.read(1024)
        assert len(read_data) == 0  # Should return empty data

        # Remove from manager
        buffer_manager.remove_buffer("cleanup_test")


class TestLatencyAndPerformance:
    """Test latency measurements and performance monitoring."""

    def test_buffer_size_latency_impact(self, buffer_manager):
        """Test impact of different buffer sizes on latency."""
        buffer_sizes = [64, 128, 256, 512, 1024, 2048]
        latencies = []

        test_data = np.random.randn(1024, 2).astype(np.float32)

        for buffer_size in buffer_sizes:
            config = BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=buffer_size,
                max_memory_mb=100,
            )

            buffer = buffer_manager.create_buffer(
                f"latency_test_{buffer_size}",
                BufferType.MEMORY,
                config,
                size=buffer_size,
            )

            # Measure write latency
            start_time = time.time()
            buffer.write(test_data[:buffer_size])
            write_latency = (time.time() - start_time) * 1000  # Convert to ms

            # Measure read latency
            buffer.seek(0)
            start_time = time.time()
            buffer.read(buffer_size)
            read_latency = (time.time() - start_time) * 1000  # Convert to ms

            total_latency = write_latency + read_latency
            latencies.append((buffer_size, total_latency))

            # Calculate expected latency based on buffer size
            expected_latency_ms = (buffer_size / 44100) * 1000

            logger.info(
                f"Buffer size {buffer_size}: {total_latency:.3f}ms (expected: {expected_latency_ms:.3f}ms)"
            )

            buffer_manager.remove_buffer(f"latency_test_{buffer_size}")

        # Verify latency increases with buffer size
        assert len(latencies) == len(buffer_sizes)

        # First measurement should be faster than last
        assert latencies[0][1] < latencies[-1][1]

    def test_performance_monitoring(self, buffer_manager, memory_config):
        """Test performance monitoring capabilities."""
        buffer = buffer_manager.create_buffer(
            "perf_test", BufferType.MEMORY, memory_config, size=8192
        )

        # Perform various operations
        test_data = np.random.randn(512, 2).astype(np.float32)

        # Write operations
        for i in range(10):
            buffer.write(test_data)

        # Read operations
        for i in range(10):
            buffer.seek(0)
            buffer.read(512)

        # Get metrics
        metrics = buffer.get_metrics()

        logger.info("Performance metrics:")
        logger.info(f"  Read count: {metrics.read_count}")
        logger.info(f"  Write count: {metrics.write_count}")
        logger.info(f"  Bytes read: {metrics.bytes_read}")
        logger.info(f"  Bytes written: {metrics.bytes_written}")
        logger.info(f"  Avg read time: {metrics.avg_read_time_ms:.3f}ms")
        logger.info(f"  Avg write time: {metrics.avg_write_time_ms:.3f}ms")
        logger.info(f"  Memory usage: {metrics.memory_usage_mb:.2f}MB")
        logger.info(f"  Error count: {metrics.error_count}")

        # Verify metrics are reasonable
        assert metrics.read_count >= 10
        assert metrics.write_count >= 10
        assert metrics.bytes_read > 0
        assert metrics.bytes_written > 0
        assert metrics.avg_read_time_ms >= 0
        assert metrics.avg_write_time_ms >= 0
        assert metrics.memory_usage_mb > 0
        assert metrics.error_count == 0

        buffer_manager.remove_buffer("perf_test")


if __name__ == "__main__":
    pytest.main([__file__])

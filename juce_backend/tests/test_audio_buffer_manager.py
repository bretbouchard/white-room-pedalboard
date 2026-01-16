"""
Comprehensive tests for the Audio Buffer Management System.

Tests cover:
- Memory buffer operations
- Streaming buffer operations
- Ring buffer wrapper functionality
- Buffer pool performance
- Thread safety and concurrent access
- Memory leak prevention
- Performance under load
- Error handling and edge cases
"""

import gc
import os
import threading
import time
import unittest

import numpy as np
import psutil

from src.audio_agent.core.audio_buffer_manager import (
    AudioBufferManager,
    BufferConfig,
    BufferPool,
    BufferState,
    BufferType,
    MemoryBuffer,
    RingBufferWrapper,
    StreamingBuffer,
)
from src.audio_agent.engine.ring_buffer import RingBufferShm


class TestBufferConfig(unittest.TestCase):
    """Test buffer configuration validation."""

    def test_valid_config(self):
        """Test creating valid configuration."""
        config = BufferConfig(
            buffer_type=BufferType.MEMORY,
            sample_rate=44100,
            channels=2,
            buffer_size=1024,
            max_memory_mb=512,
        )
        self.assertEqual(config.buffer_type, BufferType.MEMORY)
        self.assertEqual(config.sample_rate, 44100)
        self.assertEqual(config.channels, 2)
        self.assertEqual(config.buffer_size, 1024)

    def test_invalid_sample_rate(self):
        """Test invalid sample rate validation."""
        with self.assertRaises(ValueError):
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=0,  # Invalid
                channels=2,
                buffer_size=1024,
            )

    def test_invalid_buffer_size(self):
        """Test invalid buffer size validation."""
        with self.assertRaises(ValueError):
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=0,  # Invalid
            )

    def test_negative_memory_limit(self):
        """Test negative memory limit validation."""
        with self.assertRaises(ValueError):
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=1024,
                max_memory_mb=-1,  # Invalid
            )


class TestMemoryBuffer(unittest.TestCase):
    """Test memory buffer functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = BufferConfig(
            buffer_type=BufferType.MEMORY,
            sample_rate=44100,
            channels=2,
            buffer_size=1024,
            max_memory_mb=100,
        )
        self.buffer = MemoryBuffer("test_buffer", self.config)

    def tearDown(self):
        """Clean up test fixtures."""
        if self.buffer and not self.buffer.is_closed():
            self.buffer.close()

    def test_buffer_allocation(self):
        """Test buffer allocation."""
        size = 4096
        success = self.buffer.allocate(size)

        self.assertTrue(success)
        self.assertEqual(self.buffer.state, BufferState.READY)
        self.assertEqual(self.buffer.size(), size)
        self.assertEqual(self.buffer.tell(), 0)

    def test_memory_limit_enforcement(self):
        """Test memory limit enforcement."""
        # Try to allocate more than the limit
        size = (self.config.max_memory_mb + 100) * 1024 * 1024 // 8  # Rough calculation
        success = self.buffer.allocate(size)

        self.assertFalse(success)
        self.assertEqual(self.buffer.state, BufferState.ERROR)

    def test_write_and_read(self):
        """Test writing and reading data."""
        self.buffer.allocate(1024)

        # Create test data
        test_data = np.random.randn(512, self.config.channels).astype(np.float32)

        # Write data
        written = self.buffer.write(test_data)
        self.assertEqual(written, 512)

        # Seek to beginning
        self.buffer.seek(0)

        # Read data
        read_data = self.buffer.read(512)

        np.testing.assert_array_equal(read_data, test_data)

    def test_partial_write(self):
        """Test partial write when buffer is nearly full."""
        self.buffer.allocate(1024)

        # Write almost full buffer
        test_data = np.random.randn(1000, self.config.channels).astype(np.float32)
        self.buffer.write(test_data)

        # Try to write more data
        additional_data = np.random.randn(100, self.config.channels).astype(np.float32)
        written = self.buffer.write(additional_data)

        # Should only write the remaining space
        self.assertEqual(written, 24)

    def test_seek_operations(self):
        """Test seek operations."""
        self.buffer.allocate(1024)

        # Write some data
        test_data = np.random.randn(512, self.config.channels).astype(np.float32)
        self.buffer.write(test_data)

        # Test valid seek
        self.assertTrue(self.buffer.seek(256))
        self.assertEqual(self.buffer.tell(), 256)

        # Test seek beyond buffer
        self.assertFalse(self.buffer.seek(2048))

        # Test negative seek
        self.assertFalse(self.buffer.seek(-100))

    def test_thread_safety(self):
        """Test thread safety of operations."""
        self.buffer.allocate(8192)

        errors = []

        def writer_thread(thread_id):
            try:
                for i in range(100):
                    data = np.random.randn(10, self.config.channels).astype(np.float32)
                    self.buffer.write(data)
            except Exception as e:
                errors.append(f"Writer {thread_id}: {e}")

        def reader_thread(thread_id):
            try:
                for i in range(100):
                    data = self.buffer.read(10)
                    if data is not None:
                        self.assertEqual(data.shape[1], self.config.channels)
            except Exception as e:
                errors.append(f"Reader {thread_id}: {e}")

        # Create multiple threads
        threads = []
        for i in range(5):
            threads.append(threading.Thread(target=writer_thread, args=(i,)))
            threads.append(threading.Thread(target=reader_thread, args=(i,)))

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Check for errors
        self.assertEqual(len(errors), 0, f"Thread safety errors: {errors}")

    def test_metrics_tracking(self):
        """Test performance metrics tracking."""
        self.buffer.allocate(1024)

        # Write some data
        test_data = np.random.randn(100, self.config.channels).astype(np.float32)
        self.buffer.write(test_data)

        # Read some data
        self.buffer.seek(0)
        self.buffer.read(50)

        # Check metrics
        metrics = self.buffer.get_metrics()
        self.assertEqual(metrics.read_count, 1)
        self.assertEqual(metrics.write_count, 1)
        self.assertGreater(metrics.avg_read_time_ms, 0)
        self.assertGreater(metrics.avg_write_time_ms, 0)
        self.assertGreater(metrics.memory_usage_mb, 0)


class TestStreamingBuffer(unittest.TestCase):
    """Test streaming buffer functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = BufferConfig(
            buffer_type=BufferType.STREAMING,
            sample_rate=44100,
            channels=2,
            buffer_size=1024,
            max_memory_mb=100,
            chunk_size=512,
            cache_size_mb=1,
        )
        self.buffer = StreamingBuffer("test_streaming", self.config)

    def tearDown(self):
        """Clean up test fixtures."""
        if self.buffer and not self.buffer.is_closed():
            self.buffer.close()

    def test_streaming_initialization(self):
        """Test streaming buffer initialization."""
        success = self.buffer.initialize(4096)

        self.assertTrue(success)
        self.assertEqual(self.buffer.state, BufferState.READY)
        self.assertEqual(self.buffer.size(), 4096)

    def test_chunked_reading(self):
        """Test reading in chunks."""
        self.buffer.initialize(2048)

        # Write test data
        test_data = np.random.randn(2048, self.config.channels).astype(np.float32)
        self.buffer.write(test_data)

        # Read in chunks
        self.buffer.seek(0)
        chunks = []
        chunk_size = 512

        while True:
            chunk = self.buffer.read(chunk_size)
            if len(chunk) == 0:
                break
            chunks.append(chunk)

        # Combine chunks and verify
        combined = np.vstack(chunks)
        np.testing.assert_array_equal(combined, test_data)

    def test_caching_behavior(self):
        """Test caching behavior."""
        self.buffer.initialize(1024)

        # Write test data
        test_data = np.random.randn(1024, self.config.channels).astype(np.float32)
        self.buffer.write(test_data)

        # Read same data multiple times
        self.buffer.seek(0)
        data1 = self.buffer.read(256)
        self.buffer.seek(0)
        data2 = self.buffer.read(256)

        # Should get same data
        np.testing.assert_array_equal(data1, data2)

        # Check cache hit rate
        metrics = self.buffer.get_metrics()
        self.assertGreater(metrics.cache_hit_rate, 0)

    def test_large_file_handling(self):
        """Test handling of large files."""
        # Simulate large file (100MB worth of audio data)
        large_size = 100 * 1024 * 1024 // (self.config.channels * 4)  # 100MB in samples
        success = self.buffer.initialize(large_size)

        self.assertTrue(success)

        # Write some data
        test_data = np.random.randn(1024, self.config.channels).astype(np.float32)
        written = self.buffer.write(test_data)

        self.assertEqual(written, 1024)

        # Read data back
        self.buffer.seek(0)
        read_data = self.buffer.read(1024)

        np.testing.assert_array_equal(read_data, test_data)

    def test_temporary_file_cleanup(self):
        """Test temporary file cleanup on close."""
        self.buffer.initialize(1024)
        temp_file = self.buffer._temp_file

        self.assertIsNotNone(temp_file)
        self.assertTrue(os.path.exists(temp_file))

        self.buffer.close()

        # File should be cleaned up
        self.assertFalse(os.path.exists(temp_file))


class TestRingBufferWrapper(unittest.TestCase):
    """Test ring buffer wrapper functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = BufferConfig(
            buffer_type=BufferType.RING, sample_rate=44100, channels=2, buffer_size=1024
        )

        # Create underlying ring buffer
        self.ring_buffer = RingBufferShm(
            name="test_ring",
            capacity_frames=1024,
            channels=self.config.channels,
            create=True,
        )

        self.buffer = RingBufferWrapper(
            "test_ring_wrapper", self.config, self.ring_buffer
        )

    def tearDown(self):
        """Clean up test fixtures."""
        if self.buffer and not self.buffer.is_closed():
            self.buffer.close()

    def test_ring_buffer_write_read(self):
        """Test writing and reading from ring buffer."""
        test_data = np.random.randn(512, self.config.channels).astype(np.float32)

        # Write data
        written = self.buffer.write(test_data)
        self.assertEqual(written, 512)

        # Read data
        read_data = self.buffer.read(512)

        np.testing.assert_array_equal(read_data, test_data)

    def test_ring_buffer_overflow(self):
        """Test ring buffer overflow behavior."""
        # Fill the buffer
        test_data = np.random.randn(1500, self.config.channels).astype(np.float32)
        written = self.buffer.write(test_data)

        # Should only write up to capacity
        self.assertEqual(written, self.config.buffer_size)

        # Read what was written
        read_data = self.buffer.read(self.config.buffer_size)
        self.assertEqual(len(read_data), self.config.buffer_size)

    def test_ring_buffer_non_blocking_read(self):
        """Test non-blocking read when no data available."""
        # Try to read without writing anything
        data = self.buffer.read(100)

        # Should return empty array
        self.assertEqual(len(data), 0)

    def test_metrics_tracking(self):
        """Test metrics tracking for ring buffer."""
        test_data = np.random.randn(100, self.config.channels).astype(np.float32)

        # Write and read data
        self.buffer.write(test_data)
        self.buffer.read(100)

        # Check metrics
        metrics = self.buffer.get_metrics()
        self.assertEqual(metrics.read_count, 1)
        self.assertEqual(metrics.write_count, 1)
        self.assertGreater(metrics.bytes_read, 0)
        self.assertGreater(metrics.bytes_written, 0)


class TestBufferPool(unittest.TestCase):
    """Test buffer pool functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = BufferConfig(
            buffer_type=BufferType.POOL, sample_rate=44100, channels=2, buffer_size=1024
        )
        self.pool = BufferPool(self.config, pool_size=3)

    def tearDown(self):
        """Clean up test fixtures."""
        self.pool.close()

    def test_buffer_acquisition(self):
        """Test acquiring buffers from pool."""
        buffer1 = self.pool.acquire("test1")
        buffer2 = self.pool.acquire("test2")

        self.assertIsNotNone(buffer1)
        self.assertIsNotNone(buffer2)

        # Check pool stats
        stats = self.pool.get_stats()
        self.assertEqual(stats["created_buffers"], 2)
        self.assertEqual(stats["pool_hits"], 0)
        self.assertEqual(stats["pool_misses"], 2)

    def test_buffer_release_and_reuse(self):
        """Test releasing and reusing buffers."""
        buffer = self.pool.acquire("test1")
        buffer_id = buffer.buffer_id

        # Release buffer
        self.pool.release(buffer)

        # Acquire new buffer (should reuse)
        new_buffer = self.pool.acquire("test2")

        # Check stats
        stats = self.pool.get_stats()
        self.assertGreater(stats["pool_hits"], 0)
        self.assertEqual(stats["created_buffers"], 1)  # Still only one created

    def test_pool_size_limit(self):
        """Test pool size limit enforcement."""
        buffers = []

        # Acquire more buffers than pool size
        for i in range(5):
            buffer = self.pool.acquire(f"test{i}")
            buffers.append(buffer)

        # Check that more buffers were created
        stats = self.pool.get_stats()
        self.assertEqual(stats["created_buffers"], 5)

        # Release all buffers
        for buffer in buffers:
            self.pool.release(buffer)

        # Pool should not exceed max size
        stats = self.pool.get_stats()
        self.assertLessEqual(stats["pool_size"], 3)

    def test_concurrent_access(self):
        """Test concurrent access to pool."""
        acquired_buffers = []
        errors = []

        def worker_thread(thread_id):
            try:
                buffer = self.pool.acquire(f"worker_{thread_id}")
                acquired_buffers.append(buffer)

                # Simulate work
                time.sleep(0.1)

                self.pool.release(buffer)
            except Exception as e:
                errors.append(f"Worker {thread_id}: {e}")

        # Create multiple threads
        threads = []
        for i in range(10):
            thread = threading.Thread(target=worker_thread, args=(i,))
            threads.append(thread)

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Check for errors
        self.assertEqual(len(errors), 0, f"Pool errors: {errors}")

        # All buffers should be released
        stats = self.pool.get_stats()
        self.assertEqual(stats["pool_size"], 3)


class TestAudioBufferManager(unittest.TestCase):
    """Test audio buffer manager functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = BufferConfig(
            buffer_type=BufferType.MEMORY,
            sample_rate=44100,
            channels=2,
            buffer_size=1024,
        )
        self.manager = AudioBufferManager(self.config)

    def tearDown(self):
        """Clean up test fixtures."""
        self.manager.close()

    def test_buffer_creation(self):
        """Test creating different types of buffers."""
        # Create memory buffer
        mem_buffer = self.manager.create_buffer(
            "test_memory", BufferType.MEMORY, size=1024
        )
        self.assertIsNotNone(mem_buffer)
        self.assertIsInstance(mem_buffer, MemoryBuffer)

    def test_duplicate_buffer_prevention(self):
        """Test prevention of duplicate buffer IDs."""
        buffer1 = self.manager.create_buffer(
            "duplicate_test", BufferType.MEMORY, size=1024
        )

        # Try to create buffer with same ID
        buffer2 = self.manager.create_buffer(
            "duplicate_test", BufferType.MEMORY, size=1024
        )

        # Should return the same buffer
        self.assertIs(buffer1, buffer2)

    def test_buffer_retrieval(self):
        """Test retrieving buffers by ID."""
        created_buffer = self.manager.create_buffer(
            "test_retrieve", BufferType.MEMORY, size=1024
        )

        retrieved_buffer = self.manager.get_buffer("test_retrieve")

        self.assertIs(created_buffer, retrieved_buffer)

    def test_buffer_removal(self):
        """Test removing buffers."""
        buffer = self.manager.create_buffer("test_remove", BufferType.MEMORY, size=1024)

        success = self.manager.remove_buffer("test_remove")
        self.assertTrue(success)

        # Buffer should no longer exist
        self.assertIsNone(self.manager.get_buffer("test_remove"))

    def test_system_metrics(self):
        """Test system-wide metrics."""
        # Create multiple buffers
        for i in range(3):
            self.manager.create_buffer(
                f"test_metrics_{i}", BufferType.MEMORY, size=1024
            )

        metrics = self.manager.get_system_metrics()

        self.assertEqual(metrics["total_buffers"], 3)
        self.assertGreater(metrics["total_memory_mb"], 0)
        self.assertIn("memory", metrics["buffer_types"])

    def test_memory_monitoring(self):
        """Test memory monitoring functionality."""
        # This test verifies that monitoring doesn't crash
        # Actual monitoring behavior is tested in integration tests

        # Create some buffers to trigger monitoring
        for i in range(5):
            self.manager.create_buffer(
                f"monitor_test_{i}", BufferType.MEMORY, size=1024
            )

        # Wait a bit for monitoring to potentially run
        time.sleep(0.1)

        # Should not crash
        metrics = self.manager.get_system_metrics()
        self.assertIsInstance(metrics, dict)


class TestPerformanceAndLoad(unittest.TestCase):
    """Test performance under various load conditions."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = BufferConfig(
            buffer_type=BufferType.MEMORY,
            sample_rate=44100,
            channels=2,
            buffer_size=8192,
        )

    def test_large_buffer_performance(self):
        """Test performance with large buffers."""
        buffer = MemoryBuffer("large_test", self.config)

        try:
            # Allocate large buffer (10MB)
            size = 10 * 1024 * 1024 // (self.config.channels * 4)
            start_time = time.time()

            success = buffer.allocate(size)
            allocation_time = time.time() - start_time

            self.assertTrue(success, f"Allocation failed after {allocation_time:.3f}s")
            self.assertLess(allocation_time, 5.0, "Allocation took too long")

            # Test write performance
            test_data = np.random.randn(4096, self.config.channels).astype(np.float32)
            start_time = time.time()

            written = buffer.write(test_data)
            write_time = time.time() - start_time

            self.assertEqual(written, 4096)
            self.assertLess(write_time, 0.1, "Write took too long")

            # Test read performance
            buffer.seek(0)
            start_time = time.time()

            read_data = buffer.read(4096)
            read_time = time.time() - start_time

            self.assertEqual(len(read_data), 4096)
            self.assertLess(read_time, 0.1, "Read took too long")

        finally:
            buffer.close()

    def test_concurrent_buffer_operations(self):
        """Test concurrent operations on multiple buffers."""
        num_buffers = 10
        num_operations = 100

        buffers = []
        errors = []

        # Create buffers
        for i in range(num_buffers):
            buffer = MemoryBuffer(f"concurrent_{i}", self.config)
            buffer.allocate(8192)
            buffers.append(buffer)

        def operation_thread(thread_id):
            try:
                buffer = buffers[thread_id % num_buffers]
                test_data = np.random.randn(64, self.config.channels).astype(np.float32)

                for i in range(num_operations):
                    # Write operation
                    buffer.seek(0)
                    buffer.write(test_data)

                    # Read operation
                    buffer.seek(0)
                    data = buffer.read(64)

                    if len(data) != 64:
                        errors.append(
                            f"Thread {thread_id}: Unexpected read size {len(data)}"
                        )

            except Exception as e:
                errors.append(f"Thread {thread_id}: {e}")

        # Create and start threads
        threads = []
        for i in range(20):  # More threads than buffers
            thread = threading.Thread(target=operation_thread, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Clean up
        for buffer in buffers:
            buffer.close()

        # Check for errors
        self.assertEqual(len(errors), 0, f"Concurrent operation errors: {errors}")

    def test_memory_leak_prevention(self):
        """Test memory leak prevention."""
        initial_memory = psutil.Process().memory_info().rss

        # Create and destroy many buffers
        for i in range(100):
            buffer = MemoryBuffer(f"leak_test_{i}", self.config)
            buffer.allocate(4096)

            # Write some data
            test_data = np.random.randn(64, self.config.channels).astype(np.float32)
            buffer.write(test_data)

            # Close buffer
            buffer.close()

        # Force garbage collection
        gc.collect()

        # Check memory usage
        final_memory = psutil.Process().memory_info().rss
        memory_increase = (final_memory - initial_memory) / (1024 * 1024)  # MB

        # Memory increase should be reasonable (less than 100MB)
        self.assertLess(
            memory_increase,
            100,
            f"Potential memory leak: {memory_increase:.1f}MB increase",
        )


class TestErrorHandlingAndEdgeCases(unittest.TestCase):
    """Test error handling and edge cases."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = BufferConfig(
            buffer_type=BufferType.MEMORY,
            sample_rate=44100,
            channels=2,
            buffer_size=1024,
        )

    def test_invalid_buffer_operations(self):
        """Test operations on invalid/closed buffers."""
        buffer = MemoryBuffer("invalid_test", self.config)

        # Operations on unallocated buffer
        data = buffer.read(100)
        self.assertEqual(len(data), 0)

        written = buffer.write(np.random.randn(100, 2).astype(np.float32))
        self.assertEqual(written, 0)

        # Allocate and then close
        buffer.allocate(1024)
        buffer.close()

        # Operations on closed buffer
        data = buffer.read(100)
        self.assertEqual(len(data), 0)

        written = buffer.write(np.random.randn(100, 2).astype(np.float32))
        self.assertEqual(written, 0)

    def test_mismatched_channel_count(self):
        """Test handling of mismatched channel counts."""
        buffer = MemoryBuffer("channel_test", self.config)
        buffer.allocate(1024)

        # Try to write data with wrong channel count
        wrong_data = np.random.randn(100, 4).astype(
            np.float32
        )  # 4 channels instead of 2

        with self.assertRaises(ValueError):
            buffer.write(wrong_data)

    def test_extreme_buffer_sizes(self):
        """Test handling of extreme buffer sizes."""
        # Test very small buffer
        small_config = BufferConfig(
            buffer_type=BufferType.MEMORY, sample_rate=44100, channels=2, buffer_size=1
        )

        small_buffer = MemoryBuffer("small_test", small_config)
        success = small_buffer.allocate(1)
        self.assertTrue(success)

        # Test single sample
        test_data = np.random.randn(1, 2).astype(np.float32)
        written = small_buffer.write(test_data)
        self.assertEqual(written, 1)

        small_buffer.close()

    def test_thread_safety_with_exceptions(self):
        """Test thread safety when exceptions occur."""
        buffer = MemoryBuffer("exception_test", self.config)
        buffer.allocate(1024)

        errors = []

        def problematic_thread(thread_id):
            try:
                if thread_id % 2 == 0:
                    # Valid operations
                    test_data = np.random.randn(10, 2).astype(np.float32)
                    buffer.write(test_data)
                    buffer.seek(0)
                    buffer.read(10)
                else:
                    # Invalid operations that should raise exceptions
                    wrong_data = np.random.randn(10, 5).astype(
                        np.float32
                    )  # Wrong channel count
                    try:
                        buffer.write(wrong_data)
                    except ValueError:
                        pass  # Expected

            except Exception as e:
                errors.append(f"Thread {thread_id}: {e}")

        # Run threads
        threads = []
        for i in range(10):
            thread = threading.Thread(target=problematic_thread, args=(i,))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        buffer.close()

        # Check that only expected errors occurred
        self.assertEqual(len(errors), 0, f"Unexpected thread safety errors: {errors}")


class TestIntegration(unittest.TestCase):
    """Integration tests for the complete buffer management system."""

    def setUp(self):
        """Set up test fixtures."""
        self.manager = AudioBufferManager()

    def tearDown(self):
        """Clean up test fixtures."""
        self.manager.close()

    def test_real_world_audio_workflow(self):
        """Test a realistic audio processing workflow."""
        # Create different types of buffers for different purposes

        # Input buffer (ring buffer for real-time input)
        input_buffer = self.manager.create_buffer(
            "audio_input",
            BufferType.RING,
            BufferConfig(
                buffer_type=BufferType.RING,
                sample_rate=44100,
                channels=2,
                buffer_size=512,
            ),
        )

        # Processing buffer (memory for fast access)
        processing_buffer = self.manager.create_buffer(
            "audio_processing",
            BufferType.MEMORY,
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=8192,
            ),
            size=8192,
        )

        # Output buffer (streaming for large output)
        output_buffer = self.manager.create_buffer(
            "audio_output",
            BufferType.STREAMING,
            BufferConfig(
                buffer_type=BufferType.STREAMING,
                sample_rate=44100,
                channels=2,
                buffer_size=1024,
                chunk_size=512,
            ),
            estimated_size=44100 * 10,  # 10 seconds of audio
        )

        self.assertIsNotNone(input_buffer)
        self.assertIsNotNone(processing_buffer)
        self.assertIsNotNone(output_buffer)

        # Simulate audio workflow
        # 1. Write input data to ring buffer
        input_data = np.random.randn(512, 2).astype(np.float32)
        written = input_buffer.write(input_data)
        self.assertEqual(written, 512)

        # 2. Read from ring buffer and process
        read_input = input_buffer.read(512)
        np.testing.assert_array_equal(read_input, input_data)

        # 3. Process data (simple gain reduction)
        processed_data = read_input * 0.8
        processing_buffer.write(processed_data)

        # 4. Write to output buffer
        processing_buffer.seek(0)
        output_data = processing_buffer.read(512)
        output_buffer.write(output_data)

        # 5. Verify output
        output_buffer.seek(0)
        final_output = output_buffer.read(512)
        np.testing.assert_array_almost_equal(final_output, processed_data)

        # Check system metrics
        metrics = self.manager.get_system_metrics()
        self.assertEqual(metrics["total_buffers"], 3)
        self.assertIn("ring", metrics["buffer_types"])
        self.assertIn("memory", metrics["buffer_types"])
        self.assertIn("streaming", metrics["buffer_types"])

    def test_memory_pressure_handling(self):
        """Test system behavior under memory pressure."""
        # This test simulates memory pressure scenarios

        buffers = []
        try:
            # Create many buffers to increase memory usage
            for i in range(50):
                buffer = self.manager.create_buffer(
                    f"pressure_test_{i}",
                    BufferType.MEMORY,
                    BufferConfig(
                        buffer_type=BufferType.MEMORY,
                        sample_rate=44100,
                        channels=2,
                        buffer_size=8192,
                        max_memory_mb=200,  # Increase limit for this test
                    ),
                    size=8192,
                )

                if buffer:
                    buffers.append(buffer)

                    # Write some data
                    test_data = np.random.randn(1024, 2).astype(np.float32)
                    buffer.write(test_data)

            # Should have created at least some buffers
            self.assertGreater(len(buffers), 0)

            # Check system metrics
            metrics = self.manager.get_system_metrics()
            self.assertGreater(metrics["total_memory_mb"], 0)

        finally:
            # Clean up
            for buffer in buffers:
                self.manager.remove_buffer(buffer.buffer_id)

    def test_long_running_stability(self):
        """Test system stability over extended operation."""
        buffer = self.manager.create_buffer(
            "stability_test",
            BufferType.MEMORY,
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=4096,
            ),
            size=4096,
        )

        self.assertIsNotNone(buffer)

        # Run for a period of time
        start_time = time.time()
        operations = 0

        while time.time() - start_time < 2.0:  # Run for 2 seconds
            # Write data
            test_data = np.random.randn(64, 2).astype(np.float32)
            buffer.seek(0)
            buffer.write(test_data)

            # Read data
            buffer.seek(0)
            read_data = buffer.read(64)

            operations += 1

            # Small delay to prevent excessive CPU usage
            time.sleep(0.001)

        # Check that operations completed successfully
        self.assertGreater(operations, 100)

        # Check metrics
        metrics = buffer.get_metrics()
        self.assertEqual(metrics.read_count, operations)
        self.assertEqual(metrics.write_count, operations)
        self.assertEqual(metrics.error_count, 0)


if __name__ == "__main__":
    # Configure logging for tests
    import logging

    logging.basicConfig(level=logging.WARNING)

    # Run tests
    unittest.main(verbosity=2)

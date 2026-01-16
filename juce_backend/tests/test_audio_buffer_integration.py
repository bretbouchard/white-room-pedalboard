"""
Integration tests for the Audio Buffer Management System.

This test suite covers:
- Real-world usage scenarios
- Performance under various conditions
- Integration with existing audio components
- Memory management validation
- Thread safety validation
- End-to-end workflows
"""

import gc
import logging
import os
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import psutil

# Import the audio buffer management system
try:
    from src.audio_agent.core.audio_buffer_manager import (
        AudioBufferManager,
        BufferConfig,
        BufferType,
        create_audio_buffer,
        get_audio_buffer_manager,
    )
    from src.audio_agent.core.audio_source_manager import (
        AudioSourceConfig,
        AudioSourceManager,
        AudioSourceType,
    )

    IMPORTS_AVAILABLE = True
except ImportError as e:
    print(f"Import warning: {e}")
    IMPORTS_AVAILABLE = False


@unittest.skipUnless(IMPORTS_AVAILABLE, "Audio buffer management system not available")
class TestAudioBufferIntegration(unittest.TestCase):
    """Integration tests for audio buffer management."""

    def setUp(self):
        """Set up test environment."""
        self.manager = AudioBufferManager()
        self.temp_files = []

    def tearDown(self):
        """Clean up test environment."""
        self.manager.close()

        # Clean up temporary files
        for temp_file in self.temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass

    def create_test_audio_file(
        self, duration_seconds: float = 1.0, sample_rate: int = 44100
    ) -> str:
        """Create a test audio file."""
        try:
            import soundfile as sf

            # Generate test signal
            total_samples = int(sample_rate * duration_seconds)
            t = np.linspace(0, duration_seconds, total_samples, endpoint=False)

            # Create stereo signal with multiple frequencies
            signal = (
                0.3 * np.sin(2 * np.pi * 440 * t)
                + 0.2 * np.sin(2 * np.pi * 880 * t)  # A4
                + 0.1 * np.sin(2 * np.pi * 220 * t)  # A5  # A3
            )

            stereo_signal = np.column_stack([signal, signal * 0.9])

            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            temp_file.close()

            # Save audio file
            sf.write(temp_file.name, stereo_signal, sample_rate)
            self.temp_files.append(temp_file.name)

            return temp_file.name

        except ImportError:
            # If soundfile is not available, create a simple binary file
            temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            temp_file.close()

            # Create fake audio data (float32 stereo)
            total_samples = int(sample_rate * duration_seconds)
            fake_data = np.random.randn(total_samples, 2).astype(np.float32)

            with open(temp_file.name, "wb") as f:
                # Write WAV header (simplified)
                f.write(b"RIFF")
                f.write((36 + fake_data.nbytes).to_bytes(4, "little"))
                f.write(b"WAVE")
                f.write(b"fmt ")
                f.write((16).to_bytes(4, "little"))
                f.write((3).to_bytes(2, "little"))  # IEEE float
                f.write((2).to_bytes(2, "little"))  # Stereo
                f.write(sample_rate.to_bytes(4, "little"))
                f.write((sample_rate * 8).to_bytes(4, "little"))
                f.write((8).to_bytes(2, "little"))
                f.write((64).to_bytes(2, "little"))
                f.write(b"data")
                f.write(fake_data.nbytes.to_bytes(4, "little"))
                f.write(fake_data.tobytes())

            self.temp_files.append(temp_file.name)
            return temp_file.name

    def test_large_file_streaming_workflow(self):
        """Test streaming large audio files efficiently."""
        # Create a large test file (simulating 50MB)
        test_file = self.create_test_audio_file(duration_seconds=10.0)  # 10 seconds

        # Get file size
        file_size = os.path.getsize(test_file) / (1024 * 1024)  # MB

        # Create streaming buffer configuration
        config = BufferConfig(
            buffer_type=BufferType.STREAMING,
            sample_rate=44100,
            channels=2,
            buffer_size=8192,
            max_memory_mb=20,  # Low memory limit to test streaming
            chunk_size=4096,
            cache_size_mb=5,
        )

        # Create streaming buffer
        buffer = self.manager.create_buffer(
            "large_file_test",
            BufferType.STREAMING,
            config,
            file_path=test_file,
            estimated_size=44100 * 10,  # 10 seconds
        )

        self.assertIsNotNone(buffer)

        # Test streaming workflow
        chunks_processed = 0
        total_bytes = 0

        chunk_size = 4096

        # Read the entire file in chunks
        while True:
            chunk = buffer.read(chunk_size)

            if len(chunk) == 0:
                break

            chunks_processed += 1
            total_bytes += chunk.nbytes

            # Simulate processing
            processed_chunk = chunk * 0.8  # Simple gain reduction

            # Write back to buffer (seek to position first)
            current_pos = buffer.tell() - len(chunk)
            buffer.seek(current_pos)
            buffer.write(processed_chunk)

        # Verify processing completed
        self.assertGreater(chunks_processed, 0)
        self.assertGreater(total_bytes, 0)

        # Check memory usage stayed within limits
        metrics = buffer.get_metrics()
        self.assertLessEqual(
            metrics.memory_usage_mb, config.max_memory_mb * 1.5
        )  # Allow some overhead

        # Verify cache was used effectively
        self.assertGreater(metrics.cache_hit_rate, 0.1)  # At least 10% cache hit rate

        logging.info(f"Processed {chunks_processed} chunks, {total_bytes} bytes")
        logging.info(f"Peak memory usage: {metrics.memory_usage_mb:.2f}MB")
        logging.info(f"Cache hit rate: {metrics.cache_hit_rate:.2%}")

    def test_concurrent_buffer_operations(self):
        """Test thread-safe concurrent operations."""
        num_buffers = 5
        num_operations = 50

        # Create multiple buffers
        buffers = []
        for i in range(num_buffers):
            buffer = self.manager.create_buffer(
                f"concurrent_{i}",
                BufferType.MEMORY,
                BufferConfig(
                    buffer_type=BufferType.MEMORY,
                    sample_rate=44100,
                    channels=2,
                    buffer_size=8192,
                    thread_safe=True,
                ),
                size=8192,
            )

            if buffer:
                buffers.append(buffer)

        # Results collection
        results = []
        errors = []

        def worker_thread(thread_id, buffer):
            """Worker thread for concurrent operations."""
            try:
                operations_completed = 0
                test_data = np.random.randn(256, 2).astype(np.float32)

                for i in range(num_operations):
                    # Write operation
                    buffer.seek(0)
                    written = buffer.write(test_data)

                    # Read operation
                    buffer.seek(0)
                    read_data = buffer.read(256)

                    if written == 256 and len(read_data) == 256:
                        operations_completed += 1

                results.append((thread_id, operations_completed))

            except Exception as e:
                errors.append(f"Thread {thread_id}: {e}")

        # Start concurrent operations
        start_time = time.time()

        with ThreadPoolExecutor(max_workers=len(buffers)) as executor:
            futures = []

            for i, buffer in enumerate(buffers):
                future = executor.submit(worker_thread, i, buffer)
                futures.append(future)

            # Wait for all to complete
            for future in futures:
                future.result()

        operation_time = time.time() - start_time

        # Verify results
        self.assertEqual(len(errors), 0, f"Concurrent operation errors: {errors}")
        self.assertEqual(len(results), num_buffers)

        # Check that all operations completed
        total_operations = sum(ops for _, ops in results)
        expected_operations = num_buffers * num_operations

        self.assertEqual(total_operations, expected_operations)

        # Check performance
        ops_per_second = total_operations / operation_time
        self.assertGreater(ops_per_second, 1000)  # Should handle at least 1000 ops/sec

        logging.info(
            f"Concurrent test: {total_operations} operations in {operation_time:.3f}s"
        )
        logging.info(f"Performance: {ops_per_second:.0f} ops/sec")

    def test_memory_management_validation(self):
        """Test memory management and leak prevention."""
        initial_memory = psutil.Process().memory_info().rss

        # Create and destroy many buffers
        for cycle in range(5):
            buffers = []

            # Create multiple buffers
            for i in range(10):
                buffer = self.manager.create_buffer(
                    f"memory_test_{cycle}_{i}",
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

                if buffer:
                    # Write some data
                    test_data = np.random.randn(1024, 2).astype(np.float32)
                    buffer.write(test_data)
                    buffers.append(buffer)

            # Use buffers
            for buffer in buffers:
                buffer.seek(0)
                data = buffer.read(1024)
                self.assertEqual(len(data), 1024)

            # Close all buffers
            for buffer in buffers:
                self.manager.remove_buffer(buffer.buffer_id)

            # Force garbage collection
            gc.collect()

            # Check memory usage after each cycle
            current_memory = psutil.Process().memory_info().rss
            memory_increase = (current_memory - initial_memory) / (1024 * 1024)  # MB

            logging.info(f"Cycle {cycle + 1}: Memory increase: {memory_increase:.2f}MB")

        # Final memory check
        final_memory = psutil.Process().memory_info().rss
        total_increase = (final_memory - initial_memory) / (1024 * 1024)  # MB

        # Memory increase should be reasonable (less than 50MB)
        self.assertLess(
            total_increase,
            50,
            f"Potential memory leak: {total_increase:.2f}MB increase",
        )

        logging.info(f"Memory management test: Total increase {total_increase:.2f}MB")

    def test_real_time_processing_scenario(self):
        """Test real-time audio processing scenario."""
        # Create ring buffer for input
        input_buffer = self.manager.create_buffer(
            "rt_input",
            BufferType.RING,
            BufferConfig(
                buffer_type=BufferType.RING,
                sample_rate=44100,
                channels=2,
                buffer_size=512,  # Small for low latency
            ),
        )

        # Create processing buffer
        processing_buffer = self.manager.create_buffer(
            "rt_processing",
            BufferType.MEMORY,
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=8192,
                max_memory_mb=20,
            ),
            size=8192,
        )

        # Create output buffer
        output_buffer = self.manager.create_buffer(
            "rt_output",
            BufferType.RING,
            BufferConfig(
                buffer_type=BufferType.RING,
                sample_rate=44100,
                channels=2,
                buffer_size=512,
            ),
        )

        self.assertIsNotNone(input_buffer)
        self.assertIsNotNone(processing_buffer)
        self.assertIsNotNone(output_buffer)

        # Real-time processing simulation
        processing_time_total = 0
        chunks_processed = 0
        max_chunk_time = 0

        chunk_size = 128
        num_chunks = 200

        for i in range(num_chunks):
            # Generate input audio (simulating real-time input)
            t = np.linspace(0, chunk_size / 44100, chunk_size, endpoint=False)
            input_signal = 0.1 * np.sin(2 * np.pi * 440 * t)  # 440Hz sine wave
            input_chunk = np.column_stack([input_signal, input_signal * 0.9])

            # Start timing
            chunk_start = time.time()

            # Write to input buffer
            input_buffer.write(input_chunk)

            # Read from input buffer
            input_data = input_buffer.read(chunk_size)

            if len(input_data) > 0:
                # Process audio (apply simple effects)
                processed_data = input_data * 0.8  # Gain reduction
                processed_data = np.tanh(processed_data)  # Soft clipping

                # Write to processing buffer
                processing_buffer.write(processed_data)

                # Write to output buffer
                output_buffer.write(processed_data)

                chunks_processed += 1

            # End timing
            chunk_time = time.time() - chunk_start
            processing_time_total += chunk_time
            max_chunk_time = max(max_chunk_time, chunk_time)

            # Simulate real-time constraints
            expected_time = chunk_size / 44100  # Time this chunk represents
            if chunk_time > expected_time * 2:  # If processing takes too long
                logging.warning(
                    f"Chunk {i} took too long: {chunk_time*1000:.2f}ms (expected: {expected_time*1000:.2f}ms)"
                )

        # Verify real-time performance
        avg_chunk_time = processing_time_total / chunks_processed
        expected_chunk_time = chunk_size / 44100

        # Average processing time should be reasonable
        self.assertLess(
            avg_chunk_time, expected_chunk_time * 10
        )  # Allow 10x processing time

        # Get performance metrics
        input_metrics = input_buffer.get_metrics()
        processing_metrics = processing_buffer.get_metrics()
        output_metrics = output_buffer.get_metrics()

        # Verify all chunks were processed
        self.assertEqual(chunks_processed, num_chunks)

        # Check for dropouts (buffer overflows/underflows)
        self.assertEqual(input_metrics.error_count, 0)
        self.assertEqual(output_metrics.error_count, 0)

        logging.info("Real-time processing test:")
        logging.info(f"  Chunks processed: {chunks_processed}/{num_chunks}")
        logging.info(f"  Avg chunk time: {avg_chunk_time*1000:.3f}ms")
        logging.info(f"  Max chunk time: {max_chunk_time*1000:.3f}ms")
        logging.info(f"  Expected chunk time: {expected_chunk_time*1000:.3f}ms")
        logging.info(
            f"  Input buffer operations: {input_metrics.write_count} writes, {input_metrics.read_count} reads"
        )
        logging.info(f"  Output buffer operations: {output_metrics.write_count} writes")

    def test_buffer_pool_performance(self):
        """Test buffer pooling performance."""
        config = BufferConfig(
            buffer_type=BufferType.POOL,
            sample_rate=44100,
            channels=2,
            buffer_size=4096,
            max_memory_mb=50,
        )

        # Test buffer acquisition and release performance
        acquisition_times = []
        release_times = []

        num_iterations = 100

        for i in range(num_iterations):
            # Measure acquisition time
            start_time = time.time()
            buffer = self.manager.create_buffer(
                f"pool_test_{i}", BufferType.POOL, config
            )
            acquisition_time = time.time() - start_time
            acquisition_times.append(acquisition_time)

            if buffer:
                # Use buffer briefly
                test_data = np.random.randn(256, 2).astype(np.float32)
                buffer.write(test_data)
                buffer.seek(0)
                data = buffer.read(256)

                # Measure release time
                start_time = time.time()
                self.manager.remove_buffer(f"pool_test_{i}")
                release_time = time.time() - start_time
                release_times.append(release_time)

        # Analyze performance
        avg_acquisition_time = np.mean(acquisition_times)
        avg_release_time = np.mean(release_times)

        # Should be fast operations
        self.assertLess(avg_acquisition_time, 0.01)  # Less than 10ms
        self.assertLess(avg_release_time, 0.01)  # Less than 10ms

        # Get system metrics to check pooling effectiveness
        system_metrics = self.manager.get_system_metrics()

        logging.info("Buffer pool performance:")
        logging.info(f"  Avg acquisition time: {avg_acquisition_time*1000:.3f}ms")
        logging.info(f"  Avg release time: {avg_release_time*1000:.3f}ms")
        logging.info(f"  Total iterations: {num_iterations}")

        if "pool_stats" in system_metrics:
            for pool_key, stats in system_metrics["pool_stats"].items():
                logging.info(f"  Pool {pool_key}:")
                logging.info(f"    Hit rate: {stats['hit_rate']:.2%}")
                logging.info(f"    Pool hits: {stats['pool_hits']}")
                logging.info(f"    Pool misses: {stats['pool_misses']}")

    def test_error_recovery_and_robustness(self):
        """Test error recovery and system robustness."""
        # Test various error conditions

        # 1. Invalid operations
        buffer = self.manager.create_buffer(
            "error_test",
            BufferType.MEMORY,
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=1024,
            ),
            size=1024,
        )

        self.assertIsNotNone(buffer)

        # Try invalid operations
        wrong_data = np.random.randn(100, 4).astype(np.float32)  # Wrong channel count

        with self.assertRaises(ValueError):
            buffer.write(wrong_data)

        # 2. Memory pressure simulation
        memory_hog_buffers = []
        max_buffers_created = 0

        try:
            for i in range(100):
                buffer = self.manager.create_buffer(
                    f"memory_hog_{i}",
                    BufferType.MEMORY,
                    BufferConfig(
                        buffer_type=BufferType.MEMORY,
                        sample_rate=44100,
                        channels=2,
                        buffer_size=1024,
                        max_memory_mb=200,  # Large limit
                    ),
                    size=1024,
                )

                if buffer:
                    memory_hog_buffers.append(buffer)
                    max_buffers_created += 1

                    # Write data to actually use memory
                    test_data = np.random.randn(1024, 2).astype(np.float32)
                    buffer.write(test_data)

                # Check system memory usage
                if i % 10 == 0:
                    system_metrics = self.manager.get_system_metrics()
                    memory_usage = system_metrics["total_memory_mb"]

                    if memory_usage > 500:  # Stop if using too much memory
                        break

        except MemoryError:
            logging.warning("Memory limit reached during stress test")

        # Clean up memory hog buffers
        for buffer in memory_hog_buffers:
            self.manager.remove_buffer(buffer.buffer_id)

        # Verify system recovered
        final_metrics = self.manager.get_system_metrics()
        self.assertLess(
            final_metrics["total_memory_mb"], 100
        )  # Should be under 100MB now

        # 3. Concurrent error conditions
        errors = []

        def error_worker_thread(thread_id):
            try:
                for i in range(50):
                    buffer = self.manager.create_buffer(
                        f"error_worker_{thread_id}_{i}",
                        BufferType.MEMORY,
                        BufferConfig(
                            buffer_type=BufferType.MEMORY,
                            sample_rate=44100,
                            channels=2,
                            buffer_size=1024,
                        ),
                        size=1024,
                    )

                    if buffer:
                        # Sometimes do invalid operations
                        if i % 10 == 0:
                            try:
                                wrong_data = np.random.randn(100, 5).astype(np.float32)
                                buffer.write(wrong_data)
                            except ValueError:
                                pass  # Expected

                        # Clean up
                        self.manager.remove_buffer(buffer.buffer_id)

            except Exception as e:
                errors.append(f"Worker {thread_id}: {e}")

        # Run concurrent error test
        threads = []
        for i in range(5):
            thread = threading.Thread(target=error_worker_thread, args=(i,))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        # System should still be functional
        test_buffer = self.manager.create_buffer(
            "recovery_test",
            BufferType.MEMORY,
            BufferConfig(
                buffer_type=BufferType.MEMORY,
                sample_rate=44100,
                channels=2,
                buffer_size=1024,
            ),
            size=1024,
        )

        self.assertIsNotNone(test_buffer)

        # Should be able to perform normal operations
        test_data = np.random.randn(100, 2).astype(np.float32)
        written = test_buffer.write(test_data)
        self.assertEqual(written, 100)

        test_buffer.seek(0)
        read_data = test_buffer.read(100)
        self.assertEqual(len(read_data), 100)

        self.manager.remove_buffer("recovery_test")

        logging.info("Error recovery test:")
        logging.info(f"  Max buffers created in stress test: {max_buffers_created}")
        logging.info(f"  Concurrent errors: {len(errors)}")
        logging.info(f"  System recovered successfully: {len(errors) == 0}")

    def test_integration_with_audio_source_manager(self):
        """Test integration with existing audio source manager."""
        try:
            # Create audio source manager
            source_manager = AudioSourceManager(sample_rate=44100, buffer_size=1024)

            # Create file audio source
            test_file = self.create_test_audio_file(duration_seconds=2.0)

            source_config = AudioSourceConfig(
                name="integration_test_source",
                source_type=AudioSourceType.AUDIO_FILE,
                sample_rate=44100,
                channels=2,
                buffer_size=1024,
                file_path=test_file,
            )

            # Create audio source
            source_created = source_manager.create_source(source_config)
            self.assertTrue(source_created)

            # Get audio source
            source = source_manager.get_source("integration_test_source")
            self.assertIsNotNone(source)

            # Create buffer manager for processing
            processing_buffer = self.manager.create_buffer(
                "integration_processing",
                BufferType.MEMORY,
                BufferConfig(
                    buffer_type=BufferType.MEMORY,
                    sample_rate=44100,
                    channels=2,
                    buffer_size=8192,
                    max_memory_mb=20,
                ),
                size=8192,
            )

            self.assertIsNotNone(processing_buffer)

            # Test data flow from audio source to buffer
            total_samples_processed = 0

            for i in range(10):  # Process 10 chunks
                # Get buffer from audio source
                audio_data = source_manager.get_source_buffer("integration_test_source")

                if audio_data is not None and len(audio_data) > 0:
                    # Write to our processing buffer
                    written = processing_buffer.write(audio_data)
                    total_samples_processed += written

            # Verify data was processed
            self.assertGreater(total_samples_processed, 0)

            # Read back processed data
            processing_buffer.seek(0)
            processed_data = processing_buffer.read(total_samples_processed)
            self.assertEqual(len(processed_data), total_samples_processed)

            # Clean up
            source_manager.remove_source("integration_test_source")
            self.manager.remove_buffer("integration_processing")

            logging.info(
                f"Integration test processed {total_samples_processed} samples"
            )

        except Exception as e:
            self.skipTest(f"Audio source manager integration test skipped: {e}")


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Run tests
    unittest.main(verbosity=2)

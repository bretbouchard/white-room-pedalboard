"""
Performance and load testing for critical audio processing components.

This module tests performance characteristics and load handling for:
- Audio Buffer Manager under high load
- Real-Time Processing latency and throughput
- Plugin System performance with many plugins
- Validation System performance with large datasets
- System performance under concurrent load
- Memory usage and leak detection
- CPU utilization and bottlenecks
"""

import gc
import logging
import statistics
import threading
import time
import tracemalloc
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any
from unittest.mock import Mock

import numpy as np
import psutil
import pytest

from src.audio_agent.core.audio_buffer_manager import AudioBufferManager, BufferType
from src.audio_agent.core.real_time_processing import RealTimeProcessor
from src.audio_agent.models.validation import (
    validate_audio_data,
    validate_buffer_size,
    validate_sample_rate,
)


@dataclass
class PerformanceMetrics:
    """Performance measurement results."""

    operation_name: str
    execution_time: float
    memory_usage_mb: float
    cpu_percent: float
    throughput_ops_per_sec: float
    error_count: int = 0

    def __str__(self) -> str:
        return (
            f"{self.operation_name}: {self.execution_time:.4f}s, "
            f"{self.memory_usage_mb:.2f}MB, {self.cpu_percent:.1f}% CPU, "
            f"{self.throughput_ops_per_sec:.2f} ops/sec"
        )


class PerformanceMonitor:
    """Monitor system performance during testing."""

    def __init__(self):
        self.process = psutil.Process()
        self.start_time = None
        self.start_memory = None
        self.measurements = []

    def start_monitoring(self):
        """Start performance monitoring."""
        tracemalloc.start()
        self.start_time = time.time()
        self.start_memory = self.process.memory_info().rss / 1024 / 1024  # MB

    def stop_monitoring(self) -> PerformanceMetrics:
        """Stop monitoring and return metrics."""
        end_time = time.time()
        end_memory = self.process.memory_info().rss / 1024 / 1024  # MB
        cpu_percent = self.process.cpu_percent()

        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        execution_time = end_time - self.start_time
        memory_usage = end_memory - self.start_memory
        peak_memory_mb = peak / 1024 / 1024

        return PerformanceMetrics(
            operation_name="performance_test",
            execution_time=execution_time,
            memory_usage_mb=memory_usage,
            cpu_percent=cpu_percent,
            throughput_ops_per_sec=0.0,  # To be calculated by caller
        )


@contextmanager
def performance_monitor(operation_name: str):
    """Context manager for performance monitoring."""
    monitor = PerformanceMonitor()
    monitor.start_monitoring()
    start_ops = 0

    try:
        yield monitor
    finally:
        metrics = monitor.stop_monitoring()
        metrics.operation_name = operation_name
        logging.info(f"Performance metrics: {metrics}")

        # Store metrics as attribute for easy access
        monitor.metrics = metrics


class TestAudioBufferManagerPerformance:
    """Performance tests for Audio Buffer Manager."""

    @pytest.fixture
    def buffer_manager(self):
        """Create a buffer manager for performance testing."""
        return AudioBufferManager(max_memory_mb=500)

    def test_large_buffer_creation_performance(self, buffer_manager):
        """Test performance of creating large buffers."""
        buffer_sizes = [1024, 4096, 16384, 65536]  # 1KB to 64KB
        results = []

        for size in buffer_sizes:
            with performance_monitor(f"create_buffer_{size}bytes") as monitor:
                start_time = time.time()
                buffer_ids = []

                # Create 100 buffers of this size
                for i in range(100):
                    buffer_id = buffer_manager.create_buffer(
                        buffer_type=BufferType.MEMORY, size=size, sample_rate=44100
                    )
                    buffer_ids.append(buffer_id)

                end_time = time.time()
                throughput = len(buffer_ids) / (end_time - monitor.start_time)

                # Cleanup
                for buffer_id in buffer_ids:
                    buffer_manager.remove_buffer(buffer_id)

                metrics = PerformanceMetrics(
                    operation_name=f"create_buffer_{size}bytes",
                    execution_time=end_time - monitor.start_time,
                    memory_usage_mb=monitor.process.memory_info().rss / 1024 / 1024,
                    cpu_percent=monitor.process.cpu_percent(),
                    throughput_ops_per_sec=throughput,
                )
                results.append(metrics)

        # Verify performance is reasonable
        for result in results:
            assert (
                result.throughput_ops_per_sec > 100
            ), f"Buffer creation too slow: {result.throughput_ops_per_sec:.2f} ops/sec"
            assert (
                result.execution_time < 5.0
            ), f"Buffer creation took too long: {result.execution_time:.2f}s"

        # Performance should not degrade significantly with larger buffers
        small_buffer_perf = results[0].throughput_ops_per_sec
        large_buffer_perf = results[-1].throughput_ops_per_sec
        perf_ratio = large_buffer_perf / small_buffer_perf
        assert (
            perf_ratio > 0.1
        ), f"Performance degradation too severe: {perf_ratio:.2f}x"

    def test_concurrent_buffer_operations_performance(self, buffer_manager):
        """Test performance of concurrent buffer operations."""
        num_threads = 10
        operations_per_thread = 50
        results = []

        def buffer_operations(thread_id: int) -> dict[str, Any]:
            """Perform buffer operations in a thread."""
            thread_results = {
                "thread_id": thread_id,
                "operations": 0,
                "errors": 0,
                "time": 0,
            }
            start_time = time.time()

            try:
                for i in range(operations_per_thread):
                    # Create buffer
                    buffer_id = buffer_manager.create_buffer(
                        buffer_type=BufferType.MEMORY, size=4096, sample_rate=44100
                    )

                    # Write data
                    data = np.random.randint(-32768, 32767, 1024, dtype=np.int16)
                    buffer_manager.write_buffer(buffer_id, 0, data)

                    # Read data
                    read_data = buffer_manager.read_buffer(buffer_id, 0, 1024)

                    # Remove buffer
                    buffer_manager.remove_buffer(buffer_id)

                    thread_results["operations"] += 1

            except Exception as e:
                thread_results["errors"] += 1
                logging.error(f"Thread {thread_id} error: {e}")

            thread_results["time"] = time.time() - start_time
            return thread_results

        with performance_monitor("concurrent_buffer_operations") as monitor:
            with ThreadPoolExecutor(max_workers=num_threads) as executor:
                futures = [
                    executor.submit(buffer_operations, i) for i in range(num_threads)
                ]
                thread_results = [future.result() for future in as_completed(futures)]

            total_operations = sum(result["operations"] for result in thread_results)
            total_errors = sum(result["errors"] for result in thread_results)
            total_time = max(result["time"] for result in thread_results)

            throughput = total_operations / total_time

            # Verify performance
            assert (
                throughput > 100
            ), f"Concurrent operations too slow: {throughput:.2f} ops/sec"
            assert (
                total_errors == 0
            ), f"Unexpected errors in concurrent operations: {total_errors}"
            assert (
                monitor.metrics.execution_time < 30.0
            ), f"Concurrent test took too long: {monitor.metrics.execution_time:.2f}s"

    def test_memory_usage_scaling(self, buffer_manager):
        """Test memory usage scales appropriately with buffer count."""
        buffer_counts = [10, 50, 100, 200]
        memory_measurements = []

        for count in buffer_counts:
            # Force garbage collection before measurement
            gc.collect()
            initial_memory = buffer_manager.get_memory_usage()

            # Create buffers
            buffer_ids = []
            for i in range(count):
                buffer_id = buffer_manager.create_buffer(
                    buffer_type=BufferType.MEMORY,
                    size=8192,  # 8KB per buffer
                    sample_rate=44100,
                )
                buffer_ids.append(buffer_id)

            final_memory = buffer_manager.get_memory_usage()
            memory_increase = final_memory - initial_memory

            memory_measurements.append(
                {
                    "buffer_count": count,
                    "memory_increase_mb": memory_increase,
                    "memory_per_buffer_kb": (memory_increase * 1024) / count,
                }
            )

            # Cleanup
            for buffer_id in buffer_ids:
                buffer_manager.remove_buffer(buffer_id)

        # Verify linear memory scaling (within reasonable tolerance)
        for measurement in memory_measurements[1:]:
            expected_per_buffer = 8  # 8KB per buffer
            actual_per_buffer = measurement["memory_per_buffer_kb"]

            # Allow up to 50% overhead for buffer management
            assert (
                actual_per_buffer < expected_per_buffer * 1.5
            ), f"Memory usage too high: {actual_per_buffer:.2f}KB per buffer"

            # Memory should not be excessively high
            assert (
                measurement["memory_increase_mb"] < 100
            ), f"Memory usage excessive: {measurement['memory_increase_mb']:.2f}MB for {measurement['buffer_count']} buffers"


class TestRealTimeProcessingPerformance:
    """Performance tests for Real-Time Processing."""

    @pytest.fixture
    def processor(self):
        """Create a real-time processor for testing."""
        config = {
            "buffer_size": 512,
            "sample_rate": 44100,
            "channels": 2,
            "max_latency": 100,
        }
        return RealTimeProcessor(config)

    def test_audio_processing_latency(self, processor):
        """Test audio processing latency meets requirements."""
        processor.start()

        try:
            buffer_sizes = [128, 256, 512, 1024, 2048]
            latency_measurements = []

            for buffer_size in buffer_sizes:
                # Generate test audio data
                audio_data = np.random.randint(
                    -32768, 32767, buffer_size, dtype=np.int16
                )

                # Measure processing time
                start_time = time.perf_counter()
                result = processor.process_buffer(audio_data, buffer_size)
                end_time = time.perf_counter()

                processing_time_ms = (end_time - start_time) * 1000
                latency_measurements.append(
                    {
                        "buffer_size": buffer_size,
                        "processing_time_ms": processing_time_ms,
                        "latency_per_sample_us": (processing_time_ms * 1000)
                        / buffer_size,
                    }
                )

                # Verify result is valid
                assert result is not None
                assert len(result) == buffer_size

                # Verify latency is acceptable (should be much less than buffer duration)
                buffer_duration_ms = (buffer_size / 44100) * 1000
                assert (
                    processing_time_ms < buffer_duration_ms * 0.5
                ), f"Processing time too high: {processing_time_ms:.2f}ms for {buffer_duration_ms:.2f}ms buffer"

            # Verify latency scales reasonably with buffer size
            small_buffer_latency = latency_measurements[0]["processing_time_ms"]
            large_buffer_latency = latency_measurements[-1]["processing_time_ms"]

            # Latency should not increase disproportionately
            latency_ratio = large_buffer_latency / small_buffer_latency
            buffer_size_ratio = buffer_sizes[-1] / buffer_sizes[0]

            assert (
                latency_ratio < buffer_size_ratio * 1.5
            ), f"Latency scaling poor: {latency_ratio:.2f}x latency for {buffer_size_ratio:.2f}x buffer size"

        finally:
            processor.stop()

    def test_continuous_processing_performance(self, processor):
        """Test performance of continuous audio processing."""
        processor.start()

        try:
            duration_seconds = 10  # Test for 10 seconds
            buffer_size = 512
            target_latency_ms = (
                (buffer_size / 44100) * 1000 * 0.5
            )  # 50% of buffer duration

            processed_buffers = 0
            processing_times = []
            start_time = time.time()

            while time.time() - start_time < duration_seconds:
                # Generate audio data
                audio_data = np.random.randint(
                    -32768, 32767, buffer_size, dtype=np.int16
                )

                # Process with timing
                process_start = time.perf_counter()
                result = processor.process_buffer(audio_data, buffer_size)
                process_end = time.perf_counter()

                processing_time_ms = (process_end - process_start) * 1000
                processing_times.append(processing_time_ms)
                processed_buffers += 1

                # Verify result
                assert result is not None
                assert len(result) == buffer_size

                # Small delay to simulate real-time processing
                time.sleep(0.001)  # 1ms delay

            # Analyze performance
            avg_processing_time = statistics.mean(processing_times)
            max_processing_time = max(processing_times)
            p95_processing_time = sorted(processing_times)[
                int(len(processing_times) * 0.95)
            ]

            actual_duration = time.time() - start_time
            throughput = processed_buffers / actual_duration

            # Performance assertions
            assert (
                avg_processing_time < target_latency_ms
            ), f"Average processing time too high: {avg_processing_time:.2f}ms"
            assert (
                max_processing_time < target_latency_ms * 2
            ), f"Maximum processing time too high: {max_processing_time:.2f}ms"
            assert (
                p95_processing_time < target_latency_ms * 1.5
            ), f"95th percentile processing time too high: {p95_processing_time:.2f}ms"
            assert (
                throughput > 100
            ), f"Processing throughput too low: {throughput:.2f} buffers/sec"

        finally:
            processor.stop()

    def test_plugin_chain_performance(self, processor):
        """Test performance with multiple plugins in chain."""
        processor.start()

        try:
            # Add multiple mock plugins to create processing chain
            num_plugins = 10
            plugins = []

            for i in range(num_plugins):
                plugin = Mock()
                plugin.process.return_value = np.ones(512) * (i + 1)
                plugin.get_parameters.return_value = []

                processor.add_plugin(f"plugin_{i}", plugin)
                plugins.append(plugin)

            # Test processing performance with plugin chain
            buffer_size = 512
            processing_times = []

            for _ in range(100):  # Run enough iterations for stable measurement
                audio_data = np.random.randint(
                    -32768, 32767, buffer_size, dtype=np.int16
                )

                start_time = time.perf_counter()
                result = processor.process_buffer(audio_data, buffer_size)
                end_time = time.perf_counter()

                processing_time_ms = (end_time - start_time) * 1000
                processing_times.append(processing_time_ms)

                assert result is not None
                assert len(result) == buffer_size

            # Analyze performance
            avg_processing_time = statistics.mean(processing_times)
            max_processing_time = max(processing_times)

            # Performance should remain reasonable even with plugin chain
            target_latency_ms = (buffer_size / 44100) * 1000  # Buffer duration

            assert (
                avg_processing_time < target_latency_ms
            ), f"Average processing time with {num_plugins} plugins too high: {avg_processing_time:.2f}ms"
            assert (
                max_processing_time < target_latency_ms * 2
            ), f"Maximum processing time with {num_plugins} plugins too high: {max_processing_time:.2f}ms"

            # Verify all plugins were called
            for plugin in plugins:
                assert plugin.process.call_count > 0, "Plugin was not called"

        finally:
            processor.stop()


class TestValidationSystemPerformance:
    """Performance tests for validation system."""

    def test_large_dataset_validation_performance(self):
        """Test validation performance with large datasets."""
        dataset_sizes = [100, 1000, 5000, 10000]
        validation_times = []

        for size in dataset_sizes:
            # Generate large dataset
            audio_data = np.random.randint(-32768, 32767, size, dtype=np.int16)

            with performance_monitor(f"validate_audio_data_size_{size}") as monitor:
                # Perform validation
                validate_audio_data(audio_data)

            # Calculate throughput after context manager exits
            throughput = size / monitor.metrics.execution_time

            validation_times.append(
                {
                    "dataset_size": size,
                    "execution_time": monitor.metrics.execution_time,
                    "throughput_samples_per_sec": throughput,
                }
            )

            # Verify performance is reasonable
            assert (
                monitor.metrics.execution_time < 1.0
            ), f"Validation took too long for {size} samples: {monitor.metrics.execution_time:.3f}s"
            assert (
                throughput > 10000
            ), f"Validation throughput too low: {throughput:.0f} samples/sec"

        # Verify performance scales reasonably
        small_dataset_perf = validation_times[0]["throughput_samples_per_sec"]
        large_dataset_perf = validation_times[-1]["throughput_samples_per_sec"]

        # Performance should not degrade significantly with larger datasets
        perf_ratio = large_dataset_perf / small_dataset_perf
        assert (
            perf_ratio > 0.5
        ), f"Performance degradation too severe: {perf_ratio:.2f}x"

    def test_repeated_validation_performance(self):
        """Test performance of repeated validation operations."""
        num_validations = 1000
        validation_times = []

        # Test data
        audio_data = np.random.randint(-32768, 32767, 1024, dtype=np.int16)

        with performance_monitor("repeated_validation") as monitor:
            for i in range(num_validations):
                start_time = time.perf_counter()

                # Perform various validations
                validate_audio_data(audio_data)
                validate_buffer_size(1024)
                validate_sample_rate(44100)

                end_time = time.perf_counter()
                validation_times.append(end_time - start_time)

        # Analyze performance
        avg_validation_time = statistics.mean(validation_times) * 1000  # ms
        max_validation_time = max(validation_times) * 1000  # ms
        total_throughput = (
            num_validations * 3 / monitor.metrics.execution_time
        )  # 3 validations per iteration

        # Performance assertions
        assert (
            avg_validation_time < 1.0
        ), f"Average validation time too high: {avg_validation_time:.3f}ms"
        assert (
            max_validation_time < 5.0
        ), f"Maximum validation time too high: {max_validation_time:.3f}ms"
        assert (
            total_throughput > 1000
        ), f"Validation throughput too low: {total_throughput:.0f} validations/sec"


class TestSystemLoadPerformance:
    """System-wide load and performance tests."""

    def test_high_concurrency_load(self):
        """Test system performance under high concurrency."""
        num_threads = 20
        operations_per_thread = 100
        results = []

        def cpu_intensive_operation(thread_id: int) -> dict[str, Any]:
            """Perform CPU-intensive operations."""
            thread_results = {
                "thread_id": thread_id,
                "operations": 0,
                "errors": 0,
                "time": 0,
                "peak_memory_mb": 0,
            }

            start_time = time.time()
            initial_memory = psutil.Process().memory_info().rss / 1024 / 1024
            peak_memory = initial_memory

            try:
                for i in range(operations_per_thread):
                    # Simulate audio processing operations
                    audio_data = np.random.randint(-32768, 32767, 1024, dtype=np.int16)

                    # Validation operations
                    validate_audio_data(audio_data)
                    validate_buffer_size(1024)
                    validate_sample_rate(44100)

                    # Mathematical operations
                    processed_data = audio_data * 0.5
                    processed_data = np.fft.fft(processed_data[:512])  # FFT on subset

                    # Memory tracking
                    current_memory = psutil.Process().memory_info().rss / 1024 / 1024
                    peak_memory = max(peak_memory, current_memory)

                    thread_results["operations"] += 1

                    # Small delay to simulate real processing
                    time.sleep(0.001)

            except Exception as e:
                thread_results["errors"] += 1
                logging.error(f"Thread {thread_id} error: {e}")

            thread_results["time"] = time.time() - start_time
            thread_results["peak_memory_mb"] = peak_memory - initial_memory
            return thread_results

        with performance_monitor("high_concurrency_load") as monitor:
            with ThreadPoolExecutor(max_workers=num_threads) as executor:
                futures = [
                    executor.submit(cpu_intensive_operation, i)
                    for i in range(num_threads)
                ]
                thread_results = [future.result() for future in as_completed(futures)]

            # Analyze results
            total_operations = sum(result["operations"] for result in thread_results)
            total_errors = sum(result["errors"] for result in thread_results)
            avg_thread_time = statistics.mean(
                result["time"] for result in thread_results
            )
            max_memory_per_thread = max(
                result["peak_memory_mb"] for result in thread_results
            )

            total_throughput = total_operations / monitor.metrics.execution_time

            # Performance assertions
            assert total_errors == 0, f"Unexpected errors under load: {total_errors}"
            assert (
                total_throughput > 500
            ), f"System throughput too low under load: {total_throughput:.0f} ops/sec"
            assert (
                avg_thread_time < 10.0
            ), f"Average thread time too high: {avg_thread_time:.2f}s"
            assert (
                max_memory_per_thread < 50
            ), f"Peak memory per thread too high: {max_memory_per_thread:.2f}MB"
            assert (
                monitor.metrics.memory_usage_mb < 200
            ), f"Total memory usage too high: {monitor.metrics.memory_usage_mb:.2f}MB"

    def test_memory_leak_detection(self):
        """Test for memory leaks under sustained load."""
        iterations = 10
        memory_measurements = []

        for iteration in range(iterations):
            # Force garbage collection
            gc.collect()

            # Measure initial memory
            initial_memory = psutil.Process().memory_info().rss / 1024 / 1024

            # Perform memory-intensive operations
            buffers = []
            for i in range(100):
                # Create large audio data
                audio_data = np.random.randint(-32768, 32767, 10000, dtype=np.int16)

                # Validate and process
                validate_audio_data(audio_data)
                processed_data = audio_data * 0.8

                # Store some data (but should be cleaned up)
                if i % 10 == 0:
                    buffers.append(processed_data.copy())

            # Measure final memory
            final_memory = psutil.Process().memory_info().rss / 1024 / 1024
            memory_increase = final_memory - initial_memory

            memory_measurements.append(
                {
                    "iteration": iteration,
                    "memory_increase_mb": memory_increase,
                    "final_memory_mb": final_memory,
                }
            )

            # Explicit cleanup
            del buffers
            gc.collect()

            # Small delay between iterations
            time.sleep(0.1)

        # Analyze memory usage pattern
        memory_increases = [m["memory_increase_mb"] for m in memory_measurements]
        avg_memory_increase = statistics.mean(memory_increases)
        max_memory_increase = max(memory_increases)

        # Memory usage should be stable (no significant growth trend)
        memory_trend = np.polyfit(range(len(memory_increases)), memory_increases, 1)[0]

        # Memory leak assertions
        assert (
            avg_memory_increase < 50
        ), f"Average memory increase too high: {avg_memory_increase:.2f}MB"
        assert (
            max_memory_increase < 100
        ), f"Maximum memory increase too high: {max_memory_increase:.2f}MB"
        assert (
            abs(memory_trend) < 5
        ), f"Memory usage trending upward (potential leak): {memory_trend:.2f}MB/iteration"

    def test_cpu_utilization_bottlenecks(self):
        """Test CPU utilization and identify bottlenecks."""
        duration_seconds = 5
        cpu_measurements = []

        def cpu_monitor():
            """Monitor CPU usage during test."""
            while time.time() - start_time < duration_seconds:
                cpu_percent = psutil.cpu_percent(interval=0.1)
                cpu_measurements.append(cpu_percent)
                time.sleep(0.1)

        # Start CPU monitoring
        start_time = time.time()
        monitor_thread = threading.Thread(target=cpu_monitor)
        monitor_thread.start()

        # Perform CPU-intensive operations
        operations = 0
        while time.time() - start_time < duration_seconds:
            # Audio processing operations
            audio_data = np.random.randint(-32768, 32767, 2048, dtype=np.int16)

            # Mathematical operations
            processed_data = audio_data.astype(np.float32) / 32768.0
            fft_result = np.fft.fft(processed_data)
            filtered_result = fft_result.copy()
            filtered_result[
                len(filtered_result) // 4 : 3 * len(filtered_result) // 4
            ] = 0
            ifft_result = np.fft.ifft(filtered_result)

            # Validation operations
            validate_audio_data(audio_data)

            operations += 1

        # Wait for monitoring to finish
        monitor_thread.join()

        # Analyze CPU usage
        avg_cpu = statistics.mean(cpu_measurements)
        max_cpu = max(cpu_measurements)
        min_cpu = min(cpu_measurements)
        cpu_std = statistics.stdev(cpu_measurements)

        # Performance metrics
        total_time = time.time() - start_time
        throughput = operations / total_time

        # CPU utilization assertions
        assert avg_cpu > 10, f"CPU utilization too low: {avg_cpu:.1f}%"
        assert (
            avg_cpu < 90
        ), f"CPU utilization too high (possible inefficiency): {avg_cpu:.1f}%"
        assert cpu_std < 30, f"CPU usage too variable: {cpu_std:.1f}% std dev"
        assert (
            throughput > 50
        ), f"Operations throughput too low: {throughput:.0f} ops/sec"


if __name__ == "__main__":
    # Configure logging for performance tests
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
    )

    pytest.main([__file__, "-v", "-s"])

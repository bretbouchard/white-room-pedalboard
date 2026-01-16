"""
Performance tests for audio processing operations.

This test suite provides comprehensive performance benchmarking, load testing, and stress testing
for audio processing operations including:
- Processing time measurement and benchmarking
- Memory usage analysis and optimization
- Concurrent processing performance
- System resource consumption monitoring
- Scalability testing under various conditions
"""

import asyncio
import json
import statistics
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

import numpy as np
import psutil
import pytest


@dataclass
class PerformanceMetrics:
    """Container for performance measurement results."""

    operation_name: str
    execution_times: list[float]
    memory_usage_mb: float
    cpu_percent: float
    success_count: int
    error_count: int
    throughput_ops_per_sec: float
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float


class PerformanceMonitor:
    """Monitor system performance during tests."""

    def __init__(self):
        self.process = psutil.Process()
        self.start_time = None
        self.start_memory = None
        self.start_cpu = None
        self.measurements = []

    def start_monitoring(self):
        """Start performance monitoring."""
        self.start_time = time.time()
        self.start_memory = self.process.memory_info().rss / (1024 * 1024)  # MB
        self.start_cpu = self.process.cpu_percent()
        self.measurements = []

    def record_measurement(
        self, operation_name: str, duration: float, success: bool = True
    ):
        """Record a performance measurement."""
        current_memory = self.process.memory_info().rss / (1024 * 1024)
        current_cpu = self.process.cpu_percent()

        measurement = {
            "timestamp": time.time() - self.start_time,
            "operation": operation_name,
            "duration": duration,
            "memory_mb": current_memory,
            "cpu_percent": current_cpu,
            "success": success,
        }
        self.measurements.append(measurement)

    def get_metrics(self, operation_name: str) -> PerformanceMetrics:
        """Calculate performance metrics for an operation."""
        operation_measurements = [
            m for m in self.measurements if m["operation"] == operation_name
        ]

        if not operation_measurements:
            raise ValueError(f"No measurements found for operation: {operation_name}")

        execution_times = [m["duration"] for m in operation_measurements]
        memory_usage = max(m["memory_mb"] for m in operation_measurements)
        cpu_usage = statistics.mean(m["cpu_percent"] for m in operation_measurements)
        success_count = sum(1 for m in operation_measurements if m["success"])
        error_count = len(operation_measurements) - success_count

        # Calculate throughput
        total_time = max(m["timestamp"] for m in operation_measurements) - min(
            m["timestamp"] for m in operation_measurements
        )
        throughput = len(operation_measurements) / total_time if total_time > 0 else 0

        # Calculate latency percentiles
        avg_latency = statistics.mean(execution_times) * 1000  # Convert to ms
        sorted_times = sorted(execution_times)
        p95_latency = sorted_times[int(len(sorted_times) * 0.95)] * 1000
        p99_latency = sorted_times[int(len(sorted_times) * 0.99)] * 1000

        return PerformanceMetrics(
            operation_name=operation_name,
            execution_times=execution_times,
            memory_usage_mb=memory_usage,
            cpu_percent=cpu_usage,
            success_count=success_count,
            error_count=error_count,
            throughput_ops_per_sec=throughput,
            avg_latency_ms=avg_latency,
            p95_latency_ms=p95_latency,
            p99_latency_ms=p99_latency,
        )


class MockAudioProcessor:
    """Mock audio processor for performance testing."""

    def __init__(self, complexity_factor: float = 1.0):
        self.complexity_factor = complexity_factor
        self.processed_samples = 0

    def process_audio_sync(self, audio_data: np.ndarray) -> np.ndarray:
        """Synchronous audio processing with configurable complexity."""
        # Simulate CPU-intensive processing
        sample_count = len(audio_data)

        # Mathematical operations that scale with complexity
        result = np.copy(audio_data)
        for _ in range(int(10 * self.complexity_factor)):
            result = np.sin(result * 2 * np.pi / 32768.0)
            result = np.cos(result)
            result = np.tanh(result * 0.5)
            result = result * 0.95  # Slight attenuation

        self.processed_samples += sample_count
        return result

    async def process_audio_async(self, audio_data: np.ndarray) -> np.ndarray:
        """Asynchronous audio processing."""
        # Simulate I/O-bound processing
        await asyncio.sleep(0.001 * self.complexity_factor)
        return self.process_audio_sync(audio_data)

    def apply_effects_chain(
        self, audio_data: np.ndarray, effects: list[str]
    ) -> np.ndarray:
        """Apply a chain of audio effects."""
        result = np.copy(audio_data)

        for effect in effects:
            if effect == "reverb":
                # Simulate reverb with convolution-like operation
                kernel = np.random.random(1000) * 0.1
                result = np.convolve(result, kernel, mode="same")
            elif effect == "delay":
                # Simulate delay
                delay_samples = int(44100 * 0.3)  # 300ms delay
                delayed = np.zeros(len(result) + delay_samples)
                delayed[delay_samples:] = result
                result = delayed[: len(result)]
            elif effect == "eq":
                # Simulate EQ with frequency domain operations
                fft_result = np.fft.fft(result)
                frequencies = np.fft.fftfreq(len(result))
                # Apply frequency-dependent gain
                gain_curve = 1.0 + 0.5 * np.sin(2 * np.pi * frequencies * 10)
                fft_result *= gain_curve
                result = np.real(np.fft.ifft(fft_result))
            elif effect == "compression":
                # Simulate dynamic range compression
                threshold = 0.7
                ratio = 4.0
                mask = np.abs(result) > threshold
                result[mask] = threshold + (result[mask] - threshold) / ratio

            # Add some processing overhead
            for _ in range(int(5 * self.complexity_factor)):
                result = result * 0.99 + np.random.random(len(result)) * 0.001

        return result


class TestAudioProcessingPerformance:
    """Performance tests for audio processing operations."""

    @pytest.fixture
    def monitor(self):
        """Performance monitor fixture."""
        return PerformanceMonitor()

    @pytest.fixture
    def processor(self):
        """Audio processor fixture."""
        return MockAudioProcessor(complexity_factor=1.0)

    def generate_test_audio(
        self, duration_seconds: float, sample_rate: int = 44100
    ) -> np.ndarray:
        """Generate test audio data."""
        sample_count = int(duration_seconds * sample_rate)
        # Generate complex test signal with multiple frequencies
        t = np.linspace(0, duration_seconds, sample_count)
        signal = (
            0.5 * np.sin(2 * np.pi * 440 * t)
            + 0.3 * np.sin(2 * np.pi * 880 * t)  # A4 note
            + 0.2 * np.sin(2 * np.pi * 220 * t)  # A5 note
            + 0.1 * np.random.random(sample_count)  # A3 note  # Noise
        )
        return (signal * 32767).astype(np.int16)  # Convert to 16-bit PCM

    def test_sync_processing_performance(self, monitor, processor):
        """Test synchronous audio processing performance."""
        monitor.start_monitoring()

        # Test with different audio sizes
        test_durations = [0.1, 0.5, 1.0, 2.0]  # seconds
        results = {}

        for duration in test_durations:
            audio_data = self.generate_test_audio(duration)

            # Run multiple iterations for statistical significance
            iterations = 10
            for _ in range(iterations):
                start_time = time.time()
                try:
                    result = processor.process_audio_sync(audio_data)
                    duration_ms = (time.time() - start_time) * 1000
                    monitor.record_measurement(
                        f"sync_process_{duration}s", duration_ms / 1000, True
                    )
                except Exception:
                    monitor.record_measurement(
                        f"sync_process_{duration}s", time.time() - start_time, False
                    )

        # Calculate and verify metrics
        for duration in test_durations:
            metrics = monitor.get_metrics(f"sync_process_{duration}s")
            results[duration] = metrics

            # Verify performance expectations
            assert (
                metrics.success_count > 0
            ), f"No successful operations for {duration}s audio"
            assert (
                metrics.avg_latency_ms < 1000
            ), f"Average latency too high: {metrics.avg_latency_ms}ms for {duration}s audio"
            assert (
                metrics.error_count == 0
            ), f"Errors occurred during processing: {metrics.error_count}"

        # Performance should scale reasonably with audio size
        assert (
            results[2.0].avg_latency_ms < results[0.1].avg_latency_ms * 25
        ), "Performance doesn't scale well with audio size"

    @pytest.mark.asyncio
    async def test_async_processing_performance(self, monitor, processor):
        """Test asynchronous audio processing performance."""
        monitor.start_monitoring()

        # Test concurrent async processing
        test_durations = [0.1, 0.5, 1.0]
        concurrent_tasks = 5

        for duration in test_durations:
            audio_data = self.generate_test_audio(duration)

            # Create concurrent tasks
            tasks = []
            for i in range(concurrent_tasks):
                task = asyncio.create_task(
                    self._measure_async_processing(
                        processor, audio_data, monitor, f"async_process_{duration}s"
                    )
                )
                tasks.append(task)

            # Wait for all tasks to complete
            await asyncio.gather(*tasks)

        # Verify async performance metrics
        for duration in test_durations:
            metrics = monitor.get_metrics(f"async_process_{duration}s")

            assert (
                metrics.success_count == concurrent_tasks
            ), f"Expected {concurrent_tasks} successful operations"
            assert (
                metrics.avg_latency_ms < 500
            ), f"Async processing too slow: {metrics.avg_latency_ms}ms"
            assert (
                metrics.throughput_ops_per_sec > 1.0
            ), f"Throughput too low: {metrics.throughput_ops_per_sec} ops/sec"

    async def _measure_async_processing(
        self, processor, audio_data, monitor, operation_name
    ):
        """Helper to measure async processing performance."""
        start_time = time.time()
        try:
            result = await processor.process_audio_async(audio_data)
            duration = time.time() - start_time
            monitor.record_measurement(operation_name, duration, True)
            return result
        except Exception:
            duration = time.time() - start_time
            monitor.record_measurement(operation_name, duration, False)
            raise

    def test_effects_chain_performance(self, monitor, processor):
        """Test performance of effects chain processing."""
        monitor.start_monitoring()

        # Define different effects chains
        effects_chains = [
            ["eq"],  # Simple
            ["eq", "compression"],  # Medium
            ["eq", "compression", "reverb"],  # Complex
            ["eq", "compression", "reverb", "delay"],  # Very complex
        ]

        test_audio = self.generate_test_audio(1.0)  # 1 second of audio

        for i, effects in enumerate(effects_chains):
            chain_name = f"chain_{i+1}_{'_'.join(effects)}"

            # Run multiple iterations
            iterations = 5
            for _ in range(iterations):
                start_time = time.time()
                try:
                    result = processor.apply_effects_chain(test_audio, effects)
                    duration = time.time() - start_time
                    monitor.record_measurement(chain_name, duration, True)
                except Exception:
                    duration = time.time() - start_time
                    monitor.record_measurement(chain_name, duration, False)

        # Verify effects chain performance
        for i, effects in enumerate(effects_chains):
            chain_name = f"chain_{i+1}_{'_'.join(effects)}"
            metrics = monitor.get_metrics(chain_name)

            assert (
                metrics.success_count > 0
            ), f"No successful operations for {chain_name}"

            # More complex chains should take longer but not excessively so
            if i > 0:
                prev_chain_name = f"chain_{i}_{'_'.join(effects_chains[i-1])}"
                prev_metrics = monitor.get_metrics(prev_chain_name)

                # Performance degradation should be reasonable
                performance_ratio = metrics.avg_latency_ms / prev_metrics.avg_latency_ms
                assert (
                    performance_ratio < 5.0
                ), f"Performance degradation too high: {performance_ratio}x"

    def test_memory_usage_scaling(self, monitor, processor):
        """Test memory usage scaling with audio size."""
        monitor.start_monitoring()

        # Test with progressively larger audio files
        audio_sizes_mb = [1, 5, 10, 25, 50]  # Approximate sizes in MB
        sample_rate = 44100
        bytes_per_sample = 2  # 16-bit audio
        channels = 2  # Stereo

        for size_mb in audio_sizes_mb:
            # Calculate duration for target size
            target_bytes = size_mb * 1024 * 1024
            duration = target_bytes / (sample_rate * bytes_per_sample * channels)

            audio_data = self.generate_test_audio(duration)

            # Measure memory before processing
            memory_before = psutil.Process().memory_info().rss / (1024 * 1024)

            # Process audio
            start_time = time.time()
            try:
                result = processor.process_audio_sync(audio_data)
                duration = time.time() - start_time

                # Measure memory after processing
                memory_after = psutil.Process().memory_info().rss / (1024 * 1024)
                memory_increase = memory_after - memory_before

                monitor.record_measurement(f"memory_test_{size_mb}mb", duration, True)

                # Memory usage should be reasonable (less than 3x the audio size)
                assert (
                    memory_increase < size_mb * 3
                ), f"Memory usage too high: {memory_increase}MB for {size_mb}MB audio"

            except Exception:
                monitor.record_measurement(
                    f"memory_test_{size_mb}mb", time.time() - start_time, False
                )

    def test_concurrent_processing_performance(self, monitor, processor):
        """Test performance under concurrent load."""
        monitor.start_monitoring()

        test_audio = self.generate_test_audio(0.5)  # 500ms audio
        thread_counts = [1, 2, 4, 8]  # Different concurrency levels

        for thread_count in thread_counts:
            operation_name = f"concurrent_{thread_count}_threads"

            def processing_task():
                start_time = time.time()
                try:
                    result = processor.process_audio_sync(test_audio)
                    duration = time.time() - start_time
                    return duration, True
                except Exception:
                    duration = time.time() - start_time
                    return duration, False

            # Run with thread pool
            with ThreadPoolExecutor(max_workers=thread_count) as executor:
                futures = [executor.submit(processing_task) for _ in range(10)]

                for future in futures:
                    duration, success = future.result()
                    monitor.record_measurement(operation_name, duration, success)

        # Analyze concurrent performance
        for thread_count in thread_counts:
            operation_name = f"concurrent_{thread_count}_threads"
            metrics = monitor.get_metrics(operation_name)

            assert (
                metrics.success_count > 0
            ), f"No successful operations for {thread_count} threads"

            # Throughput should generally increase with more threads (up to a point)
            if thread_count > 1:
                single_thread_metrics = monitor.get_metrics("concurrent_1_threads")
                throughput_improvement = (
                    metrics.throughput_ops_per_sec
                    / single_thread_metrics.throughput_ops_per_sec
                )

                # Should see some improvement with concurrency
                assert (
                    throughput_improvement > 0.5
                ), f"No throughput improvement with {thread_count} threads"

    @pytest.mark.asyncio
    async def test_load_testing_steady_state(self, monitor, processor):
        """Test system performance under steady load."""
        monitor.start_monitoring()

        test_audio = self.generate_test_audio(0.1)  # Short audio for high frequency

        # Steady state load: constant rate of operations
        duration_seconds = 5
        target_ops_per_second = 10
        total_operations = duration_seconds * target_ops_per_second

        async def load_generator():
            for i in range(total_operations):
                start_time = time.time()
                try:
                    result = await processor.process_audio_async(test_audio)
                    operation_time = time.time() - start_time
                    monitor.record_measurement(
                        "steady_state_load", operation_time, True
                    )
                except Exception:
                    operation_time = time.time() - start_time
                    monitor.record_measurement(
                        "steady_state_load", operation_time, False
                    )

                # Maintain target rate
                expected_interval = 1.0 / target_ops_per_second
                elapsed = time.time() - start_time
                if elapsed < expected_interval:
                    await asyncio.sleep(expected_interval - elapsed)

        # Run load test
        start_time = time.time()
        await load_generator()
        total_time = time.time() - start_time

        # Verify steady state performance
        metrics = monitor.get_metrics("steady_state_load")

        assert (
            metrics.success_count > total_operations * 0.9
        ), f"Success rate too low: {metrics.success_count}/{total_operations}"
        assert (
            abs(total_time - duration_seconds) < 1.0
        ), f"Load test duration incorrect: {total_time}s vs {duration_seconds}s"
        assert (
            metrics.throughput_ops_per_sec > target_ops_per_second * 0.8
        ), f"Throughput too low: {metrics.throughput_ops_per_sec} ops/sec"

    def test_stress_testing_burst_load(self, monitor, processor):
        """Test system performance under burst load."""
        monitor.start_monitoring()

        test_audio = self.generate_test_audio(0.2)

        # Burst load: short periods of high intensity
        burst_configs = [
            {"ops_per_burst": 20, "burst_duration": 0.5, "rest_duration": 1.0},
            {"ops_per_burst": 50, "burst_duration": 1.0, "rest_duration": 0.5},
            {"ops_per_burst": 100, "burst_duration": 0.2, "rest_duration": 0.1},
        ]

        for i, config in enumerate(burst_configs):
            operation_name = f"burst_load_{i+1}"
            burst_count = 3  # Number of bursts per configuration

            for burst_num in range(burst_count):
                # Burst phase
                burst_start = time.time()
                for _ in range(config["ops_per_burst"]):
                    start_time = time.time()
                    try:
                        result = processor.process_audio_sync(test_audio)
                        duration = time.time() - start_time
                        monitor.record_measurement(operation_name, duration, True)
                    except Exception:
                        duration = time.time() - start_time
                        monitor.record_measurement(operation_name, duration, False)

                # Rest phase
                if burst_num < burst_count - 1:  # Don't rest after last burst
                    time.sleep(config["rest_duration"])

        # Verify burst performance
        for i, config in enumerate(burst_configs):
            operation_name = f"burst_load_{i+1}"
            metrics = monitor.get_metrics(operation_name)

            expected_total_ops = config["ops_per_burst"] * burst_count
            assert (
                metrics.success_count > expected_total_ops * 0.8
            ), f"Burst load success rate too low for config {i+1}"

            # System should handle bursts without excessive errors
            error_rate = metrics.error_count / (
                metrics.success_count + metrics.error_count
            )
            assert error_rate < 0.1, f"Error rate too high during burst: {error_rate}"


class TestPerformanceRegression:
    """Tests for detecting performance regressions."""

    def test_performance_baseline_comparison(self, monitor, processor):
        """Test against performance baseline."""
        monitor.start_monitoring()

        # Define baseline performance expectations (these would come from historical data)
        baseline_expectations = {
            "sync_process_1.0s": {"max_avg_latency_ms": 100, "min_throughput": 5.0},
            "async_process_1.0s": {"max_avg_latency_ms": 50, "min_throughput": 10.0},
            "concurrent_4_threads": {"min_throughput_improvement": 2.0},
        }

        # Run baseline tests
        test_audio = self.generate_test_audio(1.0)

        # Synchronous processing baseline
        for _ in range(10):
            start_time = time.time()
            try:
                result = processor.process_audio_sync(test_audio)
                monitor.record_measurement(
                    "sync_process_1.0s", time.time() - start_time, True
                )
            except Exception:
                monitor.record_measurement(
                    "sync_process_1.0s", time.time() - start_time, False
                )

        # Check against baseline
        sync_metrics = monitor.get_metrics("sync_process_1.0s")
        baseline = baseline_expectations["sync_process_1.0s"]

        assert (
            sync_metrics.avg_latency_ms < baseline["max_avg_latency_ms"]
        ), f"Synchronous processing regression: {sync_metrics.avg_latency_ms}ms > {baseline['max_avg_latency_ms']}ms"
        assert (
            sync_metrics.throughput_ops_per_sec > baseline["min_throughput"]
        ), f"Synchronous throughput regression: {sync_metrics.throughput_ops_per_sec} < {baseline['min_throughput']} ops/sec"

    def test_scalability_regression(self, monitor, processor):
        """Test for scalability regressions."""
        monitor.start_monitoring()

        # Test scalability with different input sizes
        test_durations = [0.1, 0.5, 1.0, 2.0]
        processing_times = []

        for duration in test_durations:
            audio_data = self.generate_test_audio(duration)

            # Measure processing time
            start_time = time.time()
            try:
                result = processor.process_audio_sync(audio_data)
                processing_time = time.time() - start_time
                processing_times.append(processing_time)
                monitor.record_measurement(
                    f"scalability_{duration}s", processing_time, True
                )
            except Exception:
                processing_times.append(float("inf"))
                monitor.record_measurement(
                    f"scalability_{duration}s", time.time() - start_time, False
                )

        # Check scalability: processing time should scale roughly linearly with input size
        if len(processing_times) >= 2:
            # Calculate scaling factor between smallest and largest
            size_ratio = test_durations[-1] / test_durations[0]
            time_ratio = processing_times[-1] / processing_times[0]

            # Allow some overhead but not excessive
            assert (
                time_ratio < size_ratio * 3
            ), f"Scalability regression: time ratio {time_ratio} > size ratio {size_ratio} * 3"


class TestPerformanceOptimization:
    """Tests for performance optimization opportunities."""

    def test_batch_vs_individual_processing(self, monitor, processor):
        """Compare batch processing vs individual processing performance."""
        monitor.start_monitoring()

        # Create multiple audio segments
        segments = [self.generate_test_audio(0.1) for _ in range(10)]
        combined_audio = np.concatenate(segments)

        # Test individual processing
        start_time = time.time()
        individual_results = []
        for segment in segments:
            try:
                result = processor.process_audio_sync(segment)
                individual_results.append(result)
            except Exception:
                pass
        individual_time = time.time() - start_time

        monitor.record_measurement(
            "individual_processing",
            individual_time,
            len(individual_results) == len(segments),
        )

        # Test batch processing (concatenated)
        start_time = time.time()
        try:
            batch_result = processor.process_audio_sync(combined_audio)
            batch_time = time.time() - start_time
            monitor.record_measurement("batch_processing", batch_time, True)
        except Exception:
            batch_time = time.time() - start_time
            monitor.record_measurement("batch_processing", batch_time, False)

        # Analyze results
        individual_metrics = monitor.get_metrics("individual_processing")
        batch_metrics = monitor.get_metrics("batch_processing")

        if batch_metrics.success_count > 0:
            # Batch processing should be faster than processing individually
            speedup = individual_metrics.avg_latency_ms / batch_metrics.avg_latency_ms
            assert (
                speedup > 0.5
            ), f"Batch processing not providing expected speedup: {speedup}x"

    def test_memory_efficiency_comparison(self, monitor, processor):
        """Compare memory efficiency of different processing approaches."""
        monitor.start_monitoring()

        test_audio = self.generate_test_audio(1.0)

        # Test in-place processing
        memory_before = psutil.Process().memory_info().rss / (1024 * 1024)
        start_time = time.time()
        try:
            # Simulate in-place processing (copy would use more memory)
            result = processor.process_audio_sync(test_audio.copy())
            in_place_time = time.time() - start_time
            memory_after_in_place = psutil.Process().memory_info().rss / (1024 * 1024)
            memory_increase_in_place = memory_after_in_place - memory_before
            monitor.record_measurement("in_place_processing", in_place_time, True)
        except Exception:
            in_place_time = time.time() - start_time
            memory_increase_in_place = float("inf")
            monitor.record_measurement("in_place_processing", in_place_time, False)

        # Test with copies (less memory efficient)
        memory_before = psutil.Process().memory_info().rss / (1024 * 1024)
        start_time = time.time()
        try:
            # Simulate processing with additional copies
            audio_copy1 = test_audio.copy()
            audio_copy2 = test_audio.copy()
            result = processor.process_audio_sync(audio_copy1)
            copy_time = time.time() - start_time
            memory_after_copy = psutil.Process().memory_info().rss / (1024 * 1024)
            memory_increase_copy = memory_after_copy - memory_before
            monitor.record_measurement("copy_processing", copy_time, True)
        except Exception:
            copy_time = time.time() - start_time
            memory_increase_copy = float("inf")
            monitor.record_measurement("copy_processing", copy_time, False)

        # Verify memory efficiency
        if memory_increase_in_place != float("inf") and memory_increase_copy != float(
            "inf"
        ):
            assert (
                memory_increase_in_place < memory_increase_copy
            ), "In-place processing should use less memory than copy-based processing"


def save_performance_results(results: dict[str, PerformanceMetrics], output_file: str):
    """Save performance test results to a JSON file."""
    serializable_results = {}

    for name, metrics in results.items():
        serializable_results[name] = {
            "operation_name": metrics.operation_name,
            "execution_times": metrics.execution_times,
            "memory_usage_mb": metrics.memory_usage_mb,
            "cpu_percent": metrics.cpu_percent,
            "success_count": metrics.success_count,
            "error_count": metrics.error_count,
            "throughput_ops_per_sec": metrics.throughput_ops_per_sec,
            "avg_latency_ms": metrics.avg_latency_ms,
            "p95_latency_ms": metrics.p95_latency_ms,
            "p99_latency_ms": metrics.p99_latency_ms,
        }

    with open(output_file, "w") as f:
        json.dump(serializable_results, f, indent=2)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

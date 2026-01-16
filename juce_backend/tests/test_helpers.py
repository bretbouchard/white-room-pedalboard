"""
Test helper functions and fixtures for improved test maintainability.

This module provides common utilities, fixtures, and helper functions
that can be shared across different test modules to reduce duplication
and improve test organization.
"""

import asyncio
import tempfile
import time
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import numpy as np
import psutil
import pytest


# Test Data Generators
def generate_test_audio(
    duration_seconds: float = 1.0,
    sample_rate: int = 44100,
    channels: int = 1,
    signal_type: str = "sine",
) -> np.ndarray:
    """
    Generate test audio data with specified parameters.

    Args:
        duration_seconds: Length of audio in seconds
        sample_rate: Sample rate in Hz
        channels: Number of audio channels
        signal_type: Type of signal ("sine", "noise", "complex")

    Returns:
        Generated audio data as numpy array
    """
    sample_count = int(duration_seconds * sample_rate)
    t = np.linspace(0, duration_seconds, sample_count)

    if signal_type == "sine":
        # Simple sine wave at 440Hz (A4)
        data = np.sin(2 * np.pi * 440 * t)
    elif signal_type == "noise":
        # White noise
        data = np.random.random(sample_count) * 2 - 1
    elif signal_type == "complex":
        # Complex signal with multiple frequencies
        data = (
            0.5 * np.sin(2 * np.pi * 440 * t)
            + 0.3 * np.sin(2 * np.pi * 880 * t)  # A4
            + 0.2 * np.sin(2 * np.pi * 220 * t)  # A5
            + 0.1 * np.random.random(sample_count)  # A3  # Noise
        )
    else:
        raise ValueError(f"Unknown signal type: {signal_type}")

    # Handle multiple channels
    if channels > 1:
        data = np.column_stack([data] * channels)

    return (data * 32767).astype(np.int16)  # Convert to 16-bit PCM


def generate_invalid_json_examples() -> list[str]:
    """Generate various examples of invalid JSON for testing."""
    return [
        "",  # Empty string
        "{",  # Incomplete object
        "[",  # Incomplete array
        '{"key": "value"',  # Missing closing brace
        '{"key": "value",}',  # Trailing comma
        '{"key": }',  # Missing value
        '{"key": "value" "key2": "value2"}',  # Missing comma
        "undefined",  # JavaScript undefined
        '{"key": undefined}',  # Undefined value in JSON
        "key=value",  # Not JSON format
        "<xml>test</xml>",  # XML instead of JSON
    ]


def create_mock_service(
    delay: float = 0.1, failure_rate: float = 0.0, should_timeout: bool = False
) -> AsyncMock:
    """
    Create a mock service with configurable behavior.

    Args:
        delay: Simulated processing delay
        failure_rate: Probability of failure (0.0 to 1.0)
        should_timeout: Whether service should timeout

    Returns:
        Mock async service
    """
    mock_service = AsyncMock()

    async def mock_call(*args, **kwargs):
        if should_timeout:
            await asyncio.sleep(10.0)  # Long delay to simulate timeout
            raise TimeoutError("Service timeout")

        await asyncio.sleep(delay)

        if np.random.random() < failure_rate:
            raise ConnectionError("Service temporarily unavailable")

        return {"status": "success", "data": args[0] if args else {}}

    mock_service.call.side_effect = mock_call
    return mock_service


# Performance Monitoring Helpers
class PerformanceMonitor:
    """Monitor system performance during tests."""

    def __init__(self):
        self.process = psutil.Process()
        self.start_time = None
        self.start_memory = None
        self.measurements = []

    def start_monitoring(self):
        """Start performance monitoring."""
        self.start_time = time.time()
        self.start_memory = self.process.memory_info().rss / (1024 * 1024)  # MB
        self.measurements = []

    def record_measurement(
        self, operation_name: str, duration: float, success: bool = True
    ):
        """Record a performance measurement."""
        current_memory = self.process.memory_info().rss / (1024 * 1024)
        measurement = {
            "timestamp": time.time() - self.start_time,
            "operation": operation_name,
            "duration": duration,
            "memory_mb": current_memory,
            "success": success,
        }
        self.measurements.append(measurement)

    def get_memory_usage(self) -> float:
        """Get current memory usage in MB."""
        return self.process.memory_info().rss / (1024 * 1024)

    def get_average_latency(self, operation_name: str) -> float:
        """Get average latency for a specific operation."""
        operation_measurements = [
            m
            for m in self.measurements
            if m["operation"] == operation_name and m["success"]
        ]
        if not operation_measurements:
            return 0.0
        return statistics.mean([m["duration"] for m in operation_measurements])


# File System Helpers
class TempFileManager:
    """Manage temporary files for testing."""

    def __init__(self):
        self.temp_files = []

    def create_temp_file(self, content: bytes, suffix: str = ".tmp") -> Path:
        """Create a temporary file with given content."""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_file.write(content)
        temp_file.close()

        file_path = Path(temp_file.name)
        self.temp_files.append(file_path)
        return file_path

    def create_temp_audio_file(self, duration_seconds: float = 1.0) -> Path:
        """Create a temporary audio file."""
        audio_data = generate_test_audio(duration_seconds)
        return self.create_temp_file(audio_data.tobytes(), ".wav")

    def cleanup(self):
        """Clean up all temporary files."""
        for temp_file in self.temp_files:
            try:
                temp_file.unlink()
            except FileNotFoundError:
                pass
        self.temp_files.clear()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()


# Resource Management Helpers
class ResourceTracker:
    """Track resource usage during tests."""

    def __init__(self):
        self.initial_memory = psutil.Process().memory_info().rss
        self.initial_fd_count = len(psutil.Process().open_files())

    def get_memory_increase(self) -> int:
        """Get memory increase in bytes."""
        current_memory = psutil.Process().memory_info().rss
        return current_memory - self.initial_memory

    def get_fd_increase(self) -> int:
        """Get file descriptor increase."""
        current_fd_count = len(psutil.Process().open_files())
        return current_fd_count - self.initial_fd_count

    def assert_no_leaks(
        self, max_memory_increase_mb: int = 50, max_fd_increase: int = 5
    ):
        """Assert that no significant resource leaks occurred."""
        memory_increase_mb = self.get_memory_increase() / (1024 * 1024)
        fd_increase = self.get_fd_increase()

        assert (
            memory_increase_mb < max_memory_increase_mb
        ), f"Memory leak detected: {memory_increase_mb:.2f}MB increase"
        assert (
            fd_increase < max_fd_increase
        ), f"File descriptor leak detected: {fd_increase} descriptors"


# Async Testing Helpers
class AsyncTestCase:
    """Base class for async test cases with common utilities."""

    @pytest.fixture
    async def event_loop(self):
        """Provide event loop for async tests."""
        return asyncio.get_event_loop()

    async def assert_eventually(
        self, condition_func, timeout: float = 5.0, interval: float = 0.1
    ):
        """
        Assert that a condition becomes true within timeout.

        Args:
            condition_func: Function that returns True when condition is met
            timeout: Maximum time to wait
            interval: Check interval
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            if condition_func():
                return
            await asyncio.sleep(interval)

        raise AssertionError(f"Condition not met within {timeout} seconds")

    async def run_with_timeout(self, coro, timeout: float):
        """
        Run coroutine with timeout and return result or raise TimeoutError.

        Args:
            coro: Coroutine to run
            timeout: Timeout in seconds

        Returns:
            Result of coroutine

        Raises:
            TimeoutError: If coroutine doesn't complete within timeout
        """
        try:
            return await asyncio.wait_for(coro, timeout=timeout)
        except asyncio.TimeoutError:
            raise TimeoutError(f"Operation timed out after {timeout} seconds")


# Mock Data Generators
def create_mock_audio_analysis() -> dict[str, Any]:
    """Create a mock audio analysis result."""
    return {
        "duration": 2.5,
        "sample_rate": 44100,
        "channels": 2,
        "peak_level": -3.2,
        "rms_level": -12.8,
        "spectral_centroid": 2500.0,
        "ai_context": {"genre": "electronic", "mood": "energetic", "tempo": 128.0},
    }


def create_mock_plugin_recommendation() -> dict[str, Any]:
    """Create a mock plugin recommendation."""
    return {
        "plugin_name": "FabFilter Pro-Q 3",
        "plugin_category": "eq",
        "reason": "Good match for audio characteristics",
        "clerk_user_id": "test_user_123",
        "parameters": [
            {"name": "frequency", "value": 1000.0, "unit": "Hz"},
            {"name": "gain", "value": 3.0, "unit": "dB"},
            {"name": "q", "value": 1.0, "unit": ""},
        ],
    }


# Assertion Helpers
def assert_valid_audio_data(audio_data: np.ndarray, min_length: int = 100):
    """Assert that audio data is valid."""
    assert isinstance(audio_data, np.ndarray), "Audio data should be numpy array"
    assert (
        len(audio_data) >= min_length
    ), f"Audio data too short: {len(audio_data)} < {min_length}"
    assert not np.any(np.isnan(audio_data)), "Audio data should not contain NaN values"
    assert not np.any(
        np.isinf(audio_data)
    ), "Audio data should not contain infinite values"


def assert_performance_within_bounds(
    actual_time: float, max_time: float, operation: str
):
    """Assert that performance is within acceptable bounds."""
    assert (
        actual_time <= max_time
    ), f"{operation} too slow: {actual_time:.3f}s > {max_time:.3f}s"


# Test Configuration
class TestConfig:
    """Configuration for test parameters."""

    # Performance thresholds
    MAX_SYNC_PROCESSING_TIME = 1.0  # seconds
    MAX_ASYNC_PROCESSING_TIME = 0.5  # seconds
    MAX_MEMORY_INCREASE_MB = 50  # MB
    MAX_FD_INCREASE = 5  # file descriptors

    # Test data sizes
    SHORT_AUDIO_DURATION = 0.1  # seconds
    MEDIUM_AUDIO_DURATION = 1.0  # seconds
    LONG_AUDIO_DURATION = 5.0  # seconds

    # Retry and timeout settings
    DEFAULT_TIMEOUT = 5.0  # seconds
    RETRY_ATTEMPTS = 3
    RETRY_BASE_DELAY = 0.1  # seconds

    # Concurrency settings
    MAX_CONCURRENT_TASKS = 10
    DEFAULT_THREAD_POOL_SIZE = 4


# Pytest Fixtures
@pytest.fixture
def test_audio():
    """Fixture providing test audio data."""
    return generate_test_audio(TestConfig.MEDIUM_AUDIO_DURATION)


@pytest.fixture
def test_audio_short():
    """Fixture providing short test audio data."""
    return generate_test_audio(TestConfig.SHORT_AUDIO_DURATION)


@pytest.fixture
def test_audio_long():
    """Fixture providing long test audio data."""
    return generate_test_audio(TestConfig.LONG_AUDIO_DURATION)


@pytest.fixture
def mock_audio_analysis():
    """Fixture providing mock audio analysis data."""
    return create_mock_audio_analysis()


@pytest.fixture
def mock_plugin_recommendation():
    """Fixture providing mock plugin recommendation."""
    return create_mock_plugin_recommendation()


@pytest.fixture
def temp_file_manager():
    """Fixture providing temporary file manager."""
    with TempFileManager() as manager:
        yield manager


@pytest.fixture
def performance_monitor():
    """Fixture providing performance monitor."""
    monitor = PerformanceMonitor()
    monitor.start_monitoring()
    yield monitor


@pytest.fixture
def resource_tracker():
    """Fixture providing resource tracker."""
    tracker = ResourceTracker()
    yield tracker
    tracker.assert_no_leaks()


# Error Testing Utilities
class ErrorSimulator:
    """Simulate various error conditions for testing."""

    @staticmethod
    def create_timeout_error():
        """Create a timeout error."""
        raise TimeoutError("Operation timed out")

    @staticmethod
    def create_connection_error():
        """Create a connection error."""
        raise ConnectionError("Unable to connect to service")

    @staticmethod
    def create_memory_error():
        """Create a memory error."""
        raise MemoryError("Out of memory")

    @staticmethod
    def create_io_error():
        """Create an I/O error."""
        raise OSError("File operation failed")

    @staticmethod
    def create_validation_error(message: str = "Invalid data"):
        """Create a validation error."""
        raise ValueError(message)


# Export commonly used items
__all__ = [
    "generate_test_audio",
    "generate_invalid_json_examples",
    "create_mock_service",
    "PerformanceMonitor",
    "TempFileManager",
    "ResourceTracker",
    "AsyncTestCase",
    "create_mock_audio_analysis",
    "create_mock_plugin_recommendation",
    "assert_valid_audio_data",
    "assert_performance_within_bounds",
    "TestConfig",
    "ErrorSimulator",
]

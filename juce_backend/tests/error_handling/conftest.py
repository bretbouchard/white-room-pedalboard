"""
Pytest configuration for error handling tests.

License: MIT
"""

import asyncio
import time
import json
import logging
import os
import sys
from pathlib import Path

import pytest

# Add src to Python path
src_path = Path(__file__).parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("tests/error_handling/test.log"),
    ],
)

# Asyncio configuration
asyncio_mode = "auto"

# Test markers
pytest.mark.parametrize(
    "test_input,expected_output",
    [
        ([1, 2, 3], [2, 4, 6]),
        ([4, 5, 6], [8, 10, 12]),
    ],
)


# Global fixtures
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Setup test environment before each test."""
    # Set test environment variables
    os.environ["TESTING"] = "true"
    os.environ["LOG_LEVEL"] = "DEBUG"

    # Create test directories if they don't exist
    test_dirs = [
        "tests/error_handling/temp",
        "tests/error_handling/logs",
        "tests/error_handling/data",
    ]

    for test_dir in test_dirs:
        Path(test_dir).mkdir(parents=True, exist_ok=True)

    yield

    # Cleanup after test
    for test_dir in test_dirs:
        try:
            import shutil

            shutil.rmtree(test_dir)
        except (OSError, PermissionError):
            pass


# Custom markers
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "edge_case: marks tests as edge case tests")
    config.addinivalue_line(
        "markers", "error_handling: marks tests as error handling tests"
    )


# Test data generators
def generate_test_audio_data(length: int = 1000, sample_rate: int = 44100) -> list:
    """Generate test audio data."""
    import math

    return [math.sin(2 * math.pi * 440 * i / sample_rate) * 0.5 for i in range(length)]


def generate_corrupted_audio_data(length: int = 1000) -> list:
    """Generate corrupted audio data for testing."""
    import random

    return [
        random.choice(
            [0.0, float("nan"), float("inf"), float("-inf"), random.uniform(-1, 1)]
        )
        for _ in range(length)
    ]


def generate_large_audio_data(size_mb: int = 10) -> list:
    """Generate large audio data for memory testing."""
    samples = int(size_mb * 1024 * 1024 / 8)  # 8 bytes per float
    return [0.0] * samples


# Mock helpers
def create_mock_dawdreamer_response(success: bool = True):
    """Create a mock DawDreamer response."""
    if success:
        return {
            "status": "success",
            "processed_samples": 1024,
            "peak_level": 0.8,
            "processing_time": 0.001,
        }
    else:
        return {
            "status": "error",
            "error": "Processing failed",
            "error_code": 500,
        }


def create_mock_plugin_info():
    """Create mock plugin information."""
    return {
        "name": "Test Plugin",
        "version": "1.0.0",
        "vendor": "Test Vendor",
        "type": "VST3",
        "parameters": [
            {
                "name": "Volume",
                "id": "volume",
                "min": 0.0,
                "max": 1.0,
                "default": 0.5,
                "type": "float",
            }
        ],
        "inputs": 2,
        "outputs": 2,
    }


def create_mock_ai_analysis():
    """Create mock AI analysis result."""
    return {
        "analysis": {
            "key": "C Major",
            "tempo": 120,
            "time_signature": "4/4",
            "mood": "happy",
        },
        "recommendations": [
            "Add some reverb for depth",
            "Consider sidechain compression",
        ],
        "confidence": 0.85,
        "processing_time": 0.123,
    }


# Error scenarios for testing
ERROR_SCENARIOS = {
    "timeout": asyncio.TimeoutError("Operation timed out"),
    "connection_error": ConnectionError("Connection failed"),
    "memory_error": MemoryError("Out of memory"),
    "value_error": ValueError("Invalid input"),
    "runtime_error": RuntimeError("Runtime error occurred"),
    "file_not_found": FileNotFoundError("File not found"),
    "permission_error": PermissionError("Permission denied"),
    "json_decode_error": json.JSONDecodeError("Invalid JSON", "", 0),
    "key_error": KeyError("Key not found"),
    "type_error": TypeError("Type mismatch"),
    "os_error": OSError("OS error"),
    "interrupted": KeyboardInterrupt("Operation interrupted"),
}


# Test utilities
def assert_no_exceptions(func, *args, **kwargs):
    """Assert that a function doesn't raise any exceptions."""
    try:
        result = func(*args, **kwargs)
        return result, None
    except Exception as e:
        return None, e


def assert_timeout(func, timeout: float, *args, **kwargs):
    """Assert that a function times out within the given timeout."""
    start_time = time.time()

    try:
        result = func(*args, **kwargs)
        end_time = time.time()
        elapsed = end_time - start_time

        if elapsed > timeout:
            return None, TimeoutError(
                f"Function completed in {elapsed:.2f}s (expected timeout)"
            )

        return result, None
    except asyncio.TimeoutError:
        return None, None  # Expected timeout
    except Exception as e:
        return None, e


def assert_memory_limit(func, max_memory_mb: float, *args, **kwargs):
    """Assert that a function doesn't exceed memory limits."""
    import os

    import psutil

    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss / (1024 * 1024)  # MB

    try:
        result = func(*args, **kwargs)

        final_memory = process.memory_info().rss / (1024 * 1024)  # MB
        memory_used = final_memory - initial_memory

        if memory_used > max_memory_mb:
            return result, MemoryError(
                f"Used {memory_used:.2f}MB (limit: {max_memory_mb}MB)"
            )

        return result, None
    except Exception as e:
        return None, e


# Async test utilities
async def assert_async_no_exceptions(func, *args, **kwargs):
    """Assert that an async function doesn't raise any exceptions."""
    try:
        result = await func(*args, **kwargs)
        return result, None
    except Exception as e:
        return None, e


async def assert_async_timeout(func, timeout: float, *args, **kwargs):
    """Assert that an async function times out within the given timeout."""
    try:
        result = await asyncio.wait_for(func(*args, **kwargs), timeout=timeout)
        return result, None
    except asyncio.TimeoutError:
        return None, None  # Expected timeout
    except Exception as e:
        return None, e


# Performance testing utilities
def measure_execution_time(func, *args, **kwargs):
    """Measure execution time of a function."""
    import time

    start_time = time.time()
    try:
        result = func(*args, **kwargs)
        end_time = time.time()
        return result, end_time - start_time
    except Exception as e:
        end_time = time.time()
        return None, end_time - start_time, e


async def measure_async_execution_time(func, *args, **kwargs):
    """Measure execution time of an async function."""
    import time

    start_time = time.time()
    try:
        result = await func(*args, **kwargs)
        end_time = time.time()
        return result, end_time - start_time
    except Exception as e:
        end_time = time.time()
        return None, end_time - start_time, e


# Assertion helpers for test validation
def assert_valid_audio_data(audio_data: list):
    """Assert that audio data is valid."""
    assert isinstance(audio_data, list), "Audio data should be a list"
    assert len(audio_data) > 0, "Audio data should not be empty"

    for i, sample in enumerate(audio_data):
        assert isinstance(sample, (int, float)), f"Sample {i} should be numeric"
        assert not (sample != sample), f"Sample {i} should not be NaN"
        assert abs(sample) < float("inf"), f"Sample {i} should not be infinite"


def assert_valid_api_response(response: dict):
    """Assert that API response is valid."""
    assert isinstance(response, dict), "Response should be a dictionary"
    assert "status" in response, "Response should have status field"
    assert response["status"] in [
        "success",
        "error",
    ], "Status should be success or error"


def assert_valid_error(error: Exception):
    """Assert that error is valid."""
    assert isinstance(error, Exception), "Should be an exception"
    assert str(error), "Error should have a message"
    assert type(error).__name__ != "Exception", "Error should have specific type"

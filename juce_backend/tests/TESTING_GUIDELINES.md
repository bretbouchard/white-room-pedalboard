# Audio Agent Testing Guidelines

This document provides guidelines and best practices for writing maintainable, reliable tests for the Audio Agent system.

## Table of Contents

1. [Test Structure and Organization](#test-structure-and-organization)
2. [Naming Conventions](#naming-conventions)
3. [Test Writing Best Practices](#test-writing-best-practices)
4. [Fixtures and Helper Functions](#fixtures-and-helper-functions)
5. [Performance Testing Guidelines](#performance-testing-guidelines)
6. [Error Handling in Tests](#error-handling-in-tests)
7. [Code Quality Standards](#code-quality-standards)
8. [Maintainability Guidelines](#maintainability-guidelines)

## Test Structure and Organization

### File Organization
```
tests/
├── unit/                    # Unit tests for individual modules
├── integration/             # Integration tests for component interactions
├── e2e/                    # End-to-end tests for complete workflows
├── performance/            # Performance and load tests
├── test_helpers.py          # Shared helper functions and fixtures
├── conftest.py             # Global pytest configuration
└── TESTING_GUIDELINES.md   # This file
```

### Test Class Organization
```python
class TestModuleName:
    """Test class with descriptive docstring."""

    def test_specific_scenario(self):
        """Test a specific scenario with clear documentation."""
        pass
```

## Naming Conventions

### Test Files
- Use descriptive names: `test_audio_processing.py`, `test_plugin_management.py`
- Prefix test files with `test_`
- Keep file names concise but descriptive

### Test Classes
- Use descriptive names: `TestAudioProcessing`, `TestPluginManagement`
- Prefix test classes with `Test`
- Focus on the module or functionality being tested

### Test Methods
- Use descriptive names: `test_audio_processing_with_reverb`, `test_plugin_parameter_validation`
- Prefix test methods with `test_`
- Use snake_case
- Name should describe what is being tested and under what conditions

### Examples
```python
# Good
class TestAudioProcessing:
    def test_sine_wave_processing_with_default_parameters(self):
        pass

# Bad
class TestAudio:
    def test_process1(self):
        pass
```

## Test Writing Best Practices

### AAA Pattern (Arrange, Act, Assert)
```python
def test_audio_processing_with_effects(self):
    # Arrange
    input_audio = generate_test_audio(duration=1.0)
    effects = ["eq", "compression"]
    processor = AudioProcessor()

    # Act
    result = processor.apply_effects(input_audio, effects)

    # Assert
    assert result is not None
    assert len(result) == len(input_audio)
    assert not np.array_equal(result, input_audio)  # Should be processed
```

### Test Independence
- Each test should be independent of others
- Tests should not rely on shared state
- Use fixtures for setup/teardown
- Avoid dependencies between tests

### Clear Test Documentation
```python
def test_plugin_parameter_validation(self):
    """
    Test that plugin parameter validation properly rejects invalid values.

    Verifies that:
    - Empty parameter names are rejected
    - Invalid numeric values are rejected
    - Missing required fields raise appropriate errors
    """
    pass
```

### Descriptive Assertions
```python
# Good
assert len(result) > 0, "Processed audio should not be empty"

# Bad
assert len(result) > 0
```

## Fixtures and Helper Functions

### Creating Reusable Fixtures
```python
@pytest.fixture
def mock_audio_processor():
    """Provide a mock audio processor for testing."""
    processor = Mock()
    processor.process.return_value = np.array([1, 2, 3])
    return processor

@pytest.fixture
def test_audio_data():
    """Provide test audio data with standard properties."""
    return generate_test_audio(duration=1.0, sample_rate=44100)
```

### Helper Functions
```python
def create_test_audio(duration: float = 1.0, **kwargs) -> np.ndarray:
    """Create test audio data with configurable parameters."""
    return generate_test_audio(duration, **kwargs)

def assert_audio_properties(audio_data, expected_length, **kwargs):
    """Assert that audio data has expected properties."""
    assert len(audio_data) >= expected_length
    assert not np.any(np.isnan(audio_data))
    # Additional assertions based on kwargs
```

## Performance Testing Guidelines

### Performance Monitoring
```python
def test_processing_performance_benchmark(self, performance_monitor):
    """Benchmark audio processing performance."""
    test_audio = create_test_audio(duration=1.0)

    performance_monitor.start_monitoring()

    start_time = time.time()
    result = process_audio(test_audio)
    processing_time = time.time() - start_time

    performance_monitor.record_measurement("processing", processing_time)

    # Assert performance meets requirements
    assert processing_time < 1.0, f"Processing too slow: {processing_time:.3f}s"
```

### Resource Usage Tracking
```python
def test_memory_usage_during_processing(self, resource_tracker):
    """Test memory usage during audio processing."""
    large_audio = create_test_audio(duration=10.0)

    # Process audio
    result = process_audio(large_audio)

    # Check for memory leaks
    resource_tracker.assert_no_leaks(max_memory_increase_mb=100)
```

## Error Handling in Tests

### Testing Error Conditions
```python
def test_connection_error_handling(self):
    """Test proper handling of connection errors."""
    with pytest.raises(ConnectionError) as exc_info:
        connect_to_service()

    # Verify error message is informative
    assert "connection" in str(exc_info.value).lower()
```

### Testing Graceful Degradation
```python
def test_graceful_degradation_on_service_failure(self):
    """Test system degrades gracefully when service fails."""
    with patch('audio_client.get_service') as mock_service:
        mock_service.side_effect = ConnectionError("Service unavailable")

        # Should fall back to cached or degraded mode
        result = get_audio_with_fallback()

        assert result is not None, "Should provide fallback result"
        assert result.quality == "degraded", "Should indicate degraded quality"
```

## Code Quality Standards

### Code Style
- Follow PEP 8 style guidelines
- Use type hints where appropriate
- Keep lines under 100 characters
- Use meaningful variable names

### Imports
```python
# Standard library imports first
import asyncio
import time
from typing import Dict, List, Optional

# Third-party imports next
import pytest
import numpy as np

# Local imports last
from src.audio_agent.core import processor
from .test_helpers import create_test_audio
```

### Documentation
```python
class AudioProcessor:
    """Audio processing component with effects chain support.

    Attributes:
        sample_rate: Audio sample rate in Hz
        buffer_size: Processing buffer size
        effects_chain: List of active effects

    Example:
        >>> processor = AudioProcessor(sample_rate=44100)
        >>> result = processor.process(audio_data)
    """

    def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024):
        """Initialize the audio processor.

        Args:
            sample_rate: Audio sample rate in Hz
            buffer_size: Processing buffer size in samples
        """
        pass
```

## Maintainability Guidelines

### Test Size
- Keep individual test functions under 50 lines
- Split complex tests into smaller, focused tests
- Use helper functions for common operations

### Duplication Reduction
- Extract common setup code into fixtures
- Create reusable helper functions
- Use parameterized tests for similar test cases

### Test Data Management
- Use factory functions for test data creation
- Clean up resources in teardown
- Use temporary files with proper cleanup

### Example: Before Refactoring
```python
def test_large_audio_processing(self):
    # Setup - duplicated across many tests
    audio_data = np.array([...] * 1000000)
    processor = AudioProcessor()

    # Test
    result = processor.process(audio_data)
    assert len(result) == len(audio_data)
```

### Example: After Refactoring
```python
@pytest.fixture
def large_audio_data():
    """Fixture providing large test audio data."""
    return np.array([...] * 1000000)

@pytest.fixture
def audio_processor():
    """Fixture providing audio processor."""
    return AudioProcessor()

def test_large_audio_processing(self, large_audio_data, audio_processor):
    """Test processing of large audio files."""
    result = audio_processor.process(large_audio_data)
    assert len(result) == len(large_audio_data)
```

## Running Tests

### Basic Test Execution
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_audio_processing.py

# Run specific test class
pytest tests/test_audio_processing.py::TestAudioProcessing

# Run specific test method
pytest tests/test_audio_processing.py::TestAudioProcessing::test_basic_processing
```

### Performance Tests
```bash
# Run performance tests with timing
pytest tests/performance/ --durations=10

# Run tests with coverage
pytest --cov=src --cov-report=html
```

### Debugging Tests
```bash
# Run with verbose output
pytest -v

# Stop on first failure
pytest -x

# Run with debugger
pytest --pdb
```

## Continuous Integration

### CI Configuration
- Ensure tests run in CI environment
- Configure appropriate timeouts for CI
- Generate coverage reports
- Set up performance regression testing

### Test Categories
- Unit tests: Fast, isolated component tests
- Integration tests: Component interaction tests
- End-to-end tests: Full workflow tests
- Performance tests: Benchmark and load tests

## Review Checklist

Before submitting tests, review:

- [ ] Test names are descriptive and follow conventions
- [ ] Tests are independent and don't rely on shared state
- [ ] Tests have clear documentation
- [ ] Assertions include descriptive messages
- [ ] Error conditions are properly tested
- [ ] Performance tests have appropriate assertions
- [ ] Resources are properly cleaned up
- [ ] Code follows style guidelines
- [ ] Tests are not overly complex
- [ ] Duplicate code is minimized

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Python Testing Best Practices](https://docs.python.org/3/library/unittest.html)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)
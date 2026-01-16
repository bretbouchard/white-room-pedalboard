# Testing Guide

This document provides comprehensive information about testing the Schillinger Audio Agent system.

## Table of Contents

1. [Test Overview](#test-overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Categories](#test-categories)
5. [Performance Testing](#performance-testing)
6. [Integration Testing](#integration-testing)
7. [Frontend Testing](#frontend-testing)
8. [Backend Testing](#backend-testing)
9. [Test Data](#test-data)
10. [CI/CD Testing](#cicd-testing)
11. [Test Coverage](#test-coverage)
12. [Best Practices](#best-practices)

## Test Overview

The Schillinger Audio Agent includes a comprehensive testing suite covering:

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: System integration and API testing
- **Performance Tests**: Performance optimization and benchmarking
- **End-to-End Tests**: Complete workflow testing
- **Load Tests**: System performance under load

## Test Structure

```
schill/audio_agent/
├── backend/
│   ├── tests/
│   │   ├── test_performance_system.py      # Performance system tests
│   │   ├── test_integration_comprehensive.py  # Integration tests
│   │   ├── test_audio_export.py             # Audio export tests
│   │   ├── test_plugins.py                  # Plugin system tests
│   │   ├── test_models_audio.py             # Audio model tests
│   │   └── conftest.py                     # Test configuration
│   └── pytest.ini                           # pytest configuration
├── frontend/
│   ├── __tests__/
│   │   ├── performance/                      # Performance component tests
│   │   │   ├── PerformanceSystem.test.tsx
│   │   │   └── ReactFlowOptimization.test.ts
│   │   ├── components/                      # Component tests
│   │   ├── services/                        # Service tests
│   │   └── utils/                           # Utility tests
│   ├── setupTests.ts                        # Test setup
│   └── vitest.config.ts                     # Vitest configuration
└── docs/
    ├── TESTING.md                            # This file
    └── performance_optimization.md          # Performance docs
```

## Running Tests

### Prerequisites

Ensure all dependencies are installed:

```bash
# Backend dependencies
cd backend
pip install -r requirements-dev.txt

# Frontend dependencies
cd frontend
npm install
```

### Running All Tests

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm test

# Combined test report
npm run test:all
```

### Running Specific Test Categories

```bash
# Backend unit tests only
pytest tests/test_performance_system.py -v

# Integration tests only
pytest tests/test_integration_comprehensive.py -v

# Performance tests only
npm run test:performance

# Frontend unit tests only
npm run test:unit

# E2E tests only
npm run test:e2e
```

### Running Tests with Coverage

```bash
# Backend coverage
cd backend
pytest --cov=src --cov-report=html tests/

# Frontend coverage
cd frontend
npm run test:coverage
```

## Test Categories

### 1. Unit Tests

Test individual functions and components in isolation.

#### Backend Unit Tests

- **Performance System**: `test_performance_system.py`
  - Rendering optimization
  - Caching functionality
  - Monitoring system
  - Profiling tools

- **Audio Export**: `test_audio_export.py`
  - Export service functionality
  - Format conversion
  - Metadata handling

- **Plugin System**: `test_plugins.py`
  - Plugin loading/unloading
  - Plugin execution
  - Plugin security

- **Models**: `test_models_*.py`
  - Data validation
  - Database operations
  - Relationship handling

#### Frontend Unit Tests

- **Components**: `__tests__/components/`
  - React component testing
  - User interaction testing
  - Props validation

- **Services**: `__tests__/services/`
  - API service testing
  - Service integration
  - Error handling

- **Utils**: `__tests__/utils/`
  - Utility function testing
  - Algorithm testing
  - Performance optimization

### 2. Integration Tests

Test system integration and API endpoints.

#### Backend Integration Tests

- **Comprehensive Integration**: `test_integration_comprehensive.py`
  - Complete workflow testing
  - API endpoint integration
  - Performance optimization integration
  - Plugin system integration

- **Cross-Component Testing**:
  - Audio export + performance optimization
  - Plugin system + workflow execution
  - Caching + large workflow handling

### 3. Performance Tests

Test system performance under various conditions.

#### Performance System Tests

```python
# Example performance test
class TestPerformanceSystem:
    def test_rendering_optimization(self):
        """Test rendering optimization with large workflows"""
        large_workflow = self.generate_large_workflow(10000)
        result = self.performance_manager.optimize_render_frame(
            large_workflow['nodes'],
            large_workflow['viewport']
        )
        assert result['performance_stats']['optimization_time_ms'] < 100
```

#### Frontend Performance Tests

```typescript
// Example performance test
describe('Performance Optimization', () => {
  test('optimizes large workflow efficiently', async () => {
    const largeWorkflow = generateLargeWorkflow(5000);
    const result = await performanceService.optimizeWorkflow(largeWorkflow);

    expect(result.success).toBe(true);
    expect(result.optimization_time_ms).toBeLessThan(100);
  });
});
```

### 4. End-to-End Tests

Test complete user workflows from start to finish.

#### E2E Test Example

```python
class TestCompleteWorkflow:
    def test_audio_project_workflow(self):
        """Test complete audio project workflow"""
        # 1. Create project
        # 2. Add tracks and regions
        # 3. Process audio
        # 4. Export project
        # 5. Verify results
        pass
```

## Performance Testing

### Performance Benchmarks

The system includes comprehensive performance benchmarking:

1. **Workflow Optimization**: Time and memory usage for workflow optimization
2. **Rendering Performance**: FPS and render time for large workflows
3. **Caching Performance**: Cache hit rates and access times
4. **API Performance**: Response times for all API endpoints
5. **Plugin Performance**: Plugin execution times and resource usage

### Performance Test Execution

```bash
# Run performance benchmarks
npm run test:performance

# Run with detailed reporting
npm run test:performance:verbose

# Generate performance report
npm run test:performance:report
```

### Performance Metrics

Key performance metrics tracked:

- **FPS**: Frames per second for React Flow rendering
- **Memory Usage**: RAM consumption during operations
- **Response Times**: API endpoint response times
- **Optimization Times**: Time taken for workflow optimization
- **Cache Hit Rates**: Cache efficiency metrics

## Integration Testing

### Test Database Setup

Integration tests use an in-memory SQLite database:

```python
# conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

@pytest.fixture(scope="session")
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
    return engine
```

### Test Data Management

Integration tests use generated test data:

```python
# Test data generators
class TestDataGenerator:
    @staticmethod
    def generate_project():
        return {
            "id": "test_project_001",
            "name": "Test Project",
            "settings": {...},
            "tracks": [...]
        }

    @staticmethod
    def generate_large_workflow(node_count=5000):
        return {
            "nodes": [...],
            "edges": [...],
            "viewport": {...}
        }
```

### API Testing

API endpoints are tested comprehensively:

```python
class TestAPIEndpoints:
    def test_project_crud_operations(self):
        """Test complete project CRUD operations"""
        # Create
        response = self.client.post("/api/projects", json=test_project)
        assert response.status_code == 200

        # Read
        response = self.client.get(f"/api/projects/{project_id}")
        assert response.status_code == 200

        # Update
        response = self.client.put(f"/api/projects/{project_id}", json=updates)
        assert response.status_code == 200

        # Delete
        response = self.client.delete(f"/api/projects/{project_id}")
        assert response.status_code == 200
```

## Frontend Testing

### Component Testing

React components are tested with React Testing Library:

```typescript
// Example component test
import { render, screen, fireEvent } from '@testing-library/react';
import PerformanceDashboard from '@/components/performance/PerformanceDashboard';

describe('PerformanceDashboard', () => {
  test('renders system metrics', async () => {
    render(<PerformanceDashboard />);

    await waitFor(() => {
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    });
  });
});
```

### Service Testing

API services are tested with mocked fetch:

```typescript
// Example service test
import performanceService from '@/services/performanceService';

// Mock fetch
global.fetch = jest.fn();

describe('PerformanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('optimizes workflow successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        optimized_nodes: []
      })
    });

    const result = await performanceService.optimizeWorkflow(workflowData);

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/performance/optimize-workflow',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('workflowData')
      })
    );
  });
});
```

### Hook Testing

React hooks are tested with custom render hook:

```typescript
// Example hook test
import { renderHook, act } from '@testing-library/react';
import { usePerformanceOptimizedFlow } from '@/utils/reactFlowOptimization';

describe('usePerformanceOptimizedFlow', () => {
  test('optimizes workflow for large node counts', () => {
    const { result } = renderHook(() =>
      usePerformanceOptimizedFlow(nodes, edges, viewport)
    );

    expect(result.current.strategy.levelOfDetail).toBe(true);
  });
});
```

## Backend Testing

### Pytest Configuration

Backend tests use pytest with comprehensive configuration:

```ini
# pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
addopts =
    -v
    --tb=short
    --strict-markers
    --disable-warnings
    --cov=src
    --cov-report=html
    --cov-report=term-missing
markers =
    unit: Unit tests
    integration: Integration tests
    performance: Performance tests
    slow: Slow tests
```

### Test Fixtures

Common test fixtures for setup and teardown:

```python
# conftest.py
import pytest
import asyncio
from unittest.mock import Mock

@pytest.fixture
def mock_audio_engine():
    """Mock audio engine for testing"""
    engine = Mock()
    engine.process.return_value = {"output": "processed_audio"}
    return engine

@pytest.fixture
def sample_project_data():
    """Sample project data for testing"""
    return {
        "id": "test_project",
        "name": "Test Project",
        "settings": {"sample_rate": 44100}
    }

@pytest.fixture
async def initialized_services():
    """Initialize all services for testing"""
    services = {}

    # Initialize services
    services["performance_manager"] = PerformanceManager()
    await services["performance_manager"].initialize()

    yield services

    # Cleanup
    await services["performance_manager"].shutdown()
```

### Async Testing

Async functions are tested with pytest-asyncio:

```python
class TestAsyncOperations:
    @pytest.mark.asyncio
    async def test_async_audio_processing(self):
        """Test async audio processing operations"""
        service = AudioProcessingService()

        result = await service.process_audio(audio_data)

        assert result["success"] is True
        assert "processed_audio" in result
```

### Mock Testing

External dependencies are mocked for isolated testing:

```python
class TestExternalDependencies:
    @patch('librosa.load')
    def test_audio_processing_with_mock(self, mock_load):
        """Test audio processing with mocked librosa"""
        mock_load.return_value = sample_audio_data

        result = process_audio_file("test.wav")

        assert result["sample_rate"] == 44100
        mock_load.assert_called_once_with("test.wav")
```

## Test Data

### Test Data Generators

Test data is generated programmatically:

```python
class TestDataGenerator:
    @staticmethod
    def generate_audio_data(sample_rate=44100, duration=1.0):
        """Generate test audio data"""
        samples = int(sample_rate * duration)
        return {
            "sample_rate": sample_rate,
            "data": [0.1 * math.sin(2 * math.pi * 440 * i / sample_rate)
                     for i in range(samples)],
            "channels": 2
        }

    @staticmethod
    def generate_workflow(node_count=100, edge_count=150):
        """Generate test workflow data"""
        nodes = [...]
        edges = [...]
        return {"nodes": nodes, "edges": edges}
```

### Test Database

Tests use an isolated in-memory database:

```python
@pytest.fixture
def test_db():
    """Create test database"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return engine
```

## CI/CD Testing

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements-dev.txt
      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --cov=src --cov-report=xml

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests
        run: |
          cd frontend
          npm test -- --coverage

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run performance benchmarks
        run: |
          npm run test:performance
```

### Test Coverage Reporting

Coverage reports are generated and uploaded:

```bash
# Generate coverage reports
pytest --cov=src --cov-report=html --cov-report=xml

# Upload coverage to service (optional)
pip install codecov
codecov
```

## Test Coverage

### Coverage Targets

- **Backend**: >80% line coverage
- **Frontend**: >70% line coverage
- **Critical Paths**: 100% coverage required

### Coverage Reports

Coverage reports are generated in multiple formats:

- **HTML**: Interactive coverage report
- **XML**: CI/CD integration
- **Terminal**: Command-line summary

### Coverage Tracking

```bash
# View coverage report
open backend/htmlcov/index.html

# Generate coverage summary
pytest --cov=src --cov-report=term-missing
```

## Best Practices

### Test Organization

1. **Descriptive Names**: Use clear, descriptive test names
2. **AAA Pattern**: Arrange-Act-Assert test structure
3. **Test Isolation**: Tests should not depend on each other
4. **Fixtures**: Use fixtures for common setup

### Test Data Management

1. **Generated Data**: Generate test data programmatically
2. **Test Cleanup**: Clean up test data after tests
3. **Environment Isolation**: Use isolated test environments
4. **Data Reuse**: Reuse test data where appropriate

### Performance Testing

1. **Benchmarking**: Establish performance baselines
2. **Regression Testing**: Monitor for performance regressions
3. **Load Testing**: Test under realistic load conditions
4. **Memory Testing**: Monitor memory usage and leaks

### Mocking Strategy

1. **External Dependencies**: Mock external services
2. **Network Calls**: Mock network requests
3. **Database**: Use test databases
4. **File System**: Use temporary files

### Error Handling

1. **Error Cases**: Test both success and error cases
2. **Edge Cases**: Test boundary conditions
3. **Validation**: Test input validation
4. **Exception Handling**: Test exception propagation

## Running Specific Tests

### Run All Tests

```bash
# All backend tests
cd backend
pytest tests/ -v

# All frontend tests
cd frontend
npm test
```

### Run Specific Test Files

```bash
# Backend
pytest tests/test_performance_system.py -v

# Frontend
npm test -- PerformanceSystem.test.tsx
```

### Run by Test Markers

```bash
# Only unit tests
pytest -m "unit" -v

# Only integration tests
pytest -m "integration" -v

# Only performance tests
pytest -m "performance" -v

# Skip slow tests
pytest -m "not slow" -v
```

### Debugging Tests

```bash
# Run with debugger
pytest --pdb tests/test_failing.py

# Run with verbose output
pytest -s -v tests/test_failing.py

# Run specific test function
pytest tests/test_performance_system.py::TestRenderingOptimizer::test_frustum_culling -v
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Check PYTHONPATH and module structure
2. **Database Errors**: Verify database setup and migrations
3. **Mock Failures**: Check mock configuration
4. **Async Errors**: Verify async/await usage

### Performance Test Issues

1. **Timeouts**: Increase test timeouts for slow operations
2. **Resource Limits**: Check system resource usage
3. **Isolation**: Ensure tests are properly isolated

### CI/CD Issues

1. **Environment Setup**: Verify CI environment configuration
2. **Dependencies**: Check dependency installation
3. **Permissions**: Verify file and directory permissions

### Test Flakiness

1. **Timing Issues**: Add appropriate waits and delays
2. **Race Conditions**: Use proper synchronization
3. **Resource Cleanup**: Ensure proper cleanup

For more specific troubleshooting, check the individual test documentation or create an issue with detailed error information.
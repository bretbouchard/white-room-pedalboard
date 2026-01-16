# Schillinger SDK Integration Tests

This document describes the comprehensive integration testing suite for the Schillinger SDK, covering all implementations and cross-platform consistency.

## Overview

The integration test suite validates:

- **API Integration**: Core SDK functionality against live/mock API
- **Authentication Flows**: All credential types and session management
- **WebSocket Real-time**: Live pattern generation and collaboration
- **Cross-Platform Consistency**: Identical behavior across TypeScript, Python, Swift, and C++
- **Environment Configuration**: Multi-environment support and feature flags

## Test Structure

```
sdk/tests/integration/
├── setup.ts                    # Test environment setup and utilities
├── api-integration.test.ts     # Core API functionality tests (27 test cases)
├── auth-integration.test.ts    # Authentication flow tests (17 test cases)
├── websocket.test.ts          # Real-time WebSocket tests (16 test cases)
├── cross-platform.test.ts     # Cross-platform consistency (10 test cases)
├── environment.test.ts        # Environment configuration tests (23 test cases)
├── run-integration-tests.ts   # TypeScript test orchestrator
├── vitest.config.ts           # Integration test configuration
└── .env.test                  # Test environment variables
```

## Running Tests

### Quick Commands

```bash
# Run all integration tests
npm run test:integration

# Run specific test suites
npm run test:integration:api
npm run test:integration:websocket
npm run test:integration:cross-platform
npm run test:integration:environment

# Run platform-specific tests
npm run test:integration:typescript
npm run test:integration:python
npm run test:integration:swift
npm run test:integration:cpp

# Run with different configurations
npm run test:integration:parallel    # Run tests in parallel
npm run test:integration:live       # Use live API instead of mock
```

### Comprehensive Test Runner

```bash
# Run all tests across all platforms
./run-integration-tests.sh

# Run specific platforms only
./run-integration-tests.sh --typescript-only
./run-integration-tests.sh --python-only
./run-integration-tests.sh --swift-only
./run-integration-tests.sh --cpp-only

# Advanced options
./run-integration-tests.sh --parallel --coverage --verbose
./run-integration-tests.sh --no-mock --help
```

## Test Categories

### 1. API Integration Tests (`api-integration.test.ts`)

**Coverage**: 27 test cases

- **Health and Connectivity** (4 tests)
  - API health endpoint connectivity
  - Network error handling
  - Timeout configuration
  - Connection resilience

- **Authentication Flow** (6 tests)
  - API key authentication
  - Clerk token authentication
  - Invalid credentials handling
  - Token refresh mechanisms
  - Logout functionality

- **Rhythm API Integration** (4 tests)
  - Rhythmic resultant generation
  - Invalid parameter handling
  - Pattern analysis
  - Reverse analysis

- **Harmony API Integration** (3 tests)
  - Chord progression generation
  - Progression analysis
  - Reverse harmony analysis

- **Composition API Integration** (3 tests)
  - Composition creation
  - Section generation
  - Composition analysis

- **Error Handling and Recovery** (3 tests)
  - Rate limiting
  - Request retries
  - Network error recovery

- **Caching and Performance** (2 tests)
  - Response caching
  - Cache TTL handling

- **Concurrent Request Handling** (2 tests)
  - Concurrent request processing
  - Request queuing

### 2. Authentication Integration Tests (`auth-integration.test.ts`)

**Coverage**: 17 test cases

- **API Key Authentication** (3 tests)
- **Clerk Token Authentication** (3 tests)
- **Admin Authentication** (2 tests)
- **Token Refresh** (2 tests)
- **Session Management** (3 tests)
- **Permission Validation** (2 tests)
- **Multi-Environment Authentication** (2 tests)

### 3. WebSocket Real-Time Tests (`websocket.test.ts`)

**Coverage**: 16 test cases

- **Connection Management** (4 tests)
  - Connection establishment
  - Connection failure handling
  - Automatic reconnection
  - Graceful disconnection

- **Real-Time Pattern Generation** (3 tests)
  - Streaming rhythm generation
  - Real-time harmony generation
  - Collaborative composition building

- **Collaborative Features** (2 tests)
  - Multi-user editing
  - Conflict resolution

- **Real-Time Analysis** (2 tests)
  - Live analysis feedback
  - Performance metrics streaming

- **Error Handling** (3 tests)
  - Malformed message handling
  - Timeout scenarios
  - Rate limiting

- **Performance** (2 tests)
  - High-frequency message streams
  - Load testing

### 4. Cross-Platform Consistency Tests (`cross-platform.test.ts`)

**Coverage**: 10 test cases

- **Mathematical Function Consistency** (3 tests)
  - Rhythmic resultant generation across platforms
  - Edge case handling
  - Harmonic analysis consistency

- **Pattern Analysis** (1 test)
  - Reverse analysis consistency

- **Error Handling Consistency** (2 tests)
  - Invalid input error handling
  - Network error consistency

- **Data Type Consistency** (2 tests)
  - Floating point precision
  - Serialization/deserialization

- **Performance Consistency** (1 test)
  - Cross-platform performance comparison

- **Platform Integration** (1 test)
  - SDK behavior validation

### 5. Environment Configuration Tests (`environment.test.ts`)

**Coverage**: 23 test cases

- **Multi-Environment Support** (4 tests)
- **Configuration Validation** (3 tests)
- **Feature Flags and Capabilities** (3 tests)
- **Resource Limits and Quotas** (3 tests)
- **Security and Compliance** (3 tests)
- **Monitoring and Observability** (3 tests)
- **Backward Compatibility** (3 tests)

## Test Environment Setup

### Mock API Server

The test suite includes a comprehensive mock API server that simulates the Schillinger System API:

- **Endpoints**: Health, authentication, rhythm, harmony, composition
- **WebSocket Support**: Real-time pattern generation and collaboration
- **Rate Limiting**: Configurable rate limiting for testing
- **Error Simulation**: Network errors, timeouts, and edge cases

### Environment Variables

Configure tests using `.env.test`:

```bash
# API endpoints
TEST_API_URL_DEV=http://localhost:8000/api/v1
TEST_WS_URL_DEV=ws://localhost:8000/ws

# Test credentials
TEST_API_KEY=test-api-key-12345
TEST_CLERK_TOKEN=test-clerk-token-12345

# Configuration
USE_MOCK_API=true
TEST_DEBUG=false
```

## Cross-Platform Testing

### Supported Platforms

1. **TypeScript/JavaScript** (Node.js)
   - Primary implementation
   - Full test coverage
   - Reference implementation

2. **Python** (3.11+)
   - Async/await support
   - Identical API surface
   - Performance benchmarking

3. **Swift** (5.9+)
   - iOS/macOS support
   - Native performance
   - Type safety validation

4. **C++** (JUCE Framework)
   - Real-time audio processing
   - Maximum performance
   - Memory safety testing

### Consistency Validation

The cross-platform tests ensure:

- **Identical Results**: Same inputs produce identical outputs
- **Error Handling**: Consistent error types and messages
- **Performance**: Comparable performance characteristics
- **Data Types**: Consistent serialization and precision

## Test Reports

### Generated Reports

- **JSON Report**: `integration-test-report.json`
- **HTML Report**: `integration-test-report.html`
- **Coverage Report**: `coverage/` directory
- **JUnit XML**: `test-reports/integration-junit.xml`

### Metrics Tracked

- **Test Execution Time**: Per test and total duration
- **Success Rate**: Pass/fail ratios by platform
- **Coverage**: Code coverage across all packages
- **Performance**: Response times and throughput
- **Cross-Platform Consistency**: Deviation metrics

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Integration Tests
on: [push, pull_request]
jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: ./run-integration-tests.sh --parallel --coverage
```

### Test Environments

- **Development**: Mock API, all features enabled
- **Staging**: Live API, production-like environment
- **Production**: Live API, production configuration

## Troubleshooting

### Common Issues

1. **Mock Server Not Starting**

   ```bash
   # Check port availability
   lsof -i :3001
   # Kill existing processes
   pkill -f "mock-api-server"
   ```

2. **Cross-Platform Tests Failing**

   ```bash
   # Validate platform SDKs
   node validate-integration-tests.js
   # Check individual platforms
   ./run-integration-tests.sh --typescript-only
   ```

3. **WebSocket Connection Issues**
   ```bash
   # Check WebSocket endpoint
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:3001/ws
   ```

### Debug Mode

Enable verbose output:

```bash
# Environment variable
export TEST_DEBUG=true

# Command line flag
./run-integration-tests.sh --verbose

# Individual test debugging
npx vitest run tests/integration/api-integration.test.ts --reporter=verbose
```

## Contributing

### Adding New Tests

1. **Create Test File**: Follow naming convention `*.test.ts`
2. **Use Test Utilities**: Import from `./setup.ts`
3. **Add to Test Suites**: Update `vitest.integration.config.ts`
4. **Update Documentation**: Add to this README

### Test Guidelines

- **Isolation**: Each test should be independent
- **Cleanup**: Always clean up resources in `afterEach`
- **Timeouts**: Use appropriate timeouts for async operations
- **Assertions**: Use descriptive assertion messages
- **Error Handling**: Test both success and failure cases

### Platform Support

To add a new platform:

1. **Create SDK Implementation**: In `packages/[platform]/`
2. **Add Test Helpers**: In `cross-platform.test.ts`
3. **Update Test Runner**: In `run-integration-tests.sh`
4. **Add CI Configuration**: Platform-specific build steps

## Performance Benchmarks

### Expected Performance

- **API Requests**: < 100ms average response time
- **WebSocket Messages**: < 10ms round-trip time
- **Pattern Generation**: < 50ms for simple patterns
- **Cross-Platform Deviation**: < 1% for mathematical functions

### Monitoring

The integration tests track performance metrics:

- Request latency percentiles (p50, p95, p99)
- Throughput (requests per second)
- Memory usage during long-running tests
- WebSocket connection stability

## Security Testing

### Authentication Security

- **Token Validation**: Proper JWT validation
- **Permission Enforcement**: Role-based access control
- **Session Management**: Secure session handling
- **Rate Limiting**: Protection against abuse

### Network Security

- **HTTPS Enforcement**: Production environment validation
- **Certificate Validation**: SSL/TLS certificate checking
- **Header Security**: Security header validation
- **Input Validation**: Malicious input protection

---

For more information, see the individual test files or run `./run-integration-tests.sh --help`.

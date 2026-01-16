# White Room Test Suite Documentation

## Overview

This document provides comprehensive documentation for the White Room test suite, covering all testing aspects from unit tests to end-to-end integration tests.

## Test Infrastructure

### Test Organization

```
white_room/
├── sdk/
│   ├── tests/
│   │   ├── fixtures/              # Test data factories
│   │   │   └── test-factories.ts
│   │   ├── utilities/             # Test helpers and utilities
│   │   │   ├── test-helpers.ts
│   │   │   └── global-setup.ts
│   │   ├── songstate/             # SongState schema tests
│   │   │   └── songstate-schema-validation.test.ts
│   │   ├── schillinger/           # Schillinger system tests
│   │   │   └── book1-rhythm-systems.test.ts
│   │   ├── integration/           # Integration tests
│   │   │   └── end-to-end-pipeline.test.ts
│   │   └── error-handling/        # Error handling tests
│   │       └── error-system-comprehensive.test.ts
│   └── package.json               # Test scripts and configuration
├── juce_backend/
│   ├── tests/
│   │   ├── audio/                 # ProjectionEngine tests
│   │   │   └── ProjectionEngineTests.cpp
│   │   └── ffi/                   # FFI bridge tests
│   │       └── FFIBridgeTests.cpp
│   └── CMakeLists.txt             # CMake test configuration
└── swift_frontend/
    └── WhiteRoomiOS/
        └── Tests/                 # Swift unit tests
```

### Test Fixtures

Located in `sdk/tests/fixtures/test-factories.ts`, providing:

- **SongState factories**: `createMinimalSchillingerSong()`, `createTypicalSchillingerSong()`
- **PerformanceState factories**: `createPianoPerformance()`, `createSATBPerformance()`, `createOrchestralPerformance()`
- **Rhythm system factories**: `createResultantRhythm()`, `createPermutationRhythm()`, `createDensityRhythm()`
- **Error scenario factories**: `createInvalidSchillingerSong()`, `createCorruptedSongModel()`

All factories support deterministic generation via seed parameter for reproducible tests.

### Test Utilities

Located in `sdk/tests/utilities/test-helpers.ts`, providing:

- **Assertion helpers**: `assertValidSongState()`, `assertPerformanceValid()`, `assertNotesSorted()`
- **Performance measurement**: `measurePerformance()`, `assertCompletesWithin()`
- **Mock objects**: `createMockPRNG()`, `createMockAudioBuffer()`, `createMockMidiNoteOn()`
- **Test runners**: `runTestWithRetries()`, `runTestWithTimeout()`
- **Coverage helpers**: `calculateCoverage()`, `generateCoverageReport()`
- **Debugging helpers**: `debugPrintSongModel()`, `debugPrintPerformance()`

## Test Categories

### 1. SDK Tests (TypeScript)

#### Schema Validation Tests
**File**: `sdk/tests/songstate/songstate-schema-validation.test.ts`

Tests all aspects of schema validation:
- Required field validation
- Type validation
- Range validation
- Reference validation
- Performance state support
- Edge cases and error scenarios

**Coverage targets**: >90% for schema validation code

#### Rhythm System Tests (Book I)
**File**: `sdk/tests/schillinger/book1-rhythm-systems.test.ts`

Tests Schillinger Book I rhythm systems:
- Resultant rhythm generation
- Permutation rhythm generation
- Density rhythm generation
- Generator validation
- Pattern consistency
- Performance and memory efficiency

**Coverage targets**: >85% for rhythm system code

### 2. ProjectionEngine Tests (C++)

#### ProjectionEngine Core Tests
**File**: `juce_backend/tests/audio/ProjectionEngineTests.cpp`

Tests ProjectionEngine functionality:
- Basic projection operations
- Validation and error handling
- Blend operations between performances
- Configuration options
- Graph structure validation
- Resource estimation
- Determinism and consistency

**Coverage targets**: >85% for ProjectionEngine code

### 3. FFI Bridge Tests (C++)

#### FFI Bridge Tests
**File**: `juce_backend/tests/ffi/FFIBridgeTests.cpp`

Tests FFI bridge between C++ and Swift:
- Serialization/deserialization
- Round-trip data preservation
- Error handling
- Performance and memory management
- Thread safety
- Cross-language integration
- Edge cases

**Coverage targets**: >85% for FFI bridge code

### 4. Error Handling Tests

#### Comprehensive Error System Tests
**File**: `sdk/tests/error-handling/error-system-comprehensive.test.ts`

Tests error handling across all components:
- Error type validation
- Error boundary behavior
- Error recovery mechanisms
- Crash prevention
- Error logging and reporting
- Error aggregation and categorization

**Coverage targets**: >90% for error handling code

### 5. Integration Tests

#### End-to-End Pipeline Tests
**File**: `sdk/tests/integration/end-to-end-pipeline.test.ts`

Tests complete pipeline integration:
- SDK → ProjectionEngine → Audio output
- Swift → FFI → JUCE backend
- Performance switching
- Cross-platform compatibility (iOS, macOS, tvOS)
- Performance and resource usage
- Error handling and recovery

**Coverage targets**: >80% for integration code paths

## Running Tests

### Local Development

#### SDK Tests (TypeScript)

```bash
cd sdk

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- songstate-schema-validation.test.ts

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Run E2E tests
npm run test:e2e
```

#### JUCE Backend Tests (C++)

```bash
cd juce_backend

# Configure build with tests
cmake -B build -DBUILD_TESTING=ON

# Build tests
cmake --build build --target tests

# Run all tests
cd build && ctest --output-on-failure

# Run specific test suite
./tests/ProjectionEngineTests

# Run with coverage
cmake -DCMAKE_CXX_FLAGS="--coverage" -B build
```

#### Swift Frontend Tests

```bash
cd swift_frontend/WhiteRoomiOS

# Run unit tests
xcodebuild test \
  -scheme WhiteRoomiOS \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  -enableCodeCoverage YES

# Run specific test
xcodebuild test \
  -scheme WhiteRoomiOS \
  -only-testing:WhiteRoomiOSTests/ProjectionEngineTests
```

### CI/CD Automation

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Manual workflow dispatch

**CI/CD Configuration**: `.github/workflows/test-suite.yml`

## Test Coverage

### Current Coverage Targets

| Component | Target | Current | Status |
|-----------|--------|---------|--------|
| SDK (TypeScript) | >85% | TBD | 🟡 |
| ProjectionEngine (C++) | >85% | TBD | 🟡 |
| FFI Bridge (C++) | >85% | TBD | 🟡 |
| Swift Frontend | >85% | TBD | 🟡 |
| **Overall** | **>85%** | **TBD** | **🟡** |

### Coverage Reports

Coverage reports are generated:
- **Locally**: Run `npm run test:coverage` in `sdk/`
- **CI/CD**: Automatically uploaded to Codecov
- **Artifacts**: Available in GitHub Actions

### Coverage Thresholds

All test suites must meet minimum coverage thresholds:
- **Unit tests**: >85% code coverage
- **Integration tests**: >80% code coverage
- **E2E tests**: >75% user journey coverage

## Performance Testing

### Performance Targets

| Operation | Target | Measured | Status |
|-----------|--------|----------|--------|
| Song serialization | <10ms | TBD | 🟡 |
| Song deserialization | <10ms | TBD | 🟡 |
| ProjectionEngine::projectSong | <50ms | TBD | 🟡 |
| FFI round-trip | <20ms | TBD | 🟡 |
| Performance switch | <100ms | TBD | 🟡 |
| Full pipeline | <100ms | TBD | 🟡 |

### Performance Tests

Performance tests are run:
- **Local**: `npm run test:performance`
- **CI/CD**: Automatic on every commit
- **Regression detection**: Fails if thresholds exceeded

## Test Data

### Test Fixtures

All test data is generated deterministically using factories:

```typescript
// Create test song with seed 42
const song = createTypicalSchillingerSong(42);

// Create test performance
const perf = createPianoPerformance(42);

// Create invalid data for error testing
const invalidSong = createInvalidSchillingerSong(42);
```

### Test Songs

Test songs of varying complexity:
- **Minimal**: 1 voice, simple rhythm
- **Typical**: 4 voices, multiple systems
- **Large**: 20 voices, complex orchestration
- **Stress**: 10,000 notes for performance testing

## Continuous Integration

### Test Jobs

CI/CD pipeline includes:
1. **SDK Tests**: TypeScript unit and integration tests
2. **JUCE Tests**: C++ unit tests with coverage
3. **Swift Tests**: iOS/macOS/tvOS unit tests
4. **FFI Tests**: Bridge serialization and integration
5. **E2E Tests**: Complete pipeline validation
6. **Performance Tests**: Regression detection
7. **Security Tests**: Vulnerability scanning

### Test Reporting

Test results are reported:
- **GitHub Actions**: Real-time status
- **Codecov**: Coverage reports and trends
- **Artifacts**: Detailed test results and logs
- **Status Checks**: PR approval requirements

## Best Practices

### Writing Tests

1. **Use test factories**: Never hardcode test data
2. **Be deterministic**: Use seeds for reproducible tests
3. **Test edge cases**: Not just happy paths
4. **Use descriptive names**: Test names should explain what they test
5. **Arrange-Act-Assert**: Structure tests clearly
6. **Mock external dependencies**: Isolate code under test
7. **Clean up resources**: Prevent memory leaks in tests

### Test Maintenance

1. **Keep tests fast**: Slow tests delay feedback
2. **Fix failing tests immediately**: Don't accumulate technical debt
3. **Update tests with code changes**: Maintain test coverage
4. **Review coverage reports**: Identify untested code
5. **Refactor test code**: Keep tests maintainable
6. **Document complex tests**: Explain testing intent

## Debugging Tests

### Local Debugging

```bash
# Run tests in verbose mode
npm test -- --verbose

# Run tests with debugger
node --inspect-brk node_modules/.bin/vitest run

# Run specific test file with logs
npm test -- songstate-schema-validation.test.ts --reporter=verbose
```

### Test Logs

Test logs are available:
- **Console output**: During test execution
- **CI/CD logs**: In GitHub Actions
- **Coverage reports**: Detailed line-by-line coverage
- **Artifacts**: Downloadable test results

## Troubleshooting

### Common Issues

#### Tests Failing Locally

1. **Clear cache**: `rm -rf node_modules/.cache`
2. **Reinstall dependencies**: `npm ci`
3. **Check Node version**: `node --version` (should be 20+)
4. **Update snapshots**: `npm test -- -u`

#### Coverage Not Generated

1. **Check coverage tool**: `npx c8 --version`
2. **Verify test execution**: Ensure tests run to completion
3. **Check file paths**: Coverage needs correct source paths
4. **Review exclusions**: Check `.nycrc` configuration

#### CI/CD Failures

1. **Check logs**: Review GitHub Actions output
2. **Compare with local**: Run same commands locally
3. **Check dependencies**: Ensure all dependencies installed
4. **Verify environment**: Check OS/runtime versions

## Contributing

### Adding New Tests

1. **Create test file**: Follow naming convention `*.test.ts` or `*.test.cpp`
2. **Use test factories**: Import from `test-factories.ts`
3. **Add test helpers**: Create reusable utilities
4. **Update documentation**: Add test description to this file
5. **Check coverage**: Verify coverage increases

### Test Review Checklist

- [ ] Tests use factories for test data
- [ ] Tests are deterministic and reproducible
- [ ] Tests cover edge cases and error scenarios
- [ ] Tests are fast (<1s per test)
- [ ] Tests have descriptive names
- [ ] Tests follow A-A-A pattern
- [ ] Tests clean up resources
- [ ] Documentation updated

## Resources

### Internal Documentation

- [Test Factories](./tests/fixtures/test-factories.ts)
- [Test Helpers](./tests/utilities/test-helpers.ts)
- [CI/CD Configuration](./.github/workflows/test-suite.yml)
- [SLC Development Philosophy](../.claude/CLAUDE.md)

### External Resources

- [Vitest Documentation](https://vitest.dev/)
- [Catch2 Documentation](https://github.com/catchorg/Catch2)
- [XCTest Documentation](https://developer.apple.com/documentation/xctest)
- [Codecov Documentation](https://docs.codecov.com/)

## Changelog

### 2026-01-15
- Created comprehensive test suite infrastructure
- Added test factories and utilities
- Implemented SDK schema validation tests
- Implemented rhythm system tests (Book I)
- Implemented ProjectionEngine tests (C++)
- Implemented FFI bridge tests (C++)
- Implemented error handling tests
- Implemented integration tests
- Created CI/CD automation
- Target: >85% test coverage

---

**Maintainer**: Test Results Analyzer Agent
**Last Updated**: 2026-01-15
**Status**: Active Development

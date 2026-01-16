# End-to-End Test Suite for White Room Audio Plugin

Comprehensive E2E testing covering the complete workflow from song authoring to audio output.

## Overview

This test suite provides:

- **100 test songs** covering all complexity levels
- **Complete workflow tests** (Author → Realize → Load → Play → Stop)
- **All 7 DSP instruments** tested
- **Console/mixing system** validation
- **Performance regression** detection
- **Cross-platform determinism** validation
- **CI/CD integration** ready

## Test Structure

```
tests/e2e/
├── framework/              # E2E testing framework
│   ├── e2e-framework.ts   # Core framework
│   └── test-song-generator.ts  # Song generator
├── test_songs/            # 100 generated test songs
├── workflows/             # Workflow tests
│   └── workflow-tests.ts
├── instruments/           # Instrument tests
│   └── instrument-tests.ts
├── console/              # Console tests (TODO)
├── performance/          # Performance tests
│   └── performance-tests.ts
├── determinism/          # Determinism tests
│   └── determinism-tests.ts
├── scripts/              # Utility scripts
│   └── generate-test-songs.ts
└── README.md             # This file
```

## Test Song Complexity Matrix

### Simple Songs (20)
- **Configuration**: 1 voice, 1 system, 10 seconds
- **Purpose**: Basic functionality validation
- **Examples**: `simple-000` through `simple-019`

### Medium Songs (30)
- **Configuration**: 4 voices, 2-3 systems, 30 seconds
- **Purpose**: Typical usage scenarios
- **Examples**: `medium-000` through `medium-029`

### Complex Songs (25)
- **Configuration**: 8+ voices, 5+ systems, 60+ seconds
- **Purpose**: Stress testing and performance validation
- **Examples**: `complex-000` through `complex-024`

### Edge Cases (10)
- **Scenarios**:
  - Empty song
  - Single note
  - Single voice
  - Maximum voices (100)
  - Maximum systems (20)
  - Minimum/maximum duration
  - All instruments
  - Complex routing
  - Extreme tempo
- **Examples**: `edge-empty`, `edge-single-note`, etc.

### Instrument-Specific Songs (7)
- **Instruments**:
  - LocalGal
  - KaneMarco
  - NexSynth
  - SamSampler
  - DrumMachine
  - BassSynth
  - PadGenerator
- **Examples**: `instrument-localgal`, `instrument-kanemarco`, etc.

### Console Routing Tests (8)
- **Configurations**:
  - Basic routing
  - Parallel buses
  - Series effects
  - Send effects
  - Automation
  - Group channels
  - External send
  - Master chain
- **Examples**: `console-basic-routing`, `console-parallel-buses`, etc.

## Running Tests

### Prerequisites

```bash
# Install dependencies
cd /Users/bretbouchard/apps/schill/white_room/sdk
npm install

# Generate test songs (first time only)
npm run test:e2e:generate
```

### Run All E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with coverage
npm run test:e2e:coverage

# Run in watch mode
npm run test:e2e:watch
```

### Run Specific Test Suites

```bash
# Workflow tests only
npm run test:e2e:workflows

# Instrument tests only
npm run test:e2e:instruments

# Performance tests only
npm run test:e2e:performance

# Determinism tests only
npm run test:e2e:determinism
```

### Run Individual Test Files

```bash
# Run specific test file
npx vitest tests/e2e/workflows/workflow-tests.ts

# Run with verbose output
npx vitest tests/e2e/workflows/workflow-tests.ts --reporter=verbose
```

## Test Categories

### 1. Workflow Tests

**File**: `workflows/workflow-tests.ts`

Tests complete user workflows:

- **Basic Workflow**: Author → Realize → Load → Play → Stop
- **Edit Workflow**: Author → Edit → Reconcile → Load
- **Performance Workflow**: Create → Switch → Play
- **Error Handling**: Graceful error recovery
- **Stress Tests**: Rapid operations

**Acceptance Criteria**:
- ✅ Complete workflow executes without errors
- ✅ Each step produces valid output
- ✅ State transitions are correct
- ✅ Errors are handled gracefully

### 2. Instrument Tests

**File**: `instruments/instrument-tests.ts`

Tests all 7 DSP instruments:

- **LocalGal**: Presets, parameter ranges, audio output
- **KaneMarco**: Modulation, timbres
- **NexSynth**: Effects chain, polyphony
- **SamSampler**: Sample types, looping, layers
- **DrumMachine**: Kits, sounds, patterns
- **BassSynth**: Low-frequency content, filter envelope
- **PadGenerator**: Evolving textures, movement parameters

**Acceptance Criteria**:
- ✅ All presets load correctly
- ✅ All parameters produce expected changes
- ✅ Audio output is generated
- ✅ Polyphony is supported
- ✅ Effects work as expected

### 3. Performance Tests

**File**: `performance/performance-tests.ts`

Validates performance characteristics:

- **CPU Usage**: Simple < 20%, Medium < 40%, Complex < 60%
- **Memory Usage**: No leaks, efficient handling
- **Latency**: Audio < 20ms, Realization < 5s
- **Throughput**: 100+ notes/second
- **Regression Detection**: Baseline comparison

**Acceptance Criteria**:
- ✅ CPU usage within thresholds
- ✅ No memory leaks
- ✅ Low latency maintained
- ✅ High throughput achieved
- ✅ No regressions from baseline

### 4. Determinism Tests

**File**: `determinism/determinism-tests.ts`

Validates deterministic behavior:

- **Seed Determinism**: Same seed → Same output (1000x)
- **Cross-Platform**: macOS = Windows = Linux
- **Binary Exact**: Note timings, velocities
- **Floating Point**: Consistent calculations
- **Concurrency**: Same output regardless of threads

**Acceptance Criteria**:
- ✅ 1000 iterations with same seed produce identical output
- ✅ All platforms produce identical output
- ✅ Binary exact match for audio/MIDI
- ✅ Floating point calculations are deterministic
- ✅ Concurrent operations are deterministic

## Test Data

### Test Song Format

Test songs are stored as JSON with the following structure:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "Test Song simple-000",
    "description": "E2E test song - simple complexity",
    "author": "E2E-Test-Generator",
    "createdAt": "2026-01-15T00:00:00.000Z",
    "tags": ["simple", "e2e-test", "localgal"]
  },
  "structure": {
    "tempo": 120,
    "timeSignature": [4, 4],
    "duration": 10,
    "key": 0,
    "scale": "major"
  },
  "systems": [...],
  "voices": [...],
  "console": {...}
}
```

### Metadata Format

Each test song has a corresponding metadata file:

```json
{
  "id": "simple-000",
  "name": "Test Song simple-000",
  "complexity": "simple",
  "duration": 10,
  "voiceCount": 1,
  "systemCount": 1,
  "instrumentTypes": ["localgal"],
  "tags": ["simple", "e2e-test", "localgal"],
  "path": "/path/to/simple-000.json"
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Generate test songs
        run: npm run test:e2e:generate

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: e2e-results-${{ matrix.os }}
          path: test-reports/
```

### Test Reports

After running tests, reports are generated in:

```
test-reports/e2e/
├── index.html              # HTML dashboard
├── summary.md              # Markdown summary
├── workflow-results.json   # Workflow test results
├── instrument-results.json # Instrument test results
├── performance-results.json # Performance metrics
└── determinism-results.json # Determinism validation
```

## Baseline Management

### Creating Baselines

```bash
# Generate new baselines
npm run test:e2e:baseline
```

### Updating Baselines

```bash
# Update baselines after intentional changes
npm run test:e2e:baseline:update
```

### Comparing to Baselines

```bash
# Compare current output to baselines
npm run test:e2e:baseline:compare
```

## Troubleshooting

### Common Issues

**Issue**: Tests timeout
- **Solution**: Increase timeout in test config or optimize test song complexity

**Issue**: Memory leaks detected
- **Solution**: Check for proper cleanup in test teardown

**Issue**: Determinism failures
- **Solution**: Check for floating point non-determinism, random number generation

**Issue**: Performance regressions
- **Solution**: Profile code, check for inefficient algorithms

### Debug Mode

```bash
# Run with debug output
DEBUG=e2e:* npm run test:e2e

# Run with verbose output
npx vitest tests/e2e/ --reporter=verbose

# Run with Node debugger
node --inspect-brk node_modules/.bin/vitest tests/e2e/
```

## Contributing

### Adding New Test Songs

1. Edit `tests/e2e/framework/test-song-generator.ts`
2. Add complexity configuration
3. Run `npm run test:e2e:generate`
4. Commit generated songs

### Adding New Test Categories

1. Create new directory under `tests/e2e/`
2. Implement test suite following existing patterns
3. Update this README
4. Add npm scripts in `package.json`

## Performance Benchmarks

### Current Baselines

| Complexity | CPU Usage | Memory | Latency | Throughput |
|------------|-----------|--------|---------|------------|
| Simple     | < 20%     | < 100MB| < 15ms  | > 200/s    |
| Medium     | < 40%     | < 200MB| < 20ms  | > 150/s    |
| Complex    | < 60%     | < 400MB| < 25ms  | > 100/s    |

## License

MIT

## Authors

White Room Development Team

---

**Last Updated**: 2026-01-15

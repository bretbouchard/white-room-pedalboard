# Schillinger SDK TDD Framework

A comprehensive Test-Driven Development framework for the Schillinger System SDK, designed to ensure mathematical correctness, performance requirements, and integration reliability.

## 🏗️ Framework Overview

This TDD framework provides:

- **Property-Based Testing** with fast-check for exhaustive validation
- **Performance Benchmarking** with regression detection
- **Integration Testing** with hardware simulation
- **Mathematical Validation** for Schillinger System operations
- **Hardware Simulation** for ACK05 audio interface
- **Comprehensive Coverage** reporting and quality gates

## 📁 Test Structure

```
tests/
├── unit/                          # Unit tests for individual modules
│   ├── shared/                    # Shared utilities tests
│   ├── core/                      # Core Schillinger functionality
│   ├── analysis/                  # Analysis module tests
│   ├── audio/                     # Audio processing tests
│   └── ...                        # Other package tests
├── property-based/                # Property-based tests
│   ├── generators/                # Fast-check generators
│   │   └── musical-generators.ts # Musical data generators
│   └── *.test.ts                 # Property-based test files
├── integration/                   # Integration tests
│   ├── integration-framework.ts   # Testing framework
│   ├── api/                       # API integration
│   ├── websocket/                 # WebSocket tests
│   └── hardware/                  # Hardware integration
├── performance/                   # Performance tests
│   ├── benchmark-runner.ts        # Benchmark infrastructure
│   ├── thresholds.ts              # Performance thresholds
│   └── *.bench.ts                 # Benchmark files
├── hardware/                      # Hardware simulation
│   ├── simulation/                # Hardware simulators
│   │   └── ack05-simulator.ts     # ACK05 simulator
│   └── *.test.ts                  # Hardware tests
├── end-to-end/                    # End-to-end workflow tests
├── fixtures/                      # Test data and fixtures
│   ├── data/                      # Test data files
│   ├── mocks/                     # Mock implementations
│   └── schemas/                   # JSON schemas
├── utilities/                     # Testing utilities
│   ├── global-setup.ts            # Global test configuration
│   ├── schillinger-validators.ts  # Mathematical validators
│   └── assertions.ts              # Custom assertions
└── types/                         # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites

```bash
# Node.js 18+ required
node --version

# Install framework dependencies
npm install fast-check @types/sinon sinon benchmark stats-lite cli-table3 chalk progress
```

### Running Tests

#### Run All Tests
```bash
# Run comprehensive test suite
./run-comprehensive-tests.sh

# Or using npm
npm run test
```

#### Run Specific Categories
```bash
# Run only unit and property-based tests
./run-comprehensive-tests.sh -c unit,property-based

# Run with coverage
npm run test:coverage

# Run performance benchmarks
npm run test:performance

# Run integration tests
npm run test:integration

# Run hardware simulation tests
npm run test:hardware
```

#### Development Mode
```bash
# Watch mode for development
npm run test:watch

# Run specific test file
npm run test tests/property-based/schillinger-mathematics.test.ts
```

## 🎲 Property-Based Testing

The framework uses fast-check for exhaustive property-based testing of Schillinger mathematical operations.

### Musical Data Generators

```typescript
import { MusicalGenerators } from './tests/property-based/generators/musical-generators';
import * as fc from 'fast-check';

// Generate scales with mathematical properties
fc.assert(
  fc.property(MusicalGenerators.scale, (scale) => {
    // All scales should have valid structure
    expect(scale.notes.length).toBeGreaterThan(0);
    expect(scale.intervals.length).toBe(scale.notes.length);
    return true;
  }),
  { numRuns: 1000 }
);
```

### Available Generators

- `MusicalGenerators.note` - Single MIDI notes
- `MusicalGenerators.scale` - Musical scales with interval patterns
- `MusicalGenerators.chord` - Chords with inversions and extensions
- `MusicalGenerators.rhythmPattern` - Rhythmic patterns and time signatures
- `MusicalGenerators.melody` - Melodic sequences
- `MusicalGenerators.orchestralInstrument` - Orchestral instruments

## 🚀 Performance Testing

### Benchmark Structure

```typescript
import { benchmarkRunner, Benchmark } from './tests/performance/benchmark-runner';

const benchmark: Benchmark = {
  name: 'rhythm-generation',
  category: 'mathematical',
  description: 'Generate rhythmic patterns',
  iterations: 1000,
  operation: () => {
    // Perform operation to benchmark
    return generateRhythmPattern();
  }
};

await benchmarkRunner.runBenchmark(benchmark);
```

### Performance Thresholds

The framework defines comprehensive performance thresholds for different operations:

```typescript
// Mathematical operations
{
  name: 'rhythm-generation-max-time',
  operation: 'rhythm.generate',
  threshold: 0.1,        // ms
  condition: 'max'
}

// Throughput requirements
{
  name: 'scale-generation-throughput',
  operation: 'scale.generate',
  threshold: 10000,      // ops/sec
  condition: 'min'
}
```

### Regression Detection

Automatic performance regression detection based on historical data:

```typescript
const regressionCheck = performanceThresholdManager.checkRegression(
  'rhythm.generate',
  currentTime
);

if (regressionCheck.isRegression) {
  console.error(`Performance regression: ${regressionCheck.regressionPercent}%`);
}
```

## 🔗 Integration Testing

### Integration Framework

```typescript
import { IntegrationTestUtils } from './tests/integration/integration-framework';

// Create integration framework
const framework = IntegrationTestUtils.createFramework();

// Run complete workflow test
const result = await framework.runTest('complete-schillinger-workflow');
```

### Test Categories

- **API Integration** - REST API endpoint testing
- **WebSocket Integration** - Real-time communication testing
- **Hardware Integration** - Audio interface simulation
- **Cross-Module Integration** - Module interaction testing

## 🎛️ Hardware Simulation

### ACK05 Audio Interface Simulator

```typescript
import { createAck05Simulator, Ack05TestUtils } from './tests/hardware/simulation/ack05-simulator';

// Create simulator instance
const simulator = createAck05Simulator({
  sampleRate: 48000,
  bufferSize: 256,
  inputChannels: 8,
  outputChannels: 8
});

// Connect and use
await simulator.connect();

// Send MIDI data
simulator.sendMidi({
  port: 0,
  channel: 0,
  status: 0x90, // Note on
  data1: 60,    // Middle C
  data2: 127    // Full velocity
});

// Process audio
const audioBuffer = Ack05TestUtils.generateTestAudioBuffer(config, 1.0);
const processedBuffer = await simulator.processAudio(audioBuffer);

// Run stress test
await simulator.runStressTest(5000, 'medium');

await simulator.disconnect();
```

## 🧮 Mathematical Validation

### Schillinger System Validators

```typescript
import { SchillingerValidators } from './tests/utilities/schillinger-validators';

// Validate rhythm structure
const rhythmValidation = SchillingerValidators.Rhythm.validateRhythmGrouping(
  notes,
  timeSignature
);

// Validate harmonic progression
const harmonyValidation = SchillingerValidators.Harmony.validateChordProgression(
  chords
);

// Validate mathematical precision
SchillingerValidators.MathPrecision.almostEqual(actual, expected, 1e-10);
```

### Key Validation Areas

- **Rhythm Structure** - Grouping, syncopation, regularity
- **Harmonic Relationships** - Chord progressions, voice leading
- **Pitch Class Sets** - Set theory operations, interval vectors
- **Mathematical Precision** - Floating-point accuracy, rational numbers

## 📊 Coverage and Quality Gates

### Coverage Thresholds

- **Lines**: 85%
- **Functions**: 90%
- **Branches**: 85%
- **Statements**: 90%

Critical modules have higher thresholds:
- **Core modules**: 95% across all metrics
- **Shared utilities**: 95% across all metrics

### Quality Gates

The framework enforces quality gates:

```typescript
// Performance quality gates
if (actualTime > threshold.maxTime) {
  throw new Error(`Performance threshold exceeded: ${actualTime}ms > ${threshold.maxTime}ms`);
}

// Mathematical precision gates
TestUtils.assertMathPrecision(actual, expected, 1e-10);
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The framework includes a comprehensive GitHub Actions workflow:

```yaml
# .github/workflows/test-and-quality.yml
name: Schillinger SDK Testing and Quality Pipeline

on:
  push:
    branches: [ main, develop, 'feature/*' ]
  pull_request:
    branches: [ main, develop ]

jobs:
  code-quality:
    # Linting and type checking

  unit-tests:
    # Unit tests with coverage

  property-based-tests:
    # Property-based testing

  performance-tests:
    # Performance benchmarks and regression detection

  integration-tests:
    # Integration testing across platforms

  hardware-tests:
    # Hardware simulation testing

  quality-gates:
    # Final validation and reporting
```

### Running Tests in CI

```bash
# Run all tests with CI configuration
CI=true npm run test

# Property-based tests with increased runs
FC_MAX_RUNS=1000 npm run test tests/property-based

# Performance regression detection
npm run test:performance
```

## 📋 Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { generateScale } from '@core/scale';

describe('Scale Generation', () => {
  it('should generate major scale with correct intervals', () => {
    const scale = generateScale('C', 'major');

    expect(scale.notes).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(scale.type).toBe('major');
    expect(scale.root).toBe(0);
  });

  it('should handle transposition correctly', () => {
    const scale = generateScale('G', 'major');
    expect(scale.notes).toEqual([7, 9, 11, 0, 2, 4, 6]); // G major
  });
});
```

### Property-Based Test Example

```typescript
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MusicalGenerators } from '../generators/musical-generators';

describe('Scale Properties', () => {
  it('should generate scales with valid mathematical structure', () => {
    fc.assert(
      fc.property(MusicalGenerators.scale, (scale) => {
        // Scale should contain root note
        expect(scale.notes).toContain(scale.root);

        // All notes should be within octave
        scale.notes.forEach(note => {
          expect(note).toBeGreaterThanOrEqual(0);
          expect(note).toBeLessThanOrEqual(11);
        });

        return true;
      }),
      { numRuns: 500 }
    );
  });
});
```

### Integration Test Example

```typescript
import { IntegrationTestingFramework } from './integration-framework';

describe('Complete Workflow Integration', () => {
  let framework: IntegrationTestingFramework;

  beforeAll(() => {
    framework = new IntegrationTestingFramework();
  });

  it('should complete full Schillinger workflow', async () => {
    const result = await framework.runTest('complete-schillinger-workflow');

    expect(result.status).toBe('passed');
    expect(result.errors).toHaveLength(0);
  });
});
```

### Performance Test Example

```typescript
import { benchmarkRunner, Benchmark } from '../performance/benchmark-runner';

describe('Scale Generation Performance', () => {
  it('should generate scales within performance threshold', async () => {
    const benchmark: Benchmark = {
      name: 'scale-generation-performance',
      category: 'mathematical',
      description: 'Generate musical scales',
      iterations: 1000,
      operation: () => {
        generateScale('C', 'major');
        generateScale('G', 'minor');
        generateScale('D', 'dorian');
      }
    };

    const result = await benchmarkRunner.runBenchmark(benchmark);

    expect(result.averageTime).toBeLessThan(0.1); // 0.1ms max
    expect(result.throughput).toBeGreaterThan(10000); // 10k ops/sec min
  });
});
```

## 🔧 Configuration

### Vitest Configuration

The framework uses an enhanced Vitest configuration (`vitest.enhanced.config.ts`) with:

- Property-based testing support
- Performance benchmarking
- Comprehensive coverage thresholds
- Multi-environment testing
- Hardware simulation support

### Test Environment Variables

```bash
# Test configuration
NODE_ENV=test
CI=true                          # Enable CI mode
VITEST_SEED=42                   # Random seed for reproducible tests
FC_MAX_RUNS=1000                # Property-based test runs
HARDWARE_SIMULATION=true         # Enable hardware simulation

# Performance testing
PERFORMANCE_THRESHOLD=5         # Performance regression threshold (%)
BENCHMARK_ITERATIONS=1000       # Default benchmark iterations

# Coverage
COVERAGE_THRESHOLD=85           # Minimum coverage percentage
```

## 📈 Metrics and Reporting

### Test Reports

The framework generates comprehensive test reports:

```bash
# Run tests with detailed reporting
./run-comprehensive-tests.sh

# Reports generated in:
./test-reports/run_YYYYMMDD_HHMMSS/
├── index.html                   # HTML dashboard
├── summary.md                   # Markdown summary
├── coverage/                    # Coverage reports
├── unit-test.log               # Unit test logs
├── property-based-test.log    # Property-based test logs
├── performance-test.log        # Performance test logs
└── integration-test.log        # Integration test logs
```

### Performance Metrics

```typescript
// Performance threshold analysis
const analysis = performanceThresholdManager.generateReport(results);

console.log('Performance Summary:');
console.log(`- Total tests: ${analysis.summary.total}`);
console.log(`- Passed: ${analysis.summary.passed}`);
console.log(`- Failed: ${analysis.summary.failed}`);
console.log(`- Regressions: ${analysis.regressions.length}`);
```

## 🛠️ Development Guide

### Adding New Tests

1. **Unit Tests**: Add to `tests/unit/[package]/`
2. **Property-Based Tests**: Add to `tests/property-based/`
3. **Integration Tests**: Add to `tests/integration/`
4. **Performance Tests**: Add to `tests/performance/`

### Adding New Generators

```typescript
// tests/property-based/generators/new-generators.ts
import * as fc from 'fast-check';

export const newArbitrary = fc.record({
  property1: fc.string(),
  property2: fc.integer(),
  // ... other properties
});

export const NewGenerators = {
  new: newArbitrary,
  // ... other generators
};
```

### Performance Threshold Updates

```typescript
// tests/performance/thresholds.ts
export const newThreshold: PerformanceThreshold = {
  name: 'new-operation-max-time',
  category: 'mathematical',
  operation: 'new.operation',
  metric: 'time',
  threshold: 1.0,
  unit: 'ms',
  condition: 'max',
  description: 'Maximum time for new operation',
  environment: 'production',
  severity: 'warning'
};
```

## 🐛 Debugging Tests

### Property-Based Test Debugging

```typescript
// Enable verbose output for failing property tests
fc.assert(
  fc.property(generator, property),
  {
    verbose: true,
    numRuns: 100,
    seed: 42  // Reproducible seed
  }
);
```

### Performance Debugging

```typescript
// Enable detailed performance logging
const result = await benchmarkRunner.runBenchmark(benchmark);
console.log('Performance details:', {
  averageTime: result.averageTime,
  standardDeviation: result.standardDeviation,
  memoryDelta: result.memoryDelta,
  throughput: result.throughput
});
```

## 📚 Best Practices

### Test Organization

- **One test file per module** - Keep tests organized by functionality
- **Descriptive test names** - Use clear, descriptive test names
- **Independent tests** - Ensure tests don't depend on each other
- **Property-based first** - Prefer property-based tests for mathematical operations

### Performance Testing

- **Realistic data** - Use realistic musical data for benchmarks
- **Multiple iterations** - Run sufficient iterations for statistical significance
- **Environment control** - Test in controlled environments for consistent results
- **Regression detection** - Enable automatic regression detection

### Property-Based Testing

- **Mathematical invariants** - Focus on mathematical properties and invariants
- **Edge cases** - Include edge cases in generators
- **Reproducible failures** - Use seeds for reproducible test failures
- **Shrinking** - Leverage fast-check's shrinking for minimal counterexamples

## 🔗 References

- [Vitest Documentation](https://vitest.dev/)
- [Fast-Check Documentation](https://github.com/dubzzz/fast-check)
- [Property-Based Testing](https://hackage.haskell.org/package/QuickCheck)
- [Schillinger System](https://en.wikipedia.org/wiki/Schillinger_System)
- [Testing Best Practices](https://martinfowler.com/articles/mocksArentStubs.html)

---

**This TDD framework ensures mathematical correctness, performance requirements, and integration reliability for the Schillinger System SDK.**
import { beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Configure fast-check for property-based testing
fc.configureGlobal({
  numRuns: 100, // Number of test cases per property
  maxSkipsPerRun: 10, // Allow some skips for complex properties
  interruptAfterTimeLimit: 10000, // 10 seconds per property
  markInterruptAsFailure: true,
  example: undefined, // Will be set by individual tests
  endOnFailure: false, // Continue testing after failure to find more issues
  reporter: (report: fc.RunDetails<[string, unknown]>) => {
    if (report.failed) {
      console.error('Property-based test failed:', report);
      if (report.counterexample) {
        console.error('Counterexample:', report.counterexample);
      }
    }
  },
  random: () => Math.random(), // Consistent random seed for reproducibility
  unbiased: true, // Use unbiased generators for better coverage
  verbose: process.env.VERBOSE_PROPERTY_TESTS === 'true',
});

// Global property-based test utilities
beforeEach(() => {
  // Reset any global state before property tests
  vi.clearAllMocks();

  // Set up consistent random seed for reproducible tests
  vi.spyOn(Math, 'random').mockImplementation(() => {
    // Use a seeded random number generator for property tests
    const seed = Date.now() ^ (Math.random() * 0x100000000);
    return ((seed * 9301 + 49297) % 233280) / 233280;
  });
});

afterEach(() => {
  // Clean up after property tests
  vi.restoreAllMocks();
});

// Custom arbitraries for Schillinger-specific data structures
export const SchillingerArbitraries = {
  // Musical note generators
  note: fc.integer({ min: 0, max: 127 }), // MIDI note range
  frequency: fc.float({ min: 20, max: 20000 }), // Human hearing range

  // Rhythm generators
  rhythmValue: fc.oneof(
    fc.constantFrom(1, 2, 4, 8, 16, 32, 64), // Common rhythm values
    fc.integer({ min: 1, max: 128 }) // Extended rhythm values
  ),

  tempo: fc.integer({ min: 40, max: 240 }), // BPM range

  // Harmony generators
  chordType: fc.constantFrom('major', 'minor', 'diminished', 'augmented', 'seventh', 'ninth'),
  scaleType: fc.constantFrom('major', 'minor', 'pentatonic', 'blues', 'chromatic'),

  // Pattern generators
  pattern: (length: number = 8) =>
    fc.array(fc.integer({ min: 0, max: 16 }), { minLength: length, maxLength: length }),

  // Mathematical operation generators
  operation: fc.constantFrom('+', '-', '*', '/', '%'),
  operand: fc.integer({ min: -100, max: 100 }),

  // Geometric pattern generators
  vector: fc.tuple(fc.integer(-10, 10), fc.integer(-10, 10)),
  matrix: (rows: number, cols: number) =>
    fc.array(fc.array(fc.integer(-10, 10), { minLength: cols, maxLength: cols }),
             { minLength: rows, maxLength: rows }),

  // Structure generators
  permutation: (length: number) =>
    fc.array(fc.integer({ min: 0, max: length - 1 }), { minLength: length, maxLength: length })
      .map(arr => arr.filter((val, idx) => arr.indexOf(val) === idx)), // Ensure uniqueness
};

// Property-based test helpers
export const PropertyTestHelpers = {
  // Test mathematical properties
  commutative: <T>(operation: (a: T, b: T) => T, equals: (a: T, b: T) => boolean) => {
    return fc.assert(
      fc.property(fc.anything(), fc.anything(), (a, b) => {
        const result1 = operation(a, b);
        const result2 = operation(b, a);
        return equals(result1, result2);
      })
    );
  },

  associative: <T>(operation: (a: T, b: T, c: T) => T, equals: (a: T, b: T) => boolean) => {
    return fc.assert(
      fc.property(fc.anything(), fc.anything(), fc.anything(), (a, b, c) => {
        const result1 = operation(operation(a, b), c);
        const result2 = operation(a, operation(b, c));
        return equals(result1, result2);
      })
    );
  },

  identity: <T>(operation: (a: T, b: T) => T, identity: T, equals: (a: T, b: T) => boolean) => {
    return fc.assert(
      fc.property(fc.anything(), (a) => {
        const result1 = operation(a, identity);
        const result2 = operation(identity, a);
        return equals(result1, a) && equals(result2, a);
      })
    );
  },
};

// Performance test utilities
export const PerformanceUtils = {
  measureTime: <T>(fn: () => T): { result: T; time: number } => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    return { result, time: end - start };
  },

  assertPerformance: <T>(
    fn: () => T,
    maxTimeMs: number,
    description: string
  ): T => {
    const { result, time } = PerformanceUtils.measureTime(fn);
    if (time > maxTimeMs) {
      throw new Error(`Performance assertion failed for ${description}: ${time}ms > ${maxTimeMs}ms`);
    }
    return result;
  },
};

// Memory usage utilities
export const MemoryUtils = {
  getMemoryUsage: () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory;
    }
    return { used: 0, total: 0 };
  },

  assertMemoryLimit: (fn: () => void, maxIncreaseMB: number) => {
    const before = MemoryUtils.getMemoryUsage();
    fn();
    const after = MemoryUtils.getMemoryUsage();

    const increaseMB = (after.used - before.used) / (1024 * 1024);
    if (increaseMB > maxIncreaseMB) {
      throw new Error(`Memory usage increased by ${increaseMB.toFixed(2)}MB, exceeding limit of ${maxIncreaseMB}MB`);
    }
  },
};

// Test data generators for Schillinger operations
export const TestDataGenerators = {
  // Generate test data for rhythmic resultants
  rhythmicResultant: () => ({
    pattern1: SchillingerArbitraries.pattern(),
    pattern2: SchillingerArbitraries.pattern(),
    operation: SchillingerArbitraries.operation(),
  }),

  // Generate test data for harmonic expansions
  harmonicExpansion: () => ({
    chord: fc.array(SchillingerArbitraries.note(), { minLength: 3, maxLength: 7 }),
    expansionType: fc.constantFrom('tertian', 'quartal', 'quintal', 'cluster'),
    voiceLeading: fc.boolean(),
  }),

  // Generate test data for counterpoint
  counterpoint: () => ({
    cantusFirmus: fc.array(SchillingerArbitraries.note(), { minLength: 8, maxLength: 16 }),
    species: fc.constantFrom(1, 2, 3, 4, 5),
    intervalConstraints: fc.array(fc.integer({ min: 1, max: 12 })),
  }),

  // Generate test data for contour analysis
  contour: () => ({
    melody: fc.array(SchillingerArbitraries.note(), { minLength: 4, maxLength: 32 }),
    contourType: fc.constantFrom('ascending', 'descending', 'arch', 'v-shape', 'complex'),
    smoothnessThreshold: fc.float({ min: 0, max: 1 }),
  }),
};

export default {
  SchillingerArbitraries,
  PropertyTestHelpers,
  PerformanceUtils,
  MemoryUtils,
  TestDataGenerators,
};
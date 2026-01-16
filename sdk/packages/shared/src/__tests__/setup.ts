import { expect } from "vitest";
/**
 * Test setup configuration for comprehensive unit tests
 * Configures global test environment and utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";

// Global test configuration
beforeAll(() => {
  // Set up global test environment
  process.env.NODE_ENV = "test";

  // Configure console for test output
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    // Filter out expected warnings during tests
    const message = args.join(" ");
    if (
      message.includes("Performance warning") ||
      message.includes("Test took")
    ) {
      return; // Suppress performance warnings in test output
    }
    originalConsoleWarn(...args);
  };

  // Enable garbage collection for memory tests if available
  if (global.gc) {
    console.log("Garbage collection enabled for memory tests");
  } else {
    console.log(
      "Garbage collection not available - run with --expose-gc for memory tests",
    );
  }
});

afterAll(() => {
  // Clean up global test environment
  console.log("Test suite completed");
});

beforeEach(() => {
  // Reset any global state before each test
  if (global.gc) {
    global.gc();
  }
});

afterEach(() => {
  // Clean up after each test
  // Force garbage collection to prevent memory leaks between tests
  if (global.gc) {
    global.gc();
  }
});

// Global test utilities
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    interface CustomMatchers<R = unknown> {
      toBeWithinRange(min: number, max: number): R;
      toBeValidRhythmPattern(): R;
      toHaveValidComplexity(): R;
    }
  }
}

// Custom matchers for domain-specific assertions
expect.extend({
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range ${min}-${max}`
          : `Expected ${received} to be within range ${min}-${max}`,
    };
  },

  toBeValidRhythmPattern(received: any) {
    const isArray = Array.isArray(received);
    const hasValidValues =
      isArray &&
      received.every(
        (v: any) => typeof v === "number" && v >= 0 && Number.isInteger(v),
      );
    const hasLength = isArray && received.length > 0;

    const pass = isArray && hasValidValues && hasLength;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to be a valid rhythm pattern`
          : `Expected ${JSON.stringify(received)} to be a valid rhythm pattern (array of non-negative integers)`,
    };
  },

  toHaveValidComplexity(received: any) {
    const hasOverall = typeof received?.overall === "number";
    const hasRhythmic = typeof received?.rhythmic === "number";
    const hasFactors =
      received?.factors && typeof received.factors === "object";
    const inRange =
      hasOverall && received.overall >= 0 && received.overall <= 1;

    const pass = hasOverall && hasRhythmic && hasFactors && inRange;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to be a valid complexity object`
          : `Expected ${JSON.stringify(received)} to be a valid complexity object with overall, rhythmic, and factors properties`,
    };
  },
});

// Performance monitoring utilities
export const performanceMonitor = {
  startTime: 0,

  start() {
    this.startTime = performance.now();
  },

  end(operation: string, maxDuration: number = 100) {
    const duration = performance.now() - this.startTime;
    if (duration > maxDuration) {
      console.warn(
        `Performance warning: ${operation} took ${duration.toFixed(2)}ms (max: ${maxDuration}ms)`,
      );
    }
    return duration;
  },

  benchmark<T>(
    _operation: string,
    fn: () => T,
    iterations: number = 1,
  ): { result: T; avgTime: number } {
    const start = performance.now();
    let result: T;

    for (let i = 0; i < iterations; i++) {
      result = fn();
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    return { result: result!, avgTime };
  },
};

// Memory monitoring utilities
export const memoryMonitor = {
  baseline: 0,

  setBaseline() {
    if (global.gc) global.gc();
    this.baseline = process.memoryUsage().heapUsed;
  },

  checkIncrease(operation: string, maxIncreaseMB: number = 10) {
    if (global.gc) global.gc();
    const current = process.memoryUsage().heapUsed;
    const increaseMB = (current - this.baseline) / (1024 * 1024);

    if (increaseMB > maxIncreaseMB) {
      console.warn(
        `Memory warning: ${operation} increased memory by ${increaseMB.toFixed(2)}MB (max: ${maxIncreaseMB}MB)`,
      );
    }

    return increaseMB;
  },
};

// Test data generators
export const testDataGenerators = {
  randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomGeneratorPair(): [number, number] {
    const a = this.randomInt(1, 16);
    let b = this.randomInt(1, 16);
    while (b === a) {
      b = this.randomInt(1, 16);
    }
    return [a, b];
  },

  randomRhythmPattern(length?: number): number[] {
    const patternLength = length || this.randomInt(4, 16);
    return Array.from({ length: patternLength }, () => this.randomInt(0, 3));
  },

  randomChordProgression(length?: number): string[] {
    const chords = ["C", "F", "G", "Am", "Dm", "Em", "Bb", "D"];
    const progressionLength = length || this.randomInt(3, 8);
    return Array.from(
      { length: progressionLength },
      () => chords[this.randomInt(0, chords.length - 1)],
    );
  },
};

// Error testing utilities
export const errorTestUtils = {
  expectValidationError(fn: () => any, field?: string) {
    expect(fn).toThrow();
    try {
      fn();
    } catch (error: any) {
      expect(error.name).toBe("ValidationError");
      if (field) {
        expect(error.field).toBe(field);
      }
    }
  },

  expectProcessingError(fn: () => any, operation?: string) {
    expect(fn).toThrow();
    try {
      fn();
    } catch (error: any) {
      expect(error.name).toBe("ProcessingError");
      if (operation) {
        expect(error.operation).toBe(operation);
      }
    }
  },
};

console.log("Test setup completed - comprehensive unit test environment ready");

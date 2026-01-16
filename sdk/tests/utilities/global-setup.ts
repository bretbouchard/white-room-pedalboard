/**
 * Global Test Setup for Schillinger SDK
 *
 * This file sets up the testing environment for all test types including:
 * - Global test utilities
 * - Mock configuration
 * - Performance monitoring
 * - Property-based testing setup
 * - Hardware simulation initialization
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

// Global test state
interface GlobalTestState {
  performanceMetrics: Map<string, number[]>;
  mockData: Map<string, any>;
  hardwareSimulators: Map<string, any>;
}

declare global {
  var __SCHILLINGER_TEST_STATE__: GlobalTestState;
  var __TEST_MEMORY_USAGE__: number;
  var __TEST_START_TIME__: number;
}

// Initialize global state
export async function setup({ provide }: any) {
  console.log("🧪 Setting up Schillinger SDK Test Environment...");

  // Initialize global test state
  const testState: GlobalTestState = {
    performanceMetrics: new Map(),
    mockData: new Map(),
    hardwareSimulators: new Map(),
  };

  // Provide global state to tests
  provide("__SCHILLINGER_TEST_STATE__", testState);

  // Note: fast-check configuration is handled in tests/property-based/setup.ts
  // using fc.configureGlobal() which is the correct API

  // Initialize performance monitoring
  global.__TEST_MEMORY_USAGE__ = process.memoryUsage().heapUsed;
  global.__TEST_START_TIME__ = Date.now();

  // Set up global error handlers
  process.on("unhandledRejection", (reason, promise) => {
    console.error("⚠️ Unhandled Promise Rejection in tests:", reason);
    console.error("Promise:", promise);
  });

  process.on("uncaughtException", (error) => {
    console.error("⚠️ Uncaught Exception in tests:", error);
  });

  console.log("✅ Test environment setup complete");
}

// Global cleanup
export async function teardown() {
  console.log("🧹 Tearing down Schillinger SDK Test Environment...");

  // Clean up global state
  if (global.__SCHILLINGER_TEST_STATE__) {
    global.__SCHILLINGER_TEST_STATE__.performanceMetrics.clear();
    global.__SCHILLINGER_TEST_STATE__.mockData.clear();
    global.__SCHILLINGER_TEST_STATE__.hardwareSimulators.clear();
  }

  // Generate test summary
  const endTime = Date.now();
  const duration = endTime - global.__TEST_START_TIME__;
  const memoryUsed =
    process.memoryUsage().heapUsed - global.__TEST_MEMORY_USAGE__;

  console.log(`📊 Test Session Summary:`);
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Memory Used: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);

  console.log("✅ Test environment teardown complete");
}

// Global setup for individual tests
beforeAll(async () => {
  // Reset test state before each test file
  if (global.__SCHILLINGER_TEST_STATE__) {
    global.__SCHILLINGER_TEST_STATE__.performanceMetrics.clear();
  }
});

beforeEach(async () => {
  // Setup before each test
  const testStart = process.hrtime.bigint();

  // Store test start time for performance measurement
  if (global.__SCHILLINGER_TEST_STATE__) {
    global.__SCHILLINGER_TEST_STATE__.performanceMetrics.set("testStart", [
      Number(testStart),
    ]);
  }
});

afterEach(async () => {
  // Cleanup after each test
  const testEnd = process.hrtime.bigint();

  // Calculate test duration
  if (global.__SCHILLINGER_TEST_STATE__) {
    const testStarts =
      global.__SCHILLINGER_TEST_STATE__.performanceMetrics.get("testStart") ||
      [];
    if (testStarts.length > 0) {
      const duration =
        Number(testEnd - BigInt(testStarts[testStarts.length - 1])) / 1000000; // Convert to ms
      const testDurations =
        global.__SCHILLINGER_TEST_STATE__.performanceMetrics.get(
          "testDurations",
        ) || [];
      testDurations.push(duration);
      global.__SCHILLINGER_TEST_STATE__.performanceMetrics.set(
        "testDurations",
        testDurations,
      );
    }
  }
});

// Global test utilities
export const TestUtils = {
  /**
   * Get current test state
   */
  getTestState(): GlobalTestState {
    if (!global.__SCHILLINGER_TEST_STATE__) {
      throw new Error(
        "Test state not initialized. Ensure global setup is running.",
      );
    }
    return global.__SCHILLINGER_TEST_STATE__;
  },

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number): void {
    const state = this.getTestState();
    const metrics = state.performanceMetrics.get(name) || [];
    metrics.push(value);
    state.performanceMetrics.set(name, metrics);
  },

  /**
   * Get performance metrics
   */
  getMetrics(name: string): number[] {
    const state = this.getTestState();
    return state.performanceMetrics.get(name) || [];
  },

  /**
   * Store mock data
   */
  setMockData(key: string, data: any): void {
    const state = this.getTestState();
    state.mockData.set(key, data);
  },

  /**
   * Get mock data
   */
  getMockData(key: string): any {
    const state = this.getTestState();
    return state.mockData.get(key);
  },

  /**
   * Register hardware simulator
   */
  registerHardwareSimulator(name: string, simulator: any): void {
    const state = this.getTestState();
    state.hardwareSimulators.set(name, simulator);
  },

  /**
   * Get hardware simulator
   */
  getHardwareSimulator(name: string): any {
    const state = this.getTestState();
    return state.hardwareSimulators.get(name);
  },

  /**
   * Calculate test statistics
   */
  calculateStats(values: number[]): {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  } {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median,
      stdDev,
    };
  },

  /**
   * Assert mathematical precision for floating point operations
   */
  assertMathPrecision(
    actual: number,
    expected: number,
    precision: number = 1e-10,
  ): void {
    const diff = Math.abs(actual - expected);
    if (diff > precision) {
      throw new Error(
        `Mathematical precision error: expected ${expected}, got ${actual} (diff: ${diff})`,
      );
    }
  },

  /**
   * Generate test data ranges for musical parameters
   */
  generateMusicalRanges() {
    return {
      tempo: { min: 40, max: 240, step: 1 },
      pitch: { min: 0, max: 127, step: 1 }, // MIDI range
      velocity: { min: 0, max: 127, step: 1 },
      duration: { min: 0.01, max: 10, step: 0.01 },
      timeSignature: {
        numerator: { min: 1, max: 16, step: 1 },
        denominator: {
          min: 1,
          max: 32,
          step: 1,
          validValues: [1, 2, 4, 8, 16, 32],
        },
      },
      keySignature: {
        sharps: { min: -7, max: 7, step: 1 },
        mode: {
          values: [
            "major",
            "minor",
            "dorian",
            "phrygian",
            "lydian",
            "mixolydian",
            "locrian",
          ],
        },
      },
    };
  },

  /**
   * Create performance assertion helper
   */
  assertPerformance(operation: () => void, maxTimeMs: number): void {
    const start = process.hrtime.bigint();
    operation();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to ms

    if (duration > maxTimeMs) {
      throw new Error(
        `Performance assertion failed: operation took ${duration}ms, expected <= ${maxTimeMs}ms`,
      );
    }

    this.recordMetric("performance", duration);
  },
};

// Export global types for use in tests
export type { GlobalTestState };

// Make TestUtils available globally
(global as any).TestUtils = TestUtils;

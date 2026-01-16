import { beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';

// Performance testing configuration
export interface PerformanceConfig {
  maxExecutionTime: number; // milliseconds
  maxMemoryIncrease: number; // MB
  minThroughput?: number; // operations per second
  warmupIterations?: number;
  sampleSize?: number;
}

// Default performance thresholds for different operation types
export const PerformanceThresholds: Record<string, PerformanceConfig> = {
  // Real-time audio operations must be very fast
  'audio-processing': {
    maxExecutionTime: 1, // 1ms for real-time audio
    maxMemoryIncrease: 10,
    minThroughput: 1000, // ops/sec
    warmupIterations: 10,
    sampleSize: 100,
  },

  // Mathematical operations
  'mathematical-operations': {
    maxExecutionTime: 10, // 10ms
    maxMemoryIncrease: 5,
    minThroughput: 100,
    warmupIterations: 5,
    sampleSize: 50,
  },

  // Pattern generation
  'pattern-generation': {
    maxExecutionTime: 100, // 100ms
    maxMemoryIncrease: 20,
    minThroughput: 10,
    warmupIterations: 3,
    sampleSize: 20,
  },

  // Analysis operations
  'analysis-operations': {
    maxExecutionTime: 500, // 500ms
    maxMemoryIncrease: 50,
    minThroughput: 2,
    warmupIterations: 2,
    sampleSize: 10,
  },

  // Large-scale operations
  'large-scale-operations': {
    maxExecutionTime: 5000, // 5 seconds
    maxMemoryIncrease: 200,
    warmupIterations: 1,
    sampleSize: 5,
  },

  // API operations
  'api-operations': {
    maxExecutionTime: 1000, // 1 second
    maxMemoryIncrease: 100,
    minThroughput: 1,
    warmupIterations: 2,
    sampleSize: 10,
  },
};

// Performance measurement utilities
export class PerformanceMeasurement {
  private measurements: number[] = [];
  private memorySnapshots: NodeJS.MemoryUsage[] = [];
  private config: PerformanceConfig;

  constructor(config: PerformanceConfig) {
    this.config = config;
  }

  async measure<T>(fn: () => T | Promise<T>): Promise<{ result: T; metrics: PerformanceMetrics }> {
    // Warmup
    if (this.config.warmupIterations && this.config.warmupIterations > 0) {
      for (let i = 0; i < this.config.warmupIterations; i++) {
        await fn();
      }
    }

    // Measure memory before
    const memoryBefore = this.getMemoryUsage();

    // Measure execution time
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();

    // Measure memory after
    const memoryAfter = this.getMemoryUsage();

    const executionTime = endTime - startTime;
    const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;

    this.measurements.push(executionTime);
    this.memorySnapshots.push(memoryAfter);

    const metrics: PerformanceMetrics = {
      executionTime,
      memoryIncrease,
      throughput: 1000 / executionTime, // ops/sec
      memoryBefore,
      memoryAfter,
      sampleSize: this.measurements.length,
      meanTime: this.calculateMean(),
      medianTime: this.calculateMedian(),
      p95Time: this.calculatePercentile(95),
      p99Time: this.calculatePercentile(99),
      standardDeviation: this.calculateStandardDeviation(),
    };

    return { result, metrics };
  }

  private getMemoryUsage(): NodeJS.MemoryUsage {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    // Fallback for non-Node environments
    return {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0,
    };
  }

  private calculateMean(): number {
    if (this.measurements.length === 0) return 0;
    return this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length;
  }

  private calculateMedian(): number {
    if (this.measurements.length === 0) return 0;
    const sorted = [...this.measurements].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculatePercentile(percentile: number): number {
    if (this.measurements.length === 0) return 0;
    const sorted = [...this.measurements].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateStandardDeviation(): number {
    if (this.measurements.length === 0) return 0;
    const mean = this.calculateMean();
    const variance = this.measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.measurements.length;
    return Math.sqrt(variance);
  }

  getReport(): PerformanceReport {
    return {
      config: this.config,
      measurements: this.measurements,
      memorySnapshots: this.memorySnapshots,
      summary: {
        sampleSize: this.measurements.length,
        meanTime: this.calculateMean(),
        medianTime: this.calculateMedian(),
        p95Time: this.calculatePercentile(95),
        p99Time: this.calculatePercentile(99),
        standardDeviation: this.calculateStandardDeviation(),
        maxMemoryIncrease: Math.max(...this.memorySnapshots.map(m => m.heapUsed)) -
                          (this.memorySnapshots[0]?.heapUsed || 0),
        passed: this.validatePerformance(),
      },
    };
  }

  private validatePerformance(): boolean {
    const mean = this.calculateMean();
    const maxMemoryIncrease = Math.max(...this.memorySnapshots.map(m => m.heapUsed)) -
                             (this.memorySnapshots[0]?.heapUsed || 0);

    return (
      mean <= this.config.maxExecutionTime &&
      maxMemoryIncrease <= this.config.maxMemoryIncrease * 1024 * 1024 && // Convert MB to bytes
      (!this.config.minThroughput || (1000 / mean) >= this.config.minThroughput)
    );
  }
}

// Performance metrics interface
export interface PerformanceMetrics {
  executionTime: number; // milliseconds
  memoryIncrease: number; // bytes
  throughput: number; // operations per second
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  sampleSize: number;
  meanTime: number;
  medianTime: number;
  p95Time: number;
  p99Time: number;
  standardDeviation: number;
}

// Performance report interface
export interface PerformanceReport {
  config: PerformanceConfig;
  measurements: number[];
  memorySnapshots: NodeJS.MemoryUsage[];
  summary: {
    sampleSize: number;
    meanTime: number;
    medianTime: number;
    p95Time: number;
    p99Time: number;
    standardDeviation: number;
    maxMemoryIncrease: number;
    passed: boolean;
  };
}

// Performance test helpers
export class PerformanceTestHelpers {
  static async assertPerformance<T>(
    fn: () => T | Promise<T>,
    category: keyof typeof PerformanceThresholds,
    description?: string
  ): Promise<T> {
    const config = PerformanceThresholds[category];
    const measurement = new PerformanceMeasurement(config);

    const { result, metrics } = await measurement.measure(fn);
    const report = measurement.getReport();

    if (!report.summary.passed) {
      const failures: string[] = [];

      if (metrics.meanTime > config.maxExecutionTime) {
        failures.push(`Mean execution time ${metrics.meanTime.toFixed(2)}ms exceeds threshold ${config.maxExecutionTime}ms`);
      }

      if (metrics.memoryIncrease > config.maxMemoryIncrease * 1024 * 1024) {
        failures.push(`Memory increase ${(metrics.memoryIncrease / 1024 / 1024).toFixed(2)}MB exceeds threshold ${config.maxMemoryIncrease}MB`);
      }

      if (config.minThroughput && metrics.throughput < config.minThroughput) {
        failures.push(`Throughput ${metrics.throughput.toFixed(2)} ops/sec below threshold ${config.minThroughput} ops/sec`);
      }

      const message = description
        ? `Performance test failed for "${description}": ${failures.join(', ')}`
        : `Performance test failed: ${failures.join(', ')}`;

      throw new Error(message);
    }

    return result;
  }

  static benchmarkFunction<T>(
    fn: () => T | Promise<T>,
    category: keyof typeof PerformanceThresholds,
    iterations: number = 10
  ): Promise<{ results: T[]; report: PerformanceReport }> {
    const config = PerformanceThresholds[category];
    const measurement = new PerformanceMeasurement(config);

    return new Promise(async (resolve) => {
      const results: T[] = [];

      for (let i = 0; i < iterations; i++) {
        const { result } = await measurement.measure(fn);
        results.push(result);
      }

      const report = measurement.getReport();
      resolve({ results, report });
    });
  }

  static comparePerformance<T>(
    fn1: () => T | Promise<T>,
    fn2: () => T | Promise<T>,
    category: keyof typeof PerformanceThresholds
  ): Promise<{ comparison: PerformanceComparison }> {
    const config = PerformanceThresholds[category];
    const measurement1 = new PerformanceMeasurement(config);
    const measurement2 = new PerformanceMeasurement(config);

    return new Promise(async (resolve) => {
      const metrics1 = (await measurement1.measure(fn1)).metrics;
      const metrics2 = (await measurement2.measure(fn2)).metrics;

      const comparison: PerformanceComparison = {
        function1: { name: 'fn1', metrics: metrics1 },
        function2: { name: 'fn2', metrics: metrics2 },
        speedRatio: metrics2.meanTime / metrics1.meanTime,
        memoryRatio: metrics2.memoryIncrease / Math.max(metrics1.memoryIncrease, 1),
        winner: metrics1.meanTime < metrics2.meanTime ? 'fn1' : 'fn2',
        significantDifference: Math.abs(metrics1.meanTime - metrics2.meanTime) >
                               (metrics1.meanTime + metrics2.meanTime) * 0.1, // 10% threshold
      };

      resolve({ comparison });
    });
  }
}

// Performance comparison interface
interface PerformanceComparison {
  function1: { name: string; metrics: PerformanceMetrics };
  function2: { name: string; metrics: PerformanceMetrics };
  speedRatio: number;
  memoryRatio: number;
  winner: string;
  significantDifference: boolean;
}

// Global performance test setup
beforeEach(() => {
  // Clear any performance-related mocks
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up after performance tests
  if (global.gc) {
    global.gc(); // Force garbage collection if available
  }
});

export default {
  PerformanceThresholds,
  PerformanceMeasurement,
  PerformanceTestHelpers,
  PerformanceUtils: {
    assertPerformance: PerformanceTestHelpers.assertPerformance,
    benchmarkFunction: PerformanceTestHelpers.benchmarkFunction,
    comparePerformance: PerformanceTestHelpers.comparePerformance,
  },
};
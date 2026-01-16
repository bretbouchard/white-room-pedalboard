/**
 * Performance Benchmarking Infrastructure for Schillinger SDK
 *
 * This module provides comprehensive benchmarking capabilities including:
 * - Mathematical operation benchmarking
 * - Memory usage tracking
 * - CPU performance measurement
 * - Statistical analysis of results
 * - Performance regression detection
 */

import { performance } from "perf_hooks";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { TestUtils } from "../utilities/global-setup";

export interface BenchmarkResult {
  name: string;
  category: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  throughput: number; // Operations per second
  timestamp: string;
}

export interface BenchmarkSuite {
  name: string;
  description: string;
  benchmarks: Benchmark[];
}

export interface Benchmark {
  name: string;
  category:
    | "mathematical"
    | "musical"
    | "structural"
    | "io"
    | "memory"
    | "concurrent";
  description: string;
  iterations?: number;
  warmupIterations?: number;
  timeout?: number; // Maximum time per iteration in ms
  setup?: () => void | Promise<void>;
  teardown?: () => void | Promise<void>;
  operation: () => void | Promise<void>;
  validate?: (result: any) => boolean; // Optional validation of operation result
}

export interface PerformanceThresholds {
  [category: string]: {
    [benchmark: string]: {
      maxAverageTime: number; // ms
      maxMemoryDelta: number; // bytes
      minThroughput: number; // ops/sec
    };
  };
}

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];
  private thresholds: PerformanceThresholds = {};

  constructor() {
    this.loadDefaultThresholds();
  }

  /**
   * Load default performance thresholds for Schillinger SDK
   */
  private loadDefaultThresholds(): void {
    this.thresholds = {
      mathematical: {
        "rhythm-generation": {
          maxAverageTime: 0.1,
          maxMemoryDelta: 1024,
          minThroughput: 10000,
        },
        "harmonic-analysis": {
          maxAverageTime: 0.5,
          maxMemoryDelta: 2048,
          minThroughput: 2000,
        },
        "counterpoint-generation": {
          maxAverageTime: 1.0,
          maxMemoryDelta: 4096,
          minThroughput: 1000,
        },
        "pitch-class-analysis": {
          maxAverageTime: 0.05,
          maxMemoryDelta: 512,
          minThroughput: 20000,
        },
        "interval-calculations": {
          maxAverageTime: 0.02,
          maxMemoryDelta: 256,
          minThroughput: 50000,
        },
        "scale-generation": {
          maxAverageTime: 0.1,
          maxMemoryDelta: 1024,
          minThroughput: 10000,
        },
        "chord-generation": {
          maxAverageTime: 0.2,
          maxMemoryDelta: 1536,
          minThroughput: 5000,
        },
        "voice-leading": {
          maxAverageTime: 0.5,
          maxMemoryDelta: 2048,
          minThroughput: 2000,
        },
        "modulation-analysis": {
          maxAverageTime: 0.3,
          maxMemoryDelta: 1024,
          minThroughput: 3000,
        },
        "rhythm-structure-analysis": {
          maxAverageTime: 0.15,
          maxMemoryDelta: 768,
          minThroughput: 6000,
        },
      },
      musical: {
        "note-sequence-generation": {
          maxAverageTime: 0.2,
          maxMemoryDelta: 2048,
          minThroughput: 5000,
        },
        "melody-contour-analysis": {
          maxAverageTime: 0.1,
          maxMemoryDelta: 1024,
          minThroughput: 10000,
        },
        "harmonic-progression": {
          maxAverageTime: 0.4,
          maxMemoryDelta: 3072,
          minThroughput: 2500,
        },
        "orchestration-layout": {
          maxAverageTime: 0.8,
          maxMemoryDelta: 5120,
          minThroughput: 1250,
        },
        "form-structure-analysis": {
          maxAverageTime: 0.3,
          maxMemoryDelta: 1536,
          minThroughput: 3000,
        },
        "texture-generation": {
          maxAverageTime: 0.6,
          maxMemoryDelta: 4096,
          minThroughput: 1500,
        },
        "tension-analysis": {
          maxAverageTime: 0.25,
          maxMemoryDelta: 1280,
          minThroughput: 4000,
        },
      },
      structural: {
        "pattern-matching": {
          maxAverageTime: 0.05,
          maxMemoryDelta: 512,
          minThroughput: 20000,
        },
        "tree-traversal": {
          maxAverageTime: 0.02,
          maxMemoryDelta: 256,
          minThroughput: 50000,
        },
        "graph-algorithms": {
          maxAverageTime: 0.1,
          maxMemoryDelta: 1024,
          minThroughput: 10000,
        },
        "data-validation": {
          maxAverageTime: 0.01,
          maxMemoryDelta: 128,
          minThroughput: 100000,
        },
        serialization: {
          maxAverageTime: 0.03,
          maxMemoryDelta: 256,
          minThroughput: 30000,
        },
        deserialization: {
          maxAverageTime: 0.04,
          maxMemoryDelta: 384,
          minThroughput: 25000,
        },
      },
      io: {
        "file-read": {
          maxAverageTime: 1.0,
          maxMemoryDelta: 1024,
          minThroughput: 1000,
        },
        "file-write": {
          maxAverageTime: 2.0,
          maxMemoryDelta: 2048,
          minThroughput: 500,
        },
        "midi-parsing": {
          maxAverageTime: 0.5,
          maxMemoryDelta: 1024,
          minThroughput: 2000,
        },
        "audio-buffer-processing": {
          maxAverageTime: 5.0,
          maxMemoryDelta: 10240,
          minThroughput: 200,
        },
        "network-request": {
          maxAverageTime: 100.0,
          maxMemoryDelta: 512,
          minThroughput: 10,
        },
      },
      memory: {
        "large-object-creation": {
          maxAverageTime: 0.1,
          maxMemoryDelta: 10240,
          minThroughput: 10000,
        },
        "garbage-collection": {
          maxAverageTime: 10.0,
          maxMemoryDelta: 1024,
          minThroughput: 100,
        },
        "memory-allocation": {
          maxAverageTime: 0.01,
          maxMemoryDelta: 256,
          minThroughput: 100000,
        },
        "buffer-copy": {
          maxAverageTime: 0.02,
          maxMemoryDelta: 512,
          minThroughput: 50000,
        },
      },
      concurrent: {
        "parallel-computation": {
          maxAverageTime: 0.2,
          maxMemoryDelta: 2048,
          minThroughput: 5000,
        },
        "async-io-operations": {
          maxAverageTime: 0.5,
          maxMemoryDelta: 1024,
          minThroughput: 2000,
        },
        "worker-thread-communication": {
          maxAverageTime: 0.1,
          maxMemoryDelta: 512,
          minThroughput: 10000,
        },
        "concurrent-mathematical-ops": {
          maxAverageTime: 0.15,
          maxMemoryDelta: 1536,
          minThroughput: 6000,
        },
      },
    };
  }

  /**
   * Run a single benchmark
   */
  async runBenchmark(benchmark: Benchmark): Promise<BenchmarkResult> {
    const iterations = benchmark.iterations || 1000;
    const warmupIterations =
      benchmark.warmupIterations || Math.min(100, Math.floor(iterations * 0.1));
    const timeout = benchmark.timeout || 5000;

    console.log(
      `🚀 Running benchmark: ${benchmark.name} (${iterations} iterations)`,
    );

    // Warmup phase
    if (benchmark.setup) await benchmark.setup();

    for (let i = 0; i < warmupIterations; i++) {
      await Promise.race([
        benchmark.operation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Warmup timeout")), timeout),
        ),
      ]);
    }

    // Measure initial memory
    const memoryBefore = process.memoryUsage();

    // Benchmark phase
    const times: number[] = [];
    let operationResult: any;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      try {
        operationResult = await Promise.race([
          benchmark.operation(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Operation timeout")), timeout),
          ),
        ]);

        const endTime = performance.now();
        times.push(endTime - startTime);

        // Validate result if validator provided
        if (benchmark.validate && !benchmark.validate(operationResult)) {
          throw new Error(`Benchmark validation failed at iteration ${i}`);
        }
      } catch (error) {
        throw new Error(`Benchmark failed at iteration ${i}: ${error.message}`);
      }
    }

    // Measure final memory
    const memoryAfter = process.memoryUsage();

    // Calculate statistics
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Calculate standard deviation
    const variance =
      times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) /
      times.length;
    const standardDeviation = Math.sqrt(variance);

    const result: BenchmarkResult = {
      name: benchmark.name,
      category: benchmark.category,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      memoryBefore: memoryBefore.heapUsed,
      memoryAfter: memoryAfter.heapUsed,
      memoryDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
      throughput: 1000 / averageTime, // Operations per second
      timestamp: new Date().toISOString(),
    };

    // Cleanup
    if (benchmark.teardown) await benchmark.teardown();

    console.log(
      `✅ Completed ${benchmark.name}: avg=${averageTime.toFixed(3)}ms, throughput=${result.throughput.toFixed(0)}ops/s`,
    );

    return result;
  }

  /**
   * Run a benchmark suite
   */
  async runSuite(suite: BenchmarkSuite): Promise<BenchmarkResult[]> {
    console.log(`📊 Running benchmark suite: ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log(`   Benchmarks: ${suite.benchmarks.length}`);

    const suiteResults: BenchmarkResult[] = [];

    for (const benchmark of suite.benchmarks) {
      try {
        const result = await this.runBenchmark(benchmark);
        suiteResults.push(result);
        this.results.push(result);

        // Check against thresholds
        this.checkThresholds(result);
      } catch (error) {
        console.error(
          `❌ Benchmark failed: ${benchmark.name} - ${error.message}`,
        );
        throw error;
      }
    }

    return suiteResults;
  }

  /**
   * Check if benchmark results meet performance thresholds
   */
  private checkThresholds(result: BenchmarkResult): void {
    const categoryThresholds = this.thresholds[result.category];
    if (!categoryThresholds) return;

    const benchmarkThresholds = categoryThresholds[result.name];
    if (!benchmarkThresholds) return;

    const warnings: string[] = [];

    if (result.averageTime > benchmarkThresholds.maxAverageTime) {
      warnings.push(
        `Average time ${result.averageTime.toFixed(3)}ms exceeds threshold ${benchmarkThresholds.maxAverageTime}ms`,
      );
    }

    if (result.memoryDelta > benchmarkThresholds.maxMemoryDelta) {
      warnings.push(
        `Memory delta ${(result.memoryDelta / 1024).toFixed(1)}KB exceeds threshold ${(benchmarkThresholds.maxMemoryDelta / 1024).toFixed(1)}KB`,
      );
    }

    if (result.throughput < benchmarkThresholds.minThroughput) {
      warnings.push(
        `Throughput ${result.throughput.toFixed(0)}ops/s below threshold ${benchmarkThresholds.minThroughput}ops/s`,
      );
    }

    if (warnings.length > 0) {
      console.warn(`⚠️  Performance warnings for ${result.name}:`);
      warnings.forEach((warning) => console.warn(`   ${warning}`));
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const report = {
      summary: this.generateSummary(),
      results: this.results,
      thresholds: this.thresholds,
      generatedAt: new Date().toISOString(),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate performance summary
   */
  private generateSummary() {
    if (this.results.length === 0) {
      return { message: "No benchmark results available" };
    }

    const categories = [...new Set(this.results.map((r) => r.category))];
    const summary: any = {
      totalBenchmarks: this.results.length,
      categories: {},
      overallPerformance: {
        averageTime: 0,
        totalThroughput: 0,
        totalMemoryDelta: 0,
      },
    };

    let totalAverageTime = 0;
    let totalThroughput = 0;
    let totalMemoryDelta = 0;

    for (const category of categories) {
      const categoryResults = this.results.filter(
        (r) => r.category === category,
      );
      const avgTime =
        categoryResults.reduce((sum, r) => sum + r.averageTime, 0) /
        categoryResults.length;
      const throughput = categoryResults.reduce(
        (sum, r) => sum + r.throughput,
        0,
      );
      const memoryDelta = categoryResults.reduce(
        (sum, r) => sum + r.memoryDelta,
        0,
      );

      summary.categories[category] = {
        count: categoryResults.length,
        averageTime: avgTime,
        throughput,
        memoryDelta,
        slowestBenchmark: categoryResults.reduce((max, r) =>
          r.averageTime > max.averageTime ? r : max,
        ),
        fastestBenchmark: categoryResults.reduce((min, r) =>
          r.averageTime < min.averageTime ? r : min,
        ),
      };

      totalAverageTime += avgTime;
      totalThroughput += throughput;
      totalMemoryDelta += memoryDelta;
    }

    summary.overallPerformance.averageTime =
      totalAverageTime / categories.length;
    summary.overallPerformance.totalThroughput = totalThroughput;
    summary.overallPerformance.totalMemoryDelta = totalMemoryDelta;

    return summary;
  }

  /**
   * Save results to file
   */
  async saveResults(
    outputDir: string = "./test-reports/benchmarks",
  ): Promise<void> {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportFile = join(outputDir, `benchmark-report-${timestamp}.json`);
    const summaryFile = join(outputDir, `benchmark-summary-${timestamp}.json`);

    writeFileSync(reportFile, this.generateReport());
    writeFileSync(summaryFile, JSON.stringify(this.generateSummary(), null, 2));

    console.log(`📄 Benchmark report saved to: ${reportFile}`);
    console.log(`📊 Benchmark summary saved to: ${summaryFile}`);
  }

  /**
   * Clear previous results
   */
  clearResults(): void {
    this.results = [];
  }
}

// Export singleton instance
export const benchmarkRunner = new BenchmarkRunner();

// Export types and utilities
export { Benchmark, BenchmarkSuite, PerformanceThresholds };

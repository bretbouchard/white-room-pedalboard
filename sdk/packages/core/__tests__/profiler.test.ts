/**
 * Performance Profiler Tests
 *
 * Comprehensive tests for the performance profiling system.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  Profiler,
  ChildProfiler,
  PerformanceMonitor,
  PerformanceUtils,
  defaultProfiler,
  measurePerformance,
  measurePerformanceSync,
  DEFAULT_THRESHOLDS,
  type PerformanceStats,
} from "../src/performance";

describe("Profiler", () => {
  let profiler: Profiler;

  beforeEach(() => {
    profiler = new Profiler();
  });

  afterEach(() => {
    profiler.clear();
  });

  describe("Basic Operations", () => {
    it("should start and stop an operation", () => {
      profiler.start("test-op");
      const metric = profiler.stop("test-op");

      expect(metric.name).toBe("test-op");
      expect(metric.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should throw error when stopping non-existent operation", () => {
      expect(() => profiler.stop("non-existent")).toThrow();
    });

    it("should measure sync operation", () => {
      const result = profiler.measureSync("math", () => 2 + 2);

      expect(result).toBe(4);
      const stats = profiler.getStats("math");
      expect(stats).toBeTruthy();
      expect(stats?.count).toBe(1);
    });

    it("should measure async operation", async () => {
      const result = await profiler.measure("async", async () => {
        return await Promise.resolve(42);
      });

      expect(result).toBe(42);
      const stats = profiler.getStats("async");
      expect(stats).toBeTruthy();
      expect(stats?.count).toBe(1);
    });

    it("should handle errors in sync operations", () => {
      expect(() => {
        profiler.measureSync("failing", () => {
          throw new Error("Test error");
        });
      }).toThrow();

      const stats = profiler.getStats("failing");
      expect(stats).toBeTruthy();
    });

    it("should handle errors in async operations", async () => {
      await expect(
        profiler.measure("failing-async", async () => {
          throw new Error("Async error");
        })
      ).rejects.toThrow();

      const stats = profiler.getStats("failing-async");
      expect(stats).toBeTruthy();
    });
  });

  describe("Statistics", () => {
    it("should calculate statistics for single operation", () => {
      profiler.measureSync("op1", () => {});
      const stats = profiler.getStats("op1");

      expect(stats).toBeTruthy();
      expect(stats?.count).toBe(1);
      expect(stats?.avgMs).toBe(stats?.minMs);
      expect(stats?.avgMs).toBe(stats?.maxMs);
    });

    it("should calculate statistics for multiple operations", () => {
      for (let i = 0; i < 10; i++) {
        profiler.measureSync(`op${i}`, () => {});
      }

      const stats = profiler.getStats("op5");
      expect(stats?.count).toBe(1);
    });

    it("should return null for non-existent operation", () => {
      const stats = profiler.getStats("non-existent");
      expect(stats).toBeNull();
    });

    it("should get all statistics", () => {
      profiler.measureSync("op1", () => {});
      profiler.measureSync("op2", () => {});
      profiler.measureSync("op3", () => {});

      const allStats = profiler.getAllStats();
      expect(allStats).toHaveLength(3);
    });

    it("should calculate percentiles correctly", () => {
      // Create 100 measurements with simulated durations
      // Instead of busy-waiting, we'll manually construct measurements
      const measurements = [];
      for (let i = 0; i < 100; i++) {
        measurements.push({
          name: "percentile-test",
          startTime: 0,
          endTime: i,
          durationMs: i, // 0 to 99ms
        });
      }

      // Manually set measurements for the profiler
      (profiler as any).metrics.set("percentile-test", measurements);

      const stats = profiler.getStats("percentile-test");
      expect(stats).toBeTruthy();

      // P50 should be around 50ms
      expect(stats?.p50Ms).toBeGreaterThan(40);
      expect(stats?.p50Ms).toBeLessThan(60);

      // P95 should be around 95ms
      expect(stats?.p95Ms).toBeGreaterThan(90);
      expect(stats?.p99Ms).toBeLessThan(100);
    });
  });

  describe("Thresholds", () => {
    it("should use default thresholds", () => {
      const thresholds = profiler.getThresholds();

      expect(thresholds.realization5minSong).toBe(DEFAULT_THRESHOLDS.realization5minSong);
      expect(thresholds.reconciliation5minSong).toBe(DEFAULT_THRESHOLDS.reconciliation5minSong);
      expect(thresholds.operationLatency).toBe(DEFAULT_THRESHOLDS.operationLatency);
    });

    it("should set custom thresholds", () => {
      profiler.setThresholds({
        realization5minSong: 5000,
      });

      const thresholds = profiler.getThresholds();
      expect(thresholds.realization5minSong).toBe(5000);
      expect(thresholds.reconciliation5minSong).toBe(DEFAULT_THRESHOLDS.reconciliation5minSong);
    });

    it("should check threshold compliance", () => {
      profiler.measureSync("fast-op", () => {});
      const isCompliant = profiler.checkThreshold("fast-op", "operationLatency");

      expect(isCompliant).toBe(true);
    });
  });

  describe("Reporting", () => {
    it("should generate performance report", () => {
      profiler.measureSync("op1", () => {});
      profiler.measureSync("op2", () => {});

      const report = profiler.getReport();

      expect(report.timestamp).toBeTruthy();
      expect(report.operations).toHaveLength(2);
      expect(report.summary.totalOperations).toBe(2);
      expect(report.summary.totalMs).toBeGreaterThan(0);
    });

    it("should detect threshold violations", () => {
      // Set a very low threshold for realization
      profiler.setThresholds({
        realization5minSong: 0.001, // 1 microsecond (impossibly low)
      });

      // Normal realization operation will exceed this
      profiler.measureSync("realization", () => {
        // Small delay
        const start = Date.now();
        while (Date.now() - start < 1) {
          // Wait 1ms
        }
      });

      const report = profiler.getReport();
      expect(report.violations.length).toBeGreaterThan(0);
      expect(report.violations[0].operation).toBe("realization");
    });

    it("should export and import metrics", () => {
      profiler.measureSync("op1", () => {});
      profiler.measureSync("op2", () => {});

      const json = profiler.exportJSON();
      expect(json).toBeTruthy();

      const newProfiler = new Profiler();
      newProfiler.importJSON(json);

      const originalStats = profiler.getStats("op1");
      const importedStats = newProfiler.getStats("op1");

      expect(importedStats?.count).toBe(originalStats?.count);
    });
  });

  describe("Metrics Management", () => {
    it("should get metrics for specific operation", () => {
      profiler.measureSync("op1", () => {});
      profiler.measureSync("op1", () => {});

      const metrics = profiler.getMetrics("op1");
      expect(metrics).toHaveLength(2);
    });

    it("should return empty array for non-existent operation", () => {
      const metrics = profiler.getMetrics("non-existent");
      expect(metrics).toHaveLength(0);
    });

    it("should get all metrics", () => {
      profiler.measureSync("op1", () => {});
      profiler.measureSync("op2", () => {});

      const allMetrics = profiler.getAllMetrics();
      expect(allMetrics.size).toBe(2);
    });

    it("should clear all metrics", () => {
      profiler.measureSync("op1", () => {});
      profiler.clear();

      const stats = profiler.getStats("op1");
      expect(stats).toBeNull();
    });
  });

  describe("Child Profiler", () => {
    it("should scope operations with prefix", () => {
      const child = profiler.createChild("parent");

      child.measureSync("child-op", () => {});

      const stats = profiler.getStats("parent:child-op");
      expect(stats).toBeTruthy();
    });

    it("should get stats from child profiler", () => {
      const child = profiler.createChild("parent");

      child.measureSync("op1", () => {});
      child.measureSync("op2", () => {});

      const childStats = child.getAllStats();
      expect(childStats).toHaveLength(2);

      // Stats should have prefix
      expect(childStats[0].name).toContain("parent:");
    });

    it("should get report from child profiler", () => {
      const child = profiler.createChild("parent");

      child.measureSync("op1", () => {});

      const report = child.getReport();
      expect(report.operations).toHaveLength(1);
      expect(report.operations[0].name).toContain("parent:");
    });
  });

  describe("Metadata", () => {
    it("should record metadata with operation", () => {
      profiler.start("op-with-metadata");
      profiler.stop("op-with-metadata", { key: "value", count: 42 });

      const metrics = profiler.getMetrics("op-with-metadata");
      expect(metrics[0].metadata).toEqual({ key: "value", count: 42 });
    });

    it("should record error metadata", () => {
      try {
        profiler.measureSync("failing", () => {
          throw new Error("Test error");
        });
      } catch (e) {
        // Expected
      }

      const metrics = profiler.getMetrics("failing");
      expect(metrics[0].metadata?.error).toBeTruthy();
    });
  });
});

describe("PerformanceMonitor", () => {
  it("should start and stop monitoring", () => {
    const profiler = new Profiler();
    const monitor = new PerformanceMonitor(profiler, {
      intervalMs: 100,
    });

    monitor.start();
    expect(monitor.getStatus().monitoring).toBe(true);

    monitor.stop();
    expect(monitor.getStatus().monitoring).toBe(false);
  });

  it("should call onViolation callback", async () => {
    const profiler = new Profiler();
    profiler.setThresholds({
      realization5minSong: 0.001, // Very low threshold
    });

    let violationCalled = false;
    const monitor = new PerformanceMonitor(profiler, {
      intervalMs: 50,
      onViolation: () => {
        violationCalled = true;
      },
    });

    monitor.start();

    // Create slow operation named 'realization' to trigger violation check
    profiler.measureSync("realization", () => {
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Wait 2ms
      }
    });

    // Wait for monitor to check
    await new Promise((resolve) => setTimeout(resolve, 100));

    monitor.stop();

    expect(violationCalled).toBe(true);
  });
});

describe("PerformanceUtils", () => {
  describe("msToHuman", () => {
    it("should format microseconds", () => {
      expect(PerformanceUtils.msToHuman(0.001)).toBe("1.00μs");
    });

    it("should format milliseconds", () => {
      expect(PerformanceUtils.msToHuman(100)).toBe("100.00ms");
    });

    it("should format seconds", () => {
      expect(PerformanceUtils.msToHuman(1500)).toBe("1.50s");
    });
  });

  describe("percentDiff", () => {
    it("should calculate positive percentage difference", () => {
      expect(PerformanceUtils.percentDiff(100, 110)).toBe(10);
    });

    it("should calculate negative percentage difference", () => {
      expect(PerformanceUtils.percentDiff(100, 90)).toBe(-10);
    });

    it("should calculate zero for equal values", () => {
      expect(PerformanceUtils.percentDiff(100, 100)).toBe(0);
    });
  });

  describe("checkRegression", () => {
    it("should detect performance regression", () => {
      const baseline: PerformanceStats = {
        name: "test",
        count: 10,
        totalMs: 1000,
        avgMs: 100,
        minMs: 90,
        maxMs: 110,
        p50Ms: 100,
        p95Ms: 108,
        p99Ms: 109,
      };

      const current: PerformanceStats = {
        name: "test",
        count: 10,
        totalMs: 1200,
        avgMs: 120,
        minMs: 110,
        maxMs: 130,
        p50Ms: 120,
        p95Ms: 128,
        p99Ms: 129,
      };

      const hasRegression = PerformanceUtils.checkRegression(baseline, current);
      expect(hasRegression).toBe(true);
    });

    it("should not detect regression within threshold", () => {
      const baseline: PerformanceStats = {
        name: "test",
        count: 10,
        totalMs: 1000,
        avgMs: 100,
        minMs: 90,
        maxMs: 110,
        p50Ms: 100,
        p95Ms: 108,
        p99Ms: 109,
      };

      const current: PerformanceStats = {
        name: "test",
        count: 10,
        totalMs: 1050,
        avgMs: 105,
        minMs: 95,
        maxMs: 115,
        p50Ms: 105,
        p95Ms: 113,
        p99Ms: 114,
      };

      const hasRegression = PerformanceUtils.checkRegression(baseline, current, 10);
      expect(hasRegression).toBe(false);
    });
  });

  describe("formatStats", () => {
    it("should format stats for logging", () => {
      const stats: PerformanceStats = {
        name: "test-op",
        count: 100,
        totalMs: 1000,
        avgMs: 10,
        minMs: 5,
        maxMs: 20,
        p50Ms: 9,
        p95Ms: 15,
        p99Ms: 18,
      };

      const formatted = PerformanceUtils.formatStats(stats);

      expect(formatted).toContain("test-op");
      expect(formatted).toContain("Count: 100");
      expect(formatted).toContain("Average:");
      expect(formatted).toContain("Min:");
      expect(formatted).toContain("Max:");
    });
  });
});

describe("Convenience Functions", () => {
  it("should measure async operation with default profiler", async () => {
    const result = await measurePerformance("convenience-async", async () => {
      return 42;
    });

    expect(result).toBe(42);

    const stats = defaultProfiler.getStats("convenience-async");
    expect(stats).toBeTruthy();
  });

  it("should measure sync operation with default profiler", () => {
    const result = measurePerformanceSync("convenience-sync", () => {
      return "hello";
    });

    expect(result).toBe("hello");

    const stats = defaultProfiler.getStats("convenience-sync");
    expect(stats).toBeTruthy();
  });

  it("should use custom profiler", async () => {
    const customProfiler = new Profiler();

    await measurePerformance(
      "custom-op",
      async () => {
        return 99;
      },
      customProfiler
    );

    const stats = customProfiler.getStats("custom-op");
    expect(stats).toBeTruthy();

    // Should not be in default profiler
    const defaultStats = defaultProfiler.getStats("custom-op");
    expect(defaultStats).toBeNull();
  });
});

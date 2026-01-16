/**
 * White Room SDK - Performance Profiler
 *
 * Comprehensive performance monitoring and profiling tools
 * for tracking realization, reconciliation, and general operations.
 */

/**
 * Performance metrics for a single operation
 */
export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

/**
 * Performance statistics over multiple runs
 */
export interface PerformanceStats {
  name: string;
  count: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
  realization5minSong: number; // Max time to realize 5-minute song (ms)
  reconciliation5minSong: number; // Max time to reconcile 5-minute song (ms)
  operationLatency: number; // Max latency for operations (ms)
}

/**
 * Default performance thresholds
 */
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  realization5minSong: 10000, // 10 seconds
  reconciliation5minSong: 30000, // 30 seconds
  operationLatency: 10, // 10ms
};

/**
 * Performance profiler for tracking operation metrics
 */
export class Profiler {
  private metrics: Map<string, PerformanceMetric[]>;
  private activeOperations: Map<string, number>;
  private thresholds: PerformanceThresholds;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.metrics = new Map();
    this.activeOperations = new Map();
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Start timing an operation
   */
  start(name: string): void {
    this.activeOperations.set(name, performance.now());
  }

  /**
   * Stop timing an operation and record the metric
   */
  stop(name: string, metadata?: Record<string, unknown>): PerformanceMetric {
    const startTime = this.activeOperations.get(name);
    if (!startTime) {
      throw new Error(`Operation "${name}" was not started`);
    }

    const endTime = performance.now();
    const durationMs = endTime - startTime;

    const metric: PerformanceMetric = {
      name,
      startTime,
      endTime,
      durationMs,
      metadata,
    };

    const metrics = this.metrics.get(name) || [];
    metrics.push(metric);
    this.metrics.set(name, metrics);

    this.activeOperations.delete(name);

    return metric;
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.start(name);
    try {
      const result = await operation();
      this.stop(name, metadata);
      return result;
    } catch (error) {
      this.stop(name, { ...metadata, error: String(error) });
      throw error;
    }
  }

  /**
   * Measure a sync operation
   */
  measureSync<T>(name: string, operation: () => T, metadata?: Record<string, unknown>): T {
    this.start(name);
    try {
      const result = operation();
      this.stop(name, metadata);
      return result;
    } catch (error) {
      this.stop(name, { ...metadata, error: String(error) });
      throw error;
    }
  }

  /**
   * Get statistics for an operation
   */
  getStats(name: string): PerformanceStats | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);
    const count = durations.length;
    const totalMs = durations.reduce((sum, d) => sum + d, 0);

    return {
      name,
      count,
      totalMs,
      avgMs: totalMs / count,
      minMs: durations[0],
      maxMs: durations[count - 1],
      p50Ms: durations[Math.floor(count * 0.5)],
      p95Ms: durations[Math.floor(count * 0.95)],
      p99Ms: durations[Math.floor(count * 0.99)],
    };
  }

  /**
   * Get all statistics
   */
  getAllStats(): PerformanceStats[] {
    const stats: PerformanceStats[] = [];
    for (const name of this.metrics.keys()) {
      const stat = this.getStats(name);
      if (stat) {
        stats.push(stat);
      }
    }
    return stats;
  }

  /**
   * Check if an operation meets performance threshold
   */
  checkThreshold(name: string, threshold: keyof PerformanceThresholds): boolean {
    const stats = this.getStats(name);
    if (!stats) {
      return false;
    }

    const thresholdValue = this.thresholds[threshold];
    return stats.avgMs <= thresholdValue;
  }

  /**
   * Get performance report
   */
  getReport(): PerformanceReport {
    const stats = this.getAllStats();
    const operations = stats.map((stat) => ({
      name: stat.name,
      count: stat.count,
      avgMs: stat.avgMs,
      minMs: stat.minMs,
      maxMs: stat.maxMs,
      p95Ms: stat.p95Ms,
      p99Ms: stat.p99Ms,
    }));

    const violations: PerformanceViolation[] = [];

    // Check realization threshold
    const realizeStats = this.getStats("realization");
    if (realizeStats && realizeStats.avgMs > this.thresholds.realization5minSong) {
      violations.push({
        operation: "realization",
        threshold: "realization5minSong",
        expectedMs: this.thresholds.realization5minSong,
        actualMs: realizeStats.avgMs,
      });
    }

    // Check reconciliation threshold
    const reconcileStats = this.getStats("reconciliation");
    if (reconcileStats && reconcileStats.avgMs > this.thresholds.reconciliation5minSong) {
      violations.push({
        operation: "reconciliation",
        threshold: "reconciliation5minSong",
        expectedMs: this.thresholds.reconciliation5minSong,
        actualMs: reconcileStats.avgMs,
      });
    }

    return {
      timestamp: new Date().toISOString(),
      operations,
      violations,
      summary: {
        totalOperations: stats.reduce((sum, s) => sum + s.count, 0),
        totalMs: stats.reduce((sum, s) => sum + s.totalMs, 0),
        violationCount: violations.length,
      },
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.activeOperations.clear();
  }

  /**
   * Get metrics for an operation
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        report: this.getReport(),
        metrics: Array.from(this.metrics.entries()).map(([name, metrics]) => [name, metrics]),
      },
      null,
      2
    );
  }

  /**
   * Import metrics from JSON
   */
  importJSON(json: string): void {
    const data = JSON.parse(json);
    this.clear();

    for (const [name, metrics] of data.metrics) {
      this.metrics.set(name, metrics as PerformanceMetric[]);
    }
  }

  /**
   * Create a child profiler with inherited thresholds
   */
  createChild(name: string): ChildProfiler {
    return new ChildProfiler(this, name);
  }

  /**
   * Set performance thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }
}

/**
 * Child profiler for scoping metrics
 */
export class ChildProfiler {
  private parent: Profiler;
  private prefix: string;

  constructor(parent: Profiler, prefix: string) {
    this.parent = parent;
    this.prefix = prefix;
  }

  start(name: string): void {
    this.parent.start(`${this.prefix}:${name}`);
  }

  stop(name: string, metadata?: Record<string, unknown>): PerformanceMetric {
    return this.parent.stop(`${this.prefix}:${name}`, metadata);
  }

  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return this.parent.measure(`${this.prefix}:${name}`, operation, metadata);
  }

  measureSync<T>(name: string, operation: () => T, metadata?: Record<string, unknown>): T {
    return this.parent.measureSync(`${this.prefix}:${name}`, operation, metadata);
  }

  getStats(name: string): PerformanceStats | null {
    return this.parent.getStats(`${this.prefix}:${name}`);
  }

  getAllStats(): PerformanceStats[] {
    const allStats = this.parent.getAllStats();
    return allStats.filter((stat) => stat.name.startsWith(this.prefix));
  }

  getReport(): PerformanceReport {
    const parentReport = this.parent.getReport();
    return {
      ...parentReport,
      operations: parentReport.operations.filter((op) => op.name.startsWith(this.prefix)),
    };
  }
}

/**
 * Performance report structure
 */
export interface PerformanceReport {
  timestamp: string;
  operations: Array<{
    name: string;
    count: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    p95Ms: number;
    p99Ms: number;
  }>;
  violations: PerformanceViolation[];
  summary: {
    totalOperations: number;
    totalMs: number;
    violationCount: number;
  };
}

/**
 * Performance violation
 */
export interface PerformanceViolation {
  operation: string;
  threshold: keyof PerformanceThresholds;
  expectedMs: number;
  actualMs: number;
}

/**
 * Global default profiler instance
 */
export const defaultProfiler = new Profiler();

/**
 * Convenience function to measure an async operation
 */
export async function measurePerformance<T>(
  name: string,
  operation: () => Promise<T>,
  profiler: Profiler = defaultProfiler
): Promise<T> {
  return profiler.measure(name, operation);
}

/**
 * Convenience function to measure a sync operation
 */
export function measurePerformanceSync<T>(
  name: string,
  operation: () => T,
  profiler: Profiler = defaultProfiler
): T {
  return profiler.measureSync(name, operation);
}

/**
 * Performance utility functions
 */
export class PerformanceUtils {
  /**
   * Convert milliseconds to human-readable format
   */
  static msToHuman(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(2)}μs`;
    } else if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    } else {
      const seconds = ms / 1000;
      return `${seconds.toFixed(2)}s`;
    }
  }

  /**
   * Calculate percentage difference
   */
  static percentDiff(expected: number, actual: number): number {
    return ((actual - expected) / expected) * 100;
  }

  /**
   * Check if performance regression occurred
   */
  static checkRegression(
    baseline: PerformanceStats,
    current: PerformanceStats,
    thresholdPercent: number = 10
  ): boolean {
    const percentDiff = PerformanceUtils.percentDiff(baseline.avgMs, current.avgMs);
    return percentDiff > thresholdPercent;
  }

  /**
   * Format performance stats for logging
   */
  static formatStats(stats: PerformanceStats): string {
    const lines = [
      `Operation: ${stats.name}`,
      `  Count: ${stats.count}`,
      `  Average: ${PerformanceUtils.msToHuman(stats.avgMs)}`,
      `  Min: ${PerformanceUtils.msToHuman(stats.minMs)}`,
      `  Max: ${PerformanceUtils.msToHuman(stats.maxMs)}`,
      `  P50: ${PerformanceUtils.msToHuman(stats.p50Ms)}`,
      `  P95: ${PerformanceUtils.msToHuman(stats.p95Ms)}`,
      `  P99: ${PerformanceUtils.msToHuman(stats.p99Ms)}`,
    ];
    return lines.join("\n");
  }
}

/**
 * Performance monitor for continuous monitoring
 */
export class PerformanceMonitor {
  private profiler: Profiler;
  private intervalMs: number;
  private intervalId: ReturnType<typeof setInterval> | null;
  private onViolation: (violation: PerformanceViolation) => void;

  constructor(
    profiler: Profiler = defaultProfiler,
    options?: {
      intervalMs?: number;
      onViolation?: (violation: PerformanceViolation) => void;
    }
  ) {
    this.profiler = profiler;
    this.intervalMs = options?.intervalMs || 60000; // Default 1 minute
    this.intervalId = null;
    this.onViolation = options?.onViolation || (() => {});
  }

  /**
   * Start continuous monitoring
   */
  start(): void {
    if (this.intervalId) {
      return; // Already started
    }

    this.intervalId = setInterval(() => {
      const report = this.profiler.getReport();
      for (const violation of report.violations) {
        this.onViolation(violation);
      }
    }, this.intervalMs);
  }

  /**
   * Stop continuous monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get current status
   */
  getStatus(): { monitoring: boolean; intervalMs: number } {
    return {
      monitoring: this.intervalId !== null,
      intervalMs: this.intervalMs,
    };
  }
}

/**
 * Performance Thresholds for Schillinger SDK
 *
 * This module defines comprehensive performance thresholds and benchmarks for:
 * - Mathematical operations performance
 * - Real-time audio processing requirements
 * - Memory usage limits
 * - Latency requirements
 * - Throughput expectations
 * - Scalability metrics
 * - Hardware interaction performance
 */

export interface PerformanceThreshold {
  name: string;
  category:
    | "mathematical"
    | "audio"
    | "memory"
    | "latency"
    | "throughput"
    | "scalability";
  operation: string;
  metric: "time" | "memory" | "cpu" | "throughput" | "latency";
  threshold: number;
  unit: "ms" | "bytes" | "MB" | "%" | "ops/sec" | "Hz" | "samples";
  condition: "max" | "min" | "exact";
  description: string;
  environment: "development" | "staging" | "production";
  severity: "critical" | "warning" | "info";
}

export interface BenchmarkSuite {
  name: string;
  description: string;
  thresholds: PerformanceThreshold[];
  setup?: () => void | Promise<void>;
  teardown?: () => void | Promise<void>;
}

export interface RegressionThreshold {
  operation: string;
  maxRegressionPercent: number;
  minConfidenceLevel: number; // Statistical confidence
  sampleSize: number;
  windowSize: number; // Number of recent results to consider
}

// Core performance thresholds organized by category
export const PERFORMANCE_THRESHOLDS: PerformanceThreshold[] = [
  // Mathematical Operations - Critical for Schillinger System
  {
    name: "rhythm-generation-max-time",
    category: "mathematical",
    operation: "rhythm.generate",
    metric: "time",
    threshold: 0.1,
    unit: "ms",
    condition: "max",
    description: "Maximum time to generate rhythmic pattern",
    environment: "production",
    severity: "critical",
  },
  {
    name: "harmonic-analysis-max-time",
    category: "mathematical",
    operation: "harmony.analyze",
    metric: "time",
    threshold: 0.5,
    unit: "ms",
    condition: "max",
    description: "Maximum time for harmonic analysis",
    environment: "production",
    severity: "critical",
  },
  {
    name: "counterpoint-generation-max-time",
    category: "mathematical",
    operation: "counterpoint.generate",
    metric: "time",
    threshold: 1.0,
    unit: "ms",
    condition: "max",
    description: "Maximum time to generate counterpoint",
    environment: "production",
    severity: "critical",
  },
  {
    name: "pitch-class-analysis-max-time",
    category: "mathematical",
    operation: "pitchclass.analyze",
    metric: "time",
    threshold: 0.05,
    unit: "ms",
    condition: "max",
    description: "Maximum time for pitch class analysis",
    environment: "production",
    severity: "critical",
  },
  {
    name: "interval-calculations-max-time",
    category: "mathematical",
    operation: "interval.calculate",
    metric: "time",
    threshold: 0.02,
    unit: "ms",
    condition: "max",
    description: "Maximum time for interval calculations",
    environment: "production",
    severity: "critical",
  },
  {
    name: "scale-generation-min-throughput",
    category: "throughput",
    operation: "scale.generate",
    metric: "throughput",
    threshold: 10000,
    unit: "ops/sec",
    condition: "min",
    description: "Minimum throughput for scale generation",
    environment: "production",
    severity: "warning",
  },
  {
    name: "chord-generation-min-throughput",
    category: "throughput",
    operation: "chord.generate",
    metric: "throughput",
    threshold: 5000,
    unit: "ops/sec",
    condition: "min",
    description: "Minimum throughput for chord generation",
    environment: "production",
    severity: "warning",
  },

  // Audio Processing Performance
  {
    name: "audio-buffer-processing-max-latency",
    category: "latency",
    operation: "audio.processBuffer",
    metric: "latency",
    threshold: 5,
    unit: "ms",
    condition: "max",
    description: "Maximum audio buffer processing latency",
    environment: "production",
    severity: "critical",
  },
  {
    name: "real-time-processing-max-cpu",
    category: "memory",
    operation: "audio.realTime",
    metric: "cpu",
    threshold: 80,
    unit: "%",
    condition: "max",
    description: "Maximum CPU usage for real-time audio",
    environment: "production",
    severity: "critical",
  },
  {
    name: "dsp-effect-processing-max-time",
    category: "mathematical",
    operation: "dsp.processEffect",
    metric: "time",
    threshold: 0.5,
    unit: "ms",
    condition: "max",
    description: "Maximum time to process DSP effect",
    environment: "production",
    severity: "critical",
  },
  {
    name: "midi-processing-max-latency",
    category: "latency",
    operation: "midi.process",
    metric: "latency",
    threshold: 1,
    unit: "ms",
    condition: "max",
    description: "Maximum MIDI processing latency",
    environment: "production",
    severity: "critical",
  },

  // Memory Usage Constraints
  {
    name: "large-object-creation-max-memory",
    category: "memory",
    operation: "memory.createLargeObject",
    metric: "memory",
    threshold: 10,
    unit: "MB",
    condition: "max",
    description: "Maximum memory for large object creation",
    environment: "production",
    severity: "warning",
  },
  {
    name: "scale-analysis-max-memory",
    category: "memory",
    operation: "scale.analyze",
    metric: "memory",
    threshold: 1024,
    unit: "bytes",
    condition: "max",
    description: "Maximum memory for scale analysis operations",
    environment: "production",
    severity: "warning",
  },
  {
    name: "harmonic-progression-memory",
    category: "memory",
    operation: "harmony.progression",
    metric: "memory",
    threshold: 2048,
    unit: "bytes",
    condition: "max",
    description: "Maximum memory for harmonic progression analysis",
    environment: "production",
    severity: "warning",
  },
  {
    name: "orchestration-layout-max-memory",
    category: "memory",
    operation: "orchestration.layout",
    metric: "memory",
    threshold: 5120,
    unit: "bytes",
    condition: "max",
    description: "Maximum memory for orchestration layout processing",
    environment: "production",
    severity: "warning",
  },

  // Throughput Requirements
  {
    name: "melody-generation-min-throughput",
    category: "throughput",
    operation: "melody.generate",
    metric: "throughput",
    threshold: 5000,
    unit: "ops/sec",
    condition: "min",
    description: "Minimum throughput for melody generation",
    environment: "production",
    severity: "warning",
  },
  {
    name: "harmonic-progression-min-throughput",
    category: "throughput",
    operation: "harmony.progression",
    metric: "throughput",
    threshold: 2500,
    unit: "ops/sec",
    condition: "min",
    description: "Minimum throughput for harmonic progressions",
    environment: "production",
    severity: "warning",
  },
  {
    name: "pattern-matching-min-throughput",
    category: "throughput",
    operation: "pattern.match",
    metric: "throughput",
    threshold: 20000,
    unit: "ops/sec",
    condition: "min",
    description: "Minimum throughput for pattern matching",
    environment: "production",
    severity: "warning",
  },
  {
    name: "data-validation-min-throughput",
    category: "throughput",
    operation: "data.validate",
    metric: "throughput",
    threshold: 100000,
    unit: "ops/sec",
    condition: "min",
    description: "Minimum throughput for data validation",
    environment: "production",
    severity: "warning",
  },

  // Scalability Metrics
  {
    name: "large-composition-max-time",
    category: "scalability",
    operation: "composition.large",
    metric: "time",
    threshold: 100,
    unit: "ms",
    condition: "max",
    description: "Maximum time for large composition analysis",
    environment: "production",
    severity: "warning",
  },
  {
    name: "concurrent-operations-max-overhead",
    category: "scalability",
    operation: "concurrent.operations",
    metric: "time",
    threshold: 0.2,
    unit: "ms",
    condition: "max",
    description: "Maximum overhead for concurrent operations",
    environment: "production",
    severity: "warning",
  },
  {
    name: "multi-thread-scaling-factor",
    category: "scalability",
    operation: "multithread.scale",
    metric: "throughput",
    threshold: 1.5,
    unit: "x",
    condition: "min",
    description: "Minimum scaling factor for multi-threading",
    environment: "production",
    severity: "info",
  },

  // I/O Performance
  {
    name: "file-read-max-time",
    category: "mathematical",
    operation: "io.read",
    metric: "time",
    threshold: 1.0,
    unit: "ms",
    condition: "max",
    description: "Maximum time for file read operations",
    environment: "production",
    severity: "warning",
  },
  {
    name: "file-write-max-time",
    category: "mathematical",
    operation: "io.write",
    metric: "time",
    threshold: 2.0,
    unit: "ms",
    condition: "max",
    description: "Maximum time for file write operations",
    environment: "production",
    severity: "warning",
  },
  {
    name: "midi-parsing-min-throughput",
    category: "throughput",
    operation: "midi.parse",
    metric: "throughput",
    threshold: 2000,
    unit: "ops/sec",
    condition: "min",
    description: "Minimum throughput for MIDI file parsing",
    environment: "production",
    severity: "warning",
  },
  {
    name: "audio-buffer-processing-min-throughput",
    category: "throughput",
    operation: "audio.buffer",
    metric: "throughput",
    threshold: 200,
    unit: "ops/sec",
    condition: "min",
    description: "Minimum throughput for audio buffer processing",
    environment: "production",
    severity: "warning",
  },

  // Development Environment Thresholds (more lenient)
  {
    name: "dev-rhythm-generation-max-time",
    category: "mathematical",
    operation: "rhythm.generate",
    metric: "time",
    threshold: 0.5,
    unit: "ms",
    condition: "max",
    description: "Maximum time for rhythm generation in development",
    environment: "development",
    severity: "warning",
  },
  {
    name: "dev-harmonic-analysis-max-time",
    category: "mathematical",
    operation: "harmony.analyze",
    metric: "time",
    threshold: 2.0,
    unit: "ms",
    condition: "max",
    description: "Maximum time for harmonic analysis in development",
    environment: "development",
    severity: "warning",
  },
];

// Regression detection thresholds
export const REGRESSION_THRESHOLDS: RegressionThreshold[] = [
  {
    operation: "rhythm.generate",
    maxRegressionPercent: 10,
    minConfidenceLevel: 0.95,
    sampleSize: 100,
    windowSize: 10,
  },
  {
    operation: "harmony.analyze",
    maxRegressionPercent: 15,
    minConfidenceLevel: 0.95,
    sampleSize: 50,
    windowSize: 8,
  },
  {
    operation: "counterpoint.generate",
    maxRegressionPercent: 20,
    minConfidenceLevel: 0.9,
    sampleSize: 30,
    windowSize: 6,
  },
  {
    operation: "audio.processBuffer",
    maxRegressionPercent: 5,
    minConfidenceLevel: 0.99,
    sampleSize: 1000,
    windowSize: 20,
  },
  {
    operation: "midi.process",
    maxRegressionPercent: 8,
    minConfidenceLevel: 0.95,
    sampleSize: 500,
    windowSize: 15,
  },
];

// Performance benchmark suites
export const BENCHMARK_SUITES: BenchmarkSuite[] = [
  {
    name: "schillinger-core-mathematics",
    description: "Core Schillinger System mathematical operations",
    thresholds: PERFORMANCE_THRESHOLDS.filter(
      (t) =>
        t.category === "mathematical" &&
        t.environment === "production" &&
        ["rhythm", "harmony", "counterpoint", "pitchclass", "interval"].some(
          (keyword) => t.operation.includes(keyword),
        ),
    ),
  },
  {
    name: "audio-processing-realtime",
    description: "Real-time audio processing performance",
    thresholds: PERFORMANCE_THRESHOLDS.filter(
      (t) =>
        (t.category === "audio" || t.category === "latency") &&
        t.environment === "production",
    ),
  },
  {
    name: "memory-efficiency",
    description: "Memory usage and efficiency metrics",
    thresholds: PERFORMANCE_THRESHOLDS.filter(
      (t) => t.category === "memory" && t.environment === "production",
    ),
  },
  {
    name: "throughput-performance",
    description: "High-throughput operation benchmarks",
    thresholds: PERFORMANCE_THRESHOLDS.filter(
      (t) => t.category === "throughput" && t.environment === "production",
    ),
  },
  {
    name: "scalability-tests",
    description: "Large-scale operation performance",
    thresholds: PERFORMANCE_THRESHOLDS.filter(
      (t) => t.category === "scalability" && t.environment === "production",
    ),
  },
];

/**
 * Performance Threshold Manager
 */
export class PerformanceThresholdManager {
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private regressionHistory: Map<string, number[]> = new Map();

  constructor(thresholds: PerformanceThreshold[] = PERFORMANCE_THRESHOLDS) {
    thresholds.forEach((threshold) => {
      this.thresholds.set(
        `${threshold.operation}:${threshold.metric}`,
        threshold,
      );
    });
  }

  /**
   * Check if a measurement meets the threshold
   */
  checkThreshold(
    operation: string,
    metric: string,
    value: number,
    environment: string = "production",
  ): {
    passed: boolean;
    threshold?: PerformanceThreshold;
    actualValue: number;
    expectedValue: number;
    severity?: string;
  } {
    const key = `${operation}:${metric}`;
    const threshold = this.thresholds.get(key);

    if (!threshold) {
      return { passed: true, actualValue: value, expectedValue: 0 };
    }

    // Skip if threshold doesn't apply to current environment
    if (
      threshold.environment !== environment &&
      threshold.environment !== "production"
    ) {
      return {
        passed: true,
        actualValue: value,
        expectedValue: threshold.threshold,
      };
    }

    let passed = false;
    switch (threshold.condition) {
      case "max":
        passed = value <= threshold.threshold;
        break;
      case "min":
        passed = value >= threshold.threshold;
        break;
      case "exact":
        passed =
          Math.abs(value - threshold.threshold) < threshold.threshold * 0.01; // 1% tolerance
        break;
    }

    return {
      passed,
      threshold,
      actualValue: value,
      expectedValue: threshold.threshold,
      severity: threshold.severity,
    };
  }

  /**
   * Check for performance regression
   */
  checkRegression(
    operation: string,
    currentValue: number,
  ): {
    isRegression: boolean;
    regressionPercent: number;
    threshold: RegressionThreshold | undefined;
    confidence: number;
  } {
    const regressionThreshold = REGRESSION_THRESHOLDS.find(
      (r) => r.operation === operation,
    );
    if (!regressionThreshold) {
      return {
        isRegression: false,
        regressionPercent: 0,
        threshold: undefined,
        confidence: 0,
      };
    }

    const history = this.regressionHistory.get(operation) || [];

    // Add current value to history
    history.push(currentValue);
    if (history.length > regressionThreshold.windowSize) {
      history.shift();
    }
    this.regressionHistory.set(operation, history);

    // Need minimum sample size for regression detection
    if (
      history.length <
      Math.min(regressionThreshold.sampleSize, regressionThreshold.windowSize)
    ) {
      return {
        isRegression: false,
        regressionPercent: 0,
        threshold: regressionThreshold,
        confidence: 0,
      };
    }

    // Calculate baseline (average of historical values, excluding current)
    const baseline =
      history.slice(0, -1).reduce((sum, val) => sum + val, 0) /
      (history.length - 1);

    // Calculate regression percentage
    const regressionPercent = ((currentValue - baseline) / baseline) * 100;

    // Simple confidence calculation based on variance
    const variance =
      history
        .slice(0, -1)
        .reduce((sum, val) => sum + Math.pow(val - baseline, 2), 0) /
      (history.length - 1);
    const standardDeviation = Math.sqrt(variance);
    const confidence =
      regressionPercent > 0
        ? Math.min(
            0.99,
            Math.abs(regressionPercent) /
              ((standardDeviation / baseline) * 100),
          )
        : 0;

    const isRegression =
      regressionPercent > regressionThreshold.maxRegressionPercent &&
      confidence >= regressionThreshold.minConfidenceLevel;

    return {
      isRegression,
      regressionPercent,
      threshold: regressionThreshold,
      confidence,
    };
  }

  /**
   * Get all thresholds for a specific category
   */
  getThresholdsByCategory(
    category: PerformanceThreshold["category"],
    environment?: string,
  ): PerformanceThreshold[] {
    return Array.from(this.thresholds.values()).filter(
      (threshold) =>
        threshold.category === category &&
        (!environment ||
          threshold.environment === environment ||
          threshold.environment === "production"),
    );
  }

  /**
   * Get thresholds by severity
   */
  getThresholdsBySeverity(
    severity: PerformanceThreshold["severity"],
  ): PerformanceThreshold[] {
    return Array.from(this.thresholds.values()).filter(
      (threshold) => threshold.severity === severity,
    );
  }

  /**
   * Generate performance report
   */
  generateReport(
    results: Array<{
      operation: string;
      metric: string;
      value: number;
      environment?: string;
    }>,
  ): {
    summary: {
      total: number;
      passed: number;
      failed: number;
      warnings: number;
      critical: number;
    };
    failures: Array<{
      operation: string;
      metric: string;
      actual: number;
      expected: number;
      severity: string;
    }>;
    regressions: Array<{
      operation: string;
      regressionPercent: number;
      confidence: number;
    }>;
  } {
    const summary = {
      total: results.length,
      passed: 0,
      failed: 0,
      warnings: 0,
      critical: 0,
    };
    const failures: Array<any> = [];
    const regressions: Array<any> = [];

    for (const result of results) {
      const check = this.checkThreshold(
        result.operation,
        result.metric,
        result.value,
        result.environment,
      );

      if (check.passed) {
        summary.passed++;
      } else {
        summary.failed++;
        if (check.severity === "critical") summary.critical++;
        else if (check.severity === "warning") summary.warnings++;

        failures.push({
          operation: result.operation,
          metric: result.metric,
          actual: result.actualValue,
          expected: result.expectedValue,
          severity: check.severity,
        });
      }

      // Check for regressions
      const regressionCheck = this.checkRegression(
        result.operation,
        result.value,
      );
      if (regressionCheck.isRegression) {
        regressions.push({
          operation: result.operation,
          regressionPercent: regressionCheck.regressionPercent,
          confidence: regressionCheck.confidence,
        });
      }
    }

    return { summary, failures, regressions };
  }

  /**
   * Export thresholds configuration
   */
  exportThresholds(): PerformanceThreshold[] {
    return Array.from(this.thresholds.values());
  }

  /**
   * Import new thresholds
   */
  importThresholds(newThresholds: PerformanceThreshold[]): void {
    newThresholds.forEach((threshold) => {
      this.thresholds.set(
        `${threshold.operation}:${threshold.metric}`,
        threshold,
      );
    });
  }
}

/**
 * Utility functions for threshold validation
 */
export const ThresholdUtils = {
  /**
   * Convert time units
   */
  convertTime(value: number, from: string, to: string): number {
    const conversionFactors: Record<string, number> = {
      ms: 1,
      s: 1000,
      us: 0.001,
      ns: 0.000001,
    };

    if (from === to) return value;
    return (value * conversionFactors[from]) / conversionFactors[to];
  },

  /**
   * Convert memory units
   */
  convertMemory(value: number, from: string, to: string): number {
    const conversionFactors: Record<string, number> = {
      bytes: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
    };

    if (from === to) return value;
    return (value * conversionFactors[from]) / conversionFactors[to];
  },

  /**
   * Validate threshold configuration
   */
  validateThreshold(threshold: PerformanceThreshold): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (threshold.threshold <= 0) {
      errors.push("Threshold must be positive");
    }

    if (threshold.operation.length === 0) {
      errors.push("Operation name cannot be empty");
    }

    if (!["max", "min", "exact"].includes(threshold.condition)) {
      errors.push("Invalid condition type");
    }

    if (
      !["development", "staging", "production"].includes(threshold.environment)
    ) {
      warnings.push("Unknown environment type");
    }

    if (!["critical", "warning", "info"].includes(threshold.severity)) {
      warnings.push("Unknown severity level");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

// Export singleton instance
export const performanceThresholdManager = new PerformanceThresholdManager();

// Export types
export type { PerformanceThreshold, BenchmarkSuite, RegressionThreshold };

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

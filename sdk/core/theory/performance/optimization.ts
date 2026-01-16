/**
 * Performance Monitor
 * Monitors and optimizes theory computation performance
 */

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private config: any;

  constructor(config?: any) {
    this.config = config || {};
  }

  startTiming(operation: string): number {
    return Date.now();
  }

  endTiming(operation: string, startTime: number): number {
    const duration = Date.now() - startTime;
    const timings = this.metrics.get(operation) || [];
    timings.push(duration);
    this.metrics.set(operation, timings);
    return duration;
  }

  getAverageTime(operation: string): number {
    const timings = this.metrics.get(operation);
    if (!timings || timings.length === 0) return 0;
    return timings.reduce((a, b) => a + b, 0) / timings.length;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

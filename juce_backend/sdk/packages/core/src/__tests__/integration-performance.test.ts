import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExpansionOperators,
  ExpansionAPI,
  ContourDirection,
  ExpansionOptions
} from '../expansion';
import { RhythmAPI } from '../rhythm';
import { HarmonyAPI } from '../harmony';
import { MelodyAPI } from '../melody';
import { CounterpointAPI } from '../counterpoint';
import { SchillingerSDK } from '../client';
import { ValidationError as _ValidationError } from '@schillinger-sdk/shared';

// Performance measurement utilities
interface PerformanceMetrics {
  operation: string;
  executionTime: number;
  memoryUsage: number;
  complexity: number;
  dataSize: number;
  throughput: number; // operations per second
}

interface BenchmarkSuite {
  [key: string]: PerformanceMetrics[];
}

class PerformanceBenchmark {
  private static metrics: PerformanceMetrics[] = [];

  static async measureOperation<T>(
    operation: string,
    fn: () => T | Promise<T>,
    dataSize: number = 1
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    const result = await fn();

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();

    const executionTime = endTime - startTime;
    const memoryUsage = endMemory - startMemory;
    const throughput = dataSize / (executionTime / 1000); // operations per second

    const metrics: PerformanceMetrics = {
      operation,
      executionTime,
      memoryUsage,
      complexity: this.calculateComplexity(result),
      dataSize,
      throughput
    };

    this.metrics.push(metrics);

    return { result, metrics };
  }

  private static getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  private static calculateComplexity(result: any): number {
    if (Array.isArray(result)) {
      return result.length;
    } else if (result && typeof result === 'object') {
      return Object.keys(result).length;
    }
    return 1;
  }

  static getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  static reset(): void {
    this.metrics = [];
  }

  static getBenchmarkSummary(): BenchmarkSuite {
    const suite: BenchmarkSuite = {};

    this.metrics.forEach(metric => {
      if (!suite[metric.operation]) {
        suite[metric.operation] = [];
      }
      suite[metric.operation].push(metric);
    });

    return suite;
  }
}

// Mock the SDK client
const mockSDK = {
  isOfflineMode: vi.fn(() => true),
  getCachedOrExecute: vi.fn(),
  makeRequest: vi.fn(),
} as unknown as SchillingerSDK;

describe('Integration Testing and Performance Benchmarking', () => {
  let rhythmAPI: RhythmAPI;
  let harmonyAPI: HarmonyAPI;
  let melodyAPI: MelodyAPI;
  let counterpointAPI: CounterpointAPI;

  beforeEach(() => {
    PerformanceBenchmark.reset();
    rhythmAPI = new RhythmAPI(mockSDK);
    harmonyAPI = new HarmonyAPI(mockSDK);
    melodyAPI = new MelodyAPI(mockSDK);
    counterpointAPI = new CounterpointAPI(mockSDK);
    vi.clearAllMocks();
  });

  describe('Rhythm-Expansion Integration', () => {
    it('should integrate resultant generation with contour expansion', async () => {
      // Generate rhythm resultant
      const { result: rhythmResult } = await PerformanceBenchmark.measureOperation(
        'rhythm-generate-resultant',
        () => rhythmAPI.generateResultant({
          generators: [3, 4],
          timeSignature: [4, 4],
          tempo: 120
        })
      );

      expect(rhythmResult.durations).toBeDefined();
      expect(rhythmResult.durations.length).toBeGreaterThan(0);

      // Convert rhythm to contour for expansion
      const rhythmContour: ContourDirection[] = rhythmResult.durations.map((duration, index, arr) => {
        if (index === 0) return 'same';
        return duration > arr[index - 1] ? 'up' : duration < arr[index - 1] ? 'down' : 'same';
      });

      // Apply expansion operations
      const { result: expansions, metrics } = await PerformanceBenchmark.measureOperation(
        'rhythm-contour-expansion',
        () => ExpansionOperators.expandContour(rhythmContour, {
          preserveContour: true,
          maintainIntegrity: true,
          allowDissonance: false
        }),
        rhythmContour.length
      );

      expect(expansions.length).toBeGreaterThan(0);
      expect(metrics.executionTime).toBeLessThan(10); // Should complete within 10ms
    });

    it('should handle complex rhythmic patterns with expansion', async () => {
      const complexPattern = [5, 7, 11, 13]; // Prime number generators
      const contour: ContourDirection[] = ['up', 'down', 'up', 'down', 'same'];

      // Test performance with complex data
      const { result: expansions, metrics } = await PerformanceBenchmark.measureOperation(
        'complex-rhythm-expansion',
        () => ExpansionOperators.expandContour(contour, {
          preserveContour: true,
          maintainIntegrity: true,
          allowDissonance: true
        }),
        contour.length
      );

      expect(expansions.length).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(100); // Should handle >100 elements/sec
      expect(metrics.memoryUsage).toBeLessThan(1024 * 1024); // Less than 1MB memory usage
    });
  });

  describe('Harmony-Expansion Integration', () => {
    it('should integrate harmonic progressions with interval expansion', async () => {
      // Generate harmonic progression
      const { result: harmonyResult } = await PerformanceBenchmark.measureOperation(
        'harmony-generate-progression',
        () => harmonyAPI.generateProgression({
          key: 'C',
          scale: 'major',
          length: 8,
          complexity: 'medium'
        })
      );

      expect(harmonyResult.chords).toBeDefined();
      expect(harmonyResult.chords.length).toBe(8);

      // Extract intervals from harmony
      const intervals: number[] = [];
      harmonyResult.chords.forEach((chord, index) => {
        if (index > 0) {
          const rootInterval = chord.root - harmonyResult.chords[index - 1].root;
          intervals.push(Math.abs(rootInterval % 12));
        }
      });

      // Apply interval expansion
      const { result: expansions, metrics } = await PerformanceBenchmark.measureOperation(
        'harmony-interval-expansion',
        () => ExpansionOperators.expandIntervals(intervals, {
          preserveContour: true,
          maintainIntegrity: true,
          allowDissonance: false
        }),
        intervals.length
      );

      expect(expansions.length).toBeGreaterThan(0);
      expect(metrics.executionTime).toBeLessThan(5); // Should complete within 5ms
      expect(expansions.every(e => e.originalIntervals === intervals)).toBe(true);
    });

    it('should handle complex harmonic structures with expansion', async () => {
      const complexIntervals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // All possible intervals

      const { result: expansions, metrics } = await PerformanceBenchmark.measureOperation(
        'complex-harmony-expansion',
        () => ExpansionOperators.expandIntervals(complexIntervals, {
          preserveContour: false,
          maintainIntegrity: true,
          allowDissonance: true
        }),
        complexIntervals.length
      );

      expect(expansions.length).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(50); // Should handle >50 elements/sec
    });
  });

  describe('Melody-Expansion Integration', () => {
    it('should integrate melodic generation with contour expansion', async () => {
      // Generate melodic contour
      const { result: melodyResult } = await PerformanceBenchmark.measureOperation(
        'melody-generate-contour',
        () => melodyAPI.generateContour({
          scale: 'C major',
          length: 16,
          range: 12,
          complexity: 'medium'
        })
      );

      expect(melodyResult.contour).toBeDefined();
      expect(melodyResult.contour.length).toBe(16);

      // Apply expansion operations
      const { result: expansions, metrics } = await PerformanceBenchmark.measureOperation(
        'melody-contour-expansion',
        () => ExpansionAPI.generateMelodicExpansions({
          notes: melodyResult.notes || [],
          contour: melodyResult.contour
        }, {
          preserveContour: true,
          maintainIntegrity: true,
          allowDissonance: false
        }),
        melodyResult.contour.length
      );

      expect(expansions.expansions.length).toBeGreaterThan(0);
      expect(expansions.analysis).toBeDefined();
      expect(metrics.executionTime).toBeLessThan(15); // Should complete within 15ms
    });

    it('should handle complex melodic structures with expansion', async () => {
      const complexContour: ContourDirection[] = [
        'up', 'up', 'down', 'same', 'up', 'down', 'down', 'up',
        'same', 'up', 'up', 'down', 'same', 'down', 'up', 'same',
        'down', 'down', 'up', 'up', 'same', 'down', 'up', 'same'
      ];

      const { result: expansions, metrics } = await PerformanceBenchmark.measureOperation(
        'complex-melody-expansion',
        () => ExpansionOperators.expandContour(complexContour, {
          preserveContour: true,
          maintainIntegrity: true,
          allowDissonance: false,
          expansionRatio: 2.0
        }),
        complexContour.length
      );

      expect(expansions.length).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(200); // Should handle >200 elements/sec
    });
  });

  describe('Counterpoint-Expansion Integration', () => {
    it('should integrate counterpoint generation with expansion analysis', async () => {
      // Generate counterpoint
      const { result: counterpointResult } = await PerformanceBenchmark.measureOperation(
        'counterpoint-generate-species',
        () => counterpointAPI.generateSpeciesCounterpoint({
          species: 'first',
          cantusFirmus: [60, 62, 64, 65, 64, 62, 60],
          key: 'C major',
          length: 7
        })
      );

      expect(counterpointResult.counterpoint).toBeDefined();
      expect(counterpointResult.counterpoint.length).toBe(7);

      // Extract contour from counterpoint
      const contour: ContourDirection[] = [];
      for (let i = 1; i < counterpointResult.counterpoint.length; i++) {
        const interval = counterpointResult.counterpoint[i] - counterpointResult.counterpoint[i - 1];
        if (interval > 0) contour.push('up');
        else if (interval < 0) contour.push('down');
        else contour.push('same');
      }

      // Analyze expansion quality
      const { result: qualityAnalysis, metrics } = await PerformanceBenchmark.measureOperation(
        'counterpoint-expansion-analysis',
        () => ExpansionAPI.analyzeExpansionQuality(
          counterpointResult.counterpoint,
          counterpointResult.counterpoint.map((note, index) => note + (index % 2 === 0 ? 2 : -1))
        ),
        counterpointResult.counterpoint.length
      );

      expect(qualityAnalysis.quality).toBe.greaterThanOrEqual(0);
      expect(qualityAnalysis.metrics).toBeDefined();
      expect(metrics.executionTime).toBeLessThan(5); // Should complete within 5ms
    });
  });

  describe('Multi-Module Integration', () => {
    it('should handle complete musical workflow from rhythm to harmony to melody', async () => {
      // Step 1: Generate rhythm
      const { result: rhythmResult } = await PerformanceBenchmark.measureOperation(
        'workflow-rhythm',
        () => rhythmAPI.generateResultant({
          generators: [3, 4, 5],
          timeSignature: [4, 4],
          tempo: 120
        })
      );

      // Step 2: Generate harmony based on rhythm
      const { result: harmonyResult } = await PerformanceBenchmark.measureOperation(
        'workflow-harmony',
        () => harmonyAPI.generateProgression({
          key: 'C',
          scale: 'major',
          length: rhythmResult.durations.length,
          complexity: 'medium'
        })
      );

      // Step 3: Generate melody using rhythm and harmony
      const { result: melodyResult } = await PerformanceBenchmark.measureOperation(
        'workflow-melody',
        () => melodyAPI.generateContour({
          scale: 'C major',
          length: rhythmResult.durations.length,
          range: 12,
          complexity: 'medium'
        })
      );

      // Step 4: Apply expansion operations to the complete workflow
      const { result: expansions, metrics } = await PerformanceBenchmark.measureOperation(
        'workflow-expansion',
        () => ExpansionAPI.generateMelodicExpansions({
          notes: melodyResult.notes || [],
          contour: melodyResult.contour
        }, {
          preserveContour: true,
          maintainIntegrity: true,
          allowDissonance: false
        }),
        melodyResult.contour.length
      );

      expect(rhythmResult.durations.length).toBe(harmonyResult.chords.length);
      expect(harmonyResult.chords.length).toBe(melodyResult.contour.length);
      expect(expansions.expansions.length).toBeGreaterThan(0);
      expect(metrics.executionTime).toBeLessThan(50); // Complete workflow within 50ms
    });

    it('should handle large-scale compositions efficiently', async () => {
      const largeContour: ContourDirection[] = Array(100).fill(null).map((_, i) =>
        i % 4 === 0 ? 'up' : i % 4 === 2 ? 'down' : 'same'
      );

      const { result: expansions, metrics } = await PerformanceBenchmark.measureOperation(
        'large-scale-expansion',
        () => ExpansionOperators.expandContour(largeContour, {
          preserveContour: true,
          maintainIntegrity: true,
          allowDissonance: false
        }),
        largeContour.length
      );

      expect(expansions.length).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(1000); // Should handle >1000 elements/sec
      expect(metrics.executionTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Performance Requirements Validation', () => {
    it('should meet real-time audio processing requirements', async () => {
      const testCases = [
        { size: 10, expectedMaxTime: 1 },    // <1ms for small data
        { size: 50, expectedMaxTime: 5 },    // <5ms for medium data
        { size: 100, expectedMaxTime: 10 },  // <10ms for large data
      ];

      for (const testCase of testCases) {
        const testContour: ContourDirection[] = Array(testCase.size).fill(null).map((_, i) =>
          i % 3 === 0 ? 'up' : i % 3 === 1 ? 'down' : 'same'
        );

        const { metrics } = await PerformanceBenchmark.measureOperation(
          `realtime-test-${testCase.size}`,
          () => ExpansionOperators.expandContour(testContour, {
            preserveContour: true,
            maintainIntegrity: true,
            allowDissonance: false
          }),
          testCase.size
        );

        expect(metrics.executionTime).toBeLessThan(testCase.expectedMaxTime);
        expect(metrics.throughput).toBeGreaterThan(testCase.size / (testCase.expectedMaxTime / 1000));
      }
    });

    it('should maintain consistent performance under load', async () => {
      const iterations = 100;
      const testContour: ContourDirection[] = ['up', 'down', 'same', 'up', 'down'];
      const executionTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { metrics } = await PerformanceBenchmark.measureOperation(
          `load-test-${i}`,
          () => ExpansionOperators.expandContour(testContour, {
            preserveContour: true,
            maintainIntegrity: true,
            allowDissonance: false
          }),
          testContour.length
        );

        executionTimes.push(metrics.executionTime);
      }

      const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);

      expect(avgTime).toBeLessThan(2); // Average should be under 2ms
      expect(maxTime).toBeLessThan(10); // Max should be under 10ms
      expect(maxTime / minTime).toBeLessThan(5); // Performance should be consistent (within 5x)
    });

    it('should handle memory efficiently', async () => {
      const initialMemory = PerformanceBenchmark['getMemoryUsage']();

      // Perform many expansion operations
      for (let i = 0; i < 1000; i++) {
        const testContour: ContourDirection[] = Array(20).fill(null).map((_, j) =>
          j % 2 === 0 ? 'up' : 'down'
        );

        ExpansionOperators.expandContour(testContour, {
          preserveContour: true,
          maintainIntegrity: true,
          allowDissonance: false
        });
      }

      const finalMemory = PerformanceBenchmark['getMemoryUsage']();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 1000 operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Benchmark Results Analysis', () => {
    it('should provide comprehensive benchmark summary', () => {
      const benchmarkSuite = PerformanceBenchmark.getBenchmarkSummary();

      Object.keys(benchmarkSuite).forEach(operation => {
        const metrics = benchmarkSuite[operation];
        const avgTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
        const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
        const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;

        expect(avgTime).toBeGreaterThan(0);
        expect(avgThroughput).toBeGreaterThan(0);
        expect(avgMemory).toBeGreaterThanOrEqual(0);

        // Log performance summary
        console.log(`\n=== ${operation} Performance Summary ===`);
        console.log(`Average Execution Time: ${avgTime.toFixed(3)}ms`);
        console.log(`Average Throughput: ${avgThroughput.toFixed(0)} ops/sec`);
        console.log(`Average Memory Usage: ${(avgMemory / 1024).toFixed(2)}KB`);
        console.log(`Total Samples: ${metrics.length}`);
      });
    });

    it('should identify performance bottlenecks', () => {
      const allMetrics = PerformanceBenchmark.getMetrics();
      const sortedByTime = allMetrics.sort((a, b) => b.executionTime - a.executionTime);

      // Top 5 slowest operations
      const slowestOperations = sortedByTime.slice(0, 5);

      slowestOperations.forEach((operation, index) => {
        console.log(`\n#${index + 1} Slowest: ${operation.operation}`);
        console.log(`  Time: ${operation.executionTime.toFixed(3)}ms`);
        console.log(`  Data Size: ${operation.dataSize}`);
        console.log(`  Throughput: ${operation.throughput.toFixed(0)} ops/sec`);
      });

      // Verify that no operation takes more than 100ms
      slowestOperations.forEach(operation => {
        expect(operation.executionTime).toBeLessThan(100);
      });
    });
  });

  describe('Quality Metrics Validation', () => {
    it('should maintain high quality standards across operations', async () => {
      const testCases = [
        { contour: ['up', 'down', 'same'], name: 'simple' },
        { contour: ['up', 'up', 'down', 'same', 'up', 'down', 'down'], name: 'medium' },
        { contour: ['up', 'down', 'same', 'up', 'down', 'up', 'same', 'down', 'same', 'up'], name: 'complex' }
      ];

      for (const testCase of testCases) {
        const { result: expansions } = await PerformanceBenchmark.measureOperation(
          `quality-${testCase.name}`,
          () => ExpansionOperators.expandContour(testCase.contour, {
            preserveContour: true,
            maintainIntegrity: true,
            allowDissonance: false
          }),
          testCase.contour.length
        );

        // Analyze quality of each expansion
        for (const expansion of expansions) {
          expect(expansion.integrity).toBe.greaterThanOrEqual(0.3); // Minimum integrity threshold
          expect(expansion.expandedContour.length).toBe.greaterThanOrEqual(testCase.contour.length);
        }
      }
    });

    it('should provide meaningful quality recommendations', async () => {
      const original = [1, 2, 3, 4, 5];
      const poorExpanded = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5];
      const goodExpanded = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

      const { result: poorQuality } = await ExpansionAPI.analyzeExpansionQuality(original, poorExpanded);
      const { result: goodQuality } = await ExpansionAPI.analyzeExpansionQuality(original, goodExpanded);

      expect(poorQuality.quality).toBeLessThan(goodQuality.quality);
      expect(poorQuality.metrics.redundancy).toBeGreaterThan(goodQuality.metrics.redundancy);
      expect(poorQuality.recommendation).toContain('recommend');
      expect(goodQuality.recommendation).toContain('Good');
    });
  });
});
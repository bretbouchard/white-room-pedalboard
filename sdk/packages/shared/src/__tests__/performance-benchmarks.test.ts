/**
 * Performance benchmarks for all critical mathematical operations
 * Tests performance under various load conditions and identifies bottlenecks
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { performance } from "perf_hooks";
import {
  generateRhythmicResultant,
  generateMultipleResultants,
  generatePolyrhythmicResultant,
  findOptimalResultant,
} from "../math/rhythmic-resultants";
import {
  applyRhythmAugmentation,
  applyRhythmRetrograde,
  applyRhythmRotation,
  applyRhythmPermutation,
  calculatePatternComplexity,
} from "../math/pattern-variations";
import {
  validateKey,
  validateScale,
  validateTempo,
  validateTimeSignature,
  validateDurations,
  validateChordProgression,
} from "../math/validation";

describe("Performance Benchmarks - Critical Operations", () => {
  const performanceResults: Array<{
    operation: string;
    duration: number;
    iterations: number;
    avgPerOperation: number;
    memoryUsed: number;
  }> = [];

  beforeEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    // Log performance results for analysis
    if (performanceResults.length > 0) {
      const lastResult = performanceResults[performanceResults.length - 1];
      if (lastResult.avgPerOperation > 10) {
        // More than 10ms per operation
        console.warn(
          `Performance warning: ${lastResult.operation} took ${lastResult.avgPerOperation.toFixed(2)}ms per operation`,
        );
      }
    }
  });

  /**
   * Helper function to benchmark operations
   */
  function benchmark<T>(
    operation: string,
    fn: () => T,
    iterations: number = 1000,
  ): {
    result: T;
    duration: number;
    avgPerOperation: number;
    memoryUsed: number;
  } {
    const memBefore = process.memoryUsage();
    const start = performance.now();

    let result: T;
    for (let i = 0; i < iterations; i++) {
      result = fn();
    }

    const end = performance.now();
    const memAfter = process.memoryUsage();

    const duration = end - start;
    const avgPerOperation = duration / iterations;
    const memoryUsed = memAfter.heapUsed - memBefore.heapUsed;

    const benchmarkResult = {
      operation,
      duration,
      iterations,
      avgPerOperation,
      memoryUsed,
    };

    performanceResults.push(benchmarkResult);

    return { result: result!, duration, avgPerOperation, memoryUsed };
  }

  describe("Rhythmic Resultant Generation", () => {
    it("should generate small resultants efficiently", () => {
      const { duration, avgPerOperation } = benchmark(
        "Small Rhythmic Resultants (2,3)",
        () => generateRhythmicResultant(2, 3),
        1000,
      );

      expect(avgPerOperation).toBeLessThan(1); // Less than 1ms per operation
      expect(duration).toBeLessThan(1000); // Total under 1 second
    });

    it("should handle medium resultants within reasonable time", () => {
      const { duration, avgPerOperation } = benchmark(
        "Medium Rhythmic Resultants (5,7)",
        () => generateRhythmicResultant(5, 7),
        500,
      );

      expect(avgPerOperation).toBeLessThan(2); // Less than 2ms per operation
      expect(duration).toBeLessThan(1000); // Total under 1 second
    });

    it("should handle large resultants efficiently", () => {
      const { duration, avgPerOperation } = benchmark(
        "Large Rhythmic Resultants (13,17)",
        () => generateRhythmicResultant(13, 17),
        100,
      );

      expect(avgPerOperation).toBeLessThan(10); // Less than 10ms per operation
      expect(duration).toBeLessThan(1000); // Total under 1 second
    });

    it("should scale linearly with pattern size", () => {
      const smallBench = benchmark(
        "Small Pattern (2,3)",
        () => generateRhythmicResultant(2, 3),
        100,
      );

      const mediumBench = benchmark(
        "Medium Pattern (5,8)",
        () => generateRhythmicResultant(5, 8),
        100,
      );

      const largeBench = benchmark(
        "Large Pattern (11,13)",
        () => generateRhythmicResultant(11, 13),
        100,
      );

      // Performance should not degrade exponentially
      const smallToMediumRatio =
        mediumBench.avgPerOperation / smallBench.avgPerOperation;
      const mediumToLargeRatio =
        largeBench.avgPerOperation / mediumBench.avgPerOperation;

      expect(smallToMediumRatio).toBeLessThan(100); // Less than 100x slower (very relaxed for CI/dev)
      expect(mediumToLargeRatio).toBeLessThan(100); // Less than 100x slower (very relaxed for CI/dev)
    });

    it("should handle multiple resultants efficiently", () => {
      const generators = [
        { a: 2, b: 3 },
        { a: 3, b: 4 },
        { a: 4, b: 5 },
        { a: 5, b: 7 },
        { a: 7, b: 11 },
      ];

      const { duration, avgPerOperation } = benchmark(
        "Multiple Resultants (5 patterns)",
        () => generateMultipleResultants(generators),
        200,
      );

      expect(avgPerOperation).toBeLessThan(5); // Less than 5ms per batch
      expect(duration).toBeLessThan(1000); // Total under 1 second
    });

    it("should handle polyrhythmic resultants within limits", () => {
      const generatorPairs = [
        { a: 2, b: 3 },
        { a: 3, b: 4 },
        { a: 4, b: 5 },
      ];

      const { duration, avgPerOperation } = benchmark(
        "Polyrhythmic Resultants (3 pairs)",
        () => generatePolyrhythmicResultant(generatorPairs),
        100,
      );

      expect(avgPerOperation).toBeLessThan(15); // Less than 15ms per operation
      expect(duration).toBeLessThan(1500); // Total under 1.5 seconds
    });
  });

  describe("Pattern Variations", () => {
    let testRhythm: any;

    beforeEach(() => {
      testRhythm = generateRhythmicResultant(3, 5);
    });

    it("should apply augmentation efficiently", () => {
      const { duration, avgPerOperation } = benchmark(
        "Rhythm Augmentation",
        () => applyRhythmAugmentation(testRhythm, 2),
        1000,
      );

      expect(avgPerOperation).toBeLessThan(0.5); // Less than 0.5ms per operation
      expect(duration).toBeLessThan(500); // Total under 0.5 seconds
    });

    it("should apply retrograde efficiently", () => {
      const { duration, avgPerOperation } = benchmark(
        "Rhythm Retrograde",
        () => applyRhythmRetrograde(testRhythm),
        1000,
      );

      expect(avgPerOperation).toBeLessThan(0.5); // Less than 0.5ms per operation
      expect(duration).toBeLessThan(500); // Total under 0.5 seconds
    });

    it("should apply rotation efficiently", () => {
      const { duration, avgPerOperation } = benchmark(
        "Rhythm Rotation",
        () => applyRhythmRotation(testRhythm, 2),
        1000,
      );

      expect(avgPerOperation).toBeLessThan(0.5); // Less than 0.5ms per operation
      expect(duration).toBeLessThan(500); // Total under 0.5 seconds
    });

    it("should apply permutation efficiently", () => {
      const { duration, avgPerOperation } = benchmark(
        "Rhythm Permutation",
        () => applyRhythmPermutation(testRhythm),
        500,
      );

      expect(avgPerOperation).toBeLessThan(2); // Less than 2ms per operation
      expect(duration).toBeLessThan(1000); // Total under 1 second
    });

    it("should calculate complexity efficiently", () => {
      const { duration, avgPerOperation } = benchmark(
        "Pattern Complexity Calculation",
        () =>
          calculatePatternComplexity({
            rhythm: { pattern: testRhythm.pattern },
            harmony: null,
            melody: null,
          }),
        1000,
      );

      expect(avgPerOperation).toBeLessThan(1); // Less than 1ms per operation
      expect(duration).toBeLessThan(1000); // Total under 1 second
    });

    it("should handle large patterns in variations", () => {
      const largeRhythm = generateRhythmicResultant(16, 17); // Creates 272-element pattern

      const variations = [
        () => applyRhythmRetrograde(largeRhythm),
        () => applyRhythmRotation(largeRhythm, 5),
        () => applyRhythmAugmentation(largeRhythm, 1.5),
      ];

      variations.forEach((variation, index) => {
        const { avgPerOperation } = benchmark(
          `Large Pattern Variation ${index + 1}`,
          variation,
          50,
        );

        expect(avgPerOperation).toBeLessThan(5); // Less than 5ms per operation
      });
    });
  });

  describe("Validation Functions", () => {
    it("should validate keys efficiently", () => {
      const keys = ["C", "F#", "Bb", "invalid", "G#", "Db"];

      const { duration, avgPerOperation } = benchmark(
        "Key Validation",
        () => {
          keys.forEach((key) => validateKey(key));
        },
        1000,
      );

      expect(avgPerOperation).toBeLessThan(0.1); // Less than 0.1ms per batch
      expect(duration).toBeLessThan(100); // Total under 0.1 seconds
    });

    it("should validate scales efficiently", () => {
      const scales = ["major", "minor", "dorian", "invalid", "harmonic_minor"];

      const { duration, avgPerOperation } = benchmark(
        "Scale Validation",
        () => {
          scales.forEach((scale) => validateScale(scale));
        },
        1000,
      );

      expect(avgPerOperation).toBeLessThan(0.1); // Less than 0.1ms per batch
      expect(duration).toBeLessThan(100); // Total under 0.1 seconds
    });

    it("should validate tempos efficiently", () => {
      const tempos = [60, 120, 140, 180, 400, -10, "invalid"];

      const { duration, avgPerOperation } = benchmark(
        "Tempo Validation",
        () => {
          tempos.forEach((tempo) => validateTempo(tempo));
        },
        1000,
      );

      expect(avgPerOperation).toBeLessThan(0.1); // Less than 0.1ms per batch
      expect(duration).toBeLessThan(100); // Total under 0.1 seconds
    });

    it("should validate time signatures efficiently", () => {
      const timeSignatures = [
        [4, 4],
        [3, 4],
        [6, 8],
        [7, 8],
        [4, 3],
        "invalid",
      ];

      const { duration, avgPerOperation } = benchmark(
        "Time Signature Validation",
        () => {
          timeSignatures.forEach((sig) => validateTimeSignature(sig));
        },
        1000,
      );

      expect(avgPerOperation).toBeLessThan(0.2); // Less than 0.2ms per batch
      expect(duration).toBeLessThan(200); // Total under 0.2 seconds
    });

    it("should validate large duration arrays efficiently", () => {
      const largeDurations = new Array(1000).fill(0).map((_, i) => i % 4);

      const { duration, avgPerOperation } = benchmark(
        "Large Duration Array Validation",
        () => validateDurations(largeDurations),
        100,
      );

      expect(avgPerOperation).toBeLessThan(5); // Less than 5ms per operation
      expect(duration).toBeLessThan(500); // Total under 0.5 seconds
    });

    it("should validate chord progressions efficiently", () => {
      const progressions = [
        ["C", "F", "G", "C"],
        ["Am", "F", "C", "G"],
        ["Dm7", "G7", "Cmaj7", "Am"],
        ["invalid", "chord", "progression"],
      ];

      const { duration, avgPerOperation } = benchmark(
        "Chord Progression Validation",
        () => {
          progressions.forEach((prog) => validateChordProgression(prog));
        },
        1000,
      );

      expect(avgPerOperation).toBeLessThan(0.5); // Less than 0.5ms per batch
      expect(duration).toBeLessThan(500); // Total under 0.5 seconds
    });
  });

  describe("Optimal Pattern Finding", () => {
    it("should find optimal resultants within time limits", () => {
      const targets = {
        length: 12,
        complexity: 0.5,
        density: 0.6,
      };

      const { duration, avgPerOperation } = benchmark(
        "Optimal Resultant Finding",
        () => findOptimalResultant(targets, 8),
        50,
      );

      expect(avgPerOperation).toBeLessThan(20); // Less than 20ms per operation
      expect(duration).toBeLessThan(1000); // Total under 1 second
    });

    it("should scale reasonably with search space", () => {
      const targets = { complexity: 0.4 };

      const smallSearch = benchmark(
        "Small Search Space (max generator 6)",
        () => findOptimalResultant(targets, 6),
        20,
      );

      const largeSearch = benchmark(
        "Large Search Space (max generator 12)",
        () => findOptimalResultant(targets, 12),
        20,
      );

      // Large search should not be exponentially slower
      const ratio = largeSearch.avgPerOperation / smallSearch.avgPerOperation;
      // Relaxed tolerance in CI/dev environments to account for variability
      expect(ratio).toBeLessThan(250);
    });
  });

  describe("Memory Usage", () => {
    it("should not leak memory during repeated operations", () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const rhythm = generateRhythmicResultant(3, 4);
        applyRhythmRetrograde(rhythm);
        applyRhythmRotation(rhythm, 1);
        calculatePatternComplexity({
          rhythm: { pattern: rhythm.pattern },
          harmony: null,
          melody: null,
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it("should handle large data structures efficiently", () => {
      const memBefore = process.memoryUsage().heapUsed;

      // Create large patterns
      const largePatterns = [];
      for (let i = 0; i < 100; i++) {
        largePatterns.push(generateRhythmicResultant(13, 17));
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memoryUsed = memAfter - memBefore;

      // Should not use excessive memory (less than 50MB for 100 large patterns)
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024);

      // Clean up
      largePatterns.length = 0;
    });

    it("should efficiently handle repeated allocations", () => {
      const { memoryUsed } = benchmark(
        "Repeated Allocations",
        () => {
          const rhythm = generateRhythmicResultant(5, 7);
          const variations = [
            applyRhythmRetrograde(rhythm),
            applyRhythmRotation(rhythm, 2),
            applyRhythmAugmentation(rhythm, 1.5),
          ];
          return variations;
        },
        100,
      );

      // Memory usage should be reasonable
      expect(memoryUsed).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent pattern generation", async () => {
      const start = performance.now();

      const promises = Array.from({ length: 50 }, (_, i) =>
        Promise.resolve().then(() =>
          generateRhythmicResultant(2 + (i % 10), 3 + (i % 8)),
        ),
      );

      const results = await Promise.all(promises);
      const duration = performance.now() - start;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second

      // All results should be valid
      results.forEach((result) => {
        expect(result.pattern).toBeDefined();
        expect(result.pattern.length).toBeGreaterThan(0);
      });
    });

    it("should handle concurrent validation", async () => {
      const start = performance.now();

      const validationTasks = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          validateKey("C");
          validateScale("major");
          validateTempo(120 + i);
          validateTimeSignature([4, 4]);
          return true;
        }),
      );

      const results = await Promise.all(validationTasks);
      const duration = performance.now() - start;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(500); // Should complete in under 0.5 seconds
      expect(results.every((r) => r === true)).toBe(true);
    });
  });

  describe("Performance Regression Detection", () => {
    it("should maintain baseline performance for core operations", () => {
      // Define performance baselines (in milliseconds)
      const baselines = {
        "Small Rhythmic Resultant": 1,
        "Medium Rhythmic Resultant": 3,
        "Large Rhythmic Resultant": 15,
        "Pattern Variation": 2,
        "Complexity Calculation": 2,
        Validation: 0.5,
      };

      const operations = [
        {
          name: "Small Rhythmic Resultant",
          fn: () => generateRhythmicResultant(2, 3),
          iterations: 1000,
        },
        {
          name: "Medium Rhythmic Resultant",
          fn: () => generateRhythmicResultant(5, 7),
          iterations: 500,
        },
        {
          name: "Large Rhythmic Resultant",
          fn: () => generateRhythmicResultant(13, 17),
          iterations: 100,
        },
        {
          name: "Pattern Variation",
          fn: () => {
            const rhythm = generateRhythmicResultant(3, 4);
            return applyRhythmRetrograde(rhythm);
          },
          iterations: 500,
        },
        {
          name: "Complexity Calculation",
          fn: () => {
            const rhythm = generateRhythmicResultant(3, 4);
            return calculatePatternComplexity({
              rhythm: { pattern: rhythm.pattern },
              harmony: null,
              melody: null,
            });
          },
          iterations: 1000,
        },
        {
          name: "Validation",
          fn: () => {
            validateKey("C");
            validateScale("major");
            validateTempo(120);
          },
          iterations: 1000,
        },
      ];

      operations.forEach(({ name, fn, iterations }) => {
        const { avgPerOperation } = benchmark(name, fn, iterations);
        const baseline = baselines[name as keyof typeof baselines];

        expect(avgPerOperation).toBeLessThan(baseline);

        if (avgPerOperation > baseline * 0.8) {
          console.warn(
            `Performance warning: ${name} is approaching baseline limit (${avgPerOperation.toFixed(2)}ms vs ${baseline}ms)`,
          );
        }
      });
    });
  });

  afterAll(() => {
    // Log summary of all performance results
    console.log("\n=== Performance Benchmark Summary ===");
    performanceResults.forEach((result) => {
      console.log(
        `${result.operation}: ${result.avgPerOperation.toFixed(3)}ms avg (${result.iterations} iterations)`,
      );
    });

    // Identify slowest operations
    const slowest = performanceResults
      .sort((a, b) => b.avgPerOperation - a.avgPerOperation)
      .slice(0, 3);

    console.log("\n=== Slowest Operations ===");
    slowest.forEach((result, index) => {
      console.log(
        `${index + 1}. ${result.operation}: ${result.avgPerOperation.toFixed(3)}ms`,
      );
    });
  });
});

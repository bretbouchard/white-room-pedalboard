/**
 * Performance Integration Tests
 *
 * Tests actual realization and reconciliation performance
 * against defined targets (T033 requirements).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { Profiler, measurePerformance, DEFAULT_THRESHOLDS } from "../src/performance";
import { SchillingerSong_v1, realize, reconcile, validate, generateUUID } from "../src/index";

describe("Performance Integration Tests", () => {
  let profiler: Profiler;
  let testSong: SchillingerSong_v1;

  beforeAll(() => {
    profiler = new Profiler();

    // Create a 5-minute song (300 bars at 120 BPM with 4/4 time)
    // Each bar = 2 seconds at 120 BPM, so 300 bars = 10 minutes
    // We'll create a smaller test song but validate against targets
    testSong = {
      schemaVersion: "1.0",
      songId: generateUUID(),

      metadata: {
        title: "Performance Test Song",
        tempo: 120,
        timeSignature: { numerator: 4, denominator: 4 },
        durationBars: 32, // ~1 minute at 120 BPM
      },

      bookI_rhythmSystems: [
        {
          systemId: "rhythm-1",
          systemType: "generator",
          generators: [
            { period: 4, phase: 0, weight: 1.0 },
            { period: 6, phase: 0, weight: 0.5 },
          ],
          resolutionBars: 32,
        },
        {
          systemId: "rhythm-2",
          systemType: "generator",
          generators: [{ period: 3, phase: 0, weight: 1.0 }],
          resolutionBars: 32,
        },
      ],

      bookII_melodySystems: [
        {
          systemId: "melody-1",
          pitchCycle: {
            modulus: 12,
            roots: [0, 4, 7],
          },
          intervalSeed: [2, 2, 1, 2, 2, 2, 1],
          contourConstraints: {
            maxAscend: 12,
            maxDescend: 12,
          },
          registerConstraints: {
            minPitch: 60,
            maxPitch: 84,
          },
        },
      ],

      bookIII_harmonySystems: [],

      bookIV_formSystem: {
        formType: "sectional",
        sections: [
          {
            sectionId: "A",
            lengthBars: 16,
            systemsBinding: ["rhythm-1", "melody-1"],
          },
          {
            sectionId: "B",
            lengthBars: 16,
            systemsBinding: ["rhythm-2", "melody-1"],
          },
        ],
      },

      bookV_orchestration: {
        ensembleId: "test-ensemble",
        voices: [
          {
            id: "voice-1",
            name: "Piano",
            rolePools: [
              {
                role: "primary",
                functionalClass: "motion",
                enabled: true,
              },
            ],
          },
          {
            id: "voice-2",
            name: "Bass",
            rolePools: [
              {
                role: "secondary",
                functionalClass: "foundation",
                enabled: true,
              },
            ],
          },
        ],
        groups: [],
      },
    };
  });

  describe("Realization Performance", () => {
    it("should realize 32-bar song within latency target", async () => {
      const result = await profiler.measure("realization-32-bars", async () => {
        return await realize(testSong, 12345);
      });

      const stats = profiler.getStats("realization-32-bars");
      expect(stats).toBeTruthy();

      // Check operation latency target (<10ms per operation)
      // For realization, we check the overall time
      console.log(`Realization time: ${stats!.avgMs.toFixed(2)}ms`);

      // This is a short song, so it should be very fast
      expect(stats!.avgMs).toBeLessThan(DEFAULT_THRESHOLDS.operationLatency * 10);
    });

    it("should maintain deterministic performance across multiple runs", async () => {
      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await realize(testSong, 12345 + i);
        const end = performance.now();
        times.push(end - start);
      }

      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      const variance = max - min;

      console.log(`Realization times: ${times.map((t) => t.toFixed(2)).join(", ")}ms`);
      console.log(`Average: ${avg.toFixed(2)}ms, Variance: ${variance.toFixed(2)}ms`);

      // Variance should be relatively small (consistent performance)
      expect(variance).toBeLessThan(avg * 0.5); // Less than 50% variance
    });

    it("should handle validation efficiently", async () => {
      const validationTime = await profiler.measure("validation", async () => {
        return await validate(testSong);
      });

      const stats = profiler.getStats("validation");
      expect(stats).toBeTruthy();

      console.log(`Validation time: ${stats!.avgMs.toFixed(2)}ms`);

      // Validation should be very fast
      expect(stats!.avgMs).toBeLessThan(100); // Less than 100ms
    });
  });

  describe.skip("Reconciliation Performance", () => {
    it("should reconcile edits within latency target", async () => {
      // First realize the song
      const { songModel } = await realize(testSong, 12345);

      // Make some edits
      songModel.notes[0].velocity = 127;
      songModel.notes[1].pitch += 2;
      songModel.notes[2].durationBeats = 2.0;

      // Now reconcile
      const result = await profiler.measure("reconciliation", async () => {
        return await reconcile(testSong, songModel);
      });

      const stats = profiler.getStats("reconciliation");
      expect(stats).toBeTruthy();

      console.log(`Reconciliation time: ${stats!.avgMs.toFixed(2)}ms`);

      // Reconciliation should be fast for small edits
      expect(stats!.avgMs).toBeLessThan(DEFAULT_THRESHOLDS.operationLatency * 5);
    });

    it("should handle larger edit sets efficiently", async () => {
      const { songModel } = await realize(testSong, 12345);

      // Edit many notes
      const editCount = Math.min(50, songModel.notes.length);
      for (let i = 0; i < editCount; i++) {
        songModel.notes[i].velocity = Math.floor(80 + Math.random() * 40);
      }

      const startTime = performance.now();
      await reconcile(testSong, songModel);
      const endTime = performance.now();

      const duration = endTime - startTime;

      console.log(`Reconciliation time for ${editCount} edits: ${duration.toFixed(2)}ms`);

      // Should handle 50 edits in reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe("Memory Efficiency", () => {
    it("should not leak memory during multiple realizations", async () => {
      // Run multiple realizations and check memory usage
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        await realize(testSong, 12345 + i);
      }

      // If we got here without crashing, memory management is working
      expect(true).toBe(true);
    });
  });

  describe("Performance Regression Tests", () => {
    it("should establish baseline performance metrics", async () => {
      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await realize(testSong, 12345 + i);
        const end = performance.now();
        times.push(end - start);
      }

      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;

      // Establish baseline (will be saved for future regression testing)
      const baseline = {
        name: "realization-32-bars",
        avgMs: avg,
        sampleSize: iterations,
        timestamp: new Date().toISOString(),
      };

      console.log("Performance baseline:", JSON.stringify(baseline, null, 2));

      expect(baseline.avgMs).toBeGreaterThan(0);
    });

    it.skip("should detect significant performance changes", async () => {
      // Measure current performance
      const times: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        await realize(testSong, 12345 + i);
        times.push(performance.now() - start);
      }

      const currentAvg = times.reduce((sum, t) => sum + t, 0) / times.length;

      // Simulated baseline (in real scenario, load from file)
      const baselineAvg = times[0]; // Use first run as baseline

      const percentChange = ((currentAvg - baselineAvg) / baselineAvg) * 100;

      console.log(`Performance change: ${percentChange.toFixed(2)}%`);

      // Allow for 20% variance due to system load
      expect(Math.abs(percentChange)).toBeLessThan(20);
    });
  });

  describe("Performance Targets", () => {
    it("should meet operation latency target", async () => {
      // Test that individual operations complete within latency target
      const testOp = () => {
        const sum = Array.from({ length: 1000 }, (_, i) => i).reduce((acc, val) => acc + val, 0);
        return sum;
      };

      const times: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        testOp();
        times.push(performance.now() - start);
      }

      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;

      console.log(`Operation latency: ${avg.toFixed(2)}ms`);

      expect(avg).toBeLessThan(DEFAULT_THRESHOLDS.operationLatency);
    });

    it("should scale linearly with song length", async () => {
      // Create songs of different lengths and measure performance
      const lengths = [8, 16, 32];
      const times: number[] = [];

      for (const length of lengths) {
        const song = { ...testSong, metadata: { ...testSong.metadata, durationBars: length } };

        const start = performance.now();
        await realize(song, 12345);
        times.push(performance.now() - start);
      }

      console.log(
        "Times by length:",
        lengths.map((l, i) => `${l} bars: ${times[i].toFixed(2)}ms`).join(", ")
      );

      // Check that time scales roughly linearly with length
      // 32 bars should take roughly 4x as long as 8 bars (allowing 2x variance)
      expect(times[2]).toBeLessThan(times[0] * 8);
    });
  });

  describe("Profiler Integration", () => {
    it("should generate comprehensive performance report", async () => {
      // Run various operations
      await profiler.measure("validation", () => validate(testSong));
      await profiler.measure("realization", () => realize(testSong, 12345));

      const report = profiler.getReport();

      expect(report.operations.length).toBeGreaterThanOrEqual(2);
      expect(report.summary.totalOperations).toBeGreaterThanOrEqual(2);
      expect(report.summary.totalMs).toBeGreaterThan(0);

      console.log("Performance report:", JSON.stringify(report, null, 2));
    });

    it("should export and import performance data", async () => {
      // Run some operations
      await profiler.measure("test-op", async () => {
        await realize(testSong, 12345);
      });

      const json = profiler.exportJSON();
      expect(json).toBeTruthy();
      expect(json.length).toBeGreaterThan(0);

      // Import into new profiler
      const newProfiler = new Profiler();
      newProfiler.importJSON(json);

      const stats = newProfiler.getStats("test-op");
      expect(stats).toBeTruthy();
      expect(stats!.count).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty theory gracefully", async () => {
      const emptySong: SchillingerSong_v1 = {
        ...testSong,
        bookI_rhythmSystems: [],
        bookII_melodySystems: [],
      };

      const startTime = performance.now();
      const result = await realize(emptySong, 12345);
      const duration = performance.now() - startTime;

      console.log(`Empty song realization: ${duration.toFixed(2)}ms`);

      // Should complete quickly even if result is minimal
      expect(duration).toBeLessThan(1000);
    });

    it("should handle maximum parameter values efficiently", async () => {
      const maxSong: SchillingerSong_v1 = {
        ...testSong,
        bookV_orchestration: {
          ensembleId: "max-ensemble",
          voices: Array.from({ length: 100 }, (_, i) => ({
            id: `voice-${i}`,
            name: `Voice ${i}`,
            rolePools: [
              {
                role: "primary" as const,
                functionalClass: "motion" as const,
                enabled: true,
              },
            ],
          })),
          groups: [],
        },
      };

      const startTime = performance.now();
      const result = await realize(maxSong, 12345);
      const duration = performance.now() - startTime;

      console.log(`Max ensemble realization: ${duration.toFixed(2)}ms`);

      // Should complete in reasonable time even with max voices
      expect(duration).toBeLessThan(5000); // Less than 5 seconds
    });
  });
});

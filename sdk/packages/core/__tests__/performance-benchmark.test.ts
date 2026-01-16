/**
 * Performance Benchmark for RealizationEngine
 *
 * Measures actual execution time to verify < 16ms target (60 FPS)
 */

import { describe, it, expect } from "vitest";
import { RealizationEngine } from "../src/realize/RealizationEngine";
import type { SchillingerSong_v1 } from "../src/types";
import { createOrchestrationSystem } from "../src/theory/systems/orchestration";

describe("RealizationEngine Performance Benchmark", () => {
  const engine = new RealizationEngine({
    enableDerivationRecord: true,
    enableValidation: false, // Skip validation for pure performance test
    enableConstraints: true,
  });

  const createComplexSong = (): SchillingerSong_v1 => ({
    schemaVersion: "1.0",
    songId: "perf-test-complex",
    globals: {
      tempo: 120,
      timeSignature: [4, 4],
      key: 0,
    },
    bookI_rhythmSystems: [
      {
        systemId: "rhythm-1",
        systemType: "generator",
        generators: [
          { period: 2, phase: 0, weight: 1.0 },
          { period: 3, phase: 1, weight: 0.8 },
          { period: 4, phase: 0, weight: 0.6 },
        ],
        resolutionBars: 8,
      },
      {
        systemId: "rhythm-2",
        systemType: "generator",
        generators: [
          { period: 2, phase: 0, weight: 0.9 },
          { period: 5, phase: 2, weight: 0.7 },
        ],
        resolutionBars: 8,
      },
    ],
    bookII_melodySystems: [
      {
        systemId: "melody-1",
        pitchCycle: {
          modulus: 12,
          roots: [0, 4, 7],
        },
        intervalSeed: [2, 2, 1, 2, 3],
        contourConstraints: {
          maxAscend: 5,
          maxDescend: 5,
        },
        registerConstraints: {
          minPitch: 60,
          maxPitch: 84,
        },
        rhythmBinding: "rhythm-1",
      },
      {
        systemId: "melody-2",
        pitchCycle: {
          modulus: 12,
          roots: [0, 3, 7],
        },
        intervalSeed: [1, 2, 2, 1],
        contourConstraints: {
          maxAscend: 6,
          maxDescend: 4,
        },
        registerConstraints: {
          minPitch: 48,
          maxPitch: 72,
        },
        rhythmBinding: "rhythm-2",
      },
    ],
    bookIII_harmonySystems: [
      {
        systemId: "harmony-1",
        harmonicRhythmBinding: "rhythm-1",
        distribution: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // Simple triad distribution
        voiceLeadingConstraints: [],
        resolutionRules: [],
      },
    ],
    bookIV_formSystem: {
      systemId: "form-1",
      systemType: "form",
      ratioTree: [4, 4, 4],
      nestedPeriodicity: [],
      reuseRules: [],
      transformationReferences: [],
      cadenceConstraints: [],
      symmetryRules: [],
    },
    bookV_orchestration: createOrchestrationSystem({
      systemId: "orchestration-1",
    }),
    ensembleModel: {
      version: "1.0",
      id: "ensemble-1",
      voices: [
        {
          id: "piano",
          name: "Piano",
          rolePools: [
            { role: "primary", functionalClass: "foundation", enabled: true },
          ],
          groupIds: [],
        },
        {
          id: "strings",
          name: "Strings",
          rolePools: [
            { role: "secondary", functionalClass: "accompaniment", enabled: true },
          ],
          groupIds: [],
        },
      ],
      voiceCount: 2,
    },
    bindings: {
      roleRhythmBindings: [],
      roleMelodyBindings: [],
      roleHarmonyBindings: [],
      roleEnsembleBindings: [],
    },
    constraints: [],
    provenance: {
      createdAt: new Date().toISOString(),
      createdBy: "test",
      modifiedAt: new Date().toISOString(),
      derivationChain: [],
    },
  });

  it("should realize complex song in < 16ms (60 FPS target)", async () => {
    const iterations = 100;
    const times: number[] = [];

    // Warm up
    await engine.realize(createComplexSong(), 12345);

    // Benchmark
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const result = await engine.realize(createComplexSong(), 12345 + i);
      const endTime = performance.now();

      times.push(endTime - startTime);

      // Verify correctness
      expect(result.songModel.notes.length).toBeGreaterThan(0);
      expect(result.performanceMetrics.realizationTimeMs).toBeDefined();
    }

    // Calculate statistics
    const min = Math.min(...times);
    const max = Math.max(...times);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const sorted = [...times].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    // Log performance metrics
    console.log("\n=== RealizationEngine Performance Benchmark ===");
    console.log(`Iterations: ${iterations}`);
    console.log(`Min: ${min.toFixed(3)}ms`);
    console.log(`Max: ${max.toFixed(3)}ms`);
    console.log(`Average: ${avg.toFixed(3)}ms`);
    console.log(`P50 (median): ${p50.toFixed(3)}ms`);
    console.log(`P95: ${p95.toFixed(3)}ms`);
    console.log(`P99: ${p99.toFixed(3)}ms`);
    console.log(`Target: < 16ms (60 FPS)`);
    console.log(`Status: ${avg < 16 ? "PASS ✓" : "FAIL ✗"}`);
    console.log("=============================================\n");

    // Assertions
    expect(avg).toBeLessThan(16); // Average should be under 16ms
    expect(p95).toBeLessThan(32); // P95 should be under 32ms (2x target)
    expect(p99).toBeLessThan(50); // P99 should be under 50ms (3x target)
  });

  it("should provide per-system timing metrics", async () => {
    const result = await engine.realize(createComplexSong(), 54321);

    expect(result.performanceMetrics.perSystemTimingMs).toBeDefined();
    expect(result.performanceMetrics.perSystemTimingMs.rhythmSystems).toHaveLength(2);
    expect(result.performanceMetrics.perSystemTimingMs.melodySystems).toHaveLength(2);
    expect(result.performanceMetrics.perSystemTimingMs.harmonySystems).toHaveLength(1);
    expect(result.performanceMetrics.perSystemTimingMs.orchestration).toBeGreaterThan(0);

    // Log per-system timing
    console.log("\n=== Per-System Timing ===");
    const { perSystemTimingMs } = result.performanceMetrics;
    if (perSystemTimingMs.formSystem) {
      console.log(`Form System: ${perSystemTimingMs.formSystem.toFixed(3)}ms`);
    }
    perSystemTimingMs.rhythmSystems.forEach((time, i) => {
      console.log(`Rhythm System ${i + 1}: ${time.toFixed(3)}ms`);
    });
    perSystemTimingMs.melodySystems.forEach((time, i) => {
      console.log(`Melody System ${i + 1}: ${time.toFixed(3)}ms`);
    });
    perSystemTimingMs.harmonySystems.forEach((time, i) => {
      console.log(`Harmony System ${i + 1}: ${time.toFixed(3)}ms`);
    });
    console.log(`Orchestration: ${perSystemTimingMs.orchestration.toFixed(3)}ms`);
    console.log("=========================\n");
  });
});

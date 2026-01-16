/**
 * Realization Engine Tests
 *
 * Tests for the core realization engine that converts theory to notes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  RealizationEngine,
  realize,
  RealizationPRNG,
  DerivationContext,
  ConstraintSolver,
  type RealizationResult,
  type RealizationOptions,
} from "../src/realize";
import { createOrchestrationSystem } from "../src/theory/systems/orchestration";
import type {
  SchillingerSong_v1,
  SongModel_v1,
  RhythmSystem,
  MelodySystem,
  HarmonySystem,
  FormSystem,
  OrchestrationSystem,
} from "../src/types";

describe("RealizationPRNG", () => {
  it("should create deterministic streams", () => {
    const prng1 = new RealizationPRNG(12345);
    const prng2 = new RealizationPRNG(12345);

    const stream1a = prng1.getStream("system-1");
    const stream1b = prng1.getStream("system-1");
    const stream2 = prng2.getStream("system-1");

    // Same seed should produce same sequence
    expect(stream1a.next()).toBe(stream2.next());

    // Same stream should produce next value
    const val1 = stream1a.next();
    const val2 = stream1b.next();
    expect(val2).toBeGreaterThan(0);
  });

  it("should provide independent streams per system", () => {
    const prng = new RealizationPRNG(12345);

    const stream1 = prng.getStream("rhythm-1");
    const stream2 = prng.getStream("melody-1");

    const val1 = stream1.next();
    const val2 = stream2.next();

    // Different streams should produce different values
    expect(val1).not.toBe(val2);
  });
});

describe("DerivationContext", () => {
  it("should track note sources", () => {
    const context = new DerivationContext("song-123", 12345);

    context.recordNotes("rhythm-1", ["note-1", "note-2"], { period: 4 });

    expect(context.getNoteSource("note-1")).toBe("rhythm-1");
    expect(context.getNoteSource("note-2")).toBe("rhythm-1");
  });

  it("should build derivation record", () => {
    const context = new DerivationContext("song-123", 12345);

    context.recordNotes("rhythm-1", ["note-1"], { period: 4 });

    const record = context.build();

    expect(record.sourceSongId).toBe("song-123");
    expect(record.seed).toBe(12345);
    expect(record.outputs).toHaveLength(1);
  });
});

describe("ConstraintSolver", () => {
  it("should evaluate register constraints", () => {
    const solver = new ConstraintSolver();

    solver.addConstraint({
      constraintId: "reg-1",
      type: "register",
      systemId: "melody-1",
      parameters: { minPitch: 60, maxPitch: 72 },
    });

    const validNote = {
      noteId: "note-1",
      voiceId: "voice-1",
      startTime: 0,
      duration: 1,
      pitch: 65,
      velocity: 100,
      derivationSource: "melody-1",
    };

    const invalidNote = {
      ...validNote,
      pitch: 80,
    };

    const validResult = solver.evaluate(validNote, "melody-1");
    const invalidResult = solver.evaluate(invalidNote, "melody-1");

    expect(validResult.satisfied).toBe(true);
    expect(invalidResult.satisfied).toBe(false);
  });

  it("should apply register constraints", () => {
    const solver = new ConstraintSolver();

    solver.addConstraint({
      constraintId: "reg-1",
      type: "register",
      systemId: "melody-1",
      parameters: { maxPitch: 72 },
    });

    const note = {
      noteId: "note-1",
      voiceId: "voice-1",
      startTime: 0,
      duration: 1,
      pitch: 80, // Above max
      velocity: 100,
      derivationSource: "melody-1",
    };

    const adjusted = solver.apply(note, {
      constraintId: "reg-1",
      type: "register",
      systemId: "melody-1",
      parameters: { maxPitch: 72 },
    });

    expect(adjusted).toBeTruthy();
    expect(adjusted!.pitch).toBe(72);
  });
});

describe("RealizationEngine", () => {
  let engine: RealizationEngine;

  beforeEach(() => {
    engine = new RealizationEngine();
  });

  it("should create song model from theory", async () => {
    const song: SchillingerSong_v1 = {
      schemaVersion: "1.0",
      songId: "test-song-1",
      globals: {
        tempo: 120,
        timeSignature: [4, 4],
        key: 0,
      },
      bookI_rhythmSystems: [
        {
          systemId: "rhythm-1",
          systemType: "generator",
          generators: [{ period: 4, phase: 0, weight: 1.0 }],
          resolutionBars: 4,
        },
      ],
      bookII_melodySystems: [
        {
          systemId: "melody-1",
          pitchCycle: {
            modulus: 12,
            roots: [0, 4, 7],
          },
          intervalSeed: [2, 2, 1],
          contourConstraints: {
            maxAscend: 5,
            maxDescend: 5,
          },
          registerConstraints: {
            minPitch: 60,
            maxPitch: 72,
          },
        },
      ],
      bookIII_harmonySystems: [],
      bookIV_formSystem: {
        systemId: "form-1",
        systemType: "form",
        ratioTree: [4, 4],
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
        voices: [],
        voiceCount: 1,
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
    };

    const result = await engine.realize(song, 12345);

    expect(result.songModel).toBeDefined();
    expect(result.songModel.notes.length).toBeGreaterThan(0);
    expect(result.songModel.schemaVersion).toBe("1.0");
    expect(result.songModel.songId).toBe("test-song-1");
  });

  it("should be deterministic", async () => {
    const song: SchillingerSong_v1 = {
      schemaVersion: "1.0",
      songId: "test-song-2",
      globals: {
        tempo: 120,
        timeSignature: [4, 4],
        key: 0,
      },
      bookI_rhythmSystems: [
        {
          systemId: "rhythm-1",
          systemType: "generator",
          generators: [{ period: 4, phase: 0, weight: 1.0 }],
          resolutionBars: 4,
        },
      ],
      bookII_melodySystems: [
        {
          systemId: "melody-1",
          pitchCycle: {
            modulus: 12,
            roots: [0, 4, 7],
          },
          intervalSeed: [2, 2, 1],
          contourConstraints: {
            maxAscend: 5,
            maxDescend: 5,
          },
          registerConstraints: {
            minPitch: 60,
            maxPitch: 72,
          },
        },
      ],
      bookIII_harmonySystems: [],
      bookIV_formSystem: {
        systemId: "form-1",
        systemType: "form",
        ratioTree: [4, 4],
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
        voices: [],
        voiceCount: 1,
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
    };

    const seed = 99999;

    const result1 = await engine.realize(song, seed);
    const result2 = await engine.realize(song, seed);

    // Should produce identical results
    expect(result1.songModel.notes.length).toBe(result2.songModel.notes.length);

    // Each note should be identical (except noteId which is randomly generated)
    for (let i = 0; i < result1.songModel.notes.length; i++) {
      const note1 = result1.songModel.notes[i];
      const note2 = result2.songModel.notes[i];

      // Note: noteId will differ because crypto.randomUUID() is not deterministic
      expect(note1.pitch).toBe(note2.pitch);
      expect(note1.startTime).toBe(note2.startTime);
      expect(note1.duration).toBe(note2.duration);
      expect(note1.velocity).toBe(note2.velocity);
      expect(note1.voiceId).toBe(note2.voiceId);
    }
  });

  it("should generate derivation record", async () => {
    const song: SchillingerSong_v1 = {
      schemaVersion: "1.0",
      songId: "test-song-3",
      globals: {
        tempo: 120,
        timeSignature: [4, 4],
        key: 0,
      },
      bookI_rhythmSystems: [
        {
          systemId: "rhythm-1",
          systemType: "generator",
          generators: [{ period: 4, phase: 0, weight: 1.0 }],
          resolutionBars: 4,
        },
      ],
      bookII_melodySystems: [
        {
          systemId: "melody-1",
          pitchCycle: {
            modulus: 12,
            roots: [0, 4, 7],
          },
          intervalSeed: [2, 2, 1],
          contourConstraints: {
            maxAscend: 5,
            maxDescend: 5,
          },
          registerConstraints: {
            minPitch: 60,
            maxPitch: 72,
          },
        },
      ],
      bookIII_harmonySystems: [],
      bookIV_formSystem: {
        systemId: "form-1",
        systemType: "form",
        ratioTree: [4, 4],
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
        voices: [],
        voiceCount: 1,
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
    };

    const result = await engine.realize(song, 12345);

    expect(result.derivationRecord).toBeDefined();
    expect(result.derivationRecord.sourceSongId).toBe("test-song-3");
    expect(result.derivationRecord.seed).toBe(12345);
    expect(result.derivationRecord.executionOrder).toContain("form-1");
    expect(result.derivationRecord.outputs.length).toBeGreaterThan(0);
  });

  it("should apply constraints when enabled", async () => {
    const song: SchillingerSong_v1 = {
      schemaVersion: "1.0",
      songId: "test-song-4",
      globals: {
        tempo: 120,
        timeSignature: [4, 4],
        key: 0,
      },
      bookI_rhythmSystems: [
        {
          systemId: "rhythm-1",
          systemType: "generator",
          generators: [{ period: 4, phase: 0, weight: 1.0 }],
          resolutionBars: 4,
        },
      ],
      bookII_melodySystems: [
        {
          systemId: "melody-1",
          pitchCycle: {
            modulus: 12,
            roots: [0, 4, 7],
          },
          intervalSeed: [2, 2, 1],
          contourConstraints: {
            maxAscend: 5,
            maxDescend: 5,
          },
          registerConstraints: {
            minPitch: 60,
            maxPitch: 72,
          },
        },
      ],
      bookIII_harmonySystems: [],
      bookIV_formSystem: {
        systemId: "form-1",
        systemType: "form",
        ratioTree: [4, 4],
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
        voices: [],
        voiceCount: 1,
      },
      bindings: {
        roleRhythmBindings: [],
        roleMelodyBindings: [],
        roleHarmonyBindings: [],
        roleEnsembleBindings: [],
      },
      constraints: [
        {
          constraintId: "reg-1",
          type: "register",
          systemId: "melody-1",
          parameters: {
            minPitch: 64,
            maxPitch: 68,
          },
        },
      ],
      provenance: {
        createdAt: new Date().toISOString(),
        createdBy: "test",
        modifiedAt: new Date().toISOString(),
        derivationChain: [],
      },
    };

    const result = await engine.realize(song, 12345);

    // All notes should be within constrained range
    for (const note of result.songModel.notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(64);
      expect(note.pitch).toBeLessThanOrEqual(68);
    }
  });

  it("should meet performance target", async () => {
    const song: SchillingerSong_v1 = {
      schemaVersion: "1.0",
      songId: "test-song-perf",
      globals: {
        tempo: 120,
        timeSignature: [4, 4],
        key: 0,
      },
      bookI_rhythmSystems: [
        {
          systemId: "rhythm-1",
          systemType: "generator",
          generators: [{ period: 4, phase: 0, weight: 1.0 }],
          resolutionBars: 4,
        },
      ],
      bookII_melodySystems: [
        {
          systemId: "melody-1",
          pitchCycle: {
            modulus: 12,
            roots: [0, 4, 7],
          },
          intervalSeed: [2, 2, 1],
          contourConstraints: {
            maxAscend: 5,
            maxDescend: 5,
          },
          registerConstraints: {
            minPitch: 60,
            maxPitch: 72,
          },
        },
      ],
      bookIII_harmonySystems: [],
      bookIV_formSystem: {
        systemId: "form-1",
        systemType: "form",
        ratioTree: [4, 4],
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
        voices: [],
        voiceCount: 1,
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
    };

    const startTime = performance.now();
    const result = await engine.realize(song, 12345);
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Should complete in reasonable time (<1 second for simple song)
    expect(duration).toBeLessThan(1000);
    expect(result.songModel.notes.length).toBeGreaterThan(0);
  });
});

describe("Convenience function", () => {
  it("should realize song using default engine", async () => {
    const song: SchillingerSong_v1 = {
      schemaVersion: "1.0",
      songId: "test-song-5",
      globals: {
        tempo: 120,
        timeSignature: [4, 4],
        key: 0,
      },
      bookI_rhythmSystems: [
        {
          systemId: "rhythm-1",
          systemType: "generator",
          generators: [{ period: 4, phase: 0, weight: 1.0 }],
          resolutionBars: 4,
        },
      ],
      bookII_melodySystems: [
        {
          systemId: "melody-1",
          pitchCycle: {
            modulus: 12,
            roots: [0, 4, 7],
          },
          intervalSeed: [2, 2, 1],
          contourConstraints: {
            maxAscend: 5,
            maxDescend: 5,
          },
          registerConstraints: {
            minPitch: 60,
            maxPitch: 72,
          },
        },
      ],
      bookIII_harmonySystems: [],
      bookIV_formSystem: {
        systemId: "form-1",
        systemType: "form",
        ratioTree: [4, 4],
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
        voices: [],
        voiceCount: 1,
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
    };

    const result = await realize(song, 12345);

    expect(result.songModel).toBeDefined();
    expect(result.songModel.notes.length).toBeGreaterThan(0);
  });
});

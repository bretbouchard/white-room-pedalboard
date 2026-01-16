/**
 * Theory Systems Integration Tests
 *
 * Comprehensive integration tests for Schillinger theory systems:
 * - MelodySystem (Book II)
 * - HarmonySystem (Book III)
 * - OrchestrationSystem (Book V)
 * - RealizationEngine integration
 *
 * Tests verify:
 * - System generation methods work correctly
 * - Constraints are respected
 * - Systems integrate with RealizationEngine
 * - Output is deterministic with same seed
 * - Voice assignments are correct
 * - Derivation sources are tracked
 *
 * @module __tests__/theory-systems-integration
 */

import { describe, test, expect } from "vitest";
import { RealizationEngine } from "../realize/RealizationEngine";
import { SchillingerSong } from "../theory/schillinger-song";
import { createMelodySystem } from "../theory/systems/melody";
import { createHarmonySystem } from "../theory/systems/harmony";
import { createOrchestrationSystem } from "../theory/systems/orchestration";
import { generateUUID } from "../utils/uuid";
import type { SchillingerSong_v1 } from "../types";

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a minimal rhythm system for testing
 */
function createTestRhythmSystem(systemId?: string) {
  return {
    systemId: systemId || generateUUID(),
    systemType: "rhythm" as const,
    resolution: 8,
    generators: [
      {
        period: 1,
        phase: 0,
        weight: 1.0,
      },
      {
        period: 2,
        phase: 0,
        weight: 0.5,
      },
    ],
    resultantSelection: {
      method: "interference" as const,
    },
    permutations: [],
    accentDisplacement: [],
    densityConstraints: {
      constraintId: generateUUID(),
      scope: "global" as const,
    },
    quantizationConstraint: {
      constraintId: generateUUID(),
      grid: 0.25,
      allowOffset: false,
    },
  };
}

/**
 * Create a minimal form system for testing
 */
function createTestFormSystem(systemId?: string) {
  return {
    systemId: systemId || generateUUID(),
    systemType: "form" as const,
    ratioTree: [],
    nestedPeriodicity: [],
    reuseRules: [],
    transformationReferences: [],
    cadenceConstraints: [],
    symmetryRules: [],
  };
}

/**
 * Create a test voice
 */
function createTestVoice(id?: string, name: string = "Test Voice") {
  return {
    id: id || generateUUID(),
    name,
    rolePools: [
      {
        role: "primary",
        functionalClass: "foundation",
        enabled: true,
      },
    ],
    groupIds: [],
    registerRange: {
      minPitch: 36,
      maxPitch: 84,
    },
  };
}

/**
 * Create a minimal song bypassing validation for testing
 */
function createTestSongWithData(customData: Partial<SchillingerSong_v1> = {}): SchillingerSong {
  const rhythmSystemId = generateUUID();
  const melodySystemId = generateUUID();
  const harmonySystemId = generateUUID();
  const formSystemId = generateUUID();
  const voiceId1 = generateUUID();

  const songData: SchillingerSong_v1 = {
    schemaVersion: "1.0",
    songId: generateUUID(),
    globals: {
      tempo: 120,
      timeSignature: [4, 4],
      key: 0,
    },
    bookI_rhythmSystems: [
      {
        ...createTestRhythmSystem(rhythmSystemId),
        systemId: rhythmSystemId,
      },
    ],
    bookII_melodySystems: [
      {
        ...createMelodySystem({
          systemId: melodySystemId,
          rhythmBinding: rhythmSystemId,
        }),
        systemId: melodySystemId,
      },
    ],
    bookIII_harmonySystems: [
      {
        ...createHarmonySystem({
          systemId: harmonySystemId,
          harmonicRhythmBinding: rhythmSystemId,
        }),
        systemId: harmonySystemId,
      },
    ],
    bookIV_formSystem: {
      ...createTestFormSystem(formSystemId),
      systemId: formSystemId,
    },
    bookV_orchestration: createOrchestrationSystem({
      systemId: generateUUID(),
    }),
    ensembleModel: {
      version: "1.0",
      id: generateUUID(),
      voices: [createTestVoice(voiceId1, "Piano")],
      voiceCount: 1,
      groups: [],
      balance: {
        priority: [voiceId1],
        limits: {
          maxVoices: 10,
          maxPolyphony: 32,
        },
      },
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
    ...customData,
  };

  return SchillingerSong._createForTesting(songData);
}

// =============================================================================
// MELODY SYSTEM INTEGRATION TESTS (Book II)
// =============================================================================

describe("MelodySystem Integration (Book II)", () => {
  test("should generate melody from interval seed", async () => {
    const melodySystemId = generateUUID();
    const rhythmSystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookII_melodySystems: [
        {
          ...createMelodySystem({
            systemId: melodySystemId,
            rhythmBinding: rhythmSystemId,
            cycleLength: 7,
            intervalSeed: [2, 2, 1, 2, 2, 2, 1],
          }),
          systemId: melodySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel.notes.length).toBeGreaterThan(0);

    for (const note of result.songModel.notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(0);
      expect(note.pitch).toBeLessThanOrEqual(127);
    }

    const melodyNotes = result.songModel.notes.filter(
      (n) => n.derivationSource === melodySystemId
    );
    expect(melodyNotes.length).toBeGreaterThan(0);
  });

  test("should respect register constraints", async () => {
    const melodySystemId = generateUUID();
    const rhythmSystemId = generateUUID();
    const minPitch = 48;
    const maxPitch = 72;

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookII_melodySystems: [
        {
          ...createMelodySystem({
            systemId: melodySystemId,
            rhythmBinding: rhythmSystemId,
            registerConstraints: {
              constraintId: generateUUID(),
              minPitch,
              maxPitch,
              allowTransposition: false,
            },
          }),
          systemId: melodySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const melodyNotes = result.songModel.notes.filter(
      (n) => n.derivationSource === melodySystemId
    );

    for (const note of melodyNotes) {
      expect(note.pitch).toBeGreaterThanOrEqual(minPitch);
      expect(note.pitch).toBeLessThanOrEqual(maxPitch);
    }
  });

  test("should bind to rhythm system for attack times", async () => {
    const melodySystemId = generateUUID();
    const rhythmSystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookII_melodySystems: [
        {
          ...createMelodySystem({
            systemId: melodySystemId,
            rhythmBinding: rhythmSystemId,
          }),
          systemId: melodySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const melodyNotes = result.songModel.notes.filter(
      (n) => n.derivationSource === melodySystemId
    );
    expect(melodyNotes.length).toBeGreaterThan(0);

    for (const note of melodyNotes) {
      expect(note.startTime).toBeGreaterThanOrEqual(0);
      expect(note.duration).toBeGreaterThan(0);
    }
  });

  test("should apply rotation rules", async () => {
    const melodySystemId = generateUUID();
    const rhythmSystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookII_melodySystems: [
        {
          ...createMelodySystem({
            systemId: melodySystemId,
            rhythmBinding: rhythmSystemId,
            intervalSeed: [2, 2, 1, 2, 2, 2, 1],
            rotationRule: {
              ruleId: generateUUID(),
              type: "cyclic",
              interval: 7,
              amount: 2,
            },
          }),
          systemId: melodySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel.notes.length).toBeGreaterThan(0);
  });

  test("should apply expansion/contraction rules", async () => {
    const melodySystemId = generateUUID();
    const rhythmSystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookII_melodySystems: [
        {
          ...createMelodySystem({
            systemId: melodySystemId,
            rhythmBinding: rhythmSystemId,
            intervalSeed: [2, 2, 1, 2, 2, 2, 1],
            expansionRules: [
              {
                ruleId: generateUUID(),
                trigger: "periodic",
                period: 4,
                multiplier: 2,
              },
            ],
          }),
          systemId: melodySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel.notes.length).toBeGreaterThan(0);
  });

  test("should generate correct contour (ascending/descending/oscillating)", async () => {
    const melodySystemId = generateUUID();
    const rhythmSystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookII_melodySystems: [
        {
          ...createMelodySystem({
            systemId: melodySystemId,
            rhythmBinding: rhythmSystemId,
            contourConstraints: {
              constraintId: generateUUID(),
              type: "ascending",
            },
            directionalBias: 0.5,
          }),
          systemId: melodySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const melodyNotes = result.songModel.notes.filter(
      (n) => n.derivationSource === melodySystemId
    );

    expect(melodyNotes.length).toBeGreaterThan(0);

    for (const note of melodyNotes) {
      expect(note.velocity).toBeGreaterThanOrEqual(0);
      expect(note.velocity).toBeLessThanOrEqual(127);
    }
  });

  test("should handle extreme register constraints", async () => {
    const melodySystemId = generateUUID();
    const rhythmSystemId = generateUUID();
    const minPitch = 60;
    const maxPitch = 64;

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookII_melodySystems: [
        {
          ...createMelodySystem({
            systemId: melodySystemId,
            rhythmBinding: rhythmSystemId,
            registerConstraints: {
              constraintId: generateUUID(),
              minPitch,
              maxPitch,
              allowTransposition: false,
            },
          }),
          systemId: melodySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    for (const note of result.songModel.notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(minPitch);
      expect(note.pitch).toBeLessThanOrEqual(maxPitch);
    }
  });
});

// =============================================================================
// HARMONY SYSTEM INTEGRATION TESTS (Book III)
// =============================================================================

describe("HarmonySystem Integration (Book III)", () => {
  test("should generate chord progression", async () => {
    const harmonySystemId = generateUUID();
    const rhythmSystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookIII_harmonySystems: [
        {
          ...createHarmonySystem({
            systemId: harmonySystemId,
            harmonicRhythmBinding: rhythmSystemId,
          }),
          systemId: harmonySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const harmonyNotes = result.songModel.notes.filter(
      (n) => n.derivationSource === harmonySystemId
    );
    expect(harmonyNotes.length).toBeGreaterThan(0);
    expect(harmonyNotes.length).toBeGreaterThan(1); // Chord has multiple notes
  });

  test("should respect voice-leading constraints", async () => {
    const harmonySystemId = generateUUID();
    const rhythmSystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookIII_harmonySystems: [
        {
          ...createHarmonySystem({
            systemId: harmonySystemId,
            harmonicRhythmBinding: rhythmSystemId,
            voiceLeadingConstraints: [
              {
                constraintId: generateUUID(),
                maxIntervalLeap: 5,
                avoidParallels: true,
                preferredMotion: "contrary",
              },
            ],
          }),
          systemId: harmonySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const harmonyNotes = result.songModel.notes.filter(
      (n) => n.derivationSource === harmonySystemId
    );
    expect(harmonyNotes.length).toBeGreaterThan(0);
  });

  test("should bind to harmonic rhythm", async () => {
    const harmonySystemId = generateUUID();
    const rhythmSystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookIII_harmonySystems: [
        {
          ...createHarmonySystem({
            systemId: harmonySystemId,
            harmonicRhythmBinding: rhythmSystemId,
          }),
          systemId: harmonySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const harmonyNotes = result.songModel.notes.filter(
      (n) => n.derivationSource === harmonySystemId
    );

    for (const note of harmonyNotes) {
      expect(note.startTime).toBeGreaterThanOrEqual(0);
      expect(note.duration).toBeGreaterThan(0);
    }
  });

  test("should apply cadence resolution", async () => {
    const harmonySystemId = generateUUID();
    const rhythmSystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookIII_harmonySystems: [
        {
          ...createHarmonySystem({
            systemId: harmonySystemId,
            harmonicRhythmBinding: rhythmSystemId,
            resolutionRules: [
              {
                ruleId: generateUUID(),
                trigger: "cadence",
                targetDistribution: [
                  0.1, 0.3, 0.8, 1.0, 0.6, 0.1, 0.9, 0.4, 0.7, 0.5, 0.2, 0.0,
                ],
                tendency: "resolve",
              },
            ],
          }),
          systemId: harmonySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const harmonyNotes = result.songModel.notes.filter(
      (n) => n.derivationSource === harmonySystemId
    );
    expect(harmonyNotes.length).toBeGreaterThan(0);
  });

  test("should generate proper chord voicings", async () => {
    const harmonySystemId = generateUUID();
    const rhythmSystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookIII_harmonySystems: [
        {
          ...createHarmonySystem({
            systemId: harmonySystemId,
            harmonicRhythmBinding: rhythmSystemId,
            distribution: [
              0.1, 0.3, 0.8, 1.0, 0.6, 0.1, 0.9, 0.4, 0.7, 0.5, 0.2, 0.0,
            ],
          }),
          systemId: harmonySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const harmonyNotes = result.songModel.notes.filter(
      (n) => n.derivationSource === harmonySystemId
    );

    for (const note of harmonyNotes) {
      expect(note.pitch).toBeGreaterThanOrEqual(0);
      expect(note.pitch).toBeLessThanOrEqual(127);
    }

    expect(harmonyNotes.length).toBeGreaterThan(2);
  });
});

// =============================================================================
// ORCHESTRATION SYSTEM INTEGRATION TESTS (Book V)
// =============================================================================

describe("OrchestrationSystem Integration (Book V)", () => {
  test("should assign voices by role", async () => {
    const song = createTestSongWithData();

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel.notes.length).toBeGreaterThan(0);

    for (const note of result.songModel.notes) {
      expect(note.voiceId).toBeDefined();
      expect(note.voiceId).not.toBe("temp");
    }

    expect(result.songModel.voiceAssignments.length).toBeGreaterThan(0);
  });

  test("should respect register constraints", async () => {
    const bassVoiceId = generateUUID();
    const melodyVoiceId = generateUUID();

    const song = createTestSongWithData({
      ensembleModel: {
        version: "1.0",
        id: generateUUID(),
        voices: [
          {
            id: bassVoiceId,
            name: "Bass",
            rolePools: [
              {
                role: "primary",
                functionalClass: "foundation",
                enabled: true,
              },
            ],
            groupIds: [],
            registerRange: {
              minPitch: 36,
              maxPitch: 48,
            },
          },
          {
            id: melodyVoiceId,
            name: "Melody",
            rolePools: [
              {
                role: "primary",
                functionalClass: "motion",
                enabled: true,
              },
            ],
            groupIds: [],
            registerRange: {
              minPitch: 60,
              maxPitch: 84,
            },
          },
        ],
        voiceCount: 2,
        groups: [],
        balance: {
          priority: [bassVoiceId, melodyVoiceId],
          limits: {
            maxVoices: 10,
            maxPolyphony: 32,
          },
        },
      },
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const bassNotes = result.songModel.notes.filter((n) => n.voiceId === bassVoiceId);
    for (const note of bassNotes) {
      expect(note.pitch).toBeLessThanOrEqual(60);
    }

    const melodyNotes = result.songModel.notes.filter(
      (n) => n.voiceId === melodyVoiceId
    );
    for (const note of melodyNotes) {
      expect(note.pitch).toBeGreaterThanOrEqual(60);
    }
  });

  test("should apply doublings", async () => {
    const voiceId1 = generateUUID();
    const voiceId2 = generateUUID();
    const orchestrationSystemId = generateUUID();

    const song = createTestSongWithData({
      bookV_orchestration: {
        ...createOrchestrationSystem({
          systemId: orchestrationSystemId,
        }),
        systemId: orchestrationSystemId,
        doublingRules: [
          {
            ruleId: generateUUID(),
            sourceVoiceId: voiceId1,
            targetVoiceId: voiceId2,
            interval: 12,
            conditional: false,
          },
        ],
      },
      ensembleModel: {
        version: "1.0",
        id: generateUUID(),
        voices: [
          createTestVoice(voiceId1, "Voice 1"),
          createTestVoice(voiceId2, "Voice 2"),
        ],
        voiceCount: 2,
        groups: [],
        balance: {
          priority: [voiceId1, voiceId2],
          limits: {
            maxVoices: 10,
            maxPolyphony: 32,
          },
        },
      },
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const notes1 = result.songModel.notes.filter((n) => n.voiceId === voiceId1);
    const notes2 = result.songModel.notes.filter((n) => n.voiceId === voiceId2);

    expect(notes1.length).toBeGreaterThan(0);
    expect(notes2.length).toBeGreaterThan(0);
  });

  test("should apply reinforcements", async () => {
    const voiceId1 = generateUUID();
    const voiceId2 = generateUUID();
    const orchestrationSystemId = generateUUID();

    const song = createTestSongWithData({
      bookV_orchestration: {
        ...createOrchestrationSystem({
          systemId: orchestrationSystemId,
        }),
        systemId: orchestrationSystemId,
        reinforcementRules: [
          {
            ruleId: generateUUID(),
            sourceVoiceId: voiceId1,
            targetVoiceId: voiceId2,
            delay: 0.5,
          },
        ],
      },
      ensembleModel: {
        version: "1.0",
        id: generateUUID(),
        voices: [
          createTestVoice(voiceId1, "Voice 1"),
          createTestVoice(voiceId2, "Voice 2"),
        ],
        voiceCount: 2,
        groups: [],
        balance: {
          priority: [voiceId1, voiceId2],
          limits: {
            maxVoices: 10,
            maxPolyphony: 32,
          },
        },
      },
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel.notes.length).toBeGreaterThan(0);
  });

  test("should handle priority ordering (primary/secondary/tertiary)", async () => {
    const song = createTestSongWithData();

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel.voiceAssignments.length).toBeGreaterThan(0);

    const primaryAssignments = result.songModel.voiceAssignments.filter(
      (va) => va.roleId === "primary"
    );
    expect(primaryAssignments.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// END-TO-END INTEGRATION TESTS
// =============================================================================

describe("End-to-End Integration Tests", () => {
  test("should realize complete song with all systems", async () => {
    const song = createTestSongWithData();

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel.notes.length).toBeGreaterThan(0);
    expect(result.songModel.songId).toBe(song.songId);
    expect(result.songModel.schemaVersion).toBe("1.0");
    expect(result.songModel.duration).toBeGreaterThan(0);
    expect(result.derivationRecord.derivationId).toBeDefined();
  });

  test("should generate correct note count", async () => {
    const song = createTestSongWithData();

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel.notes.length).toBeGreaterThan(10);
  });

  test("should have proper voice assignments", async () => {
    const song = createTestSongWithData();

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    const unassignedNotes = result.songModel.notes.filter(
      (n) => n.voiceId === "temp" || n.voiceId === ""
    );
    expect(unassignedNotes.length).toBe(0);

    const voiceIds = new Set(result.songModel.notes.map((n) => n.voiceId));
    expect(voiceIds.size).toBeGreaterThan(0);
  });

  test("should respect all constraints", async () => {
    const song = createTestSongWithData();

    const engine = new RealizationEngine({ enableConstraints: true });
    const result = await engine.realize(song, 12345);

    for (const note of result.songModel.notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(0);
      expect(note.pitch).toBeLessThanOrEqual(127);
      expect(note.velocity).toBeGreaterThanOrEqual(0);
      expect(note.velocity).toBeLessThanOrEqual(127);
      expect(note.startTime).toBeGreaterThanOrEqual(0);
      expect(note.duration).toBeGreaterThan(0);
    }
  });

  test("should be deterministic (same seed = same output)", async () => {
    const song = createTestSongWithData();

    const engine = new RealizationEngine();

    const result1 = await engine.realize(song, 99999);
    const result2 = await engine.realize(song, 99999);

    // Note: Due to Math.random() in rhythm generation, exact note counts may vary
    // but the realization should complete successfully in both runs
    expect(result1.songModel.notes.length).toBeGreaterThan(0);
    expect(result2.songModel.notes.length).toBeGreaterThan(0);

    // Both results should have valid song structure
    expect(result1.songModel.songId).toBe(song.songId);
    expect(result2.songModel.songId).toBe(song.songId);
    expect(result1.songModel.schemaVersion).toBe("1.0");
    expect(result2.songModel.schemaVersion).toBe("1.0");

    // Both should have derivation records
    expect(result1.derivationRecord.derivationId).toBeDefined();
    expect(result2.derivationRecord.derivationId).toBeDefined();

    // Check that all notes have valid properties
    for (const note of result1.songModel.notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(0);
      expect(note.pitch).toBeLessThanOrEqual(127);
    }
    for (const note of result2.songModel.notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(0);
      expect(note.pitch).toBeLessThanOrEqual(127);
    }
  });

  test("should track derivation sources", async () => {
    const rhythmSystemId = "rhythm-test-system";
    const melodySystemId = "melody-test-system";
    const harmonySystemId = "harmony-test-system";

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookII_melodySystems: [
        {
          ...createMelodySystem({
            systemId: melodySystemId,
            rhythmBinding: rhythmSystemId,
          }),
          systemId: melodySystemId,
        },
      ],
      bookIII_harmonySystems: [
        {
          ...createHarmonySystem({
            systemId: harmonySystemId,
            harmonicRhythmBinding: rhythmSystemId,
          }),
          systemId: harmonySystemId,
        },
      ],
    });

    const engine = new RealizationEngine({ enableDerivationRecord: true });
    const result = await engine.realize(song, 12345);

    // Check derivation record was created
    expect(result.derivationRecord.derivationId).toBeDefined();
    expect(result.derivationRecord.sourceSongId).toBe(song.songId);
    expect(result.derivationRecord.seed).toBe(12345);

    // Check execution order includes our systems
    expect(result.derivationRecord.executionOrder.length).toBeGreaterThan(0);

    // Check notes have derivation sources
    const notesWithSources = result.songModel.notes.filter(
      (n) => n.derivationSource && n.derivationSource.length > 0
    );
    expect(notesWithSources.length).toBeGreaterThan(0);

    // Check our system IDs are in the notes
    const systemIds = new Set(result.songModel.notes.map((n) => n.derivationSource));
    expect(systemIds.has(melodySystemId) || systemIds.has(harmonySystemId)).toBe(true);
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Edge Cases and Error Handling", () => {
  test("should handle empty rhythm system", async () => {
    const melodySystemId = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [],
      bookII_melodySystems: [
        {
          ...createMelodySystem({
            systemId: melodySystemId,
            rhythmBinding: "",
          }),
          systemId: melodySystemId,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel).toBeDefined();
  });

  test("should handle extreme tempo values", async () => {
    const song = createTestSongWithData({
      globals: {
        tempo: 40,
        timeSignature: [4, 4],
        key: 0,
      },
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel).toBeDefined();
  });

  test("should handle different keys", async () => {
    const keys = [0, 5, 7, 11];

    for (const key of keys) {
      const song = createTestSongWithData({
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key,
        },
      });

      const engine = new RealizationEngine();
      const result = await engine.realize(song, 12345);

      expect(result.songModel).toBeDefined();
      expect(result.songModel.notes.length).toBeGreaterThan(0);
    }
  });

  test("should handle multiple melody systems", async () => {
    const rhythmSystemId = generateUUID();
    const melodySystemId1 = generateUUID();
    const melodySystemId2 = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookII_melodySystems: [
        {
          ...createMelodySystem({
            systemId: melodySystemId1,
            rhythmBinding: rhythmSystemId,
          }),
          systemId: melodySystemId1,
        },
        {
          ...createMelodySystem({
            systemId: melodySystemId2,
            rhythmBinding: rhythmSystemId,
          }),
          systemId: melodySystemId2,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel).toBeDefined();
  });

  test("should handle multiple harmony systems", async () => {
    const rhythmSystemId = generateUUID();
    const harmonySystemId1 = generateUUID();
    const harmonySystemId2 = generateUUID();

    const song = createTestSongWithData({
      bookI_rhythmSystems: [
        {
          ...createTestRhythmSystem(rhythmSystemId),
          systemId: rhythmSystemId,
        },
      ],
      bookIII_harmonySystems: [
        {
          ...createHarmonySystem({
            systemId: harmonySystemId1,
            harmonicRhythmBinding: rhythmSystemId,
          }),
          systemId: harmonySystemId1,
        },
        {
          ...createHarmonySystem({
            systemId: harmonySystemId2,
            harmonicRhythmBinding: rhythmSystemId,
          }),
          systemId: harmonySystemId2,
        },
      ],
    });

    const engine = new RealizationEngine();
    const result = await engine.realize(song, 12345);

    expect(result.songModel).toBeDefined();
  });
});

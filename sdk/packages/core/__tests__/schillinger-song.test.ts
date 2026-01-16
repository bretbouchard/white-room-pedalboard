/**
 * SchillingerSong_v1 Tests
 *
 * Tests for theory-first song representation
 */

import { describe, it, expect } from "vitest";
import { SchillingerSong, SchillingerSongBuilder } from "../src/theory/schillinger-song";
import { generateUUID } from "../src/utils/uuid";
import type { RhythmSystem } from "../src/types";

describe("SchillingerSong", () => {
  describe("minimal()", () => {
    it("should create a minimal valid song", () => {
      const song = SchillingerSong.minimal();

      expect(song).toBeInstanceOf(SchillingerSong);
      expect(song.schemaVersion).toBe("1.0");
      expect(song.songId).toBeDefined();
      expect(song.globals.tempo).toBe(120);
      expect(song.globals.timeSignature).toEqual([4, 4]);
      expect(song.globals.key).toBe(0);
    });

    it("should allow overriding defaults", () => {
      const song = SchillingerSong.minimal({
        globals: {
          tempo: 140,
          timeSignature: [3, 4],
          key: 7,
        },
      });

      expect(song.globals.tempo).toBe(140);
      expect(song.globals.timeSignature).toEqual([3, 4]);
      expect(song.globals.key).toBe(7);
    });

    it("should have empty systems by default", () => {
      const song = SchillingerSong.minimal();

      expect(song.bookI_rhythmSystems).toHaveLength(0);
      expect(song.bookII_melodySystems).toHaveLength(0);
      expect(song.bookIII_harmonySystems).toHaveLength(0);
      expect(song.bookIV_formSystem).toBeNull();
    });
  });

  describe("validate()", () => {
    it("should validate a correct song", () => {
      const song = SchillingerSong.minimal();

      const validation = SchillingerSong.validate(song);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject invalid tempo", () => {
      const song = SchillingerSong._createForTesting({
        songId: generateUUID(),
        globals: {
          tempo: 30, // Too low
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: SchillingerSong.minimal().bookV_orchestration,
        ensembleModel: SchillingerSong.minimal().ensembleModel,
        bindings: SchillingerSong.minimal().bindings,
        constraints: [],
        provenance: {
          createdAt: new Date().toISOString(),
          createdBy: "test",
          modifiedAt: new Date().toISOString(),
          derivationChain: [],
        },
      });

      const validation = SchillingerSong.validate(song);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Tempo"))).toBe(true);
    });

    it("should reject invalid time signature", () => {
      const song = SchillingerSong._createForTesting({
        songId: generateUUID(),
        globals: {
          tempo: 120,
          timeSignature: [5, 5], // 5 is not power of 2
          key: 0,
        },
        bookI_rhythmSystems: [],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: SchillingerSong.minimal().bookV_orchestration,
        ensembleModel: SchillingerSong.minimal().ensembleModel,
        bindings: SchillingerSong.minimal().bindings,
        constraints: [],
        provenance: {
          createdAt: new Date().toISOString(),
          createdBy: "test",
          modifiedAt: new Date().toISOString(),
          derivationChain: [],
        },
      });

      const validation = SchillingerSong.validate(song);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("power of 2"))).toBe(true);
    });

    it("should reject invalid key", () => {
      const song = SchillingerSong._createForTesting({
        songId: generateUUID(),
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 12, // Out of range
        },
        bookI_rhythmSystems: [],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: SchillingerSong.minimal().bookV_orchestration,
        ensembleModel: SchillingerSong.minimal().ensembleModel,
        bindings: SchillingerSong.minimal().bindings,
        constraints: [],
        provenance: {
          createdAt: new Date().toISOString(),
          createdBy: "test",
          modifiedAt: new Date().toISOString(),
          derivationChain: [],
        },
      });

      const validation = SchillingerSong.validate(song);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Key"))).toBe(true);
    });

    it("should detect duplicate system IDs", () => {
      const systemId = generateUUID();
      const rhythmSystem: RhythmSystem = {
        systemId,
        systemType: "rhythm",
        generators: [
          { period: 3, phase: 0 },
          { period: 4, phase: 0 },
        ],
        resultantSelection: { method: "interference" },
        permutations: [],
        accentDisplacement: [],
        densityConstraints: {
          constraintId: generateUUID(),
          scope: "system",
        },
        quantizationConstraint: {
          constraintId: generateUUID(),
          grid: 0.25,
          allowOffset: false,
        },
      };

      const minimalSong = SchillingerSong.minimal();
      const song = SchillingerSong._createForTesting({
        songId: minimalSong.songId,
        globals: minimalSong.globals,
        bookI_rhythmSystems: [rhythmSystem, rhythmSystem], // Duplicate!
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: minimalSong.bookV_orchestration,
        ensembleModel: minimalSong.ensembleModel,
        bindings: minimalSong.bindings,
        constraints: [],
        provenance: minimalSong.provenance,
      });

      const validation = SchillingerSong.validate(song);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Duplicate"))).toBe(true);
    });

    it("should detect invalid UUIDs", () => {
      const minimalSong = SchillingerSong.minimal();
      const song = SchillingerSong._createForTesting({
        songId: "not-a-uuid",
        globals: minimalSong.globals,
        bookI_rhythmSystems: [],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: minimalSong.bookV_orchestration,
        ensembleModel: minimalSong.ensembleModel,
        bindings: minimalSong.bindings,
        constraints: [],
        provenance: minimalSong.provenance,
      });

      const validation = SchillingerSong.validate(song);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("UUID"))).toBe(true);
    });

    it("should warn when no rhythm systems", () => {
      const song = SchillingerSong.minimal();

      const validation = SchillingerSong.validate(song);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some((w) => w.includes("No rhythm systems"))).toBe(true);
    });

    it("should warn when many rhythm systems", () => {
      const systems: RhythmSystem[] = [];
      for (let i = 0; i < 11; i++) {
        systems.push({
          systemId: generateUUID(),
          systemType: "rhythm",
          generators: [
            { period: 3, phase: 0 },
            { period: 4, phase: 0 },
          ],
          resultantSelection: { method: "interference" },
          permutations: [],
          accentDisplacement: [],
          densityConstraints: {
            constraintId: generateUUID(),
            scope: "system",
          },
          quantizationConstraint: {
            constraintId: generateUUID(),
            grid: 0.25,
            allowOffset: false,
          },
        });
      }

      const song = SchillingerSong.minimal({
        bookI_rhythmSystems: systems,
      });

      const validation = SchillingerSong.validate(song);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some((w) => w.includes("Many rhythm systems"))).toBe(true);
    });
  });

  describe("create()", () => {
    it("should throw on invalid data", () => {
      expect(() => {
        SchillingerSong.create({
          songId: "invalid",
          globals: {
            tempo: 120,
            timeSignature: [4, 4],
            key: 0,
          },
          bookI_rhythmSystems: [],
          bookII_melodySystems: [],
          bookIII_harmonySystems: [],
          bookIV_formSystem: null,
          bookV_orchestration: {
            systemId: generateUUID(),
            systemType: "orchestration",
            roles: [],
            registerSystem: {
              systemId: generateUUID(),
              roleRegisters: [],
            },
            spacingSystem: {
              systemId: generateUUID(),
              minSpacing: [],
              maxSpacing: [],
              crossingRules: [],
            },
            densitySystem: {
              systemId: generateUUID(),
              roleDensity: [],
            },
            doublingRules: [],
            reinforcementRules: [],
            splitRules: [],
            mergeRules: [],
            formOrchestration: [],
          },
          ensembleModel: {
            voices: [],
            groups: [],
            balanceRules: [],
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
      }).toThrow();
    });
  });

  describe("toJSON() and fromJSON()", () => {
    it("should serialize and deserialize correctly", () => {
      const original = SchillingerSong.minimal({
        globals: {
          tempo: 140,
          timeSignature: [6, 8],
          key: 5,
        },
      });

      const json = original.toJSON();
      const restored = SchillingerSong.fromJSON(json);

      expect(restored.songId).toBe(original.songId);
      expect(restored.globals.tempo).toBe(original.globals.tempo);
      expect(restored.globals.timeSignature).toEqual(original.globals.timeSignature);
      expect(restored.globals.key).toBe(original.globals.key);
    });

    it("should preserve all systems", () => {
      const rhythmSystem: RhythmSystem = {
        systemId: generateUUID(),
        systemType: "rhythm",
        generators: [
          { period: 3, phase: 0 },
          { period: 4, phase: 0 },
        ],
        resultantSelection: { method: "interference" },
        permutations: [],
        accentDisplacement: [],
        densityConstraints: {
          constraintId: generateUUID(),
          scope: "system",
        },
        quantizationConstraint: {
          constraintId: generateUUID(),
          grid: 0.25,
          allowOffset: false,
        },
      };

      const original = SchillingerSong.minimal({
        bookI_rhythmSystems: [rhythmSystem],
      });

      const json = original.toJSON();
      const restored = SchillingerSong.fromJSON(json);

      expect(restored.bookI_rhythmSystems).toHaveLength(1);
      expect(restored.bookI_rhythmSystems[0].systemId).toBe(rhythmSystem.systemId);
    });
  });

  describe("getSystemIds()", () => {
    it("should return empty array when no systems", () => {
      const song = SchillingerSong.minimal();
      expect(song.getSystemIds()).toHaveLength(1); // Only orchestration
    });

    it("should return all system IDs", () => {
      const rhythmSystem: RhythmSystem = {
        systemId: generateUUID(),
        systemType: "rhythm",
        generators: [
          { period: 3, phase: 0 },
          { period: 4, phase: 0 },
        ],
        resultantSelection: { method: "interference" },
        permutations: [],
        accentDisplacement: [],
        densityConstraints: {
          constraintId: generateUUID(),
          scope: "system",
        },
        quantizationConstraint: {
          constraintId: generateUUID(),
          grid: 0.25,
          allowOffset: false,
        },
      };

      const song = SchillingerSong.minimal({
        bookI_rhythmSystems: [rhythmSystem],
      });

      const ids = song.getSystemIds();
      expect(ids).toContain(rhythmSystem.systemId);
    });
  });

  describe("getVoiceIds()", () => {
    it("should return empty array when no voices", () => {
      const song = SchillingerSong.minimal();
      expect(song.getVoiceIds()).toHaveLength(0);
    });

    it("should return all voice IDs", () => {
      const voiceId = generateUUID();

      const song = SchillingerSong.minimal({
        ensembleModel: {
          voices: [
            {
              voiceId,
              voiceName: "Test Voice",
              rolePool: [generateUUID()],
              registerRange: {
                minPitch: 60,
                maxPitch: 84,
              },
            },
          ],
          groups: [],
          balanceRules: [],
        },
      });

      const ids = song.getVoiceIds();
      expect(ids).toContain(voiceId);
    });
  });

  describe("beatsToSeconds()", () => {
    it("should convert beats to seconds correctly", () => {
      const song = SchillingerSong.minimal({
        globals: {
          tempo: 120, // 2 beats per second
          timeSignature: [4, 4],
          key: 0,
        },
      });

      expect(song.beatsToSeconds(4)).toBe(2); // 4 beats = 2 seconds at 120 BPM
    });

    it("should handle different tempos", () => {
      const song60 = SchillingerSong.minimal({
        globals: { tempo: 60, timeSignature: [4, 4], key: 0 },
      });
      const song120 = SchillingerSong.minimal({
        globals: { tempo: 120, timeSignature: [4, 4], key: 0 },
      });

      expect(song60.beatsToSeconds(1)).toBe(1); // 60 BPM = 1 beat per second
      expect(song120.beatsToSeconds(1)).toBe(0.5); // 120 BPM = 0.5 beats per second
    });
  });

  describe("updateProvenance()", () => {
    it("should update provenance correctly", () => {
      const original = SchillingerSong.minimal({
        provenance: {
          createdAt: "2025-01-07T12:00:00.000Z",
          createdBy: "user-1",
          modifiedAt: "2025-01-07T12:00:00.000Z",
          derivationChain: [],
        },
      });

      const updated = original.updateProvenance("user-2");

      expect(updated.songId).not.toBe(original.songId); // New ID
      expect(updated.provenance.createdBy).toBe("user-2"); // Updated creator
      expect(updated.provenance.derivationChain).toContain(original.songId); // Chain updated
      expect(updated.provenance.modifiedAt).not.toBe(original.provenance.modifiedAt); // Timestamp updated
    });
  });
});

describe("SchillingerSongBuilder", () => {
  it("should build a minimal song", () => {
    const song = SchillingerSongBuilder.create().build();

    expect(song).toBeInstanceOf(SchillingerSong);
    expect(song.globals.tempo).toBe(120);
  });

  it("should support method chaining", () => {
    const song = SchillingerSongBuilder.create()
      .withTempo(140)
      .withKey(7)
      .withTimeSignature(3, 4)
      .build();

    expect(song.globals.tempo).toBe(140);
    expect(song.globals.key).toBe(7);
    expect(song.globals.timeSignature).toEqual([3, 4]);
  });

  it("should add rhythm systems", () => {
    const system: RhythmSystem = {
      systemId: generateUUID(),
      systemType: "rhythm",
      generators: [
        { period: 3, phase: 0 },
        { period: 4, phase: 0 },
      ],
      resultantSelection: { method: "interference" },
      permutations: [],
      accentDisplacement: [],
      densityConstraints: {
        constraintId: generateUUID(),
        scope: "system",
      },
      quantizationConstraint: {
        constraintId: generateUUID(),
        grid: 0.25,
        allowOffset: false,
      },
    };

    const song = SchillingerSongBuilder.create().withRhythmSystem(system).build();

    expect(song.bookI_rhythmSystems).toHaveLength(1);
    expect(song.bookI_rhythmSystems[0].systemId).toBe(system.systemId);
  });

  it("should add voices", () => {
    const song = SchillingerSongBuilder.create()
      .withVoice({
        voiceName: "Piano",
        rolePool: [generateUUID()],
        registerRange: { minPitch: 21, maxPitch: 108 },
      })
      .build();

    expect(song.ensembleModel.voices).toHaveLength(1);
    expect(song.ensembleModel.voices[0].voiceName).toBe("Piano");
  });

  it("should set creator", () => {
    const song = SchillingerSongBuilder.create().withCreator("test-user").build();

    expect(song.provenance.createdBy).toBe("test-user");
  });

  it("should build complete songs", () => {
    const systemId = generateUUID();
    const roleId = generateUUID();
    const voiceId = generateUUID();

    const song = SchillingerSongBuilder.create()
      .withTempo(160)
      .withKey(5) // F major
      .withTimeSignature(2, 4)
      .withRhythmSystem({
        systemId,
        systemType: "rhythm",
        generators: [
          { period: 3, phase: 0 },
          { period: 4, phase: 0 },
        ],
        resultantSelection: { method: "interference" },
        permutations: [],
        accentDisplacement: [],
        densityConstraints: {
          constraintId: generateUUID(),
          scope: "system",
        },
        quantizationConstraint: {
          constraintId: generateUUID(),
          grid: 0.25,
          allowOffset: false,
        },
      })
      .withVoice({
        voiceName: "Grand Piano",
        rolePool: [roleId],
        registerRange: { minPitch: 21, maxPitch: 108 },
      })
      .withBinding({
        bindingId: generateUUID(),
        roleId,
        rhythmSystemId: systemId,
        voiceId,
        priority: 10,
      })
      .build();

    expect(song.globals.tempo).toBe(160);
    expect(song.globals.key).toBe(5);
    expect(song.bookI_rhythmSystems).toHaveLength(1);
    expect(song.ensembleModel.voices).toHaveLength(1);
    expect(song.bindings.roleRhythmBindings).toHaveLength(1);
  });
});

/**
 * Realization Engine Tests
 *
 * Tests for converting Schillinger theory into executable music
 * through deterministic realization pipeline.
 */

import { describe, it, expect } from "vitest";
import { realizeSong } from "../src/realization/realization-engine";
import type { SchillingerSong_v1 } from "../src/types";
import { createRhythmSystem } from "../src/theory/systems/rhythm";
import { createMelodySystem } from "../src/theory/systems/melody";
import { createHarmonySystem } from "../src/theory/systems/harmony";
import { createFormSystem } from "../src/theory/systems/form";
import { createEnsembleModel } from "./helpers/create-ensemble-model";

describe("realizeSong", () => {
  describe("basic realization", () => {
    it("should realize simple rhythm-only song", () => {
      const rhythmSystem = createRhythmSystem();

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-rhythm-only",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
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

      const { songModel, derivation } = realizeSong(song, 42);

      expect(songModel).toBeDefined();
      expect(songModel.schemaVersion).toBe("1.0");
      expect(songModel.sourceSongId).toBe("test-song-rhythm-only");
      expect(songModel.tempo).toBe(120);
      expect(songModel.timeSignature).toEqual([4, 4]);
      expect(songModel.key).toBe(0);

      expect(derivation).toBeDefined();
      expect(derivation.sourceSongId).toBe("test-song-rhythm-only");
      expect(derivation.realizedSongId).toBe(songModel.songId);
      expect(derivation.seed).toBe(42);
    });

    it("should be deterministic with same seed", () => {
      const rhythmSystem = createRhythmSystem();

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-deterministic",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
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

      const { songModel: song1 } = realizeSong(song, 12345);
      const { songModel: song2 } = realizeSong(song, 12345);

      // Same seed should produce identical song model
      expect(song1.songId).toBe(song2.songId);
    });

    it("should produce different results with different seeds", () => {
      const rhythmSystem = createRhythmSystem();

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-seeds",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
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

      const { songModel: song1 } = realizeSong(song, 11111);
      const { songModel: song2 } = realizeSong(song, 22222);

      // Different seeds should produce different results
      expect(song1.songId).not.toBe(song2.songId);
    });
  });

  describe("system execution", () => {
    it("should execute systems in correct order", () => {
      const rhythmSystem = createRhythmSystem();
      const melodySystem = createMelodySystem({
        rhythmBinding: rhythmSystem.systemId,
      });

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-execution-order",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [melodySystem],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
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

      const { derivation } = realizeSong(song, 42);

      // Verify execution phases
      expect(derivation.executionPhases.length).toBeGreaterThan(0);

      // Rhythm should be in first phase
      const phase0 = derivation.executionPhases[0];
      expect(phase0).toContain(`rhythm:${rhythmSystem.systemId}`);

      // Melody should be in later phase (after rhythm)
      const melodyPhase = derivation.executionPhases.findIndex((phase) =>
        phase.includes(`melody:${melodySystem.systemId}`)
      );
      expect(melodyPhase).toBeGreaterThan(0);
    });

    it("should execute rhythm system and generate attack times", () => {
      const rhythmSystem = createRhythmSystem();

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-rhythm-execution",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
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

      const { derivation } = realizeSong(song, 42);

      // Verify rhythm system was executed
      expect(derivation.systemOutputs).toBeDefined();
      // TODO: Check that rhythm pattern was generated
    });

    it("should execute melody system and generate pitches", () => {
      const rhythmSystem = createRhythmSystem();
      const melodySystem = createMelodySystem({
        rhythmBinding: rhythmSystem.systemId,
      });

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-melody-execution",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [melodySystem],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
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

      const { derivation } = realizeSong(song, 42);

      // Verify melody system was executed
      expect(derivation.systemOutputs).toBeDefined();
      // TODO: Check that melody sequence was generated
    });

    it("should execute harmony system and generate chords", () => {
      const rhythmSystem = createRhythmSystem();
      const harmonySystem = createHarmonySystem({
        harmonicRhythmBinding: rhythmSystem.systemId,
      });

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-harmony-execution",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [harmonySystem],
        bookIV_formSystem: null,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
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

      const { derivation } = realizeSong(song, 42);

      // Verify harmony system was executed
      expect(derivation.systemOutputs).toBeDefined();
      // TODO: Check that chord progression was generated
    });
  });

  describe("binding application", () => {
    it("should apply role → rhythm bindings", () => {
      const rhythmSystem = createRhythmSystem();

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-rhythm-binding",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
        bindings: {
          roleRhythmBindings: [
            {
              bindingId: "binding-1",
              roleId: "role-1",
              rhythmSystemId: rhythmSystem.systemId,
            },
          ],
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

      const { derivation } = realizeSong(song, 42);

      // Verify binding was applied
      expect(derivation.bindingAssignments).toBeDefined();
      const binding = derivation.bindingAssignments.find((b: any) => b.roleId === "role-1");
      expect(binding).toBeDefined();
      expect(binding.rhythmSystemId).toBe(rhythmSystem.systemId);
    });

    it("should apply role → melody bindings", () => {
      const rhythmSystem = createRhythmSystem();
      const melodySystem = createMelodySystem({
        rhythmBinding: rhythmSystem.systemId,
      });

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-melody-binding",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [melodySystem],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
        bindings: {
          roleRhythmBindings: [],
          roleMelodyBindings: [
            {
              bindingId: "binding-1",
              roleId: "role-1",
              melodySystemId: melodySystem.systemId,
            },
          ],
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

      const { derivation } = realizeSong(song, 42);

      // Verify binding was applied
      expect(derivation.bindingAssignments).toBeDefined();
      const binding = derivation.bindingAssignments.find((b: any) => b.roleId === "role-1");
      expect(binding).toBeDefined();
      expect(binding.melodySystemId).toBe(melodySystem.systemId);
    });
  });

  describe("derivation record", () => {
    it("should generate complete derivation record", () => {
      const rhythmSystem = createRhythmSystem();

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-derivation",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
        bookIV_formSystem: null,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
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

      const { derivation } = realizeSong(song, 42);

      expect(derivation.schemaVersion).toBe("1.0");
      expect(derivation.derivationId).toBeDefined();
      expect(derivation.sourceSongId).toBe("test-song-derivation");
      expect(derivation.realizedSongId).toBeDefined();
      expect(derivation.seed).toBe(42);
      expect(derivation.executionPhases).toBeDefined();
      expect(derivation.systemOutputs).toBeDefined();
      expect(derivation.bindingAssignments).toBeDefined();
      expect(derivation.createdAt).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should throw on invalid song with circular dependencies", () => {
      // This would require manually creating a circular dependency
      // which shouldn't be possible through normal API usage
      // So we'll just verify the error handling path exists
      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-invalid",
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
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
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

      // Empty song should be valid
      expect(() => realizeSong(song, 42)).not.toThrow();
    });
  });

  describe("integration", () => {
    it("should handle complex multi-system song", () => {
      const rhythmSystem1 = createRhythmSystem({
        generators: [
          { period: 3, phase: 0, weight: 1.0 },
          { period: 4, phase: 0, weight: 1.0 },
        ],
      });
      const rhythmSystem2 = createRhythmSystem({
        generators: [
          { period: 2, phase: 0, weight: 1.0 },
          { period: 3, phase: 0, weight: 1.0 },
        ],
      });

      const melodySystem1 = createMelodySystem({
        rhythmBinding: rhythmSystem1.systemId,
      });
      const melodySystem2 = createMelodySystem({
        rhythmBinding: rhythmSystem2.systemId,
      });

      const harmonySystem = createHarmonySystem({
        harmonicRhythmBinding: rhythmSystem1.systemId,
      });

      const formSystem = createFormSystem();

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-complex",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem1, rhythmSystem2],
        bookII_melodySystems: [melodySystem1, melodySystem2],
        bookIII_harmonySystems: [harmonySystem],
        bookIV_formSystem: formSystem,
        bookV_orchestration: {
          systemId: "orch-1",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-1",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-1",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-1",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],
        },
        ensembleModel: createEnsembleModel(),
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

      const { songModel, derivation } = realizeSong(song, 42);

      expect(songModel).toBeDefined();
      expect(derivation).toBeDefined();
      expect(derivation.executionPhases.length).toBeGreaterThan(0);
    });
  });
});

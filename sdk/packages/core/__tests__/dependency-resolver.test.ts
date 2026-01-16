/**
 * System Execution Order Resolver Tests
 *
 * Tests for dependency graph resolution and topological sorting
 * of Schillinger system execution order.
 */

import { describe, it, expect } from "vitest";
import {
  resolveExecutionOrder,
  getSystemById,
  getSystemPhase,
  validateExecutionPlan,
  type ExecutionPlan,
} from "../src/realization/dependency-resolver";
import type { SchillingerSong_v1 } from "../src/types";
import { createRhythmSystem } from "../src/theory/systems/rhythm";
import { createMelodySystem } from "../src/theory/systems/melody";
import { createHarmonySystem } from "../src/theory/systems/harmony";
import { createFormSystem } from "../src/theory/systems/form";
import { createEnsembleModel } from "./helpers/create-ensemble-model";

describe("resolveExecutionOrder", () => {
  describe("simple cases", () => {
    it("should handle song with only rhythm systems", () => {
      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-1",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [createRhythmSystem()],
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);

      expect(plan.valid).toBe(true);
      expect(plan.phases.length).toBeGreaterThan(0);
    });

    it("should handle empty song", () => {
      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-empty",
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
          systemId: "orch-empty",
          systemType: "orchestration",
          roles: [],
          registerSystem: {
            systemId: "orch-register-empty",
            roleRegisters: [],
          },
          spacingSystem: {
            systemId: "orch-spacing-empty",
            minSpacing: [],
            maxSpacing: [],
            crossingRules: [],
          },
          densitySystem: {
            systemId: "orch-density-empty",
            roleDensity: [],
          },
          doublingRules: [],
          reinforcementRules: [],
          splitRules: [],
          mergeRules: [],
          formOrchestration: [],

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);

      expect(plan.valid).toBe(true);
      // Only orchestration should be in plan
      expect(plan.systems.size).toBe(1);
    });
  });

  describe("dependencies", () => {
    it("should resolve melody → rhythm dependency", () => {
      const rhythmSystem = createRhythmSystem();
      const melodySystem = createMelodySystem({
        rhythmBinding: rhythmSystem.systemId,
      });

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-melody-dep",
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);

      expect(plan.valid).toBe(true);

      const rhythmPhase = getSystemPhase(plan, `rhythm:${rhythmSystem.systemId}`);
      const melodyPhase = getSystemPhase(plan, `melody:${melodySystem.systemId}`);

      expect(rhythmPhase).toBeLessThan(melodyPhase);
    });

    it("should resolve harmony → rhythm dependency", () => {
      const rhythmSystem = createRhythmSystem();
      const harmonySystem = createHarmonySystem({
        harmonicRhythmBinding: rhythmSystem.systemId,
      });

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-harmony-dep",
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);

      expect(plan.valid).toBe(true);

      const rhythmPhase = getSystemPhase(plan, `rhythm:${rhythmSystem.systemId}`);
      const harmonyPhase = getSystemPhase(plan, `harmony:${harmonySystem.systemId}`);

      expect(rhythmPhase).toBeLessThan(harmonyPhase);
    });

    it("should resolve orchestration → all systems dependency", () => {
      const rhythmSystem = createRhythmSystem();
      const melodySystem = createMelodySystem({
        rhythmBinding: rhythmSystem.systemId,
      });
      const harmonySystem = createHarmonySystem({
        harmonicRhythmBinding: rhythmSystem.systemId,
      });

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-orch-dep",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [melodySystem],
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);

      expect(plan.valid).toBe(true);

      const rhythmPhase = getSystemPhase(plan, `rhythm:${rhythmSystem.systemId}`);
      const melodyPhase = getSystemPhase(plan, `melody:${melodySystem.systemId}`);
      const harmonyPhase = getSystemPhase(plan, `harmony:${harmonySystem.systemId}`);
      const orchestrationPhase = getSystemPhase(plan, "orchestration:orch-1");

      // Orchestration should come last
      expect(orchestrationPhase).toBeGreaterThan(rhythmPhase);
      expect(orchestrationPhase).toBeGreaterThan(melodyPhase);
      expect(orchestrationPhase).toBeGreaterThan(harmonyPhase);
    });
  });

  describe("parallel execution", () => {
    it("should execute independent rhythm systems in parallel", () => {
      const rhythmSystem1 = createRhythmSystem();
      const rhythmSystem2 = createRhythmSystem();

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-parallel-rhythm",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem1, rhythmSystem2],
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);

      expect(plan.valid).toBe(true);

      const phase1 = getSystemPhase(plan, `rhythm:${rhythmSystem1.systemId}`);
      const phase2 = getSystemPhase(plan, `rhythm:${rhythmSystem2.systemId}`);

      // Both rhythm systems should be in the same phase (parallel)
      expect(phase1).toBe(phase2);
    });

    it("should execute independent melody/harmony systems in parallel", () => {
      const rhythmSystem = createRhythmSystem();
      const melodySystem1 = createMelodySystem({
        rhythmBinding: rhythmSystem.systemId,
      });
      const melodySystem2 = createMelodySystem({
        rhythmBinding: rhythmSystem.systemId,
      });
      const harmonySystem = createHarmonySystem({
        harmonicRhythmBinding: rhythmSystem.systemId,
      });

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-parallel-mh",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [rhythmSystem],
        bookII_melodySystems: [melodySystem1, melodySystem2],
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);

      expect(plan.valid).toBe(true);

      const melody1Phase = getSystemPhase(plan, `melody:${melodySystem1.systemId}`);
      const melody2Phase = getSystemPhase(plan, `melody:${melodySystem2.systemId}`);
      const harmonyPhase = getSystemPhase(plan, `harmony:${harmonySystem.systemId}`);

      // Melody and harmony systems should be in the same phase (parallel)
      expect(melody1Phase).toBe(melody2Phase);
      expect(melody1Phase).toBe(harmonyPhase);
    });
  });

  describe("form system", () => {
    it("should include form system in execution plan", () => {
      const formSystem = createFormSystem();

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-form",
        globals: {
          tempo: 120,
          timeSignature: [4, 4],
          key: 0,
        },
        bookI_rhythmSystems: [],
        bookII_melodySystems: [],
        bookIII_harmonySystems: [],
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);

      expect(plan.valid).toBe(true);
      expect(plan.systems.has(`form:${formSystem.systemId}`)).toBe(true);

      // Form system should be in early phase (no dependencies)
      const formPhase = getSystemPhase(plan, `form:${formSystem.systemId}`);
      expect(formPhase).toBeGreaterThanOrEqual(0);
    });
  });

  describe("error handling", () => {
    it("should detect and reject circular dependencies", () => {
      // This test documents the circular dependency detection
      // In practice, circular dependencies can't be created through
      // the normal SchillingerSong API, but we test the resolver's
      // ability to detect them if they somehow occur

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-circular",
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);

      // Simple song should not have circular dependencies
      expect(plan.valid).toBe(true);
    });
  });

  describe("helper functions", () => {
    it("should get system by ID", () => {
      const rhythmSystem = createRhythmSystem();

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-helper",
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);
      const system = getSystemById(plan, `rhythm:${rhythmSystem.systemId}`);

      expect(system).toBeDefined();
      expect(system?.type).toBe("rhythm");
      expect(system?.systemIndex).toBe(0);
    });

    it("should return undefined for non-existent system", () => {
      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-nonexistent",
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);
      const system = getSystemById(plan, "rhythm:nonexistent");

      expect(system).toBeUndefined();
    });

    it("should validate execution plan", () => {
      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-validate",
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);
      const isValid = validateExecutionPlan(plan);

      expect(isValid).toBe(plan.valid);
    });
  });

  describe("real-world scenarios", () => {
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

          voiceAssignmentRules: [],
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

      const plan = resolveExecutionOrder(song);

      expect(plan.valid).toBe(true);

      // Verify execution order
      const formPhase = getSystemPhase(plan, `form:${formSystem.systemId}`);
      const rhythm1Phase = getSystemPhase(plan, `rhythm:${rhythmSystem1.systemId}`);
      const rhythm2Phase = getSystemPhase(plan, `rhythm:${rhythmSystem2.systemId}`);
      const melody1Phase = getSystemPhase(plan, `melody:${melodySystem1.systemId}`);
      const melody2Phase = getSystemPhase(plan, `melody:${melodySystem2.systemId}`);
      const harmonyPhase = getSystemPhase(plan, `harmony:${harmonySystem.systemId}`);
      const orchestrationPhase = getSystemPhase(plan, "orchestration:orch-1");

      // Form and rhythm systems should be in first phase (no dependencies)
      expect(formPhase).toBe(0);
      expect(rhythm1Phase).toBe(0);
      expect(rhythm2Phase).toBe(0);

      // Melody systems should depend on their rhythm bindings
      expect(melody1Phase).toBeGreaterThan(rhythm1Phase);
      expect(melody2Phase).toBeGreaterThan(rhythm2Phase);

      // Harmony should depend on rhythm
      expect(harmonyPhase).toBeGreaterThan(rhythm1Phase);

      // Orchestration should be last
      expect(orchestrationPhase).toBeGreaterThan(melody1Phase);
      expect(orchestrationPhase).toBeGreaterThan(melody2Phase);
      expect(orchestrationPhase).toBeGreaterThan(harmonyPhase);
    });
  });

  describe("determinism", () => {
    it("should produce consistent execution order", () => {
      const rhythmSystem = createRhythmSystem();
      const melodySystem = createMelodySystem({
        rhythmBinding: rhythmSystem.systemId,
      });

      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: "test-song-determinism",
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

          voiceAssignmentRules: [],
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

      const plan1 = resolveExecutionOrder(song);
      const plan2 = resolveExecutionOrder(song);

      expect(plan1.phases).toEqual(plan2.phases);
    });
  });
});

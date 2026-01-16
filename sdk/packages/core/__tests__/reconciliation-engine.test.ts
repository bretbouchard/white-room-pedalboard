/**
 * Reconciliation Engine Tests
 *
 * Tests for reconciling edited song models back to Schillinger theory.
 */

import { describe, it, expect } from "vitest";
import {
  reconcile,
  getReconciliationSummary,
  type ReconciliationResult,
  type ReconciliationReport,
  type AppliedEdit,
  type RejectedEdit,
  type ParameterUpdate,
} from "../src/realization/reconciliation-engine";
import { classifyEdits, EditType } from "../src/realization/edit-classifier";
import type { SchillingerSong_v1, SongModel_v1 } from "../src/types";
import type { DerivationRecord } from "../src/realization/realization-engine";

describe("reconcile", () => {
  describe("decorative edits", () => {
    it("should reconcile tempo changes", () => {
      const originalSong = createSchillingerSong({ tempo: 120 });
      const originalModel = createSongModel({ tempo: 120 });
      const editedModel = createSongModel({ tempo: 140 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(true);
      expect(result.updatedSong).not.toBeNull();
      expect(result.updatedSong?.globals.tempo).toBe(140);
      expect(result.report.appliedEdits).toHaveLength(1);
      expect(result.report.rejectedEdits).toHaveLength(0);
      expect(result.report.totalLoss).toBe(0);
    });

    it("should acknowledge velocity changes without updating theory", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const editedModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 100 },
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(true);
      expect(result.report.appliedEdits.length).toBeGreaterThan(0);
      expect(result.report.appliedEdits[0].updateType).toBe("songModel");
      expect(result.report.appliedEdits[0].updatedParameters).toHaveLength(0);
    });

    it("should acknowledge duration changes without updating theory", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const editedModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 0.5, velocity: 80 },
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(true);
      expect(result.report.appliedEdits.length).toBeGreaterThan(0);
      expect(result.report.appliedEdits[0].updateType).toBe("songModel");
    });
  });

  describe("structural edits", () => {
    it("should reconcile time signature changes", () => {
      const originalSong = createSchillingerSong({ timeSignature: [4, 4] });
      const originalModel = createSongModel({ timeSignature: [4, 4] });
      const editedModel = createSongModel({ timeSignature: [3, 4] });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(true);
      expect(result.updatedSong).not.toBeNull();
      expect(result.updatedSong?.globals.timeSignature).toEqual([3, 4]);
      expect(result.report.parameterUpdates).toHaveLength(1);
      expect(result.report.parameterUpdates[0].parameterPath).toBe("globals.timeSignature");
    });

    it("should reconcile key changes", () => {
      const originalSong = createSchillingerSong({ key: 0 });
      const originalModel = createSongModel({ key: 0 });
      const editedModel = createSongModel({ key: 5 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(true);
      expect(result.updatedSong).not.toBeNull();
      expect(result.updatedSong?.globals.key).toBe(5);
      expect(result.report.parameterUpdates).toHaveLength(1);
      expect(result.report.parameterUpdates[0].parameterPath).toBe("globals.key");
    });

    it("should acknowledge small pitch changes without updating theory", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const editedModel = createSongModelWithNotes([
        { pitch: 62, time: 0, duration: 1, velocity: 80 },
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(true);
      expect(result.report.appliedEdits.length).toBeGreaterThan(0);
    });

    it("should acknowledge note additions within tolerance", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
        { pitch: 62, time: 1, duration: 1, velocity: 80 },
        { pitch: 64, time: 2, duration: 1, velocity: 80 },
        { pitch: 65, time: 3, duration: 1, velocity: 80 },
        { pitch: 67, time: 4, duration: 1, velocity: 80 },
      ]);
      const editedModel = createSongModelWithNotes([
        ...originalModel.notes,
        { pitch: 69, time: 5, duration: 1, velocity: 80 },
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(true);
      expect(result.report.appliedEdits.length).toBeGreaterThan(0);
    });
  });

  describe("destructive edits", () => {
    it("should reject large pitch changes", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const editedModel = createSongModelWithNotes([
        { pitch: 84, time: 0, duration: 1, velocity: 80 },
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(false);
      expect(result.updatedSong).toBeNull();
      expect(result.report.rejectedEdits).toHaveLength(1);
      expect(result.report.rejectedEdits[0].edit.type).toBe(EditType.DESTRUCTIVE);
      expect(result.report.totalLoss).toBeGreaterThan(0);
    });

    it("should reject excessive note additions", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
        { pitch: 62, time: 1, duration: 1, velocity: 80 },
        { pitch: 64, time: 2, duration: 1, velocity: 80 },
        { pitch: 65, time: 3, duration: 1, velocity: 80 },
        { pitch: 67, time: 4, duration: 1, velocity: 80 },
      ]);
      const editedModel = createSongModelWithNotes([
        ...originalModel.notes,
        ...Array.from({ length: 5 }, (_, i) => ({
          pitch: 60 + i * 2,
          time: 5 + i,
          duration: 1,
          velocity: 80,
        })),
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(false);
      expect(result.updatedSong).toBeNull();
      expect(result.report.rejectedEdits).toHaveLength(1);
      expect(result.report.rejectedEdits[0].edit.type).toBe(EditType.DESTRUCTIVE);
    });

    it("should reject section deletions", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModel({
        sections: [
          { sectionId: "section-1", start: 0, end: 32, label: "A" },
          { sectionId: "section-2", start: 32, end: 64, label: "B" },
        ],
      });
      const editedModel = createSongModel({
        sections: [originalModel.sections[0]],
      });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(false);
      expect(result.updatedSong).toBeNull();
      expect(result.report.rejectedEdits).toHaveLength(1);
      expect(result.report.rejectedEdits[0].edit.type).toBe(EditType.DESTRUCTIVE);
    });
  });

  describe("parameter updates", () => {
    it("should track theory parameter updates correctly", () => {
      const originalSong = createSchillingerSong({
        tempo: 120,
        key: 0,
        timeSignature: [4, 4],
      });
      const originalModel = createSongModel({
        tempo: 120,
        key: 0,
        timeSignature: [4, 4],
      });
      const editedModel = createSongModel({
        tempo: 140,
        key: 5,
        timeSignature: [3, 4],
      });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.report.parameterUpdates).toHaveLength(3);

      const tempoUpdate = result.report.parameterUpdates.find(
        (u) => u.parameterPath === "globals.tempo"
      );
      expect(tempoUpdate).toBeDefined();
      expect(tempoUpdate?.oldValue).toBe(120);
      expect(tempoUpdate?.newValue).toBe(140);

      const keyUpdate = result.report.parameterUpdates.find(
        (u) => u.parameterPath === "globals.key"
      );
      expect(keyUpdate).toBeDefined();
      expect(keyUpdate?.oldValue).toBe(0);
      expect(keyUpdate?.newValue).toBe(5);

      const timeSigUpdate = result.report.parameterUpdates.find(
        (u) => u.parameterPath === "globals.timeSignature"
      );
      expect(timeSigUpdate).toBeDefined();
      expect(timeSigUpdate?.oldValue).toEqual([4, 4]);
      expect(timeSigUpdate?.newValue).toEqual([3, 4]);
    });

    it("should include confidence in parameter updates", () => {
      const originalSong = createSchillingerSong({ key: 0 });
      const originalModel = createSongModel({ key: 0 });
      const editedModel = createSongModel({ key: 5 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.report.parameterUpdates[0].confidence).toBeGreaterThan(0);
      expect(result.report.parameterUpdates[0].confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("reconciliation options", () => {
    it("should respect applyDecorativeEdits option", () => {
      const originalSong = createSchillingerSong({ tempo: 120 });
      const originalModel = createSongModel({ tempo: 120 });
      const editedModel = createSongModel({ tempo: 140 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification,
        { applyDecorativeEdits: false }
      );

      expect(result.report.appliedEdits).toHaveLength(0);
    });

    it("should respect applyStructuralEdits option", () => {
      const originalSong = createSchillingerSong({ key: 0 });
      const originalModel = createSongModel({ key: 0 });
      const editedModel = createSongModel({ key: 5 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification,
        { applyStructuralEdits: false }
      );

      expect(result.report.parameterUpdates).toHaveLength(0);
    });

    it("should throw on destructive edits when requested", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const editedModel = createSongModelWithNotes([
        { pitch: 84, time: 0, duration: 1, velocity: 80 },
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);

      expect(() => {
        reconcile(originalSong, originalModel, editedModel, derivation, classification, {
          throwOnDestructive: true,
        });
      }).toThrow();
    });
  });

  describe("reconciliation summary", () => {
    it("should generate readable summary for successful reconciliation", () => {
      const originalSong = createSchillingerSong({ tempo: 120 });
      const originalModel = createSongModel({ tempo: 120 });
      const editedModel = createSongModel({ tempo: 140 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );
      const summary = getReconciliationSummary(result);

      expect(summary).toContain("Reconciliation: SUCCESS");
      expect(summary).toContain("Total Loss:");
      expect(summary).toContain("Applied Edits: 1");
      expect(summary).toContain("Decorative: 1");
    });

    it("should generate readable summary for failed reconciliation", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const editedModel = createSongModelWithNotes([
        { pitch: 84, time: 0, duration: 1, velocity: 80 },
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );
      const summary = getReconciliationSummary(result);

      expect(summary).toContain("Reconciliation: FAILED");
      expect(summary).toContain("Rejected Edits: 1");
      expect(summary).toContain("Reason:");
    });

    it("should include parameter updates in summary", () => {
      const originalSong = createSchillingerSong({ key: 0 });
      const originalModel = createSongModel({ key: 0 });
      const editedModel = createSongModel({ key: 5 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );
      const summary = getReconciliationSummary(result);

      expect(summary).toContain("Theory Parameter Updates: 1");
      expect(summary).toContain("globals.key");
    });
  });

  describe("edge cases", () => {
    it("should handle identical models", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModel({});
      const editedModel = createSongModel({});
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(true);
      expect(result.report.appliedEdits).toHaveLength(0);
      expect(result.report.rejectedEdits).toHaveLength(0);
      expect(result.report.totalLoss).toBe(0);
    });

    it("should handle multiple concurrent edits", () => {
      const originalSong = createSchillingerSong({
        tempo: 120,
        key: 0,
      });
      const originalModel = createSongModel({
        tempo: 120,
        key: 0,
      });
      const editedModel = createSongModel({
        tempo: 140,
        key: 5,
      });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.success).toBe(true);
      expect(result.report.appliedEdits.length).toBeGreaterThan(1);
      expect(result.report.parameterUpdates.length).toBeGreaterThan(1);
    });

    it("should calculate total loss correctly", () => {
      const originalSong = createSchillingerSong({});
      const originalModel = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const editedModel = createSongModelWithNotes([
        { pitch: 84, time: 0, duration: 1, velocity: 80 },
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      expect(result.report.totalLoss).toBeGreaterThan(0);
      expect(result.report.totalLoss).toBeLessThanOrEqual(1);
    });
  });
});

// Helper functions

function createSchillingerSong(overrides?: Partial<SchillingerSong_v1>): SchillingerSong_v1 {
  const defaults: SchillingerSong_v1 = {
    schemaVersion: "1.0",
    songId: "test-song",
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
      systemId: "test-orchestration",
      systemType: "orchestration",
      roles: [],
      registerSystem: {
        systemId: "test-register",
        roleRegisters: [],
      },
      spacingSystem: {
        systemId: "test-spacing",
        minSpacing: [],
        maxSpacing: [],
        crossingRules: [],
      },
      densitySystem: {
        systemId: "test-density",
        roleDensity: [],
      },
      doublingRules: [],
      reinforcementRules: [],
      splitRules: [],
      mergeRules: [],
      formOrchestration: [],
    },
    ensembleModel: {
      ensembleId: "test-ensemble",
      voices: [],
      busses: [],
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

  return { ...defaults, ...overrides };
}

function createSongModel(overrides?: Partial<SongModel_v1>): SongModel_v1 {
  const defaults: SongModel_v1 = {
    schemaVersion: "1.0",
    songId: "test-song",
    sourceSongId: "test-source",
    notes: [],
    sections: [],
    tempo: 120,
    timeSignature: [4, 4],
    key: 0,
    duration: 32,
    createdAt: new Date().toISOString(),
  };

  return { ...defaults, ...overrides };
}

function createSongModelWithNotes(notes: SongModel_v1["notes"]): SongModel_v1 {
  return createSongModel({
    notes,
    duration: notes.length > 0 ? Math.max(...notes.map((n) => n.time + n.duration)) : 0,
  });
}

function createDerivationRecord(): DerivationRecord {
  return {
    schemaVersion: "1.0",
    derivationId: "test-derivation",
    sourceSongId: "test-source",
    realizedSongId: "test-song",
    seed: 42,
    executionPhases: [["rhythm:test", "melody:test", "harmony:test", "form:test"]],
    systemOutputs: {},
    bindingAssignments: [],
    createdAt: new Date().toISOString(),
  };
}

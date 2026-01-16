/**
 * Round-Trip Integration Tests
 *
 * End-to-end tests for the complete round-trip workflow:
 * SchillingerSong → Realize → SongModel → Edit → Reconcile → SchillingerSong
 *
 * Tests acceptance criterion C:
 * "Full round-trip: SchillingerSong → Realize → Edit → Reconcile
 *  produces updated theory OR explicit loss report"
 */

import { describe, it, expect } from "vitest";
import { realizeSong } from "../src/realization/realization-engine";
import { classifyEdits } from "../src/realization/edit-classifier";
import { reconcile, getReconciliationSummary } from "../src/realization/reconciliation-engine";
import type { SchillingerSong_v1, SongModel_v1 } from "../src/types";

describe("Round-Trip Editing", () => {
  describe("acceptance criterion C: full round-trip", () => {
    it("should successfully round-trip decorative tempo edit", () => {
      // Step 1: Create original Schillinger song
      const originalSong = createSchillingerSong({ tempo: 120 });

      // Step 2: Realize into song model
      const { songModel: originalModel, derivation } = realizeSong(originalSong, 42);

      // Step 3: Edit song model (decorative edit)
      const editedModel: SongModel_v1 = {
        ...originalModel,
        tempo: 140,
      };

      // Step 4: Classify edits
      const classification = classifyEdits(originalModel, editedModel, derivation);

      // Step 5: Reconcile back to Schillinger song
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      // Verify: Round-trip succeeded with updated theory
      expect(result.success).toBe(true);
      expect(result.updatedSong).not.toBeNull();
      expect(result.updatedSong?.globals.tempo).toBe(140);
      expect(result.updatedSong?.songId).toContain("reconciled-");
      expect(result.updatedSong?.songId).not.toBe(originalSong.songId);
      expect(result.report.totalLoss).toBe(0);
    });

    it("should successfully round-trip structural key change", () => {
      // Step 1: Create original Schillinger song
      const originalSong = createSchillingerSong({ key: 0 });

      // Step 2: Realize into song model
      const { songModel: originalModel, derivation } = realizeSong(originalSong, 42);

      // Step 3: Edit song model (structural edit)
      const editedModel: SongModel_v1 = {
        ...originalModel,
        key: 5,
      };

      // Step 4: Classify edits
      const classification = classifyEdits(originalModel, editedModel, derivation);

      // Step 5: Reconcile back to Schillinger song
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      // Verify: Round-trip succeeded with updated theory
      expect(result.success).toBe(true);
      expect(result.updatedSong).not.toBeNull();
      expect(result.updatedSong?.globals.key).toBe(5);
      expect(result.report.totalLoss).toBeLessThan(0.5); // Some loss expected for structural edit
    });

    it("should reject destructive edit with explicit loss report", () => {
      // Step 1: Create original Schillinger song
      const originalSong = createSchillingerSong({});

      // Step 2: Realize into song model with notes
      const { songModel: originalModel, derivation } = realizeSong(originalSong, 42);
      const modelWithNotes: SongModel_v1 = {
        ...originalModel,
        notes: [{ pitch: 60, time: 0, duration: 1, velocity: 80 }],
      };

      // Step 3: Edit song model (destructive edit - large pitch change)
      const editedModel: SongModel_v1 = {
        ...modelWithNotes,
        notes: [
          { pitch: 84, time: 0, duration: 1, velocity: 80 }, // +24 semitones (2 octaves)
        ],
      };

      // Step 4: Classify edits
      const classification = classifyEdits(modelWithNotes, editedModel, derivation);

      // Step 5: Reconcile back to Schillinger song
      const result = reconcile(
        originalSong,
        modelWithNotes,
        editedModel,
        derivation,
        classification
      );

      // Verify: Round-trip failed with explicit loss report
      expect(result.success).toBe(false);
      expect(result.updatedSong).toBeNull();
      expect(result.report.totalLoss).toBeGreaterThan(0);
      expect(result.report.rejectedEdits.length).toBeGreaterThan(0);

      // Verify loss report is comprehensive
      const summary = getReconciliationSummary(result);
      expect(summary).toContain("Reconciliation: FAILED");
      expect(summary).toContain("Total Loss:");
      expect(summary).toContain("Rejected Edits: 1");
      expect(summary).toContain("Reason:");
      expect(summary).toContain("Loss:");
    });

    it("should round-trip multiple concurrent edits", () => {
      // Step 1: Create original Schillinger song
      const originalSong = createSchillingerSong({
        tempo: 120,
        key: 0,
      });

      // Step 2: Realize into song model
      const { songModel: originalModel, derivation } = realizeSong(originalSong, 42);

      // Step 3: Edit song model (multiple edits)
      const editedModel: SongModel_v1 = {
        ...originalModel,
        tempo: 140, // decorative
        key: 5, // structural
      };

      // Step 4: Classify edits
      const classification = classifyEdits(originalModel, editedModel, derivation);

      // Step 5: Reconcile back to Schillinger song
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      // Verify: All edits applied
      expect(result.success).toBe(true);
      expect(result.updatedSong).not.toBeNull();
      expect(result.updatedSong?.globals.tempo).toBe(140);
      expect(result.updatedSong?.globals.key).toBe(5);
      expect(result.report.appliedEdits.length).toBe(2);
      expect(result.report.parameterUpdates.length).toBe(2);
    });
  });

  describe("orchestration survival (acceptance criterion D)", () => {
    it("should preserve orchestration through round-trip", () => {
      // Step 1: Create Schillinger song with orchestration
      const originalSong = createSchillingerSongWithOrchestration();

      // Step 2: Realize into song model
      const { songModel: originalModel, derivation } = realizeSong(originalSong, 42);

      // Step 3: Edit song model (decorative tempo change)
      const editedModel: SongModel_v1 = {
        ...originalModel,
        tempo: 140,
      };

      // Step 4: Classify and reconcile
      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      // Verify: Orchestration survived round-trip
      expect(result.success).toBe(true);
      expect(result.updatedSong).not.toBeNull();
      expect(result.updatedSong?.bookV_orchestration).not.toBeNull();
      expect(result.updatedSong?.bookV_orchestration).toEqual(originalSong.bookV_orchestration);
    });
  });

  describe("deterministic realization (acceptance criterion B)", () => {
    it("should produce identical SongModel from same seed", () => {
      const originalSong = createSchillingerSong({});

      // Realize twice with same seed
      const result1 = realizeSong(originalSong, 42);
      const result2 = realizeSong(originalSong, 42);

      // Verify: Identical results (deterministic) excluding non-deterministic timestamps
      const { createdAt: _, ...songModel1 } = result1.songModel as any;
      const { createdAt: __, ...songModel2 } = result2.songModel as any;
      expect(songModel1).toEqual(songModel2);
      expect(result1.derivation).toEqual(result2.derivation);
    });

    it("should produce different SongModel from different seeds", () => {
      const originalSong = createSchillingerSong({});

      // Realize twice with different seeds
      const result1 = realizeSong(originalSong, 42);
      const result2 = realizeSong(originalSong, 123);

      // Verify: Different results (seed matters)
      expect(result1.songModel).not.toEqual(result2.songModel);
      expect(result1.derivation.seed).toBe(42);
      expect(result2.derivation.seed).toBe(123);
    });
  });

  describe("theory-only authoring (acceptance criterion A)", () => {
    it("should create valid song with zero notes", () => {
      // Create Schillinger song with no notes yet (theory-only)
      const song = createSchillingerSong({});

      // Realize it
      const { songModel } = realizeSong(song, 42);

      // Verify: Valid song model exists
      expect(songModel).toBeDefined();
      expect(songModel.schemaVersion).toBe("1.0");
      expect(songModel.songId).toContain("realized-");
      expect(songModel.sourceSongId).toBe(song.songId);
      expect(songModel.notes).toEqual([]); // No notes yet, but valid song
    });
  });

  describe("comprehensive round-trip scenarios", () => {
    it("should handle complete workflow with all edit types", () => {
      // Setup: Song with multiple systems
      const originalSong = createSchillingerSong({
        tempo: 120,
        key: 0,
        timeSignature: [4, 4],
      });

      // Realize
      const { songModel: originalModel, derivation } = realizeSong(originalSong, 42);
      const modelWithNotes: SongModel_v1 = {
        ...originalModel,
        notes: [
          { pitch: 60, time: 0, duration: 1, velocity: 80 },
          { pitch: 62, time: 1, duration: 1, velocity: 80 },
          { pitch: 64, time: 2, duration: 1, velocity: 80 },
        ],
      };

      // Edit: Mix of decorative, structural, and potentially destructive
      const editedModel: SongModel_v1 = {
        ...modelWithNotes,
        tempo: 130, // decorative
        key: 2, // structural
        notes: [
          { pitch: 60, time: 0, duration: 1, velocity: 90 }, // decorative (velocity)
          { pitch: 64, time: 1, duration: 1, velocity: 80 }, // structural (small pitch + time)
          { pitch: 64, time: 2, duration: 1, velocity: 80 }, // decorative (duration change from 1 to 1)
        ],
      };

      // Classify
      const classification = classifyEdits(modelWithNotes, editedModel, derivation);

      // Verify classification found all edits
      expect(classification.edits.length).toBeGreaterThan(2);
      expect(classification.overallConfidence).toBeGreaterThan(0);
      expect(classification.overallAmbiguity).toBeGreaterThanOrEqual(0);

      // Reconcile
      const result = reconcile(
        originalSong,
        modelWithNotes,
        editedModel,
        derivation,
        classification
      );

      // Verify successful round-trip
      expect(result.success).toBe(true);
      expect(result.updatedSong).not.toBeNull();

      // Verify all applied edits tracked
      expect(result.report.appliedEdits.length).toBeGreaterThan(0);

      // Generate summary for debugging
      const summary = getReconciliationSummary(result);
      expect(summary).toContain("Reconciliation: SUCCESS");
    });

    it("should provide clear loss reporting for failed round-trip", () => {
      // Setup
      const originalSong = createSchillingerSong({});

      // Realize
      const { songModel: originalModel, derivation } = realizeSong(originalSong, 42);
      const modelWithNotes: SongModel_v1 = {
        ...originalModel,
        notes: [{ pitch: 60, time: 0, duration: 1, velocity: 80 }],
      };

      // Edit: Destructive (large pitch change)
      const editedModel: SongModel_v1 = {
        ...modelWithNotes,
        notes: [
          { pitch: 96, time: 0, duration: 1, velocity: 80 }, // +36 semitones (3 octaves)
        ],
      };

      // Classify and reconcile
      const classification = classifyEdits(modelWithNotes, editedModel, derivation);
      const result = reconcile(
        originalSong,
        modelWithNotes,
        editedModel,
        derivation,
        classification
      );

      // Verify: Clear failure with loss report
      expect(result.success).toBe(false);

      const summary = getReconciliationSummary(result);

      // Verify summary contains all required information
      expect(summary).toContain("Reconciliation: FAILED");
      expect(summary).toMatch(/Total Loss: \d+\.\d+%/); // Percentage format
      expect(summary).toContain("Rejected Edits: 1");
      expect(summary).toContain("Reason: Destructive edit prevents reconciliation");
      expect(summary).toMatch(/Loss: \d+\.\d+%/); // Loss percentage
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle no edits gracefully", () => {
      const originalSong = createSchillingerSong({});
      const { songModel: originalModel, derivation } = realizeSong(originalSong, 42);

      // No edits
      const classification = classifyEdits(originalModel, originalModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        originalModel,
        derivation,
        classification
      );

      // Verify: Success but no changes
      expect(result.success).toBe(true);
      expect(result.updatedSong).not.toBeNull();
      expect(result.report.appliedEdits).toHaveLength(0);
      expect(result.report.totalLoss).toBe(0);
    });

    it("should handle empty song model", () => {
      const originalSong = createSchillingerSong({});
      const { songModel: originalModel, derivation } = realizeSong(originalSong, 42);

      // Edit: Add notes (addition)
      const editedModel: SongModel_v1 = {
        ...originalModel,
        notes: [{ pitch: 60, time: 0, duration: 1, velocity: 80 }],
      };

      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      // Verify: Handled gracefully
      expect(result).toBeDefined();
      expect(result.report).toBeDefined();
    });

    it("should preserve metadata through round-trip", () => {
      const originalSong = createSchillingerSong({
        tempo: 120,
      });

      // Realize
      const { songModel: originalModel, derivation } = realizeSong(originalSong, 42);

      // Edit
      const editedModel: SongModel_v1 = {
        ...originalModel,
        tempo: 140,
      };

      // Round-trip
      const classification = classifyEdits(originalModel, editedModel, derivation);
      const result = reconcile(
        originalSong,
        originalModel,
        editedModel,
        derivation,
        classification
      );

      // Verify: Provenance preserved (with updated timestamp)
      expect(result.updatedSong?.provenance.createdAt).toBe(originalSong.provenance.createdAt);
      expect(result.updatedSong?.provenance.createdBy).toBe(originalSong.provenance.createdBy);
      expect(result.updatedSong?.provenance.modifiedAt).toBeDefined(); // May be updated
      expect(result.updatedSong?.schemaVersion).toBe(originalSong.schemaVersion);
      expect(result.updatedSong?.songId).toContain("reconciled-"); // New ID for reconciled song
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

function createSchillingerSongWithOrchestration(): SchillingerSong_v1 {
  return createSchillingerSong({
    bookV_orchestration: {
      systemId: "orch-test",
      systemType: "orchestration",
      roles: [
        {
          roleId: "role-melody",
          roleName: "Melody",
          priority: "primary",
          functionalClass: "motion",
          yieldTo: [],
        },
      ],
      registerSystem: {
        systemId: "orch-test-register",
        roleRegisters: [
          {
            roleId: "role-melody",
            minPitch: 60,
            maxPitch: 84,
          },
        ],
      },
      spacingSystem: {
        systemId: "orch-test-spacing",
        minSpacing: [],
        maxSpacing: [],
        crossingRules: [],
      },
      densitySystem: {
        systemId: "orch-test-density",
        roleDensity: [
          {
            roleId: "role-melody",
            densityBudget: 0.5,
            couplingRules: [],
          },
        ],
      },
      doublingRules: [],
      reinforcementRules: [],
      splitRules: [],
      mergeRules: [],
      formOrchestration: [],
    },
  });
}

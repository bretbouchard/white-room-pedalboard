/**
 * Validation API Tests - T032
 *
 * Tests for comprehensive SchillingerSong validation including
 * schema validation, binding consistency, and business rules.
 */

import { describe, it, expect } from "vitest";
import { initializeSchemas } from "../src/schemas/registry";
import {
  validate,
  isValid,
  validateSongModel,
  validateDerivationRecord,
  validateReconciliationReport,
  type SongValidationReport,
  type ValidationMessage,
} from "../src/api/validate";
import { createRhythmSystem } from "../src/theory/systems/rhythm";
import { createMelodySystem } from "../src/theory/systems/melody";
import { createHarmonySystem } from "../src/theory/systems/harmony";
import { BindingsSystem } from "../src/theory/bindings";
import { createOrchestrationSystem } from "./helpers/create-orchestration-system";
import { createEnsembleModel } from "./helpers/create-ensemble-model";
import { createTestSong } from "./helpers/create-schillinger-song";
import { generateUUID } from "../src/utils/uuid";
import type { SchillingerSong_v1 } from "../src/types";

describe("Validation API (T032)", () => {
  // Initialize schemas before all tests
  beforeAll(() => {
    initializeSchemas();
  });

  describe("validate()", () => {
    it("should pass validation for a valid song", () => {
      const song = createTestSong(); // Test helper creates minimal but schema-compliant song

      const result = validate(song);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect schema validation errors", () => {
      const song = createTestSong();
      // Remove required field to trigger schema error
      delete (song as any).globals;

      const result = validate(song);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].category).toBe("schema");
      expect(result.errors[0].code).toBe("SCHEMA_VALIDATION_ERROR");
    });

    it("should detect binding validation errors", () => {
      const song = createTestSong();
      const roleId = generateUUID();
      const rhythmSystemId = generateUUID();
      const voiceId = generateUUID();

      // Add binding without adding role, system, or voice
      song.bindings.roleRhythmBindings.push(
        BindingsSystem.createRoleRhythmBinding(roleId, rhythmSystemId, voiceId)
      );

      const result = validate(song);

      expect(result.valid).toBe(false);
      const bindingErrors = result.errors.filter((e) => e.category === "binding");
      expect(bindingErrors.length).toBeGreaterThan(0);
    });

    it("should detect tempo out of range", () => {
      const song = createTestSong();
      song.globals.tempo = 350; // Outside schema range (40-300)

      const result = validate(song);

      expect(result.valid).toBe(false);
      // Should fail schema validation first (tempo must be 40-300)
      const schemaErrors = result.errors.filter((e) => e.category === "schema");
      expect(schemaErrors.length).toBeGreaterThan(0);
    });

    it("should detect invalid key", () => {
      const song = createTestSong();
      song.globals.key = 15; // Invalid (must be 0-11)

      const result = validate(song);

      expect(result.valid).toBe(false);
      const keyErrors = result.errors.filter((e) => e.code === "KEY_OUT_OF_RANGE");
      expect(keyErrors).toHaveLength(1);
      expect(keyErrors[0].severity).toBe("error");
    });

    it("should detect unusual time signature denominator", () => {
      const song = createTestSong();
      song.globals.timeSignature = [3, 3]; // Unusual denominator

      const result = validate(song);

      const tsWarnings = result.warnings.filter(
        (w) => w.code === "INVALID_TIME_SIGNATURE_DENOMINATOR"
      );
      expect(tsWarnings).toHaveLength(1);
      expect(tsWarnings[0].message).toContain("3");
    });

    it("should detect empty song (no systems)", () => {
      const song = createTestSong();
      // Song has no theory systems by default

      const result = validate(song, { includeInfo: true });

      expect(result.valid).toBe(true);
      const emptyInfo = result.info.filter((i) => i.code === "EMPTY_SONG");
      expect(emptyInfo).toHaveLength(1);
      expect(emptyInfo[0].message).toContain("empty composition");
    });

    it("should detect orphaned roles", () => {
      const song = createTestSong();
      const roleId = generateUUID();
      const voiceId = generateUUID();

      // Add role but no bindings
      song.bookV_orchestration.roles.push({
        roleId,
        roleName: "Orphaned Role",
        functionalClass: "motion",
        enabled: true,
      });

      // Add voice to ensemble
      song.ensembleModel.voices.push({
        voiceId,
        name: "Test Voice",
        functionalClass: "motion",
      });

      const result = validate(song);

      const orphanedWarnings = result.warnings.filter((w) => w.code === "ORPHANED_ROLE");
      expect(orphanedWarnings).toHaveLength(1);
      expect(orphanedWarnings[0].message).toContain("Orphaned Role");
    });

    it("should detect unused voices", () => {
      const song = createTestSong();
      const voiceId = generateUUID();

      // Add voice but no bindings
      song.ensembleModel.voices.push({
        voiceId,
        name: "Unused Voice",
        functionalClass: "motion",
      });

      const result = validate(song, { includeInfo: true });

      const unusedInfo = result.info.filter((i) => i.code === "UNUSED_VOICE");
      expect(unusedInfo).toHaveLength(1);
      expect(unusedInfo[0].message).toContain("Unused Voice");
    });

    it("should detect unbound systems", () => {
      const song = createTestSong();
      const rhythmSystem = createRhythmSystem();

      // Add system but no bindings
      song.bookI_rhythmSystems.push(rhythmSystem);

      const result = validate(song);

      const unboundWarnings = result.warnings.filter((w) => w.code === "UNBOUND_SYSTEM");
      expect(unboundWarnings).toHaveLength(1);
      expect(unboundWarnings[0].message).toMatch(/[Rr]hythm/); // Case-insensitive match
    });

    it("should respect stopOnFirstError option", () => {
      const song = createTestSong();
      // Create multiple errors
      song.globals.key = 15; // Invalid key
      delete (song as any).globals; // Schema error

      const result = validate(song, { stopOnFirstError: true });

      // Should stop after schema validation errors
      expect(result.valid).toBe(false);
      expect(result.errors[0].category).toBe("schema");
    });

    it("should include info messages when requested", () => {
      const song = createTestSong();

      const result = validate(song, { includeInfo: true });

      // Empty song generates info message
      expect(result.info.length).toBeGreaterThan(0);
    });

    it("should provide accurate summary statistics", () => {
      const song = createTestSong();
      song.globals.tempo = 350; // Warning
      song.globals.key = 15; // Error
      song.ensembleModel.voices.push({
        voiceId: generateUUID(),
        name: "Unused Voice",
        functionalClass: "motion",
      });

      const result = validate(song, { includeInfo: true });

      expect(result.summary.totalErrors).toBe(result.errors.length);
      expect(result.summary.totalWarnings).toBe(result.warnings.length);
      expect(result.summary.totalInfo).toBe(result.info.length);
    });

    it("should categorize validation messages correctly", () => {
      const song = createTestSong();
      const roleId = generateUUID();
      const voiceId = generateUUID();

      // Create various types of issues
      song.globals.key = 15; // Business rule error
      song.globals.tempo = 350; // Business rule warning
      song.bookV_orchestration.roles.push({
        roleId,
        roleName: "Orphaned Role",
        functionalClass: "motion",
        enabled: true,
      });
      song.ensembleModel.voices.push({
        voiceId,
        name: "Unused Voice",
        functionalClass: "motion",
      });

      const result = validate(song, { includeInfo: true });

      // Check categories exist
      const categories = new Set(result.errors.map((e) => e.category));
      expect(categories.has("business")).toBe(true);
    });
  });

  describe("isValid()", () => {
    it("should return true for valid song", () => {
      const song = createTestSong(); // Test helper creates minimal but schema-compliant song

      const result = isValid(song);

      expect(result).toBe(true);
    });

    it("should return false for invalid song", () => {
      const song = createTestSong();
      song.globals.key = 15; // Invalid key (must be 0-11)

      const result = isValid(song);

      expect(result).toBe(false);
    });

    it("should return false for song with schema errors", () => {
      const song = createTestSong();
      delete (song as any).globals;

      const result = isValid(song);

      expect(result).toBe(false);
    });

    it("should return true for song with only warnings", () => {
      // Create a minimal schema-compliant song
      const song: SchillingerSong_v1 = {
        schemaVersion: "1.0",
        songId: generateUUID(),
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
      };

      const result = isValid(song);

      expect(result).toBe(true); // Warnings don't invalidate
    });
  });

  describe("validateSongModel()", () => {
    it("should validate valid SongModel", () => {
      const songModel = {
        schemaVersion: "1.0",
        songId: generateUUID(),
        derivationId: generateUUID(),
        notes: [],
        events: [],
        voiceAssignments: [],
        duration: 0,
        tempoChanges: [],
        sections: [],
      };

      const result = validateSongModel(songModel);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect schema errors in SongModel", () => {
      const songModel = {
        schemaVersion: "1.0",
        // Missing required fields
      };

      const result = validateSongModel(songModel);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("validateDerivationRecord()", () => {
    it("should validate valid DerivationRecord", () => {
      const derivation = {
        derivationId: generateUUID(),
        sourceSongId: generateUUID(),
        seed: 12345,
        executionOrder: [],
        outputs: [],
        constraintsApplied: [],
      };

      const result = validateDerivationRecord(derivation);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect schema errors in DerivationRecord", () => {
      const derivation = {
        // Missing required fields
      };

      const result = validateDerivationRecord(derivation);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("validateReconciliationReport()", () => {
    it("should validate valid ReconciliationReport", () => {
      const report = {
        reportId: generateUUID(),
        sourceSongId: generateUUID(),
        editedModelId: generateUUID(),
        confidenceSummary: {
          overall: 0.95,
          byBook: {
            rhythm: 0.98,
            melody: 0.92,
            harmony: 0.95,
            form: 0.97,
            orchestration: 0.93,
          },
        },
        systemMatches: [],
        losses: [],
        suggestedActions: [],
      };

      const result = validateReconciliationReport(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid overall confidence", () => {
      const report = {
        reportId: generateUUID(),
        sourceSongId: generateUUID(),
        editedModelId: generateUUID(),
        confidenceSummary: {
          overall: 1.5, // Invalid: > 1
          byBook: {
            rhythm: 0.98,
            melody: 0.92,
            harmony: 0.95,
            form: 0.97,
            orchestration: 0.93,
          },
        },
        systemMatches: [],
        losses: [],
        suggestedActions: [],
      };

      const result = validateReconciliationReport(report);

      expect(result.valid).toBe(false);
      const confidenceErrors = result.errors.filter((e) => e.code === "INVALID_CONFIDENCE");
      expect(confidenceErrors).toHaveLength(1);
      expect(confidenceErrors[0].message).toContain("1.5");
    });

    it("should detect invalid by-book confidence", () => {
      const report = {
        reportId: generateUUID(),
        sourceSongId: generateUUID(),
        editedModelId: generateUUID(),
        confidenceSummary: {
          overall: 0.95,
          byBook: {
            rhythm: -0.1, // Invalid: < 0
            melody: 0.92,
            harmony: 0.95,
            form: 0.97,
            orchestration: 0.93,
          },
        },
        systemMatches: [],
        losses: [],
        suggestedActions: [],
      };

      const result = validateReconciliationReport(report);

      expect(result.valid).toBe(false);
      const confidenceErrors = result.errors.filter((e) => e.code === "INVALID_CONFIDENCE");
      expect(confidenceErrors.length).toBeGreaterThan(0);
    });

    it("should accept confidence at boundaries", () => {
      const report = {
        reportId: generateUUID(),
        sourceSongId: generateUUID(),
        editedModelId: generateUUID(),
        confidenceSummary: {
          overall: 0, // Valid minimum
          byBook: {
            rhythm: 1, // Valid maximum
            melody: 1,
            harmony: 1,
            form: 1,
            orchestration: 1,
          },
        },
        systemMatches: [],
        losses: [],
        suggestedActions: [],
      };

      const result = validateReconciliationReport(report);

      expect(result.valid).toBe(true);
    });
  });
});

/**
 * Helper function to create a valid song with proper bindings for testing
 */
function createValidSongWithBindings(): SchillingerSong_v1 {
  const rhythmSystem = createRhythmSystem();
  const melodySystem = createMelodySystem();
  const harmonySystem = createHarmonySystem();
  const orchestration = createOrchestrationSystem();
  const ensemble = createEnsembleModel();

  const song: SchillingerSong_v1 = {
    schemaVersion: "1.0",
    songId: generateUUID(),
    globals: {
      tempo: 120,
      timeSignature: [4, 4],
      key: 0,
    },
    bookI_rhythmSystems: [rhythmSystem],
    bookII_melodySystems: [melodySystem],
    bookIII_harmonySystems: [harmonySystem],
    bookIV_formSystem: null,
    bookV_orchestration: orchestration,
    ensembleModel: ensemble,
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

  // Add voices to ensemble
  const voiceId1 = generateUUID();
  const voiceId2 = generateUUID();
  const voiceId3 = generateUUID();

  ensemble.voices = [
    { voiceId: voiceId1, name: "Voice 1", functionalClass: "motion" },
    { voiceId: voiceId2, name: "Voice 2", functionalClass: "foundation" },
    { voiceId: voiceId3, name: "Voice 3", functionalClass: "ornament" },
  ];

  // Add roles to orchestration
  const roleId1 = generateUUID();
  const roleId2 = generateUUID();

  orchestration.roles = [
    { roleId: roleId1, roleName: "Primary", functionalClass: "motion", enabled: true },
    { roleId: roleId2, roleName: "Secondary", functionalClass: "foundation", enabled: true },
  ];

  // Add bindings
  song.bindings.roleRhythmBindings.push(
    BindingsSystem.createRoleRhythmBinding(roleId1, rhythmSystem.systemId, voiceId1, 8)
  );
  song.bindings.roleMelodyBindings.push(
    BindingsSystem.createRoleMelodyBinding(roleId1, melodySystem.systemId, voiceId1, 8)
  );
  song.bindings.roleHarmonyBindings.push(
    BindingsSystem.createRoleHarmonyBinding(
      roleId2,
      harmonySystem.systemId,
      [voiceId2, voiceId3],
      7
    )
  );
  song.bindings.roleEnsembleBindings.push(
    BindingsSystem.createRoleEnsembleBinding(roleId1, voiceId1)
  );

  return song;
}

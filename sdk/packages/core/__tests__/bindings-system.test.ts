/**
 * BindingsSystem Tests - T023
 *
 * Tests for binding validation and management between
 * orchestration roles and theory systems.
 */

import { describe, it, expect } from "vitest";
import { BindingsSystem } from "../src/theory/bindings";
import { createRhythmSystem } from "../src/theory/systems/rhythm";
import { createMelodySystem } from "../src/theory/systems/melody";
import { createHarmonySystem } from "../src/theory/systems/harmony";
import { createOrchestrationSystem } from "./helpers/create-orchestration-system";
import { createEnsembleModel } from "./helpers/create-ensemble-model";
import { createTestSong } from "./helpers/create-schillinger-song";
import { generateUUID } from "../src/utils/uuid";
import type { SchillingerSong_v1 } from "../src/types";

describe("BindingsSystem (T023)", () => {
  describe("createRoleRhythmBinding", () => {
    it("should create a valid role-rhythm binding", () => {
      const roleId = generateUUID();
      const rhythmSystemId = generateUUID();
      const voiceId = generateUUID();

      const binding = BindingsSystem.createRoleRhythmBinding(roleId, rhythmSystemId, voiceId, 7);

      expect(binding.bindingId).toBeDefined();
      expect(binding.roleId).toBe(roleId);
      expect(binding.rhythmSystemId).toBe(rhythmSystemId);
      expect(binding.voiceId).toBe(voiceId);
      expect(binding.priority).toBe(7);
    });

    it("should use default priority when not specified", () => {
      const binding = BindingsSystem.createRoleRhythmBinding("r1", "rs1", "v1");

      expect(binding.priority).toBe(5);
    });

    it("should clamp priority to valid range [1, 10]", () => {
      const lowBinding = BindingsSystem.createRoleRhythmBinding("r1", "rs1", "v1", -5);
      const highBinding = BindingsSystem.createRoleRhythmBinding("r1", "rs1", "v1", 15);

      expect(lowBinding.priority).toBe(1);
      expect(highBinding.priority).toBe(10);
    });
  });

  describe("createRoleMelodyBinding", () => {
    it("should create a valid role-melody binding", () => {
      const roleId = generateUUID();
      const melodySystemId = generateUUID();
      const voiceId = generateUUID();

      const binding = BindingsSystem.createRoleMelodyBinding(roleId, melodySystemId, voiceId, 8);

      expect(binding.bindingId).toBeDefined();
      expect(binding.roleId).toBe(roleId);
      expect(binding.melodySystemId).toBe(melodySystemId);
      expect(binding.voiceId).toBe(voiceId);
      expect(binding.priority).toBe(8);
    });

    it("should use default priority when not specified", () => {
      const binding = BindingsSystem.createRoleMelodyBinding("r1", "ms1", "v1");

      expect(binding.priority).toBe(5);
    });
  });

  describe("createRoleHarmonyBinding", () => {
    it("should create a valid role-harmony binding", () => {
      const roleId = generateUUID();
      const harmonySystemId = generateUUID();
      const voiceIds = [generateUUID(), generateUUID(), generateUUID()];

      const binding = BindingsSystem.createRoleHarmonyBinding(roleId, harmonySystemId, voiceIds, 6);

      expect(binding.bindingId).toBeDefined();
      expect(binding.roleId).toBe(roleId);
      expect(binding.harmonySystemId).toBe(harmonySystemId);
      expect(binding.voiceIds).toEqual(voiceIds);
      expect(binding.priority).toBe(6);
    });

    it("should copy voiceIds array to prevent mutation", () => {
      const voiceIds = [generateUUID(), generateUUID()];
      const binding = BindingsSystem.createRoleHarmonyBinding("r1", "hs1", voiceIds);

      voiceIds.push(generateUUID());

      expect(binding.voiceIds).toHaveLength(2);
    });

    it("should use default priority when not specified", () => {
      const binding = BindingsSystem.createRoleHarmonyBinding("r1", "hs1", ["v1", "v2"]);

      expect(binding.priority).toBe(5);
    });
  });

  describe("createRoleEnsembleBinding", () => {
    it("should create a valid role-ensemble binding", () => {
      const roleId = generateUUID();
      const voiceId = generateUUID();

      const binding = BindingsSystem.createRoleEnsembleBinding(roleId, voiceId);

      expect(binding.bindingId).toBeDefined();
      expect(binding.roleId).toBe(roleId);
      expect(binding.voiceId).toBe(voiceId);
    });
  });

  describe("validateBindings", () => {
    it("should pass validation for a valid song with proper bindings", () => {
      const song = createValidSongWithBindings();

      const result = BindingsSystem.validateBindings(song);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect duplicate role-rhythm bindings", () => {
      const song = createTestSong();
      const roleId = "role-1";
      const rhythmSystemId = "rhythm-1";
      const voiceId = "voice-1";

      // Add valid role and system to song for validation
      song.bookV_orchestration.roles.push({
        roleId,
        roleName: "Test Role",
        functionalClass: "motion",
        enabled: true,
      });
      song.bookI_rhythmSystems.push(createRhythmSystem());
      song.ensembleModel.voices.push({
        voiceId,
        name: "Test Voice",
        functionalClass: "motion",
      });

      // Add duplicate binding
      song.bindings.roleRhythmBindings.push(
        BindingsSystem.createRoleRhythmBinding(roleId, rhythmSystemId, voiceId)
      );
      song.bindings.roleRhythmBindings.push(
        BindingsSystem.createRoleRhythmBinding(roleId, rhythmSystemId, voiceId)
      );

      const result = BindingsSystem.validateBindings(song);

      expect(result.valid).toBe(false);
      const duplicateErrors = result.errors.filter((e) => e.type === "duplicate_binding");
      expect(duplicateErrors).toHaveLength(1);
      expect(duplicateErrors[0].type).toBe("duplicate_binding");
    });

    it("should detect invalid role references", () => {
      const song = createTestSong();
      song.bindings.roleRhythmBindings.push(
        BindingsSystem.createRoleRhythmBinding("invalid-role", "rhythm-1", "voice-1")
      );

      const result = BindingsSystem.validateBindings(song);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === "invalid_reference")).toBe(true);
    });

    it("should detect invalid rhythm system references", () => {
      const song = createTestSong();
      song.bindings.roleRhythmBindings.push(
        BindingsSystem.createRoleRhythmBinding("role-1", "invalid-rhythm", "voice-1")
      );

      const result = BindingsSystem.validateBindings(song);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === "invalid_reference")).toBe(true);
    });

    it("should detect invalid voice references", () => {
      const song = createTestSong();
      song.bindings.roleRhythmBindings.push(
        BindingsSystem.createRoleRhythmBinding("role-1", "rhythm-1", "invalid-voice")
      );

      const result = BindingsSystem.validateBindings(song);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === "invalid_reference")).toBe(true);
    });

    it("should warn when voice is assigned to multiple roles", () => {
      const song = createTestSong();
      const voiceId = "voice-1";
      const roleId1 = "role-1";
      const roleId2 = "role-2";

      // Create systems with actual IDs
      const rhythmSystem = createRhythmSystem();
      const melodySystem = createMelodySystem();

      // Add valid roles and systems to song
      song.bookV_orchestration.roles.push(
        { roleId: roleId1, roleName: "Role 1", functionalClass: "motion", enabled: true },
        { roleId: roleId2, roleName: "Role 2", functionalClass: "foundation", enabled: true }
      );
      song.bookI_rhythmSystems.push(rhythmSystem);
      song.bookII_melodySystems.push(melodySystem);
      song.ensembleModel.voices.push({
        voiceId,
        name: "Test Voice",
        functionalClass: "motion",
      });

      // Assign same voice to two different roles (valid but generates warning)
      song.bindings.roleRhythmBindings.push(
        BindingsSystem.createRoleRhythmBinding(roleId1, rhythmSystem.systemId, voiceId)
      );
      song.bindings.roleMelodyBindings.push(
        BindingsSystem.createRoleMelodyBinding(roleId2, melodySystem.systemId, voiceId)
      );

      const result = BindingsSystem.validateBindings(song);

      expect(result.valid).toBe(true); // This is a warning, not an error
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("assigned to multiple roles");
    });
  });

  describe("getBindingsForRole", () => {
    it("should return all bindings for a specific role", () => {
      const song = createValidSongWithBindings();
      const roleId = song.bookV_orchestration.roles[0].roleId;

      const bindings = BindingsSystem.getBindingsForRole(song, roleId);

      expect(bindings.rhythmBindings).toBeDefined();
      expect(bindings.melodyBindings).toBeDefined();
      expect(bindings.harmonyBindings).toBeDefined();
      expect(bindings.ensembleBindings).toBeDefined();
    });

    it("should return empty arrays for role with no bindings", () => {
      const song = createTestSong();
      const roleId = "non-existent-role";

      const bindings = BindingsSystem.getBindingsForRole(song, roleId);

      expect(bindings.rhythmBindings).toHaveLength(0);
      expect(bindings.melodyBindings).toHaveLength(0);
      expect(bindings.harmonyBindings).toHaveLength(0);
      expect(bindings.ensembleBindings).toHaveLength(0);
    });
  });

  describe("getBindingsForVoice", () => {
    it("should return all bindings for a specific voice", () => {
      const song = createTestSong();
      const voiceId = "test-voice";
      const roleId = "test-role";

      // Add bindings for the voice
      song.bindings.roleRhythmBindings.push(
        BindingsSystem.createRoleRhythmBinding(roleId, "rhythm-1", voiceId)
      );
      song.bindings.roleMelodyBindings.push(
        BindingsSystem.createRoleMelodyBinding(roleId, "melody-1", voiceId)
      );
      song.bindings.roleEnsembleBindings.push(
        BindingsSystem.createRoleEnsembleBinding(roleId, voiceId)
      );

      const bindings = BindingsSystem.getBindingsForVoice(song, voiceId);

      expect(bindings).toHaveLength(3);
    });

    it("should return empty array for voice with no bindings", () => {
      const song = createTestSong();

      const bindings = BindingsSystem.getBindingsForVoice(song, "non-existent-voice");

      expect(bindings).toHaveLength(0);
    });
  });

  describe("getHarmonyBindingsForVoice", () => {
    it("should return harmony bindings that include the voice", () => {
      const song = createTestSong();
      const voiceId1 = "voice-1";
      const voiceId2 = "voice-2";
      const roleId = "role-1";

      // Create harmony binding with multiple voices
      song.bindings.roleHarmonyBindings.push(
        BindingsSystem.createRoleHarmonyBinding(roleId, "harmony-1", [voiceId1, voiceId2])
      );

      const bindings1 = BindingsSystem.getHarmonyBindingsForVoice(song, voiceId1);
      const bindings2 = BindingsSystem.getHarmonyBindingsForVoice(song, voiceId2);

      expect(bindings1).toHaveLength(1);
      expect(bindings2).toHaveLength(1);
      expect(bindings1[0].voiceIds).toContain(voiceId1);
      expect(bindings2[0].voiceIds).toContain(voiceId2);
    });

    it("should return empty array for voice not in any harmony binding", () => {
      const song = createTestSong();

      const bindings = BindingsSystem.getHarmonyBindingsForVoice(song, "non-existent-voice");

      expect(bindings).toHaveLength(0);
    });
  });

  describe("roleHasBindings", () => {
    it("should return true when role has bindings", () => {
      const song = createTestSong();
      const roleId = "role-1";

      song.bindings.roleRhythmBindings.push(
        BindingsSystem.createRoleRhythmBinding(roleId, "rhythm-1", "voice-1")
      );

      const hasBindings = BindingsSystem.roleHasBindings(song, roleId);

      expect(hasBindings).toBe(true);
    });

    it("should return false when role has no bindings", () => {
      const song = createTestSong();

      const hasBindings = BindingsSystem.roleHasBindings(song, "non-existent-role");

      expect(hasBindings).toBe(false);
    });
  });

  describe("voiceHasBindings", () => {
    it("should return true when voice has bindings", () => {
      const song = createTestSong();
      const voiceId = "voice-1";

      song.bindings.roleRhythmBindings.push(
        BindingsSystem.createRoleRhythmBinding("role-1", "rhythm-1", voiceId)
      );

      const hasBindings = BindingsSystem.voiceHasBindings(song, voiceId);

      expect(hasBindings).toBe(true);
    });

    it("should return true when voice is in harmony binding", () => {
      const song = createTestSong();
      const voiceId = "voice-1";

      song.bindings.roleHarmonyBindings.push(
        BindingsSystem.createRoleHarmonyBinding("role-1", "harmony-1", [voiceId])
      );

      const hasBindings = BindingsSystem.voiceHasBindings(song, voiceId);

      expect(hasBindings).toBe(true);
    });

    it("should return false when voice has no bindings", () => {
      const song = createTestSong();

      const hasBindings = BindingsSystem.voiceHasBindings(song, "non-existent-voice");

      expect(hasBindings).toBe(false);
    });
  });
});

/**
 * Helper function to create a valid song with proper bindings
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

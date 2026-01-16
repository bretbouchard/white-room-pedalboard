/**
 * Realized Ensemble Stability Tests
 *
 * These tests verify that ensemble realization is:
 * 1. Deterministic - Same seed + same song → same IDs
 * 2. Unique - Different seeds or songs → different IDs
 * 3. Complete - All required fields populated
 * 4. Traceable - All sources trace back to theory systems
 *
 * @module tests/realization
 */

import { describe, it, expect } from "vitest";
import { realizeSong } from "../../packages/core/src/realization/realization-engine";
import type { SchillingerSong_v1 } from "../../packages/core/src/types/definitions";
import type { RealizedEnsembleModel_v1 } from "@schillinger-sdk/shared";

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a minimal test song for ensemble realization
 */
function createTestSong(
  overrides?: Partial<SchillingerSong_v1>,
): SchillingerSong_v1 {
  const base: SchillingerSong_v1 = {
    schemaVersion: "1.0",
    songId: "test-song-123",
    globals: {
      tempo: 120,
      timeSignature: [4, 4],
      key: 0, // C
    },
    bookI_rhythmSystems: [
      {
        systemId: "rhythm:test",
        systemType: "rhythm",
        generators: [{ period: 4, phase: 0, weight: 1.0 }],
        resultantSelection: {
          method: "interference",
        },
        permutations: [],
        accentDisplacement: [],
        densityConstraints: {
          constraintId: "density:test",
          scope: "system",
        },
        quantizationConstraint: {
          constraintId: "quant:test",
          grid: 0.25,
          allowOffset: false,
        },
      },
    ],
    bookII_melodySystems: [],
    bookIII_harmonySystems: [],
    bookIV_formSystem: null,
    bookV_orchestration: {
      systemId: "orch:test",
      systemType: "orchestration",
      roles: [
        {
          roleId: "role:bass",
          roleName: "Bass",
          priority: "primary",
          functionalClass: "foundation",
          yieldTo: [],
        },
        {
          roleId: "role:melody",
          roleName: "Melody",
          priority: "primary",
          functionalClass: "motion",
          yieldTo: ["role:bass"],
        },
      ],
      registerSystem: {
        systemId: "register:test",
        roleRegisters: [
          {
            roleId: "role:bass",
            minPitch: 36, // C2
            maxPitch: 60, // C4
          },
          {
            roleId: "role:melody",
            minPitch: 60, // C4
            maxPitch: 84, // C6
          },
        ],
      },
      spacingSystem: {
        systemId: "spacing:test",
        minSpacing: [],
        maxSpacing: [],
        crossingRules: [],
      },
      densitySystem: {
        systemId: "density:test",
        roleDensity: [],
      },
      doublingRules: [],
      reinforcementRules: [],
      splitRules: [],
      mergeRules: [],
      formOrchestration: [],
    },
    ensembleModel: {
      voices: [
        {
          id: "voice:bass",
          name: "Bass",
          rolePools: [
            { role: "primary", functionalClass: "foundation", enabled: true },
          ],
          registerRange: {
            minPitch: 36,
            maxPitch: 60,
          },
        },
        {
          id: "voice:melody",
          name: "Melody",
          rolePools: [
            { role: "primary", functionalClass: "motion", enabled: true },
          ],
          registerRange: {
            minPitch: 60,
            maxPitch: 84,
          },
        },
      ],
      voiceCount: 2,
      groups: [],
      balanceRules: [],
    },
    bindings: {
      roleRhythmBindings: [
        {
          bindingId: "binding:bass-rhythm",
          roleId: "role:bass",
          rhythmSystemId: "rhythm:test",
          voiceId: "voice:bass",
          priority: 10,
        },
        {
          bindingId: "binding:melody-rhythm",
          roleId: "role:melody",
          rhythmSystemId: "rhythm:test",
          voiceId: "voice:melody",
          priority: 9,
        },
      ],
      roleMelodyBindings: [],
      roleHarmonyBindings: [],
      roleEnsembleBindings: [
        {
          bindingId: "binding:bass-ensemble",
          roleId: "role:bass",
          voiceId: "voice:bass",
        },
        {
          bindingId: "binding:melody-ensemble",
          roleId: "role:melody",
          voiceId: "voice:melody",
        },
      ],
    },
    constraints: [],
    provenance: {
      createdAt: new Date().toISOString(),
      createdBy: "test",
      modifiedAt: new Date().toISOString(),
      derivationChain: [],
    },
  };

  return { ...base, ...overrides };
}

// =============================================================================
// STABILITY TESTS
// =============================================================================

describe("Realized Ensemble Stability", () => {
  describe("ID Stability", () => {
    it("should preserve member IDs across regenerations (same seed)", () => {
      const song = createTestSong();
      const seed = 12345;

      // Realize twice with same seed
      const output1 = realizeSong(song, seed);
      const output2 = realizeSong(song, seed);

      // Extract member IDs
      const ids1 = output1.realizedEnsemble.members.map((m) => m.id);
      const ids2 = output2.realizedEnsemble.members.map((m) => m.id);

      // IDs should be identical
      expect(ids1).toEqual(ids2);
      expect(ids1.length).toBeGreaterThan(0);
    });

    it("should give different IDs for different seeds", () => {
      const song = createTestSong();

      const output1 = realizeSong(song, 11111);
      const output2 = realizeSong(song, 22222);

      // Extract member IDs
      const ids1 = output1.realizedEnsemble.members.map((m) => m.id);
      const ids2 = output2.realizedEnsemble.members.map((m) => m.id);

      // IDs should be different
      expect(ids1).not.toEqual(ids2);
    });

    it("should give different ensemble IDs for different songs", () => {
      const song1 = createTestSong({ songId: "song-1" });
      const song2 = createTestSong({ songId: "song-2" });
      const seed = 12345;

      const output1 = realizeSong(song1, seed);
      const output2 = realizeSong(song2, seed);

      // Ensemble IDs should be different (based on songId + seed)
      expect(output1.realizedEnsemble.ensembleId).not.toBe(
        output2.realizedEnsemble.ensembleId,
      );
    });

    it("should preserve member IDs for same musical identity across songs", () => {
      const song1 = createTestSong({ songId: "song-1" });
      const song2 = createTestSong({ songId: "song-2" });
      const seed = 12345;

      const output1 = realizeSong(song1, seed);
      const output2 = realizeSong(song2, seed);

      // Member IDs should be the SAME for same musical identity
      // (same role, function, orchestration) even across different songs
      // This is correct - IDs identify musical identity, not songs
      const ids1 = output1.realizedEnsemble.members.map((m) => m.id);
      const ids2 = output2.realizedEnsemble.members.map((m) => m.id);
      expect(ids1).toEqual(ids2);
    });

    it("should generate valid member ID format", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      output.realizedEnsemble.members.forEach((member) => {
        // Should match pattern: member_[a-f0-9]{8}
        expect(member.id).toMatch(/^member_[a-f0-9]{8}$/);
      });
    });

    it("should generate valid ensemble ID format", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      // Should match pattern: ensemble_[a-f0-9]{8}
      expect(output.realizedEnsemble.ensembleId).toMatch(
        /^ensemble_[a-f0-9]{8}$/,
      );
    });
  });

  describe("Completeness", () => {
    it("should populate all required member fields", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      expect(output.realizedEnsemble.members.length).toBeGreaterThan(0);

      output.realizedEnsemble.members.forEach((member) => {
        // Required fields
        expect(member.id).toBeDefined();
        expect(member.function).toBeDefined();
        expect(member.voiceSpec).toBeDefined();
        expect(member.orchestration).toBeDefined();
        expect(member.source).toBeDefined();

        // Voice spec fields
        expect(member.voiceSpec.pitchRange).toBeDefined();
        expect(member.voiceSpec.density).toBeDefined();
        expect(member.voiceSpec.articulation).toBeDefined();
        expect(member.voiceSpec.polyphony).toBeDefined();

        // Orchestration fields
        expect(member.orchestration.register).toBeDefined();
        expect(member.orchestration.doubling).toBeDefined();
      });
    });

    it("should have valid pitch ranges", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      output.realizedEnsemble.members.forEach((member) => {
        const { min, max } = member.voiceSpec.pitchRange;

        // Should be valid MIDI note range
        expect(min).toBeGreaterThanOrEqual(0);
        expect(max).toBeLessThanOrEqual(127);
        expect(min).toBeLessThanOrEqual(max);
      });
    });

    it("should have valid density values", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      output.realizedEnsemble.members.forEach((member) => {
        expect(["sparse", "medium", "dense"]).toContain(
          member.voiceSpec.density,
        );
      });
    });

    it("should have valid articulation values", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      output.realizedEnsemble.members.forEach((member) => {
        expect(["legato", "staccato", "mixed"]).toContain(
          member.voiceSpec.articulation,
        );
      });
    });

    it("should have valid register values", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      output.realizedEnsemble.members.forEach((member) => {
        expect(["low", "mid", "high"]).toContain(member.orchestration.register);
      });
    });

    it("should have valid musical function values", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      output.realizedEnsemble.members.forEach((member) => {
        const validFunctions = [
          "pulse",
          "foundation",
          "motion",
          "ornament",
          "texture",
          "accent",
          "noise",
          "voice",
        ];
        expect(validFunctions).toContain(member.function);
      });
    });
  });

  describe("Source Traceability", () => {
    it("should trace rhythm system sources", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      // All members should have rhythm sources
      output.realizedEnsemble.members.forEach((member) => {
        expect(member.source.rhythmSystemIds).toBeDefined();
        expect(Array.isArray(member.source.rhythmSystemIds)).toBe(true);
      });

      // At least some members should have rhythm systems
      const membersWithRhythm = output.realizedEnsemble.members.filter(
        (m) => m.source.rhythmSystemIds.length > 0,
      );
      expect(membersWithRhythm.length).toBeGreaterThan(0);
    });

    it("should trace melody system sources when present", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      // Should have melody source array (even if empty)
      output.realizedEnsemble.members.forEach((member) => {
        expect(member.source.melodySystemIds).toBeDefined();
        expect(Array.isArray(member.source.melodySystemIds)).toBe(true);
      });
    });

    it("should trace harmony system sources when present", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      // Should have harmony source array (even if empty)
      output.realizedEnsemble.members.forEach((member) => {
        expect(member.source.harmonySystemIds).toBeDefined();
        expect(Array.isArray(member.source.harmonySystemIds)).toBe(true);
      });
    });

    it("should trace form section sources when present", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      // Should have form source array (even if empty)
      output.realizedEnsemble.members.forEach((member) => {
        expect(member.source.formSectionIds).toBeDefined();
        expect(Array.isArray(member.source.formSectionIds)).toBe(true);
      });
    });
  });

  describe("Mapping to Roles", () => {
    it("should create members for all bound roles", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      // Should have at least 2 members (bass + melody)
      expect(output.realizedEnsemble.members.length).toBeGreaterThanOrEqual(2);
    });

    it("should infer correct musical functions from roles", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      // Find bass and melody members
      const bassMember = output.realizedEnsemble.members.find(
        (m) => m.function === "foundation",
      );
      const melodyMember = output.realizedEnsemble.members.find(
        (m) => m.function === "motion",
      );

      // Should have found both
      expect(bassMember).toBeDefined();
      expect(melodyMember).toBeDefined();
    });

    it("should assign correct pitch ranges from register system", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      output.realizedEnsemble.members.forEach((member) => {
        const { min, max } = member.voiceSpec.pitchRange;

        // Pitch range should be within reasonable bounds
        expect(min).toBeGreaterThanOrEqual(36); // C2
        expect(max).toBeLessThanOrEqual(84); // C6
      });
    });
  });

  describe("Orchestration", () => {
    it("should assign register based on pitch range", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      output.realizedEnsemble.members.forEach((member) => {
        const { min, max } = member.voiceSpec.pitchRange;
        const center = (min + max) / 2;
        const { register } = member.orchestration;

        // Register should match pitch range
        if (center < 48) {
          expect(register).toBe("low");
        } else if (center < 84) {
          expect(register).toBe("mid");
        } else {
          expect(register).toBe("high");
        }
      });
    });

    it("should set doubling to 1 (no doubling implemented)", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      output.realizedEnsemble.members.forEach((member) => {
        expect(member.orchestration.doubling).toBe(1);
      });
    });

    it("should infer density from rhythm authority", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      // All members should have one of the valid density values
      output.realizedEnsemble.members.forEach((member) => {
        expect(["sparse", "medium", "dense"]).toContain(
          member.voiceSpec.density,
        );
      });
    });
  });

  describe("Realization Output Structure", () => {
    it("should return complete realization output", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      // Should have all three components
      expect(output.songModel).toBeDefined();
      expect(output.realizedEnsemble).toBeDefined();
      expect(output.derivation).toBeDefined();
    });

    it("should have valid song model", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      expect(output.songModel.schemaVersion).toBe("1.0");
      expect(output.songModel.songId).toBeDefined();
      expect(output.songModel.notes).toBeDefined();
      expect(output.songModel.sections).toBeDefined();
    });

    it("should have valid derivation record", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      expect(output.derivation.schemaVersion).toBe("1.0");
      expect(output.derivation.derivationId).toBeDefined();
      expect(output.derivation.sourceSongId).toBe(song.songId);
      expect(output.derivation.seed).toBe(12345);
    });

    it("should have valid realized ensemble", () => {
      const song = createTestSong();
      const output = realizeSong(song, 12345);

      expect(output.realizedEnsemble.version).toBe("1.0");
      expect(output.realizedEnsemble.ensembleId).toBeDefined();
      expect(output.realizedEnsemble.members).toBeDefined();
      expect(output.realizedEnsemble.members.length).toBeGreaterThan(0);
    });
  });

  describe("Determinism", () => {
    it("should produce identical output on multiple runs", () => {
      const song = createTestSong();
      const seed = 54321;

      // Run multiple times
      const outputs = Array.from({ length: 5 }, () => realizeSong(song, seed));

      // All ensemble IDs should match
      const ensembleIds = outputs.map((o) => o.realizedEnsemble.ensembleId);
      ensembleIds.forEach((id) => {
        expect(id).toBe(ensembleIds[0]);
      });

      // All member IDs should match
      outputs.forEach((output) => {
        const memberIds = output.realizedEnsemble.members.map((m) => m.id);
        expect(memberIds).toEqual(
          outputs[0].realizedEnsemble.members.map((m) => m.id),
        );
      });
    });

    it("should preserve all member properties across regenerations", () => {
      const song = createTestSong();
      const seed = 99999;

      const output1 = realizeSong(song, seed);
      const output2 = realizeSong(song, seed);

      const members1 = output1.realizedEnsemble.members;
      const members2 = output2.realizedEnsemble.members;

      expect(members1.length).toBe(members2.length);

      members1.forEach((member1, index) => {
        const member2 = members2[index];

        // All properties should match
        expect(member1.id).toBe(member2.id);
        expect(member1.function).toBe(member2.function);
        expect(member1.voiceSpec).toEqual(member2.voiceSpec);
        expect(member1.orchestration).toEqual(member2.orchestration);
        expect(member1.source).toEqual(member2.source);
      });
    });
  });
});

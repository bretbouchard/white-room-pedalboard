/**
 * Schillinger SDK 2.1 - Ensemble Model Tests
 *
 * Tests for EnsembleModel_v1 implementation including:
 * - Voice creation and validation
 * - Role pool assignment
 * - Balance rule enforcement
 * - Performance with 100 voices
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  Ensemble,
  EnsembleBuilder,
  createMinimalEnsemble,
  createTrioEnsemble,
  createFullEnsemble,
  validateEnsembleModel,
} from "../src/theory/ensemble";
import type { EnsembleModel, Voice, RoleType, FunctionalClass } from "@white-room/schemas";

// =============================================================================
// ENSEMBLE CREATION
// =============================================================================

describe("Ensemble", () => {
  describe("Creation", () => {
    it("should create ensemble with single voice", () => {
      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 1,
      });

      const model = ensemble.getModel();

      expect(model.voices).toHaveLength(1);
      expect(model.voiceCount).toBe(1);
      expect(model.voices[0].name).toBe("Voice 1");
    });

    it("should create ensemble with multiple voices", () => {
      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
          {
            id: "voice-2",
            name: "Voice 2",
            rolePools: [{ role: "secondary", functionalClass: "motion", enabled: true }],
            groupIds: [],
          },
          {
            id: "voice-3",
            name: "Voice 3",
            rolePools: [{ role: "tertiary", functionalClass: "ornament", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 3,
      });

      const model = ensemble.getModel();

      expect(model.voices).toHaveLength(3);
      expect(model.voiceCount).toBe(3);
    });

    it("should throw error for voice count > 100", () => {
      const voices = Array.from({ length: 101 }, (_, i) => ({
        id: `voice-${i}`,
        name: `Voice ${i + 1}`,
        rolePools: [
          { role: "primary" as const, functionalClass: "foundation" as const, enabled: true },
        ],
        groupIds: [],
      }));

      expect(() => {
        new Ensemble({
          version: "1.0",
          id: "ensemble-123",
          voices,
          voiceCount: 101,
        });
      }).toThrow();
    });

    it("should throw error for voice count < 1", () => {
      expect(() => {
        new Ensemble({
          version: "1.0",
          id: "ensemble-123",
          voices: [],
          voiceCount: 0,
        });
      }).toThrow();
    });

    it("should throw error for invalid version", () => {
      expect(() => {
        new Ensemble({
          version: "0.9" as const,
          id: "ensemble-123",
          voices: [
            {
              id: "voice-1",
              name: "Voice 1",
              rolePools: [
                { role: "primary" as const, functionalClass: "foundation" as const, enabled: true },
              ],
              groupIds: [],
            },
          ],
          voiceCount: 1,
        });
      }).toThrow("Invalid ensemble version");
    });
  });

  // =============================================================================
  // VOICE OPERATIONS
  // =============================================================================

  describe("Voice Operations", () => {
    let ensemble: Ensemble;

    beforeEach(() => {
      ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
          {
            id: "voice-2",
            name: "Voice 2",
            rolePools: [{ role: "secondary", functionalClass: "motion", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 2,
      });
    });

    it("should get voice by ID", () => {
      const voice = ensemble.getVoice("voice-1");
      expect(voice).toBeDefined();
      expect(voice?.name).toBe("Voice 1");
    });

    it("should return undefined for non-existent voice", () => {
      const voice = ensemble.getVoice("voice-999");
      expect(voice).toBeUndefined();
    });

    it("should add voice to ensemble", () => {
      const initialCount = ensemble.getVoices().length;

      ensemble.addVoice({
        id: "voice-3",
        name: "Voice 3",
        rolePools: [{ role: "tertiary", functionalClass: "ornament", enabled: true }],
        groupIds: [],
      });

      const voices = ensemble.getVoices();
      expect(voices).toHaveLength(initialCount + 1);
      expect(voices.find((v) => v.id === "voice-3")).toBeDefined();
    });

    it("should throw error when adding duplicate voice ID", () => {
      expect(() => {
        ensemble.addVoice({
          id: "voice-1",
          name: "Voice 1 Duplicate",
          rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
          groupIds: [],
        });
      }).toThrow("already exists");
    });

    it("should throw error when adding voice beyond 100 limit", () => {
      // Create ensemble with 100 voices
      const voices = Array.from({ length: 100 }, (_, i) => ({
        id: `voice-${i}`,
        name: `Voice ${i + 1}`,
        rolePools: [
          { role: "primary" as const, functionalClass: "foundation" as const, enabled: true },
        ],
        groupIds: [],
      }));

      const fullEnsemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices,
        voiceCount: 100,
      });

      expect(() => {
        fullEnsemble.addVoice({
          id: "voice-101",
          name: "Voice 101",
          rolePools: [
            { role: "primary" as const, functionalClass: "foundation" as const, enabled: true },
          ],
          groupIds: [],
        });
      }).toThrow("maximum 100 voices");
    });

    it("should remove voice from ensemble", () => {
      const initialCount = ensemble.getVoices().length;

      ensemble.removeVoice("voice-2");

      const voices = ensemble.getVoices();
      expect(voices).toHaveLength(initialCount - 1);
      expect(voices.find((v) => v.id === "voice-2")).toBeUndefined();
    });

    it("should throw error when removing non-existent voice", () => {
      expect(() => {
        ensemble.removeVoice("voice-999");
      }).toThrow("not found");
    });

    it("should throw error when removing last voice", () => {
      const singleVoiceEnsemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 1,
      });

      expect(() => {
        singleVoiceEnsemble.removeVoice("voice-1");
      }).toThrow("Cannot remove last voice");
    });
  });

  // =============================================================================
  // ROLE POOLS
  // =============================================================================

  describe("Role Pools", () => {
    it("should filter voices by role", () => {
      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Primary Voice",
            rolePools: [
              { role: "primary", functionalClass: "foundation", enabled: true },
              { role: "secondary", functionalClass: "motion", enabled: false },
            ],
            groupIds: [],
          },
          {
            id: "voice-2",
            name: "Secondary Voice",
            rolePools: [{ role: "secondary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
          {
            id: "voice-3",
            name: "Tertiary Voice",
            rolePools: [{ role: "tertiary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 3,
      });

      const primaryVoices = ensemble.getVoicesByRole("primary");
      const secondaryVoices = ensemble.getVoicesByRole("secondary");
      const tertiaryVoices = ensemble.getVoicesByRole("tertiary");

      expect(primaryVoices).toHaveLength(1);
      expect(primaryVoices[0].name).toBe("Primary Voice");

      expect(secondaryVoices).toHaveLength(1); // Only enabled role pool
      expect(secondaryVoices[0].name).toBe("Secondary Voice");

      expect(tertiaryVoices).toHaveLength(1);
      expect(tertiaryVoices[0].name).toBe("Tertiary Voice");
    });

    it("should filter voices by functional class", () => {
      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Foundation Voice",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
          {
            id: "voice-2",
            name: "Motion Voice",
            rolePools: [{ role: "secondary", functionalClass: "motion", enabled: true }],
            groupIds: [],
          },
          {
            id: "voice-3",
            name: "Ornament Voice",
            rolePools: [{ role: "tertiary", functionalClass: "ornament", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 3,
      });

      const foundationVoices = ensemble.getVoicesByFunctionalClass("foundation");
      const motionVoices = ensemble.getVoicesByFunctionalClass("motion");
      const ornamentVoices = ensemble.getVoicesByFunctionalClass("ornament");

      expect(foundationVoices).toHaveLength(1);
      expect(foundationVoices[0].name).toBe("Foundation Voice");

      expect(motionVoices).toHaveLength(1);
      expect(motionVoices[0].name).toBe("Motion Voice");

      expect(ornamentVoices).toHaveLength(1);
      expect(ornamentVoices[0].name).toBe("Ornament Voice");
    });

    it("should filter voices by both role and functional class", () => {
      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Primary Foundation",
            rolePools: [
              { role: "primary", functionalClass: "foundation", enabled: true },
              { role: "primary", functionalClass: "motion", enabled: true },
            ],
            groupIds: [],
          },
          {
            id: "voice-2",
            name: "Secondary Foundation",
            rolePools: [
              { role: "secondary", functionalClass: "foundation", enabled: true },
              { role: "primary", functionalClass: "foundation", enabled: false },
            ],
            groupIds: [],
          },
        ],
        voiceCount: 2,
      });

      const primaryFoundation = ensemble.getVoicesByRoleAndClass("primary", "foundation");
      const primaryMotion = ensemble.getVoicesByRoleAndClass("primary", "motion");

      expect(primaryFoundation).toHaveLength(1); // Only enabled role pool
      expect(primaryFoundation[0].name).toBe("Primary Foundation");

      expect(primaryMotion).toHaveLength(1);
      expect(primaryMotion[0].name).toBe("Primary Foundation");
    });

    it("should respect enabled flag in role pools", () => {
      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [
              { role: "primary", functionalClass: "foundation", enabled: true },
              { role: "primary", functionalClass: "motion", enabled: false }, // Disabled
            ],
            groupIds: [],
          },
        ],
        voiceCount: 1,
      });

      const motionVoices = ensemble.getVoicesByFunctionalClass("motion");
      expect(motionVoices).toHaveLength(0); // Disabled role pool should not match
    });
  });

  // =============================================================================
  // VOICE GROUPS
  // =============================================================================

  describe("Voice Groups", () => {
    let ensemble: Ensemble;

    beforeEach(() => {
      ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
          {
            id: "voice-2",
            name: "Voice 2",
            rolePools: [{ role: "secondary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
          {
            id: "voice-3",
            name: "Voice 3",
            rolePools: [{ role: "tertiary", functionalClass: "ornament", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 3,
      });
    });

    it("should add voice group", () => {
      ensemble.addGroup({
        id: "group-1",
        name: "Leads",
        voiceIds: ["voice-1", "voice-2"],
      });

      const group = ensemble.getGroup("group-1");
      expect(group).toBeDefined();
      expect(group?.name).toBe("Leads");
      expect(group?.voiceIds).toHaveLength(2);
    });

    it("should throw error for group with undefined voice", () => {
      expect(() => {
        ensemble.addGroup({
          id: "group-1",
          name: "Group 1",
          voiceIds: ["voice-1", "voice-999"], // voice-999 doesn't exist
        });
      }).toThrow("references undefined voice");
    });

    it("should remove voice group", () => {
      ensemble.addGroup({
        id: "group-1",
        name: "Group 1",
        voiceIds: ["voice-1"],
      });

      ensemble.removeGroup("group-1");

      const group = ensemble.getGroup("group-1");
      expect(group).toBeUndefined();
    });

    it("should throw error when removing non-existent group", () => {
      expect(() => {
        ensemble.removeGroup("group-999");
      }).toThrow("not found");
    });
  });

  // =============================================================================
  // BALANCE RULES
  // =============================================================================

  describe("Balance Rules", () => {
    it("should set balance rules", () => {
      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 1,
      });

      const rules = {
        priority: [0],
        limits: { maxVoices: 10, maxPolyphony: 20 },
      };

      ensemble.setBalanceRules(rules);

      const retrievedRules = ensemble.getBalanceRules();
      expect(retrievedRules).toEqual(rules);
    });

    it("should throw error for invalid maxVoices", () => {
      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 1,
      });

      expect(() => {
        ensemble.setBalanceRules({
          limits: { maxVoices: 101, maxPolyphony: 10 },
        });
      }).toThrow("maxVoices must be between 1 and 100");
    });

    it("should throw error for invalid maxPolyphony", () => {
      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 1,
      });

      expect(() => {
        ensemble.setBalanceRules({
          limits: { maxVoices: 10, maxPolyphony: 201 },
        });
      }).toThrow("maxPolyphony must be between 1 and 200");
    });
  });

  // =============================================================================
  // ENSEMBLE BUILDER
  // =============================================================================

  describe("EnsembleBuilder", () => {
    it("should create ensemble using builder", () => {
      const ensemble = new EnsembleBuilder()
        .addVoice({
          name: "Voice 1",
          rolePools: [
            { role: "primary", functionalClass: "foundation" },
            { role: "secondary", functionalClass: "motion" },
          ],
        })
        .addVoice({
          name: "Voice 2",
          rolePools: [{ role: "tertiary", functionalClass: "ornament" }],
        })
        .setBalanceRules({
          limits: { maxVoices: 2, maxPolyphony: 8 },
        })
        .build();

      const model = ensemble.getModel();

      expect(model.voices).toHaveLength(2);
      expect(model.voices[0].rolePools).toHaveLength(2);
      expect(model.balance?.limits?.maxVoices).toBe(2);
    });

    it("should throw error when building ensemble with no voices", () => {
      const builder = new EnsembleBuilder();

      expect(() => {
        builder.build();
      }).toThrow("Ensemble must have at least one voice");
    });
  });

  // =============================================================================
  // PRESET ENSEMBLES
  // =============================================================================

  describe("Preset Ensembles", () => {
    it("should create minimal ensemble", () => {
      const ensemble = createMinimalEnsemble();
      const model = ensemble.getModel();

      expect(model.voices).toHaveLength(1);
      expect(model.voiceCount).toBe(1);
      expect(model.voices[0].rolePools[0].role).toBe("primary");
      expect(model.voices[0].rolePools[0].functionalClass).toBe("foundation");
    });

    it("should create trio ensemble", () => {
      const ensemble = createTrioEnsemble();
      const model = ensemble.getModel();

      expect(model.voices).toHaveLength(3);
      expect(model.voiceCount).toBe(3);
      expect(model.balance?.limits?.maxVoices).toBe(3);
      expect(model.balance?.limits?.maxPolyphony).toBe(12);
    });

    it("should create full ensemble", () => {
      const ensemble = createFullEnsemble();
      const model = ensemble.getModel();

      expect(model.voices).toHaveLength(8);
      expect(model.voiceCount).toBe(8);
      expect(model.groups).toHaveLength(2);
      expect(model.balance?.priority).toHaveLength(8);
      expect(model.balance?.limits?.maxVoices).toBe(8);
      expect(model.balance?.limits?.maxPolyphony).toBe(32);
    });
  });

  // =============================================================================
  // VALIDATION
  // =============================================================================

  describe("Validation", () => {
    it("should validate correct ensemble model", () => {
      const model: EnsembleModel = {
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 1,
      };

      const result = validateEnsembleModel(model);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid version", () => {
      const model = {
        version: "0.9" as const,
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 1,
      };

      const result = validateEnsembleModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid version: 0.9");
    });

    it("should detect voice count mismatch", () => {
      const model: EnsembleModel = {
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
          {
            id: "voice-2",
            name: "Voice 2",
            rolePools: [{ role: "secondary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 3, // Mismatch: 2 voices, count of 3
      };

      const result = validateEnsembleModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Voice count mismatch"))).toBe(true);
    });

    it("should detect voice count out of range", () => {
      const model: EnsembleModel = {
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 101, // Too many
      };

      const result = validateEnsembleModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Voice count out of range"))).toBe(true);
    });

    it("should detect duplicate voice IDs", () => {
      const model: EnsembleModel = {
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [{ role: "primary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
          {
            id: "voice-1", // Duplicate
            name: "Voice 1 Duplicate",
            rolePools: [{ role: "secondary", functionalClass: "foundation", enabled: true }],
            groupIds: [],
          },
        ],
        voiceCount: 2,
      };

      const result = validateEnsembleModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate voice ID"))).toBe(true);
    });

    it("should detect invalid role", () => {
      const model: EnsembleModel = {
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [
              { role: "invalid" as RoleType, functionalClass: "foundation", enabled: true },
            ], // Invalid role
            groupIds: [],
          },
        ],
        voiceCount: 1,
      };

      const result = validateEnsembleModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid role"))).toBe(true);
    });

    it("should detect invalid functional class", () => {
      const model: EnsembleModel = {
        version: "1.0",
        id: "ensemble-123",
        voices: [
          {
            id: "voice-1",
            name: "Voice 1",
            rolePools: [
              { role: "primary", functionalClass: "invalid" as FunctionalClass, enabled: true },
            ], // Invalid class
            groupIds: [],
          },
        ],
        voiceCount: 1,
      };

      const result = validateEnsembleModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid functional class"))).toBe(true);
    });
  });

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  describe("Performance", () => {
    it("should handle 100 voices efficiently", () => {
      const startTime = Date.now();

      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: Array.from({ length: 100 }, (_, i) => ({
          id: `voice-${i}`,
          name: `Voice ${i + 1}`,
          rolePools: [
            { role: "primary", functionalClass: "foundation", enabled: i === 0 },
            { role: "secondary", functionalClass: "motion", enabled: i < 50 },
            { role: "tertiary", functionalClass: "ornament", enabled: i < 33 },
          ],
          groupIds: [],
        })),
        voiceCount: 100,
      });

      const createTime = Date.now() - startTime;
      expect(createTime).toBeLessThan(100); // Should create in < 100ms

      // Test query performance
      const queryStart = Date.now();
      const primaryVoices = ensemble.getVoicesByRole("primary");
      const queryTime = Date.now() - queryStart;

      expect(queryTime).toBeLessThan(10); // Queries should be < 10ms
      expect(primaryVoices.length).toBeGreaterThan(0);
    });

    it("should get voices by role efficiently with 100 voices", () => {
      const ensemble = new Ensemble({
        version: "1.0",
        id: "ensemble-123",
        voices: Array.from({ length: 100 }, (_, i) => ({
          id: `voice-${i}`,
          name: `Voice ${i + 1}`,
          rolePools: [
            {
              role: i % 3 === 0 ? "primary" : i % 3 === 1 ? "secondary" : "tertiary",
              functionalClass: "foundation",
              enabled: true,
            },
          ],
          groupIds: [],
        })),
        voiceCount: 100,
      });

      const startTime = Date.now();
      const primaryVoices = ensemble.getVoicesByRole("primary");
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(10); // Should be fast
      expect(primaryVoices.length).toBe(34); // ~1/3 of 100
    });
  });
});

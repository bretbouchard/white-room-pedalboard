/**
 * Binding Model Tests
 *
 * Tests for role-to-system binding functionality
 */

import { describe, it, expect } from "vitest";
import {
  BindingModelImpl,
  createBindingModel,
  validateBindingModel,
} from "../src/theory/bindings/BindingModel";
import {
  validateBindings,
  validateBindingStructure,
  type ValidationResult,
} from "../src/theory/bindings/validator";
import type {
  BindingModel,
  RoleRhythmBinding,
  RoleMelodyBinding,
  RoleHarmonyBinding,
  RoleEnsembleBinding,
  OrchestrationSystem,
  RhythmSystem,
  MelodySystem,
  HarmonySystem,
  EnsembleModel,
} from "../src/types";

describe("BindingModelImpl", () => {
  describe("creation", () => {
    it("should create binding model with defaults", () => {
      const model = createBindingModel();

      expect(model.modelType).toBe("bindings");
      expect(model.rhythmBindings).toHaveLength(0);
      expect(model.melodyBindings).toHaveLength(0);
      expect(model.harmonyBindings).toHaveLength(0);
      expect(model.ensembleBindings).toHaveLength(0);
    });

    it("should create custom binding model", () => {
      const data: BindingModel = {
        modelId: "bindings-custom",
        modelType: "bindings",
        rhythmBindings: [
          {
            bindingId: "rhythm-1",
            roleId: "role-melody",
            rhythmSystemId: "rhythm-1",
            voiceId: "voice-1",
            priority: 5,
          },
        ],
        melodyBindings: [],
        harmonyBindings: [],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);

      expect(model.modelId).toBe("bindings-custom");
      expect(model.rhythmBindings).toHaveLength(1);
      expect(model.rhythmBindings[0].priority).toBe(5);
    });
  });

  describe("rhythm bindings", () => {
    it("should get rhythm bindings for role", () => {
      const data: BindingModel = {
        modelId: "test-rhythm",
        modelType: "bindings",
        rhythmBindings: [
          {
            bindingId: "r-1",
            roleId: "role-1",
            rhythmSystemId: "rhythm-a",
            voiceId: "voice-1",
            priority: 5,
          },
          {
            bindingId: "r-2",
            roleId: "role-1",
            rhythmSystemId: "rhythm-b",
            voiceId: "voice-2",
            priority: 7,
          },
          {
            bindingId: "r-3",
            roleId: "role-2",
            rhythmSystemId: "rhythm-a",
            voiceId: "voice-3",
            priority: 3,
          },
        ],
        melodyBindings: [],
        harmonyBindings: [],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);
      const role1Bindings = model.getRhythmBindings("role-1");

      expect(role1Bindings).toHaveLength(2);
      expect(role1Bindings.every((b) => b.roleId === "role-1")).toBe(true);
    });

    it("should return empty array for role with no rhythm bindings", () => {
      const data: BindingModel = {
        modelId: "test-no-rhythm",
        modelType: "bindings",
        rhythmBindings: [],
        melodyBindings: [],
        harmonyBindings: [],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);
      const bindings = model.getRhythmBindings("non-existent");

      expect(bindings).toHaveLength(0);
    });

    it("should get highest priority rhythm binding", () => {
      const data: BindingModel = {
        modelId: "test-priority",
        modelType: "bindings",
        rhythmBindings: [
          {
            bindingId: "r-1",
            roleId: "role-1",
            rhythmSystemId: "rhythm-a",
            voiceId: "voice-1",
            priority: 3,
          },
          {
            bindingId: "r-2",
            roleId: "role-1",
            rhythmSystemId: "rhythm-b",
            voiceId: "voice-2",
            priority: 8,
          },
          {
            bindingId: "r-3",
            roleId: "role-1",
            rhythmSystemId: "rhythm-c",
            voiceId: "voice-3",
            priority: 5,
          },
        ],
        melodyBindings: [],
        harmonyBindings: [],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);
      const highest = model.getHighestPriorityRhythmBinding("role-1");

      expect(highest?.priority).toBe(8);
      expect(highest?.rhythmSystemId).toBe("rhythm-b");
    });

    it("should sort rhythm bindings by priority", () => {
      const data: BindingModel = {
        modelId: "test-sort",
        modelType: "bindings",
        rhythmBindings: [
          {
            bindingId: "r-1",
            roleId: "role-1",
            rhythmSystemId: "rhythm-a",
            voiceId: "voice-1",
            priority: 5,
          },
          {
            bindingId: "r-2",
            roleId: "role-1",
            rhythmSystemId: "rhythm-b",
            voiceId: "voice-2",
            priority: 10,
          },
          {
            bindingId: "r-3",
            roleId: "role-1",
            rhythmSystemId: "rhythm-c",
            voiceId: "voice-3",
            priority: 1,
          },
        ],
        melodyBindings: [],
        harmonyBindings: [],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);
      const sorted = model.sortRhythmBindingsByPriority("role-1");

      expect(sorted).toHaveLength(3);
      expect(sorted[0].priority).toBe(10);
      expect(sorted[1].priority).toBe(5);
      expect(sorted[2].priority).toBe(1);
    });
  });

  describe("melody bindings", () => {
    it("should get melody bindings for role", () => {
      const data: BindingModel = {
        modelId: "test-melody",
        modelType: "bindings",
        rhythmBindings: [],
        melodyBindings: [
          {
            bindingId: "m-1",
            roleId: "role-melody",
            melodySystemId: "melody-1",
            voiceId: "voice-1",
            priority: 7,
          },
        ],
        harmonyBindings: [],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);
      const bindings = model.getMelodyBindings("role-melody");

      expect(bindings).toHaveLength(1);
      expect(bindings[0].melodySystemId).toBe("melody-1");
    });

    it("should get highest priority melody binding", () => {
      const data: BindingModel = {
        modelId: "test-melody-priority",
        modelType: "bindings",
        rhythmBindings: [],
        melodyBindings: [
          {
            bindingId: "m-1",
            roleId: "role-1",
            melodySystemId: "melody-a",
            voiceId: "voice-1",
            priority: 4,
          },
          {
            bindingId: "m-2",
            roleId: "role-1",
            melodySystemId: "melody-b",
            voiceId: "voice-2",
            priority: 9,
          },
        ],
        harmonyBindings: [],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);
      const highest = model.getHighestPriorityMelodyBinding("role-1");

      expect(highest?.priority).toBe(9);
    });
  });

  describe("harmony bindings", () => {
    it("should get harmony bindings for role", () => {
      const data: BindingModel = {
        modelId: "test-harmony",
        modelType: "bindings",
        rhythmBindings: [],
        melodyBindings: [],
        harmonyBindings: [
          {
            bindingId: "h-1",
            roleId: "role-bass",
            harmonySystemId: "harmony-1",
            voiceIds: ["voice-1", "voice-2", "voice-3"],
            priority: 6,
          },
        ],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);
      const bindings = model.getHarmonyBindings("role-bass");

      expect(bindings).toHaveLength(1);
      expect(bindings[0].voiceIds).toHaveLength(3);
    });

    it("should handle harmony binding with multiple voices", () => {
      const data: BindingModel = {
        modelId: "test-multi-voice",
        modelType: "bindings",
        rhythmBindings: [],
        melodyBindings: [],
        harmonyBindings: [
          {
            bindingId: "h-1",
            roleId: "role-1",
            harmonySystemId: "harmony-chordal",
            voiceIds: ["v1", "v2", "v3", "v4"],
            priority: 8,
          },
        ],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);
      const binding = model.getHarmonyBindings("role-1")[0];

      expect(binding.voiceIds).toEqual(["v1", "v2", "v3", "v4"]);
    });

    it("should get highest priority harmony binding", () => {
      const data: BindingModel = {
        modelId: "test-harmony-priority",
        modelType: "bindings",
        rhythmBindings: [],
        melodyBindings: [],
        harmonyBindings: [
          {
            bindingId: "h-1",
            roleId: "role-1",
            harmonySystemId: "harmony-a",
            voiceIds: ["v1"],
            priority: 5,
          },
          {
            bindingId: "h-2",
            roleId: "role-1",
            harmonySystemId: "harmony-b",
            voiceIds: ["v2"],
            priority: 10,
          },
        ],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);
      const highest = model.getHighestPriorityHarmonyBinding("role-1");

      expect(highest?.priority).toBe(10);
      expect(highest?.harmonySystemId).toBe("harmony-b");
    });
  });

  describe("ensemble bindings", () => {
    it("should get ensemble binding for role", () => {
      const data: BindingModel = {
        modelId: "test-ensemble",
        modelType: "bindings",
        rhythmBindings: [],
        melodyBindings: [],
        harmonyBindings: [],
        ensembleBindings: [
          {
            bindingId: "e-1",
            roleId: "role-bass",
            voiceId: "voice-1",
          },
        ],
      };

      const model = new BindingModelImpl(data);
      const binding = model.getEnsembleBinding("role-bass");

      expect(binding).toBeDefined();
      expect(binding?.voiceId).toBe("voice-1");
    });

    it("should return undefined for role without ensemble binding", () => {
      const data = createBindingModel();
      const model = new BindingModelImpl(data);
      const binding = model.getEnsembleBinding("non-existent");

      expect(binding).toBeUndefined();
    });
  });

  describe("all bindings for role", () => {
    it("should get all binding types for role", () => {
      const data: BindingModel = {
        modelId: "test-all",
        modelType: "bindings",
        rhythmBindings: [
          {
            bindingId: "r-1",
            roleId: "role-1",
            rhythmSystemId: "rhythm-1",
            voiceId: "voice-1",
            priority: 5,
          },
        ],
        melodyBindings: [
          {
            bindingId: "m-1",
            roleId: "role-1",
            melodySystemId: "melody-1",
            voiceId: "voice-1",
            priority: 6,
          },
        ],
        harmonyBindings: [
          {
            bindingId: "h-1",
            roleId: "role-1",
            harmonySystemId: "harmony-1",
            voiceIds: ["voice-1", "voice-2"],
            priority: 7,
          },
        ],
        ensembleBindings: [
          {
            bindingId: "e-1",
            roleId: "role-1",
            voiceId: "voice-1",
          },
        ],
      };

      const model = new BindingModelImpl(data);
      const all = model.getAllBindings("role-1");

      expect(all.rhythm).toHaveLength(1);
      expect(all.melody).toHaveLength(1);
      expect(all.harmony).toHaveLength(1);
      expect(all.ensemble).toBeDefined();
    });

    it("should return empty bindings for role with none", () => {
      const data = createBindingModel();
      const model = new BindingModelImpl(data);
      const all = model.getAllBindings("non-existent");

      expect(all.rhythm).toHaveLength(0);
      expect(all.melody).toHaveLength(0);
      expect(all.harmony).toHaveLength(0);
      expect(all.ensemble).toBeUndefined();
    });
  });

  describe("voice binding queries", () => {
    it("should get all bindings for a voice", () => {
      const data: BindingModel = {
        modelId: "test-voice-bindings",
        modelType: "bindings",
        rhythmBindings: [
          {
            bindingId: "r-1",
            roleId: "role-1",
            rhythmSystemId: "rhythm-1",
            voiceId: "voice-target",
            priority: 5,
          },
        ],
        melodyBindings: [
          {
            bindingId: "m-1",
            roleId: "role-2",
            melodySystemId: "melody-1",
            voiceId: "voice-target",
            priority: 6,
          },
        ],
        harmonyBindings: [
          {
            bindingId: "h-1",
            roleId: "role-3",
            harmonySystemId: "harmony-1",
            voiceIds: ["voice-other", "voice-target"],
            priority: 7,
          },
        ],
        ensembleBindings: [
          {
            bindingId: "e-1",
            roleId: "role-4",
            voiceId: "voice-target",
          },
        ],
      };

      const model = new BindingModelImpl(data);
      const bindings = model.getBindingsForVoice("voice-target");

      expect(bindings.rhythm).toHaveLength(1);
      expect(bindings.melody).toHaveLength(1);
      expect(bindings.harmony).toHaveLength(1);
      expect(bindings.ensemble).toBeDefined();
    });

    it("should check if voice has bindings", () => {
      const data: BindingModel = {
        modelId: "test-voice-has",
        modelType: "bindings",
        rhythmBindings: [
          {
            bindingId: "r-1",
            roleId: "role-1",
            rhythmSystemId: "rhythm-1",
            voiceId: "voice-bound",
            priority: 5,
          },
        ],
        melodyBindings: [],
        harmonyBindings: [],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);

      expect(model.voiceHasBindings("voice-bound")).toBe(true);
      expect(model.voiceHasBindings("voice-unbound")).toBe(false);
    });
  });

  describe("role queries", () => {
    it("should get all roles with rhythm bindings", () => {
      const data: BindingModel = {
        modelId: "test-roles-rhythm",
        modelType: "bindings",
        rhythmBindings: [
          { bindingId: "r-1", roleId: "role-1", rhythmSystemId: "r-1", voiceId: "v1", priority: 5 },
          { bindingId: "r-2", roleId: "role-2", rhythmSystemId: "r-2", voiceId: "v2", priority: 5 },
          { bindingId: "r-3", roleId: "role-1", rhythmSystemId: "r-3", voiceId: "v3", priority: 5 },
        ],
        melodyBindings: [],
        harmonyBindings: [],
        ensembleBindings: [],
      };

      const model = new BindingModelImpl(data);
      const roles = model.getRolesWithRhythmBindings();

      expect(roles).toEqual(expect.arrayContaining(["role-1", "role-2"]));
      expect(roles).toHaveLength(2);
    });

    it("should get all bound roles", () => {
      const data: BindingModel = {
        modelId: "test-all-roles",
        modelType: "bindings",
        rhythmBindings: [
          { bindingId: "r-1", roleId: "role-1", rhythmSystemId: "r-1", voiceId: "v1", priority: 5 },
        ],
        melodyBindings: [
          { bindingId: "m-1", roleId: "role-2", melodySystemId: "m-1", voiceId: "v2", priority: 5 },
        ],
        harmonyBindings: [
          {
            bindingId: "h-1",
            roleId: "role-3",
            harmonySystemId: "h-1",
            voiceIds: ["v3"],
            priority: 5,
          },
        ],
        ensembleBindings: [{ bindingId: "e-1", roleId: "role-1", voiceId: "v1" }],
      };

      const model = new BindingModelImpl(data);
      const allRoles = model.getAllBoundRoles();

      expect(allRoles).toEqual(expect.arrayContaining(["role-1", "role-2", "role-3"]));
      expect(allRoles).toHaveLength(3);
    });
  });

  describe("binding lookup", () => {
    it("should get binding by ID", () => {
      const data: BindingModel = {
        modelId: "test-lookup",
        modelType: "bindings",
        rhythmBindings: [
          {
            bindingId: "find-me-rhythm",
            roleId: "role-1",
            rhythmSystemId: "r-1",
            voiceId: "v1",
            priority: 5,
          },
        ],
        melodyBindings: [
          {
            bindingId: "find-me-melody",
            roleId: "role-2",
            melodySystemId: "m-1",
            voiceId: "v2",
            priority: 5,
          },
        ],
        harmonyBindings: [
          {
            bindingId: "find-me-harmony",
            roleId: "role-3",
            harmonySystemId: "h-1",
            voiceIds: ["v3"],
            priority: 5,
          },
        ],
        ensembleBindings: [
          {
            bindingId: "find-me-ensemble",
            roleId: "role-4",
            voiceId: "v4",
          },
        ],
      };

      const model = new BindingModelImpl(data);

      expect(model.getBindingById("find-me-rhythm")).toBeDefined();
      expect(model.getBindingById("find-me-melody")).toBeDefined();
      expect(model.getBindingById("find-me-harmony")).toBeDefined();
      expect(model.getBindingById("find-me-ensemble")).toBeDefined();
      expect(model.getBindingById("not-found")).toBeUndefined();
    });
  });

  describe("binding count", () => {
    it("should count total bindings", () => {
      const data: BindingModel = {
        modelId: "test-count",
        modelType: "bindings",
        rhythmBindings: [
          { bindingId: "r-1", roleId: "role-1", rhythmSystemId: "r-1", voiceId: "v1", priority: 5 },
          { bindingId: "r-2", roleId: "role-2", rhythmSystemId: "r-2", voiceId: "v2", priority: 5 },
        ],
        melodyBindings: [
          { bindingId: "m-1", roleId: "role-3", melodySystemId: "m-1", voiceId: "v3", priority: 5 },
        ],
        harmonyBindings: [
          {
            bindingId: "h-1",
            roleId: "role-4",
            harmonySystemId: "h-1",
            voiceIds: ["v4"],
            priority: 5,
          },
          {
            bindingId: "h-2",
            roleId: "role-5",
            harmonySystemId: "h-2",
            voiceIds: ["v5"],
            priority: 5,
          },
          {
            bindingId: "h-3",
            roleId: "role-6",
            harmonySystemId: "h-3",
            voiceIds: ["v6"],
            priority: 5,
          },
        ],
        ensembleBindings: [{ bindingId: "e-1", roleId: "role-7", voiceId: "v7" }],
      };

      const model = new BindingModelImpl(data);

      expect(model.getTotalBindingCount()).toBe(7); // 2 + 1 + 3 + 1
    });
  });
});

describe("validateBindingModel", () => {
  it("should validate correct model", () => {
    const data: BindingModel = {
      modelId: "valid-model",
      modelType: "bindings",
      rhythmBindings: [
        {
          bindingId: "r-1",
          roleId: "role-1",
          rhythmSystemId: "rhythm-1",
          voiceId: "voice-1",
          priority: 5,
        },
      ],
      melodyBindings: [],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const validation = validateBindingModel(data);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("should detect duplicate binding IDs", () => {
    const data: BindingModel = {
      modelId: "duplicate-model",
      modelType: "bindings",
      rhythmBindings: [
        {
          bindingId: "duplicate-id",
          roleId: "role-1",
          rhythmSystemId: "rhythm-1",
          voiceId: "voice-1",
          priority: 5,
        },
      ],
      melodyBindings: [
        {
          bindingId: "duplicate-id",
          roleId: "role-2",
          melodySystemId: "melody-1",
          voiceId: "voice-2",
          priority: 5,
        },
      ],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const validation = validateBindingModel(data);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Duplicate binding IDs found");
  });

  it("should reject invalid priority values", () => {
    const data: BindingModel = {
      modelId: "invalid-priority",
      modelType: "bindings",
      rhythmBindings: [
        {
          bindingId: "r-1",
          roleId: "role-1",
          rhythmSystemId: "rhythm-1",
          voiceId: "voice-1",
          priority: 0, // Too low
        },
      ],
      melodyBindings: [
        {
          bindingId: "m-1",
          roleId: "role-2",
          melodySystemId: "melody-1",
          voiceId: "voice-2",
          priority: 11, // Too high
        },
      ],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const validation = validateBindingModel(data);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it("should reject harmony binding with no voices", () => {
    const data: BindingModel = {
      modelId: "no-voices",
      modelType: "bindings",
      rhythmBindings: [],
      melodyBindings: [],
      harmonyBindings: [
        {
          bindingId: "h-1",
          roleId: "role-1",
          harmonySystemId: "harmony-1",
          voiceIds: [], // Empty
          priority: 5,
        },
      ],
      ensembleBindings: [],
    };

    const validation = validateBindingModel(data);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("at least one voice"))).toBe(true);
  });

  it("should reject ensemble binding with missing voice ID", () => {
    const data: BindingModel = {
      modelId: "missing-voice",
      modelType: "bindings",
      rhythmBindings: [],
      melodyBindings: [],
      harmonyBindings: [],
      ensembleBindings: [
        {
          bindingId: "e-1",
          roleId: "role-1",
          voiceId: "", // Empty
        },
      ],
    };

    const validation = validateBindingModel(data);

    expect(validation.valid).toBe(false);
  });
});

describe("validateBindingStructure", () => {
  it("should validate structure only", () => {
    const data: BindingModel = {
      modelId: "structure-test",
      modelType: "bindings",
      rhythmBindings: [
        {
          bindingId: "r-1",
          roleId: "role-1",
          rhythmSystemId: "rhythm-1",
          voiceId: "voice-1",
          priority: 5,
        },
      ],
      melodyBindings: [],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const result = validateBindingStructure(data);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should warn about empty binding collections", () => {
    const data: BindingModel = {
      modelId: "empty-bindings",
      modelType: "bindings",
      rhythmBindings: [],
      melodyBindings: [],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const result = validateBindingStructure(data);

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain("No rhythm bindings defined");
    expect(result.warnings).toContain("No melody bindings defined");
    expect(result.warnings).toContain("No harmony bindings defined");
    expect(result.warnings).toContain("No ensemble bindings defined");
  });
});

describe("validateBindings with context", () => {
  function createMockContext(): ValidationContext {
    return {
      orchestrationSystem: {
        systemId: "orch-1",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Role 1",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "role-2",
            roleName: "Role 2",
            priority: "secondary",
            functionalClass: "foundation",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "role-1", minPitch: 48, maxPitch: 84 },
            { roleId: "role-2", minPitch: 36, maxPitch: 60 },
          ],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [
            { roleId: "role-1", densityBudget: 0.7, couplingRules: [] },
            { roleId: "role-2", densityBudget: 0.5, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      },
      rhythmSystems: [
        {
          systemId: "rhythm-1",
          systemType: "rhythm",
          tempo: 120,
          meter: { numerator: 4, denominator: 4 },
          patterns: [],
        },
      ],
      melodySystems: [
        { systemId: "melody-1", systemType: "melody", scales: [], contours: [], intervals: [] },
      ],
      harmonySystems: [
        { systemId: "harmony-1", systemType: "harmony", scale: "major", root: 0, progressions: [] },
      ],
      ensembleModel: {
        ensembleId: "ensemble-1",
        voices: [
          { voiceId: "voice-1", voiceType: "synth", name: "Voice 1" },
          { voiceId: "voice-2", voiceType: "synth", name: "Voice 2" },
        ],
        busses: [],
      },
    };
  }

  it("should validate valid bindings with context", () => {
    const bindings: BindingModel = {
      modelId: "valid-context",
      modelType: "bindings",
      rhythmBindings: [
        {
          bindingId: "r-1",
          roleId: "role-1",
          rhythmSystemId: "rhythm-1",
          voiceId: "voice-1",
          priority: 5,
        },
      ],
      melodyBindings: [],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const context = createMockContext();
    const result = validateBindings(bindings, context);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect unknown role", () => {
    const bindings: BindingModel = {
      modelId: "unknown-role",
      modelType: "bindings",
      rhythmBindings: [
        {
          bindingId: "r-1",
          roleId: "role-unknown",
          rhythmSystemId: "rhythm-1",
          voiceId: "voice-1",
          priority: 5,
        },
      ],
      melodyBindings: [],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const context = createMockContext();
    const result = validateBindings(bindings, context);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unknown role"))).toBe(true);
  });

  it("should detect unknown rhythm system", () => {
    const bindings: BindingModel = {
      modelId: "unknown-rhythm",
      modelType: "bindings",
      rhythmBindings: [
        {
          bindingId: "r-1",
          roleId: "role-1",
          rhythmSystemId: "rhythm-unknown",
          voiceId: "voice-1",
          priority: 5,
        },
      ],
      melodyBindings: [],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const context = createMockContext();
    const result = validateBindings(bindings, context);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unknown rhythm system"))).toBe(true);
  });

  it("should detect unknown voice", () => {
    const bindings: BindingModel = {
      modelId: "unknown-voice",
      modelType: "bindings",
      rhythmBindings: [
        {
          bindingId: "r-1",
          roleId: "role-1",
          rhythmSystemId: "rhythm-1",
          voiceId: "voice-unknown",
          priority: 5,
        },
      ],
      melodyBindings: [],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const context = createMockContext();
    const result = validateBindings(bindings, context);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unknown voice"))).toBe(true);
  });

  it("should warn about roles without bindings", () => {
    const bindings: BindingModel = {
      modelId: "unbound-roles",
      modelType: "bindings",
      rhythmBindings: [],
      melodyBindings: [],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const context = createMockContext();
    const result = validateBindings(bindings, context);

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("has no bindings"))).toBe(true);
  });

  it("should validate all binding types with context", () => {
    const bindings: BindingModel = {
      modelId: "all-types",
      modelType: "bindings",
      rhythmBindings: [
        {
          bindingId: "r-1",
          roleId: "role-1",
          rhythmSystemId: "rhythm-1",
          voiceId: "voice-1",
          priority: 5,
        },
      ],
      melodyBindings: [
        {
          bindingId: "m-1",
          roleId: "role-1",
          melodySystemId: "melody-1",
          voiceId: "voice-1",
          priority: 6,
        },
      ],
      harmonyBindings: [
        {
          bindingId: "h-1",
          roleId: "role-2",
          harmonySystemId: "harmony-1",
          voiceIds: ["voice-1", "voice-2"],
          priority: 7,
        },
      ],
      ensembleBindings: [
        {
          bindingId: "e-1",
          roleId: "role-1",
          voiceId: "voice-1",
        },
      ],
    };

    const context = createMockContext();
    const result = validateBindings(bindings, context);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate priority range in context validation", () => {
    const bindings: BindingModel = {
      modelId: "invalid-priority-context",
      modelType: "bindings",
      rhythmBindings: [
        {
          bindingId: "r-1",
          roleId: "role-1",
          rhythmSystemId: "rhythm-1",
          voiceId: "voice-1",
          priority: 15, // Invalid
        },
      ],
      melodyBindings: [],
      harmonyBindings: [],
      ensembleBindings: [],
    };

    const context = createMockContext();
    const result = validateBindings(bindings, context);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid priority"))).toBe(true);
  });

  it("should validate harmony voices in context", () => {
    const bindings: BindingModel = {
      modelId: "harmony-voices",
      modelType: "bindings",
      rhythmBindings: [],
      melodyBindings: [],
      harmonyBindings: [
        {
          bindingId: "h-1",
          roleId: "role-2",
          harmonySystemId: "harmony-1",
          voiceIds: ["voice-1", "voice-unknown"], // One unknown
          priority: 7,
        },
      ],
      ensembleBindings: [],
    };

    const context = createMockContext();
    const result = validateBindings(bindings, context);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unknown voice"))).toBe(true);
  });
});

/**
 * OrchestrationSystem Tests
 *
 * Tests for Book V orchestration system implementation
 */

import { describe, it, expect } from "vitest";
import {
  OrchestrationSystemImpl,
  createOrchestrationSystem,
  validateOrchestration,
} from "../src/theory/systems/orchestration";
import type { OrchestrationSystem } from "../src/types";

describe("OrchestrationSystemImpl", () => {
  describe("creation", () => {
    it("should create orchestration system with defaults", () => {
      const system = createOrchestrationSystem();

      expect(system.systemType).toBe("orchestration");
      expect(system.roles).toHaveLength(3); // bass, melody, accompaniment
      expect(system.roles[0].roleName).toBe("Bass");
      expect(system.roles[1].roleName).toBe("Melody");
      expect(system.roles[2].roleName).toBe("Accompaniment");
    });

    it("should create custom orchestration system", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-custom",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Custom Role",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            {
              roleId: "role-1",
              minPitch: 48,
              maxPitch: 72,
            },
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
            {
              roleId: "role-1",
              densityBudget: 0.6,
              couplingRules: [],
            },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);

      expect(system.systemId).toBe("orch-custom");
      expect(system.roles).toHaveLength(1);
      expect(system.roles[0].roleName).toBe("Custom Role");
    });

    it("should create system with all roles", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-all-roles",
        systemType: "orchestration",
        roles: [
          {
            roleId: "primary-foundation",
            roleName: "Primary Foundation",
            priority: "primary",
            functionalClass: "foundation",
            yieldTo: [],
          },
          {
            roleId: "primary-motion",
            roleName: "Primary Motion",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "secondary-ornament",
            roleName: "Secondary Ornament",
            priority: "secondary",
            functionalClass: "ornament",
            yieldTo: ["primary-motion"],
          },
          {
            roleId: "tertiary-reinforcement",
            roleName: "Tertiary Reinforcement",
            priority: "tertiary",
            functionalClass: "reinforcement",
            yieldTo: ["primary-motion", "secondary-ornament"],
          },
        ],
        registerSystem: {
          systemId: "reg-all",
          roleRegisters: [
            { roleId: "primary-foundation", minPitch: 36, maxPitch: 60 },
            { roleId: "primary-motion", minPitch: 48, maxPitch: 84 },
            { roleId: "secondary-ornament", minPitch: 60, maxPitch: 96 },
            { roleId: "tertiary-reinforcement", minPitch: 36, maxPitch: 72 },
          ],
        },
        spacingSystem: {
          systemId: "space-all",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-all",
          roleDensity: [
            { roleId: "primary-foundation", densityBudget: 0.5, couplingRules: [] },
            { roleId: "primary-motion", densityBudget: 0.8, couplingRules: [] },
            { roleId: "secondary-ornament", densityBudget: 0.6, couplingRules: [] },
            { roleId: "tertiary-reinforcement", densityBudget: 0.4, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);

      expect(system.roles).toHaveLength(4);
      expect(system.getPrimaryRoles()).toHaveLength(2);
      expect(system.getRolesByClass("foundation")).toHaveLength(1);
      expect(system.getRolesByClass("motion")).toHaveLength(1);
      expect(system.getRolesByClass("ornament")).toHaveLength(1);
      expect(system.getRolesByClass("reinforcement")).toHaveLength(1);
    });
  });

  describe("validation", () => {
    it("should validate correct system", () => {
      const data = createOrchestrationSystem();
      const system = new OrchestrationSystemImpl(data);
      const validation = system.validate();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject system with no roles", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-no-roles",
        systemType: "orchestration",
        roles: [],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("OrchestrationSystem requires at least 1 role");
    });

    it("should reject duplicate role IDs", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-duplicate",
        systemType: "orchestration",
        roles: [
          {
            roleId: "duplicate-id",
            roleName: "Role 1",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "duplicate-id",
            roleName: "Role 2",
            priority: "secondary",
            functionalClass: "foundation",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "duplicate-id", minPitch: 48, maxPitch: 72 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "duplicate-id", densityBudget: 0.5, couplingRules: [] }],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Duplicate role IDs found");
    });

    it("should reject invalid density values", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-bad-density",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Bad Density",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 48, maxPitch: 72 }],
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
            { roleId: "role-1", densityBudget: 1.5, couplingRules: [] }, // Invalid
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("invalid density"))).toBe(true);
    });

    it("should reject missing register system", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-no-register",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "No Register",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [], // Empty
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.5, couplingRules: [] }],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const validation = system.validate();

      expect(validation.valid).toBe(false);
    });
  });

  describe("role hierarchy", () => {
    it("should get role by ID", () => {
      const data = createOrchestrationSystem();
      const system = new OrchestrationSystemImpl(data);
      const bassRole = system.getRole(`${system.systemId}-role-bass`);

      expect(bassRole).toBeDefined();
      expect(bassRole?.roleName).toBe("Bass");
      expect(bassRole?.priority).toBe("primary");
      expect(bassRole?.functionalClass).toBe("foundation");
    });

    it("should return undefined for non-existent role", () => {
      const data = createOrchestrationSystem();
      const system = new OrchestrationSystemImpl(data);
      const role = system.getRole("non-existent");

      expect(role).toBeUndefined();
    });

    it("should get primary roles", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-primary",
        systemType: "orchestration",
        roles: [
          {
            roleId: "primary-1",
            roleName: "Primary 1",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "secondary-1",
            roleName: "Secondary 1",
            priority: "secondary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "primary-2",
            roleName: "Primary 2",
            priority: "primary",
            functionalClass: "foundation",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "primary-1", minPitch: 48, maxPitch: 84 },
            { roleId: "secondary-1", minPitch: 48, maxPitch: 84 },
            { roleId: "primary-2", minPitch: 36, maxPitch: 60 },
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
            { roleId: "primary-1", densityBudget: 0.7, couplingRules: [] },
            { roleId: "secondary-1", densityBudget: 0.4, couplingRules: [] },
            { roleId: "primary-2", densityBudget: 0.6, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const primaryRoles = system.getPrimaryRoles();

      expect(primaryRoles).toHaveLength(2);
      expect(primaryRoles.every((r) => r.priority === "primary")).toBe(true);
    });

    it("should get roles by functional class", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-class",
        systemType: "orchestration",
        roles: [
          {
            roleId: "foundation-1",
            roleName: "Foundation",
            priority: "primary",
            functionalClass: "foundation",
            yieldTo: [],
          },
          {
            roleId: "motion-1",
            roleName: "Motion",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "ornament-1",
            roleName: "Ornament",
            priority: "secondary",
            functionalClass: "ornament",
            yieldTo: [],
          },
          {
            roleId: "reinforcement-1",
            roleName: "Reinforcement",
            priority: "tertiary",
            functionalClass: "reinforcement",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "foundation-1", minPitch: 36, maxPitch: 60 },
            { roleId: "motion-1", minPitch: 48, maxPitch: 84 },
            { roleId: "ornament-1", minPitch: 60, maxPitch: 96 },
            { roleId: "reinforcement-1", minPitch: 36, maxPitch: 72 },
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
            { roleId: "foundation-1", densityBudget: 0.5, couplingRules: [] },
            { roleId: "motion-1", densityBudget: 0.7, couplingRules: [] },
            { roleId: "ornament-1", densityBudget: 0.3, couplingRules: [] },
            { roleId: "reinforcement-1", densityBudget: 0.4, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);

      expect(system.getRolesByClass("foundation")).toHaveLength(1);
      expect(system.getRolesByClass("motion")).toHaveLength(1);
      expect(system.getRolesByClass("ornament")).toHaveLength(1);
      expect(system.getRolesByClass("reinforcement")).toHaveLength(1);
    });

    it("should check role yielding", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-yield",
        systemType: "orchestration",
        roles: [
          {
            roleId: "primary-role",
            roleName: "Primary",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "secondary-role",
            roleName: "Secondary",
            priority: "secondary",
            functionalClass: "motion",
            yieldTo: ["primary-role"],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "primary-role", minPitch: 48, maxPitch: 84 },
            { roleId: "secondary-role", minPitch: 48, maxPitch: 84 },
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
            { roleId: "primary-role", densityBudget: 0.7, couplingRules: [] },
            { roleId: "secondary-role", densityBudget: 0.4, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);

      expect(system.roleYieldsTo("secondary-role", "primary-role")).toBe(true);
      expect(system.roleYieldsTo("primary-role", "secondary-role")).toBe(false);
      expect(system.roleYieldsTo("secondary-role", "non-existent")).toBe(false);
    });
  });

  describe("orchestration generation", () => {
    it("should generate orchestration pattern", () => {
      const data = createOrchestrationSystem();
      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2", "voice-3", "voice-4"];

      const pattern = system.generateOrchestration(voiceIds);

      expect(pattern.assignments).toHaveLength(3); // 3 roles
      expect(pattern.assignments[0].roleId).toBeDefined();
      expect(pattern.assignments[0].register).toBeDefined();
      expect(pattern.assignments[0].spacing).toBeDefined();
      expect(pattern.assignments[0].density).toBeGreaterThanOrEqual(0);
      expect(pattern.assignments[0].density).toBeLessThanOrEqual(1);
    });

    it("should assign correct registers by functional class", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-registers",
        systemType: "orchestration",
        roles: [
          {
            roleId: "foundation-role",
            roleName: "Foundation",
            priority: "primary",
            functionalClass: "foundation",
            yieldTo: [],
          },
          {
            roleId: "motion-role",
            roleName: "Motion",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "ornament-role",
            roleName: "Ornament",
            priority: "secondary",
            functionalClass: "ornament",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "foundation-role", minPitch: 36, maxPitch: 60 },
            { roleId: "motion-role", minPitch: 48, maxPitch: 84 },
            { roleId: "ornament-role", minPitch: 60, maxPitch: 96 },
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
            { roleId: "foundation-role", densityBudget: 0.5, couplingRules: [] },
            { roleId: "motion-role", densityBudget: 0.7, couplingRules: [] },
            { roleId: "ornament-role", densityBudget: 0.3, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2", "voice-3"];
      const pattern = system.generateOrchestration(voiceIds);

      const foundationAssign = pattern.assignments.find((a) => a.roleId === "foundation-role");
      const motionAssign = pattern.assignments.find((a) => a.roleId === "motion-role");
      const ornamentAssign = pattern.assignments.find((a) => a.roleId === "ornament-role");

      expect(foundationAssign?.register.minPitch).toBe(36);
      expect(foundationAssign?.register.maxPitch).toBe(60);
      expect(motionAssign?.register.minPitch).toBe(48);
      expect(motionAssign?.register.maxPitch).toBe(84);
      expect(ornamentAssign?.register.minPitch).toBe(60);
      expect(ornamentAssign?.register.maxPitch).toBe(96);
    });

    it("should apply doubling rules", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-doubling",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Melody",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 60, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.7, couplingRules: [] }],
        },
        doublingRules: [
          {
            ruleId: "double-1",
            sourceVoiceId: "voice-1",
            targetVoiceId: "voice-2",
            interval: 12, // Octave
            conditional: false,
          },
        ],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2"];
      const pattern = system.generateOrchestration(voiceIds);

      expect(pattern.doublings).toHaveLength(1);
      expect(pattern.doublings[0].sourceVoiceId).toBe("voice-1");
      expect(pattern.doublings[0].targetVoiceId).toBe("voice-2");
      expect(pattern.doublings[0].interval).toBe(12);
    });

    it("should apply reinforcement rules", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-reinforce",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Melody",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 60, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.7, couplingRules: [] }],
        },
        doublingRules: [],
        reinforcementRules: [
          {
            ruleId: "reinforce-1",
            sourceVoiceId: "voice-1",
            targetVoiceId: "voice-2",
            delay: 0.5, // Half beat
          },
        ],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2"];
      const pattern = system.generateOrchestration(voiceIds);

      expect(pattern.reinforcements).toHaveLength(1);
      expect(pattern.reinforcements[0].sourceVoiceId).toBe("voice-1");
      expect(pattern.reinforcements[0].targetVoiceId).toBe("voice-2");
      expect(pattern.reinforcements[0].delay).toBe(0.5);
    });

    it("should respect voice count limits", () => {
      const data = createOrchestrationSystem();
      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2"]; // Only 2 voices for 3 roles

      const pattern = system.generateOrchestration(voiceIds);

      // Should only assign voices that exist
      expect(pattern.assignments.length).toBeLessThanOrEqual(2);
      expect(pattern.assignments.every((a) => voiceIds.includes(a.voiceId))).toBe(true);
    });
  });

  describe("default register values", () => {
    it("should use default registers when not specified", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-default-reg",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-foundation",
            roleName: "Foundation",
            priority: "primary",
            functionalClass: "foundation",
            yieldTo: [],
          },
          {
            roleId: "role-motion",
            roleName: "Motion",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "role-ornament",
            roleName: "Ornament",
            priority: "secondary",
            functionalClass: "ornament",
            yieldTo: [],
          },
          {
            roleId: "role-reinforcement",
            roleName: "Reinforcement",
            priority: "tertiary",
            functionalClass: "reinforcement",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [], // No registers specified
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
            { roleId: "role-foundation", densityBudget: 0.5, couplingRules: [] },
            { roleId: "role-motion", densityBudget: 0.7, couplingRules: [] },
            { roleId: "role-ornament", densityBudget: 0.3, couplingRules: [] },
            { roleId: "role-reinforcement", densityBudget: 0.4, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2", "voice-3", "voice-4"];
      const pattern = system.generateOrchestration(voiceIds);

      const foundation = pattern.assignments.find((a) => a.roleId === "role-foundation");
      const motion = pattern.assignments.find((a) => a.roleId === "role-motion");
      const ornament = pattern.assignments.find((a) => a.roleId === "role-ornament");
      const reinforcement = pattern.assignments.find((a) => a.roleId === "role-reinforcement");

      // Check default register ranges
      expect(foundation?.register.minPitch).toBe(36); // C2
      expect(foundation?.register.maxPitch).toBe(60); // C4
      expect(motion?.register.minPitch).toBe(48); // C3
      expect(motion?.register.maxPitch).toBe(84); // C6
      expect(ornament?.register.minPitch).toBe(60); // C4
      expect(ornament?.register.maxPitch).toBe(96); // C7
      expect(reinforcement?.register.minPitch).toBe(36); // C2
      expect(reinforcement?.register.maxPitch).toBe(72); // C5
    });
  });

  describe("density distribution", () => {
    it("should use specified density values", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-density",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "High Density",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "role-2",
            roleName: "Low Density",
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
            { roleId: "role-1", densityBudget: 0.9, couplingRules: [] },
            { roleId: "role-2", densityBudget: 0.2, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2"];
      const pattern = system.generateOrchestration(voiceIds);

      const highDensity = pattern.assignments.find((a) => a.roleId === "role-1");
      const lowDensity = pattern.assignments.find((a) => a.roleId === "role-2");

      expect(highDensity?.density).toBe(0.9);
      expect(lowDensity?.density).toBe(0.2);
    });

    it("should use default density when not specified", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-default-density",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Default Density",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 48, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [], // No density specified
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1"];
      const pattern = system.generateOrchestration(voiceIds);

      expect(pattern.assignments[0].density).toBe(0.5); // Default
    });
  });

  describe("spacing rules", () => {
    it("should apply spacing constraints", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-spacing",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Constrained Voice",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 48, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [
            { voiceId: "voice-1", minInterval: 3 }, // Must be at least 3 semitones below
          ],
          maxSpacing: [
            { voiceId: "voice-1", maxInterval: 12 }, // Must be at most 12 semitones above
          ],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.7, couplingRules: [] }],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1"];
      const pattern = system.generateOrchestration(voiceIds);

      expect(pattern.assignments[0].spacing.minIntervalBelow).toBe(3);
      expect(pattern.assignments[0].spacing.maxIntervalAbove).toBe(12);
    });

    it("should use default spacing when not specified", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-default-spacing",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Default Spacing",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 48, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.7, couplingRules: [] }],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1"];
      const pattern = system.generateOrchestration(voiceIds);

      expect(pattern.assignments[0].spacing.minIntervalBelow).toBe(0);
      expect(pattern.assignments[0].spacing.maxIntervalAbove).toBe(24); // 2 octaves
    });
  });

  describe("conditional doubling", () => {
    it("should apply unconditional doubling rules", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-uncond-double",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Melody",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 60, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.7, couplingRules: [] }],
        },
        doublingRules: [
          {
            ruleId: "double-1",
            sourceVoiceId: "voice-1",
            targetVoiceId: "voice-2",
            interval: 12,
            conditional: false,
          },
        ],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const pattern = system.generateOrchestration(["voice-1", "voice-2"]);

      expect(pattern.doublings).toHaveLength(1);
    });

    it("should not apply conditional doubling when source not present", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-cond-double",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Melody",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 60, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.7, couplingRules: [] }],
        },
        doublingRules: [
          {
            ruleId: "double-1",
            sourceVoiceId: "voice-999", // Non-existent voice
            targetVoiceId: "voice-2",
            interval: 12,
            conditional: true,
          },
        ],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const pattern = system.generateOrchestration(["voice-1", "voice-2"]);

      expect(pattern.doublings).toHaveLength(0);
    });

    it("should apply conditional doubling when source present", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-cond-double-present",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Melody",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 60, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.7, couplingRules: [] }],
        },
        doublingRules: [
          {
            ruleId: "double-1",
            sourceVoiceId: "voice-1",
            targetVoiceId: "voice-2",
            interval: 7, // Fifth
            conditional: true,
          },
        ],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const pattern = system.generateOrchestration(["voice-1", "voice-2"]);

      expect(pattern.doublings).toHaveLength(1);
      expect(pattern.doublings[0].interval).toBe(7);
    });
  });

  describe("reinforcement patterns", () => {
    it("should apply multiple reinforcement rules", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-multi-reinforce",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Melody",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 60, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.7, couplingRules: [] }],
        },
        doublingRules: [],
        reinforcementRules: [
          {
            ruleId: "reinforce-1",
            sourceVoiceId: "voice-1",
            targetVoiceId: "voice-2",
            delay: 0.25, // Sixteenth
          },
          {
            ruleId: "reinforce-2",
            sourceVoiceId: "voice-1",
            targetVoiceId: "voice-3",
            delay: 0.5, // Eighth
          },
        ],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const pattern = system.generateOrchestration(["voice-1", "voice-2", "voice-3"]);

      expect(pattern.reinforcements).toHaveLength(2);
      expect(pattern.reinforcements[0].delay).toBe(0.25);
      expect(pattern.reinforcements[1].delay).toBe(0.5);
    });

    it("should not apply reinforcement when source not assigned", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-no-reinforce",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Melody",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 60, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.7, couplingRules: [] }],
        },
        doublingRules: [],
        reinforcementRules: [
          {
            ruleId: "reinforce-1",
            sourceVoiceId: "voice-999", // Not assigned
            targetVoiceId: "voice-2",
            delay: 0.5,
          },
        ],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const pattern = system.generateOrchestration(["voice-1", "voice-2"]);

      expect(pattern.reinforcements).toHaveLength(0);
    });
  });

  describe("priority assignment order", () => {
    it("should assign voices to primary roles first", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-priority",
        systemType: "orchestration",
        roles: [
          {
            roleId: "tertiary-role",
            roleName: "Tertiary",
            priority: "tertiary",
            functionalClass: "ornament",
            yieldTo: [],
          },
          {
            roleId: "primary-role",
            roleName: "Primary",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "secondary-role",
            roleName: "Secondary",
            priority: "secondary",
            functionalClass: "foundation",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "primary-role", minPitch: 60, maxPitch: 84 },
            { roleId: "secondary-role", minPitch: 36, maxPitch: 60 },
            { roleId: "tertiary-role", minPitch: 72, maxPitch: 96 },
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
            { roleId: "primary-role", densityBudget: 0.7, couplingRules: [] },
            { roleId: "secondary-role", densityBudget: 0.5, couplingRules: [] },
            { roleId: "tertiary-role", densityBudget: 0.3, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2"];
      const pattern = system.generateOrchestration(voiceIds);

      // Primary role gets first voice
      expect(pattern.assignments[0].roleId).toBe("primary-role");
      // Secondary role gets second voice
      expect(pattern.assignments[1].roleId).toBe("secondary-role");
      // Tertiary role doesn't get assigned (only 2 voices)
      expect(pattern.assignments.some((a) => a.roleId === "tertiary-role")).toBe(false);
    });

    it("should assign all roles when voices available", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-all-priorities",
        systemType: "orchestration",
        roles: [
          {
            roleId: "tertiary-role",
            roleName: "Tertiary",
            priority: "tertiary",
            functionalClass: "ornament",
            yieldTo: [],
          },
          {
            roleId: "primary-role",
            roleName: "Primary",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "secondary-role",
            roleName: "Secondary",
            priority: "secondary",
            functionalClass: "foundation",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "primary-role", minPitch: 60, maxPitch: 84 },
            { roleId: "secondary-role", minPitch: 36, maxPitch: 60 },
            { roleId: "tertiary-role", minPitch: 72, maxPitch: 96 },
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
            { roleId: "primary-role", densityBudget: 0.7, couplingRules: [] },
            { roleId: "secondary-role", densityBudget: 0.5, couplingRules: [] },
            { roleId: "tertiary-role", densityBudget: 0.3, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2", "voice-3"];
      const pattern = system.generateOrchestration(voiceIds);

      expect(pattern.assignments).toHaveLength(3);
      expect(pattern.assignments.some((a) => a.roleId === "primary-role")).toBe(true);
      expect(pattern.assignments.some((a) => a.roleId === "secondary-role")).toBe(true);
      expect(pattern.assignments.some((a) => a.roleId === "tertiary-role")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty voice list", () => {
      const data = createOrchestrationSystem();
      const system = new OrchestrationSystemImpl(data);
      const pattern = system.generateOrchestration([]);

      expect(pattern.assignments).toHaveLength(0);
      expect(pattern.doublings).toHaveLength(0);
      expect(pattern.reinforcements).toHaveLength(0);
    });

    it("should handle single voice", () => {
      const data = createOrchestrationSystem();
      const system = new OrchestrationSystemImpl(data);
      const pattern = system.generateOrchestration(["voice-1"]);

      expect(pattern.assignments).toHaveLength(1);
      expect(pattern.assignments[0].voiceId).toBe("voice-1");
      expect(pattern.assignments[0].roleId).toBeDefined();
    });

    it("should handle many voices for few roles", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-many-voices",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Solo",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 60, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.8, couplingRules: [] }],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2", "voice-3", "voice-4", "voice-5"];
      const pattern = system.generateOrchestration(voiceIds);

      // Only one role, so only one voice assigned
      expect(pattern.assignments).toHaveLength(1);
      expect(pattern.assignments[0].voiceId).toBe("voice-1");
    });

    it("should handle doubling with different intervals", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-intervals",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Melody",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 60, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 0.7, couplingRules: [] }],
        },
        doublingRules: [
          {
            ruleId: "double-1",
            sourceVoiceId: "voice-1",
            targetVoiceId: "voice-2",
            interval: 12,
            conditional: false,
          }, // Octave
          {
            ruleId: "double-2",
            sourceVoiceId: "voice-1",
            targetVoiceId: "voice-3",
            interval: 7,
            conditional: false,
          }, // Fifth
          {
            ruleId: "double-3",
            sourceVoiceId: "voice-1",
            targetVoiceId: "voice-4",
            interval: 4,
            conditional: false,
          }, // Third
        ],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const voiceIds = ["voice-1", "voice-2", "voice-3", "voice-4"];
      const pattern = system.generateOrchestration(voiceIds);

      expect(pattern.doublings).toHaveLength(3);
      expect(pattern.doublings.some((d) => d.interval === 12)).toBe(true);
      expect(pattern.doublings.some((d) => d.interval === 7)).toBe(true);
      expect(pattern.doublings.some((d) => d.interval === 4)).toBe(true);
    });

    it("should handle roles with no yield relationships", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-no-yield",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "No Yield",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "role-2",
            roleName: "Also No Yield",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "role-1", minPitch: 60, maxPitch: 84 },
            { roleId: "role-2", minPitch: 48, maxPitch: 72 },
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
            { roleId: "role-2", densityBudget: 0.6, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);

      expect(system.roleYieldsTo("role-1", "role-2")).toBe(false);
      expect(system.roleYieldsTo("role-2", "role-1")).toBe(false);
    });

    it("should handle complex yield chains", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-yield-chain",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Yields to 2",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: ["role-2"],
          },
          {
            roleId: "role-2",
            roleName: "Yields to 3",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: ["role-3"],
          },
          {
            roleId: "role-3",
            roleName: "Top of chain",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "role-1", minPitch: 60, maxPitch: 84 },
            { roleId: "role-2", minPitch: 60, maxPitch: 84 },
            { roleId: "role-3", minPitch: 60, maxPitch: 84 },
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
            { roleId: "role-2", densityBudget: 0.6, couplingRules: [] },
            { roleId: "role-3", densityBudget: 0.8, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);

      expect(system.roleYieldsTo("role-1", "role-2")).toBe(true);
      expect(system.roleYieldsTo("role-2", "role-3")).toBe(true);
      expect(system.roleYieldsTo("role-1", "role-3")).toBe(false); // Not direct
      expect(system.roleYieldsTo("role-3", "role-2")).toBe(false); // No reverse
    });
  });

  describe("functional class behavior", () => {
    it("should handle all foundation class roles", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-all-foundation",
        systemType: "orchestration",
        roles: [
          {
            roleId: "bass-1",
            roleName: "Bass 1",
            priority: "primary",
            functionalClass: "foundation",
            yieldTo: [],
          },
          {
            roleId: "bass-2",
            roleName: "Bass 2",
            priority: "secondary",
            functionalClass: "foundation",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "bass-1", minPitch: 36, maxPitch: 48 },
            { roleId: "bass-2", minPitch: 36, maxPitch: 48 },
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
            { roleId: "bass-1", densityBudget: 0.5, couplingRules: [] },
            { roleId: "bass-2", densityBudget: 0.4, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const foundationRoles = system.getRolesByClass("foundation");

      expect(foundationRoles).toHaveLength(2);
      expect(foundationRoles.every((r) => r.functionalClass === "foundation")).toBe(true);
    });

    it("should handle mixed functional classes", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-mixed",
        systemType: "orchestration",
        roles: [
          {
            roleId: "f-1",
            roleName: "F1",
            priority: "primary",
            functionalClass: "foundation",
            yieldTo: [],
          },
          {
            roleId: "m-1",
            roleName: "M1",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "o-1",
            roleName: "O1",
            priority: "secondary",
            functionalClass: "ornament",
            yieldTo: [],
          },
          {
            roleId: "r-1",
            roleName: "R1",
            priority: "tertiary",
            functionalClass: "reinforcement",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "f-1", minPitch: 36, maxPitch: 60 },
            { roleId: "m-1", minPitch: 48, maxPitch: 84 },
            { roleId: "o-1", minPitch: 60, maxPitch: 96 },
            { roleId: "r-1", minPitch: 36, maxPitch: 72 },
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
            { roleId: "f-1", densityBudget: 0.5, couplingRules: [] },
            { roleId: "m-1", densityBudget: 0.7, couplingRules: [] },
            { roleId: "o-1", densityBudget: 0.3, couplingRules: [] },
            { roleId: "r-1", densityBudget: 0.4, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);

      expect(system.getRolesByClass("foundation")).toHaveLength(1);
      expect(system.getRolesByClass("motion")).toHaveLength(1);
      expect(system.getRolesByClass("ornament")).toHaveLength(1);
      expect(system.getRolesByClass("reinforcement")).toHaveLength(1);
    });
  });

  describe("system validation", () => {
    it("should reject missing spacing system", () => {
      const data = createOrchestrationSystem();
      // @ts-expect-error - Testing invalid system
      const invalidData = { ...data, spacingSystem: null };

      const system = new OrchestrationSystemImpl(invalidData);
      const validation = system.validate();

      expect(validation.valid).toBe(false);
    });

    it("should reject negative density values", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-neg-density",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "Negative Density",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 48, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: -0.5, couplingRules: [] }],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("invalid density"))).toBe(true);
    });

    it("should reject density greater than 1", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-high-density",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-1",
            roleName: "High Density",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [{ roleId: "role-1", minPitch: 48, maxPitch: 84 }],
        },
        spacingSystem: {
          systemId: "space-1",
          minSpacing: [],
          maxSpacing: [],
          crossingRules: [],
        },
        densitySystem: {
          systemId: "density-1",
          roleDensity: [{ roleId: "role-1", densityBudget: 1.5, couplingRules: [] }],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const validation = system.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("invalid density"))).toBe(true);
    });

    it("should accept boundary density values", () => {
      const data: OrchestrationSystem = {
        systemId: "orch-boundary",
        systemType: "orchestration",
        roles: [
          {
            roleId: "role-0",
            roleName: "Zero",
            priority: "primary",
            functionalClass: "motion",
            yieldTo: [],
          },
          {
            roleId: "role-1",
            roleName: "One",
            priority: "secondary",
            functionalClass: "motion",
            yieldTo: [],
          },
        ],
        registerSystem: {
          systemId: "reg-1",
          roleRegisters: [
            { roleId: "role-0", minPitch: 48, maxPitch: 84 },
            { roleId: "role-1", minPitch: 48, maxPitch: 84 },
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
            { roleId: "role-0", densityBudget: 0, couplingRules: [] },
            { roleId: "role-1", densityBudget: 1, couplingRules: [] },
          ],
        },
        doublingRules: [],
        reinforcementRules: [],
        splitRules: [],
        mergeRules: [],
        formOrchestration: [],
      };

      const system = new OrchestrationSystemImpl(data);
      const validation = system.validate();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});

describe("validateOrchestration", () => {
  it("should validate correct orchestration", () => {
    const system = createOrchestrationSystem();
    const validation = validateOrchestration(system);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("should detect invalid orchestration", () => {
    const invalidData: OrchestrationSystem = {
      systemId: "invalid",
      systemType: "orchestration",
      roles: [],
      registerSystem: {
        systemId: "reg-invalid",
        roleRegisters: [],
      },
      spacingSystem: {
        systemId: "space-invalid",
        minSpacing: [],
        maxSpacing: [],
        crossingRules: [],
      },
      densitySystem: {
        systemId: "density-invalid",
        roleDensity: [],
      },
      doublingRules: [],
      reinforcementRules: [],
      splitRules: [],
      mergeRules: [],
      formOrchestration: [],
    };

    const validation = validateOrchestration(invalidData);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

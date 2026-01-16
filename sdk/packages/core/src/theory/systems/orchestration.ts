/**
 * Book V: Orchestration System Implementation
 *
 * Implements Schillinger's orchestration theory:
 * - Role hierarchy (primary/secondary/tertiary)
 * - Functional classes (foundation, motion, ornament, reinforcement)
 * - Register & spacing systems
 * - Density & weight distribution
 * - Doubling & reinforcement
 * - Voice splitting/merging
 *
 * Key concepts:
 * - Orchestration is STRUCTURAL, not sound design
 * - Defines musical roles and relationships
 * - Determines register placement and spacing
 * - Controls density coupling between roles
 * - Specifies doubling and reinforcement patterns
 */

import type {
  OrchestrationSystem,
  Role,
  RegisterSystem,
  SpacingSystem,
  DensitySystem,
  DoublingRule,
  ReinforcementRule,
  SplitRule,
  MergeRule,
  FormOrchestrationBinding,
} from "../../types";

/**
 * Helper function to generate UUID
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Voice assignment - result of orchestration
 * Renamed to OrchestrationVoiceAssignment to avoid conflict with types/definitions.ts
 */
export interface OrchestrationVoiceAssignment {
  voiceId: string;
  roleId: string;
  register: {
    minPitch: number;
    maxPitch: number;
  };
  spacing: {
    minIntervalBelow: number;
    maxIntervalAbove: number;
  };
  density: number; // 0-1
}

/**
 * Orchestration pattern - complete orchestration result
 */
export interface OrchestrationPattern {
  assignments: OrchestrationVoiceAssignment[];
  doublings: Array<{
    sourceVoiceId: string;
    targetVoiceId: string;
    interval: number;
  }>;
  reinforcements: Array<{
    sourceVoiceId: string;
    targetVoiceId: string;
    delay: number;
  }>;
}

/**
 * OrchestrationSystem class - Book V implementation
 */
export class OrchestrationSystemImpl implements OrchestrationSystem {
  readonly systemId: string;
  readonly systemType = "orchestration" as const;
  roles: Role[];
  registerSystem: RegisterSystem;
  spacingSystem: SpacingSystem;
  densitySystem: DensitySystem;
  doublingRules: DoublingRule[];
  reinforcementRules: ReinforcementRule[];
  splitRules: SplitRule[];
  mergeRules: MergeRule[];
  formOrchestration: FormOrchestrationBinding[];

  constructor(data: OrchestrationSystem) {
    this.systemId = data.systemId;
    this.roles = data.roles ?? [];
    this.registerSystem = data.registerSystem ?? {
      systemId: generateUUID(),
      roleRegisters: [],
    };
    this.spacingSystem = data.spacingSystem ?? {
      systemId: generateUUID(),
      minSpacing: [],
      maxSpacing: [],
      crossingRules: [],
    };
    this.densitySystem = data.densitySystem ?? {
      systemId: generateUUID(),
      roleDensity: [],
    };
    this.doublingRules = data.doublingRules ?? [];
    this.reinforcementRules = data.reinforcementRules ?? [];
    this.splitRules = data.splitRules ?? [];
    this.mergeRules = data.mergeRules ?? [];
    this.formOrchestration = data.formOrchestration ?? [];
  }

  /**
   * Generate orchestration pattern
   *
   * @param voiceIds - Available voices to orchestrate
   * @returns Orchestration pattern with assignments and doublings
   */
  generateOrchestration(voiceIds: string[]): OrchestrationPattern {
    const assignments: OrchestrationVoiceAssignment[] = [];
    const doublings: Array<{
      sourceVoiceId: string;
      targetVoiceId: string;
      interval: number;
    }> = [];
    const reinforcements: Array<{
      sourceVoiceId: string;
      targetVoiceId: string;
      delay: number;
    }> = [];

    // Sort roles by priority to assign voices first to primary roles
    const sortedRoles = this.sortRolesByPriority(this.roles);

    // Track which voices have been assigned
    let voiceIndex = 0;

    // Assign voices to roles based on priority
    for (const role of sortedRoles) {
      // Determine how many voices this role needs
      const voiceCount = this.calculateVoiceCount(role);

      // Assign voices to this role
      for (let i = 0; i < voiceCount && voiceIndex < voiceIds.length; i++) {
        const voiceId = voiceIds[voiceIndex++];
        const register = this.getRegisterForRole(role);
        const spacing = this.getSpacingForVoice(voiceId);
        const density = this.getDensityForRole(role);

        assignments.push({
          voiceId,
          roleId: role.roleId,
          register,
          spacing,
          density,
        });
      }
    }

    // Apply doubling rules
    for (const rule of this.doublingRules) {
      if (this.shouldApplyDoubling(rule, assignments)) {
        doublings.push({
          sourceVoiceId: rule.sourceVoiceId,
          targetVoiceId: rule.targetVoiceId,
          interval: rule.interval,
        });
      }
    }

    // Apply reinforcement rules
    for (const rule of this.reinforcementRules) {
      if (this.shouldApplyReinforcement(rule, assignments)) {
        reinforcements.push({
          sourceVoiceId: rule.sourceVoiceId,
          targetVoiceId: rule.targetVoiceId,
          delay: rule.delay,
        });
      }
    }

    return {
      assignments,
      doublings,
      reinforcements,
    };
  }

  /**
   * Calculate how many voices a role needs
   */
  private calculateVoiceCount(role: Role): number {
    // Base voice count on functional class
    switch (role.functionalClass) {
      case "foundation":
        return 1; // Foundation roles typically single voice
      case "motion":
        return 1; // Motion roles can be doubled but default to 1
      case "ornament":
        return 1; // Ornaments are single voices
      case "reinforcement":
        return 1; // Reinforcement is single voice
      default:
        return 1;
    }
  }

  /**
   * Sort roles by priority
   */
  private sortRolesByPriority(roles: Role[]): Role[] {
    const priorityOrder = { primary: 0, secondary: 1, tertiary: 2 };
    return [...roles].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Get register range for a role
   */
  private getRegisterForRole(role: Role): {
    minPitch: number;
    maxPitch: number;
  } {
    const roleRegister = this.registerSystem.roleRegisters.find((r) => r.roleId === role.roleId);

    if (!roleRegister) {
      // Default register based on functional class
      return this.getDefaultRegister(role.functionalClass);
    }

    return {
      minPitch: roleRegister.minPitch,
      maxPitch: roleRegister.maxPitch,
    };
  }

  /**
   * Get default register for functional class
   */
  private getDefaultRegister(functionalClass: Role["functionalClass"]): {
    minPitch: number;
    maxPitch: number;
  } {
    switch (functionalClass) {
      case "foundation":
        return { minPitch: 36, maxPitch: 60 }; // C2-C4
      case "motion":
        return { minPitch: 48, maxPitch: 84 }; // C3-C6
      case "ornament":
        return { minPitch: 60, maxPitch: 96 }; // C4-C7
      case "reinforcement":
        return { minPitch: 36, maxPitch: 72 }; // C2-C5
      default:
        return { minPitch: 48, maxPitch: 72 }; // C3-C5
    }
  }

  /**
   * Get spacing rules for a voice
   */
  private getSpacingForVoice(voiceId: string): {
    minIntervalBelow: number;
    maxIntervalAbove: number;
  } {
    // Find min spacing rules
    const minSpacing = this.spacingSystem.minSpacing.find((s) => s.voiceId === voiceId);
    // Find max spacing rules
    const maxSpacing = this.spacingSystem.maxSpacing.find((s) => s.voiceId === voiceId);

    return {
      minIntervalBelow: minSpacing?.minInterval ?? 0,
      maxIntervalAbove: maxSpacing?.maxInterval ?? 24, // 2 octaves
    };
  }

  /**
   * Get density for a role
   */
  private getDensityForRole(role: Role): number {
    const roleDensity = this.densitySystem.roleDensity.find((d) => d.roleId === role.roleId);

    return roleDensity?.densityBudget ?? 0.5; // Default 50% density
  }

  /**
   * Check if doubling rule should be applied
   */
  private shouldApplyDoubling(
    rule: DoublingRule,
    assignments: OrchestrationVoiceAssignment[]
  ): boolean {
    if (!rule.conditional) {
      return true;
    }

    // Check if trigger is met (simplified - would need form context)
    return assignments.some((a) => a.voiceId === rule.sourceVoiceId);
  }

  /**
   * Check if reinforcement rule should be applied
   */
  private shouldApplyReinforcement(
    rule: ReinforcementRule,
    assignments: OrchestrationVoiceAssignment[]
  ): boolean {
    return assignments.some((a) => a.voiceId === rule.sourceVoiceId);
  }

  /**
   * Validate orchestration system
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check roles
    if (this.roles.length === 0) {
      errors.push("OrchestrationSystem requires at least 1 role");
    }

    // Check for duplicate role IDs
    const roleIds = new Set(this.roles.map((r) => r.roleId));
    if (roleIds.size !== this.roles.length) {
      errors.push("Duplicate role IDs found");
    }

    // Validate register system
    if (!this.registerSystem?.roleRegisters || this.registerSystem.roleRegisters.length === 0) {
      errors.push("Register system missing role registers");
    }

    // Validate spacing system
    if (!this.spacingSystem) {
      errors.push("Spacing system is required");
    }

    // Validate density system
    if (!this.densitySystem?.roleDensity || this.densitySystem.roleDensity.length === 0) {
      errors.push("Density system missing role densities");
    }

    // Check density values are in range
    for (const roleDensity of this.densitySystem.roleDensity) {
      if (roleDensity.densityBudget < 0 || roleDensity.densityBudget > 1) {
        errors.push(`Role ${roleDensity.roleId} has invalid density: ${roleDensity.densityBudget}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.find((r) => r.roleId === roleId);
  }

  /**
   * Get primary roles
   */
  getPrimaryRoles(): Role[] {
    return this.roles.filter((r) => r.priority === "primary");
  }

  /**
   * Get roles by functional class
   */
  getRolesByClass(functionalClass: Role["functionalClass"]): Role[] {
    return this.roles.filter((r) => r.functionalClass === functionalClass);
  }

  /**
   * Check if role yields to another
   */
  roleYieldsTo(fromRoleId: string, toRoleId: string): boolean {
    const fromRole = this.getRole(fromRoleId);
    return fromRole?.yieldTo.includes(toRoleId) ?? false;
  }
}

/**
 * Create default orchestration system
 */
export function createOrchestrationSystem(
  overrides?: Partial<OrchestrationSystem>
): OrchestrationSystem {
  const systemId = overrides?.systemId ?? "orchestration-default";

  const defaultRoles: Role[] = [
    {
      roleId: `${systemId}-role-bass`,
      roleName: "Bass",
      priority: "primary",
      functionalClass: "foundation",
      yieldTo: [],
    },
    {
      roleId: `${systemId}-role-melody`,
      roleName: "Melody",
      priority: "primary",
      functionalClass: "motion",
      yieldTo: [],
    },
    {
      roleId: `${systemId}-role-accompaniment`,
      roleName: "Accompaniment",
      priority: "secondary",
      functionalClass: "motion",
      yieldTo: [`${systemId}-role-melody`],
    },
  ];

  return {
    systemId,
    systemType: "orchestration",
    roles: overrides?.roles ?? defaultRoles,
    registerSystem: overrides?.registerSystem ?? {
      systemId: `${systemId}-register`,
      roleRegisters: defaultRoles.map((role) => ({
        roleId: role.roleId,
        minPitch: role.functionalClass === "foundation" ? 36 : 48,
        maxPitch: role.functionalClass === "foundation" ? 60 : 84,
      })),
    },
    spacingSystem: overrides?.spacingSystem ?? {
      systemId: `${systemId}-spacing`,
      minSpacing: [],
      maxSpacing: [],
      crossingRules: [],
    },
    densitySystem: overrides?.densitySystem ?? {
      systemId: `${systemId}-density`,
      roleDensity: defaultRoles.map((role) => ({
        roleId: role.roleId,
        densityBudget: role.priority === "primary" ? 0.7 : 0.4,
        couplingRules: [],
      })),
    },
    doublingRules: overrides?.doublingRules ?? [],
    reinforcementRules: overrides?.reinforcementRules ?? [],
    splitRules: overrides?.splitRules ?? [],
    mergeRules: overrides?.mergeRules ?? [],
    formOrchestration: overrides?.formOrchestration ?? [],
  };
}

/**
 * Validate orchestration data
 */
export function validateOrchestration(data: OrchestrationSystem): {
  valid: boolean;
  errors: string[];
} {
  const system = new OrchestrationSystemImpl(data);
  return system.validate();
}

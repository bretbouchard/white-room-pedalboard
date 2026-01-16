/**
 * Binding Model - Role to System Bindings
 *
 * Connects orchestration roles to rhythm, melody, and harmony systems.
 * Also binds roles to ensemble voice slots.
 *
 * Key concepts:
 * - Bindings are STRUCTURAL connections
 * - Each role can bind to multiple systems
 * - Bindings have priority for conflict resolution
 * - Harmony bindings can use multiple voices
 * - Ensemble bindings assign roles to voice slots
 */

import type {
  RoleRhythmBinding,
  RoleMelodyBinding,
  RoleHarmonyBinding,
  RoleEnsembleBinding,
} from "../../types";

/**
 * BindingModel - Complete binding configuration
 */
export interface BindingModel {
  readonly modelId: string;
  readonly modelType: "bindings";
  rhythmBindings: RoleRhythmBinding[];
  melodyBindings: RoleMelodyBinding[];
  harmonyBindings: RoleHarmonyBinding[];
  ensembleBindings: RoleEnsembleBinding[];
}

/**
 * BindingModel class - Manages role-to-system bindings
 */
export class BindingModelImpl implements BindingModel {
  readonly modelId: string;
  readonly modelType = "bindings" as const;
  rhythmBindings: RoleRhythmBinding[];
  melodyBindings: RoleMelodyBinding[];
  harmonyBindings: RoleHarmonyBinding[];
  ensembleBindings: RoleEnsembleBinding[];

  constructor(data: BindingModel) {
    this.modelId = data.modelId;
    this.rhythmBindings = data.rhythmBindings;
    this.melodyBindings = data.melodyBindings;
    this.harmonyBindings = data.harmonyBindings;
    this.ensembleBindings = data.ensembleBindings;
  }

  /**
   * Get rhythm bindings for a role
   */
  getRhythmBindings(roleId: string): RoleRhythmBinding[] {
    return this.rhythmBindings.filter((b) => b.roleId === roleId);
  }

  /**
   * Get melody bindings for a role
   */
  getMelodyBindings(roleId: string): RoleMelodyBinding[] {
    return this.melodyBindings.filter((b) => b.roleId === roleId);
  }

  /**
   * Get harmony bindings for a role
   */
  getHarmonyBindings(roleId: string): RoleHarmonyBinding[] {
    return this.harmonyBindings.filter((b) => b.roleId === roleId);
  }

  /**
   * Get ensemble binding for a role
   */
  getEnsembleBinding(roleId: string): RoleEnsembleBinding | undefined {
    return this.ensembleBindings.find((b) => b.roleId === roleId);
  }

  /**
   * Get all bindings for a role (all types)
   */
  getAllBindings(roleId: string): {
    rhythm: RoleRhythmBinding[];
    melody: RoleMelodyBinding[];
    harmony: RoleHarmonyBinding[];
    ensemble: RoleEnsembleBinding | undefined;
  } {
    return {
      rhythm: this.getRhythmBindings(roleId),
      melody: this.getMelodyBindings(roleId),
      harmony: this.getHarmonyBindings(roleId),
      ensemble: this.getEnsembleBinding(roleId),
    };
  }

  /**
   * Get binding by ID (any type)
   */
  getBindingById(
    bindingId: string
  ): RoleRhythmBinding | RoleMelodyBinding | RoleHarmonyBinding | RoleEnsembleBinding | undefined {
    return (
      this.rhythmBindings.find((b) => b.bindingId === bindingId) ||
      this.melodyBindings.find((b) => b.bindingId === bindingId) ||
      this.harmonyBindings.find((b) => b.bindingId === bindingId) ||
      this.ensembleBindings.find((b) => b.bindingId === bindingId)
    );
  }

  /**
   * Get bindings for a voice (any type)
   */
  getBindingsForVoice(voiceId: string): {
    rhythm: RoleRhythmBinding[];
    melody: RoleMelodyBinding[];
    harmony: RoleHarmonyBinding[];
    ensemble: RoleEnsembleBinding | undefined;
  } {
    return {
      rhythm: this.rhythmBindings.filter((b) => b.voiceId === voiceId),
      melody: this.melodyBindings.filter((b) => b.voiceId === voiceId),
      harmony: this.harmonyBindings.filter((b) => b.voiceIds.includes(voiceId)),
      ensemble: this.ensembleBindings.find((b) => b.voiceId === voiceId),
    };
  }

  /**
   * Check if a voice has any bindings
   */
  voiceHasBindings(voiceId: string): boolean {
    const bindings = this.getBindingsForVoice(voiceId);
    return (
      bindings.rhythm.length > 0 ||
      bindings.melody.length > 0 ||
      bindings.harmony.length > 0 ||
      bindings.ensemble !== undefined
    );
  }

  /**
   * Get roles with rhythm bindings
   */
  getRolesWithRhythmBindings(): string[] {
    const roleIds = new Set(this.rhythmBindings.map((b) => b.roleId));
    return Array.from(roleIds);
  }

  /**
   * Get roles with melody bindings
   */
  getRolesWithMelodyBindings(): string[] {
    const roleIds = new Set(this.melodyBindings.map((b) => b.roleId));
    return Array.from(roleIds);
  }

  /**
   * Get roles with harmony bindings
   */
  getRolesWithHarmonyBindings(): string[] {
    const roleIds = new Set(this.harmonyBindings.map((b) => b.roleId));
    return Array.from(roleIds);
  }

  /**
   * Get roles with ensemble bindings
   */
  getRolesWithEnsembleBindings(): string[] {
    return this.ensembleBindings.map((b) => b.roleId);
  }

  /**
   * Get all bound roles (unique)
   */
  getAllBoundRoles(): string[] {
    const allRoles = new Set([
      ...this.getRolesWithRhythmBindings(),
      ...this.getRolesWithMelodyBindings(),
      ...this.getRolesWithHarmonyBindings(),
      ...this.getRolesWithEnsembleBindings(),
    ]);
    return Array.from(allRoles);
  }

  /**
   * Count total bindings
   */
  getTotalBindingCount(): number {
    return (
      this.rhythmBindings.length +
      this.melodyBindings.length +
      this.harmonyBindings.length +
      this.ensembleBindings.length
    );
  }

  /**
   * Get highest priority binding for a role and type
   */
  getHighestPriorityRhythmBinding(roleId: string): RoleRhythmBinding | undefined {
    const bindings = this.getRhythmBindings(roleId);
    if (bindings.length === 0) return undefined;
    return bindings.reduce((prev, current) => (prev.priority > current.priority ? prev : current));
  }

  /**
   * Get highest priority melody binding for a role
   */
  getHighestPriorityMelodyBinding(roleId: string): RoleMelodyBinding | undefined {
    const bindings = this.getMelodyBindings(roleId);
    if (bindings.length === 0) return undefined;
    return bindings.reduce((prev, current) => (prev.priority > current.priority ? prev : current));
  }

  /**
   * Get highest priority harmony binding for a role
   */
  getHighestPriorityHarmonyBinding(roleId: string): RoleHarmonyBinding | undefined {
    const bindings = this.getHarmonyBindings(roleId);
    if (bindings.length === 0) return undefined;
    return bindings.reduce((prev, current) => (prev.priority > current.priority ? prev : current));
  }

  /**
   * Sort bindings by priority
   */
  sortRhythmBindingsByPriority(roleId: string): RoleRhythmBinding[] {
    return this.getRhythmBindings(roleId).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Sort melody bindings by priority
   */
  sortMelodyBindingsByPriority(roleId: string): RoleMelodyBinding[] {
    return this.getMelodyBindings(roleId).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Sort harmony bindings by priority
   */
  sortHarmonyBindingsByPriority(roleId: string): RoleHarmonyBinding[] {
    return this.getHarmonyBindings(roleId).sort((a, b) => b.priority - a.priority);
  }
}

/**
 * Create default binding model
 */
export function createBindingModel(overrides?: Partial<BindingModel>): BindingModel {
  const modelId = overrides?.modelId ?? "bindings-default";

  return {
    modelId,
    modelType: "bindings",
    rhythmBindings: overrides?.rhythmBindings ?? [],
    melodyBindings: overrides?.melodyBindings ?? [],
    harmonyBindings: overrides?.harmonyBindings ?? [],
    ensembleBindings: overrides?.ensembleBindings ?? [],
  };
}

/**
 * Validate binding model
 */
export function validateBindingModel(data: BindingModel): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for duplicate binding IDs
  const allBindingIds = [
    ...data.rhythmBindings.map((b) => b.bindingId),
    ...data.melodyBindings.map((b) => b.bindingId),
    ...data.harmonyBindings.map((b) => b.bindingId),
    ...data.ensembleBindings.map((b) => b.bindingId),
  ];

  const uniqueIds = new Set(allBindingIds);
  if (uniqueIds.size !== allBindingIds.length) {
    errors.push("Duplicate binding IDs found");
  }

  // Check priority ranges (1-10)
  for (const binding of data.rhythmBindings) {
    if (binding.priority < 1 || binding.priority > 10) {
      errors.push(`Rhythm binding ${binding.bindingId} has invalid priority: ${binding.priority}`);
    }
  }

  for (const binding of data.melodyBindings) {
    if (binding.priority < 1 || binding.priority > 10) {
      errors.push(`Melody binding ${binding.bindingId} has invalid priority: ${binding.priority}`);
    }
  }

  for (const binding of data.harmonyBindings) {
    if (binding.priority < 1 || binding.priority > 10) {
      errors.push(`Harmony binding ${binding.bindingId} has invalid priority: ${binding.priority}`);
    }
    if (binding.voiceIds.length === 0) {
      errors.push(`Harmony binding ${binding.bindingId} must have at least one voice`);
    }
  }

  // Check ensemble bindings have valid voice IDs
  for (const binding of data.ensembleBindings) {
    if (!binding.voiceId) {
      errors.push(`Ensemble binding ${binding.bindingId} missing voice ID`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

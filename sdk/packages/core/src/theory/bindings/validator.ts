/**
 * Binding Validator
 *
 * Validates binding configurations against role and system availability.
 * Ensures bindings reference valid roles, systems, and voices.
 */

import type { BindingModel } from "./BindingModel";
import type {
  RoleRhythmBinding,
  RoleMelodyBinding,
  RoleHarmonyBinding,
  RoleEnsembleBinding,
  OrchestrationSystem,
  RhythmSystem,
  MelodySystem,
  HarmonySystem,
  EnsembleModel,
} from "../../types";

/**
 * Validation context - provides available systems and roles
 */
export interface ValidationContext {
  orchestrationSystem: OrchestrationSystem;
  rhythmSystems: RhythmSystem[];
  melodySystems: MelodySystem[];
  harmonySystems: HarmonySystem[];
  ensembleModel: EnsembleModel;
}

/**
 * Binding validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate binding model against available systems and roles
 */
export function validateBindings(
  bindings: BindingModel,
  context: ValidationContext
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get available role IDs
  const availableRoleIds = new Set(context.orchestrationSystem.roles.map((r) => r.roleId));

  // Get available system IDs
  const availableRhythmSystemIds = new Set(context.rhythmSystems.map((s) => s.systemId));
  const availableMelodySystemIds = new Set(context.melodySystems.map((s) => s.systemId));
  const availableHarmonySystemIds = new Set(context.harmonySystems.map((s) => s.systemId));

  // Get available voice IDs
  const availableVoiceIds = new Set(context.ensembleModel.voices.map((v) => v.id));

  // Validate rhythm bindings
  for (const binding of bindings.rhythmBindings) {
    const rhythmErrors = validateRhythmBinding(
      binding,
      availableRoleIds,
      availableRhythmSystemIds,
      availableVoiceIds
    );
    errors.push(...rhythmErrors);
  }

  // Validate melody bindings
  for (const binding of bindings.melodyBindings) {
    const melodyErrors = validateMelodyBinding(
      binding,
      availableRoleIds,
      availableMelodySystemIds,
      availableVoiceIds
    );
    errors.push(...melodyErrors);
  }

  // Validate harmony bindings
  for (const binding of bindings.harmonyBindings) {
    const harmonyErrors = validateHarmonyBinding(
      binding,
      availableRoleIds,
      availableHarmonySystemIds,
      availableVoiceIds
    );
    errors.push(...harmonyErrors);
  }

  // Validate ensemble bindings
  for (const binding of bindings.ensembleBindings) {
    const ensembleErrors = validateEnsembleBinding(binding, availableRoleIds, availableVoiceIds);
    errors.push(...ensembleErrors);
  }

  // Check for roles without any bindings
  for (const role of context.orchestrationSystem.roles) {
    const hasBindings =
      bindings.rhythmBindings.some((b) => b.roleId === role.roleId) ||
      bindings.melodyBindings.some((b) => b.roleId === role.roleId) ||
      bindings.harmonyBindings.some((b) => b.roleId === role.roleId) ||
      bindings.ensembleBindings.some((b) => b.roleId === role.roleId);

    if (!hasBindings) {
      warnings.push(`Role ${role.roleId} (${role.roleName}) has no bindings`);
    }
  }

  // Check for voices without any bindings
  for (const voice of context.ensembleModel.voices) {
    const hasBindings =
      bindings.rhythmBindings.some((b) => b.voiceId === voice.id) ||
      bindings.melodyBindings.some((b) => b.voiceId === voice.id) ||
      bindings.harmonyBindings.some((b) => b.voiceIds.includes(voice.id)) ||
      bindings.ensembleBindings.some((b) => b.voiceId === voice.id);

    if (!hasBindings) {
      warnings.push(`Voice ${voice.id} has no bindings`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single rhythm binding
 */
function validateRhythmBinding(
  binding: RoleRhythmBinding,
  availableRoleIds: Set<string>,
  availableRhythmSystemIds: Set<string>,
  availableVoiceIds: Set<string>
): string[] {
  const errors: string[] = [];

  if (!availableRoleIds.has(binding.roleId)) {
    errors.push(`Rhythm binding ${binding.bindingId}: Unknown role ${binding.roleId}`);
  }

  if (!availableRhythmSystemIds.has(binding.rhythmSystemId)) {
    errors.push(
      `Rhythm binding ${binding.bindingId}: Unknown rhythm system ${binding.rhythmSystemId}`
    );
  }

  if (!availableVoiceIds.has(binding.voiceId)) {
    errors.push(`Rhythm binding ${binding.bindingId}: Unknown voice ${binding.voiceId}`);
  }

  if (binding.priority < 1 || binding.priority > 10) {
    errors.push(
      `Rhythm binding ${binding.bindingId}: Invalid priority ${binding.priority} (must be 1-10)`
    );
  }

  return errors;
}

/**
 * Validate a single melody binding
 */
function validateMelodyBinding(
  binding: RoleMelodyBinding,
  availableRoleIds: Set<string>,
  availableMelodySystemIds: Set<string>,
  availableVoiceIds: Set<string>
): string[] {
  const errors: string[] = [];

  if (!availableRoleIds.has(binding.roleId)) {
    errors.push(`Melody binding ${binding.bindingId}: Unknown role ${binding.roleId}`);
  }

  if (!availableMelodySystemIds.has(binding.melodySystemId)) {
    errors.push(
      `Melody binding ${binding.bindingId}: Unknown melody system ${binding.melodySystemId}`
    );
  }

  if (!availableVoiceIds.has(binding.voiceId)) {
    errors.push(`Melody binding ${binding.bindingId}: Unknown voice ${binding.voiceId}`);
  }

  if (binding.priority < 1 || binding.priority > 10) {
    errors.push(
      `Melody binding ${binding.bindingId}: Invalid priority ${binding.priority} (must be 1-10)`
    );
  }

  return errors;
}

/**
 * Validate a single harmony binding
 */
function validateHarmonyBinding(
  binding: RoleHarmonyBinding,
  availableRoleIds: Set<string>,
  availableHarmonySystemIds: Set<string>,
  availableVoiceIds: Set<string>
): string[] {
  const errors: string[] = [];

  if (!availableRoleIds.has(binding.roleId)) {
    errors.push(`Harmony binding ${binding.bindingId}: Unknown role ${binding.roleId}`);
  }

  if (!availableHarmonySystemIds.has(binding.harmonySystemId)) {
    errors.push(
      `Harmony binding ${binding.bindingId}: Unknown harmony system ${binding.harmonySystemId}`
    );
  }

  if (binding.voiceIds.length === 0) {
    errors.push(`Harmony binding ${binding.bindingId}: Must have at least one voice`);
  }

  for (const voiceId of binding.voiceIds) {
    if (!availableVoiceIds.has(voiceId)) {
      errors.push(`Harmony binding ${binding.bindingId}: Unknown voice ${voiceId}`);
    }
  }

  if (binding.priority < 1 || binding.priority > 10) {
    errors.push(
      `Harmony binding ${binding.bindingId}: Invalid priority ${binding.priority} (must be 1-10)`
    );
  }

  return errors;
}

/**
 * Validate a single ensemble binding
 */
function validateEnsembleBinding(
  binding: RoleEnsembleBinding,
  availableRoleIds: Set<string>,
  availableVoiceIds: Set<string>
): string[] {
  const errors: string[] = [];

  if (!availableRoleIds.has(binding.roleId)) {
    errors.push(`Ensemble binding ${binding.bindingId}: Unknown role ${binding.roleId}`);
  }

  if (!availableVoiceIds.has(binding.voiceId)) {
    errors.push(`Ensemble binding ${binding.bindingId}: Unknown voice ${binding.voiceId}`);
  }

  return errors;
}

/**
 * Quick validation - only checks binding structure, not references
 */
export function validateBindingStructure(bindings: BindingModel): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate binding IDs across all types
  const allIds = [
    ...bindings.rhythmBindings.map((b) => ({ id: b.bindingId, type: "rhythm" })),
    ...bindings.melodyBindings.map((b) => ({ id: b.bindingId, type: "melody" })),
    ...bindings.harmonyBindings.map((b) => ({ id: b.bindingId, type: "harmony" })),
    ...bindings.ensembleBindings.map((b) => ({ id: b.bindingId, type: "ensemble" })),
  ];

  const idMap = new Map<string, string[]>();
  for (const { id, type } of allIds) {
    if (!idMap.has(id)) {
      idMap.set(id, []);
    }
    idMap.get(id)!.push(type);
  }

  for (const [id, types] of idMap) {
    if (types.length > 1) {
      errors.push(`Duplicate binding ID ${id} used in: ${types.join(", ")}`);
    }
  }

  // Check priority ranges
  for (const binding of bindings.rhythmBindings) {
    if (binding.priority < 1 || binding.priority > 10) {
      errors.push(`Rhythm binding ${binding.bindingId}: Priority out of range (1-10)`);
    }
  }

  for (const binding of bindings.melodyBindings) {
    if (binding.priority < 1 || binding.priority > 10) {
      errors.push(`Melody binding ${binding.bindingId}: Priority out of range (1-10)`);
    }
  }

  for (const binding of bindings.harmonyBindings) {
    if (binding.priority < 1 || binding.priority > 10) {
      errors.push(`Harmony binding ${binding.bindingId}: Priority out of range (1-10)`);
    }
    if (binding.voiceIds.length === 0) {
      errors.push(`Harmony binding ${binding.bindingId}: Must have at least one voice`);
    }
  }

  // Warn about empty bindings
  if (bindings.rhythmBindings.length === 0) {
    warnings.push("No rhythm bindings defined");
  }
  if (bindings.melodyBindings.length === 0) {
    warnings.push("No melody bindings defined");
  }
  if (bindings.harmonyBindings.length === 0) {
    warnings.push("No harmony bindings defined");
  }
  if (bindings.ensembleBindings.length === 0) {
    warnings.push("No ensemble bindings defined");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

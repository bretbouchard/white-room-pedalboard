/**
 * BindingsSystem - T023
 *
 * Manages bindings between orchestration roles and theory systems.
 * Validates binding consistency and detects conflicts.
 *
 * Binding Types:
 * - RoleRhythmBinding: Connects role to rhythm system for single voice
 * - RoleMelodyBinding: Connects role to melody system for single voice
 * - RoleHarmonyBinding: Connects role to harmony system for multiple voices
 * - RoleEnsembleBinding: Connects role to ensemble voice assignment
 */

import { generateUUID } from "../utils/uuid";
import type {
  RoleRhythmBinding,
  RoleMelodyBinding,
  RoleHarmonyBinding,
  RoleEnsembleBinding,
  SchillingerSong_v1,
} from "../types";

/**
 * Validation error for bindings
 */
export interface BindingValidationError {
  bindingId: string;
  type: "duplicate_binding" | "voice_conflict" | "invalid_reference" | "circular_dependency";
  message: string;
}

/**
 * Validation result for bindings
 */
export interface BindingValidationResult {
  valid: boolean;
  errors: BindingValidationError[];
  warnings: string[];
}

/**
 * BindingsSystem class
 *
 * Provides methods for creating, validating, and managing bindings
 * between orchestration roles and theory systems.
 */
export class BindingsSystem {
  /**
   * Create a role-rhythm binding
   *
   * @param roleId - Role ID from orchestration system
   * @param rhythmSystemId - Rhythm system ID from Book I
   * @param voiceId - Voice ID from ensemble model
   * @param priority - Binding priority (1-10, higher = more important)
   * @returns RoleRhythmBinding object
   */
  static createRoleRhythmBinding(
    roleId: string,
    rhythmSystemId: string,
    voiceId: string,
    priority: number = 5
  ): RoleRhythmBinding {
    return {
      bindingId: generateUUID(),
      roleId,
      rhythmSystemId,
      voiceId,
      priority: Math.max(1, Math.min(10, priority)),
    };
  }

  /**
   * Create a role-melody binding
   *
   * @param roleId - Role ID from orchestration system
   * @param melodySystemId - Melody system ID from Book II
   * @param voiceId - Voice ID from ensemble model
   * @param priority - Binding priority (1-10, higher = more important)
   * @returns RoleMelodyBinding object
   */
  static createRoleMelodyBinding(
    roleId: string,
    melodySystemId: string,
    voiceId: string,
    priority: number = 5
  ): RoleMelodyBinding {
    return {
      bindingId: generateUUID(),
      roleId,
      melodySystemId,
      voiceId,
      priority: Math.max(1, Math.min(10, priority)),
    };
  }

  /**
   * Create a role-harmony binding
   *
   * @param roleId - Role ID from orchestration system
   * @param harmonySystemId - Harmony system ID from Book III
   * @param voiceIds - Array of voice IDs for harmony (multiple voices)
   * @param priority - Binding priority (1-10, higher = more important)
   * @returns RoleHarmonyBinding object
   */
  static createRoleHarmonyBinding(
    roleId: string,
    harmonySystemId: string,
    voiceIds: string[],
    priority: number = 5
  ): RoleHarmonyBinding {
    return {
      bindingId: generateUUID(),
      roleId,
      harmonySystemId,
      voiceIds: [...voiceIds], // Copy array
      priority: Math.max(1, Math.min(10, priority)),
    };
  }

  /**
   * Create a role-ensemble binding
   *
   * @param roleId - Role ID from orchestration system
   * @param voiceId - Voice ID from ensemble model
   * @returns RoleEnsembleBinding object
   */
  static createRoleEnsembleBinding(roleId: string, voiceId: string): RoleEnsembleBinding {
    return {
      bindingId: generateUUID(),
      roleId,
      voiceId,
    };
  }

  /**
   * Validate all bindings in a SchillingerSong
   *
   * Checks for:
   * - Duplicate bindings (same role + system + voice)
   * - Voice conflicts (same voice assigned to multiple roles)
   * - Invalid references (role/system/voice IDs that don't exist)
   *
   * @param song - SchillingerSong to validate
   * @returns Validation result with errors and warnings
   */
  static validateBindings(song: SchillingerSong_v1): BindingValidationResult {
    const errors: BindingValidationError[] = [];
    const warnings: string[] = [];

    // Collect all voice IDs from ensemble model
    const validVoiceIds = new Set(song.ensembleModel.voices.map((v) => v.id));

    // Collect all role IDs from orchestration system
    const validRoleIds = new Set(song.bookV_orchestration.roles.map((r) => r.roleId));

    // Collect all system IDs
    const validRhythmSystemIds = new Set(song.bookI_rhythmSystems.map((s) => s.systemId));
    const validMelodySystemIds = new Set(song.bookII_melodySystems.map((s) => s.systemId));
    const validHarmonySystemIds = new Set(song.bookIII_harmonySystems.map((s) => s.systemId));

    // Track voice assignments to detect conflicts
    const voiceAssignments = new Map<string, string[]>(); // voiceId -> roleIds

    // Validate role-rhythm bindings
    const rhythmBindingKeys = new Set<string>();
    for (const binding of song.bindings.roleRhythmBindings) {
      // Check for duplicate bindings
      const key = `${binding.roleId}:${binding.rhythmSystemId}:${binding.voiceId}`;
      if (rhythmBindingKeys.has(key)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "duplicate_binding",
          message: `Duplicate role-rhythm binding: role ${binding.roleId} already bound to rhythm ${binding.rhythmSystemId} for voice ${binding.voiceId}`,
        });
      }
      rhythmBindingKeys.add(key);

      // Validate role ID
      if (!validRoleIds.has(binding.roleId)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "invalid_reference",
          message: `Invalid role ID: ${binding.roleId} does not exist in orchestration system`,
        });
      }

      // Validate rhythm system ID
      if (!validRhythmSystemIds.has(binding.rhythmSystemId)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "invalid_reference",
          message: `Invalid rhythm system ID: ${binding.rhythmSystemId} does not exist in Book I`,
        });
      }

      // Validate voice ID
      if (!validVoiceIds.has(binding.voiceId)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "invalid_reference",
          message: `Invalid voice ID: ${binding.voiceId} does not exist in ensemble model`,
        });
      }

      // Track voice assignment
      if (!voiceAssignments.has(binding.voiceId)) {
        voiceAssignments.set(binding.voiceId, []);
      }
      voiceAssignments.get(binding.voiceId)!.push(binding.roleId);
    }

    // Validate role-melody bindings
    const melodyBindingKeys = new Set<string>();
    for (const binding of song.bindings.roleMelodyBindings) {
      // Check for duplicate bindings
      const key = `${binding.roleId}:${binding.melodySystemId}:${binding.voiceId}`;
      if (melodyBindingKeys.has(key)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "duplicate_binding",
          message: `Duplicate role-melody binding: role ${binding.roleId} already bound to melody ${binding.melodySystemId} for voice ${binding.voiceId}`,
        });
      }
      melodyBindingKeys.add(key);

      // Validate references
      if (!validRoleIds.has(binding.roleId)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "invalid_reference",
          message: `Invalid role ID: ${binding.roleId} does not exist in orchestration system`,
        });
      }

      if (!validMelodySystemIds.has(binding.melodySystemId)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "invalid_reference",
          message: `Invalid melody system ID: ${binding.melodySystemId} does not exist in Book II`,
        });
      }

      if (!validVoiceIds.has(binding.voiceId)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "invalid_reference",
          message: `Invalid voice ID: ${binding.voiceId} does not exist in ensemble model`,
        });
      }

      // Track voice assignment
      if (!voiceAssignments.has(binding.voiceId)) {
        voiceAssignments.set(binding.voiceId, []);
      }
      voiceAssignments.get(binding.voiceId)!.push(binding.roleId);
    }

    // Validate role-harmony bindings
    const harmonyBindingKeys = new Set<string>();
    for (const binding of song.bindings.roleHarmonyBindings) {
      // Check for duplicate bindings
      const key = `${binding.roleId}:${binding.harmonySystemId}`;
      if (harmonyBindingKeys.has(key)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "duplicate_binding",
          message: `Duplicate role-harmony binding: role ${binding.roleId} already bound to harmony ${binding.harmonySystemId}`,
        });
      }
      harmonyBindingKeys.add(key);

      // Validate references
      if (!validRoleIds.has(binding.roleId)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "invalid_reference",
          message: `Invalid role ID: ${binding.roleId} does not exist in orchestration system`,
        });
      }

      if (!validHarmonySystemIds.has(binding.harmonySystemId)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "invalid_reference",
          message: `Invalid harmony system ID: ${binding.harmonySystemId} does not exist in Book III`,
        });
      }

      // Validate all voice IDs
      for (const voiceId of binding.voiceIds) {
        if (!validVoiceIds.has(voiceId)) {
          errors.push({
            bindingId: binding.bindingId,
            type: "invalid_reference",
            message: `Invalid voice ID: ${voiceId} does not exist in ensemble model`,
          });
        }

        // Track voice assignment
        if (!voiceAssignments.has(voiceId)) {
          voiceAssignments.set(voiceId, []);
        }
        voiceAssignments.get(voiceId)!.push(binding.roleId);
      }
    }

    // Validate role-ensemble bindings
    const ensembleBindingKeys = new Set<string>();
    for (const binding of song.bindings.roleEnsembleBindings) {
      // Check for duplicate bindings
      const key = `${binding.roleId}:${binding.voiceId}`;
      if (ensembleBindingKeys.has(key)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "duplicate_binding",
          message: `Duplicate role-ensemble binding: role ${binding.roleId} already bound to voice ${binding.voiceId}`,
        });
      }
      ensembleBindingKeys.add(key);

      // Validate references
      if (!validRoleIds.has(binding.roleId)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "invalid_reference",
          message: `Invalid role ID: ${binding.roleId} does not exist in orchestration system`,
        });
      }

      if (!validVoiceIds.has(binding.voiceId)) {
        errors.push({
          bindingId: binding.bindingId,
          type: "invalid_reference",
          message: `Invalid voice ID: ${binding.voiceId} does not exist in ensemble model`,
        });
      }
    }

    // Check for voice conflicts (same voice assigned to multiple roles)
    for (const [voiceId, roleIds] of voiceAssignments) {
      if (roleIds.length > 1) {
        warnings.push(
          `Voice ${voiceId} is assigned to multiple roles: ${roleIds.join(", ")}. ` +
            "This may cause conflicts during realization."
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get all bindings for a specific role
   *
   * @param song - SchillingerSong to query
   * @param roleId - Role ID to get bindings for
   * @returns Object containing all bindings for the role
   */
  static getBindingsForRole(
    song: SchillingerSong_v1,
    roleId: string
  ): {
    rhythmBindings: RoleRhythmBinding[];
    melodyBindings: RoleMelodyBinding[];
    harmonyBindings: RoleHarmonyBinding[];
    ensembleBindings: RoleEnsembleBinding[];
  } {
    return {
      rhythmBindings: song.bindings.roleRhythmBindings.filter((b) => b.roleId === roleId),
      melodyBindings: song.bindings.roleMelodyBindings.filter((b) => b.roleId === roleId),
      harmonyBindings: song.bindings.roleHarmonyBindings.filter((b) => b.roleId === roleId),
      ensembleBindings: song.bindings.roleEnsembleBindings.filter((b) => b.roleId === roleId),
    };
  }

  /**
   * Get all bindings for a specific voice
   *
   * @param song - SchillingerSong to query
   * @param voiceId - Voice ID to get bindings for
   * @returns Array of all bindings that involve this voice
   */
  static getBindingsForVoice(
    song: SchillingerSong_v1,
    voiceId: string
  ): Array<RoleRhythmBinding | RoleMelodyBinding | RoleEnsembleBinding> {
    const bindings: Array<RoleRhythmBinding | RoleMelodyBinding | RoleEnsembleBinding> = [];

    // Check rhythm bindings
    for (const binding of song.bindings.roleRhythmBindings) {
      if (binding.voiceId === voiceId) {
        bindings.push(binding);
      }
    }

    // Check melody bindings
    for (const binding of song.bindings.roleMelodyBindings) {
      if (binding.voiceId === voiceId) {
        bindings.push(binding);
      }
    }

    // Check ensemble bindings
    for (const binding of song.bindings.roleEnsembleBindings) {
      if (binding.voiceId === voiceId) {
        bindings.push(binding);
      }
    }

    return bindings;
  }

  /**
   * Get harmony bindings that include a specific voice
   *
   * @param song - SchillingerSong to query
   * @param voiceId - Voice ID to check
   * @returns Array of harmony bindings that include this voice
   */
  static getHarmonyBindingsForVoice(
    song: SchillingerSong_v1,
    voiceId: string
  ): RoleHarmonyBinding[] {
    return song.bindings.roleHarmonyBindings.filter((binding) =>
      binding.voiceIds.includes(voiceId)
    );
  }

  /**
   * Check if a role has any bindings
   *
   * @param song - SchillingerSong to query
   * @param roleId - Role ID to check
   * @returns True if the role has any bindings
   */
  static roleHasBindings(song: SchillingerSong_v1, roleId: string): boolean {
    const bindings = this.getBindingsForRole(song, roleId);
    return (
      bindings.rhythmBindings.length > 0 ||
      bindings.melodyBindings.length > 0 ||
      bindings.harmonyBindings.length > 0 ||
      bindings.ensembleBindings.length > 0
    );
  }

  /**
   * Check if a voice has any bindings
   *
   * @param song - SchillingerSong to query
   * @param voiceId - Voice ID to check
   * @returns True if the voice has any bindings
   */
  static voiceHasBindings(song: SchillingerSong_v1, voiceId: string): boolean {
    const bindings = this.getBindingsForVoice(song, voiceId);
    return bindings.length > 0 || this.getHarmonyBindingsForVoice(song, voiceId).length > 0;
  }
}

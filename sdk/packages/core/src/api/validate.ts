/**
 * Validation API - T032
 *
 * Provides validation functions for SchillingerSDK types.
 * Combines schema validation with business logic validation.
 *
 * Main API:
 * - validate(song): Comprehensive SchillingerSong validation
 */

import { validate as validateSchema, SchemaValidator } from "../schemas";
import { BindingsSystem } from "../theory/bindings";
import type { SchillingerSong_v1 } from "../types";

/**
 * Validation severity level
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * Single validation message
 */
export interface ValidationMessage {
  code: string;
  severity: ValidationSeverity;
  category: "schema" | "business" | "binding" | "constraint";
  message: string;
  path?: string;
}

/**
 * Validation report for SchillingerSong
 */
export interface SongValidationReport {
  valid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalInfo: number;
  };
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Include info-level messages in report
   * @default false
   */
  includeInfo?: boolean;

  /**
   * Stop validation on first error
   * @default false
   */
  stopOnFirstError?: boolean;

  /**
   * Custom validator instance (uses default if not provided)
   */
  validator?: SchemaValidator;
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
  includeInfo: false,
  stopOnFirstError: false,
};

/**
 * Validate a SchillingerSong comprehensively
 *
 * This function performs:
 * 1. JSON Schema validation against SchillingerSong_v1 schema
 * 2. Binding consistency validation
 * 3. Business rule validation
 *
 * @param song - SchillingerSong to validate
 * @param options - Validation options
 * @returns Validation report with all issues found
 */
export function validate(
  song: SchillingerSong_v1,
  options: ValidationOptions = {}
): SongValidationReport {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];
  const info: ValidationMessage[] = [];

  // 1. Schema validation
  const schemaResult = validateSchema("schillinger-song-v1", song);
  if (!schemaResult.valid) {
    for (const err of schemaResult.errors) {
      errors.push({
        code: "SCHEMA_VALIDATION_ERROR",
        severity: "error",
        category: "schema",
        message: err.message,
        path: err.path,
      });
    }

    if (opts.stopOnFirstError && errors.length > 0) {
      return buildReport(errors, warnings, info);
    }
  }

  // 2. Binding validation
  const bindingResult = BindingsSystem.validateBindings(song);
  if (!bindingResult.valid) {
    for (const err of bindingResult.errors) {
      errors.push({
        code: "BINDING_ERROR",
        severity: "error",
        category: "binding",
        message: err.message,
      });
    }
  }

  // Add binding warnings
  for (const warning of bindingResult.warnings) {
    warnings.push({
      code: "BINDING_WARNING",
      severity: "warning",
      category: "binding",
      message: warning,
    });
  }

  // 3. Business rule validation
  const businessMessages = validateBusinessRules(song);
  errors.push(...businessMessages.filter((m) => m.severity === "error"));
  warnings.push(...businessMessages.filter((m) => m.severity === "warning"));
  info.push(...businessMessages.filter((m) => m.severity === "info"));

  return buildReport(errors, warnings, info);
}

/**
 * Validate business rules for SchillingerSong
 *
 * Checks for business logic violations that aren't caught by schema validation.
 *
 * @param song - SchillingerSong to validate
 * @returns Array of validation messages
 */
function validateBusinessRules(song: SchillingerSong_v1): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  // Validate global parameters (if they exist - schema may have already failed)
  if (!song.globals) {
    // Skip business rule validation if globals are missing (schema error)
    return messages;
  }

  if (typeof song.globals.tempo === "number") {
    if (song.globals.tempo < 40 || song.globals.tempo > 300) {
      messages.push({
        code: "TEMPO_OUT_OF_RANGE",
        severity: "warning",
        category: "business",
        message: `Tempo ${song.globals.tempo} BPM is outside typical range (40-300)`,
      });
    }
  }

  if (typeof song.globals.key === "number") {
    if (song.globals.key < 0 || song.globals.key > 11) {
      messages.push({
        code: "KEY_OUT_OF_RANGE",
        severity: "error",
        category: "business",
        message: `Key ${song.globals.key} is invalid (must be 0-11, where 0=C)`,
      });
    }
  }

  // Validate time signature
  if (Array.isArray(song.globals.timeSignature) && song.globals.timeSignature.length >= 2) {
    const [_numerator, denominator] = song.globals.timeSignature;
    if (denominator && ![1, 2, 4, 8, 16].includes(denominator)) {
      messages.push({
        code: "INVALID_TIME_SIGNATURE_DENOMINATOR",
        severity: "warning",
        category: "business",
        message: `Time signature denominator ${denominator} is unusual (typical: 1, 2, 4, 8, 16)`,
      });
    }
  }

  // Check for empty song
  const hasSystems =
    song.bookI_rhythmSystems.length > 0 ||
    song.bookII_melodySystems.length > 0 ||
    song.bookIII_harmonySystems.length > 0;

  if (!hasSystems) {
    messages.push({
      code: "EMPTY_SONG",
      severity: "info",
      category: "business",
      message: "Song has no theory systems (empty composition)",
    });
  }

  // Check for orphaned roles (roles defined but no bindings)
  const boundRoleIds = new Set<string>();
  for (const binding of song.bindings.roleRhythmBindings) {
    boundRoleIds.add(binding.roleId);
  }
  for (const binding of song.bindings.roleMelodyBindings) {
    boundRoleIds.add(binding.roleId);
  }
  for (const binding of song.bindings.roleHarmonyBindings) {
    boundRoleIds.add(binding.roleId);
  }
  for (const binding of song.bindings.roleEnsembleBindings) {
    boundRoleIds.add(binding.roleId);
  }

  for (const role of song.bookV_orchestration.roles) {
    if (!boundRoleIds.has(role.roleId)) {
      messages.push({
        code: "ORPHANED_ROLE",
        severity: "warning",
        category: "binding",
        message: `Role "${role.roleName}" (${role.roleId}) has no bindings and will not affect output`,
      });
    }
  }

  // Check for orphaned voices (voices defined but not used)
  const usedVoiceIds = new Set<string>();
  for (const binding of song.bindings.roleRhythmBindings) {
    usedVoiceIds.add(binding.voiceId);
  }
  for (const binding of song.bindings.roleMelodyBindings) {
    usedVoiceIds.add(binding.voiceId);
  }
  for (const binding of song.bindings.roleHarmonyBindings) {
    for (const voiceId of binding.voiceIds) {
      usedVoiceIds.add(voiceId);
    }
  }
  for (const binding of song.bindings.roleEnsembleBindings) {
    usedVoiceIds.add(binding.voiceId);
  }

  for (const voice of song.ensembleModel.voices) {
    if (!usedVoiceIds.has(voice.id)) {
      messages.push({
        code: "UNUSED_VOICE",
        severity: "info",
        category: "business",
        message: `Voice "${voice.name}" (${voice.id}) is not bound to any system`,
      });
    }
  }

  // Check for systems without bindings
  const systemBindings = new Map<string, string[]>();
  for (const binding of song.bindings.roleRhythmBindings) {
    const key = `rhythm:${binding.rhythmSystemId}`;
    if (!systemBindings.has(key)) {
      systemBindings.set(key, []);
    }
    systemBindings.get(key)!.push(binding.roleId);
  }
  for (const binding of song.bindings.roleMelodyBindings) {
    const key = `melody:${binding.melodySystemId}`;
    if (!systemBindings.has(key)) {
      systemBindings.set(key, []);
    }
    systemBindings.get(key)!.push(binding.roleId);
  }
  for (const binding of song.bindings.roleHarmonyBindings) {
    const key = `harmony:${binding.harmonySystemId}`;
    if (!systemBindings.has(key)) {
      systemBindings.set(key, []);
    }
    systemBindings.get(key)!.push(binding.roleId);
  }

  // Check for unbound systems
  for (const system of song.bookI_rhythmSystems) {
    if (!systemBindings.has(`rhythm:${system.systemId}`)) {
      messages.push({
        code: "UNBOUND_SYSTEM",
        severity: "warning",
        category: "binding",
        message: `Rhythm system "${system.systemId}" has no bindings and will not be realized`,
      });
    }
  }

  for (const system of song.bookII_melodySystems) {
    if (!systemBindings.has(`melody:${system.systemId}`)) {
      messages.push({
        code: "UNBOUND_SYSTEM",
        severity: "warning",
        category: "binding",
        message: `Melody system "${system.systemId}" has no bindings and will not be realized`,
      });
    }
  }

  for (const system of song.bookIII_harmonySystems) {
    if (!systemBindings.has(`harmony:${system.systemId}`)) {
      messages.push({
        code: "UNBOUND_SYSTEM",
        severity: "warning",
        category: "binding",
        message: `Harmony system "${system.systemId}" has no bindings and will not be realized`,
      });
    }
  }

  return messages;
}

/**
 * Build validation report from messages
 */
function buildReport(
  errors: ValidationMessage[],
  warnings: ValidationMessage[],
  info: ValidationMessage[]
): SongValidationReport {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      totalInfo: info.length,
    },
  };
}

/**
 * Quick validation check - returns true if song is valid
 *
 * This is a convenience function for simple boolean validation.
 * Use validate() for detailed validation report.
 *
 * @param song - SchillingerSong to validate
 * @returns True if song passes all validation checks
 */
export function isValid(song: SchillingerSong_v1): boolean {
  return validate(song).valid;
}

/**
 * Validate SongModel_v1
 *
 * @param songModel - SongModel to validate
 * @returns Validation report
 */
export function validateSongModel(songModel: any): SongValidationReport {
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];
  const info: ValidationMessage[] = [];

  // Schema validation
  const schemaResult = validateSchema("song-model-v1", songModel);
  if (!schemaResult.valid) {
    for (const err of schemaResult.errors) {
      errors.push({
        code: "SCHEMA_VALIDATION_ERROR",
        severity: "error",
        category: "schema",
        message: err.message,
        path: err.path,
      });
    }
  }

  return buildReport(errors, warnings, info);
}

/**
 * Validate DerivationRecord_v1
 *
 * @param derivation - DerivationRecord to validate
 * @returns Validation report
 */
export function validateDerivationRecord(derivation: any): SongValidationReport {
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];
  const info: ValidationMessage[] = [];

  // Schema validation
  const schemaResult = validateSchema("derivation-record-v1", derivation);
  if (!schemaResult.valid) {
    for (const err of schemaResult.errors) {
      errors.push({
        code: "SCHEMA_VALIDATION_ERROR",
        severity: "error",
        category: "schema",
        message: err.message,
        path: err.path,
      });
    }
  }

  return buildReport(errors, warnings, info);
}

/**
 * Validate ReconciliationReport_v1
 *
 * @param report - ReconciliationReport to validate
 * @returns Validation report
 */
export function validateReconciliationReport(report: any): SongValidationReport {
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];
  const info: ValidationMessage[] = [];

  // Schema validation
  const schemaResult = validateSchema("reconciliation-report-v1", report);
  if (!schemaResult.valid) {
    for (const err of schemaResult.errors) {
      errors.push({
        code: "SCHEMA_VALIDATION_ERROR",
        severity: "error",
        category: "schema",
        message: err.message,
        path: err.path,
      });
    }
  }

  // Business rule: confidence must be between 0 and 1
  if (report.confidenceSummary) {
    const { overall, byBook } = report.confidenceSummary;

    if (overall !== undefined) {
      if (overall < 0 || overall > 1) {
        errors.push({
          code: "INVALID_CONFIDENCE",
          severity: "error",
          category: "business",
          message: `Overall confidence ${overall} is outside valid range [0, 1]`,
        });
      }
    }

    if (byBook) {
      for (const [book, value] of Object.entries(byBook)) {
        if (typeof value === "number" && (value < 0 || value > 1)) {
          errors.push({
            code: "INVALID_CONFIDENCE",
            severity: "error",
            category: "business",
            message: `${book} confidence ${value} is outside valid range [0, 1]`,
          });
        }
      }
    }
  }

  return buildReport(errors, warnings, info);
}

/**
 * SongModelValidator
 *
 * Comprehensive validation for SongModel_v1 and SongModel_v2 instances.
 *
 * TDD Phase: GREEN - Implementation skeleton, tests will drive completion
 *
 * This component validates:
 * - Completeness: All required fields present
 * - Consistency: No contradictions or impossible configurations
 * - Serialization: Can be safely saved/loaded
 * - Architectural compliance: v2 has no transport property
 *
 * Part of: LLVM-Style Core Architecture
 * See: SDK_HANDOFF_ADDENDUM_LLVM_TIMELINE.md
 */

import type { SongModel_v1 } from "./song-model-builder";
import type { SongModel_v2 } from "@schillinger-sdk/shared";
import { isSongModel_v1, isSongModel_v2 } from "@schillinger-sdk/shared";

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  complete: boolean;
  consistent: boolean;
  serializable: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationOptions {
  /** Enable strict validation (warnings become errors) */
  strict?: boolean;
  /** Check projection completeness */
  checkProjections?: boolean;
  /** Validate musical constraints */
  checkMusicalConstraints?: boolean;
  /** Verify determinism requirements */
  checkDeterminism?: boolean;
}

/**
 * Comprehensive validator for SongModel_v1
 */
export class SongModelValidator {
  private options: Required<ValidationOptions>;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      strict: options.strict ?? false,
      checkProjections: options.checkProjections ?? true,
      checkMusicalConstraints: options.checkMusicalConstraints ?? true,
      checkDeterminism: options.checkDeterminism ?? true,
    };
  }

  /**
   * Type guard: Check if model is SongModel_v1
   */
  isSongModel_v1(model: any): model is SongModel_v1 {
    return isSongModel_v1(model);
  }

  /**
   * Type guard: Check if model is SongModel_v2
   */
  isSongModel_v2(model: any): model is SongModel_v2 {
    return isSongModel_v2(model);
  }

  /**
   * Validate complete SongModel (all checks)
   *
   * Detects v1 vs v2 and validates accordingly:
   * - v1: Has transport property (legacy, architectural violation tolerated for compatibility)
   * - v2: NO transport property (architecture compliant)
   */
  validate(model: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check if input is actually an object
    if (!model || typeof model !== "object") {
      errors.push({
        field: "model",
        message: "Input is not an object",
        severity: "error",
      });
      return {
        valid: false,
        complete: false,
        consistent: false,
        serializable: false,
        errors,
        warnings,
      };
    }

    // Detect version and validate accordingly
    const isV1 = isSongModel_v1(model);
    const isV2 = isSongModel_v2(model);

    if (!isV1 && !isV2) {
      errors.push({
        field: "version",
        message:
          "Model is neither v1 nor v2 (invalid or missing version field)",
        severity: "error",
      });
      return {
        valid: false,
        complete: false,
        consistent: false,
        serializable: false,
        errors,
        warnings,
      };
    }

    // Run all validation checks
    this.validateVersion(model, errors, warnings, isV1 ? "1.0" : "2.0");
    this.validateMetadata(model, errors, warnings, isV1 ? "1.0" : "2.0");

    // Transport validation: v1 has transport (legacy), v2 should NOT have transport
    if (isV1) {
      this.validateTransport(model, errors, warnings);
    } else if (isV2) {
      this.validateNoTransport(model, errors, warnings);
    }

    this.validateSections(model, errors, warnings);
    this.validateRoles(model, errors, warnings);
    this.validateProjections(model, errors, warnings);
    this.validateMixGraph(model, errors, warnings);
    this.validateRealizationPolicy(model, errors, warnings);
    this.validateDeterminism(model, errors, warnings);

    // Convert warnings to errors if strict mode
    if (this.options.strict) {
      warnings.forEach((warning) => {
        warning.severity = "error";
      });
      errors.push(...warnings);
      warnings.length = 0;
    }

    const valid = errors.length === 0;
    const complete = this.checkCompleteness(
      model,
      errors,
      isV1 ? "1.0" : "2.0",
    );
    const consistent = this.checkConsistency(model, errors);
    const serializable = this.checkSerialization(model, errors);

    return {
      valid,
      complete,
      consistent,
      serializable,
      errors,
      warnings,
    };
  }

  /**
   * Validate model completeness (all required fields)
   */
  validateComplete(model: any): ValidationResult {
    const result = this.validate(model);
    return {
      ...result,
      complete:
        result.errors.filter((e) => e.message.includes("Missing")).length === 0,
    };
  }

  /**
   * Validate model consistency (no contradictions)
   */
  validateConsistency(model: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    this.checkConsistency(model, errors);

    return {
      valid: errors.length === 0,
      complete: true,
      consistent: errors.length === 0,
      serializable: true,
      errors,
      warnings,
    };
  }

  /**
   * Validate model can be serialized/deserialized
   */
  validateSerialization(model: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    this.checkSerialization(model, errors);

    return {
      valid: errors.length === 0,
      complete: true,
      consistent: true,
      serializable: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate version field
   */
  private validateVersion(
    model: any,
    errors: ValidationError[],
    warnings: ValidationError[],
    expectedVersion: "1.0" | "2.0",
  ): void {
    if (!model.version) {
      errors.push({
        field: "version",
        message: "Missing version",
        severity: "error",
      });
      return;
    }

    if (model.version !== expectedVersion) {
      errors.push({
        field: "version",
        message: `Invalid version: ${model.version}, expected '${expectedVersion}'`,
        severity: "error",
      });
    }
  }

  /**
   * Validate metadata
   */
  private validateMetadata(
    model: any,
    errors: ValidationError[],
    warnings: ValidationError[],
    version: "1.0" | "2.0",
  ): void {
    if (!model.id) {
      errors.push({
        field: "id",
        message: "Missing model id",
        severity: "error",
      });
    }

    if (!model.createdAt) {
      warnings.push({
        field: "createdAt",
        message: "Missing createdAt timestamp",
        severity: "warning",
      });
    }

    if (model.createdAt && typeof model.createdAt !== "number") {
      errors.push({
        field: "createdAt",
        message: "createdAt must be a number (timestamp)",
        severity: "error",
      });
    }

    // v2 requires updatedAt field
    if (version === "2.0" && !model.updatedAt) {
      warnings.push({
        field: "updatedAt",
        message: "SongModel_v2 missing updatedAt timestamp",
        severity: "warning",
      });
    }

    if (
      version === "2.0" &&
      model.updatedAt &&
      typeof model.updatedAt !== "number"
    ) {
      errors.push({
        field: "updatedAt",
        message: "updatedAt must be a number (timestamp)",
        severity: "error",
      });
    }
  }

  /**
   * Validate transport configuration
   */
  private validateTransport(
    model: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!model.transport) {
      errors.push({
        field: "transport",
        message: "Missing transport configuration",
        severity: "error",
      });
      return;
    }

    if (!model.transport.tempoMap) {
      warnings.push({
        field: "transport.tempoMap",
        message: "Missing tempoMap (will use default 120 BPM)",
        severity: "warning",
      });
    }

    if (!model.transport.timeSignatureMap) {
      warnings.push({
        field: "transport.timeSignatureMap",
        message: "Missing timeSignatureMap (will use default 4/4)",
        severity: "warning",
      });
    }

    if (
      model.transport.loopPolicy &&
      typeof model.transport.loopPolicy !== "object"
    ) {
      errors.push({
        field: "transport.loopPolicy",
        message: "loopPolicy must be an object",
        severity: "error",
      });
    }

    // Reject playbackSpeed - it's an execution concern, not musical structure
    // Even in v1, playbackSpeed should not be in transport (architectural principle)
    if (model.transport.playbackSpeed !== undefined) {
      errors.push({
        field: "transport.playbackSpeed",
        message:
          "playbackSpeed is an execution concern, not musical structure (does not belong in SongModel)",
        severity: "error",
      });
    }
  }

  /**
   * Validate NO transport configuration (SongModel_v2 only)
   *
   * Architectural rule: SongModel_v2 should NOT have transport property.
   * Transport is owned by TimelineModel, not SongModel.
   */
  private validateNoTransport(
    model: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (model.transport !== undefined) {
      errors.push({
        field: "transport",
        message:
          "ARCHITECTURE VIOLATION: SongModel_v2 should not have transport property (transport belongs in TimelineModel)",
        severity: "error",
      });
    }

    if (model.playbackSpeed !== undefined) {
      errors.push({
        field: "playbackSpeed",
        message:
          "ARCHITECTURE VIOLATION: SongModel_v2 should not have playbackSpeed (execution concern, not musical structure)",
        severity: "error",
      });
    }
  }

  /**
   * Validate sections
   */
  private validateSections(
    model: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!model.sections) {
      warnings.push({
        field: "sections",
        message: "No sections defined (song will have no structure)",
        severity: "warning",
      });
      return;
    }

    if (!Array.isArray(model.sections)) {
      errors.push({
        field: "sections",
        message: "sections must be an array",
        severity: "error",
      });
      return;
    }

    model.sections.forEach((section: any, index: number) => {
      if (!section.id) {
        errors.push({
          field: `sections[${index}].id`,
          message: `Section ${index} missing id`,
          severity: "error",
        });
      }

      if (!section.start || !section.end) {
        errors.push({
          field: `sections[${index}]`,
          message: `Section ${index} missing start or end time`,
          severity: "error",
        });
      }

      if (
        section.start &&
        section.end &&
        section.start.seconds >= section.end.seconds
      ) {
        errors.push({
          field: `sections[${index}]`,
          message: `Section ${index} has invalid time range (start >= end)`,
          severity: "error",
        });
      }
    });

    // Check for overlapping sections (warning only)
    for (let i = 0; i < model.sections.length; i++) {
      for (let j = i + 1; j < model.sections.length; j++) {
        const sectionA = model.sections[i];
        const sectionB = model.sections[j];

        if (
          sectionA.start?.seconds < sectionB.end?.seconds &&
          sectionA.end?.seconds > sectionB.start?.seconds
        ) {
          warnings.push({
            field: "sections",
            message: `Sections ${i} and ${j} overlap in time`,
            severity: "warning",
          });
        }
      }
    }
  }

  /**
   * Validate roles
   */
  private validateRoles(
    model: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!model.roles || !Array.isArray(model.roles)) {
      errors.push({
        field: "roles",
        message: "Missing or invalid roles array",
        severity: "error",
      });
      return;
    }

    if (model.roles.length === 0) {
      errors.push({
        field: "roles",
        message: "At least one role is required",
        severity: "error",
      });
    }

    const roleIds = new Set<string>();

    model.roles.forEach((role: any, index: number) => {
      if (!role.id) {
        errors.push({
          field: `roles[${index}].id`,
          message: `Role ${index} missing id`,
          severity: "error",
        });
      } else {
        if (roleIds.has(role.id)) {
          errors.push({
            field: `roles[${index}].id`,
            message: `Duplicate role id: ${role.id}`,
            severity: "error",
          });
        }
        roleIds.add(role.id);
      }

      if (!role.type) {
        errors.push({
          field: `roles[${index}].type`,
          message: `Role ${index} missing type`,
          severity: "error",
        });
      }

      const validTypes = [
        "bass",
        "harmony",
        "melody",
        "rhythm",
        "texture",
        "ornament",
        "lead",
        "accompaniment",
        "counter-melody",
      ];

      if (role.type && !validTypes.includes(role.type)) {
        errors.push({
          field: `roles[${index}].type`,
          message: `Invalid role type: ${role.type}`,
          severity: "error",
        });
      }

      if (!role.generatorConfig) {
        warnings.push({
          field: `roles[${index}].generatorConfig`,
          message: `Role ${index} missing generatorConfig`,
          severity: "warning",
        });
      }
    });
  }

  /**
   * Validate projections
   */
  private validateProjections(
    model: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!this.options.checkProjections) {
      return;
    }

    if (!model.projections) {
      warnings.push({
        field: "projections",
        message: "No projections defined (roles will not produce output)",
        severity: "warning",
      });
      return;
    }

    if (!Array.isArray(model.projections)) {
      errors.push({
        field: "projections",
        message: "projections must be an array",
        severity: "error",
      });
      return;
    }

    const roleIds = new Set((model.roles || []).map((r: any) => r.id));

    model.projections.forEach((proj: any, index: number) => {
      if (!proj.id) {
        errors.push({
          field: `projections[${index}].id`,
          message: `Projection ${index} missing id`,
          severity: "error",
        });
      }

      if (!proj.roleId) {
        errors.push({
          field: `projections[${index}].roleId`,
          message: `Projection ${index} missing roleId`,
          severity: "error",
        });
      } else if (roleIds.size > 0 && !roleIds.has(proj.roleId)) {
        errors.push({
          field: `projections[${index}].roleId`,
          message: `Projection ${index} references non-existent role: ${proj.roleId}`,
          severity: "error",
        });
      }

      if (!proj.target) {
        errors.push({
          field: `projections[${index}].target`,
          message: `Projection ${index} missing target`,
          severity: "error",
        });
      }
    });

    // Check if all roles have projections
    if (roleIds.size > 0) {
      const projectedRoleIds = new Set(
        (model.projections || []).map((p: any) => p.roleId),
      );

      roleIds.forEach((roleId) => {
        if (!projectedRoleIds.has(roleId)) {
          warnings.push({
            field: "projections",
            message: `Role ${roleId} has no projection (will not be heard)`,
            severity: "warning",
          });
        }
      });
    }
  }

  /**
   * Validate mix graph
   */
  private validateMixGraph(
    model: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!model.mixGraph) {
      errors.push({
        field: "mixGraph",
        message: "Missing mixGraph",
        severity: "error",
      });
      return;
    }

    if (!model.mixGraph.master) {
      errors.push({
        field: "mixGraph.master",
        message: "Missing master bus configuration",
        severity: "error",
      });
    }

    if (!model.mixGraph.tracks || !Array.isArray(model.mixGraph.tracks)) {
      warnings.push({
        field: "mixGraph.tracks",
        message: "No tracks defined in mix graph",
        severity: "warning",
      });
    }
  }

  /**
   * Validate realization policy
   */
  private validateRealizationPolicy(
    model: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!model.realizationPolicy) {
      errors.push({
        field: "realizationPolicy",
        message: "Missing realizationPolicy",
        severity: "error",
      });
      return;
    }

    if (!model.realizationPolicy.windowSize) {
      warnings.push({
        field: "realizationPolicy.windowSize",
        message: "Missing windowSize (will use default 2.0 seconds)",
        severity: "warning",
      });
    }

    if (!model.realizationPolicy.lookaheadDuration) {
      warnings.push({
        field: "realizationPolicy.lookaheadDuration",
        message: "Missing lookaheadDuration (will use default 0.5 seconds)",
        severity: "warning",
      });
    }

    if (!model.realizationPolicy.determinismMode) {
      warnings.push({
        field: "realizationPolicy.determinismMode",
        message: 'Missing determinismMode (will use default "strict")',
        severity: "warning",
      });
    }

    const validModes = ["strict", "seeded", "loose"];
    if (
      model.realizationPolicy.determinismMode &&
      !validModes.includes(model.realizationPolicy.determinismMode)
    ) {
      errors.push({
        field: "realizationPolicy.determinismMode",
        message: `Invalid determinismMode: ${model.realizationPolicy.determinismMode}`,
        severity: "error",
      });
    }
  }

  /**
   * Validate determinism requirements
   */
  private validateDeterminism(
    model: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!this.options.checkDeterminism) {
      return;
    }

    if (!model.determinismSeed) {
      errors.push({
        field: "determinismSeed",
        message:
          "Missing determinismSeed (required for deterministic event emission)",
        severity: "error",
      });
    } else if (
      typeof model.determinismSeed !== "string" ||
      model.determinismSeed.length === 0
    ) {
      errors.push({
        field: "determinismSeed",
        message: "determinismSeed must be a non-empty string",
        severity: "error",
      });
    }
  }

  /**
   * Check model completeness
   */
  private checkCompleteness(
    model: any,
    errors: ValidationError[],
    version: "1.0" | "2.0",
  ): boolean {
    // Common required fields for both v1 and v2
    const commonFields = [
      "version",
      "id",
      "createdAt",
      "roles",
      "mixGraph",
      "realizationPolicy",
      "determinismSeed",
    ];

    // v1-specific required fields
    const v1Fields = [
      "transport", // v1 has transport (architectural violation tolerated for compatibility)
    ];

    // v2-specific required fields
    const v2Fields = [
      "updatedAt", // v2 has updatedAt
    ];

    const requiredFields = [
      ...commonFields,
      ...(version === "1.0" ? v1Fields : v2Fields),
    ];

    let complete = true;
    requiredFields.forEach((field) => {
      if (!model[field]) {
        complete = false;
      }
    });

    return complete;
  }

  /**
   * Check model consistency
   */
  private checkConsistency(model: any, errors: ValidationError[]): boolean {
    let consistent = true;

    // Check section time ordering
    if (model.sections && Array.isArray(model.sections)) {
      for (let i = 1; i < model.sections.length; i++) {
        const prev = model.sections[i - 1];
        const curr = model.sections[i];

        if (prev.end?.seconds > curr.start?.seconds) {
          errors.push({
            field: "sections",
            message: `Sections out of order: section ${i - 1} ends after section ${i} starts`,
            severity: "error",
          });
          consistent = false;
        }
      }
    }

    // Check tempo map ordering
    if (model.transport?.tempoMap && Array.isArray(model.transport.tempoMap)) {
      for (let i = 1; i < model.transport.tempoMap.length; i++) {
        const prev = model.transport.tempoMap[i - 1];
        const curr = model.transport.tempoMap[i];

        if (prev.time.seconds >= curr.time.seconds) {
          errors.push({
            field: "transport.tempoMap",
            message: `Tempo map out of order at index ${i}`,
            severity: "error",
          });
          consistent = false;
        }
      }
    }

    return consistent;
  }

  /**
   * Check model can be serialized
   */
  private checkSerialization(model: any, errors: ValidationError[]): boolean {
    try {
      // Try to serialize
      const json = JSON.stringify(model);

      // Try to deserialize
      const parsed = JSON.parse(json);

      // Check that critical fields survived
      if (parsed.version !== model.version) {
        errors.push({
          field: "serialization",
          message: "Version field did not survive round-trip",
          severity: "error",
        });
        return false;
      }

      if (parsed.id !== model.id) {
        errors.push({
          field: "serialization",
          message: "ID field did not survive round-trip",
          severity: "error",
        });
        return false;
      }

      if (parsed.determinismSeed !== model.determinismSeed) {
        errors.push({
          field: "serialization",
          message: "Determinism seed did not survive round-trip",
          severity: "error",
        });
        return false;
      }

      return true;
    } catch (error) {
      errors.push({
        field: "serialization",
        message: `Serialization failed: ${error}`,
        severity: "error",
      });
      return false;
    }
  }
}

/**
 * Factory function for convenient validation
 */
export function validateSongModel(
  model: any,
  options?: ValidationOptions,
): ValidationResult {
  const validator = new SongModelValidator(options);
  return validator.validate(model);
}

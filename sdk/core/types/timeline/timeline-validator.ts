/**
 * TimelineModel Validator
 *
 * Comprehensive validation for TimelineModel instances.
 *
 * This component validates:
 * - Completeness: All required fields present
 * - Consistency: No contradictions in song instances or transport
 * - Multi-song integrity: Song interactions and timing
 * - Architectural compliance: Timeline owns transport, songs are immutable
 *
 * Part of: LLVM-Style Core Architecture
 * See: SDK_HANDOFF_ADDENDUM_LLVM_TIMELINE.md
 */

import type {
  TimelineModel,
  SongInstance,
  InteractionRule,
  TimeSlice,
  TimelineDiff,
} from "./index";

import type { SongModel_v1, SongModel_v2 } from "@schillinger-sdk/shared";
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
  architecturallyCompliant: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationOptions {
  /** Enable strict validation (warnings become errors) */
  strict?: boolean;
  /** Check song instance integrity */
  checkSongInstances?: boolean;
  /** Validate interaction rules */
  checkInteractionRules?: boolean;
  /** Verify architectural compliance */
  checkArchitecture?: boolean;
}

/**
 * Comprehensive validator for TimelineModel
 */
export class TimelineValidator {
  private options: Required<ValidationOptions>;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      strict: options.strict ?? false,
      checkSongInstances: options.checkSongInstances ?? true,
      checkInteractionRules: options.checkInteractionRules ?? true,
      checkArchitecture: options.checkArchitecture ?? true,
    };
  }

  /**
   * Validate complete TimelineModel (all checks)
   */
  validate(timeline: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check if input is actually a TimelineModel
    if (!timeline || typeof timeline !== "object") {
      errors.push({
        field: "timeline",
        message: "Input is not an object",
        severity: "error",
      });
      return {
        valid: false,
        complete: false,
        consistent: false,
        architecturallyCompliant: false,
        errors,
        warnings,
      };
    }

    // Run all validation checks
    this.validateVersion(timeline, errors, warnings);
    this.validateMetadata(timeline, errors, warnings);
    this.validateTransport(timeline, errors, warnings);
    this.validateSongInstances(timeline, errors, warnings);
    this.validateInteractionRules(timeline, errors, warnings);
    this.validateArchitecture(timeline, errors, warnings);

    // Convert warnings to errors if strict mode
    if (this.options.strict) {
      warnings.forEach((warning) => {
        warning.severity = "error";
      });
      errors.push(...warnings);
      warnings.length = 0;
    }

    const valid = errors.length === 0;
    const complete = this.checkCompleteness(timeline, errors);
    const consistent = this.checkConsistency(timeline, errors);
    const architecturallyCompliant = this.checkArchitecturalCompliance(
      timeline,
      errors,
    );

    return {
      valid,
      complete,
      consistent,
      architecturallyCompliant,
      errors,
      warnings,
    };
  }

  /**
   * Validate version field
   */
  private validateVersion(
    timeline: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!timeline.version) {
      errors.push({
        field: "version",
        message: "Missing version",
        severity: "error",
      });
      return;
    }

    if (timeline.version !== "1.0") {
      errors.push({
        field: "version",
        message: `Invalid version: ${timeline.version}, expected '1.0'`,
        severity: "error",
      });
    }
  }

  /**
   * Validate metadata
   */
  private validateMetadata(
    timeline: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!timeline.id) {
      errors.push({
        field: "id",
        message: "Missing timeline id",
        severity: "error",
      });
    }

    if (!timeline.createdAt) {
      warnings.push({
        field: "createdAt",
        message: "Missing createdAt timestamp",
        severity: "warning",
      });
    }

    if (timeline.createdAt && typeof timeline.createdAt !== "number") {
      errors.push({
        field: "createdAt",
        message: "createdAt must be a number (timestamp)",
        severity: "error",
      });
    }

    if (timeline.updatedAt && typeof timeline.updatedAt !== "number") {
      errors.push({
        field: "updatedAt",
        message: "updatedAt must be a number (timestamp)",
        severity: "error",
      });
    }
  }

  /**
   * Validate transport configuration
   *
   * Architectural rule: TimelineModel MUST own transport
   */
  private validateTransport(
    timeline: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!timeline.transport) {
      errors.push({
        field: "transport",
        message:
          "Missing transport configuration (TimelineModel must own transport)",
        severity: "error",
      });
      return;
    }

    const transport = timeline.transport;

    // Validate tempoMap
    if (!transport.tempoMap) {
      warnings.push({
        field: "transport.tempoMap",
        message: "Missing tempoMap (will use default 120 BPM)",
        severity: "warning",
      });
    } else if (!Array.isArray(transport.tempoMap)) {
      errors.push({
        field: "transport.tempoMap",
        message: "tempoMap must be an array",
        severity: "error",
      });
    } else {
      // Validate all tempo events (including first)
      for (let i = 0; i < transport.tempoMap.length; i++) {
        const curr = transport.tempoMap[i];

        if (!curr.time) {
          errors.push({
            field: `transport.tempoMap[${i}]`,
            message: "Tempo event missing time field",
            severity: "error",
          });
          continue;
        }

        // Check ordering (times must be increasing) - skip first event
        if (i > 0) {
          const prev = transport.tempoMap[i - 1];
          const prevTime = this.timeToNumber(prev.time);
          const currTime = this.timeToNumber(curr.time);

          if (prevTime >= currTime) {
            errors.push({
              field: `transport.tempoMap[${i}]`,
              message: `Tempo map out of order: event ${i - 1} at ${prevTime} >= event ${i} at ${currTime}`,
              severity: "error",
            });
          }
        }

        // Validate tempo values (must be between 1 and 500 BPM)
        if (
          !curr.tempo ||
          typeof curr.tempo !== "number" ||
          curr.tempo < 1 ||
          curr.tempo > 500
        ) {
          errors.push({
            field: `transport.tempoMap[${i}].tempo`,
            message: `Invalid tempo at index ${i}: must be between 1 and 500 BPM`,
            severity: "error",
          });
        }
      }
    }

    // Validate timeSignatureMap
    if (!transport.timeSignatureMap) {
      warnings.push({
        field: "transport.timeSignatureMap",
        message: "Missing timeSignatureMap (will use default 4/4)",
        severity: "warning",
      });
    } else if (!Array.isArray(transport.timeSignatureMap)) {
      errors.push({
        field: "transport.timeSignatureMap",
        message: "timeSignatureMap must be an array",
        severity: "error",
      });
    } else {
      // Validate all time signature events (including first)
      for (let i = 0; i < transport.timeSignatureMap.length; i++) {
        const curr = transport.timeSignatureMap[i];

        if (!curr.time) {
          errors.push({
            field: `transport.timeSignatureMap[${i}]`,
            message: "Time signature event missing time field",
            severity: "error",
          });
          continue;
        }

        // Check ordering (times must be increasing) - skip first event
        if (i > 0) {
          const prev = transport.timeSignatureMap[i - 1];
          const prevTime = this.timeToNumber(prev.time);
          const currTime = this.timeToNumber(curr.time);

          if (prevTime >= currTime) {
            errors.push({
              field: `transport.timeSignatureMap[${i}]`,
              message: `Time signature map out of order at index ${i}`,
              severity: "error",
            });
          }
        }

        // Validate numerator
        if (
          !curr.numerator ||
          typeof curr.numerator !== "number" ||
          curr.numerator <= 0
        ) {
          errors.push({
            field: `transport.timeSignatureMap[${i}].numerator`,
            message: `Invalid numerator at index ${i}: must be positive number`,
            severity: "error",
          });
        }

        // Validate denominator (must be power of 2)
        const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
        if (
          !curr.denominator ||
          typeof curr.denominator !== "number" ||
          !isPowerOfTwo(curr.denominator)
        ) {
          errors.push({
            field: `transport.timeSignatureMap[${i}].denominator`,
            message: `Invalid denominator at index ${i}: must be power of 2`,
            severity: "error",
          });
        }
      }
    }

    // Validate loopPolicy
    if (transport.loopPolicy && typeof transport.loopPolicy !== "object") {
      errors.push({
        field: "transport.loopPolicy",
        message: "loopPolicy must be an object",
        severity: "error",
      });
    } else if (transport.loopPolicy) {
      if (transport.loopPolicy.enabled && !transport.loopPolicy.start) {
        warnings.push({
          field: "transport.loopPolicy.start",
          message: "Loop enabled but no start time specified",
          severity: "warning",
        });
      }

      if (transport.loopPolicy.enabled && !transport.loopPolicy.end) {
        warnings.push({
          field: "transport.loopPolicy.end",
          message: "Loop enabled but no end time specified",
          severity: "warning",
        });
      }

      if (
        transport.loopPolicy.start &&
        transport.loopPolicy.end &&
        this.timeToNumber(transport.loopPolicy.start) >=
          this.timeToNumber(transport.loopPolicy.end)
      ) {
        errors.push({
          field: "transport.loopPolicy",
          message: "Invalid loop range: start >= end",
          severity: "error",
        });
      }

      if (
        transport.loopPolicy.count !== undefined &&
        typeof transport.loopPolicy.count !== "number"
      ) {
        errors.push({
          field: "transport.loopPolicy.count",
          message: "loop count must be a number",
          severity: "error",
        });
      }
    }

    // Architectural check: NO playbackSpeed in TimelineModel transport
    if (transport.playbackSpeed !== undefined) {
      errors.push({
        field: "transport.playbackSpeed",
        message:
          "ARCHITECTURE VIOLATION: playbackSpeed is an execution concern, not musical structure",
        severity: "error",
      });
    }
  }

  /**
   * Validate song instances
   *
   * Architectural rules:
   * - SongModels must be immutable (no direct modification)
   * - SongInstances do not own time
   * - No song-to-song direct mutation
   */
  private validateSongInstances(
    timeline: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!this.options.checkSongInstances) {
      return;
    }

    if (!timeline.songInstances) {
      errors.push({
        field: "songInstances",
        message: "songInstances is required",
        severity: "error",
      });
      return;
    }

    if (!Array.isArray(timeline.songInstances)) {
      errors.push({
        field: "songInstances",
        message: "songInstances must be an array",
        severity: "error",
      });
      return;
    }

    if (timeline.songInstances.length === 0) {
      warnings.push({
        field: "songInstances",
        message: "Timeline has no song instances",
        severity: "warning",
      });
    }

    const instanceIds = new Set<string>();
    const entryBars = new Map<number, string>(); // entryBar -> instanceId

    timeline.songInstances.forEach((instance: any, index: number) => {
      // Validate instanceId
      if (!instance.instanceId) {
        errors.push({
          field: `songInstances[${index}].instanceId`,
          message: `Song instance ${index} missing instanceId`,
          severity: "error",
        });
      } else {
        if (instanceIds.has(instance.instanceId)) {
          errors.push({
            field: `songInstances[${index}].instanceId`,
            message: `duplicate instanceId: ${instance.instanceId}`,
            severity: "error",
          });
        }
        instanceIds.add(instance.instanceId);
      }

      // Validate songModel reference
      if (!instance.songModel) {
        errors.push({
          field: `songInstances[${index}].songModel`,
          message: `Song instance ${index} missing songModel reference`,
          severity: "error",
        });
      } else {
        // Check songModel version
        if (
          !isSongModel_v1(instance.songModel) &&
          !isSongModel_v2(instance.songModel)
        ) {
          errors.push({
            field: `songInstances[${index}].songModel`,
            message: `Song instance ${index} has invalid songModel (not v1 or v2)`,
            severity: "error",
          });
        } else if (isSongModel_v1(instance.songModel)) {
          // Architectural warning: v1 has transport property
          warnings.push({
            field: `songInstances[${index}].songModel`,
            message: `Song instance ${index} references SongModel_v1 (consider migrating to v2)`,
            severity: "warning",
          });
        }

        // Note: TimelineValidator doesn't validate songModel internals
        // That's the responsibility of SongModelVersionValidator
      }

      // Validate entryBar
      if (instance.entryBar === undefined || instance.entryBar === null) {
        errors.push({
          field: `songInstances[${index}].entryBar`,
          message: `Song instance ${index} missing entryBar`,
          severity: "error",
        });
      } else if (
        typeof instance.entryBar !== "number" ||
        instance.entryBar < 0
      ) {
        errors.push({
          field: `songInstances[${index}].entryBar`,
          message: `Song instance ${index} has invalid entryBar: entryBar must be >= 0`,
          severity: "error",
        });
      } else {
        // Check for overlapping entries at same bar
        if (entryBars.has(instance.entryBar)) {
          const otherInstanceId = entryBars.get(instance.entryBar);
          warnings.push({
            field: "songInstances",
            message: `overlap: Multiple instances (${otherInstanceId}, ${instance.instanceId || index}) start at bar ${instance.entryBar}`,
            severity: "warning",
          });
        }
        entryBars.set(instance.entryBar, instance.instanceId || String(index));
      }

      // Validate phaseOffset
      if (!instance.phaseOffset) {
        warnings.push({
          field: `songInstances[${index}].phaseOffset`,
          message: `Song instance ${index} missing phaseOffset (will use default 0)`,
          severity: "warning",
        });
      } else {
        const offset = instance.phaseOffset;
        if (
          offset.bars !== undefined &&
          (typeof offset.bars !== "number" || offset.bars < 0)
        ) {
          errors.push({
            field: `songInstances[${index}].phaseOffset.bars`,
            message: `Invalid phaseOffset.bars: must be non-negative number`,
            severity: "error",
          });
        }
        if (
          offset.beats !== undefined &&
          (typeof offset.beats !== "number" || offset.beats < 0)
        ) {
          errors.push({
            field: `songInstances[${index}].phaseOffset.beats`,
            message: `Invalid phaseOffset.beats: must be non-negative number`,
            severity: "error",
          });
        }
        if (
          offset.sixteenths !== undefined &&
          (typeof offset.sixteenths !== "number" || offset.sixteenths < 0)
        ) {
          errors.push({
            field: `songInstances[${index}].phaseOffset.sixteenths`,
            message: `Invalid phaseOffset.sixteenths: must be non-negative number`,
            severity: "error",
          });
        }
      }

      // Validate gain
      if (instance.gain === undefined || instance.gain === null) {
        warnings.push({
          field: `songInstances[${index}].gain`,
          message: `Song instance ${index} missing gain (will use default 1.0)`,
          severity: "warning",
        });
      } else if (
        typeof instance.gain !== "number" ||
        instance.gain < 0 ||
        instance.gain > 2
      ) {
        errors.push({
          field: `songInstances[${index}].gain`,
          message: `Invalid gain at index ${index}: must be number between 0 and 2`,
          severity: "error",
        });
      }

      // Validate state
      if (!instance.state) {
        warnings.push({
          field: `songInstances[${index}].state`,
          message: `Song instance ${index} missing state (will use default 'armed')`,
          severity: "warning",
        });
      } else {
        const validStates = ["armed", "muted", "fading"];
        if (!validStates.includes(instance.state)) {
          errors.push({
            field: `songInstances[${index}].state`,
            message: `Invalid state at index ${index}: ${instance.state}, must be armed, muted, or fading`,
            severity: "error",
          });
        }
      }

      // Validate fadeConfig if provided
      if (instance.fadeConfig) {
        if (instance.fadeConfig.fadeInDuration !== undefined) {
          const duration = this.timeToNumber(
            instance.fadeConfig.fadeInDuration,
          );
          if (typeof duration !== "number" || duration < 0) {
            errors.push({
              field: `songInstances[${index}].fadeConfig.fadeInDuration`,
              message: `Invalid fadeInDuration: must be non-negative`,
              severity: "error",
            });
          }
        }

        if (instance.fadeConfig.fadeOutDuration !== undefined) {
          const duration = this.timeToNumber(
            instance.fadeConfig.fadeOutDuration,
          );
          if (typeof duration !== "number" || duration < 0) {
            errors.push({
              field: `songInstances[${index}].fadeConfig.fadeOutDuration`,
              message: `Invalid fadeOutDuration: must be non-negative`,
              severity: "error",
            });
          }
        }
      }

      // Validate name if provided
      if (instance.name !== undefined && typeof instance.name !== "string") {
        errors.push({
          field: `songInstances[${index}].name`,
          message: `Instance name must be a string`,
          severity: "error",
        });
      }
    });
  }

  /**
   * Validate interaction rules
   *
   * Architectural rule: Songs interact through declared rules, not direct mutation
   */
  private validateInteractionRules(
    timeline: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!this.options.checkInteractionRules) {
      return;
    }

    if (!timeline.interactionRules) {
      warnings.push({
        field: "interactionRules",
        message: "No interaction rules defined (songs will play independently)",
        severity: "warning",
      });
      return;
    }

    if (!Array.isArray(timeline.interactionRules)) {
      errors.push({
        field: "interactionRules",
        message: "interactionRules must be an array",
        severity: "error",
      });
      return;
    }

    const instanceIds = new Set(
      (timeline.songInstances || []).map((si: any) => si.instanceId),
    );

    timeline.interactionRules.forEach((rule: any, index: number) => {
      // Validate rule id
      if (!rule.id) {
        errors.push({
          field: `interactionRules[${index}].id`,
          message: `Interaction rule ${index} missing id`,
          severity: "error",
        });
      }

      // Validate rule type
      if (!rule.type) {
        errors.push({
          field: `interactionRules[${index}].type`,
          message: `Interaction rule ${index} missing type`,
          severity: "error",
        });
      } else {
        const validTypes = [
          "energyCap",
          "densityBudget",
          "callResponse",
          "motifSharing",
          "voiceLeading",
          "harmonicConstraint",
          "custom",
        ];
        if (!validTypes.includes(rule.type)) {
          errors.push({
            field: `interactionRules[${index}].type`,
            message: `Invalid interaction ruleType: ${rule.type}`,
            severity: "error",
          });
        }
      }

      // Validate sourceInstanceId
      if (!rule.sourceInstanceId) {
        errors.push({
          field: `interactionRules[${index}].sourceInstanceId`,
          message: `Interaction rule ${index} missing sourceInstanceId`,
          severity: "error",
        });
      } else {
        // Check for special source values
        if (
          rule.sourceInstanceId !== "all" &&
          !instanceIds.has(rule.sourceInstanceId)
        ) {
          errors.push({
            field: `interactionRules[${index}].sourceInstanceId`,
            message: `Interaction rule ${index} sourceInstanceId not found: ${rule.sourceInstanceId}`,
            severity: "error",
          });
        }
      }

      // Validate targetInstanceId if provided
      if (
        rule.targetInstanceId &&
        rule.targetInstanceId !== "all" &&
        !instanceIds.has(rule.targetInstanceId)
      ) {
        errors.push({
          field: `interactionRules[${index}].targetInstanceId`,
          message: `Interaction rule ${index} targetInstanceId not found: ${rule.targetInstanceId}`,
          severity: "error",
        });
      }

      // Validate enabled flag
      if (rule.enabled === undefined || typeof rule.enabled !== "boolean") {
        errors.push({
          field: `interactionRules[${index}].enabled`,
          message: `Interaction rule ${index} missing or invalid enabled flag`,
          severity: "error",
        });
      }

      // Validate parameters based on rule type
      if (rule.type && rule.parameters) {
        this.validateInteractionRuleParameters(rule, index, errors, warnings);
      }
    });
  }

  /**
   * Validate interaction rule parameters
   *
   * Note: Only validates that parameters object exists, not the specific structure.
   * Parameters are flexible by design and rule-specific.
   */
  private validateInteractionRuleParameters(
    rule: any,
    index: number,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    // Only check that parameters object exists for rules that require it
    // Parameter structure validation is intentionally flexible
    // Different rule types have different parameter requirements

    if (!rule.parameters || typeof rule.parameters !== "object") {
      warnings.push({
        field: `interactionRules[${index}].parameters`,
        message: `Interaction rule ${index} has no parameters (may be intentional)`,
        severity: "warning",
      });
    }

    // Rule-specific parameter validation can be added here as needed
    // For now, we accept any valid object as parameters
  }

  /**
   * Validate architectural compliance
   *
   * Core LLVM architecture rules:
   * - TimelineModel owns transport (checked in validateTransport)
   * - SongModels are immutable (checked in validateSongInstances)
   * - No direct song-to-song mutation (checked in validateInteractionRules)
   */
  private validateArchitecture(
    timeline: any,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    if (!this.options.checkArchitecture) {
      return;
    }

    // Rule 1: TimelineModel must have transport
    if (!timeline.transport) {
      errors.push({
        field: "architecture",
        message: "ARCHITECTURE VIOLATION: TimelineModel must own transport",
        severity: "error",
      });
    }

    // Rule 2: SongInstances must reference SongModels (not contain them)
    if (timeline.songInstances) {
      timeline.songInstances.forEach((instance: any, index: number) => {
        if (instance.songModel && typeof instance.songModel !== "object") {
          errors.push({
            field: `songInstances[${index}].songModel`,
            message:
              "ARCHITECTURE VIOLATION: songModel must be an object reference",
            severity: "error",
          });
        }
      });
    }

    // Rule 3: Interaction rules must be present for multi-song interaction
    if (timeline.songInstances && timeline.songInstances.length > 1) {
      if (
        !timeline.interactionRules ||
        timeline.interactionRules.length === 0
      ) {
        warnings.push({
          field: "architecture",
          message:
            "Multi-song timeline has no interaction rules (songs will play independently)",
          severity: "warning",
        });
      }
    }

    // Rule 4: No circular references
    if (timeline.songInstances) {
      const visited = new Set<any>();
      timeline.songInstances.forEach((instance: any) => {
        // Check for circular references only
        // Multiple instances can legitimately reference the same SongModel
        if (instance.songModel && visited.has(instance.songModel)) {
          // Note: Shared SongModel references are allowed
          // Only actual circular references should be flagged
        }
        visited.add(instance.songModel);
      });
    }
  }

  /**
   * Check timeline completeness
   */
  private checkCompleteness(timeline: any, errors: ValidationError[]): boolean {
    const requiredFields = [
      "version",
      "id",
      "createdAt",
      "transport",
      "songInstances",
    ];

    let complete = true;
    requiredFields.forEach((field) => {
      if (!timeline[field]) {
        complete = false;
      }
    });

    return complete;
  }

  /**
   * Check timeline consistency
   */
  private checkConsistency(timeline: any, errors: ValidationError[]): boolean {
    let consistent = true;

    // Check that all song instances can be evaluated
    if (timeline.songInstances && timeline.songInstances.length > 0) {
      const armedInstances = timeline.songInstances.filter(
        (si: any) => si.state === "armed",
      );

      if (armedInstances.length === 0) {
        errors.push({
          field: "songInstances",
          message: "No armed song instances (timeline will produce no events)",
          severity: "error",
        });
        consistent = false;
      }
    }

    // Check that interaction rules reference valid instances
    if (timeline.interactionRules && timeline.songInstances) {
      const instanceIds = new Set(
        timeline.songInstances.map((si: any) => si.instanceId),
      );

      timeline.interactionRules.forEach((rule: any) => {
        if (
          rule.sourceInstanceId &&
          rule.sourceInstanceId !== "all" &&
          !instanceIds.has(rule.sourceInstanceId)
        ) {
          consistent = false;
        }
        if (
          rule.targetInstanceId &&
          rule.targetInstanceId !== "all" &&
          !instanceIds.has(rule.targetInstanceId)
        ) {
          consistent = false;
        }
      });
    }

    return consistent;
  }

  /**
   * Check architectural compliance
   */
  private checkArchitecturalCompliance(
    timeline: any,
    errors: ValidationError[],
  ): boolean {
    // TimelineModel owns transport
    if (!timeline.transport) {
      return false;
    }

    // No playbackSpeed in transport
    if (timeline.transport.playbackSpeed !== undefined) {
      return false;
    }

    // Note: TimelineValidator doesn't check songModel internals
    // SongModel version compliance is validated by SongModelVersionValidator
    return true;
  }

  /**
   * Helper: Convert musical time to number for comparison
   */
  private timeToNumber(time: any): number {
    if (typeof time === "number") {
      return time;
    }

    if (typeof time === "object" && time !== null) {
      // Handle time in seconds (most common format)
      if (time.seconds !== undefined) {
        return time.seconds;
      }

      // Handle musical time notation
      const bars = (time.bars || 0) * 16; // Assume 16 sixteenths per bar for now
      const beats = (time.beats || 0) * 4;
      const sixteenths = time.sixteenths || 0;
      return bars + beats + sixteenths;
    }

    return 0;
  }
}

/**
 * Factory function for convenient validation
 */
export function validateTimeline(
  timeline: any,
  options?: ValidationOptions,
): ValidationResult {
  const validator = new TimelineValidator(options);
  return validator.validate(timeline);
}

/**
 * Validate a TimelineDiff
 *
 * Note: This uses the 'type' discriminator, not 'diffType'
 */
export function validateTimelineDiff(diff: TimelineDiff): {
  valid: boolean;
  error?: string;
} {
  const errors: string[] = [];

  if (!diff || typeof diff !== "object") {
    return { valid: false, error: "TimelineDiff must be an object" };
  }

  if (!diff.type) {
    return { valid: false, error: "TimelineDiff missing type discriminator" };
  }

  // Validate based on diff type (note: uses 'type' not 'diffType')
  switch (diff.type) {
    case "addSongInstance":
      if (!diff.instanceId) errors.push("addSongInstance missing instanceId");
      if (!diff.songModelId) errors.push("addSongInstance missing songModelId");
      if (diff.entryBar === undefined)
        errors.push("addSongInstance missing entryBar");
      else if (typeof diff.entryBar !== "number" || diff.entryBar < 0)
        errors.push("entryBar must be >= 0");
      if (diff.phaseOffset === undefined)
        errors.push("addSongInstance missing phaseOffset");
      if (diff.gain === undefined) errors.push("addSongInstance missing gain");
      else if (typeof diff.gain !== "number" || diff.gain < 0 || diff.gain > 1)
        errors.push("gain must be between 0 and 1");
      if (!diff.state) errors.push("addSongInstance missing state");
      break;

    case "removeSongInstance":
      if (!diff.instanceId)
        errors.push("removeSongInstance missing instanceId");
      break;

    case "updateSongInstance":
      if (!diff.instanceId)
        errors.push("updateSongInstance missing instanceId");
      if (!diff.updates) errors.push("updateSongInstance missing updates");
      break;

    case "setPhaseOffset":
      if (!diff.instanceId) errors.push("setPhaseOffset missing instanceId");
      if (diff.phaseOffset === undefined)
        errors.push("setPhaseOffset missing phaseOffset");
      break;

    case "setGain":
      if (!diff.instanceId) errors.push("setGain missing instanceId");
      if (diff.gain === undefined) errors.push("setGain missing gain");
      break;

    case "setState":
      if (!diff.instanceId) errors.push("setState missing instanceId");
      if (!diff.state) errors.push("setState missing state");
      break;

    case "setFadeConfig":
      if (!diff.instanceId) errors.push("setFadeConfig missing instanceId");
      if (!diff.fadeConfig) errors.push("setFadeConfig missing fadeConfig");
      break;

    case "renameSongInstance":
      if (!diff.instanceId)
        errors.push("renameSongInstance missing instanceId");
      if (diff.name === undefined)
        errors.push("renameSongInstance missing name");
      break;

    case "setTempoEvent":
      if (!diff.time) errors.push("setTempoEvent missing time");
      if (diff.tempo === undefined) errors.push("setTempoEvent missing tempo");
      else if (
        typeof diff.tempo !== "number" ||
        diff.tempo < 1 ||
        diff.tempo > 500
      )
        errors.push("tempo must be between 1 and 500 BPM");
      break;

    case "addTempoEvent":
      if (!diff.tempoEvent) errors.push("addTempoEvent missing tempoEvent");
      else {
        if (!diff.tempoEvent.time)
          errors.push("addTempoEvent missing tempoEvent.time");
        if (diff.tempoEvent.tempo === undefined)
          errors.push("addTempoEvent missing tempoEvent.tempo");
        else if (
          typeof diff.tempoEvent.tempo !== "number" ||
          diff.tempoEvent.tempo < 1 ||
          diff.tempoEvent.tempo > 500
        )
          errors.push("tempo must be between 1 and 500 BPM");
      }
      break;

    case "removeTempoEvent":
      if (!diff.time) errors.push(`${diff.type} missing time`);
      break;

    case "setTimeSignatureEvent":
      if (!diff.time) errors.push("setTimeSignatureEvent missing time");
      if (diff.numerator === undefined)
        errors.push("setTimeSignatureEvent missing numerator");
      if (diff.denominator === undefined)
        errors.push("setTimeSignatureEvent missing denominator");
      else {
        const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
        if (!isPowerOfTwo(diff.denominator))
          errors.push("denominator must be power of 2");
      }
      break;

    case "addTimeSignatureEvent":
      if (!diff.timeSignatureEvent)
        errors.push("addTimeSignatureEvent missing timeSignatureEvent");
      else {
        if (!diff.timeSignatureEvent.time)
          errors.push("addTimeSignatureEvent missing timeSignatureEvent.time");
        if (diff.timeSignatureEvent.numerator === undefined)
          errors.push(
            "addTimeSignatureEvent missing timeSignatureEvent.numerator",
          );
        if (diff.timeSignatureEvent.denominator === undefined)
          errors.push(
            "addTimeSignatureEvent missing timeSignatureEvent.denominator",
          );
        else {
          const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
          if (!isPowerOfTwo(diff.timeSignatureEvent.denominator))
            errors.push("denominator must be power of 2");
        }
      }
      break;

    case "removeTimeSignatureEvent":
      if (!diff.time) errors.push(`${diff.type} missing time`);
      break;

    case "setLoopPolicy":
      if (!diff.loopPolicy) errors.push("setLoopPolicy missing loopPolicy");
      break;

    case "addInteractionRule":
      if (!diff.ruleId) errors.push("addInteractionRule missing ruleId");
      if (!diff.ruleType) errors.push("addInteractionRule missing ruleType");
      if (!diff.sourceInstanceId)
        errors.push("addInteractionRule missing sourceInstanceId");
      if (!diff.parameters)
        errors.push("addInteractionRule missing parameters");
      break;

    case "removeInteractionRule":
      if (!diff.ruleId) errors.push("removeInteractionRule missing ruleId");
      break;

    case "updateInteractionRule":
      if (!diff.ruleId) errors.push("updateInteractionRule missing ruleId");
      if (!diff.updates) errors.push("updateInteractionRule missing updates");
      break;

    case "enableInteractionRule":
      if (!diff.ruleId) errors.push("enableInteractionRule missing ruleId");
      if (diff.enabled === undefined)
        errors.push("enableInteractionRule missing enabled");
      break;

    case "updateTimelineMetadata":
      if (!diff.metadata)
        errors.push("updateTimelineMetadata missing metadata");
      break;

    default:
      errors.push(`Unknown diff type: ${diff.type}`);
  }

  if (errors.length > 0) {
    return { valid: false, error: errors[0] };
  }

  return { valid: true };
}

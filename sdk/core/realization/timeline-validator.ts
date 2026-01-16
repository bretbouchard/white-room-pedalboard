/**
 * TimelineModelValidator - validates TimelineModel instances
 */
import type {
  TimelineModel,
  TimelineTransportConfig,
  TimeSlice,
} from "../types/timeline/timeline-model";

export interface TimelineValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface TimelineValidationResult {
  valid: boolean;
  errors: TimelineValidationError[];
  warnings: TimelineValidationError[];
}

export function validateTimelineModel(model: any): TimelineValidationResult {
  const errors: TimelineValidationError[] = [];
  const warnings: TimelineValidationError[] = [];

  if (!model || typeof model !== "object") {
    errors.push({
      field: "model",
      message: "Not an object",
      severity: "error",
    });
    return { valid: false, errors, warnings };
  }

  // Version and ids
  if (model.version !== "1.0") {
    errors.push({
      field: "version",
      message: "TimelineModel.version must be '1.0'",
      severity: "error",
    });
  }
  if (!model.id) {
    errors.push({ field: "id", message: "Missing id", severity: "error" });
  }
  if (typeof model.createdAt !== "number") {
    warnings.push({
      field: "createdAt",
      message: "createdAt should be a number timestamp",
      severity: "warning",
    });
  }
  if (typeof model.updatedAt !== "number") {
    warnings.push({
      field: "updatedAt",
      message: "updatedAt should be a number timestamp",
      severity: "warning",
    });
  }

  // Transport
  const t: TimelineTransportConfig = model.transport;
  if (!t || typeof t !== "object") {
    errors.push({
      field: "transport",
      message: "Missing transport",
      severity: "error",
    });
  } else {
    if (!Array.isArray(t.tempoMap)) {
      warnings.push({
        field: "transport.tempoMap",
        message: "tempoMap should be an array",
        severity: "warning",
      });
    }
    if (!Array.isArray(t.timeSignatureMap)) {
      warnings.push({
        field: "transport.timeSignatureMap",
        message: "timeSignatureMap should be an array",
        severity: "warning",
      });
    }
    if (!t.loopPolicy || typeof t.loopPolicy !== "object") {
      warnings.push({
        field: "transport.loopPolicy",
        message: "loopPolicy should be an object",
        severity: "warning",
      });
    }
  }

  // Song instances
  if (!Array.isArray(model.songInstances)) {
    errors.push({
      field: "songInstances",
      message: "songInstances must be an array",
      severity: "error",
    });
  } else {
    model.songInstances.forEach((si: any, i: number) => {
      if (!si.instanceId) {
        errors.push({
          field: `songInstances[${i}].instanceId`,
          message: "Missing instanceId",
          severity: "error",
        });
      }
      if (!si.songModel) {
        errors.push({
          field: `songInstances[${i}].songModel`,
          message: "Missing songModel",
          severity: "error",
        });
      }
      if (typeof si.entryBar !== "number" || si.entryBar < 0) {
        errors.push({
          field: `songInstances[${i}].entryBar`,
          message: "entryBar must be >= 0",
          severity: "error",
        });
      }
      if (typeof si.gain !== "number" || si.gain < 0 || si.gain > 1) {
        errors.push({
          field: `songInstances[${i}].gain`,
          message: "gain must be 0..1",
          severity: "error",
        });
      }
      if (!["armed", "muted", "fading"].includes(si.state)) {
        errors.push({
          field: `songInstances[${i}].state`,
          message: "state must be 'armed' | 'muted' | 'fading'",
          severity: "error",
        });
      }
    });
  }

  // Interaction rules
  if (!Array.isArray(model.interactionRules)) {
    warnings.push({
      field: "interactionRules",
      message: "interactionRules should be an array",
      severity: "warning",
    });
  } else {
    model.interactionRules.forEach((rule: any, i: number) => {
      if (!rule.id) {
        errors.push({
          field: `interactionRules[${i}].id`,
          message: "Missing id",
          severity: "error",
        });
      }
      if (!rule.type) {
        errors.push({
          field: `interactionRules[${i}].type`,
          message: "Missing type",
          severity: "error",
        });
      }
      if (!rule.sourceInstanceId) {
        errors.push({
          field: `interactionRules[${i}].sourceInstanceId`,
          message: "Missing sourceInstanceId",
          severity: "error",
        });
      }
      if (rule.enabled !== true && rule.enabled !== false) {
        warnings.push({
          field: `interactionRules[${i}].enabled`,
          message: "enabled should be boolean",
          severity: "warning",
        });
      }
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateTimeSlice(slice: TimeSlice): TimelineValidationResult {
  const errors: TimelineValidationError[] = [];
  const warnings: TimelineValidationError[] = [];
  if (!slice || typeof slice !== "object") {
    errors.push({
      field: "slice",
      message: "Not an object",
      severity: "error",
    });
  }
  return { valid: errors.length === 0, errors, warnings };
}

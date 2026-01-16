/**
 * ConstraintIR - Deterministic Conflict Resolution
 *
 * Represents rules that limit or guide behavior, with priority and authority.
 *
 * Once you have scenes, multiple song graphs, user overrides, and AI decisions,
 * you will have conflicts. ConstraintIR ensures conflicts resolve deterministically
 * and explainably, not "whatever ran last".
 *
 * Responsibility:
 * - Represents rules that limit or guide behavior
 * - Priority-based conflict resolution
 * - Source attribution for explainability
 * - Hard vs soft constraint enforcement
 *
 * Rules:
 * - Hard constraints must not be violated
 * - Soft constraints may bend but not disappear
 * - Priority resolves conflicts
 * - Source is preserved for explainability
 *
 * What this enables:
 * - "Ignore Schillinger here" user intent
 * - Safe AI behavior
 * - Predictable multi-graph overlap
 * - Debugging why something happened
 *
 * v1.0 - Initial release
 */

import type { ConstraintId, ParameterAddress } from "./types";

// Re-export for backward compatibility
export type { ConstraintId, ParameterAddress };

/**
 * Constraint scope
 */
export type ConstraintScope =
  | "global"
  | "scene"
  | "song"
  | "role"
  | "instrument";

/**
 * Constraint kind (hard vs soft)
 */
export type ConstraintKind = "hard" | "soft";

/**
 * Constraint rules
 */
export type ConstraintRule =
  | "max_density"
  | "min_spacing"
  | "no_overlap"
  | "fixed_register"
  | "limit_polyphony"
  | "forbid_articulation";

/**
 * Constraint source (for explainability)
 */
export type ConstraintSource =
  | "user"
  | "composer"
  | "generator"
  | "safety"
  | "style";

/**
 * Constraint value types
 */
export type ConstraintValue = number | string | boolean;

/**
 * ConstraintIR v1.0 - Deterministic Conflict Resolution
 */
export interface ConstraintIR_v1 {
  /**
   * Version identifier for serialization
   */
  version: "1.0";

  /**
   * Constraint identifier (unique within scope)
   */
  id: ConstraintId;

  /**
   * Scope of constraint application
   */
  scope: ConstraintScope;

  /**
   * Target ID or parameter address
   */
  target: string;

  /**
   * Hard constraints must not be violated
   * Soft constraints may bend but not disappear
   */
  kind: ConstraintKind;

  /**
   * Rule type
   */
  rule: ConstraintRule;

  /**
   * Rule value
   */
  value: ConstraintValue;

  /**
   * Priority (higher wins)
   */
  priority: number;

  /**
   * Source of constraint (for explainability)
   */
  source: ConstraintSource;
}

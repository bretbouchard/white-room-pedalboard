/**
 * ParameterBindingIR - Intent → Parameter → Scope
 *
 * Makes intent → parameter → scope explicit and deterministic.
 *
 * No more hidden automation logic.
 *
 * Responsibility:
 * - Binds source (intent/control/process) to target parameter
 * - Specifies binding mode (absolute/relative/scaled)
 * - Optional curve transformation
 * - Scope determines visibility
 * - Priority-based conflict resolution
 *
 * Rules:
 * - Higher priority wins
 * - Scope determines visibility
 * - No implicit bindings allowed
 *
 * What this enables:
 * - User overrides
 * - AI negotiation
 * - Articulation & dynamics
 * - Explainability
 *
 * v1.0 - Initial release
 */

import type { IntentId } from "./intent";
import type { ControlId } from "./control";
import type { ProcessId } from "./process";
import type { CurveIR, ParameterAddress } from "./types";

/**
 * ParameterBinding identifier
 */
export type ParameterBindingId = string;

/**
 * Binding scope
 */
export type BindingScope = "global" | "scene" | "graph" | "role" | "instrument";

/**
 * Binding mode
 */
export type BindingMode = "absolute" | "relative" | "scaled";

/**
 * Source reference
 */
export type BindingSource =
  | { type: "intent"; id: IntentId }
  | { type: "control"; id: ControlId }
  | { type: "process"; id: ProcessId };

/**
 * ParameterBindingIR v1.0 - Parameter Binding
 */
export interface ParameterBindingIR_v1 {
  /**
   * Version identifier for serialization
   */
  version: "1.0";

  /**
   * Binding identifier
   */
  id: ParameterBindingId;

  /**
   * Source of parameter value
   */
  source: BindingSource;

  /**
   * Target parameter address
   */
  target: ParameterAddress;

  /**
   * Binding mode
   */
  mode: BindingMode;

  /**
   * Optional curve transformation
   */
  curve?: CurveIR;

  /**
   * Binding scope
   */
  scope: BindingScope;

  /**
   * Priority (higher wins)
   */
  priority: number;
}

/**
 * ControlIR — Musical Fields (Phase 3)
 *
 * Responsibility: Continuous musical influence that shapes ProcessIR parameters
 *
 * Rules:
 * - ControlIR never creates events directly
 * - ControlIR shapes ProcessIR parameters
 * - ControlIR must be evaluable deterministically
 * - Examples: density, harmonic tension, interval spread, rhythmic pressure
 */

import type { CurveIR, TimeRange, RoleId, ProcessId } from "./types";

/**
 * Control field types (musical dimensions, not parameters)
 */
export type ControlField =
  | "density"
  | "interval_spread"
  | "harmonic_tension"
  | "rhythmic_pressure"
  | "articulation_energy";

/**
 * Control target - what the field influences
 */
export type ControlTarget =
  | { type: "role"; id: RoleId }
  | { type: "process"; id: ProcessId };

/**
 * ControlIR_v1 - Musical field influence (Phase 3)
 *
 * ControlIR represents continuous musical influence that shapes
 * ProcessIR parameters. Unlike AutomationIR, ControlIR does not
 * directly control parameters - it biases the generative process.
 */
export interface ControlIR_v1 {
  version: "1.0";

  /**
   * Unique identifier for this control
   */
  id: string;

  /**
   * Musical field being controlled
   */
  field: ControlField;

  /**
   * Curve defining how the field evolves over time
   */
  curve: CurveIR;

  /**
   * Time range this control applies to
   */
  scope: TimeRange;

  /**
   * Target of this control (role or process)
   */
  target: ControlTarget;
}

/**
 * ControlId is imported from types
 */

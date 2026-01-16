/**
 * AutomationIR - Time-Based Parameter Change
 *
 * Canonical representation of time-based parameter change.
 *
 * This separates automation from control intent.
 *
 * Responsibility:
 * - Target parameter address
 * - Curve specification for value over time
 * - Time range (start to end)
 * - Authority attribution (user/system/AI)
 * - Priority for conflict resolution
 *
 * Rules:
 * - AutomationIR never creates devices or patterns
 * - Authority resolves conflicts
 * - Deterministic merge order required
 *
 * What this enables:
 * - Apple TV gestures
 * - Live control
 * - Deterministic playback
 * - Record/replay
 *
 * v1.0 - Initial release
 */

import type { ParameterAddress } from "./types";
import type { CurveIR, TimeRange } from "./types";

/**
 * Automation identifier
 */
export type AutomationId = string;

/**
 * Automation authority
 */
export type AutomationAuthority = "user" | "system" | "ai";

/**
 * AutomationIR v1.0 - Time-Based Parameter Change
 */
export interface AutomationIR_v1 {
  /**
   * Version identifier for serialization
   */
  version: "1.0";

  /**
   * Automation identifier
   */
  id: AutomationId;

  /**
   * Target parameter address
   */
  target: ParameterAddress;

  /**
   * Curve specification for value over time
   */
  curve: CurveIR;

  /**
   * Time range for automation
   */
  timeRange: TimeRange;

  /**
   * Authority source
   */
  authority: AutomationAuthority;

  /**
   * Priority (higher wins)
   */
  priority: number;
}

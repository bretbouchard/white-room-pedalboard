/**
 * RealizationPolicyIR - Execution Mode Authority
 *
 * Defines how IR is realized, without changing musical intent.
 *
 * You already implicitly vary behavior based on:
 * - realtime vs offline
 * - Apple TV vs headless
 * - export vs live playback
 *
 * This must be explicit to remain deterministic.
 *
 * Responsibility:
 * - Defines execution mode (realtime, offline, hybrid)
 * - Lookahead window for buffering
 * - Determinism level (strict, bounded, relaxed)
 * - Mutation budget for adaptive changes
 * - Performance hints
 *
 * Rules:
 * - RealizationPolicy never changes IR
 * - Only affects scheduling and buffering
 * - SceneIR may override policy locally
 *
 * What this enables:
 * - Apple TV performance tuning
 * - Headless batch rendering
 * - Identical composition across platforms
 * - Deterministic exports
 *
 * v1.0 - Initial release
 */

import type { MusicalTime } from "./types";

/**
 * Policy identifier
 */
export type PolicyId = string;

/**
 * Execution modes
 */
export type ExecutionMode = "realtime" | "offline" | "hybrid";

/**
 * Determinism levels
 */
export type DeterminismLevel = "strict" | "bounded" | "relaxed";

/**
 * Realization targets
 */
export type RealizationTarget =
  | "live"
  | "render"
  | "export_midi"
  | "export_audio";

/**
 * Performance hints
 */
export interface PerformanceHints {
  /**
   * Prefer low latency over accuracy
   */
  preferLowLatency?: boolean;

  /**
   * Allow approximation for performance
   */
  allowApproximation?: boolean;
}

/**
 * RealizationPolicyIR v1.0 - Execution Mode Authority
 */
export interface RealizationPolicyIR_v1 {
  /**
   * Version identifier for serialization
   */
  version: "1.0";

  /**
   * Policy identifier
   */
  id: PolicyId;

  /**
   * Execution mode
   */
  mode: ExecutionMode;

  /**
   * Lookahead window for buffering
   */
  lookaheadWindow: MusicalTime;

  /**
   * Determinism level
   * - strict: Same seed always produces identical output
   * - bounded: Limited adaptive behavior within tolerance
   * - relaxed: Full adaptive behavior allowed
   */
  determinismLevel: DeterminismLevel;

  /**
   * Allowed adaptive changes (mutation budget)
   * Only applies to bounded/relaxed determinism
   */
  mutationBudget?: number;

  /**
   * Realization target
   */
  target: RealizationTarget;

  /**
   * Performance hints for optimization
   */
  performanceHints?: PerformanceHints;
}

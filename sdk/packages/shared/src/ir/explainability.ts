/**
 * ExplainabilityIR — Required Output
 *
 * Responsibility: Every adaptive or intent-driven change must emit ExplainabilityIR
 *
 * Phase 5: If it cannot be explained, it must not happen.
 * Phase 6: Extended to include human input lineage.
 *
 * Rules:
 * - Every adaptive or intent-driven change emits ExplainabilityIR
 * - Chain references valid IRs
 * - Summary is non-empty and stable
 * - Provides full audit trail for AI and human participation
 */

import type {
  ExplainabilityId,
  IntentId,
  HumanIntentId,
  ConstraintId,
  ProcessId,
  ControlId,
  PatternId,
  GestureId,
} from "./types";

/**
 * ExplainabilityIR_v1 - Chain Tracking and Summaries (Phase 5)
 *
 * ExplainabilityIR provides complete audit trail for all adaptive and intent-driven changes.
 * This is required output for Phase 5 - if it cannot be explained, it must not happen.
 */
export interface ExplainabilityIR_v1 {
  version: "1.0";
  id: ExplainabilityId;

  /**
   * Chain of IR references
   * Tracks what influenced what
   */
  chain: {
    intent?: IntentId;
    constraints?: ConstraintId[];
    processes?: ProcessId[];
    controls?: ControlId[];
    patterns?: PatternId[];
  };

  /**
   * Human-readable summary
   * Must be non-empty and stable across runs
   */
  summary: string;

  /**
   * Optional detailed explanation
   */
  details?: string;

  /**
   * Timestamp when this explanation was generated
   */
  timestamp: number;
}

/**
 * ExplainabilityIR_v2 - Extended Chain Tracking with Human Input (Phase 6)
 *
 * Phase 6 extends ExplainabilityIR to include human input lineage.
 * This enables complete audit trail for human-machine co-performance.
 */
export interface ExplainabilityIR_v2 {
  version: "2.0";
  id: ExplainabilityId;

  /**
   * Chain of IR references
   * Extended to include human input
   */
  chain: {
    humanIntent?: HumanIntentId;
    intent?: IntentId;
    gesture?: GestureId;
    constraints?: ConstraintId[];
    processes?: ProcessId[];
    controls?: ControlId[];
    patterns?: PatternId[];
  };

  /**
   * Human-readable summary
   * Must be non-empty and stable across runs
   */
  summary: string;

  /**
   * Optional detailed explanation
   */
  details?: string;

  /**
   * Timestamp when this explanation was generated
   */
  timestamp: number;
}

/**
 * Union type for version compatibility
 */
export type ExplainabilityIR = ExplainabilityIR_v1 | ExplainabilityIR_v2;

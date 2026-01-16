/**
 * PatternIR — Musical Events
 *
 * Responsibility: Concrete musical decisions
 *
 * Migration from v1:
 * - v1 is descriptor-only (baseRule + seed)
 * - v2 adds actual events and provenance
 * - Can generate v2 from v1 + seed
 */

import type {
  PatternIRId,
  PatternId,
  RoleId,
  TimeRange,
  ProcessId,
} from "./types";

// Re-export PatternId for convenience
export type { PatternId };

/**
 * Musical event types
 */
export type MusicalEventType = "note" | "rest" | "chord" | "control";

/**
 * Single musical event (note, rest, chord, or control change)
 */
export interface MusicalEvent {
  /**
   * Time offset from scope start (in beats or seconds depending on clock)
   */
  time: number;

  /**
   * MIDI pitch (0-127) or frequency Hz
   * Not present for rests
   */
  pitch?: number;

  /**
   * Velocity (0-127)
   * Not present for rests
   */
  velocity?: number;

  /**
   * Duration in beats or seconds
   */
  duration?: number;

  /**
   * Event type
   */
  type: MusicalEventType;
}

/**
 * PatternIR_v2 - Expanded with events and provenance
 *
 * PatternIR v2 contains the actual musical events generated from
 * a descriptor, along with provenance tracking.
 */
export interface PatternIR_v2 {
  version: "2.0";

  /**
   * Unique identifier for this pattern
   */
  id: PatternIRId;

  /**
   * Seed used for deterministic generation
   */
  seed: number;

  /**
   * Musical role this pattern fulfills
   */
  role: RoleId;

  /**
   * Time range this pattern covers
   */
  scope: TimeRange;

  /**
   * Actual musical events
   */
  events: MusicalEvent[];

  /**
   * Provenance tracking
   */
  provenance: PatternProvenance;
}

/**
 * Provenance information for pattern
 */
export interface PatternProvenance {
  /**
   * Generator function name
   * e.g., 'generateResultant', 'generatePattern'
   */
  generator: string;

  /**
   * Process IR that generated this pattern
   */
  processId: ProcessId;

  /**
   * Base rule from v1 (for backward compatibility)
   * e.g., 'resultant(3,4)'
   */
  baseRule?: string;

  /**
   * Variation rule from v1 (for backward compatibility)
   * e.g., 'complexity:0.7'
   */
  variationRule?: string;
}

/**
 * PatternIR_v1 - Minimal descriptor (for backward compatibility)
 *
 * This is the Phase 2 IR format - descriptor only
 */
export interface PatternIR_v1 {
  version: "1.0";
  baseRule: string; // e.g., 'resultant(3,4)'
  variationRule?: string; // e.g., 'complexity:0.7'
  seed: string; // explicit seed
}

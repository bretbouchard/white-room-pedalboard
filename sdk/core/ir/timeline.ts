/**
 * TimelineIR — Global Time Authority
 *
 * Responsibility: Single source of truth for time across all songs
 *
 * Rules:
 * - No SongGraph owns tempo or time
 * - All time references resolve through TimelineIR
 * - Determinism is anchored here
 */

import type {
  MusicalTime,
  TempoChange,
  TimeSignatureChange,
  ClockType,
  TimelineId,
} from "./types";

// Re-export TimelineId for convenience
export type { TimelineId };

/**
 * TimelineIR_v1 - Global timeline controlling all songs
 *
 * TimelineIR is the single source of truth for musical time. Multiple
 * SongGraphs can reference the same TimelineIR without interference.
 */
export interface TimelineIR_v1 {
  version: "1.0";
  id: TimelineId;

  /**
   * Tempo changes over time
   * All songs reference this, none own it
   */
  tempoMap: TempoChange[];

  /**
   * Time signature changes over time
   * All songs reference this, none own it
   */
  timeSignatureMap: TimeSignatureChange[];

  /**
   * Clock type: musical (bars/beats), seconds, or hybrid
   */
  clock: ClockType;

  /**
   * Start point of timeline
   */
  start: MusicalTime;

  /**
   * Optional end point for finite timelines
   * Undefined = infinite or loop
   */
  end?: MusicalTime;
}

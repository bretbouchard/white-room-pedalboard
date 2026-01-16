/**
 * SongPlacementIR — Timeline Coexistence
 *
 * Responsibility: Defines when and how a SongGraph exists on the timeline
 *
 * Rules:
 * - Multiple SongPlacements may overlap
 * - Placement does not modify SongGraph contents
 * - Priority resolves conflicts deterministically
 */

import type { SongId, MusicalTime } from "./types";

/**
 * Playback modes for song placement
 */
export type PlacementMode = "one-shot" | "loop" | "stretch";

/**
 * SongPlacementIR_v1 - Places a song on the timeline
 *
 * SongPlacementIR defines when and how a SongGraph exists on the timeline.
 * Multiple placements can overlap - priority determines which wins.
 */
export interface SongPlacementIR_v1 {
  version: "1.0";

  /**
   * Reference to SongGraph
   * Placement does not contain song content, only references it
   */
  songId: SongId;

  /**
   * Start time on timeline
   */
  start: MusicalTime;

  /**
   * Optional duration
   * undefined = infinite or until end
   */
  duration?: MusicalTime;

  /**
   * Playback mode
   * - one-shot: plays once then stops
   * - loop: repeats for duration
   * - stretch: stretches to fit duration
   */
  mode: PlacementMode;

  /**
   * Gain level (0-1)
   */
  gain: number;

  /**
   * Priority for overlap resolution
   * Higher priority wins during overlaps
   */
  priority: number;
}

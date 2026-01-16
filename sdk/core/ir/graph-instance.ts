/**
 * GraphInstanceIR - Concrete Graph Instance on Timeline
 *
 * Defines a concrete instance of a SongGraph on a Timeline.
 *
 * SongGraphs are abstract templates.
 * GraphInstances are what actually exist during playback.
 *
 * Responsibility:
 * - References a SongGraph (template)
 * - References a Timeline (time authority)
 * - Specifies placement on timeline
 * - Provides instance-specific seed
 * - Optional realization policy override
 * - Optional parameter overrides
 *
 * Rules:
 * - Same SongGraph may have multiple GraphInstances
 * - GraphInstances never mutate SongGraphIR
 * - All multi-song timelines operate on GraphInstances, not SongGraphs
 *
 * v1.0 - Initial release
 */

import type { SongGraphId } from "./song-graph";
import type { TimelineId } from "./timeline";
import type { SongPlacementIR_v1 } from "./song-placement";
import type { RealizationPolicyId } from "./realization-policy";
import type { ParameterBindingId } from "./parameter-binding";

/**
 * GraphInstance identifier
 */
export type GraphInstanceId = string;

/**
 * GraphInstanceIR v1.0 - Concrete Graph Instance
 */
export interface GraphInstanceIR_v1 {
  /**
   * Version identifier for serialization
   */
  version: "1.0";

  /**
   * Instance identifier (unique within timeline)
   */
  id: GraphInstanceId;

  /**
   * Reference to SongGraph (template)
   */
  graphRef: SongGraphId;

  /**
   * Reference to Timeline (time authority)
   */
  timelineRef: TimelineId;

  /**
   * Placement on timeline
   */
  placement: SongPlacementIR_v1;

  /**
   * Instance-specific seed for deterministic realization
   */
  seed: number;

  /**
   * Optional realization policy override
   */
  realizationPolicy?: RealizationPolicyId;

  /**
   * Optional parameter overrides for this instance
   */
  parameterOverrides?: ParameterBindingId[];
}

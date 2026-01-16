/**
 * SceneIR — System-Level State
 *
 * Responsibility: Defines which graphs are active and how transitions occur
 *
 * Use Cases:
 * - Apple TV scenes
 * - Live performance
 * - Game states
 * - Generative setlists
 */

import type { SceneId } from "./types";
import type { SongPlacementIR_v1 } from "./song-placement";
import type { MixIR_v1 } from "./mix";
import type { ControlIR_v1 } from "./control";

/**
 * Scene transition types
 */
export type TransitionType = "cut" | "fade" | "morph";

/**
 * SceneIR_v1 - System-level state snapshot
 *
 * SceneIR defines which SongGraphs are active and how they transition.
 * Scenes can switch without state leaks between graphs.
 */
export interface SceneIR_v1 {
  version: "1.0";

  /**
   * Unique scene identifier
   */
  id: SceneId;

  /**
   * Active song placements in this scene
   */
  activePlacements: SongPlacementIR_v1[];

  /**
   * Optional mix overrides for this scene
   * undefined = use default mix
   */
  mixOverrides?: MixIR_v1;

  /**
   * Optional control overrides for this scene
   * undefined = use default controls
   */
  controlOverrides?: ControlIR_v1[];

  /**
   * Transition type to next scene
   */
  transition: TransitionType;
}

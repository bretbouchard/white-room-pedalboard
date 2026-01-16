/**
 * MixIR — Cross-Graph Interaction
 *
 * Responsibility: Where independent SongGraphs interact safely
 *
 * Rules:
 * - Only place SongGraphs touch
 * - No pattern-level logic here
 */

import type { SongId, InstrumentId, BusId, ParameterValue } from "./types";
import type { InstrumentIR_v1 } from "./instrument";

/**
 * Mix bus definition
 */
export interface BusIR {
  /**
   * Unique bus identifier
   */
  id: BusId;

  /**
   * Bus name
   * e.g., 'Main Mix', 'Reverb', 'Effects'
   */
  name: string;

  /**
   * Bus parameters
   * e.g., { volume: 0.8, stereoWidth: 1.0 }
   */
  parameters: Record<string, ParameterValue>;
}

/**
 * Route from song or instrument to bus
 */
export interface MixRoute {
  /**
   * Source: song ID or instrument ID
   */
  from: SongId | InstrumentId;

  /**
   * Destination bus
   */
  to: BusId;

  /**
   * Gain level (0-1)
   */
  gain: number;

  /**
   * Pan position (-1 to 1, left to right)
   * undefined = center
   */
  pan?: number;
}

/**
 * MixIR_v1 - Cross-graph mixing and routing
 *
 * MixIR defines how independent SongGraphs interact at the mix level.
 * This is the only place where SongGraphs touch - no pattern-level logic here.
 */
export interface MixIR_v1 {
  version: "1.0";

  /**
   * Mix buses
   */
  buses: BusIR[];

  /**
   * Routes from songs/instruments to buses
   */
  routes: MixRoute[];

  /**
   * Effects on buses (instruments with kind='effect')
   */
  effects: InstrumentIR_v1[];
}

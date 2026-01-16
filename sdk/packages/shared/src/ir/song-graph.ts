/**
 * SongGraphIR — Isolated Musical Graph
 *
 * Responsibility: A self-contained musical universe
 *
 * Rules:
 * - SongGraphs never reference each other
 * - All IDs are namespaced
 * - No mix or placement logic inside SongGraphIR
 */

import type { SongId, NamespaceId, TimelineId } from "./types";
import type { StructuralIR_v1 } from "./structural";
import type { ProcessIR_v1 } from "./process";
import type { PatternIR_v2 } from "./pattern";
import type { ControlIR_v1 } from "./control";
import type { InstrumentIR_v1 } from "./instrument";
import type { SignalGraphIR_v1 } from "./signal-graph";

/**
 * SongGraphIR_v1 - Isolated musical universe
 *
 * SongGraphIR contains everything needed for a single musical work:
 * - Structure (sections, roles)
 * - Processes (Schillinger operations)
 * - Patterns (musical events)
 * - Controls (parameter automation)
 * - Instruments (sound sources)
 * - Signal graph (routing)
 *
 * Multiple SongGraphs can coexist on the same TimelineIR without interference.
 */
export interface SongGraphIR_v1 {
  version: "1.0";

  /**
   * Unique identifier for this song
   */
  id: SongId;

  /**
   * Namespace for collision safety
   * All IDs within this song are resolved via this namespace
   */
  namespace: NamespaceId;

  /**
   * Reference to timeline this song uses
   * Songs never own tempo/time
   */
  timelineRef: TimelineId;

  /**
   * Musical structure (sections, roles)
   */
  structure: StructuralIR_v1;

  /**
   * Schillinger processes that generated patterns
   */
  processes: ProcessIR_v1[];

  /**
   * Musical patterns with events
   */
  patterns: PatternIR_v2[];

  /**
   * Parameter automation curves
   */
  controls: ControlIR_v1[];

  /**
   * Instrument definitions
   */
  instruments: InstrumentIR_v1[];

  /**
   * Signal routing graph
   */
  signalGraph: SignalGraphIR_v1;
}

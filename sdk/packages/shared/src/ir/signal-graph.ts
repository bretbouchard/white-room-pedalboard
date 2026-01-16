/**
 * SignalGraphIR — Wiring & Routing
 *
 * Responsibility: Defines how instruments are connected
 *
 * Rules:
 * - Graph is acyclic unless explicitly allowed
 * - No time-varying behavior
 * - Routing ≠ automation
 */

import type { InstrumentId } from "./types";

/**
 * Connection types in signal graph
 */
export type ConnectionType = "audio" | "control" | "sidechain";

/**
 * Signal connection between instruments
 */
export interface SignalConnection {
  /**
   * Source instrument ID
   */
  from: InstrumentId;

  /**
   * Destination instrument ID
   */
  to: InstrumentId;

  /**
   * Type of connection
   */
  type: ConnectionType;
}

/**
 * SignalGraphIR_v1 - Signal routing graph
 *
 * SignalGraphIR defines how instruments are connected together.
 * It is static (no time-varying behavior) - routing is separate from automation.
 */
export interface SignalGraphIR_v1 {
  version: "1.0";

  /**
   * All instrument IDs in the graph
   * Defines the set of valid nodes
   */
  nodes: InstrumentId[];

  /**
   * Connections between instruments
   * Defines the routing topology
   */
  connections: SignalConnection[];
}

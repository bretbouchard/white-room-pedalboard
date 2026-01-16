/**
 * HumanIntentIR — Live Performer Intent Authority
 *
 * Phase 6: Human & Machine Co-Performance
 *
 * HumanIntentIR represents live, time-scoped intent from human performers.
 * This is NOT a command — it's an intent that enters arbitration.
 *
 * Responsibility:
 * - Capture performer goals (increase_energy, reduce_density, etc.)
 * - Time-scoped influence (expires automatically)
 * - Source tracking (gesture, controller, keyboard, network)
 * - Priority-based arbitration
 *
 * Rules:
 * - Never mutates PatternIR
 * - Enters same arbitration pipeline as IntentIR
 * - Priority resolves conflicts deterministically
 * - Expired HumanIntentIR is automatically removed
 *
 * What this enables:
 * - Live performers guide the system
 * - Non-destructive real-time influence
 * - Safe human-machine collaboration
 * - Deterministic co-performance
 *
 * v1.0 - Initial release
 */

import type {
  HumanIntentId,
  GestureId,
  RoleId,
  InstrumentId,
  TimeRange,
} from "./types";

/**
 * Human intent goals
 * Performer-level musical directions
 */
export type HumanIntentGoal =
  | "increase_energy" // Raise intensity, rhythmic activity
  | "reduce_density" // Thin texture, reduce polyphony
  | "hold_pattern" // Maintain current musical state
  | "release_tension" // Resolve harmonic dissonance
  | "emphasize_role" // Bring specific role to foreground
  | "override_articulation"; // Change articulation (staccato/legato)

/**
 * Human input source types
 */
export type HumanIntentSource =
  | "gesture" // Motion capture, touch
  | "controller" // MIDI controller, fader, knob
  | "keyboard" // Computer keyboard input
  | "network"; // OSC, WebSocket, network messages

/**
 * HumanIntentIR v1.0 - Live Performer Intent
 */
export interface HumanIntentIR_v1 {
  /**
   * Version identifier for serialization
   */
  version: "1.0";

  /**
   * Human intent identifier
   */
  id: HumanIntentId;

  /**
   * Performer's musical goal
   */
  goal: HumanIntentGoal;

  /**
   * Intent strength (0-1)
   */
  strength: number;

  /**
   * Where the intent applies
   * - global: entire composition
   * - scene: current scene
   * - section: specific section
   * - role: specific musical role (melody, bass, etc.)
   * - instrument: specific instrument
   */
  scope: "global" | "scene" | "section" | "role" | "instrument";

  /**
   * Time range for intent influence
   * Intent is only active within this range
   */
  timeRange: TimeRange;

  /**
   * Where the intent came from
   */
  source: HumanIntentSource;

  /**
   * Arbitration priority
   * Higher priority wins conflicts
   * Recommended ranges:
   * - Live performer: 500-900 (above AI, below user)
   * - Pre-recorded: 100-400
   */
  priority: number;

  /**
   * Optional target hint for role/instrument scopes
   */
  targetHint?: RoleId | InstrumentId;

  /**
   * Gesture that created this intent (if applicable)
   */
  gestureId?: GestureId;

  /**
   * Optional metadata for tracking
   */
  metadata?: {
    performerId?: string;
    controllerId?: string;
    location?: string;
  };
}

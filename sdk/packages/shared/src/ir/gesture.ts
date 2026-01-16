/**
 * GestureIR — Raw Performance Signals
 *
 * Phase 6: Human & Machine Co-Performance
 *
 * GestureIR captures raw human input, un-interpreted.
 * This is the lowest level of human input — just the signal itself.
 *
 * Responsibility:
 * - Capture raw input values
 * - Track input source (knob, fader, pad, keyboard, touch, motion, network)
 * - Timestamp for ordering
 * - Optional target hint (role/instrument)
 *
 * Rules:
 * - GestureIR is ephemeral (doesn't persist)
 * - GestureIR must be translated into HumanIntentIR
 * - GestureIR alone never changes music
 * - Translation must be deterministic
 *
 * What this enables:
 * - Raw input capture from any source
 * - Gesture → Intent translation pipeline
 * - Multi-modal input support
 * - Input logging and replay
 *
 * v1.0 - Initial release
 */

import type { GestureId, RoleId, InstrumentId } from "./types";

/**
 * Gesture input types
 * Covers all common performance input sources
 */
export type GestureInputType =
  | "knob" // Rotary knob (continuous 0-1)
  | "fader" // Linear fader (continuous 0-1)
  | "pad" // Drum pad / button (momentary or toggle)
  | "keyboard" // Computer keyboard key
  | "touch" // Touch surface (x, y, pressure)
  | "motion" // Motion capture (accelerometer, gyroscope)
  | "network"; // Network message (OSC, WebSocket, etc.)

/**
 * Gesture data types
 * Different gestures carry different data
 */
export type GestureData =
  | number // Scalar (0-1): knob, fader, pad
  | { x: number; y: number; pressure?: number } // Touch surface
  | { x: number; y: number; z: number } // Motion (accel/gyro)
  | string; // Keyboard key, network message

/**
 * GestureIR v1.0 - Raw Performance Signal
 */
export interface GestureIR_v1 {
  /**
   * Version identifier for serialization
   */
  version: "1.0";

  /**
   * Gesture identifier
   */
  id: GestureId;

  /**
   * Type of input device
   */
  inputType: GestureInputType;

  /**
   * Raw gesture data
   */
  data: GestureData;

  /**
   * Timestamp (ms since epoch)
   * For ordering and replay
   */
  timestamp: number;

  /**
   * Optional hint about which role/instrument this targets
   * Translation layer uses this to create scoped HumanIntentIR
   */
  targetHint?: RoleId | InstrumentId;

  /**
   * Optional source metadata
   */
  sourceMetadata?: {
    deviceId?: string;
    channel?: number; // MIDI channel, etc.
    controllerNumber?: number; // MIDI CC number
    performerId?: string;
    location?: string;
  };
}

/**
 * Gesture stream event
 * For real-time gesture processing
 */
export interface GestureStreamEvent {
  gesture: GestureIR_v1;
  sequenceNumber: number;
  isDuplicate: boolean;
}

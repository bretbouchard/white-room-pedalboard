/**
 * White Room FFI - TypeScript Wrapper
 *
 * Provides TypeScript-friendly interface to the native C++ bindings.
 */

import bindings from "./binding";

// =============================================================================
// TYPES
// =============================================================================

export interface FFIBindings {
  ping(message?: string): string;
  testError(): never;
  serializeJSON(obj: unknown): string;
  deserializeJSON(json: string): unknown;
  generateRhythmAttacks(rhythmSystemJSON: string, duration: number, measureLength?: number): string;
  generateMelody(melodySystemJSON: string, rhythmAttacksJSON: string, duration: number, rootPitch?: number): string;
  generateHarmony(harmonySystemJSON: string, rhythmAttacksJSON: string, duration: number, rootPitch?: number): string;
  generateForm(formSystemJSON: string, totalDuration: number): string;
}

/**
 * Rhythm attack point
 */
export interface RhythmAttack {
  time: number;      // Time in beats
  accent: number;    // Accent level (0-1+, 1 = basic attack)
}

/**
 * Rhythm system configuration (from SDK)
 */
export interface RhythmSystemConfig {
  systemId: string;
  systemType: "rhythm";
  generators: Array<{
    period: number;    // Period in beats (1-16)
    phase: number;     // Phase offset in beats (0 to period-1)
    weight?: number;   // Relative weight (0.1-2.0, default 1.0)
  }>;
  resultantSelection: {
    method: "interference" | "modulo" | "custom";
    targetPeriod?: number;
  };
  // Note: permutations, accentDisplacement, constraints not used in initial implementation
}

/**
 * Pitch event (from Book II melody generation)
 */
export interface PitchEvent {
  time: number;      // Time in beats
  pitch: number;     // MIDI note number (0-127)
  velocity: number;  // Velocity (0-127)
  duration: number;  // Duration in beats
}

/**
 * Melody system configuration (from SDK)
 */
export interface MelodySystemConfig {
  systemId: string;
  systemType: "melody";
  cycleLength: number;  // Mod N (2-24)
  intervalSeed: number[];  // Ordered intervals (-12 to +12)
  rotationRule?: {
    ruleId: string;
    type: "cyclic" | "random";
    interval: number;
    amount?: number;
  };
  expansionRules?: Array<{
    ruleId: string;
    trigger: "periodic" | "conditional";
    multiplier: number;  // 1-4
    period?: number;
  }>;
  contractionRules?: Array<{
    ruleId: string;
    trigger: "periodic" | "conditional";
    divisor: number;  // 1-4
    period?: number;
  }>;
  contourConstraints?: {
    constraintId: string;
    type: "ascending" | "descending" | "oscillating" | "custom";
    maxIntervalLeaps?: number;
  };
  directionalBias?: number;  // -1 (descending) to 1 (ascending)
  registerConstraints?: {
    constraintId: string;
    minPitch: number;
    maxPitch: number;
    allowTransposition: boolean;
  };
  rhythmBinding: string;  // RhythmSystem ID
}

/**
 * Chord event (from Book III harmony generation)
 */
export interface ChordEvent {
  time: number;          // Time in beats
  root: number;          // Root MIDI note number
  intervals: number[];   // Intervals above root (1-12 semitones)
  weight: number;        // Importance (0-1)
}

/**
 * Harmony system configuration (from SDK)
 */
export interface HarmonySystemConfig {
  systemId: string;
  systemType: "harmony";
  distribution: number[];  // Interval weights (length 12, values 0-1)
  harmonicRhythmBinding: string;  // RhythmSystem ID
  voiceLeadingConstraints?: Array<{
    constraintId: string;
    maxIntervalLeap?: number;
    avoidParallels?: boolean;
    preferredMotion?: "contrary" | "oblique" | "similar" | "parallel";
  }>;
  resolutionRules?: Array<{
    ruleId: string;
    trigger: "cadence" | "conditional";
    targetDistribution: number[];  // Interval weights (length 12)
    tendency: "resolve" | "suspend" | "avoid";
  }>;
}

/**
 * Form section (from Book IV form generation)
 */
export interface FormSection {
  sectionId: string;
  startTime: number;   // Start time in beats
  duration: number;    // Duration in beats
}

/**
 * Form system configuration (from SDK)
 */
export interface FormSystemConfig {
  systemId: string;
  systemType: "form";
  ratioTree: {
    nodeId: string;
    ratio: number;
    children?: Array<{
      nodeId: string;
      ratio: number;
      children?: any[];
    }>;
  };
  sectionDefinitions?: Array<{
    sectionId: string;
    startTime?: number;
    duration?: number;
    content?: any;
    requiresCadence?: boolean;
  }>;
  symmetryRules?: Array<{
    ruleId: string;
    type: "mirror" | "rotational" | "palindromic";
    axis: string;  // Section ID to transform around
  }>;
  cadenceConstraints?: string[];  // Section IDs requiring cadence
  nestingDepth: number;  // Maximum nesting level (1-10)
}

// =============================================================================
// WRAPPER
// =============================================================================

/**
 * Get the native FFI bindings
 */
export function getFFI(): FFIBindings {
  return bindings as FFIBindings;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Test FFI connectivity
 */
export function ping(message?: string): string {
  return getFFI().ping(message);
}

/**
 * Serialize an object to JSON
 */
export function serializeJSON(obj: unknown): string {
  return getFFI().serializeJSON(obj);
}

/**
 * Deserialize JSON to an object
 */
export function deserializeJSON<T = unknown>(json: string): T {
  return getFFI().deserializeJSON(json) as T;
}

/**
 * Generate rhythm attacks from rhythm system configuration
 *
 * This function implements Schillinger Book I rhythm generation using
 * the native C++ FFI for performance.
 *
 * @param rhythmSystem - Rhythm system configuration
 * @param duration - Duration in beats to generate
 * @param measureLength - Length of one measure in beats (default 4)
 * @returns Array of rhythm attack points
 *
 * @example
 * ```typescript
 * const rhythmSystem: RhythmSystemConfig = {
 *   systemId: "rhythm-1",
 *   systemType: "rhythm",
 *   generators: [
 *     { period: 3, phase: 0, weight: 1.0 },
 *     { period: 4, phase: 0, weight: 1.0 }
 *   ],
 *   resultantSelection: { method: "interference" }
 * };
 *
 * const attacks = generateRhythmAttacks(rhythmSystem, 8);  // 8 beats
 * // Returns: [{time: 0, accent: 2}, {time: 0.75, accent: 1}, ...]
 * ```
 */
export function generateRhythmAttacks(
  rhythmSystem: RhythmSystemConfig,
  duration: number,
  measureLength: number = 4
): RhythmAttack[] {
  // Serialize rhythm system to JSON
  const rhythmSystemJSON = serializeJSON(rhythmSystem);

  // Call native function
  const attacksJSON = getFFI().generateRhythmAttacks(rhythmSystemJSON, duration, measureLength);

  // Deserialize result
  const attacks = deserializeJSON<RhythmAttack[]>(attacksJSON);

  return attacks;
}

/**
 * Generate melody from melody system configuration
 *
 * This function implements Schillinger Book II melody generation using
 * the native C++ FFI for performance.
 *
 * @param melodySystem - Melody system configuration
 * @param rhythmAttacks - Rhythm attack times (from Book I)
 * @param duration - Duration in beats to generate
 * @param rootPitch - Root MIDI note number (default 60)
 * @returns Array of pitch events
 *
 * @example
 * ```typescript
 * const melodySystem: MelodySystemConfig = {
 *   systemId: "melody-1",
 *   systemType: "melody",
 *   cycleLength: 7,
 *   intervalSeed: [2, 2, 1, 2, 2, 2, 1], // Major scale
 *   rhythmBinding: "rhythm-1"
 * };
 *
 * const attacks = generateRhythmAttacks(rhythmSystem, 8);
 * const melody = generateMelody(melodySystem, attacks, 8);
 * // Returns: [{time: 0, pitch: 60, velocity: 80, duration: 0.5}, ...]
 * ```
 */
export function generateMelody(
  melodySystem: MelodySystemConfig,
  rhythmAttacks: RhythmAttack[],
  duration: number,
  rootPitch: number = 60
): PitchEvent[] {
  // Serialize melody system to JSON
  const melodySystemJSON = serializeJSON(melodySystem);

  // Serialize rhythm attacks to JSON
  const rhythmAttacksJSON = serializeJSON(rhythmAttacks);

  // Call native function
  const melodyJSON = getFFI().generateMelody(melodySystemJSON, rhythmAttacksJSON, duration, rootPitch);

  // Deserialize result
  const melody = deserializeJSON<PitchEvent[]>(melodyJSON);

  return melody;
}

/**
 * Generate harmony from harmony system configuration
 *
 * This function implements Schillinger Book III harmony generation using
 * the native C++ FFI for performance.
 *
 * @param harmonySystem - Harmony system configuration
 * @param rhythmAttacks - Rhythm attack times (from Book I)
 * @param duration - Duration in beats to generate
 * @param rootPitch - Root MIDI note number (default 60)
 * @returns Array of chord events
 *
 * @example
 * ```typescript
 * const harmonySystem: HarmonySystemConfig = {
 *   systemId: "harmony-1",
 *   systemType: "harmony",
 *   distribution: [0.1, 0.3, 0.8, 1.0, 0.6, 0.1, 0.9, 0.4, 0.7, 0.5, 0.2, 0.0],
 *   harmonicRhythmBinding: "rhythm-1"
 * };
 *
 * const attacks = generateRhythmAttacks(rhythmSystem, 8);
 * const harmony = generateHarmony(harmonySystem, attacks, 8);
 * // Returns: [{time: 0, root: 60, intervals: [3, 5, 7], weight: 1.0}, ...]
 * ```
 */
export function generateHarmony(
  harmonySystem: HarmonySystemConfig,
  rhythmAttacks: RhythmAttack[],
  duration: number,
  rootPitch: number = 60
): ChordEvent[] {
  // Serialize harmony system to JSON
  const harmonySystemJSON = serializeJSON(harmonySystem);

  // Serialize rhythm attacks to JSON
  const rhythmAttacksJSON = serializeJSON(rhythmAttacks);

  // Call native function
  const harmonyJSON = getFFI().generateHarmony(harmonySystemJSON, rhythmAttacksJSON, duration, rootPitch);

  // Deserialize result
  const harmony = deserializeJSON<ChordEvent[]>(harmonyJSON);

  return harmony;
}

/**
 * Generate form structure from form system configuration
 *
 * This function implements Schillinger Book IV form generation using
 * the native C++ FFI for performance.
 *
 * @param formSystem - Form system configuration
 * @param totalDuration - Total duration in beats
 * @returns Array of form sections
 *
 * @example
 * ```typescript
 * const formSystem: FormSystemConfig = {
 *   systemId: "form-1",
 *   systemType: "form",
 *   ratioTree: {
 *     nodeId: "root",
 *     ratio: 1,
 *     children: [
 *       { nodeId: "A", ratio: 1 },
 *       { nodeId: "B", ratio: 1 }
 *     ]
 *   },
 *   nestingDepth: 3
 * };
 *
 * const form = generateForm(formSystem, 32);
 * // Returns: [{sectionId: "A", startTime: 0, duration: 16}, ...]
 * ```
 */
export function generateForm(
  formSystem: FormSystemConfig,
  totalDuration: number
): FormSection[] {
  // Serialize form system to JSON
  const formSystemJSON = serializeJSON(formSystem);

  // Call native function
  const formJSON = getFFI().generateForm(formSystemJSON, totalDuration);

  // Deserialize result
  const form = deserializeJSON<FormSection[]>(formJSON);

  return form;
}

// Re-export all bindings for direct access
export { bindings };

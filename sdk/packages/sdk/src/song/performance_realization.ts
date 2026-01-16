/**
 * PerformanceRealization - "How the song sounds" (Parallel Performance Universes)
 *
 * A PerformanceRealization represents one way to realize the same SongState.
 * The same invariant musical logic can yield infinite realizations:
 * - Solo Piano
 * - SATB Choir
 * - Ambient Techno
 * - Full Orchestra
 * - Jazz Combo
 * - etc.
 *
 * CRITICAL: PerformanceRealization is NOT the same as PerformanceState!
 * - PerformanceRealization = Compositional choices (instruments, density, groove)
 * - PerformanceState = Runtime state (transport, active voices, metering)
 *
 * The same SongState + different PerformanceRealizations = Parallel Performance Universes
 */

import type { InstrumentType } from './song_contract.js';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Arrangement style categories
 */
export type ArrangementStyle =
  | 'SOLO_PIANO'
  | 'SATB'
  | 'CHAMBER_ENSEMBLE'
  | 'FULL_ORCHESTRA'
  | 'JAZZ_COMBO'
  | 'ROCK_BAND'
  | 'AMBIENT_TECHNO'
  | 'ELECTRONIC'
  | 'ACAPPELLA'
  | 'CUSTOM';

/**
 * Instrumentation mapping: Role/Voice → Instrument + Preset
 */
export interface InstrumentationEntry {
  readonly roleId: string; // Functional role UUID
  readonly voiceId?: string; // Optional: specific voice UUID
  readonly instrumentId: InstrumentType; // "NexSynth", "KaneMarco", etc.
  readonly presetId: string; // Preset identifier
  readonly busId: string; // Mix bus UUID
}

/**
 * Register mapping: Pitch range per role
 */
export interface RegisterEntry {
  readonly roleId: string;
  readonly minPitch: number; // 0-127 (MIDI note)
  readonly maxPitch: number; // 0-127 (MIDI note)
}

/**
 * Mix targets: Gain and pan per role
 */
export interface MixTargetEntry {
  readonly roleId: string;
  readonly gain: number; // dB
  readonly pan: number; // -1.0 (left) to +1.0 (right)
}

/**
 * PerformanceRealization v1
 *
 * Represents one complete "universe" for rendering a song.
 * Contains all realization choices separate from invariant musical logic.
 */
export interface PerformanceRealizationV1 {
  readonly version: '1.0';
  readonly id: string;
  readonly name: string;
  readonly description?: string;

  // Arrangement
  readonly arrangementStyle: ArrangementStyle;

  // Density and groove
  readonly density: number; // 0.0 (sparse) to 1.0 (full)
  readonly grooveProfileId: string; // Groove profile reference

  // Instrumentation: How roles map to instruments
  readonly instrumentationMap: readonly InstrumentationEntry[];

  // ConsoleX integration
  readonly consoleXProfileId?: string; // Optional ConsoleX profile reference

  // Mix targets
  readonly mixTargets: readonly MixTargetEntry[];

  // Register constraints
  readonly registerMap: readonly RegisterEntry[];

  // Timestamps
  readonly createdAt: number; // Unix timestamp (ms)
  readonly modifiedAt: number; // Unix timestamp (ms)
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly value: unknown;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

/**
 * Validate a PerformanceRealizationV1 object
 */
export function validatePerformanceRealization(performance: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof performance !== 'object' || performance === null) {
    return {
      valid: false,
      errors: [{ path: '', message: 'Performance must be an object', value: performance }]
    };
  }

  const p = performance as Record<string, unknown>;

  // Version
  if (p.version !== '1.0') {
    errors.push({ path: 'version', message: 'Version must be "1.0"', value: p.version });
  }

  // ID
  if (typeof p.id !== 'string' || !p.id || p.id.length === 0) {
    errors.push({ path: 'id', message: 'Valid ID required', value: p.id });
  }

  // Name
  if (typeof p.name !== 'string' || !p.name || p.name.length === 0) {
    errors.push({ path: 'name', message: 'Name is required', value: p.name });
  }

  // Description (optional)
  if (p.description !== undefined && typeof p.description !== 'string') {
    errors.push({ path: 'description', message: 'Description must be a string', value: p.description });
  }

  // Arrangement style
  const validStyles: ArrangementStyle[] = [
    'SOLO_PIANO', 'SATB', 'CHAMBER_ENSEMBLE', 'FULL_ORCHESTRA',
    'JAZZ_COMBO', 'ROCK_BAND', 'AMBIENT_TECHNO', 'ELECTRONIC',
    'ACAPPELLA', 'CUSTOM'
  ];
  if (!validStyles.includes(p.arrangementStyle as ArrangementStyle)) {
    errors.push({
      path: 'arrangementStyle',
      message: `Invalid arrangement style. Must be one of: ${validStyles.join(', ')}`,
      value: p.arrangementStyle
    });
  }

  // Density
  if (typeof p.density !== 'number' || p.density < 0 || p.density > 1) {
    errors.push({ path: 'density', message: 'Density must be 0.0 to 1.0', value: p.density });
  }

  // Groove profile ID
  if (typeof p.grooveProfileId !== 'string' || !p.grooveProfileId) {
    errors.push({ path: 'grooveProfileId', message: 'Groove profile ID required', value: p.grooveProfileId });
  }

  // Instrumentation map
  if (!Array.isArray(p.instrumentationMap)) {
    errors.push({ path: 'instrumentationMap', message: 'Must be an array', value: p.instrumentationMap });
  } else if (p.instrumentationMap.length === 0) {
    errors.push({ path: 'instrumentationMap', message: 'At least one entry required', value: p.instrumentationMap });
  } else {
    p.instrumentationMap.forEach((entry: unknown, index: number) => {
      const entryErrors = validateInstrumentationEntry(entry);
      entryErrors.forEach((error) => {
        errors.push({
          path: `instrumentationMap[${index}]${error.path}`,
          message: error.message,
          value: error.value
        });
      });
    });
  }

  // ConsoleX profile ID (optional)
  if (p.consoleXProfileId !== undefined && typeof p.consoleXProfileId !== 'string') {
    errors.push({ path: 'consoleXProfileId', message: 'Must be a string', value: p.consoleXProfileId });
  }

  // Mix targets
  if (!Array.isArray(p.mixTargets)) {
    errors.push({ path: 'mixTargets', message: 'Must be an array', value: p.mixTargets });
  } else {
    p.mixTargets.forEach((entry: unknown, index: number) => {
      const entryErrors = validateMixTargetEntry(entry);
      entryErrors.forEach((error) => {
        errors.push({
          path: `mixTargets[${index}]${error.path}`,
          message: error.message,
          value: error.value
        });
      });
    });
  }

  // Register map
  if (!Array.isArray(p.registerMap)) {
    errors.push({ path: 'registerMap', message: 'Must be an array', value: p.registerMap });
  } else {
    p.registerMap.forEach((entry: unknown, index: number) => {
      const entryErrors = validateRegisterEntry(entry);
      entryErrors.forEach((error) => {
        errors.push({
          path: `registerMap[${index}]${error.path}`,
          message: error.message,
          value: error.value
        });
      });
    });
  }

  // Timestamps
  if (typeof p.createdAt !== 'number' || p.createdAt < 0) {
    errors.push({ path: 'createdAt', message: 'Valid creation timestamp required', value: p.createdAt });
  }
  if (typeof p.modifiedAt !== 'number' || p.modifiedAt < 0) {
    errors.push({ path: 'modifiedAt', message: 'Valid modification timestamp required', value: p.modifiedAt });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateInstrumentationEntry(entry: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof entry !== 'object' || entry === null) {
    errors.push({ path: '', message: 'Entry must be an object', value: entry });
    return errors;
  }

  const e = entry as Record<string, unknown>;

  // roleId
  if (typeof e.roleId !== 'string' || !e.roleId) {
    errors.push({ path: '.roleId', message: 'Role ID required', value: e.roleId });
  }

  // voiceId (optional)
  if (e.voiceId !== undefined && typeof e.voiceId !== 'string') {
    errors.push({ path: '.voiceId', message: 'Voice ID must be a string', value: e.voiceId });
  }

  // instrumentId
  const validInstruments: InstrumentType[] = [
    'LocalGal', 'KaneMarco', 'KaneMarcoAether', 'KaneMarcoAetherString',
    'NexSynth', 'SamSampler', 'DrumMachine'
  ];
  if (!validInstruments.includes(e.instrumentId as InstrumentType)) {
    errors.push({
      path: '.instrumentId',
      message: `Invalid instrument. Must be one of: ${validInstruments.join(', ')}`,
      value: e.instrumentId
    });
  }

  // presetId
  if (typeof e.presetId !== 'string' || !e.presetId) {
    errors.push({ path: '.presetId', message: 'Preset ID required', value: e.presetId });
  }

  // busId
  if (typeof e.busId !== 'string' || !e.busId) {
    errors.push({ path: '.busId', message: 'Bus ID required', value: e.busId });
  }

  return errors;
}

function validateMixTargetEntry(entry: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof entry !== 'object' || entry === null) {
    errors.push({ path: '', message: 'Entry must be an object', value: entry });
    return errors;
  }

  const e = entry as Record<string, unknown>;

  // roleId
  if (typeof e.roleId !== 'string' || !e.roleId) {
    errors.push({ path: '.roleId', message: 'Role ID required', value: e.roleId });
  }

  // gain
  if (typeof e.gain !== 'number') {
    errors.push({ path: '.gain', message: 'Gain must be a number (dB)', value: e.gain });
  }

  // pan
  if (typeof e.pan !== 'number' || e.pan < -1 || e.pan > 1) {
    errors.push({ path: '.pan', message: 'Pan must be -1.0 to +1.0', value: e.pan });
  }

  return errors;
}

function validateRegisterEntry(entry: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof entry !== 'object' || entry === null) {
    errors.push({ path: '', message: 'Entry must be an object', value: entry });
    return errors;
  }

  const e = entry as Record<string, unknown>;

  // roleId
  if (typeof e.roleId !== 'string' || !e.roleId) {
    errors.push({ path: '.roleId', message: 'Role ID required', value: e.roleId });
  }

  // minPitch
  if (typeof e.minPitch !== 'number' || e.minPitch < 0 || e.minPitch > 127) {
    errors.push({ path: '.minPitch', message: 'Min pitch must be 0-127', value: e.minPitch });
  }

  // maxPitch
  if (typeof e.maxPitch !== 'number' || e.maxPitch < 0 || e.maxPitch > 127) {
    errors.push({ path: '.maxPitch', message: 'Max pitch must be 0-127', value: e.maxPitch });
  }

  // Validate range
  if (typeof e.minPitch === 'number' && typeof e.maxPitch === 'number' && e.minPitch > e.maxPitch) {
    errors.push({
      path: '',
      message: 'Min pitch cannot be greater than max pitch',
      value: { minPitch: e.minPitch, maxPitch: e.maxPitch }
    });
  }

  return errors;
}

/**
 * Type guard for PerformanceRealizationV1
 */
export function isPerformanceRealizationV1(value: unknown): value is PerformanceRealizationV1 {
  const result = validatePerformanceRealization(value);
  return result.valid;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a minimal valid PerformanceRealization
 */
export function createMinimalPerformanceRealization(
  name: string,
  arrangementStyle: ArrangementStyle = 'CUSTOM'
): PerformanceRealizationV1 {
  const now = Date.now();

  return {
    version: '1.0',
    id: crypto.randomUUID(),
    name,
    arrangementStyle,
    density: 0.5,
    grooveProfileId: crypto.randomUUID(),
    instrumentationMap: [
      {
        roleId: 'primary',
        instrumentId: 'NexSynth',
        presetId: 'default',
        busId: crypto.randomUUID()
      }
    ],
    mixTargets: [
      {
        roleId: 'primary',
        gain: 0.0, // dB
        pan: 0.0 // Center
      }
    ],
    registerMap: [
      {
        roleId: 'primary',
        minPitch: 60, // Middle C
        maxPitch: 84 // C6
      }
    ],
    createdAt: now,
    modifiedAt: now
  };
}

/**
 * Clone PerformanceRealization with updates (immutable update pattern)
 */
export function clonePerformanceRealization(
  performance: PerformanceRealizationV1,
  updates: Partial<Omit<PerformanceRealizationV1, 'version' | 'id' | 'createdAt'>>
): PerformanceRealizationV1 {
  return {
    ...performance,
    ...updates,
    id: updates.id || performance.id, // Keep original ID unless explicitly provided
    version: '1.0',
    modifiedAt: Date.now()
  };
}

// ============================================================================
// Preset Performance Realizations
// ============================================================================

/**
 * Solo Piano Performance Realization
 *
 * Single voice, minimal instrumentation, simple register
 */
export function createSoloPianoPerformance(): PerformanceRealizationV1 {
  const now = Date.now();
  const id = crypto.randomUUID();

  return {
    version: '1.0',
    id,
    name: 'Solo Piano',
    description: 'Single piano voice, minimal density',
    arrangementStyle: 'SOLO_PIANO',
    density: 0.3,
    grooveProfileId: crypto.randomUUID(),
    instrumentationMap: [
      {
        roleId: 'primary',
        instrumentId: 'NexSynth',
        presetId: 'grand-piano',
        busId: crypto.randomUUID()
      }
    ],
    consoleXProfileId: 'consolex-piano-solo',
    mixTargets: [
      {
        roleId: 'primary',
        gain: -3.0, // dB
        pan: 0.0 // Center
      }
    ],
    registerMap: [
      {
        roleId: 'primary',
        minPitch: 48, // C3
        maxPitch: 96 // C7
      }
    ],
    createdAt: now,
    modifiedAt: now
  };
}

/**
 * SATB Choir Performance Realization
 *
 * Four voices (Soprano, Alto, Tenor, Bass), moderate density
 */
export function createSATBPerformance(): PerformanceRealizationV1 {
  const now = Date.now();
  const id = crypto.randomUUID();

  return {
    version: '1.0',
    id,
    name: 'SATB Choir',
    description: 'Four-part harmony (Soprano, Alto, Tenor, Bass)',
    arrangementStyle: 'SATB',
    density: 0.6,
    grooveProfileId: crypto.randomUUID(),
    instrumentationMap: [
      {
        roleId: 'primary',
        voiceId: 'soprano',
        instrumentId: 'KaneMarcoAetherString',
        presetId: 'choir-soprano',
        busId: crypto.randomUUID()
      },
      {
        roleId: 'primary',
        voiceId: 'alto',
        instrumentId: 'KaneMarcoAetherString',
        presetId: 'choir-alto',
        busId: crypto.randomUUID()
      },
      {
        roleId: 'primary',
        voiceId: 'tenor',
        instrumentId: 'KaneMarcoAetherString',
        presetId: 'choir-tenor',
        busId: crypto.randomUUID()
      },
      {
        roleId: 'primary',
        voiceId: 'bass',
        instrumentId: 'KaneMarcoAetherString',
        presetId: 'choir-bass',
        busId: crypto.randomUUID()
      }
    ],
    consoleXProfileId: 'consolex-satb',
    mixTargets: [
      { roleId: 'primary', gain: -6.0, pan: -0.3 }, // Slightly left
      { roleId: 'primary', gain: -6.0, pan: -0.1 }, // Center-left
      { roleId: 'primary', gain: -6.0, pan: 0.1 }, // Center-right
      { roleId: 'primary', gain: -6.0, pan: 0.3 } // Slightly right
    ],
    registerMap: [
      { roleId: 'primary', minPitch: 60, maxPitch: 84 }, // Soprano
      { roleId: 'primary', minPitch: 55, maxPitch: 79 }, // Alto
      { roleId: 'primary', minPitch: 48, maxPitch: 72 }, // Tenor
      { roleId: 'primary', minPitch: 36, maxPitch: 60 } // Bass
    ],
    createdAt: now,
    modifiedAt: now
  };
}

/**
 * Ambient Techno Performance Realization
 *
 * Multiple synths, high density, full frequency spectrum
 */
export function createAmbientTechnoPerformance(): PerformanceRealizationV1 {
  const now = Date.now();
  const id = crypto.randomUUID();

  return {
    version: '1.0',
    id,
    name: 'Ambient Techno',
    description: 'Electronic synths with effects, high density',
    arrangementStyle: 'AMBIENT_TECHNO',
    density: 0.8,
    grooveProfileId: crypto.randomUUID(),
    instrumentationMap: [
      {
        roleId: 'primary',
        voiceId: 'lead',
        instrumentId: 'NexSynth',
        presetId: 'techno-lead',
        busId: crypto.randomUUID()
      },
      {
        roleId: 'primary',
        voiceId: 'pad',
        instrumentId: 'KaneMarco',
        presetId: 'ambient-pad',
        busId: crypto.randomUUID()
      },
      {
        roleId: 'secondary',
        voiceId: 'bass',
        instrumentId: 'NexSynth',
        presetId: 'techno-bass',
        busId: crypto.randomUUID()
      },
      {
        roleId: 'secondary',
        voiceId: 'arp',
        instrumentId: 'KaneMarco',
        presetId: 'techno-arp',
        busId: crypto.randomUUID()
      },
      {
        roleId: 'tertiary',
        voiceId: 'drone',
        instrumentId: 'KaneMarcoAether',
        presetId: 'drone-low',
        busId: crypto.randomUUID()
      },
      {
        roleId: 'tertiary',
        voiceId: 'texture',
        instrumentId: 'KaneMarcoAether',
        presetId: 'texture-high',
        busId: crypto.randomUUID()
      }
    ],
    consoleXProfileId: 'consolex-techno',
    mixTargets: [
      { roleId: 'primary', gain: -3.0, pan: 0.0 }, // Lead center
      { roleId: 'secondary', gain: -6.0, pan: -0.4 }, // Bass left
      { roleId: 'secondary', gain: -6.0, pan: 0.4 }, // Arp right
      { roleId: 'tertiary', gain: -12.0, pan: 0.0 }, // Drone center
      { roleId: 'tertiary', gain: -12.0, pan: 0.0 } // Texture center
    ],
    registerMap: [
      { roleId: 'primary', minPitch: 60, maxPitch: 96 }, // Lead
      { roleId: 'primary', minPitch: 48, maxPitch: 72 }, // Pad
      { roleId: 'secondary', minPitch: 24, maxPitch: 48 }, // Bass
      { roleId: 'secondary', minPitch: 60, maxPitch: 84 }, // Arp
      { roleId: 'tertiary', minPitch: 24, maxPitch: 48 }, // Drone
      { roleId: 'tertiary', minPitch: 72, maxPitch: 120 } // Texture
    ],
    createdAt: now,
    modifiedAt: now
  };
}

/**
 * Get all preset performance realizations
 */
export function getPresetPerformances(): Record<string, PerformanceRealizationV1> {
  return {
    solo_piano: createSoloPianoPerformance(),
    satb: createSATBPerformance(),
    ambient_techno: createAmbientTechnoPerformance()
  };
}

/**
 * Get preset performance by name
 */
export function getPresetPerformance(name: string): PerformanceRealizationV1 | undefined {
  const presets = getPresetPerformances();
  return presets[name];
}

/**
 * Get list of available preset names
 */
export function getPresetPerformanceNames(): string[] {
  return Object.keys(getPresetPerformances());
}

/**
 * PerformanceState_v1 - Performance realization lens
 *
 * PerformanceState represents how a song is realized (solo piano, SATB, ambient techno, etc.)
 * - one of many parallel performance universes for a single song.
 *
 * This matches PerformanceState_v1.schema.json exactly.
 */

// =============================================================================
// PerformanceState_v1
// =============================================================================

/**
 * PerformanceState_v1 - Performance realization lens for SongState
 *
 * Represents how a song is realized (solo piano, SATB, ambient techno, etc.)
 * - one of many parallel performance universes for a single song.
 *
 * Matches PerformanceState_v1.schema.json
 */
export interface PerformanceState_v1 {
  readonly version: '1';
  readonly id: string;
  readonly name: string;
  readonly arrangementStyle: ArrangementStyle;
  readonly density?: number; // 0-1, default 1
  readonly grooveProfileId?: string; // default 'default'
  readonly instrumentationMap?: Record<string, InstrumentAssignment>;
  readonly consoleXProfileId?: string; // default 'default'
  readonly mixTargets?: Record<string, MixTarget>;
  readonly createdAt?: string; // ISO 8601 date-time
  readonly modifiedAt?: string; // ISO 8601 date-time
  readonly metadata?: Record<string, unknown>;
}

/**
 * Arrangement style enum
 *
 * Matches the enum in PerformanceState_v1.schema.json
 */
export type ArrangementStyle =
  | 'SOLO_PIANO'
  | 'SATB'
  | 'CHAMBER_ENSEMBLE'
  | 'FULL_ORCHESTRA'
  | 'JAZZ_COMBO'
  | 'JAZZ_TRIO'
  | 'ROCK_BAND'
  | 'AMBIENT_TECHNO'
  | 'ELECTRONIC'
  | 'ACAPPELLA'
  | 'STRING_QUARTET'
  | 'CUSTOM';

/**
 * Instrument assignment
 *
 * Maps roles or track IDs to instrument assignments
 */
export interface InstrumentAssignment {
  readonly instrumentId: string; // Instrument identifier (e.g., 'LocalGal', 'KaneMarco')
  readonly presetId?: string; // Optional preset identifier
  readonly parameters?: Record<string, number>; // Custom instrument parameters
}

/**
 * Mix target
 *
 * Per-role or per-track gain/pan targets
 */
export interface MixTarget {
  readonly gain: number; // Gain in decibels (-inf to 0 dB)
  readonly pan: number; // Pan position (-1 = left, 0 = center, 1 = right)
  readonly stereo?: boolean; // Whether this target is stereo (default true)
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate PerformanceState_v1
 *
 * @param state - Performance state to validate
 * @returns Validation result with errors
 */
export function validatePerformanceState(state: PerformanceState_v1): {
  valid: boolean;
  errors: readonly string[];
} {
  const errors: string[] = [];

  // Version check
  if (state.version !== '1') {
    errors.push(`Invalid version: ${state.version}`);
  }

  // ID check
  if (!state.id || typeof state.id !== 'string') {
    errors.push('Performance state must have a valid ID');
  }

  // Name check
  if (!state.name || typeof state.name !== 'string' || state.name.length < 1 || state.name.length > 256) {
    errors.push('Performance state must have a valid name (1-256 characters)');
  }

  // Arrangement style check
  const validStyles: ArrangementStyle[] = [
    'SOLO_PIANO', 'SATB', 'CHAMBER_ENSEMBLE', 'FULL_ORCHESTRA',
    'JAZZ_COMBO', 'JAZZ_TRIO', 'ROCK_BAND', 'AMBIENT_TECHNO',
    'ELECTRONIC', 'ACAPPELLA', 'STRING_QUARTET', 'CUSTOM'
  ];
  if (!validStyles.includes(state.arrangementStyle)) {
    errors.push(`Invalid arrangement style: ${state.arrangementStyle}`);
  }

  // Density check (optional)
  if (state.density !== undefined) {
    if (typeof state.density !== 'number' || state.density < 0 || state.density > 1) {
      errors.push('Density must be between 0 and 1');
    }
  }

  // Instrumentation map check (optional)
  if (state.instrumentationMap) {
    for (const [key, assignment] of Object.entries(state.instrumentationMap)) {
      if (!assignment.instrumentId || typeof assignment.instrumentId !== 'string') {
        errors.push(`Instrument assignment for "${key}" must have a valid instrumentId`);
      }
      if (assignment.presetId !== undefined && typeof assignment.presetId !== 'string') {
        errors.push(`Preset ID for "${key}" must be a string`);
      }
      if (assignment.parameters) {
        for (const [paramName, value] of Object.entries(assignment.parameters)) {
          if (typeof value !== 'number') {
            errors.push(`Parameter "${paramName}" for "${key}" must be a number`);
          }
        }
      }
    }
  }

  // Mix targets check (optional)
  if (state.mixTargets) {
    for (const [key, target] of Object.entries(state.mixTargets)) {
      if (typeof target.gain !== 'number') {
        errors.push(`Gain for "${key}" must be a number`);
      }
      if (typeof target.pan !== 'number' || target.pan < -1 || target.pan > 1) {
        errors.push(`Pan for "${key}" must be between -1 and 1`);
      }
      if (target.stereo !== undefined && typeof target.stereo !== 'boolean') {
        errors.push(`Stereo flag for "${key}" must be a boolean`);
      }
    }
  }

  // Date checks (optional)
  if (state.createdAt && !isValidISO8601(state.createdAt)) {
    errors.push('createdAt must be a valid ISO 8601 date-time string');
  }
  if (state.modifiedAt && !isValidISO8601(state.modifiedAt)) {
    errors.push('modifiedAt must be a valid ISO 8601 date-time string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if string is valid ISO 8601 date-time
 */
function isValidISO8601(dateString: string): boolean {
  return !isNaN(Date.parse(dateString));
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a minimal valid PerformanceState for testing
 *
 * @param overrides - Optional field overrides
 * @returns Minimal PerformanceState_v1
 */
export function createMinimalPerformanceState(
  overrides: Partial<PerformanceState_v1> = {}
): PerformanceState_v1 {
  return {
    version: '1',
    id: `performance-${Date.now()}`,
    name: 'Default Performance',
    arrangementStyle: 'SOLO_PIANO',
    density: 1.0,
    grooveProfileId: 'default',
    consoleXProfileId: 'default',
    instrumentationMap: {},
    mixTargets: {},
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

/**
 * Create PerformanceState for solo piano
 */
export function createSoloPianoPerformance(
  overrides: Partial<PerformanceState_v1> = {}
): PerformanceState_v1 {
  return createMinimalPerformanceState({
    name: 'Solo Piano',
    arrangementStyle: 'SOLO_PIANO',
    density: 0.35,
    instrumentationMap: {
      'primary': {
        instrumentId: 'LocalGal',
        presetId: 'grand_piano'
      }
    },
    mixTargets: {
      'primary': {
        gain: -3.0,
        pan: 0.0,
        stereo: true
      }
    },
    ...overrides
  });
}

/**
 * Create PerformanceState for SATB choir
 */
export function createSATBPerformance(
  overrides: Partial<PerformanceState_v1> = {}
): PerformanceState_v1 {
  return createMinimalPerformanceState({
    name: 'SATB Choir',
    arrangementStyle: 'SATB',
    density: 0.55,
    instrumentationMap: {
      'soprano': { instrumentId: 'NexSynth', presetId: 'choir_soprano' },
      'alto': { instrumentId: 'NexSynth', presetId: 'choir_alto' },
      'tenor': { instrumentId: 'NexSynth', presetId: 'choir_tenor' },
      'bass': { instrumentId: 'NexSynth', presetId: 'choir_bass' }
    },
    mixTargets: {
      'soprano': { gain: -6.0, pan: -0.3, stereo: true },
      'alto': { gain: -6.0, pan: 0.3, stereo: true },
      'tenor': { gain: -6.0, pan: -0.2, stereo: true },
      'bass': { gain: -6.0, pan: 0.2, stereo: true }
    },
    ...overrides
  });
}

/**
 * Create PerformanceState for ambient techno
 */
export function createAmbientTechnoPerformance(
  overrides: Partial<PerformanceState_v1> = {}
): PerformanceState_v1 {
  return createMinimalPerformanceState({
    name: 'Ambient Techno',
    arrangementStyle: 'AMBIENT_TECHNO',
    density: 0.8,
    grooveProfileId: 'swing',
    instrumentationMap: {
      'pulse': { instrumentId: 'DrumMachine', presetId: 'techno_kick' },
      'foundation': { instrumentId: 'KaneMarcoAether', presetId: 'deep_bass' },
      'texture': { instrumentId: 'NexSynth', presetId: 'ambient_pad' },
      'voice': { instrumentId: 'KaneMarcoAetherString', presetId: 'ethereal_lead' }
    },
    mixTargets: {
      'pulse': { gain: -2.0, pan: 0.0, stereo: false },
      'foundation': { gain: -6.0, pan: 0.0, stereo: true },
      'texture': { gain: -12.0, pan: 0.0, stereo: true },
      'voice': { gain: -3.0, pan: 0.0, stereo: true }
    },
    ...overrides
  });
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serialize PerformanceState to JSON
 */
export function serializePerformanceState(state: PerformanceState_v1): string {
  const validation = validatePerformanceState(state);
  if (!validation.valid) {
    throw new Error(`Invalid PerformanceState: ${validation.errors.join(', ')}`);
  }
  return JSON.stringify(state, null, 2);
}

/**
 * Deserialize PerformanceState from JSON
 */
export function deserializePerformanceState(json: string): PerformanceState_v1 {
  const state = JSON.parse(json) as PerformanceState_v1;
  const validation = validatePerformanceState(state);
  if (!validation.valid) {
    throw new Error(`Invalid PerformanceState: ${validation.errors.join(', ')}`);
  }
  return state;
}

/**
 * Clone PerformanceState with updates
 */
export function clonePerformanceState(
  state: PerformanceState_v1,
  updates: Partial<PerformanceState_v1>
): PerformanceState_v1 {
  const cloned: PerformanceState_v1 = {
    ...state,
    ...updates,
    id: updates.id || state.id,
    modifiedAt: new Date().toISOString()
  };

  const validation = validatePerformanceState(cloned);
  if (!validation.valid) {
    throw new Error(`Invalid PerformanceState: ${validation.errors.join(', ')}`);
  }

  return cloned;
}

/**
 * PerformanceConfiguration - Realization Lens
 *
 * PerformanceConfiguration represents "how the song sounds" - the realization parameters.
 * It is completely separate from SongState (which is "what the song is").
 *
 * The same SongState can yield infinite realizations through different PerformanceConfigurations:
 * - Solo Piano (1 voice, minimal density, simple mixing)
 * - SATB Choir (4 voices, moderate density, standard reverb)
 * - Ambient Techno (8 voices, high density, heavy effects)
 *
 * CRITICAL: PerformanceConfiguration must NOT contain:
 * ❌ No musical logic (rhythm, melody, harmony, form)
 * ❌ No notes or timeline
 * ❌ No Schillinger system parameters
 *
 * PerformanceConfiguration ONLY contains:
 * ✅ Instrumentation (roles → instruments + presets)
 * ✅ Performance parameters (density scaling, groove, register)
 * ✅ Mixing (ConsoleX profile, bus configuration)
 * ✅ Performance targets (CPU usage, polyphony)
 */

import type { InstrumentType } from './song_contract.js';

// ============================================================================
// Core PerformanceConfiguration Type
// ============================================================================

/**
 * PerformanceConfiguration v1 - Realization lens for SongState
 *
 * Defines how a SongState is realized as audio:
 * - Which instruments play which roles
 * - How dense the notes are (density scaling)
 * - Timing and groove characteristics
 * - Register (pitch range) per role
 * - ConsoleX mixing profile
 * - Performance constraints (CPU, polyphony)
 */
export interface PerformanceConfiguration {
  readonly version: '1.0';
  readonly id: string;
  readonly name: string;
  readonly description?: string;

  // Instrumentation: Role → Instrument + Preset
  readonly instrumentation: InstrumentationMap;

  // Performance parameters
  readonly densityScale: number; // 0-1 (scales note density)
  readonly grooveProfile: GrooveProfile;

  // Register mapping: Role → Pitch range
  readonly registerMap: RegisterMap;

  // Mixing configuration
  readonly consolexProfileId: string;
  readonly busConfiguration: BusConfiguration;

  // Performance targets
  readonly targetCpuUsage: number; // 0-1 (target CPU percentage)
  readonly maxVoices: number; // Max polyphony
  readonly voiceStealing: boolean; // Enable voice stealing

  // Metadata
  readonly createdAt: number;
  readonly modifiedAt: number;
}

// ============================================================================
// Instrumentation Map
// ============================================================================

/**
 * Instrumentation map assigns instruments to roles
 *
 * Roles are functional (primary/secondary/tertiary) from SongState.
 * Instruments are concrete (LocalGal, KaneMarco, NexSynth, etc.)
 */
export interface InstrumentationMap {
  readonly assignments: readonly InstrumentAssignment[];
}

/**
 * Assignment of instrument to role
 */
export interface InstrumentAssignment {
  readonly roleId: string; // 'primary' | 'secondary' | 'tertiary'
  readonly instrumentType: InstrumentType; // 'LocalGal' | 'KaneMarco' | etc.
  readonly presetId: string; // Preset identifier
  readonly busId: string; // Mix bus ID
}

// ============================================================================
// Performance Parameters
// ============================================================================

/**
 * Groove profile defines timing/humanization characteristics
 */
export interface GrooveProfile {
  readonly id: string;
  readonly name: string;
  readonly timingVariance: number; // 0-1 (how much timing varies)
  readonly velocityVariance: number; // 0-1 (how much velocity varies)
  readonly swingAmount: number; // 0-1 (swing intensity)
  readonly humanization: HumanizationProfile;
}

/**
 * Humanization profile for natural feel
 */
export interface HumanizationProfile {
  readonly microTimingDeviation: number; // +/- ms
  readonly velocityCurve: 'linear' | 'logarithmic' | 'exponential';
  readonly randomization: number; // 0-1 (how random)
}

// ============================================================================
// Register Map
// ============================================================================

/**
 * Register map defines pitch range per role
 *
 * Constrains notes from SongState to specific ranges per role.
 * Example: Primary role plays bass (32-60), Secondary plays melody (60-84)
 */
export interface RegisterMap {
  readonly ranges: readonly RegisterRange[];
}

/**
 * Register range for a role
 */
export interface RegisterRange {
  readonly roleId: string;
  readonly minNote: number; // MIDI note (0-127)
  readonly maxNote: number; // MIDI note (0-127)
  readonly transposition: number; // Semitones to transpose (+/-)
}

// ============================================================================
// Mixing Configuration
// ============================================================================

/**
 * Bus configuration for routing
 *
 * Defines how voices are routed through ConsoleX.
 * This is simplified from full ConsoleModel - just routing structure.
 */
export interface BusConfiguration {
  readonly voiceBusIds: readonly string[]; // Voice bus IDs
  readonly mixBusIds: readonly string[]; // Mix bus IDs
  readonly masterBusId: string; // Master bus ID
  readonly routing: readonly RoutingPath[]; // Voice → Mix → Master
}

/**
 * Routing path for a voice
 */
export interface RoutingPath {
  readonly roleId: string; // Role being routed
  readonly voiceBusId: string; // Source voice bus
  readonly mixBusIds: readonly string[]; // Target mix buses (sends)
  readonly sendLevels: readonly number[]; // Send levels per mix bus
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
  readonly errors: ValidationError[];
}

/**
 * Validate PerformanceConfiguration
 */
export function validatePerformanceConfiguration(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof config !== 'object' || config === null) {
    return {
      valid: false,
      errors: [{ path: '', message: 'Configuration must be an object', value: config }]
    };
  }

  const c = config as Record<string, unknown>;

  // Version
  if (c.version !== '1.0') {
    errors.push({ path: 'version', message: 'Version must be "1.0"', value: c.version });
  }

  // ID
  if (typeof c.id !== 'string' || c.id.length === 0) {
    errors.push({ path: 'id', message: 'ID is required', value: c.id });
  }

  // Name
  if (typeof c.name !== 'string' || c.name.length === 0) {
    errors.push({ path: 'name', message: 'Name is required', value: c.name });
  }

  // Instrumentation
  if (!validateInstrumentationMap(c.instrumentation)) {
    errors.push({ path: 'instrumentation', message: 'Invalid instrumentation map', value: c.instrumentation });
  }

  // Density scale
  if (typeof c.densityScale !== 'number' || c.densityScale < 0 || c.densityScale > 1) {
    errors.push({ path: 'densityScale', message: 'Density scale must be 0-1', value: c.densityScale });
  }

  // Groove profile
  if (!validateGrooveProfile(c.grooveProfile)) {
    errors.push({ path: 'grooveProfile', message: 'Invalid groove profile', value: c.grooveProfile });
  }

  // Register map
  if (!validateRegisterMap(c.registerMap)) {
    errors.push({ path: 'registerMap', message: 'Invalid register map', value: c.registerMap });
  }

  // ConsoleX profile ID
  if (typeof c.consolexProfileId !== 'string' || c.consolexProfileId.length === 0) {
    errors.push({ path: 'consolexProfileId', message: 'ConsoleX profile ID is required', value: c.consolexProfileId });
  }

  // Bus configuration
  if (!validateBusConfiguration(c.busConfiguration)) {
    errors.push({ path: 'busConfiguration', message: 'Invalid bus configuration', value: c.busConfiguration });
  }

  // Target CPU usage
  if (typeof c.targetCpuUsage !== 'number' || c.targetCpuUsage < 0 || c.targetCpuUsage > 1) {
    errors.push({ path: 'targetCpuUsage', message: 'Target CPU usage must be 0-1', value: c.targetCpuUsage });
  }

  // Max voices
  if (typeof c.maxVoices !== 'number' || c.maxVoices < 1 || c.maxVoices > 1000) {
    errors.push({ path: 'maxVoices', message: 'Max voices must be 1-1000', value: c.maxVoices });
  }

  // Voice stealing
  if (typeof c.voiceStealing !== 'boolean') {
    errors.push({ path: 'voiceStealing', message: 'Voice stealing must be boolean', value: c.voiceStealing });
  }

  // Timestamps
  if (typeof c.createdAt !== 'number' || c.createdAt < 0) {
    errors.push({ path: 'createdAt', message: 'Invalid created timestamp', value: c.createdAt });
  }
  if (typeof c.modifiedAt !== 'number' || c.modifiedAt < 0) {
    errors.push({ path: 'modifiedAt', message: 'Invalid modified timestamp', value: c.modifiedAt });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateInstrumentationMap(map: unknown): boolean {
  if (typeof map !== 'object' || map === null) return false;
  const m = map as Record<string, unknown>;
  return Array.isArray(m.assignments) && m.assignments.length > 0;
}

function validateGrooveProfile(profile: unknown): boolean {
  if (typeof profile !== 'object' || profile === null) return false;
  const p = profile as Record<string, unknown>;
  return (
    typeof p.id === 'string' && p.id.length > 0 &&
    typeof p.timingVariance === 'number' && p.timingVariance >= 0 && p.timingVariance <= 1 &&
    typeof p.velocityVariance === 'number' && p.velocityVariance >= 0 && p.velocityVariance <= 1 &&
    typeof p.swingAmount === 'number' && p.swingAmount >= 0 && p.swingAmount <= 1
  );
}

function validateRegisterMap(map: unknown): boolean {
  if (typeof map !== 'object' || map === null) return false;
  const m = map as Record<string, unknown>;
  if (!Array.isArray(m.ranges)) return false;
  for (const range of m.ranges) {
    if (typeof range !== 'object' || range === null) return false;
    const r = range as Record<string, unknown>;
    if (
      typeof r.roleId !== 'string' ||
      typeof r.minNote !== 'number' || r.minNote < 0 || r.minNote > 127 ||
      typeof r.maxNote !== 'number' || r.maxNote < 0 || r.maxNote > 127 ||
      typeof r.transposition !== 'number'
    ) {
      return false;
    }
  }
  return true;
}

function validateBusConfiguration(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;
  return (
    Array.isArray(c.voiceBusIds) &&
    Array.isArray(c.mixBusIds) &&
    typeof c.masterBusId === 'string' && c.masterBusId.length > 0 &&
    Array.isArray(c.routing)
  );
}

/**
 * Type guard for PerformanceConfiguration
 */
export function isPerformanceConfiguration(value: unknown): value is PerformanceConfiguration {
  const result = validatePerformanceConfiguration(value);
  return result.valid;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create minimal valid PerformanceConfiguration
 */
export function createMinimalPerformanceConfiguration(options: {
  name: string;
  roleId: string;
  instrumentType: InstrumentType;
  presetId?: string;
}): PerformanceConfiguration {
  const now = Date.now();
  const roleId = options.roleId;
  const busId = `bus-${roleId}`;

  return {
    version: '1.0',
    id: crypto.randomUUID(),
    name: options.name,
    description: `Minimal performance configuration for ${options.name}`,

    instrumentation: {
      assignments: [{
        roleId,
        instrumentType: options.instrumentType,
        presetId: options.presetId || 'default',
        busId
      }]
    },

    densityScale: 0.5,
    grooveProfile: {
      id: 'groove-straight',
      name: 'Straight',
      timingVariance: 0.0,
      velocityVariance: 0.1,
      swingAmount: 0.0,
      humanization: {
        microTimingDeviation: 0,
        velocityCurve: 'linear',
        randomization: 0.0
      }
    },

    registerMap: {
      ranges: [{
        roleId,
        minNote: 48, // C3
        maxNote: 84, // C6
        transposition: 0
      }]
    },

    consolexProfileId: 'default',
    busConfiguration: {
      voiceBusIds: [busId],
      mixBusIds: [],
      masterBusId: 'master',
      routing: [{
        roleId,
        voiceBusId: busId,
        mixBusIds: [],
        sendLevels: []
      }]
    },

    targetCpuUsage: 0.1, // 10% CPU
    maxVoices: 16,
    voiceStealing: true,

    createdAt: now,
    modifiedAt: now
  };
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize PerformanceConfiguration to JSON
 */
export function serializePerformanceConfiguration(config: PerformanceConfiguration): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Deserialize PerformanceConfiguration from JSON
 */
export function deserializePerformanceConfiguration(json: string): PerformanceConfiguration {
  const config = JSON.parse(json) as PerformanceConfiguration;
  const validation = validatePerformanceConfiguration(config);
  if (!validation.valid) {
    throw new Error(`Invalid PerformanceConfiguration: ${validation.errors.map(e => `${e.path}: ${e.message}`).join(', ')}`);
  }
  return config;
}

/**
 * Clone PerformanceConfiguration with updates
 */
export function clonePerformanceConfiguration(
  config: PerformanceConfiguration,
  updates: Partial<PerformanceConfiguration>
): PerformanceConfiguration {
  return {
    ...config,
    ...updates,
    id: updates.id || config.id,
    modifiedAt: Date.now()
  };
}

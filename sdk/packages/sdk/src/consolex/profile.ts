/**
 * ConsoleX Profile Types
 *
 * ConsoleX profiles define mixing settings, bus configuration, and performance
 * parameters that are applied when switching between performances.
 *
 * Each performance (Piano, SATB, Techno) has a corresponding ConsoleX profile
 * that optimizes the mix for that arrangement style.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Bus settings define mixing parameters for a mix bus
 */
export interface BusSettings {
  id: string;
  name: string;

  // Mix parameters
  gain: number;           // Linear gain (1.0 = unity)
  pan: number;            // -1 (left) to +1 (right)
  muted: boolean;
  soloed: boolean;

  // Effects
  inserts: InsertEffect[];
  sends: Send[];
}

/**
 * Insert effect (in-line processing on a bus)
 */
export interface InsertEffect {
  id: string;
  type: 'compressor' | 'eq' | 'limiter' | 'saturation' | 'filter' | 'custom';
  enabled: boolean;
  parameters: Record<string, number>;
}

/**
 * Aux send to effects bus
 */
export interface Send {
  busId: string;          // Destination bus
  amount: number;         // 0-1
  preFader: boolean;      // true = pre-fader, false = post-fader
}

/**
 * ConsoleX profile - complete mixing configuration
 */
export interface ConsoleXProfile {
  // Identity
  id: string;
  name: string;
  description?: string;

  // Bus configuration
  masterBus: BusSettings;
  voiceBusses: BusSettings[];
  mixBusses: BusSettings[];    // Effects buses (reverb, delay, etc.)

  // Performance parameters
  performance: PerformanceSettings;

  // Metadata
  createdAt?: number;
  modifiedAt?: number;
}

/**
 * Performance settings for ConsoleX
 */
export interface PerformanceSettings {
  targetCpuUsage: number;      // Target CPU percentage (0-100)
  maxVoices: number;           // Max polyphony
  voiceStealing: boolean;      // Enable voice stealing
  voiceStealFade: number;      // Voice steal fade time (ms)
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a ConsoleXProfile
 */
export function validateConsoleXProfile(profile: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile must be an object'] };
  }

  const p = profile as Partial<ConsoleXProfile>;

  // Check required fields
  if (!p.id || typeof p.id !== 'string') {
    errors.push('Missing or invalid id');
  }

  if (!p.name || typeof p.name !== 'string') {
    errors.push('Missing or invalid name');
  }

  if (!p.masterBus || typeof p.masterBus !== 'object') {
    errors.push('Missing or invalid masterBus');
  } else {
    validateBusSettings(p.masterBus, 'masterBus', errors);
  }

  if (!Array.isArray(p.voiceBusses)) {
    errors.push('Missing or invalid voiceBusses');
  } else {
    p.voiceBusses.forEach((bus, index) => {
      validateBusSettings(bus, `voiceBusses[${index}]`, errors);
    });
  }

  if (!Array.isArray(p.mixBusses)) {
    errors.push('Missing or invalid mixBusses');
  } else {
    p.mixBusses.forEach((bus, index) => {
      validateBusSettings(bus, `mixBusses[${index}]`, errors);
    });
  }

  if (!p.performance || typeof p.performance !== 'object') {
    errors.push('Missing or invalid performance');
  } else {
    validatePerformanceSettings(p.performance, errors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate bus settings
 */
function validateBusSettings(bus: unknown, path: string, errors: string[]): void {
  if (!bus || typeof bus !== 'object') {
    errors.push(`${path}: must be an object`);
    return;
  }

  const b = bus as Partial<BusSettings>;

  if (!b.id || typeof b.id !== 'string') {
    errors.push(`${path}.id: missing or invalid`);
  }

  if (!b.name || typeof b.name !== 'string') {
    errors.push(`${path}.name: missing or invalid`);
  }

  if (typeof b.gain !== 'number' || b.gain < 0 || b.gain > 2) {
    errors.push(`${path}.gain: must be between 0 and 2`);
  }

  if (typeof b.pan !== 'number' || b.pan < -1 || b.pan > 1) {
    errors.push(`${path}.pan: must be between -1 and 1`);
  }

  if (typeof b.muted !== 'boolean') {
    errors.push(`${path}.muted: must be boolean`);
  }

  if (typeof b.soloed !== 'boolean') {
    errors.push(`${path}.soloed: must be boolean`);
  }

  if (!Array.isArray(b.inserts)) {
    errors.push(`${path}.inserts: must be array`);
  }

  if (!Array.isArray(b.sends)) {
    errors.push(`${path}.sends: must be array`);
  }
}

/**
 * Validate performance settings
 */
function validatePerformanceSettings(perf: unknown, errors: string[]): void {
  if (!perf || typeof perf !== 'object') {
    errors.push('performance: must be an object');
    return;
  }

  const p = perf as Partial<PerformanceSettings>;

  if (typeof p.targetCpuUsage !== 'number' || p.targetCpuUsage < 0 || p.targetCpuUsage > 100) {
    errors.push('performance.targetCpuUsage: must be between 0 and 100');
  }

  if (typeof p.maxVoices !== 'number' || p.maxVoices < 1 || p.maxVoices > 256) {
    errors.push('performance.maxVoices: must be between 1 and 256');
  }

  if (typeof p.voiceStealing !== 'boolean') {
    errors.push('performance.voiceStealing: must be boolean');
  }

  if (typeof p.voiceStealFade !== 'number' || p.voiceStealFade < 0 || p.voiceStealFade > 1000) {
    errors.push('performance.voiceStealFade: must be between 0 and 1000 ms');
  }
}

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Serialize a ConsoleXProfile to JSON
 */
export function serializeConsoleXProfile(profile: ConsoleXProfile): string {
  return JSON.stringify(profile, null, 2);
}

/**
 * Deserialize a ConsoleXProfile from JSON
 */
export function deserializeConsoleXProfile(json: string): ConsoleXProfile {
  const profile = JSON.parse(json);
  const validation = validateConsoleXProfile(profile);

  if (!validation.valid) {
    throw new Error(`Invalid ConsoleX profile: ${validation.errors.join(', ')}`);
  }

  return profile as ConsoleXProfile;
}

/**
 * Deep clone a ConsoleXProfile
 */
export function cloneConsoleXProfile(profile: ConsoleXProfile): ConsoleXProfile {
  return deserializeConsoleXProfile(serializeConsoleXProfile(profile));
}

/**
 * Song Factory - Create SongState from SongContract
 *
 * This is a placeholder for the realization engine that will derive
 * executable songs from theory contracts.
 */

import type { SongContractV1 } from './song_contract.js';
import type { SongStateV1 } from './song_state_v1.js';
import { now } from './ids.js';
import { globalSongCache } from './song_cache.js';

// ============================================================================
// Seeded PRNG for Determinism
// ============================================================================

/**
 * Seeded random number generator for deterministic derivation
 *
 * Uses a simple Mulberry32 algorithm for reproducible random sequences
 * from a given seed value.
 */
class SeededPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /**
   * Generate next random float in [0, 1)
   */
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer in [min, max] (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float in [min, max]
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Generate random boolean with given probability
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Select random element from array
   */
  nextChoice<T>(array: readonly T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array (returns new array)
   */
  shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Generate deterministic ID from seed and counter
 */
function generateDeterministicId(prng: SeededPRNG, prefix: string): string {
  // Generate UUID-like ID using PRNG
  const bytes = new Array(16).fill(0).map(() => {
    const byte = prng.nextInt(0, 255);
    return byte.toString(16).padStart(2, '0');
  });

  return [
    bytes.slice(0, 4).join(''),
    bytes.slice(4, 6).join(''),
    bytes.slice(6, 8).join(''),
    bytes.slice(8, 10).join(''),
    bytes.slice(10, 16).join('')
  ].join('-');
}

/**
 * Simple string hash for seed mixing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Convert simplified Console to ConsoleModel
 */
function convertConsoleToConsoleModel(console: import('./song_contract.js').Console): import('./song_state_v1.js').ConsoleModel {
  return {
    version: '1.0',
    id: `console-${Date.now()}`,
    voiceBusses: console.buses
      .filter(b => b.type === 'voice')
      .map(bus => ({
        id: bus.id,
        name: bus.name,
        type: 'voice',
        inserts: [],
        gain: bus.gain ?? 0,
        pan: bus.pan ?? 0,
        muted: false,
        solo: false
      })),
    mixBusses: console.buses
      .filter(b => b.type === 'mix')
      .map(bus => ({
        id: bus.id,
        name: bus.name,
        type: 'mix',
        inserts: [],
        gain: bus.gain ?? 0,
        pan: bus.pan ?? 0,
        muted: false,
        solo: false
      })),
    masterBus: {
      id: 'master',
      name: 'Master',
      type: 'master',
      inserts: [],
      gain: 0,
      pan: 0,
      muted: false,
      solo: false
    },
    sendEffects: [],
    routing: {
      routes: []
    },
    metering: {
      enabled: false,
      refreshRate: 30,
      meterType: 'peak',
      holdTime: 1000
    }
  };
}

// ============================================================================
// Schillinger System Generators
// ============================================================================

/**
 * Generate rhythm pattern from Schillinger Book I system
 *
 * Implements basic resultant rhythm generation from interference patterns.
 */
function generateRhythmPattern(
  prng: SeededPRNG,
  rhythmSystem: SongContractV1['rhythmSystems'][0],
  tempo: number,
  sampleRate: number,
  duration: number
): number[] {
  const { generators, resultants, density } = rhythmSystem;
  const beatDuration = beatsToSamples(1, tempo, sampleRate);
  const gridResolution = beatsToSamples(density.gridResolution, tempo, sampleRate);

  // Generate attack points based on generators
  const attacks: number[] = [];

  if (generators.length >= 2 && resultants.length > 0) {
    // Use interference pattern between two generators
    const [gen1, gen2] = generators;
    const period1 = gen1.period;
    const period2 = gen2.period;
    const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
    const gcd = (a: number, b: number) => b === 0 ? a : gcd(b, a % b);
    const resultantPeriod = lcm(period1, period2);

    // Generate attacks over the resultant period
    for (let beat = 0; beat < duration / beatDuration; beat++) {
      const positionInCycle = beat % resultantPeriod;

      // Check if this position aligns with either generator
      const aligns1 = Math.abs(positionInCycle % period1) < 0.01;
      const aligns2 = Math.abs(positionInCycle % period2) < 0.01;

      if (aligns1 || aligns2) {
        attacks.push(beat * beatDuration);
      }
    }
  } else if (generators.length === 1) {
    // Single generator - create regular pattern
    const period = generators[0].period;
    for (let beat = 0; beat < duration / beatDuration; beat++) {
      if (beat % period < 1) {
        attacks.push(beat * beatDuration);
      }
    }
  } else {
    // Fallback: random pattern within density constraints
    const gridPositions = Math.floor(duration / gridResolution);
    const targetAttacks = Math.floor(
      gridPositions * ((density.minDensity + density.maxDensity) / 2)
    );

    for (let i = 0; i < targetAttacks; i++) {
      const position = prng.nextInt(0, gridPositions - 1) * gridResolution;
      attacks.push(position);
    }
  }

  // Sort and deduplicate
  const uniqueAttacks = Array.from(new Set(attacks));
  return uniqueAttacks.sort((a, b) => a - b);
}

/**
 * Generate pitch sequence from Schillinger Book II system
 *
 * Implements basic melody generation from pitch cycles and interval seeds.
 */
function generatePitchSequence(
  prng: SeededPRNG,
  melodySystem: SongContractV1['melodySystems'][0],
  length: number
): number[] {
  const { pitchCycle, intervalSeeds, contour, register } = melodySystem;
  const pitches: number[] = [];

  // Start from middle of register
  let currentPitch = Math.floor((register.minNote + register.maxNote) / 2);

  // Build scale from interval seeds
  const scale = intervalSeeds.length > 0 && intervalSeeds[0].ordered
    ? buildScale(intervalSeeds[0].intervals)
    : [0, 2, 4, 5, 7, 9, 11]; // Default to major scale

  // Generate pitches
  for (let i = 0; i < length; i++) {
    // Constrain to register
    currentPitch = Math.max(register.minNote, Math.min(register.maxNote, currentPitch));
    pitches.push(currentPitch);

    // Determine next direction based on contour
    let direction: number;
    switch (contour.direction) {
      case 'ascending':
        direction = 1;
        break;
      case 'descending':
        direction = -1;
        break;
      case 'oscillating':
        direction = i % 2 === 0 ? 1 : -1;
        break;
      case 'neutral':
      default:
        direction = prng.nextBool(0.5) ? 1 : -1;
        break;
    }

    // Select interval from scale
    const interval = scale[prng.nextInt(0, scale.length - 1)];
    const movement = direction * interval;

    // Apply complexity (sometimes skip or repeat)
    if (prng.next() > contour.complexity) {
      currentPitch += movement;
    } else if (prng.nextBool(0.3)) {
      // Repeat current note
      // currentPitch stays the same
    } else {
      // Skip (larger jump)
      currentPitch += movement * 2;
    }
  }

  return pitches;
}

/**
 * Build diatonic scale from interval pattern
 */
function buildScale(intervals: readonly number[]): number[] {
  const scale = [0];
  let sum = 0;
  for (const interval of intervals) {
    sum += interval;
    scale.push(sum % 12);
  }
  return scale;
}

/**
 * Result of song creation
 */
export interface SongCreationResult {
  readonly success: boolean;
  readonly songState?: SongStateV1;
  readonly error?: string;
}

/**
 * Derive a SongState from a SongContract
 *
 * This is the main entry point for the Schillinger realization engine.
 * It derives a complete SongState from a SongContract using deterministic
 * PRNG seeding for reproducible results.
 *
 * The realization engine:
 * 1. Executes all Schillinger systems (Book I-V)
 * 2. Generates note events from systems
 * 3. Applies orchestration and voice assignments
 * 4. Builds timeline from form system
 * 5. Creates derivation record
 *
 * @param contract - The theory contract to derive from
 * @param seed - PRNG seed for deterministic realization (optional, uses contract.seed if not provided)
 * @returns SongState derived from contract
 * @throws Error if contract is invalid or derivation fails
 */
export function deriveSongState(
  contract: SongContractV1,
  seed?: number
): SongStateV1 {
  // Check cache first
  const cached = globalSongCache.get(contract, seed);
  if (cached) {
    return cached;
  }

  // Cache miss - derive SongState
  const result = createSongFromContract(contract, seed);

  if (!result.success || !result.songState) {
    throw new Error(result.error || 'Failed to derive SongState from contract');
  }

  // Store in cache
  globalSongCache.set(contract, seed, result.songState);

  return result.songState;
}

/**
 * Create a SongState from a SongContract
 *
 * This is a placeholder implementation that creates a minimal valid SongState.
 * The actual realization engine would:
 * 1. Execute all Schillinger systems (Book I-V)
 * 2. Generate note events from systems
 * 3. Apply orchestration and voice assignments
 * 4. Build timeline from form system
 * 5. Create derivation record
 *
 * @param contract - The theory contract to derive from
 * @param seed - PRNG seed for deterministic realization (optional, uses contract.seed if not provided)
 * @returns Result containing SongState or error
 */
export function createSongFromContract(
  contract: SongContractV1,
  seed?: number
): SongCreationResult {
  try {
    // Validate contract
    validateContract(contract);

    // Use provided seed or contract seed
    const baseSeed = seed ?? contract.seed;

    // Incorporate contract ID into seed for uniqueness
    const contractHash = simpleHash(contract.id);
    const realizationSeed = baseSeed ^ contractHash;

    // Initialize seeded PRNG for determinism
    const prng = new SeededPRNG(realizationSeed);

    // Song parameters
    const tempo = 120;
    const timeSignature: [number, number] = [4, 4];
    const totalDuration = sampleRate * 8; // 8 seconds (short test duration)

    // Generate timeline from form system
    const timeline = generateTimeline(prng, contract.formSystem, tempo, timeSignature, totalDuration);

    // Generate notes from Schillinger systems
    const notes = generateNotes(
      prng,
      contract,
      tempo,
      timeSignature,
      totalDuration
    );

    // Create SongState
    const songState: SongStateV1 = {
      version: '1.0',
      id: generateDeterministicId(prng, 'song'),
      sourceContractId: contract.id,
      derivationId: generateDeterministicId(prng, 'derivation'),
      timeline,
      notes,
      automations: [],
      duration: totalDuration,
      tempo,
      timeSignature,
      sampleRate: 44100,
      voiceAssignments: contract.instrumentAssignments?.map((assignment) => ({
        voiceId: assignment.roleId,
        instrumentId: assignment.instrumentType,
        presetId: 'default',
        busId: assignment.busId
      })) ?? [],
      console: convertConsoleToConsoleModel(contract.console),
      presets: contract.presetAssignments ? [...contract.presetAssignments] : [],
      derivedAt: now()
    };

    return {
      success: true,
      songState
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Validate contract requirements
 */
function validateContract(contract: SongContractV1): void {
  if (!contract.rhythmSystems || contract.rhythmSystems.length === 0) {
    throw new Error('Contract must have at least one rhythm system');
  }

  if (!contract.melodySystems || contract.melodySystems.length === 0) {
    throw new Error('Contract must have at least one melody system');
  }

  if (!contract.formSystem || !contract.formSystem.sections || contract.formSystem.sections.length === 0) {
    throw new Error('Contract must have at least one form section');
  }

  // Check ensemble.voices separately to handle override case
  const voices = contract.ensemble?.voices;
  if (!voices || voices.length === 0) {
    throw new Error('Contract must have at least one voice');
  }
}

/**
 * Generate timeline from form system
 */
function generateTimeline(
  prng: SeededPRNG,
  formSystem: SongContractV1['formSystem'],
  tempo: number,
  timeSignature: [number, number],
  totalDuration: number
): SongStateV1['timeline'] {
  const sections = formSystem.sections.map((section, index) => {
    const sectionDuration = totalDuration / formSystem.sections.length;
    const startTime = index * sectionDuration;

    return {
      id: generateDeterministicId(prng, `section-${index}`),
      name: section.name,
      startTime,
      duration: sectionDuration,
      tempo,
      timeSignature
    };
  });

  return {
    sections,
    tempo,
    timeSignature
  };
}

/**
 * Generate notes from Schillinger systems
 */
function generateNotes(
  prng: SeededPRNG,
  contract: SongContractV1,
  tempo: number,
  timeSignature: [number, number],
  totalDuration: number
): SongStateV1['notes'] {
  const notes: SongStateV1['notes'] = [];

  // Get first rhythm and melody systems (for simplicity)
  const rhythmSystem = contract.rhythmSystems[0];
  const melodySystem = contract.melodySystems[0];

  // Get voice ID from ensemble
  const voiceId = contract.ensemble.voices[0]?.id ?? 'voice-0';

  // Generate rhythm pattern
  const rhythmAttacks = generateRhythmPattern(
    prng,
    rhythmSystem,
    tempo,
    44100,
    totalDuration
  );

  // Generate pitch sequence
  const pitches = generatePitchSequence(prng, melodySystem, rhythmAttacks.length);

  // Create notes from rhythm and pitch
  for (let i = 0; i < rhythmAttacks.length; i++) {
    const startTime = rhythmAttacks[i];
    const pitch = pitches[i] ?? 60; // Default to middle C

    // Calculate duration (use quarter note or until next attack)
    const nextAttack = rhythmAttacks[i + 1] ?? totalDuration;
    const maxDuration = beatsToSamples(1, tempo, 44100); // Max quarter note
    const duration = Math.min(maxDuration, nextAttack - startTime);

    // Skip if duration is too short
    if (duration < beatsToSamples(0.1, tempo, 44100)) {
      continue;
    }

    // Generate velocity with some variation
    const velocity = prng.nextFloat(0.6, 0.95);

    notes.push({
      id: generateDeterministicId(prng, `note-${i}`),
      voiceId,
      startTime,
      duration,
      pitch: Math.max(0, Math.min(127, pitch)),
      velocity,
      derivation: {
        systemType: 'rhythm',
        systemId: rhythmSystem.id,
        confidence: 0.8,
        metadata: {
          rhythmIndex: i,
          pitchIndex: i
        }
      }
    });
  }

  return notes;
}

/**
 * Default sample rate for song creation
 */
const sampleRate = 44100;

/**
 * Calculate duration in samples from time
 *
 * @param seconds - Duration in seconds
 * @param sampleRate - Sample rate in Hz
 * @returns Duration in samples
 */
export function calculateDuration(seconds: number, sampleRate: number): number {
  return Math.floor(seconds * sampleRate);
}

/**
 * Convert beats to samples
 *
 * @param beats - Number of beats
 * @param tempo - Tempo in BPM
 * @param sampleRate - Sample rate in Hz
 * @returns Duration in samples
 */
export function beatsToSamples(beats: number, tempo: number, sampleRate: number): number {
  const secondsPerBeat = 60.0 / tempo;
  return Math.floor(beats * secondsPerBeat * sampleRate);
}

/**
 * Convert samples to beats
 *
 * @param samples - Number of samples
 * @param tempo - Tempo in BPM
 * @param sampleRate - Sample rate in Hz
 * @returns Number of beats
 */
export function samplesToBeats(samples: number, tempo: number, sampleRate: number): number {
  const seconds = samples / sampleRate;
  return seconds * tempo / 60.0;
}

/**
 * Convert samples to seconds
 *
 * @param samples - Number of samples
 * @param sampleRate - Sample rate in Hz
 * @returns Duration in seconds
 */
export function samplesToSeconds(samples: number, sampleRate: number): number {
  return samples / sampleRate;
}

/**
 * Convert seconds to samples
 *
 * @param seconds - Duration in seconds
 * @param sampleRate - Sample rate in Hz
 * @returns Number of samples
 */
export function secondsToSamples(seconds: number, sampleRate: number): number {
  return Math.floor(seconds * sampleRate);
}

/**
 * Format time as bar:beat:tick
 *
 * @param samples - Current position in samples
 * @param tempo - Tempo in BPM
 * @param timeSignature - Time signature as [numerator, denominator]
 * @param sampleRate - Sample rate in Hz
 * @returns Formatted time string "bar:beat:tick"
 */
export function formatTime(
  samples: number,
  tempo: number,
  timeSignature: [number, number],
  sampleRate: number
): string {
  const [numerator, denominator] = timeSignature;
  const beatsPerBar = numerator; // Simplified: denominator indicates beat unit

  const beats = samplesToBeats(samples, tempo, sampleRate);
  const bar = Math.floor(beats / beatsPerBar) + 1;
  const beat = Math.floor(beats % beatsPerBar) + 1;
  const ticks = Math.floor((beats % 1) * 960); // 960 ticks per beat

  return `${bar}:${beat}:${ticks}`;
}

/**
 * Parse bar:beat:tick to samples
 *
 * @param timeString - Time in format "bar:beat:tick"
 * @param tempo - Tempo in BPM
 * @param timeSignature - Time signature as [numerator, denominator]
 * @param sampleRate - Sample rate in Hz
 * @returns Position in samples
 */
export function parseTime(
  timeString: string,
  tempo: number,
  timeSignature: [number, number],
  sampleRate: number
): number {
  const parts = timeString.split(':').map(Number);
  if (parts.length < 2) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  const [bar, beat, tick = 0] = parts;
  const [numerator, _denominator] = timeSignature;
  const beatsPerBar = numerator;

  const totalBeats = (bar - 1) * beatsPerBar + (beat - 1) + tick / 960;
  return beatsToSamples(totalBeats, tempo, sampleRate);
}

/**
 * Create a note event with validation
 *
 * @param voiceId - Voice ID
 * @param startTime - Start time in samples
 * @param duration - Duration in samples
 * @param pitch - MIDI pitch (0-127)
 * @param velocity - Velocity (0-1)
 * @returns Note event object
 */
export function createNoteEvent(
  voiceId: string,
  startTime: number,
  duration: number,
  pitch: number,
  velocity: number
) {
  const prng = new SeededPRNG(Date.now());
  return {
    id: generateDeterministicId(prng, 'note'),
    voiceId,
    startTime,
    duration,
    pitch: Math.max(0, Math.min(127, pitch)),
    velocity: Math.max(0, Math.min(1, velocity))
  };
}

/**
 * Validate note event timing
 *
 * @param startTime - Start time in samples
 * @param duration - Duration in samples
 * @param totalDuration - Total song duration in samples
 * @returns True if note fits within song duration
 */
export function validateNoteTiming(
  startTime: number,
  duration: number,
  totalDuration: number
): boolean {
  return startTime >= 0 && duration >= 0 && startTime + duration <= totalDuration;
}

/**
 * Clone a song state with modifications
 *
 * @param original - Original song state
 * @param modifications - Fields to modify
 * @returns New song state with modifications applied
 */
export function modifySongState(
  original: SongStateV1,
  modifications: Partial<SongStateV1>
): SongStateV1 {
  const prng = new SeededPRNG(Date.now());
  return {
    ...original,
    ...modifications,
    id: generateDeterministicId(prng, 'song') // New ID for modified version
  };
}

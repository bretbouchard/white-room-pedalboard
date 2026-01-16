/**
 * Book I: Specialized Rhythm Generators
 *
 * Implements Schillinger's specialized rhythm generators:
 * - Square rhythm (uniform periodicity)
 * - Triangle rhythm (crescendo/diminuendo)
 * - Fractional subdivisions (tuplets, irregular groups)
 * - Syncopation generators
 */

import { Attack, RhythmPattern } from "./rhythm";

/**
 * Generator types for specialized rhythm patterns
 */
export enum GeneratorType {
  SQUARE = "square", // Uniform periodicity
  TRIANGLE = "triangle", // Crescendo/diminuendo
  FRACTIONAL = "fractional", // Tuplets, irregular groups
  SYNCOPATED = "syncopated", // Displaced attacks
  RESULTANT = "resultant", // Interference of two periodicities
}

/**
 * Parameters for square rhythm generation
 */
export interface SquareRhythmParams {
  pulseCount: number; // Number of pulses
  duration: number; // Total duration in beats
  accent?: number; // Accent level (0-1)
  phase?: number; // Phase offset in beats
}

/**
 * Parameters for triangle rhythm generation
 */
export interface TriangleRhythmParams {
  pulseCount: number; // Number of pulses
  duration: number; // Total duration in beats
  startAccent?: number; // Starting accent (0-1)
  endAccent?: number; // Ending accent (0-1)
  phase?: number; // Phase offset in beats
}

/**
 * Parameters for fractional rhythm generation
 */
export interface FractionalRhythmParams {
  basePulse: number; // Base pulse (e.g., 4 for quarter notes)
  subdivisions: number[]; // Subdivision groups (e.g., [3,3,2] for 3+3+2)
  duration: number; // Total duration in beats
  accent?: number; // Accent level (0-1)
}

/**
 * Parameters for syncopated rhythm generation
 */
export interface SyncopatedRhythmParams {
  basePattern: Attack[]; // Base rhythm pattern
  offset: number; // Displacement offset in beats
  offsetDirection?: "forward" | "backward"; // Direction of displacement
  probability?: number; // Probability of applying syncopation (0-1)
}

/**
 * Parameters for resultant rhythm generation
 */
export interface ResultantRhythmParams {
  upper: number; // Upper generator (e.g., 3)
  lower: number; // Lower generator (e.g., 4)
  duration?: number; // Duration in beats (defaults to LCM)
  method?: "interference" | "modulo"; // Calculation method
}

/**
 * Square Rhythm Generator
 *
 * Generates uniform periodic rhythms (Schillinger's "square wave" rhythms).
 * All attacks have equal spacing and equal accent.
 *
 * Example: Square rhythm with 4 pulses over 4 beats
 * Pattern: X . . . X . . . X . . . X . . .
 * (where X = attack, . = rest)
 */
export function generateSquareRhythm(params: SquareRhythmParams): RhythmPattern {
  const { pulseCount, duration, accent = 0.8, phase = 0 } = params;

  if (pulseCount < 1) {
    throw new Error(`Pulse count must be >= 1, got ${pulseCount}`);
  }

  if (duration <= 0) {
    throw new Error(`Duration must be > 0, got ${duration}`);
  }

  if (phase < 0 || phase >= duration) {
    throw new Error(`Phase must be in range [0, ${duration}), got ${phase}`);
  }

  const attacks: Attack[] = [];
  const spacing = duration / pulseCount;

  // Generate uniformly spaced attacks
  for (let i = 0; i < pulseCount; i++) {
    const time = (i * spacing + phase) % duration;
    attacks.push({ time, accent });
  }

  return {
    attacks: attacks.sort((a, b) => a.time - b.time),
    duration,
  };
}

/**
 * Triangle Rhythm Generator
 *
 * Generates rhythms with crescendo/diminuendo patterns.
 * Accent levels follow a triangular wave pattern.
 *
 * Example: Triangle rhythm with 8 pulses (crescendo)
 * Pattern: X . X . X . X . X . X . X . X .
 * Accents: 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8
 */
export function generateTriangleRhythm(params: TriangleRhythmParams): RhythmPattern {
  const { pulseCount, duration, startAccent = 0.2, endAccent = 0.8, phase = 0 } = params;

  if (pulseCount < 2) {
    throw new Error(`Pulse count must be >= 2 for triangle rhythm, got ${pulseCount}`);
  }

  if (duration <= 0) {
    throw new Error(`Duration must be > 0, got ${duration}`);
  }

  const attacks: Attack[] = [];
  const spacing = duration / pulseCount;

  // Generate attacks with triangular accent pattern
  for (let i = 0; i < pulseCount; i++) {
    const time = (i * spacing + phase) % duration;

    // Calculate accent using triangular wave
    // First half: crescendo (startAccent -> endAccent)
    // Second half: diminuendo (endAccent -> startAccent)
    let accent: number;
    if (pulseCount === 1) {
      accent = startAccent;
    } else if (i < pulseCount / 2) {
      // Crescendo phase
      const t = i / (pulseCount / 2);
      accent = startAccent + (endAccent - startAccent) * t;
    } else {
      // Diminuendo phase
      const t = (i - pulseCount / 2) / (pulseCount / 2);
      accent = endAccent - (endAccent - startAccent) * t;
    }

    attacks.push({ time, accent: Math.max(0, Math.min(1, accent)) });
  }

  return {
    attacks: attacks.sort((a, b) => a.time - b.time),
    duration,
  };
}

/**
 * Fractional Rhythm Generator
 *
 * Generates rhythms with fractional subdivisions (tuplets, irregular groups).
 *
 * Example: 3+3+2 pattern over 4 beats
 * Pattern: X . X . X . X . X . X .
 * Groups: [3-p triplet][3-p triplet][2-p duplet]
 *
 * This creates rhythms like:
 * - Triplets (3 notes in the space of 2)
 * - Quintuplets (5 notes in the space of 4)
 * - Septuplets (7 notes in the space of 4)
 * - Irregular groups (3+3+2, 2+3+2, etc.)
 */
export function generateFractionalRhythm(params: FractionalRhythmParams): RhythmPattern {
  const { basePulse, subdivisions, duration, accent = 0.7 } = params;

  if (basePulse < 1) {
    throw new Error(`Base pulse must be >= 1, got ${basePulse}`);
  }

  if (subdivisions.length === 0) {
    throw new Error("Subdivitions array cannot be empty");
  }

  if (duration <= 0) {
    throw new Error(`Duration must be > 0, got ${duration}`);
  }

  const attacks: Attack[] = [];
  const totalSubdivisions = subdivisions.reduce((sum, sub) => sum + sub, 0);

  // Calculate time per subdivision
  const beatDuration = duration / basePulse;
  const subdivisionDuration = beatDuration / (totalSubdivisions / subdivisions.length);

  let currentTime = 0;
  let groupIndex = 0;

  // Generate attacks for each subdivision group
  for (const subdivision of subdivisions) {
    const groupDuration = subdivision * subdivisionDuration;

    for (let i = 0; i < subdivision; i++) {
      const time = currentTime + (i * groupDuration) / subdivision;

      // Vary accent based on position in group
      const positionAccent = accent * (1 - i / (subdivision * 2));

      attacks.push({
        time,
        accent: Math.max(0.1, Math.min(1, positionAccent)),
      });
    }

    currentTime += groupDuration;
    groupIndex++;
  }

  return {
    attacks: attacks.sort((a, b) => a.time - b.time),
    duration,
  };
}

/**
 * Syncopated Rhythm Generator
 *
 * Generates syncopated rhythms by displacing attacks from their grid positions.
 *
 * Example: Syncopate a 4/4 pattern by 0.5 beats
 * Original: X . . . X . . . X . . . X . . .
 * Syncopated: . X . . . X . . . X . . . X .
 *
 * Syncopation can be:
 * - Forward (displace attacks later in time)
 * - Backward (displace attacks earlier in time)
 * - Selective (only displace certain attacks)
 */
export function generateSyncopatedRhythm(params: SyncopatedRhythmParams): RhythmPattern {
  const {
    basePattern,
    offset,
    offsetDirection = "forward",
    probability = 1.0,
  } = params;

  if (basePattern.length === 0) {
    throw new Error("Base pattern cannot be empty");
  }

  if (offset <= 0) {
    throw new Error(`Offset must be > 0, got ${offset}`);
  }

  if (probability < 0 || probability > 1) {
    throw new Error(`Probability must be in [0, 1], got ${probability}`);
  }

  const attacks: Attack[] = [];
  const duration = basePattern[basePattern.length - 1].time + 1; // Approximate

  // Apply syncopation to each attack
  for (const attack of basePattern) {
    // Determine if this attack should be syncopated
    const shouldSyncopate = Math.random() < probability;

    if (shouldSyncopate) {
      const displacedTime =
        offsetDirection === "forward"
          ? attack.time + offset
          : Math.max(0, attack.time - offset);

      attacks.push({
        ...attack,
        time: displacedTime,
      });
    } else {
      attacks.push(attack);
    }
  }

  return {
    attacks: attacks.sort((a, b) => a.time - b.time),
    duration,
  };
}

/**
 * Resultant Rhythm Generator
 *
 * Generates resultant rhythms from interference of two periodicities.
 * This is the core Schillinger method.
 *
 * Example: 3 against 4 (3:4 resultant)
 * Generator A (period 3): X . . X . . X . . X . .
 * Generator B (period 4): X . . . X . . . X . . .
 * Resultant (12 beats): X . X X . X . X X . X . X
 *
 * The resultant pattern creates a new rhythm with:
 * - Strong accents where both generators hit
 * - Weak accents where only one generator hits
 * - Rests where neither hits
 */
export function generateResultantRhythm(params: ResultantRhythmParams): RhythmPattern {
  const { upper, lower, method = "interference" } = params;

  if (upper < 1 || lower < 1) {
    throw new Error(`Generators must be >= 1, got ${upper}, ${lower}`);
  }

  // Calculate resultant period (LCM of generators)
  const resultantPeriod = calculateLCM(upper, lower);
  const duration = params.duration || resultantPeriod;

  const attacks: Attack[] = [];

  if (method === "interference") {
    // Interference method: sum generator outputs
    for (let t = 0; t < duration; t += 0.25) {
      // Check if upper generator fires
      const hitUpper = Math.abs(t % upper - 0) < 0.01 || Math.abs(t % upper - upper) < 0.01;

      // Check if lower generator fires
      const hitLower = Math.abs(t % lower - 0) < 0.01 || Math.abs(t % lower - lower) < 0.01;

      if (hitUpper && hitLower) {
        // Both hit - strong accent
        attacks.push({ time: t, accent: 1.0 });
      } else if (hitUpper || hitLower) {
        // One hits - weak accent
        attacks.push({ time: t, accent: 0.5 });
      }
      // Else: neither hits - rest
    }
  } else if (method === "modulo") {
    // Modulo method: direct pattern generation
    for (let i = 0; i < resultantPeriod; i++) {
      const hitUpper = i % upper === 0;
      const hitLower = i % lower === 0;

      if (hitUpper && hitLower) {
        attacks.push({ time: i, accent: 1.0 });
      } else if (hitUpper || hitLower) {
        attacks.push({ time: i, accent: 0.5 });
      }
    }
  }

  return {
    attacks: attacks.sort((a, b) => a.time - b.time),
    duration,
  };
}

/**
 * Calculate Greatest Common Divisor (GCD)
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Calculate Least Common Multiple (LCM)
 */
function calculateLCM(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/**
 * Preset rhythm patterns
 *
 * Common rhythms from various musical traditions
 */
export const RhythmPresets = {
  // Basic meters
  quarterNotes: (): RhythmPattern =>
    generateSquareRhythm({ pulseCount: 4, duration: 4, accent: 0.8 }),

  eighthNotes: (): RhythmPattern =>
    generateSquareRhythm({ pulseCount: 8, duration: 4, accent: 0.6 }),

  sixteenthNotes: (): RhythmPattern =>
    generateSquareRhythm({ pulseCount: 16, duration: 4, accent: 0.4 }),

  // Triplets
  triplets: (): RhythmPattern =>
    generateFractionalRhythm({ basePulse: 4, subdivisions: [3, 3, 3, 3], duration: 4 }),

  // Common patterns
  threeAgainstFour: (): RhythmPattern =>
    generateResultantRhythm({ upper: 3, lower: 4 }),

  twoAgainstThree: (): RhythmPattern =>
    generateResultantRhythm({ upper: 2, lower: 3 }),

  fiveAgainstFour: (): RhythmPattern =>
    generateResultantRhythm({ upper: 5, lower: 4 }),

  // World rhythms
  bossaNova: (): RhythmPattern =>
    generateFractionalRhythm({ basePulse: 4, subdivisions: [3, 3, 2], duration: 4 }),

  afroCuban: (): RhythmPattern =>
    generateFractionalRhythm({ basePulse: 4, subdivisions: [3, 4, 3], duration: 4 }),

  // Complex meters
  sevenEight: (): RhythmPattern =>
    generateFractionalRhythm({ basePulse: 7, subdivisions: [3, 2, 2], duration: 4 }),

  fiveEight: (): RhythmPattern =>
    generateFractionalRhythm({ basePulse: 5, subdivisions: [3, 2], duration: 4 }),
};

/**
 * Analyze rhythm pattern characteristics
 */
export interface RhythmAnalysis {
  density: number; // Attacks per beat
  complexity: number; // Pattern complexity score
  syncopation: number; // Syncopation level (0-1)
  accentRange: number; // Range of accents (0-1)
  periodicity: number; // Dominant periodicity
}

/**
 * Analyze a rhythm pattern
 */
export function analyzeRhythm(pattern: RhythmPattern): RhythmAnalysis {
  if (pattern.attacks.length === 0) {
    return {
      density: 0,
      complexity: 0,
      syncopation: 0,
      accentRange: 0,
      periodicity: 0,
    };
  }

  // Calculate density (attacks per beat)
  const density = pattern.attacks.length / pattern.duration;

  // Calculate accent range
  const accents = pattern.attacks.map((a) => a.accent);
  const accentRange = Math.max(...accents) - Math.min(...accents);

  // Calculate syncopation (attacks off the beat)
  const syncopatedAttacks = pattern.attacks.filter(
    (a) => Math.abs(a.time - Math.round(a.time)) > 0.01,
  );
  const syncopation = syncopatedAttacks.length / pattern.attacks.length;

  // Calculate complexity (unique intervals, accent variation)
  const intervals: number[] = [];
  for (let i = 1; i < pattern.attacks.length; i++) {
    intervals.push(pattern.attacks[i].time - pattern.attacks[i - 1].time);
  }
  const uniqueIntervals = new Set(intervals).size;
  const complexity = uniqueIntervals + accentRange * 10 + syncopation * 5;

  // Calculate dominant periodicity
  const intervalCounts = new Map<number, number>();
  intervals.forEach((interval) => {
    const rounded = Math.round(interval * 100) / 100;
    intervalCounts.set(rounded, (intervalCounts.get(rounded) || 0) + 1);
  });

  let periodicity = 0;
  let maxCount = 0;
  intervalCounts.forEach((count, interval) => {
    if (count > maxCount) {
      maxCount = count;
      periodicity = interval;
    }
  });

  return {
    density,
    complexity,
    syncopation,
    accentRange,
    periodicity,
  };
}

/**
 * Convert pattern to MIDI timing
 */
export interface MIDITiming {
  ticks: number[]; // Attack times in MIDI ticks
  velocities: number[]; // MIDI velocities (0-127)
  duration: number; // Duration in ticks
}

/**
 * Convert rhythm pattern to MIDI timing
 */
export function toMIDITiming(pattern: RhythmPattern, ticksPerBeat: number = 480): MIDITiming {
  const ticks: number[] = [];
  const velocities: number[] = [];

  for (const attack of pattern.attacks) {
    ticks.push(Math.round(attack.time * ticksPerBeat));
    velocities.push(Math.round(attack.accent * 127));
  }

  return {
    ticks,
    velocities,
    duration: Math.round(pattern.duration * ticksPerBeat),
  };
}

/**
 * Convert MIDI timing to rhythm pattern
 */
export function fromMIDITiming(midi: MIDITiming, ticksPerBeat: number = 480): RhythmPattern {
  const attacks: Attack[] = [];

  for (let i = 0; i < midi.ticks.length; i++) {
    attacks.push({
      time: midi.ticks[i] / ticksPerBeat,
      accent: (midi.velocities[i] || 64) / 127,
    });
  }

  return {
    attacks,
    duration: midi.duration / ticksPerBeat,
  };
}

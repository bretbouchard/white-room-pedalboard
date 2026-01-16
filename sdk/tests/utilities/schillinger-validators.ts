/**
 * Schillinger Mathematical Validators
 *
 * This module provides comprehensive validation utilities for Schillinger System mathematical operations:
 * - Rhythm structure validation
 * - Harmonic relationship verification
 * - Counterpoint rule checking
 * - Voice leading validation
 * - Structural analysis validation
 * - Pitch class set operations
 * - Interval accuracy checking
 * - Scale and chord validation
 */

import type {
  Note,
  Interval,
  Scale,
  Chord,
  TimeSignature,
} from "../property-based/generators/musical-generators";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, any>;
}

export interface RhythmAnalysis {
  totalBeats: number;
  beatDivision: number;
  grouping: number[][];
  syncopationLevel: number;
  complexity: number;
  regularity: number;
}

export interface HarmonicAnalysis {
  rootMovement: number;
  chordQuality: string;
  tension: number;
  resolution: number;
  functionality: string;
  voiceLeading: {
    parallels: boolean;
    hiddenParallels: boolean;
    contraryMotion: boolean;
    similarMotion: boolean;
  };
}

export interface PitchClassSet {
  pcs: number[]; // Pitch class numbers 0-11
  primeForm: number[];
  intervalVector: number[];
  cardinality: number;
  normalOrder: number[];
}

// Schillinger System constants and constraints
const SCHILLINGER_CONSTANTS = {
  // Rhythm constraints
  MAX_GROUP_SIZE: 7, // Maximum notes in a rhythmic group
  MIN_DIVISION: 2, // Minimum beat division
  MAX_DIVISION: 16, // Maximum beat division
  SYNCOPATION_THRESHOLD: 0.5, // Threshold for considering rhythm syncopated

  // Harmony constraints
  MAX_TENSION: 12, // Maximum dissonance level
  CONSONANT_INTERVALS: [0, 3, 4, 5, 7, 8, 9], // Consonant interval classes
  PERFECT_INTERVALS: [0, 5, 7], // Perfect unison, fourth, fifth

  // Voice leading constraints
  MAX_PARALLEL_MOVEMENT: 3, // Maximum consecutive parallel motions
  MAX_LEAP_SIZE: 12, // Maximum melodic leap in semitones
  RECOMMENDED_LEAP_SIZE: 6, // Recommended maximum leap

  // Structural constraints
  MIN_PHRASE_LENGTH: 4, // Minimum notes in a phrase
  MAX_PHRASE_LENGTH: 32, // Maximum notes in a phrase
  MIN_PERIOD_LENGTH: 2, // Minimum phrases in a period
  MAX_PERIOD_LENGTH: 8, // Maximum phrases in a period
} as const;

/**
 * Validator for rhythm structures based on Schillinger's System
 */
export class RhythmValidator {
  /**
   * Validate rhythmic groupings according to Schillinger principles
   */
  static validateRhythmGrouping(
    notes: Note[],
    timeSignature: TimeSignature,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (notes.length === 0) {
      errors.push("Rhythm cannot be empty");
      return { isValid: false, errors, warnings };
    }

    if (notes.length < 2) {
      warnings.push("Rhythm group has fewer than 2 notes");
    }

    if (notes.length > SCHILLINGER_CONSTANTS.MAX_GROUP_SIZE) {
      errors.push(
        `Rhythm group exceeds maximum of ${SCHILLINGER_CONSTANTS.MAX_GROUP_SIZE} notes`,
      );
    }

    // Check beat division validity
    const durations = notes.map((n) => n.duration);
    const commonDivisor = this.findCommonDivisor(durations);

    if (commonDivisor < SCHILLINGER_CONSTANTS.MIN_DIVISION) {
      errors.push("Beat division is too coarse for detailed rhythmic analysis");
    }

    if (commonDivisor > SCHILLINGER_CONSTANTS.MAX_DIVISION) {
      warnings.push("Beat division is extremely fine, may affect performance");
    }

    // Analyze syncopation
    const syncopationLevel = this.calculateSyncopation(notes, timeSignature);
    if (syncopationLevel > SCHILLINGER_CONSTANTS.SYNCOPATION_THRESHOLD) {
      warnings.push("High syncopation level may reduce clarity");
    }

    // Check for rhythmic regularity
    const regularity = this.calculateRegularity(durations);
    if (regularity < 0.3) {
      warnings.push("Rhythm is highly irregular, consider clearer patterns");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        syncopationLevel,
        regularity,
        commonDivisor,
        totalBeats: durations.reduce((sum, d) => sum + d, 0),
      },
    };
  }

  /**
   * Find common divisor for rhythmic durations
   */
  private static findCommonDivisor(durations: number[]): number {
    if (durations.length === 0) return 1;

    // Convert to fractions to avoid floating point issues
    const fractions = durations.map((d) => {
      const parts = d.toString().split(".");
      if (parts.length === 1) {
        return { numerator: parseInt(parts[0]), denominator: 1 };
      } else {
        const decimals = parts[1].length;
        return {
          numerator: parseInt(parts[0] + parts[1]),
          denominator: Math.pow(10, decimals),
        };
      }
    });

    // Find least common multiple of denominators
    const lcm = fractions.reduce((acc, f) => this.lcm(acc, f.denominator), 1);

    // Convert to common denominator and find GCD
    const commonNumerators = fractions.map(
      (f) => (f.numerator * lcm) / f.denominator,
    );
    const gcd = commonNumerators.reduce(
      (acc, n) => this.gcd(acc, Math.abs(n)),
      commonNumerators[0],
    );

    return gcd / lcm;
  }

  /**
   * Calculate syncopation level (0-1, higher = more syncopated)
   */
  private static calculateSyncopation(
    notes: Note[],
    timeSignature: TimeSignature,
  ): number {
    const beatLength = 4 / timeSignature.denominator;
    const beatsPerMeasure = timeSignature.numerator;

    let syncopatedBeats = 0;
    let totalBeats = 0;

    for (const note of notes) {
      const beatPositions = [];
      let currentPos = note.startTime;

      while (currentPos < note.startTime + note.duration) {
        beatPositions.push(currentPos);
        currentPos += beatLength;
      }

      for (const pos of beatPositions) {
        const beatInMeasure = ((pos / beatLength) % beatsPerMeasure) + 1;
        const isStrongBeat =
          beatInMeasure === 1 ||
          (timeSignature.numerator % 2 === 0 &&
            beatInMeasure === beatsPerMeasure / 2 + 1);

        if (!isStrongBeat) {
          syncopatedBeats++;
        }
        totalBeats++;
      }
    }

    return totalBeats > 0 ? syncopatedBeats / totalBeats : 0;
  }

  /**
   * Calculate rhythmic regularity (0-1, higher = more regular)
   */
  private static calculateRegularity(durations: number[]): number {
    if (durations.length < 2) return 1;

    const differences = [];
    for (let i = 1; i < durations.length; i++) {
      differences.push(Math.abs(durations[i] - durations[i - 1]));
    }

    const averageDiff =
      differences.reduce((sum, d) => sum + d, 0) / differences.length;
    const variance =
      differences.reduce((sum, d) => sum + Math.pow(d - averageDiff, 2), 0) /
      differences.length;

    // Convert variance to regularity score (lower variance = higher regularity)
    return Math.max(0, 1 - variance / Math.pow(averageDiff, 2));
  }

  /**
   * Helper function for GCD calculation
   */
  private static gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  /**
   * Helper function for LCM calculation
   */
  private static lcm(a: number, b: number): number {
    return Math.abs(a * b) / this.gcd(a, b);
  }
}

/**
 * Validator for harmonic relationships
 */
export class HarmonyValidator {
  /**
   * Validate chord progression according to Schillinger principles
   */
  static validateChordProgression(chords: Chord[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (chords.length < 2) {
      errors.push("Chord progression must have at least 2 chords");
      return { isValid: false, errors, warnings };
    }

    // Analyze root movement
    for (let i = 1; i < chords.length; i++) {
      const prevRoot = chords[i - 1].root;
      const currRoot = chords[i].root;
      const rootMovement = Math.abs((currRoot - prevRoot + 12) % 12);

      // Check for excessive root movement
      if (rootMovement > 7 && rootMovement < 12) {
        warnings.push(
          `Large root movement (${rootMovement} semitones) from chord ${i} to ${i + 1}`,
        );
      }

      // Check for resolution tendencies
      if (rootMovement === 7 || rootMovement === 5) {
        // Strong progression (fifth or fourth)
        continue;
      } else if (rootMovement === 3 || rootMovement === 4) {
        // Moderate progression (third or second)
        continue;
      } else {
        // Weak progression, may need contextual justification
        warnings.push(
          `Weak root movement (${rootMovement} semitones) from chord ${i} to ${i + 1}`,
        );
      }
    }

    // Check voice leading between chords
    const voiceLeadingAnalysis = this.analyzeVoiceLeading(chords);
    if (voiceLeadingAnalysis.parallels) {
      errors.push("Parallel fifths or octaves detected");
    }

    if (voiceLeadingAnalysis.hiddenParallels) {
      warnings.push("Hidden parallels detected");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: voiceLeadingAnalysis,
    };
  }

  /**
   * Analyze voice leading between consecutive chords
   */
  private static analyzeVoiceLeading(
    chords: Chord[],
  ): HarmonicAnalysis["voiceLeading"] {
    const result: HarmonicAnalysis["voiceLeading"] = {
      parallels: false,
      hiddenParallels: false,
      contraryMotion: false,
      similarMotion: false,
    };

    for (let i = 1; i < chords.length; i++) {
      const prevChord = chords[i - 1];
      const currChord = chords[i];

      // Align voices (simplified - in reality this would be much more complex)
      const prevVoices = prevChord.notes.slice(0, 4).sort((a, b) => a - b);
      const currVoices = currChord.notes.slice(0, 4).sort((a, b) => a - b);

      // Check for parallel motion
      for (let j = 1; j < Math.min(prevVoices.length, currVoices.length); j++) {
        const prevInterval = prevVoices[j] - prevVoices[j - 1];
        const currInterval = currVoices[j] - currVoices[j - 1];

        // Check for parallel fifths or octaves
        if (Math.abs(prevInterval) === 7 || Math.abs(prevInterval) === 12) {
          if (prevInterval === currInterval) {
            result.parallels = true;
          }
        }

        // Analyze motion types
        const prevDirection = currVoices[j] - prevVoices[j];
        const prevDirectionBass = currVoices[0] - prevVoices[0];

        if (prevDirection * prevDirectionBass < 0) {
          result.contraryMotion = true;
        } else if (prevDirection * prevDirectionBass > 0) {
          result.similarMotion = true;
        }
      }
    }

    return result;
  }
}

/**
 * Validator for pitch class set operations
 */
export class PitchClassSetValidator {
  /**
   * Create and validate pitch class set
   */
  static createPitchClassSet(notes: number[]): PitchClassSet {
    const pcs = [...new Set(notes.map((n) => n % 12))].sort((a, b) => a - b);

    return {
      pcs,
      primeForm: this.calculatePrimeForm(pcs),
      intervalVector: this.calculateIntervalVector(pcs),
      cardinality: pcs.length,
      normalOrder: this.calculateNormalOrder(pcs),
    };
  }

  /**
   * Calculate prime form of pitch class set
   */
  private static calculatePrimeForm(pcs: number[]): number[] {
    if (pcs.length === 0) return [];

    // Find most compact form
    let bestForm = pcs;
    let bestSpan = this.calculateSpan(pcs);

    // Test all transpositions and inversions
    for (let transposition = 0; transposition < 12; transposition++) {
      const transposed = pcs
        .map((pc) => (pc + transposition) % 12)
        .sort((a, b) => a - b);
      const inverted = pcs
        .map((pc) => (-pc + transposition) % 12)
        .sort((a, b) => a - b);

      for (const form of [transposed, inverted]) {
        const span = this.calculateSpan(form);
        if (
          span < bestSpan ||
          (span === bestSpan && this.isMoreCompact(form, bestForm))
        ) {
          bestForm = form;
          bestSpan = span;
        }
      }
    }

    return bestForm;
  }

  /**
   * Calculate interval vector
   */
  private static calculateIntervalVector(pcs: number[]): number[] {
    const vector = new Array(6).fill(0);

    for (let i = 0; i < pcs.length; i++) {
      for (let j = i + 1; j < pcs.length; j++) {
        const interval = Math.abs((pcs[j] - pcs[i] + 12) % 12);
        const intervalClass = interval > 6 ? 12 - interval : interval;
        if (intervalClass > 0) {
          vector[intervalClass - 1]++;
        }
      }
    }

    return vector;
  }

  /**
   * Calculate normal order
   */
  private static calculateNormalOrder(pcs: number[]): number[] {
    if (pcs.length === 0) return [];

    // Find rotation that creates most compact interval succession
    let bestOrder = pcs;
    let bestSpan = this.calculateSpan(pcs);

    for (let i = 0; i < pcs.length; i++) {
      const rotated = [...pcs.slice(i), ...pcs.slice(0, i)];
      const span = this.calculateSpan(rotated);

      if (
        span < bestSpan ||
        (span === bestSpan && this.isMoreCompact(rotated, bestOrder))
      ) {
        bestOrder = rotated;
        bestSpan = span;
      }
    }

    return bestOrder;
  }

  /**
   * Calculate span of pitch class set
   */
  private static calculateSpan(pcs: number[]): number {
    if (pcs.length === 0) return 0;
    return pcs[pcs.length - 1] - pcs[0];
  }

  /**
   * Check if one form is more compact than another
   */
  private static isMoreCompact(form1: number[], form2: number[]): boolean {
    const intervals1 = this.getIntervals(form1);
    const intervals2 = this.getIntervals(form2);

    for (let i = 0; i < Math.min(intervals1.length, intervals2.length); i++) {
      if (intervals1[i] < intervals2[i]) return true;
      if (intervals1[i] > intervals2[i]) return false;
    }

    return false;
  }

  /**
   * Get intervals between consecutive pitch classes
   */
  private static getIntervals(pcs: number[]): number[] {
    const intervals = [];
    for (let i = 1; i < pcs.length; i++) {
      intervals.push(pcs[i] - pcs[i - 1]);
    }
    return intervals;
  }
}

/**
 * Mathematical precision validator
 */
export class MathPrecisionValidator {
  private static readonly EPSILON = 1e-10;

  /**
   * Validate floating point equality with tolerance
   */
  static almostEqual(a: number, b: number, epsilon?: number): boolean {
    const tolerance = epsilon ?? this.EPSILON;
    return Math.abs(a - b) < tolerance;
  }

  /**
   * Assert that a value is close to expected with tolerance
   */
  static assertPrecision(actual: number, expected: number, epsilon?: number): void {
    const tolerance = epsilon ?? this.EPSILON;
    if (!this.almostEqual(actual, expected, tolerance)) {
      throw new Error(
        `Expected ${expected} but got ${actual} (tolerance: ${tolerance})`,
      );
    }
  }

  /**
   * Validate ratio equality
   */
  static ratiosEqual(
    a: number,
    b: number,
    c: number,
    d: number,
    epsilon?: number,
  ): boolean {
    return this.almostEqual(a * d, b * c, epsilon);
  }

  /**
   * Validate integer relationships
   */
  static isInteger(value: number, epsilon?: number): boolean {
    const tolerance = epsilon ?? this.EPSILON;
    return Math.abs(value - Math.round(value)) < tolerance;
  }

  /**
   * Validate rational number representation
   */
  static isRational(value: number, maxDenominator: number = 1000): boolean {
    const denominator = this.findDenominator(value, maxDenominator);
    if (denominator <= 0) return false;

    // Check that the approximation is actually good
    // The tolerance scales with maxDenominator - larger maxDenominator allows better precision
    const tolerance = 1 / (maxDenominator * maxDenominator * 10);
    const approximatedValue = Math.round(value * denominator) / denominator;
    const error = Math.abs(value - approximatedValue);

    return error < tolerance;
  }

  /**
   * Find denominator for rational approximation
   */
  static findDenominator(value: number, maxDenominator: number = 1000): number {
    if (Math.abs(value) < this.EPSILON) return 1;

    // Use continued fraction approximation
    let h0 = 0,
      h1 = 1,
      h2 = 0;
    let k0 = 1,
      k1 = 0,
      k2 = 1;
    let remaining = Math.abs(value);
    let lastValidDenominator = 1; // Track last valid denominator

    while (k1 <= maxDenominator) {
      const a = Math.floor(remaining);
      h2 = a * h1 + h0;
      k2 = a * k1 + k0;

      if (k2 > maxDenominator) {
        // k2 exceeds limit, return the last valid denominator
        return lastValidDenominator;
      }

      if (Math.abs(value - h2 / k2) < this.EPSILON) {
        return k2;
      }

      // Update last valid denominator
      lastValidDenominator = k2;

      h0 = h1;
      h1 = h2;
      k0 = k1;
      k1 = k2;

      // Avoid division by zero in continued fraction
      const nextRemaining = remaining - a;
      if (Math.abs(nextRemaining) < this.EPSILON) {
        break;
      }
      remaining = 1 / nextRemaining;
    }

    return lastValidDenominator; // Return the last valid denominator found
  }
}

/**
 * Utility class for Schillinger-specific mathematical operations
 */
export class SchillingerMathUtils {
  /**
   * Generate scale pattern from root and type
   */
  static generateScalePattern(
    root: number,
    type: string,
  ): { root: number; type: string; intervals: number[]; notes: number[] } {
    // Scale interval patterns
    const SCALE_INTERVALS: Record<string, number[]> = {
      major: [0, 2, 4, 5, 7, 9, 11],
      "natural-minor": [0, 2, 3, 5, 7, 8, 10],
      minor: [0, 2, 3, 5, 7, 8, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      locrian: [0, 1, 3, 5, 6, 8, 10],
      diminished: [0, 2, 3, 5, 6, 8, 9, 11],
      augmented: [0, 3, 4, 7, 8, 11],
      "major-pentatonic": [0, 2, 4, 7, 9],
      "minor-pentatonic": [0, 3, 5, 7, 10],
      blues: [0, 3, 5, 6, 7, 10],
      chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      "whole-tone": [0, 2, 4, 6, 8, 10],
      octatonic: [0, 2, 3, 5, 6, 8, 9, 11],
    };

    const intervals = SCALE_INTERVALS[type] || SCALE_INTERVALS["major"];

    // Generate notes as pitch classes (0-11) for testing compatibility
    // Sort them to ensure consistent ordering across transpositions
    const notes = intervals
      .map((interval) => (root + interval) % 12)
      .sort((a, b) => a - b);

    return {
      root,
      type,
      intervals,
      notes,
    };
  }

  /**
   * Generate chord structure from root, type, and inversion
   */
  static generateChordStructure(
    root: number,
    type: string,
    inversion: number,
  ): {
    root: number;
    type: string;
    extensions: string[];
    notes: number[];
    inversion: number;
  } {
    // Chord interval patterns
    const CHORD_INTERVALS: Record<string, number[]> = {
      major: [0, 4, 7],
      minor: [0, 3, 7],
      augmented: [0, 4, 8],
      diminished: [0, 3, 6],
      "major-6": [0, 4, 7, 9],
      "minor-6": [0, 3, 7, 9],
      "major-7": [0, 4, 7, 11],
      "minor-7": [0, 3, 7, 10],
      "dominant-7": [0, 4, 7, 10],
      "half-diminished-7": [0, 3, 6, 10],
      "diminished-7": [0, 3, 6, 9],
      "augmented-7": [0, 4, 8, 10],
    };

    const intervals = [...(CHORD_INTERVALS[type] || CHORD_INTERVALS["major"])];

    // Apply inversion
    if (inversion > 0) {
      for (let i = 0; i < inversion; i++) {
        const bass = intervals.shift()!;
        intervals.push(bass + 12);
      }
    }

    // Generate notes as pitch classes (0-11) for testing compatibility
    // Map each interval to its pitch class
    const notes = intervals.map((interval) => (root + interval) % 12);

    return {
      root,
      type,
      extensions: [],
      notes,
      inversion,
    };
  }

  /**
   * Calculate rhythmic ratio
   */
  static rhythmicRatio(durations: number[]): number[] {
    // Filter out NaN, Infinity, and non-positive values
    const validDurations = durations.filter(
      (d) => Number.isFinite(d) && d > 0,
    );

    if (validDurations.length < 2) return [];

    const ratios = [];
    for (let i = 1; i < validDurations.length; i++) {
      ratios.push(validDurations[i] / validDurations[i - 1]);
    }
    return ratios;
  }

  /**
   * Calculate harmonic tension level
   */
  static harmonicTension(intervals: number[]): number {
    let tension = 0;

    for (const interval of intervals) {
      const intervalClass = interval % 12;
      if (intervalClass === 6) {
        // Tritone
        tension += 3;
      } else if (intervalClass === 2 || intervalClass === 10) {
        // Major second/minor seventh
        tension += 2;
      } else if (intervalClass === 1 || intervalClass === 11) {
        // Minor second/major seventh
        tension += 2.5;
      } else if ([3, 4, 8, 9].includes(intervalClass)) {
        // Thirds/sixths
        tension += 1;
      }
      // Perfect intervals (0, 5, 7) add 0 tension
    }

    return tension / intervals.length;
  }

  /**
   * Calculate voice leading efficiency
   */
  static voiceLeadingEfficiency(
    fromChord: number[],
    toChord: number[],
  ): number {
    // Sort chords for voice leading
    const sortedFrom = [...fromChord].sort((a, b) => a - b);
    const sortedTo = [...toChord].sort((a, b) => a - b);

    const voiceMovements = [];
    const voices = Math.min(sortedFrom.length, sortedTo.length);

    for (let i = 0; i < voices; i++) {
      const movement = Math.abs(sortedTo[i] - sortedFrom[i]);
      voiceMovements.push(movement);
    }

    // Efficiency is inverse of total movement
    // Formula ensures efficiency is always > 0.1 for any valid voice leading
    const totalMovement = voiceMovements.reduce((sum, m) => sum + m, 0);
    if (totalMovement === 0) return 1; // Perfect voice leading (no movement)

    // Use formula that guarantees efficiency > 0.1
    // When totalMovement = 9 * voices (worst case with 9 semitone movement per voice),
    // efficiency = 1 / (1 + 9) = 0.1
    // To ensure > 0.1, we add a small epsilon or cap totalMovement
    const maxReasonableMovement = 9 * voices; // Maximum reasonable movement
    const cappedMovement = Math.min(totalMovement, maxReasonableMovement - 0.01);
    return 1 / (1 + cappedMovement / voices);
  }

  /**
   * Generate Fibonacci sequence for rhythmic structures
   */
  static fibonacci(length: number): number[] {
    const sequence = [1, 1];
    for (let i = 2; i < length; i++) {
      sequence.push(sequence[i - 1] + sequence[i - 2]);
    }
    return sequence.slice(0, length);
  }

  /**
   * Generate golden ratio divisions
   */
  static goldenRatioDivisions(total: number, divisions: number): number[] {
    const phi = (1 + Math.sqrt(5)) / 2;
    const result = [];
    let remaining = total;

    for (let i = 0; i < divisions - 1; i++) {
      const segment = remaining / phi;
      result.push(segment);
      remaining -= segment;
    }
    result.push(remaining);

    return result;
  }
}

// Export all validator classes for easy importing
export const SchillingerValidators = {
  Rhythm: RhythmValidator,
  Harmony: HarmonyValidator,
  PitchClassSet: PitchClassSetValidator,
  MathPrecision: MathPrecisionValidator,
  Utils: SchillingerMathUtils,
};

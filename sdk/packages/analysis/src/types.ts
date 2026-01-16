/**
 * Shared type definitions for the analysis package
 * These types are locally defined to avoid @schillinger-sdk/shared dependency
 */

export interface RhythmPattern {
  id?: string;
  durations: number[];
  timeSignature: [number, number];
  tempo?: number;
  swing?: number;
  metadata?: {
    generators?: [number, number];
    variationType?: string;
    complexity?: number;
  };
}

export interface ChordProgression {
  id?: string;
  chords: string[];
  key: string;
  scale: string;
  timeSignature?: [number, number];
  metadata?: {
    functions?: string[];
    tensions?: number[];
    voice_leading?: any;
    complexity?: number;
    generators?: [number, number];
    stability?: number;
    movement?: number;
  };
}

export interface MelodyLine {
  id?: string;
  notes: number[];
  durations: number[];
  key: string;
  scale: string;
  metadata?: {
    contour?: string;
    intervals?: number[];
    range?: [number, number];
    complexity?: number;
    originalMelodyId?: string;
    variationType?: string;
    originalPartialId?: string;
    completionMethod?: string;
  };
}

export interface Composition {
  id?: string;
  name: string;
  sections: Section[];
  key: string;
  scale: string;
  tempo: number;
  timeSignature: [number, number];
  metadata?: {
    style?: string;
    complexity?: number;
    duration?: number;
    structure?: string[];
    originalCompositionId?: string;
    variationType?: string;
    variationTimestamp?: number;
    originalPartialId?: string;
    completionMethod?: string;
  };
}

export interface Section {
  id?: string;
  type: string;
  rhythm: any;
  harmony: any;
  melody?: any;
  length: number;
  position: number;
}

export interface RhythmAnalysis {
  complexity: number;
  syncopation: number;
  density: number;
  patterns: any[];
  suggestions: string[];
}

export interface HarmonicAnalysis {
  key_stability: number;
  tension_curve: number[];
  functionalanalysis: string[];
  voice_leading_quality: number;
  suggestions: string[];
}

export interface MelodicAnalysis {
  contour: string;
  range: [number, number];
  intervals: number[];
  phrases: any[];
  complexity?: number;
}

export interface CompositionAnalysis {
  structure: any;
  harmonic: HarmonicAnalysis;
  rhythmic: RhythmAnalysis;
  melodic?: MelodicAnalysis;
  overall_complexity: number;
}

export interface RhythmicResultant {
  generators: { a: number; b: number };
  pattern: number[];
  length: number;
  metadata?: {
    lcm?: number;
    complexity?: number;
    density?: number;
  };
}

// Utility type aliases
export type ChordPattern = ChordProgression;
export type MelodyPattern = MelodyLine;

// Utility classes
export class ValidationUtils {
  static isValidDurations(value: unknown): value is number[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(
        (duration) =>
          typeof duration === "number" &&
          Number.isFinite(duration) &&
          duration >= 0,
      )
    );
  }

  static isValidChordProgression(value: unknown): value is string[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((chord) => typeof chord === "string" && chord.length > 0)
    );
  }
}

export class MathUtils {
  static normalizeSequence(
    seq: number[],
    options?: { precision?: number; sort?: boolean; dedupe?: boolean },
  ): number[] {
    if (!Array.isArray(seq)) return [];
    const { precision = 6, sort = false, dedupe = false } = options || {};
    let result = seq.map((x) =>
      typeof x === "number" && Number.isFinite(x)
        ? parseFloat(x.toFixed(precision))
        : 0,
    );
    if (sort) result = result.slice().sort((a, b) => a - b);
    if (dedupe) result = Array.from(new Set(result));
    return result;
  }
}

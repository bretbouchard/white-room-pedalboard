/**
 * Intermediate Representation (IR) types for the Schillinger SDK
 * This module defines all IR-specific types locally to avoid circular dependencies
 * and build order issues with @schillinger-sdk/analysis
 */

// Core types (defined locally to avoid build order issues)
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
  };
}

export interface Section {
  id?: string;
  type: SectionType;
  rhythm: any;
  harmony: any;
  melody?: any;
  length: number;
  position: number;
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
  };
}

export interface RhythmPattern {
  id?: string;
  durations: number[];
  timeSignature: [number, number];
  tempo?: number;
  metadata?: {
    generators?: [number, number];
    complexity?: number;
  };
}

export interface ChordProgression {
  id?: string;
  chords: string[];
  key: string;
  scale: string;
  metadata?: {
    functions?: string[];
    tensions?: number[];
    complexity?: number;
  };
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

// IR-specific types
export interface PatternIR_v1 {
  version: string;
  baseRule: string;
  variationRule?: string;
  seed: string;
}

export interface SongIR_v1 extends PatternIR_v1 {
  // Song-specific IR fields can be added here
}

// Additional IR types (minimal stubs for compatibility)
export interface ControlIR_v1 extends PatternIR_v1 {}
export interface HumanIntentIR_v1 extends PatternIR_v1 {}
export interface InstrumentIR_v1 extends PatternIR_v1 {}
export interface IntentIR_v1 extends PatternIR_v1 {}
export interface MixIR_v1 extends PatternIR_v1 {}
export interface ProcessIR_v1 extends PatternIR_v1 {}
export interface SongPlacementIR_v1 extends PatternIR_v1 {}
export interface ConstraintIR_v1 extends PatternIR_v1 {}

// Section type definition
export type SectionType =
  | "intro"
  | "verse"
  | "chorus"
  | "bridge"
  | "instrumental"
  | "outro";

// Analysis types
export interface StructuralAnalysis {
  form: string;
  sections: SectionAnalysis[];
  transitions: TransitionAnalysis[];
}

export interface SectionAnalysis {
  type: SectionType;
  start: number;
  end: number;
  characteristics: string[];
}

export interface TransitionAnalysis {
  from: SectionType;
  to: SectionType;
  type: string;
  effectiveness: number;
}

// IR ID types (minimal stubs for compatibility)
export type SectionId = string;
export type RoleId = string;
export type ConstraintId = string;
export type SceneId = string;

// MusicalTime type represents time in multiple musical dimensions
export interface MusicalTime {
  seconds?: number;
  beats?: number;
  measures?: number;
}

// ============================================================================
// ERROR CLASSES (re-exported from shared for convenience)
// ============================================================================

// Re-export error classes from @schillinger-sdk/shared
// These are imported here to provide a single import point for core modules
export type {
  ValidationError,
  ProcessingError,
  NetworkError,
} from "@schillinger-sdk/shared";

// ============================================================================
// SCHILLINGER ENCODING TYPE
// ============================================================================

/**
 * Schillinger encoding represents the mathematical parameters
 * that can generate a musical pattern
 */
export interface SchillingerEncoding {
  type: "rhythm" | "harmony" | "melody" | "composition";
  parameters: Record<string, any>;
  confidence: number;
  alternatives: Array<{
    parameters: Record<string, any>;
    confidence: number;
  }>;
}

// ============================================================================
// RHYTHM VARIATION FUNCTION STUBS
// ============================================================================

/**
 * Stub implementations for rhythm variation functions.
 * These should be replaced with actual implementations from @schillinger-sdk/shared
 * when the full pattern-variation system is integrated.
 */

export interface RhythmicResultant {
  pattern: number[];
  length: number;
  generators?: { a: number; b: number };
}

export interface RhythmVariation {
  pattern: number[];
  complexity: { rhythmic: number };
}

/**
 * Stub: Apply augmentation to rhythm pattern (increase note values)
 */
export function applyRhythmAugmentation(
  rhythm: RhythmicResultant,
  factor: number = 2,
): RhythmVariation {
  const augmentedPattern = rhythm.pattern.map((value) =>
    Math.round(value * factor),
  );
  return {
    pattern: augmentedPattern,
    complexity: { rhythmic: 0.5 },
  };
}

/**
 * Stub: Apply diminution to rhythm pattern (decrease note values)
 */
export function applyRhythmDiminution(
  rhythm: RhythmicResultant,
  factor: number = 2,
): RhythmVariation {
  const diminishedPattern = rhythm.pattern.map((value) => {
    const newValue = value / factor;
    return newValue >= 0.5 ? Math.round(newValue) : 0;
  });
  return {
    pattern: diminishedPattern,
    complexity: { rhythmic: 0.5 },
  };
}

/**
 * Stub: Apply retrograde to rhythm pattern (reverse order)
 */
export function applyRhythmRetrograde(
  rhythm: RhythmicResultant,
): RhythmVariation {
  const retrogradePattern = [...rhythm.pattern].reverse();
  return {
    pattern: retrogradePattern,
    complexity: { rhythmic: 0.5 },
  };
}

/**
 * Stub: Apply rotation to rhythm pattern (circular shift)
 */
export function applyRhythmRotation(
  rhythm: RhythmicResultant,
  steps: number = 1,
): RhythmVariation {
  const normalizedSteps =
    ((steps % rhythm.pattern.length) + rhythm.pattern.length) %
    rhythm.pattern.length;
  const rotatedPattern = [
    ...rhythm.pattern.slice(normalizedSteps),
    ...rhythm.pattern.slice(0, normalizedSteps),
  ];
  return {
    pattern: rotatedPattern,
    complexity: { rhythmic: 0.5 },
  };
}

/**
 * Stub: Apply permutation to rhythm pattern (reorder elements)
 */
export function applyRhythmPermutation(
  rhythm: RhythmicResultant,
  permutationOrder?: number[],
): RhythmVariation {
  // For now, just return a rotation as a simple permutation
  return applyRhythmRotation(rhythm, 1);
}

/**
 * Stub: Apply fractioning to rhythm pattern (subdivide beats)
 */
export function applyRhythmFractioning(
  rhythm: RhythmicResultant,
  divisions: number = 2,
): RhythmVariation {
  const fractionedPattern: number[] = [];
  rhythm.pattern.forEach((value) => {
    if (value > 0) {
      const subdivisionValue = value / divisions;
      for (let i = 0; i < divisions; i++) {
        fractionedPattern.push(subdivisionValue);
      }
    } else {
      fractionedPattern.push(value);
    }
  });
  return {
    pattern: fractionedPattern,
    complexity: { rhythmic: 0.5 },
  };
}

/**
 * Shared type definitions for the Schillinger SDK
 */

// Core musical data structures
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
    voice_leading?: VoiceLeading;
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
  type: SectionType;
  rhythm: RhythmPattern;
  harmony: ChordProgression;
  melody?: MelodyLine;
  length: number;
  position: number;
}

// Analysis types
export interface RhythmAnalysis {
  complexity: number;
  syncopation: number;
  density: number;
  patterns: DetectedPattern[];
  suggestions: string[];
}

export interface HarmonicAnalysis {
  key_stability: number;
  tension_curve: number[];
  functionalanalysis: string[];
  voice_leading_quality: number;
  suggestions: string[];
}

export interface CompositionAnalysis {
  structure: StructuralAnalysis;
  harmonic: HarmonicAnalysis;
  rhythmic: RhythmAnalysis;
  melodic?: MelodicAnalysis;
  overall_complexity: number;
}

// Reverse analysis types
export interface GeneratorInference {
  generators: [number, number];
  confidence: number;
  alternatives: Array<{
    generators: [number, number];
    confidence: number;
  }>;
}

export interface SchillingerEncoding {
  type: "rhythm" | "harmony" | "melody" | "composition";
  parameters: Record<string, any>;
  confidence: number;
  alternatives: Array<{
    parameters: Record<string, any>;
    confidence: number;
  }>;
}

// Utility types
export type SectionType =
  | "intro"
  | "verse"
  | "chorus"
  | "bridge"
  | "outro"
  | "instrumental"
  | "development"
  | "variation";
export type VariationType =
  | "augmentation"
  | "diminution"
  | "retrograde"
  | "rotation"
  | "permutation"
  | "fractioning";

export interface DetectedPattern {
  type: string;
  position: number;
  length: number;
  confidence: number;
}

export interface VoiceLeading {
  smoothness: number;
  contrary_motion: number;
  parallel_motion: number;
}

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

export interface MelodicAnalysis {
  contour: string;
  range: [number, number];
  intervals: number[];
  phrases: PhraseAnalysis[];
  complexity?: number;
}

export interface PhraseAnalysis {
  start: number;
  end: number;
  direction: "ascending" | "descending" | "static";
  peak: number;
}

// Configuration types
export interface SDKOptions {
  apiUrl?: string;
  timeout?: number;
  retries?: number;
  cacheEnabled?: boolean;
  offlineMode?: boolean;
}

// Generator configuration types
export interface RhythmGeneratorConfig {
  sdk?: SchillingerSDK;
  defaultComplexity?: number;
  cacheEnabled?: boolean;
  offlineFallback?: boolean;
  defaultTempo?: number;
  defaultTimeSignature?: [number, number];
  defaultSwing?: number;
}

export interface HarmonyGeneratorConfig {
  sdk?: SchillingerSDK;
  defaultStyle?: "classical" | "jazz" | "contemporary" | "experimental";
  cacheEnabled?: boolean;
  offlineFallback?: boolean;
  defaultKey?: string;
  defaultScale?: string;
}

export interface MelodyGeneratorConfig {
  sdk?: SchillingerSDK;
  defaultContour?: "ascending" | "descending" | "wave" | "arch";
  cacheEnabled?: boolean;
  offlineFallback?: boolean;
  defaultKey?: string;
  defaultScale?: string;
  defaultRange?: [number, number];
}

export interface CompositionGeneratorConfig {
  sdk?: SchillingerSDK;
  defaultStructure?: string[];
  cacheEnabled?: boolean;
  offlineFallback?: boolean;
  defaultStyle?: string;
  defaultTempo?: number;
}

export interface RhythmGeneratorParameters {
  tempo?: number;
  timeSignature?: [number, number];
  swing?: number;
  style?: "classical" | "jazz" | "contemporary" | "experimental";
  complexity?: number;
  density?: number;
}

export interface HarmonyGeneratorParameters {
  style?: "classical" | "jazz" | "contemporary" | "experimental";
  complexity?: number;
  key?: string;
  scale?: string;
  includeExtensions?: boolean;
  functionalHarmony?: boolean;
}

export interface MelodyGeneratorParameters {
  contour?: "ascending" | "descending" | "wave" | "arch";
  key?: string;
  scale?: string;
  range?: [number, number];
  intervalPreference?: number[];
  rhythmIntegration?: boolean;
}

export interface CompositionGeneratorParameters {
  structure?: string[];
  style?: string;
  tempo?: number;
  key?: string;
  scale?: string;
  orchestrationDensity?: "sparse" | "medium" | "dense";
}

// Generator result types (enhanced versions of existing types)
export interface GeneratorResult<T> {
  data: T;
  metadata: {
    generatedBy: string;
    timestamp: number;
    parameters: Record<string, any>;
    confidence?: number;
    alternatives?: T[];
  };
}

// Export realization types from the realization file
export * from "./realization";

// Export SongModel_v1 types
export * from "./song-model";

// Export ScheduledEvent types
export * from "./scheduled-event";

// Export ParameterAddress class and types
export * from "./parameter-address";

// Export SongDiff types
export * from "./song-diff";

// Export RealizedEnsemble types
export * from "./realized-ensemble";

// Re-export auth types from auth module
export type {
  AuthCredentials,
  AuthResult,
  Permission,
  UserInfo,
  TokenInfo,
  AuthState,
} from "../auth/types";

// Forward declaration for SchillingerSDK (to avoid circular dependency)
export interface SchillingerSDK {
  rhythm: any;
  harmony: any;
  melody: any;
  composition: any;
}

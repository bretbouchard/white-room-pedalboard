/**
 * Core Types for Multi-Language Music Theory Engine
 * Language-agnostic type definitions for cross-platform compatibility
 */

/**
 * Basic musical note representation
 * Compatible with MIDI, scientific notation, and international standards
 */
export interface Note {
  /** MIDI note number (0-127) for universal compatibility */
  midi: number;
  /** Scientific notation (e.g., "C4", "F#3") */
  name: string;
  /** Octave number (-1 to 9) */
  octave: number;
  /** Pitch class (0-11, C=0) */
  pitchClass: number;
  /** Frequency in Hz (optional, for tuning systems) */
  frequency?: number;
  /** Accidental type */
  accidental?: 'sharp' | 'flat' | 'natural' | 'double_sharp' | 'double_flat';
}

/**
 * Interval representation with multiple naming conventions
 */
export interface Interval {
  /** Semitone distance */
  semitones: number;
  /** Traditional interval name (e.g., "P5", "M3") */
  name: string;
  /** Quality (perfect, major, minor, augmented, diminished) */
  quality: 'perfect' | 'major' | 'minor' | 'augmented' | 'diminished';
  /** Numeric interval (1-8 for octave) */
  number: number;
  /** Direction (ascending/descending) */
  direction: 'ascending' | 'descending';
  /** Compound interval flag */
  compound: boolean;
}

/**
 * Scale definition with mathematical properties
 */
export interface Scale {
  /** Scale identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Tonic note */
  tonic: Note;
  /** Interval pattern in semitones */
  intervals: number[];
  /** Scale degrees with names */
  degrees: ScaleDegree[];
  /** Modal variations */
  modes: Mode[];
  /** Scale characteristics */
  characteristics: ScaleCharacteristics;
  /** Mathematical properties (Schillinger) */
  mathematics: MathematicalProperties;
}

export interface ScaleDegree {
  /** Degree number (1-based) */
  degree: number;
  /** Note at this degree */
  note: Note;
  /** Traditional name (tonic, supertonic, etc.) */
  name: string;
  /** Function in the scale */
  function: 'tonic' | 'supertonic' | 'mediant' | 'subdominant' | 'dominant' | 'submediant' | 'leading_tone' | 'subtonic';
}

export interface Mode {
  /** Mode name */
  name: string;
  /** Starting degree of parent scale */
  degree: number;
  /** Interval pattern */
  intervals: number[];
  /** Mode characteristics */
  characteristics: string[];
  /** Common usage contexts */
  contexts: string[];
}

export interface ScaleCharacteristics {
  /** Scale quality */
  quality: 'major' | 'minor' | 'modal' | 'chromatic' | 'exotic' | 'synthetic';
  /** Harmonic tension level (0-10) */
  tension: number;
  /** Brightness level (0-10) */
  brightness: number;
  /** Symmetry properties */
  symmetry: SymmetryProperties;
  /** Common genres */
  genres: string[];
  /** Cultural associations */
  cultures: string[];
}

/**
 * Chord definition with voice leading information
 */
export interface Chord {
  /** Chord identifier */
  id: string;
  /** Chord symbol (e.g., "Cmaj7", "Am") */
  symbol: string;
  /** Root note */
  root: Note;
  /** Chord quality */
  quality: ChordQuality;
  /** Chord tones */
  tones: Note[];
  /** Interval structure */
  intervals: number[];
  /** Extensions and alterations */
  extensions: ChordExtension[];
  /** Available inversions */
  inversions: ChordInversion[];
  /** Voice leading options */
  voicings: ChordVoicing[];
  /** Harmonic function */
  function: HarmonicFunction;
  /** Chord characteristics */
  characteristics: ChordCharacteristics;
}

export interface ChordQuality {
  /** Basic quality */
  base: 'major' | 'minor' | 'diminished' | 'augmented' | 'suspended' | 'dominant';
  /** Seventh type */
  seventh?: 'major' | 'minor' | 'diminished';
  /** Additional qualities */
  modifiers: string[];
}

export interface ChordExtension {
  /** Extension interval */
  interval: number;
  /** Extension name */
  name: string;
  /** Alteration (sharp, flat, natural) */
  alteration?: 'sharp' | 'flat' | 'natural';
  /** Optional flag */
  optional: boolean;
}

export interface ChordInversion {
  /** Inversion name */
  name: string;
  /** Bass note degree */
  bassDegree: number;
  /** Bass note */
  bassNote: Note;
  /** Stability rating (0-10) */
  stability: number;
  /** Voice leading implications */
  voiceLeading: string[];
}

export interface ChordVoicing {
  /** Voicing name */
  name: string;
  /** Note arrangement */
  notes: Note[];
  /** Voicing type */
  type: 'close' | 'open' | 'drop2' | 'drop3' | 'rootless' | 'quartal' | 'cluster';
  /** Recommended usage */
  usage: string[];
  /** Difficulty level */
  difficulty: number;
}

export interface HarmonicFunction {
  /** Primary function */
  primary: 'tonic' | 'subdominant' | 'dominant';
  /** Secondary function */
  secondary?: 'predominant' | 'cadential' | 'passing' | 'neighbor';
  /** Roman numeral */
  romanNumeral: string;
  /** Functional strength (0-10) */
  strength: number;
}

export interface ChordCharacteristics {
  /** Harmonic tension (0-10) */
  tension: number;
  /** Stability (0-10) */
  stability: number;
  /** Brightness (0-10) */
  brightness: number;
  /** Dissonance level (0-10) */
  dissonance: number;
  /** Color description */
  color: string[];
  /** Emotional associations */
  emotions: string[];
}

/**
 * Chord progression with analysis
 */
export interface ChordProgression {
  /** Progression identifier */
  id: string;
  /** Progression name */
  name: string;
  /** Chord sequence */
  chords: Chord[];
  /** Roman numeral analysis */
  romanNumerals: string[];
  /** Harmonic functions */
  functions: HarmonicFunction[];
  /** Key context */
  key: Key;
  /** Progression characteristics */
  characteristics: ProgressionCharacteristics;
  /** Voice leading analysis */
  voiceLeading: VoiceLeadingAnalysis;
  /** Cadences */
  cadences: Cadence[];
}

export interface ProgressionCharacteristics {
  /** Mood descriptors */
  mood: string[];
  /** Overall tension (0-10) */
  tension: number;
  /** Stability (0-10) */
  stability: number;
  /** Movement type */
  movement: 'static' | 'circular' | 'linear' | 'chromatic' | 'sequential';
  /** Common genres */
  genres: string[];
  /** Complexity level (0-10) */
  complexity: number;
}

export interface VoiceLeadingAnalysis {
  /** Overall smoothness (0-10) */
  smoothness: number;
  /** Voice leading violations */
  violations: VoiceLeadingViolation[];
  /** Common tones between chords */
  commonTones: CommonTone[];
  /** Stepwise motion percentage */
  stepwiseMotion: number;
  /** Leap analysis */
  leaps: Leap[];
}

export interface VoiceLeadingViolation {
  /** Violation type */
  type: 'parallel_fifths' | 'parallel_octaves' | 'hidden_fifths' | 'voice_crossing' | 'range_violation';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Location in progression */
  location: { from: number; to: number };
  /** Voices involved */
  voices: number[];
  /** Description */
  description: string;
}

export interface CommonTone {
  /** Note that is common */
  note: Note;
  /** Chord indices where it appears */
  chordIndices: number[];
  /** Voice numbers */
  voices: number[];
}

export interface Leap {
  /** Voice number */
  voice: number;
  /** Leap size in semitones */
  size: number;
  /** Direction */
  direction: 'ascending' | 'descending';
  /** Location */
  location: { from: number; to: number };
  /** Resolution quality */
  resolution: 'proper' | 'improper' | 'unresolved';
}

export interface Cadence {
  /** Cadence type */
  type: 'authentic' | 'plagal' | 'deceptive' | 'half' | 'phrygian' | 'neapolitan';
  /** Strength (0-10) */
  strength: number;
  /** Chord indices involved */
  chordIndices: number[];
  /** Description */
  description: string;
}

/**
 * Key and tonality
 */
export interface Key {
  /** Tonic note */
  tonic: Note;
  /** Mode/scale type */
  mode: string;
  /** Key signature */
  signature: KeySignature;
  /** Scale associated with key */
  scale: Scale;
  /** Related keys */
  relatives: RelatedKeys;
}

export interface KeySignature {
  /** Sharps or flats */
  accidentals: Note[];
  /** Number of accidentals */
  count: number;
  /** Type (sharp or flat) */
  type: 'sharp' | 'flat' | 'natural';
}

export interface RelatedKeys {
  /** Relative major/minor */
  relative?: Key;
  /** Parallel major/minor */
  parallel?: Key;
  /** Dominant key */
  dominant?: Key;
  /** Subdominant key */
  subdominant?: Key;
  /** Closely related keys */
  closelyRelated: Key[];
}

/**
 * Mathematical properties for Schillinger analysis
 */
export interface MathematicalProperties {
  /** Symmetry groups */
  symmetryGroups: number[];
  /** Interval ratios (just intonation) */
  intervalRatios: number[];
  /** Mathematical pattern description */
  pattern: string;
  /** Generative properties */
  generative: GenerativeProperties;
  /** Interference patterns */
  interference: InterferencePattern[];
}

export interface GenerativeProperties {
  /** Base pattern */
  base: number[];
  /** Transformation rules */
  transformations: string[];
  /** Periodicity */
  period: number;
  /** Symmetry axis */
  symmetryAxis?: number;
}

export interface InterferencePattern {
  /** Pattern A */
  patternA: number[];
  /** Pattern B */
  patternB: number[];
  /** Resultant pattern */
  resultant: number[];
  /** Interference type */
  type: 'additive' | 'subtractive' | 'multiplicative';
}

export interface SymmetryProperties {
  /** Is symmetrical */
  isSymmetrical: boolean;
  /** Symmetry type */
  type?: 'rotational' | 'reflective' | 'translational';
  /** Symmetry axis */
  axis?: number;
  /** Symmetry order */
  order?: number;
}

/**
 * Analysis results and metadata
 */
export interface AnalysisResult<T> {
  /** Analysis data */
  data: T;
  /** Confidence score (0-1) */
  confidence: number;
  /** Analysis metadata */
  metadata: AnalysisMetadata;
  /** Alternative results */
  alternatives?: T[];
  /** Suggestions */
  suggestions?: Suggestion[];
}

export interface AnalysisMetadata {
  /** Analysis timestamp */
  timestamp: number;
  /** Processing time (ms) */
  processingTime: number;
  /** Analysis method used */
  method: string;
  /** Data source */
  source: string;
  /** Cache hit flag */
  cacheHit: boolean;
  /** Analysis depth */
  depth: 'basic' | 'detailed' | 'comprehensive';
}

export interface Suggestion {
  /** Suggestion type */
  type: 'chord_substitution' | 'voice_leading' | 'harmonic_rhythm' | 'modulation' | 'cadence';
  /** Priority level */
  priority: 'low' | 'medium' | 'high';
  /** Description */
  description: string;
  /** Reasoning */
  reasoning: string;
  /** Implementation details */
  implementation?: any;
  /** Expected improvement */
  expectedImprovement: number;
}

/**
 * Validation results
 */
export interface ValidationResult {
  /** Overall validity */
  isValid: boolean;
  /** Validation score (0-100) */
  score: number;
  /** Violations found */
  violations: Violation[];
  /** Suggestions for improvement */
  suggestions: Suggestion[];
  /** Validation metadata */
  metadata: ValidationMetadata;
}

export interface Violation {
  /** Violation type */
  type: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Location */
  location: any;
  /** Description */
  description: string;
  /** Rule violated */
  rule: string;
  /** Suggested fix */
  suggestedFix?: string;
}

export interface ValidationMetadata {
  /** Validation style */
  style: string;
  /** Strictness level */
  strictness: 'lenient' | 'moderate' | 'strict' | 'academic';
  /** Rules applied */
  rulesApplied: string[];
  /** Validation timestamp */
  timestamp: number;
  /** Optional processing time (ms) */
  processingTime?: number;
}

/**
 * Configuration types
 */
export interface TheoryEngineConfig {
  /** Enable caching */
  enableCaching: boolean;
  /** Cache size limit */
  cacheSize: number;
  /** Enable Schillinger analysis */
  enableSchillinger: boolean;
  /** Default analysis depth */
  analysisDepth: 'basic' | 'detailed' | 'comprehensive';
  /** Default validation strictness */
  validationStrictness: 'lenient' | 'moderate' | 'strict' | 'academic';
  /** Language binding */
  languageBinding: string;
  /** Performance thresholds */
  performance: PerformanceConfig;
}

export interface PerformanceConfig {
  /** Maximum analysis time (ms) */
  maxAnalysisTime: number;
  /** Maximum memory usage (MB) */
  maxMemoryUsage: number;
  /** Minimum cache hit rate */
  minCacheHitRate: number;
  /** Maximum error rate */
  maxErrorRate: number;
}

/**
 * Error types for consistent error handling
 */
// legacy TheoryEngineError interface removed in favor of enum-based errors and wrappers

/**
 * Language binding types
 */
export interface LanguageBinding {
  /** Target language */
  language: string;
  /** Binding version */
  version: string;
  /** Supported features */
  features: string[];
  /** Serialization format */
  serializationFormat: 'json' | 'binary' | 'protobuf';
  /** Async support */
  asyncSupport: boolean;
}

/**
 * Serialization interfaces for cross-language compatibility
 */
export interface SerializableData {
  /** Data type identifier */
  type: string;
  /** Data version */
  version: string;
  /** Serialized data */
  data: any;
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Export all types for external use
 */
// Engine-level enums, results, and defaults
export enum TheoryEngineError {
  INVALID_INPUT = 'INVALID_INPUT',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CACHE_ERROR = 'CACHE_ERROR',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  LANGUAGE_BINDING_ERROR = 'LANGUAGE_BINDING_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SCHILLINGER_ERROR = 'SCHILLINGER_ERROR',
}

export interface TheoryEngineResult<T> {
  success: boolean;
  data?: T;
  error?: { code: TheoryEngineError | string; message: string; details?: any };
  metadata?: Record<string, any>;
}

export function createResult<T = any>(success: boolean, data?: T | undefined, error?: { code: TheoryEngineError | string; message: string; details?: any } | undefined, metadata?: Record<string, any> | undefined): TheoryEngineResult<T> {
  return { success, data: data as any, error, metadata };
}

export const DEFAULT_THEORY_CONFIG: Partial<TheoryEngineConfig> = {
  enableCaching: true,
  cacheSize: 1000,
  enableSchillinger: true,
  analysisDepth: 'comprehensive',
  validationStrictness: 'moderate',
  languageBinding: 'typescript',
};

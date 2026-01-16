/**
 * Reverse analysis for harmonic progressions
 */

import { ChordProgression } from '@schillinger-sdk/shared';
// import { ValidationUtils } from '@schillinger-sdk/shared'; // TODO: Use for validation
export type { ChordProgression as ChordPattern } from '@schillinger-sdk/shared';
export interface HarmonyFitOptions {
  key?: string;
  scale?: string;
  maxResults?: number;
  minConfidence?: number;
  maxGenerator?: number;
}

export interface ChordAnalysis {
  chord: string;
  rootNote: string;
  quality: string;
  extensions: string[];
  function: string;
  stability: number;
  complexity: number;
}

export interface Cadence {
  type: 'authentic' | 'plagal' | 'deceptive' | 'half';
  position: number;
  strength: number;
}

export interface ProgressionAnalysis {
  chords: ChordAnalysis[];
  key: string;
  scale: string;
  functions: string[];
  tensionCurve: number[];
  cadences: Cadence[];
  voiceLeading: {
    smoothness: number;
    parallelMotion: number;
    contraryMotion: number;
    stepwiseMotion: number;
    voiceRanges: {
      bass: { min: number; max: number };
      tenor: { min: number; max: number };
      alto: { min: number; max: number };
      soprano: { min: number; max: number };
    };
  };
}

/**
 * Analyze a single chord in context
 */
export function analyzeChord(
  chord: string,
  key: string,
  scale: string = 'major'
): ChordAnalysis {
  // Parse chord components
  const rootNote = parseRootNote(chord);
  const quality = parseChordQuality(chord);
  const extensions = parseExtensions(chord);

  // Determine function in key
  const chordFunction = determineFunction(rootNote, key, scale);

  // Calculate stability (tonic = high, dominant = medium, others = lower)
  const stability = calculateStability(chordFunction, quality);

  // Calculate complexity based on extensions and alterations
  const complexity = calculateComplexity(extensions, quality);

  return {
    chord,
    rootNote,
    quality,
    extensions,
    function: chordFunction,
    stability,
    complexity,
  };
}

/**
 * Analyze a chord progression
 */
export function analyzeProgression(
  input: string[] | ChordProgression,
  options: HarmonyFitOptions = {}
): ProgressionAnalysis {
  // TODO: Use options for harmony analysis configuration
  // Handle both array and ChordPattern inputs
  const chords = Array.isArray(input) ? input : input.chords;
  const key = Array.isArray(input)
    ? options.key || 'C'
    : input.key || options.key || 'C';
  const scale = Array.isArray(input)
    ? options.scale || 'major'
    : input.scale || options.scale || 'major';

  // Validate input
  if (!chords || chords.length === 0) {
    throw new Error('Empty chord progression provided');
  }

  // Analyze each chord
  const chordAnalyses = chords.map((chord: string) =>
    analyzeChord(chord, key, scale)
  );

  // Extract functions
  const functions = chordAnalyses.map(
    (analysis: ChordAnalysis) => analysis.function
  );

  // Calculate tension curve
  const tensionCurve = calculateTensionCurve(chordAnalyses);

  // Detect cadences
  const cadences = detectCadences(functions, chords);

  // Analyze voice leading
  const voiceLeading = analyzeVoiceLeadingQuality(chords);

  return {
    chords: chordAnalyses,
    key,
    scale,
    functions,
    tensionCurve,
    cadences,
    voiceLeading,
  };
}

export interface HarmonicGeneratorInference {
  confidence: number;
  generators: { a: number; b: number };
  detectedParameters: {
    chordCount: number;
    uniqueChords: number;
    functionalStrength: number;
    style?: string;
    complexity?: number;
    key?: string;
    scale?: string;
  };
}

/**
 * Infer harmonic generators from progression
 */
export function inferHarmonicGenerators(
  input: string[] | ChordProgression,
  options: HarmonyFitOptions = {}
): HarmonicGeneratorInference[] {
  // TODO: Use options for harmonic generator inference
  // Handle both array and ChordProgression inputs
  const chords = Array.isArray(input) ? input : input.chords;
  const maxGenerator = (options as any).maxGenerator || 8;

  if (!chords || chords.length === 0) {
    return [];
  }

  // Simple implementation based on chord count and progression length
  const chordCount = chords.length;
  const uniqueChords = new Set(chords).size;

  // Detect style and complexity
  const hasJazzChords = chords.some(
    chord =>
      chord.includes('7') ||
      chord.includes('9') ||
      chord.includes('11') ||
      chord.includes('13')
  );
  const style = hasJazzChords ? 'jazz' : 'classical';
  const complexity = uniqueChords / chordCount;

  // Simple key detection (assume first chord is tonic)
  const detectedKey = parseRootNote(chords[0]);
  const detectedScale = hasJazzChords ? 'major' : 'major'; // Simplified

  // Calculate generators with maxGenerator constraint
  const a = Math.min(chordCount, maxGenerator);
  const b = Math.min(uniqueChords, maxGenerator);

  const inference: HarmonicGeneratorInference = {
    confidence: 0.7,
    generators: { a, b },
    detectedParameters: {
      chordCount,
      uniqueChords,
      functionalStrength: 0.6,
      style,
      complexity,
      key: detectedKey,
      scale: detectedScale,
    },
  };

  return [inference];
}

/**
 * Analyze voice leading and rhythm
 */
export function analyzeVoiceLeadingAndRhythm(
  input: string[] | ChordProgression,
  _options: HarmonyFitOptions = {}
): {
  // TODO: Use options for voice leading analysis
  voiceLeading: {
    smoothness: number;
    parallelMotion: number;
    contraryMotion: number;
    stepwiseMotion: number;
    voiceRanges: {
      bass: { min: number; max: number };
      tenor: { min: number; max: number };
      alto: { min: number; max: number };
      soprano: { min: number; max: number };
    };
  };
  harmonicRhythm: {
    changes: number[];
    density: number;
    acceleration: number[];
    patterns: string[];
  };
  rhythm: { complexity: number; syncopation: number };
} {
  // Handle both array and ChordProgression inputs
  const chords = Array.isArray(input) ? input : input.chords;
  const voiceLeading = analyzeVoiceLeadingQuality(chords);

  // Harmonic rhythm analysis
  const harmonicRhythm = {
    changes: chords.map((chord: string, i: number) => i), // Simplified: chord change positions
    density: chords.length / 4, // Chords per measure (assuming 4/4)
    acceleration: chords.map(() => 1), // Simplified: constant rate
    patterns: ['regular'], // Simplified pattern detection
  };

  // Simple rhythm analysis
  const rhythm = {
    complexity: 0.5, // Placeholder
    syncopation: 0.3, // Placeholder
  };

  return {
    voiceLeading,
    harmonicRhythm,
    rhythm,
  };
}

// Helper functions
function parseRootNote(chord: string): string {
  const match = chord.match(/^([A-G][#b]?)/);
  return match ? match[1] : 'C';
}

function parseChordQuality(chord: string): string {
  if (chord.includes('maj')) return 'major';
  if (chord.includes('m') && !chord.includes('maj')) return 'minor';
  if (chord.includes('7') && !chord.includes('maj')) return 'dominant';
  if (chord.includes('dim')) return 'diminished';
  if (chord.includes('aug')) return 'augmented';
  return 'major';
}

function parseExtensions(chord: string): string[] {
  const extensions: string[] = [];
  if (chord.includes('7')) extensions.push('7');
  if (chord.includes('9')) extensions.push('9');
  if (chord.includes('11')) extensions.push('11');
  if (chord.includes('13')) extensions.push('13');
  if (chord.includes('#11')) extensions.push('#11');
  if (chord.includes('b9')) extensions.push('b9');
  return extensions;
}

function determineFunction(
  rootNote: string,
  key: string,
  scale: string
): string {
  // Simple function determination based on scale degrees
  const noteToNumber: { [key: string]: number } = {
    C: 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11,
  };

  const keyNum = noteToNumber[key] || 0;
  const rootNum = noteToNumber[rootNote] || 0;
  const degree = (rootNum - keyNum + 12) % 12;

  // Special case: if it's the relative minor (vi chord), treat as tonic
  if (degree === 9 && scale === 'major') {
    return 'tonic'; // Relative minor tonic
  }

  switch (degree) {
    case 0:
      return 'tonic';
    case 2:
      return 'supertonic';
    case 4:
      return 'mediant';
    case 5:
      return 'subdominant';
    case 7:
      return 'dominant';
    case 9:
      return 'submediant';
    case 11:
      return 'leading-tone';
    default:
      return 'tonic';
  }
}

function calculateStability(chordFunction: string, quality: string): number {
  let stability = 0.5;

  if (chordFunction === 'tonic') stability = 0.9;
  else if (chordFunction === 'dominant') stability = 0.6;
  else if (chordFunction === 'subdominant') stability = 0.7;

  if (quality === 'major') stability += 0.1;
  else if (quality === 'minor') stability += 0.05;

  return Math.min(stability, 1.0);
}

function calculateComplexity(extensions: string[], quality: string): number {
  let complexity = 0.1;

  complexity += extensions.length * 0.2;

  if (quality === 'diminished' || quality === 'augmented') complexity += 0.3;
  if (quality === 'dominant') complexity += 0.2;

  return Math.min(complexity, 1.0);
}

function calculateTensionCurve(chordAnalyses: ChordAnalysis[]): number[] {
  return chordAnalyses.map(analysis => {
    let tension = 0.5;

    if (analysis.function === 'dominant') tension = 0.8;
    else if (analysis.function === 'leading-tone') tension = 0.7;
    else if (analysis.function === 'tonic') tension = 0.2;
    else if (analysis.function === 'subdominant') tension = 0.4;

    tension += analysis.complexity * 0.3;

    return Math.min(tension, 1.0);
  });
}

function detectCadences(functions: string[], _chords: string[]): Cadence[] {
  // TODO: Use chords for cadence detection
  const cadences: Cadence[] = [];

  for (let i = 1; i < functions.length; i++) {
    const prevFunction = functions[i - 1];
    const currFunction = functions[i];

    // Authentic cadence: dominant to tonic
    if (prevFunction === 'dominant' && currFunction === 'tonic') {
      cadences.push({
        type: 'authentic',
        position: i,
        strength: 0.9,
      });
    }

    // Plagal cadence: subdominant to tonic
    if (prevFunction === 'subdominant' && currFunction === 'tonic') {
      cadences.push({
        type: 'plagal',
        position: i,
        strength: 0.7,
      });
    }

    // Deceptive cadence: dominant to submediant
    if (prevFunction === 'dominant' && currFunction === 'submediant') {
      cadences.push({
        type: 'deceptive',
        position: i,
        strength: 0.6,
      });
    }

    // Half cadence: any to dominant
    if (currFunction === 'dominant' && prevFunction !== 'dominant') {
      cadences.push({
        type: 'half',
        position: i,
        strength: 0.5,
      });
    }
  }

  return cadences;
}

function analyzeVoiceLeadingQuality(_chords: string[]): {
  // TODO: Use chords for voice leading quality analysis
  smoothness: number;
  parallelMotion: number;
  contraryMotion: number;
  stepwiseMotion: number;
  voiceRanges: {
    bass: { min: number; max: number };
    tenor: { min: number; max: number };
    alto: { min: number; max: number };
    soprano: { min: number; max: number };
  };
} {
  // Simplified voice leading analysis
  return {
    smoothness: 0.7,
    parallelMotion: 0.3,
    contraryMotion: 0.4,
    stepwiseMotion: 0.6,
    voiceRanges: {
      bass: { min: 40, max: 60 },
      tenor: { min: 48, max: 67 },
      alto: { min: 55, max: 74 },
      soprano: { min: 60, max: 81 },
    },
  };
}

export interface HarmonicInference {
  structure: {
    functions: string[];
    key: string;
    scale: string;
  };
  generators?: {
    a: number;
    b: number;
  };
  confidence: number;
  analysis: {
    functionalStrength: number;
    voiceLeadingQuality: number;
    tonalStability: number;
  };
}

export interface HarmonicEncoding {
  originalProgression: string[];
  bestMatch: HarmonicInference;
  alternatives: HarmonicInference[];
  confidence: number;
  progressionAnalysis: ProgressionAnalysis;
  metadata: {
    analysisTimestamp: number;
    averageTension: number;
    functionalComplexity: number;
  };
}

export interface HarmonicMatch {
  progression: ChordProgression;
  confidence: number;
  similarity: number;
  analysis: {
    functionalSimilarity: number;
    chordSimilarity: number;
    keyRelationship: number;
  };
}

/**
 * Infer harmonic structure from chord progression
 */
export function inferHarmonicStructure(
  chords: string[],
  options: { key?: string; maxResults?: number } = {}
): HarmonicInference[] {
  // Basic validation - just check if we have chords
  if (!chords || chords.length === 0) {
    throw new Error('Invalid chord progression');
  }

  // Placeholder implementation
  // In a real implementation, this would analyze chord functions,
  // key relationships, and harmonic patterns

  // Simple generator detection
  const chordCount = chords.length;
  const uniqueChords = new Set(chords).size;
  const generators = {
    a: Math.min(chordCount, 8),
    b: Math.min(uniqueChords, 6),
  };

  const inference: HarmonicInference = {
    structure: {
      functions: chords.map(() => 'I'), // Simplified
      key: options.key || 'C',
      scale: 'major',
    },
    generators,
    confidence: 0.7,
    analysis: {
      functionalStrength: 0.6,
      voiceLeadingQuality: 0.7,
      tonalStability: 0.8,
    },
  };

  return [inference];
}

/**
 * Encode chord progression into Schillinger harmonic parameters
 */
export function encodeProgression(
  input: string[] | ChordProgression,
  options: { includeAlternatives?: boolean } = {}
): HarmonicEncoding {
  // Handle both array and ChordProgression inputs
  const chords = Array.isArray(input) ? input : input.chords;
  const key = Array.isArray(input) ? 'C' : input.key || 'C';

  const inferences = inferHarmonicStructure(chords, { key });
  const progressionAnalysis = analyzeProgression(chords, { key });

  // Calculate metadata
  const averageTension =
    progressionAnalysis.tensionCurve.reduce(
      (sum, tension) => sum + tension,
      0
    ) / progressionAnalysis.tensionCurve.length;
  const uniqueFunctions = new Set(progressionAnalysis.functions).size;
  const functionalComplexity =
    uniqueFunctions / progressionAnalysis.functions.length;

  return {
    originalProgression: chords,
    bestMatch: inferences[0],
    alternatives: options.includeAlternatives ? inferences.slice(1) : [],
    confidence: inferences[0]?.confidence || 0,
    progressionAnalysis,
    metadata: {
      analysisTimestamp: Date.now(),
      averageTension,
      functionalComplexity,
    },
  };
}

/**
 * Find harmonic matches for target progression
 */
export function findHarmonicMatches(): HarmonicMatch[] {
  // parameters removed
  // Placeholder implementation
  return [];
}

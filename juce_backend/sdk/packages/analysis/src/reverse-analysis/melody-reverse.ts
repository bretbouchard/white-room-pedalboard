export type { MelodyLine as MelodyPattern } from '@schillinger-sdk/shared';
/**
 * Reverse analysis for melodic lines
 */

import { MelodyLine } from '@schillinger-sdk/shared';

export interface MelodyFitOptions {
  maxGenerator?: number;
  minConfidence?: number;
  maxResults?: number;
  includeAlternatives?: boolean;
  analysisDepth?: 'basic' | 'comprehensive';
  includeModal?: boolean;
  includeModalAnalysis?: boolean;
  includeChromatic?: boolean;
}

export interface MelodicContourInference {
  generators: { a: number; b: number };
  confidence: number;
  detectedParameters: {
    key: string;
    scale: string;
    complexity: 'simple' | 'moderate' | 'complex';
    style: 'classical' | 'contemporary' | 'jazz';
  };
  analysis: {
    intervalVariety: number;
    scalarContent: number;
    phraseStructure: number;
    contourMatch: number;
  };
}

export interface ScaleRelationship {
  scale: string;
  confidence: number;
  notes: number[];
  characteristics: string[];
}

export interface ScaleAnalysis {
  primaryScale: string;
  confidence: number;
  alternativeScales: ScaleRelationship[];
  modalAnalysis?: {
    modalCharacter: number;
    detectedModes: string[];
  };
  chromaticAnalysis?: {
    chromaticDensity: number;
    chromaticNotes: number[];
  };
}

export interface IntervalPattern {
  pattern: number[];
  frequency: number;
  type: 'sequence' | 'repetition' | 'schillinger';
  confidence: number;
}

export interface IntervalPatternAnalysis {
  patterns: IntervalPattern[];
  techniques: string[];
}

export interface MelodicComplexityAnalysis {
  overallComplexity: number;
  complexity: 'simple' | 'moderate' | 'complex';
  components: {
    intervalComplexity: number;
    contourComplexity: number;
    intervalVariety: number;
    rangeSpan: number;
    rhythmicComplexity: number;
    harmonicImplications: number;
  };
  structuralAnalysis: {
    phrases: number;
    sequences: number;
    motifs: number;
    development: number;
    climaxPoints: number[];
  };
  recommendations: string[];
}

export interface MelodicInference {
  structure: {
    contour: string;
    scale: string;
    intervals: number[];
    phrases: Array<{
      start: number;
      end: number;
      direction: 'ascending' | 'descending' | 'static';
    }>;
  };
  generators?: {
    a: number;
    b: number;
  };
  confidence: number;
  analysis: {
    scalarContent: number;
    intervalVariety: number;
    phraseStructure: number;
  };
}

export interface MelodicEncoding {
  originalMelody: number[];
  bestMatch: MelodicInference;
  alternatives: MelodicInference[];
  confidence: number;
  detectedCharacteristics: {
    range: [number, number];
    intervalProfile: number[];
    contourShape: string;
    complexity: number;
    scalarContent: number;
    intervalVariety: number;
    phraseStructure: number;
    key?: string;
  };
  metadata: {
    analysisTimestamp: number;
    melodyLength: number;
  };
}

/**
 * Infer melodic structure from note sequence
 */
export function inferMelodicStructure(
  melody: MelodyLine
  // options removed
): MelodicInference[] {
  if (
    !Array.isArray(melody.notes) ||
    melody.notes.some(note => typeof note !== 'number')
  ) {
    throw new Error('Invalid melody notes');
  }

  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < melody.notes.length; i++) {
    intervals.push(melody.notes[i] - melody.notes[i - 1]);
  }

  // Analyze contour
  const contour = analyzeContour(intervals);

  // Detect phrases (simplified)
  const phrases = detectPhrases(melody.notes);

  // Simple generator detection based on interval patterns
  const generators = detectGenerators(intervals);

  const inference: MelodicInference = {
    structure: {
      contour,
      scale: melody.scale || 'major',
      intervals,
      phrases,
    },
    generators,
    confidence: 0.7,
    analysis: {
      scalarContent: calculateScalarContent(intervals),
      intervalVariety: new Set(intervals.map(Math.abs)).size / intervals.length,
      phraseStructure: phrases.length / (melody.notes.length / 8), // Rough phrase density
    },
  };

  return [inference];
}

/**
 * Encode melody into Schillinger melodic parameters
 */
export function encodeMelody(
  melody: number[] | MelodyLine,
  options: { includeAlternatives?: boolean; minConfidence?: number } = {}
): MelodicEncoding {
  // Convert array to MelodyLine if needed
  const melodyLine: MelodyLine = Array.isArray(melody)
    ? { notes: melody, durations: [], key: 'C', scale: 'major' }
    : melody;

  const inferences = inferMelodicStructure(melodyLine);
  const notes = melodyLine.notes;

  // Check if melody is too short or doesn't meet confidence requirements
  if (notes.length < 2) {
    throw new Error('Melody too short for analysis');
  }

  const confidence = inferences[0]?.confidence || 0;
  if (options.minConfidence && confidence < options.minConfidence) {
    throw new Error('Melody does not meet minimum confidence threshold');
  }

  // Calculate intervals for characteristics
  const intervals: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    intervals.push(notes[i] - notes[i - 1]);
  }

  // Calculate characteristics
  const range: [number, number] = [Math.min(...notes), Math.max(...notes)];
  const intervalProfile = [...new Set(intervals.map(Math.abs))].sort(
    (a, b) => a - b
  );
  const contourShape = analyzeContour(intervals);
  const rangeSpan = range[1] - range[0];
  const complexity =
    (intervalProfile.length / 12) * 0.4 + (rangeSpan / 48) * 0.6;

  return {
    originalMelody: Array.isArray(melody) ? melody : melody.notes,
    bestMatch: inferences[0],
    alternatives: options.includeAlternatives ? inferences.slice(1) : [],
    confidence: inferences[0]?.confidence || 0,
    detectedCharacteristics: {
      range,
      intervalProfile,
      contourShape,
      complexity,
      scalarContent: inferences[0]?.analysis.scalarContent || 0,
      intervalVariety: inferences[0]?.analysis.intervalVariety || 0,
      phraseStructure: inferences[0]?.analysis.phraseStructure || 0,
      key: melodyLine.key,
    },
    metadata: {
      analysisTimestamp: Date.now(),
      melodyLength: melodyLine.notes.length,
    },
  };
}

// Helper functions

function analyzeContour(intervals: number[]): string {
  if (intervals.length === 0) return 'static';

  const ascending = intervals.filter(i => i > 0).length;
  const descending = intervals.filter(i => i < 0).length;
  const static_ = intervals.filter(i => i === 0).length;

  if (ascending > descending && ascending > static_) return 'ascending';
  if (descending > ascending && descending > static_) return 'descending';
  if (static_ > ascending && static_ > descending) return 'static';
  return 'mixed';
}

function detectPhrases(notes: number[]): Array<{
  start: number;
  end: number;
  direction: 'ascending' | 'descending' | 'static';
}> {
  // Simplified phrase detection based on direction changes
  const phrases: Array<{
    start: number;
    end: number;
    direction: 'ascending' | 'descending' | 'static';
  }> = [];

  let currentStart = 0;
  let currentDirection: 'ascending' | 'descending' | 'static' = 'static';

  for (let i = 1; i < notes.length; i++) {
    const interval = notes[i] - notes[i - 1];
    const direction: 'ascending' | 'descending' | 'static' =
      interval > 0 ? 'ascending' : interval < 0 ? 'descending' : 'static';

    if (direction !== currentDirection && currentDirection !== 'static') {
      phrases.push({
        start: currentStart,
        end: i - 1,
        direction: currentDirection,
      });
      currentStart = i - 1;
    }

    if (direction !== 'static') {
      currentDirection = direction;
    }
  }

  // Add final phrase
  if (currentStart < notes.length - 1) {
    phrases.push({
      start: currentStart,
      end: notes.length - 1,
      direction: currentDirection,
    });
  }

  return phrases;
}

function calculateScalarContent(intervals: number[]): number {
  // Calculate percentage of scalar intervals (steps of 1 or 2 semitones)
  const scalarIntervals = intervals.filter(
    interval => Math.abs(interval) === 1 || Math.abs(interval) === 2
  ).length;

  return intervals.length > 0 ? scalarIntervals / intervals.length : 0;
}

/**
 * Analyze melodic contour and infer Schillinger generators
 */
export function analyzeMelodicContour(
  melody: number[] | MelodyLine,
  options: MelodyFitOptions = {}
): MelodicContourInference[] {
  const notes = Array.isArray(melody) ? melody : melody.notes;

  if (!Array.isArray(notes) || notes.length === 0) {
    throw new Error('Invalid melody: empty or invalid notes array');
  }

  // Check for invalid notes
  if (notes.some(note => typeof note !== 'number' || isNaN(note))) {
    throw new Error('Invalid melody: contains non-numeric or NaN values');
  }

  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    intervals.push(notes[i] - notes[i - 1]);
  }

  // Infer generators based on melodic characteristics
  const intervalVariety = new Set(intervals.map(Math.abs)).size;
  const scalarContent = calculateScalarContent(intervals);
  const range = Math.max(...notes) - Math.min(...notes);

  // Simple generator inference
  const a = Math.min(
    options.maxGenerator || 8,
    Math.max(2, Math.ceil(intervalVariety * 0.8))
  );
  const b = Math.min(
    options.maxGenerator || 8,
    Math.max(2, Math.ceil(range / 12))
  );

  const inference: MelodicContourInference = {
    generators: { a, b },
    confidence: Math.min(
      0.9,
      scalarContent * 0.5 + (intervalVariety / 12) * 0.5
    ),
    detectedParameters: {
      key: 'C',
      scale: scalarContent > 0.7 ? 'major' : 'chromatic',
      complexity: range > 24 ? 'complex' : range > 12 ? 'moderate' : 'simple',
      style: scalarContent > 0.8 ? 'classical' : 'contemporary',
    },
    analysis: {
      intervalVariety: intervalVariety / 12,
      scalarContent,
      phraseStructure: detectPhrases(notes).length / (notes.length / 8),
      contourMatch: 0.7,
    },
  };

  const results = [inference];

  // Limit results based on options
  const maxResults = options.maxResults || 10;
  const minConfidence = options.minConfidence || 0.1;

  return results
    .filter(result => result.confidence >= minConfidence)
    .slice(0, maxResults);
}

/**
 * Detect scale relationships in melody
 */
export function detectScaleRelationships(
  melody: number[] | MelodyLine,
  options: MelodyFitOptions = {}
): ScaleAnalysis {
  const notes = Array.isArray(melody) ? melody : melody.notes;

  if (!Array.isArray(notes) || notes.length === 0) {
    return {
      primaryScale: 'unknown',
      confidence: 0,
      alternativeScales: [],
    };
  }

  // Get unique pitch classes
  const pitchClasses = [...new Set(notes.map(note => note % 12))].sort(
    (a, b) => a - b
  );

  const relationships: ScaleRelationship[] = [];

  // Major scale detection
  const majorScale = [0, 2, 4, 5, 7, 9, 11];
  const majorMatch =
    pitchClasses.filter(pc => majorScale.includes(pc)).length /
    pitchClasses.length;
  if (majorMatch > 0.6) {
    relationships.push({
      scale: 'major',
      confidence: majorMatch,
      notes: pitchClasses,
      characteristics: ['diatonic', 'tonal'],
    });
  }

  // Minor scale detection
  const minorScale = [0, 2, 3, 5, 7, 8, 10];
  const minorMatch =
    pitchClasses.filter(pc => minorScale.includes(pc)).length /
    pitchClasses.length;
  if (minorMatch > 0.6) {
    relationships.push({
      scale: 'minor',
      confidence: minorMatch,
      notes: pitchClasses,
      characteristics: ['diatonic', 'tonal', 'minor'],
    });
  }

  // Pentatonic detection
  const pentatonicScale = [0, 2, 4, 7, 9];
  const pentatonicMatch =
    pitchClasses.filter(pc => pentatonicScale.includes(pc)).length /
    pitchClasses.length;
  if (pentatonicMatch > 0.7) {
    relationships.push({
      scale: 'pentatonic',
      confidence: pentatonicMatch,
      notes: pitchClasses,
      characteristics: ['pentatonic', 'folk'],
    });
  }

  const sortedRelationships = relationships.sort(
    (a, b) => b.confidence - a.confidence
  );

  const result: ScaleAnalysis = {
    primaryScale: sortedRelationships[0]?.scale || 'unknown',
    confidence: sortedRelationships[0]?.confidence || 0,
    alternativeScales: sortedRelationships.slice(1),
  };

  // Add modal analysis if requested
  if (options.includeModalAnalysis) {
    const modalCharacter = calculateModalCharacter(pitchClasses);
    result.modalAnalysis = {
      modalCharacter,
      detectedModes: detectModes(pitchClasses),
    };
  }

  // Add chromatic analysis if requested
  if (options.includeChromatic) {
    const chromaticNotes = pitchClasses.filter(
      (pc, i, arr) => i > 0 && Math.abs(pc - arr[i - 1]) === 1
    );
    result.chromaticAnalysis = {
      chromaticDensity: chromaticNotes.length / pitchClasses.length,
      chromaticNotes,
    };
  }

  return result;
}

/**
 * Recognize interval patterns in melody
 */
export function recognizeIntervalPatterns(
  melody: number[] | MelodyLine,
  options: MelodyFitOptions = {}
): IntervalPatternAnalysis {
  const notes = Array.isArray(melody) ? melody : melody.notes;

  if (!Array.isArray(notes) || notes.length < 2) {
    return { patterns: [], techniques: [] };
  }

  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    intervals.push(notes[i] - notes[i - 1]);
  }

  const patterns: IntervalPattern[] = [];

  // Find repeated patterns
  for (
    let patternLength = 2;
    patternLength <= Math.min(6, intervals.length / 2);
    patternLength++
  ) {
    for (
      let start = 0;
      start <= intervals.length - patternLength * 2;
      start++
    ) {
      const pattern = intervals.slice(start, start + patternLength);
      let frequency = 1;

      // Count occurrences
      for (
        let i = start + patternLength;
        i <= intervals.length - patternLength;
        i++
      ) {
        const candidate = intervals.slice(i, i + patternLength);
        if (JSON.stringify(pattern) === JSON.stringify(candidate)) {
          frequency++;
        }
      }

      if (frequency > 1) {
        patterns.push({
          pattern,
          frequency,
          type: frequency > 2 ? 'sequence' : 'repetition',
          confidence: Math.min(
            0.9,
            frequency / (intervals.length / patternLength)
          ),
        });
      }
    }
  }

  // Add basic Schillinger technique detection
  const stepwiseMotion =
    intervals.filter(i => Math.abs(i) <= 2).length / intervals.length;
  if (stepwiseMotion > 0.7) {
    patterns.push({
      pattern: [1, -1, 1, -1],
      frequency: Math.floor((stepwiseMotion * intervals.length) / 4),
      type: 'schillinger',
      confidence: stepwiseMotion,
    });
  }

  const sortedPatterns = patterns
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, options.maxResults || 10);

  // Identify techniques based on patterns
  const techniques: string[] = [];

  if (sortedPatterns.some(p => p.type === 'sequence')) {
    techniques.push('sequential development');
  }
  if (sortedPatterns.some(p => p.type === 'repetition')) {
    techniques.push('motivic repetition');
  }
  if (sortedPatterns.some(p => p.type === 'schillinger')) {
    techniques.push('schillinger technique');
  }
  if (stepwiseMotion > 0.7) {
    techniques.push('stepwise motion');
  }

  return {
    patterns: sortedPatterns,
    techniques,
  };
}

/**
 * Analyze melodic complexity
 */
export function analyzeMelodicComplexity(
  melody: number[] | MelodyLine,
  options: MelodyFitOptions = {}
): MelodicComplexityAnalysis {
  const notes = Array.isArray(melody) ? melody : melody.notes;

  if (!Array.isArray(notes) || notes.length === 0) {
    return {
      overallComplexity: 0,
      complexity: 'simple',
      components: {
        intervalComplexity: 0,
        contourComplexity: 0,
        intervalVariety: 0,
        rangeSpan: 0,
        rhythmicComplexity: 0,
        harmonicImplications: 0,
      },
      structuralAnalysis: {
        phrases: 0,
        sequences: 0,
        motifs: 0,
        development: 0,
        climaxPoints: [],
      },
      recommendations: ['Provide a valid melody for analysis'],
    };
  }

  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    intervals.push(notes[i] - notes[i - 1]);
  }

  // Analyze factors
  const intervalVariety = new Set(intervals.map(Math.abs)).size / 12; // Normalize to 0-1
  const rangeSpan = (Math.max(...notes) - Math.min(...notes)) / 48; // Normalize to 0-1 (4 octaves)
  const rhythmicComplexity = 0.5; // Simplified - would need rhythm data
  const harmonicImplications = calculateScalarContent(intervals);

  // Structural analysis
  const phrases = detectPhrases(notes);
  const patternAnalysis = recognizeIntervalPatterns(notes, options);
  const climaxPoints = findClimaxPoints(notes);

  // Determine overall complexity
  const complexityScore =
    (intervalVariety +
      rangeSpan +
      rhythmicComplexity +
      (1 - harmonicImplications)) /
    4;
  const complexity: 'simple' | 'moderate' | 'complex' =
    complexityScore > 0.7
      ? 'complex'
      : complexityScore > 0.4
        ? 'moderate'
        : 'simple';

  // Generate recommendations
  const recommendations: string[] = [];
  if (intervalVariety < 0.3) {
    recommendations.push(
      'Consider adding more interval variety for melodic interest'
    );
  }
  if (rangeSpan < 0.2) {
    recommendations.push('Expand the melodic range for greater expression');
  }
  if (harmonicImplications < 0.5) {
    recommendations.push(
      'Consider using more scalar motion for smoother voice leading'
    );
  }
  if (phrases.length < 2) {
    recommendations.push(
      'Develop clearer phrase structure with contrasting sections'
    );
  }

  // Calculate additional complexity metrics
  const intervalComplexity = intervalVariety;
  const contourComplexity = rangeSpan;
  const motifs = patternAnalysis.patterns.filter(
    p => p.type === 'sequence' || p.type === 'repetition'
  ).length;
  const development = patternAnalysis.patterns.filter(
    p => p.type === 'sequence'
  ).length;

  return {
    overallComplexity: complexityScore,
    complexity,
    components: {
      intervalComplexity,
      contourComplexity,
      intervalVariety,
      rangeSpan,
      rhythmicComplexity,
      harmonicImplications,
    },
    structuralAnalysis: {
      phrases: phrases.length,
      sequences: patternAnalysis.patterns.filter(p => p.type === 'sequence')
        .length,
      motifs,
      development,
      climaxPoints,
    },
    recommendations,
  };
}

function detectGenerators(
  intervals: number[]
): { a: number; b: number } | undefined {
  if (intervals.length < 2) return undefined;

  // Look for repeating patterns that could indicate generators
  const absIntervals = intervals.map(Math.abs);
  const intervalCounts = new Map<number, number>();

  absIntervals.forEach(interval => {
    intervalCounts.set(interval, (intervalCounts.get(interval) || 0) + 1);
  });

  // Find the two most common intervals
  const sortedIntervals = Array.from(intervalCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  if (sortedIntervals.length >= 2) {
    const [a, b] = sortedIntervals.map(([interval]) => interval);
    return { a, b };
  }

  // Fallback: use first two unique intervals
  const uniqueIntervals = [...new Set(absIntervals)];
  if (uniqueIntervals.length >= 2) {
    return { a: uniqueIntervals[0], b: uniqueIntervals[1] };
  }

  return undefined;
}

function findClimaxPoints(notes: number[]): number[] {
  const climaxPoints: number[] = [];

  for (let i = 1; i < notes.length - 1; i++) {
    // Local maximum
    if (notes[i] > notes[i - 1] && notes[i] > notes[i + 1]) {
      climaxPoints.push(i);
    }
  }

  return climaxPoints;
}

function calculateModalCharacter(pitchClasses: number[]): number {
  // Simple modal character calculation based on interval patterns
  // Higher values indicate more modal character
  const intervals = [];
  for (let i = 1; i < pitchClasses.length; i++) {
    intervals.push(pitchClasses[i] - pitchClasses[i - 1]);
  }

  // Look for characteristic modal intervals (like b7, b3, etc.)
  const modalIntervals = intervals.filter(
    interval =>
      interval === 3 || interval === 10 || interval === 7 || interval === 5
  );

  return modalIntervals.length / intervals.length;
}

function detectModes(pitchClasses: number[]): string[] {
  const modes: string[] = [];

  // Simple mode detection based on characteristic intervals
  const hasMinorThird = pitchClasses.includes(3);
  const hasMinorSeventh = pitchClasses.includes(10);
  const hasMajorSixth = pitchClasses.includes(9);

  if (hasMinorThird && hasMinorSeventh && hasMajorSixth) {
    modes.push('dorian');
  }
  if (hasMinorThird && !pitchClasses.includes(6)) {
    modes.push('phrygian');
  }
  if (!hasMinorThird && hasMinorSeventh) {
    modes.push('mixolydian');
  }

  return modes;
}

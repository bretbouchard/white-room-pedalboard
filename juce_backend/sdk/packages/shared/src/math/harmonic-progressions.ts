/**
 * Harmonic progression generation using Schillinger principles
 */

import { ValidationError as _ValidationError } from '../errors';
import { validateGenerators, calculateLCM, GeneratorPair } from './generators';

export interface HarmonicProgression {
  chords: string[];
  functions: string[];
  tensions: number[];
  generators?: GeneratorPair;
  key: string;
  scale: string;
  metadata: {
    complexity: number;
    stability: number;
    movement: number;
    voiceLeading: VoiceLeadingAnalysis;
  };
}

export interface VoiceLeadingAnalysis {
  smoothness: number;
  contraryMotion: number;
  parallelMotion: number;
  stepwiseMotion: number;
}

export interface HarmonicGenerationOptions {
  key?: string;
  scale?: string;
  length?: number;
  complexity?: 'simple' | 'moderate' | 'complex';
  style?: 'classical' | 'jazz' | 'contemporary' | 'modal';
  allowExtensions?: boolean;
  allowAlterations?: boolean;
}

/**
 * Scale degree to chord mappings for different scales
 */
const SCALE_CHORD_MAPPINGS = {
  major: {
    1: ['I', 'Imaj7', 'Imaj9'],
    2: ['ii', 'ii7', 'ii9'],
    3: ['iii', 'iii7', 'iiim7'],
    4: ['IV', 'IVmaj7', 'IVmaj9'],
    5: ['V', 'V7', 'V9', 'V13'],
    6: ['vi', 'vi7', 'vim7'],
    7: ['vii°', 'vii°7', 'viiø7'],
  },
  minor: {
    1: ['i', 'im7', 'im9'],
    2: ['ii°', 'iiø7', 'ii°7'],
    3: ['III', 'IIImaj7', 'III+'],
    4: ['iv', 'iv7', 'iv9'],
    5: ['V', 'V7', 'v7'],
    6: ['VI', 'VImaj7', 'VI7'],
    7: ['VII', 'VII7', 'vii°7'],
  },
  dorian: {
    1: ['i', 'im7', 'im9'],
    2: ['ii', 'ii7', 'ii9'],
    3: ['III', 'IIImaj7', 'IIImaj9'],
    4: ['IV', 'IV7', 'IV9'],
    5: ['v', 'v7', 'vm7'],
    6: ['vi°', 'viø7', 'vi°7'],
    7: ['VII', 'VIImaj7', 'VII7'],
  },
  mixolydian: {
    1: ['I', 'I7', 'I9', 'I13'],
    2: ['ii', 'ii7', 'iiø7'],
    3: ['iii°', 'iii°7', 'iiiø7'],
    4: ['IV', 'IVmaj7', 'IV7'],
    5: ['v', 'vm7', 'v7'],
    6: ['vi', 'vi7', 'vim7'],
    7: ['VII', 'VIImaj7', 'VII7'],
  },
};

// Functional harmony progressions are available but not currently used in generation
// They can be accessed via generateFromTemplate function

/**
 * Generate harmonic progression using Schillinger generators
 */
export function generateHarmonicProgression(
  a: number,
  b: number,
  options: HarmonicGenerationOptions = {}
): HarmonicProgression {
  // Validate generators
  const validation = validateGenerators(a, b);
  if (!validation.valid) {
    throw new _ValidationError('generators', { a, b }, 'valid generator pair', {
      errors: validation.errors,
      warnings: validation.warnings,
    });
  }

  const {
    key = 'C',
    scale = 'major',
    length,
    complexity = 'moderate',
    style = 'contemporary',
    allowExtensions = true,
    allowAlterations = false,
  } = options;

  const progressionLength = length || calculateLCM(a, b);
  const scaleMapping =
    SCALE_CHORD_MAPPINGS[scale as keyof typeof SCALE_CHORD_MAPPINGS];

  if (!scaleMapping) {
    throw new _ValidationError('scale', scale, 'supported scale type', {
      supportedScales: Object.keys(SCALE_CHORD_MAPPINGS),
    });
  }

  // Generate chord progression based on generators
  const chords: string[] = [];
  const functions: string[] = [];
  const tensions: number[] = [];

  for (let i = 0; i < progressionLength; i++) {
    const degreeA = (i % a) + 1;
    const degreeB = (i % b) + 1;

    // Combine generator influences to determine chord degree
    let targetDegree = Math.round((degreeA + degreeB) / 2);
    if (targetDegree > 7) targetDegree = ((targetDegree - 1) % 7) + 1;

    // Get chord options for this degree
    const chordOptions = scaleMapping[
      targetDegree as keyof typeof scaleMapping
    ] || ['I'];

    // Select chord based on complexity and style
    let selectedChord = selectChordByComplexity(
      chordOptions,
      complexity,
      allowExtensions
    );

    // Apply alterations if allowed (use deterministic approach for consistency)
    if (allowAlterations && (i + degreeA + degreeB) % 10 < 3) {
      selectedChord = applyChordAlteration(selectedChord, style);
    }

    // Transpose to target key
    const transposedChord = transposeChord(selectedChord, key);

    chords.push(transposedChord);
    functions.push(getRomanNumeralFunction(selectedChord));
    tensions.push(calculateChordTension(selectedChord, i, progressionLength));
  }

  // Analyze voice leading
  const voiceLeading = analyzeVoiceLeading(chords);

  return {
    chords,
    functions,
    tensions,
    generators: { a, b },
    key,
    scale,
    metadata: {
      complexity: calculateHarmonicComplexity(chords, functions),
      stability: calculateHarmonicStability(functions, tensions),
      movement: calculateHarmonicMovement(functions),
      voiceLeading,
    },
  };
}

/**
 * Generate progression from functional template
 */
export function generateFromTemplate(
  template: string[],
  options: HarmonicGenerationOptions = {}
): HarmonicProgression {
  const {
    key = 'C',
    scale = 'major',
    complexity = 'moderate',
    allowExtensions = true,
  } = options;

  const chords = template.map(romanNumeral => {
    let chord = romanNumeral;

    // Add extensions based on complexity
    if (allowExtensions && complexity !== 'simple') {
      chord = addChordExtensions(chord, complexity);
    }

    return transposeChord(chord, key);
  });

  const functions = template.map(getRomanNumeralFunction);
  const tensions = chords.map((_, index) =>
    calculateChordTension(template[index], index, template.length)
  );

  return {
    chords,
    functions,
    tensions,
    key,
    scale,
    metadata: {
      complexity: calculateHarmonicComplexity(chords, functions),
      stability: calculateHarmonicStability(functions, tensions),
      movement: calculateHarmonicMovement(functions),
      voiceLeading: analyzeVoiceLeading(chords),
    },
  };
}

/**
 * Generate multiple progression variations
 */
export function generateProgressionVariations(
  baseProgression: HarmonicProgression,
  variationTypes: string[] = ['reharmonization', 'substitution', 'extension']
): HarmonicProgression[] {
  const variations: HarmonicProgression[] = [];

  variationTypes.forEach(type => {
    switch (type) {
      case 'reharmonization':
        variations.push(createReharmonization(baseProgression));
        break;
      case 'substitution':
        variations.push(createTritoneSubstitution(baseProgression));
        break;
      case 'extension':
        variations.push(createExtendedProgression(baseProgression));
        break;
      case 'modal':
        variations.push(createModalVariation(baseProgression));
        break;
    }
  });

  return variations;
}

// Helper functions

function selectChordByComplexity(
  options: string[],
  complexity: string,
  allowExtensions: boolean
): string {
  switch (complexity) {
    case 'simple':
      return options[0]; // Basic triad
    case 'complex':
      return allowExtensions
        ? options[options.length - 1]
        : options[Math.min(1, options.length - 1)];
    case 'moderate':
    default: {
      const index = Math.min(1, options.length - 1);
      return options[index];
    }
  }
}

function applyChordAlteration(chord: string, style: string): string {
  // Simplified alteration logic
  const alterations = {
    jazz: ['#11', 'b13', '#9', 'b9'],
    contemporary: ['add9', 'sus2', 'sus4', '6'],
    classical: ['6', 'add9'],
    modal: ['sus2', 'sus4', 'add11'],
  };

  const styleAlterations = alterations[style as keyof typeof alterations] || [];
  if (styleAlterations.length > 0) {
    // Use deterministic selection based on chord hash
    const chordHash = chord
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const alteration = styleAlterations[chordHash % styleAlterations.length];
    return chord + alteration;
  }

  return chord;
}

function transposeChord(romanNumeral: string, key: string): string {
  // Simplified transposition - in practice this would be more complex
  const keyMap: Record<string, string> = {
    C: '',
    D: '2',
    E: '4',
    F: '5',
    G: '7',
    A: '9',
    B: '11',
    Db: '1',
    Eb: '3',
    Gb: '6',
    Ab: '8',
    Bb: '10',
  };

  // This is a simplified implementation
  // In practice, you'd need full Roman numeral to chord symbol conversion
  return romanNumeral.replace(/[IVX]/g, match => {
    const degree = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'].indexOf(
      match.toUpperCase()
    );
    const chromaticSteps = [0, 2, 4, 5, 7, 9, 11];
    const keyOffset = keyMap[key] ? parseInt(keyMap[key]) : 0;
    const finalStep = (chromaticSteps[degree] + keyOffset) % 12;

    const noteNames = [
      'C',
      'Db',
      'D',
      'Eb',
      'E',
      'F',
      'Gb',
      'G',
      'Ab',
      'A',
      'Bb',
      'B',
    ];
    return noteNames[finalStep];
  });
}

function getRomanNumeralFunction(romanNumeral: string): string {
  const functionMap: Record<string, string> = {
    I: 'tonic',
    i: 'tonic',
    ii: 'subdominant',
    II: 'subdominant',
    iii: 'tonic',
    III: 'tonic',
    IV: 'subdominant',
    iv: 'subdominant',
    V: 'dominant',
    v: 'subdominant',
    vi: 'tonic',
    VI: 'tonic',
    vii: 'dominant',
    VII: 'subtonic',
  };

  const baseNumeral = romanNumeral.replace(/[^IVXivx]/g, '');
  return functionMap[baseNumeral] || 'unknown';
}

function calculateChordTension(
  chord: string,
  position: number,
  totalLength: number
): number {
  // Simplified tension calculation
  let tension = 0;

  // Position-based tension (higher at middle, lower at ends)
  const positionFactor = Math.sin((position / totalLength) * Math.PI);
  tension += positionFactor * 0.5;

  // Chord-based tension
  if (chord.includes('7')) tension += 0.3;
  if (chord.includes('9')) tension += 0.2;
  if (chord.includes('11')) tension += 0.2;
  if (chord.includes('13')) tension += 0.1;
  if (chord.includes('°')) tension += 0.4;
  if (chord.includes('ø')) tension += 0.3;
  if (chord.includes('#') || chord.includes('b')) tension += 0.2;

  return Math.min(tension, 1);
}

function analyzeVoiceLeading(_chords: string[]): VoiceLeadingAnalysis {
  // Simplified voice leading analysis
  // In practice, this would analyze actual voice movements
  // Use deterministic values based on chord progression characteristics
  const hash = _chords.reduce((acc, chord, i) => acc + chord.length + i, 0);
  const seed = (hash % 100) / 100;

  return {
    smoothness: 0.7 + seed * 0.3,
    contraryMotion: 0.3 + seed * 0.7 * 0.4,
    parallelMotion: 0.2 + seed * 0.5 * 0.3,
    stepwiseMotion: 0.6 + seed * 0.3 * 0.3,
  };
}

function calculateHarmonicComplexity(
  chords: string[],
  functions: string[]
): number {
  let complexity = 0;

  // Chord complexity
  const extensions = chords.filter(
    chord =>
      chord.includes('7') ||
      chord.includes('9') ||
      chord.includes('11') ||
      chord.includes('13')
  ).length;
  complexity += (extensions / chords.length) * 0.4;

  // Functional variety
  const uniqueFunctions = new Set(functions).size;
  complexity += (uniqueFunctions / 4) * 0.3; // Normalize to 4 main functions

  // Alteration complexity
  const alterations = chords.filter(
    chord => chord.includes('#') || chord.includes('b') || chord.includes('°')
  ).length;
  complexity += (alterations / chords.length) * 0.3;

  return Math.min(complexity, 1);
}

function calculateHarmonicStability(
  functions: string[],
  tensions: number[]
): number {
  const tonicCount = functions.filter(f => f === 'tonic').length;
  const avgTension = tensions.reduce((sum, t) => sum + t, 0) / tensions.length;

  const stabilityFromTonic = tonicCount / functions.length;
  const stabilityFromTension = 1 - avgTension;

  return (stabilityFromTonic + stabilityFromTension) / 2;
}

function calculateHarmonicMovement(functions: string[]): number {
  let movement = 0;

  for (let i = 1; i < functions.length; i++) {
    if (functions[i] !== functions[i - 1]) {
      movement++;
    }
  }

  return functions.length > 1 ? movement / (functions.length - 1) : 0;
}

function addChordExtensions(chord: string, complexity: string): string {
  if (complexity === 'simple') return chord;

  const extensions = complexity === 'complex' ? ['7', '9', '11'] : ['7'];
  // Use deterministic selection based on chord characteristics
  const chordHash = chord
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const extension = extensions[chordHash % extensions.length];

  return chord + extension;
}

function createReharmonization(
  baseProgression: HarmonicProgression
): HarmonicProgression {
  // Simplified reharmonization
  const newChords = baseProgression.chords.map((chord, index) => {
    // Use deterministic approach based on chord position
    if ((index + chord.length) % 10 < 3) {
      // Replace with related chord
      return chord + 'maj7'; // Simplified substitution
    }
    return chord;
  });

  return {
    ...baseProgression,
    chords: newChords,
    metadata: {
      ...baseProgression.metadata,
      complexity: baseProgression.metadata.complexity * 1.2,
    },
  };
}

function createTritoneSubstitution(
  baseProgression: HarmonicProgression
): HarmonicProgression {
  // Simplified tritone substitution
  const newChords = baseProgression.chords.map((chord, index) => {
    if (baseProgression.functions[index] === 'dominant' && index % 2 === 0) {
      return chord + 'b5'; // Simplified tritone sub
    }
    return chord;
  });

  return {
    ...baseProgression,
    chords: newChords,
    metadata: {
      ...baseProgression.metadata,
      complexity: baseProgression.metadata.complexity * 1.3,
    },
  };
}

function createExtendedProgression(
  baseProgression: HarmonicProgression
): HarmonicProgression {
  // Double the progression length with variations
  const extendedChords = [...baseProgression.chords, ...baseProgression.chords];
  const extendedFunctions = [
    ...baseProgression.functions,
    ...baseProgression.functions,
  ];
  const extendedTensions = [
    ...baseProgression.tensions,
    ...baseProgression.tensions,
  ];

  return {
    ...baseProgression,
    chords: extendedChords,
    functions: extendedFunctions,
    tensions: extendedTensions,
    metadata: {
      ...baseProgression.metadata,
      movement: baseProgression.metadata.movement * 0.8, // Less movement per unit
    },
  };
}

function createModalVariation(
  baseProgression: HarmonicProgression
): HarmonicProgression {
  // Convert to modal equivalent
  const modalChords = baseProgression.chords.map(chord => {
    // Simplified modal conversion
    return chord.replace('maj7', 'm7').replace('7', 'maj7');
  });

  return {
    ...baseProgression,
    chords: modalChords,
    scale: 'dorian',
    metadata: {
      ...baseProgression.metadata,
      stability: baseProgression.metadata.stability * 0.9,
    },
  };
}

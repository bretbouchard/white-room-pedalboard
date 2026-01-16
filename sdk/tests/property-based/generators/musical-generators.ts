/**
 * Property-Based Testing Generators for Musical Data
 *
 * This module provides comprehensive fast-check generators for Schillinger SDK testing:
 * - Musical notes and intervals
 * - Rhythmic patterns
 * - Harmonic structures
 * - Scale and chord generators
 * - Time signatures and meters
 * - Key signatures and modes
 * - Orchestral instruments
 * - Musical forms and structures
 */

import * as fc from "fast-check";
import type { Arbitrary } from "fast-check";

// Basic musical types
export interface Note {
  pitch: number; // 0-127 MIDI
  velocity: number; // 0-127
  duration: number; // In beats
  startTime: number; // In beats
}

export interface Interval {
  semitones: number;
  quality: "perfect" | "major" | "minor" | "augmented" | "diminished";
  direction: "up" | "down";
}

export interface RhythmPattern {
  durations: number[]; // In beats
  accents: boolean[];
  tempo: number; // BPM
  timeSignature: [number, number]; // [numerator, denominator]
}

export interface Scale {
  root: number; // MIDI note number (0-11 for C-B)
  type: string; // Scale type name
  intervals: number[]; // Semitone intervals
  notes: number[]; // MIDI note numbers
}

export interface Chord {
  root: number; // MIDI note number
  type: string; // Chord quality
  extensions: string[]; // Extensions like '7', '9', '11', '13'
  notes: number[]; // MIDI note numbers
  inversion: number; // 0 = root position, 1 = first inversion, etc.
}

export interface KeySignature {
  fifths: number; // Number of sharps (positive) or flats (negative)
  mode: string; // 'major', 'minor', etc.
  tonic: number; // MIDI note number (0-11)
}

export interface TimeSignature {
  numerator: number; // Beats per measure
  denominator: number; // Beat unit (4 = quarter note, 8 = eighth note)
}

export interface MusicalPhrase {
  notes: Note[];
  scale: Scale;
  key: KeySignature;
  timeSignature: TimeSignature;
  tempo: number;
}

export interface OrchestralInstrument {
  name: string;
  section: "strings" | "woodwinds" | "brass" | "percussion" | "keyboard";
  family: string; // e.g., 'violin', 'flute', 'trumpet', etc.
  range: [number, number]; // MIDI note range
  transposition: number; // Semitones transposition from concert pitch
  clef: "treble" | "bass" | "alto" | "tenor" | "percussion";
}

// Musical constants and constraints
const MIDI_NOTE_RANGE = { min: 0, max: 127 };
const VELOCITY_RANGE = { min: 0, max: 127 };
const TEMPO_RANGE = { min: 40, max: 240 };
const DURATION_RANGE = { min: 0.01, max: 16 }; // Up to 16 beats
const BEAT_POSITION_RANGE = { min: 0, max: 1000 }; // Large range for phrase positioning

const SCALE_TYPES = [
  "major",
  "natural-minor",
  "harmonic-minor",
  "melodic-minor",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "locrian",
  "major-pentatonic",
  "minor-pentatonic",
  "blues",
  "chromatic",
  "whole-tone",
  "diminished",
  "augmented",
  "octatonic",
];

const CHORD_TYPES = [
  "major",
  "minor",
  "diminished",
  "augmented",
  "major-7",
  "minor-7",
  "dominant-7",
  "half-diminished-7",
  "diminished-7",
  "augmented-7",
  "major-6",
  "minor-6",
];

const INTERVAL_QUALITIES = [
  "perfect",
  "major",
  "minor",
  "augmented",
  "diminished",
] as const;
const INTERVAL_DIRECTIONS = ["up", "down"] as const;

const MODES = [
  "major",
  "minor",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "locrian",
  "harmonic-minor",
  "melodic-minor",
];

const ORCHESTRAL_SECTIONS = [
  "strings",
  "woodwinds",
  "brass",
  "percussion",
  "keyboard",
] as const;
const CLEFS = ["treble", "bass", "alto", "tenor", "percussion"] as const;

// Orchestral instrument data
const ORCHESTRAL_INSTRUMENTS: OrchestralInstrument[] = [
  // Strings
  {
    name: "violin",
    section: "strings",
    family: "violin",
    range: [55, 103],
    transposition: 0,
    clef: "treble",
  },
  {
    name: "viola",
    section: "strings",
    family: "viola",
    range: [48, 91],
    transposition: 0,
    clef: "alto",
  },
  {
    name: "cello",
    section: "strings",
    family: "cello",
    range: [36, 79],
    transposition: 0,
    clef: "bass",
  },
  {
    name: "double-bass",
    section: "strings",
    family: "double-bass",
    range: [28, 67],
    transposition: -12,
    clef: "bass",
  },

  // Woodwinds
  {
    name: "flute",
    section: "woodwinds",
    family: "flute",
    range: [60, 98],
    transposition: 0,
    clef: "treble",
  },
  {
    name: "oboe",
    section: "woodwinds",
    family: "oboe",
    range: [58, 88],
    transposition: 0,
    clef: "treble",
  },
  {
    name: "clarinet",
    section: "woodwinds",
    family: "clarinet",
    range: [50, 92],
    transposition: -2,
    clef: "treble",
  },
  {
    name: "bassoon",
    section: "woodwinds",
    family: "bassoon",
    range: [34, 75],
    transposition: 0,
    clef: "bass",
  },

  // Brass
  {
    name: "trumpet",
    section: "brass",
    family: "trumpet",
    range: [52, 84],
    transposition: -2,
    clef: "treble",
  },
  {
    name: "horn",
    section: "brass",
    family: "horn",
    range: [34, 77],
    transposition: -7,
    clef: "treble",
  },
  {
    name: "trombone",
    section: "brass",
    family: "trombone",
    range: [34, 72],
    transposition: 0,
    clef: "bass",
  },
  {
    name: "tuba",
    section: "brass",
    family: "tuba",
    range: [22, 58],
    transposition: 0,
    clef: "bass",
  },

  // Percussion
  {
    name: "timpani",
    section: "percussion",
    family: "timpani",
    range: [36, 55],
    transposition: 0,
    clef: "bass",
  },
  {
    name: "xylophone",
    section: "percussion",
    family: "xylophone",
    range: [60, 96],
    transposition: 0,
    clef: "treble",
  },

  // Keyboard
  {
    name: "piano",
    section: "keyboard",
    family: "piano",
    range: [21, 108],
    transposition: 0,
    clef: "treble",
  },
  {
    name: "harpsichord",
    section: "keyboard",
    family: "harpsichord",
    range: [36, 96],
    transposition: 0,
    clef: "treble",
  },
];

// Scale interval patterns
const SCALE_PATTERNS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
  "harmonic-minor": [0, 2, 3, 5, 7, 8, 11],
  "melodic-minor": [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  "major-pentatonic": [0, 2, 4, 7, 9],
  "minor-pentatonic": [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  "whole-tone": [0, 2, 4, 6, 8, 10],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
  augmented: [0, 3, 4, 7, 8, 11],
  octatonic: [0, 2, 3, 5, 6, 8, 9, 11],
};

// Chord interval patterns
const CHORD_PATTERNS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  "major-7": [0, 4, 7, 11],
  "minor-7": [0, 3, 7, 10],
  "dominant-7": [0, 4, 7, 10],
  "half-diminished-7": [0, 3, 6, 10],
  "diminished-7": [0, 3, 6, 9],
  "augmented-7": [0, 4, 8, 10],
  "major-6": [0, 4, 7, 9],
  "minor-6": [0, 3, 7, 9],
};

/**
 * Generator for single MIDI notes
 */
export const noteArbitrary: Arbitrary<Note> = fc.record({
  pitch: fc.integer(MIDI_NOTE_RANGE),
  velocity: fc.integer(VELOCITY_RANGE),
  duration: fc.float({
    min: Math.fround(DURATION_RANGE.min),
    max: Math.fround(DURATION_RANGE.max),
  }),
  startTime: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
});

/**
 * Generator for musical intervals
 */
export const intervalArbitrary: Arbitrary<Interval> = fc.record({
  semitones: fc.integer({ min: -24, max: 24 }),
  quality: fc.constantFrom(...INTERVAL_QUALITIES),
  direction: fc.constantFrom(...INTERVAL_DIRECTIONS),
});

/**
 * Generator for time signatures
 */
export const timeSignatureArbitrary: Arbitrary<TimeSignature> = fc
  .record({
    numerator: fc.integer({ min: 1, max: 16 }),
    denominator: fc.constantFrom(1, 2, 4, 8, 16, 32),
  })
  .filter((ts) => {
    // Filter out unrealistic time signatures
    const commonDenominators = [2, 4, 8];
    const commonNumerators = [2, 3, 4, 6, 9, 12];

    return (
      commonDenominators.includes(ts.denominator) ||
      commonNumerators.includes(ts.numerator) ||
      ts.numerator % ts.denominator === 0
    );
  });

/**
 * Generator for tempos
 */
export const tempoArbitrary = fc.integer(TEMPO_RANGE);

/**
 * Generator for durations
 */
export const durationArbitrary = fc
  .float({
    min: Math.fround(DURATION_RANGE.min),
    max: Math.fround(DURATION_RANGE.max),
  })
  .filter((d) => d > 0); // Ensure positive durations

/**
 * Generator for rhythmic patterns
 */
export const rhythmPatternArbitrary: Arbitrary<RhythmPattern> = fc
  .record({
    durations: fc.array(durationArbitrary, { minLength: 1, maxLength: 32 }),
    accents: fc.array(fc.boolean(), { minLength: 1, maxLength: 32 }),
    tempo: tempoArbitrary,
    timeSignature: timeSignatureArbitrary,
  })
  .filter((pattern) => pattern.durations.length === pattern.accents.length);

/**
 * Generator for scale types
 */
export const scaleTypeArbitrary = fc.constantFrom(...SCALE_TYPES);

/**
 * Generator for chord types
 */
export const chordTypeArbitrary = fc.constantFrom(...CHORD_TYPES);

/**
 * Generator for key signatures
 */
export const keySignatureArbitrary: Arbitrary<KeySignature> = fc.record({
  fifths: fc.integer({ min: -7, max: 7 }),
  mode: fc.constantFrom(...MODES),
  tonic: fc.integer({ min: 0, max: 11 }),
});

/**
 * Generator for scales with computed notes
 */
export const scaleArbitrary: Arbitrary<Scale> = fc
  .record({
    root: fc.integer({ min: 0, max: 11 }),
    type: scaleTypeArbitrary,
  })
  .map(({ root, type }) => {
    const intervals = SCALE_PATTERNS[type] || SCALE_PATTERNS["major"];
    const notes = intervals.map((interval) => (root + interval) % 12);

    return {
      root,
      type,
      intervals,
      notes,
    };
  });

/**
 * Generator for chords with computed notes
 */
export const chordArbitrary: Arbitrary<Chord> = fc
  .record({
    root: fc.integer({ min: 0, max: 11 }),
    type: chordTypeArbitrary,
    inversion: fc.integer({ min: 0, max: 3 }),
    extensions: fc.array(
      fc.constantFrom("7", "9", "11", "13", "b5", "#5", "b9", "#9"),
      { maxLength: 3 },
    ),
  })
  .map(({ root, type, inversion, extensions }) => {
    const basePattern = CHORD_PATTERNS[type] || CHORD_PATTERNS["major"];
    let notes = basePattern.map((interval) => (root + interval) % 12);

    // Apply inversion
    for (let i = 0; i < inversion && notes.length > 0; i++) {
      const bass = notes.shift()!;
      notes.push(bass + 12);
    }

    // Add some octave spread
    notes = notes.map((note, index) => note + index * 12);

    return {
      root,
      type,
      extensions,
      notes,
      inversion,
    };
  });

/**
 * Generator for orchestral instruments
 */
export const orchestralInstrumentArbitrary: Arbitrary<OrchestralInstrument> =
  fc.constantFrom(...ORCHESTRAL_INSTRUMENTS);

/**
 * Generator for musical phrases
 */
export const musicalPhraseArbitrary: Arbitrary<MusicalPhrase> = fc
  .record({
    notes: fc.array(noteArbitrary, { minLength: 4, maxLength: 64 }),
    scale: scaleArbitrary,
    key: keySignatureArbitrary,
    timeSignature: timeSignatureArbitrary,
    tempo: tempoArbitrary,
  })
  .filter((phrase) => {
    // Ensure notes fit within instrument ranges if specified
    return phrase.notes.every(
      (note) =>
        note.pitch >= MIDI_NOTE_RANGE.min && note.pitch <= MIDI_NOTE_RANGE.max,
    );
  });

/**
 * Generator for sequences of notes (melodies)
 */
export const melodyArbitrary = (
  length: { min?: number; max?: number } = { min: 4, max: 32 },
) => fc.array(noteArbitrary, { minLength: length.min, maxLength: length.max });

/**
 * Generator for chord progressions
 */
export const chordProgressionArbitrary = (
  length: { min?: number; max?: number } = { min: 2, max: 8 },
) => fc.array(chordArbitrary, { minLength: length.min, maxLength: length.max });

/**
 * Generator for rhythmic sequences
 */
export const rhythmSequenceArbitrary = (
  length: { min?: number; max?: number } = { min: 4, max: 16 },
) =>
  fc.array(durationArbitrary, { minLength: length.min, maxLength: length.max });

/**
 * Generator for contrapuntal textures (multiple independent melodies)
 */
export const contrapuntalTextureArbitrary = (voices: number = 2) =>
  fc.tuple(
    ...Array(voices)
      .fill(null)
      .map(() => melodyArbitrary({ min: 8, max: 32 })),
  );

/**
 * Generator for orchestral combinations
 */
export const orchestralCombinationArbitrary = (
  minInstruments: number = 3,
  maxInstruments: number = 12,
) =>
  fc
    .array(orchestralInstrumentArbitrary, {
      minLength: minInstruments,
      maxLength: maxInstruments,
    })
    .filter((instruments) => {
      // Ensure variety across sections
      const sections = new Set(instruments.map((i) => i.section));
      return sections.size >= 2; // At least 2 different sections
    });

/**
 * Generator for tempo markings with musical terms
 */
export const tempoMarkingArbitrary = fc.record({
  bpm: tempoArbitrary,
  term: fc.constantFrom(
    "grave",
    "largo",
    "adagio",
    "andante",
    "moderato",
    "allegretto",
    "allegro",
    "vivace",
    "presto",
    "prestissimo",
  ),
  description: fc.option(fc.lorem({ maxCount: 5 }), { nil: true }),
});

/**
 * Generator for dynamic markings
 */
export const dynamicArbitrary = fc.constantFrom(
  "ppp",
  "pp",
  "p",
  "mp",
  "mf",
  "f",
  "ff",
  "fff",
  "sfz",
  "fp",
);

/**
 * Generator for articulation markings
 */
export const articulationArbitrary = fc.constantFrom(
  "staccato",
  "legato",
  "accent",
  "tenuto",
  "fermata",
  "trill",
  "tremolo",
);

/**
 * Utility function to generate valid scale pattern
 */
export function generateScalePattern(root: number, type: string): Scale {
  const intervals = SCALE_PATTERNS[type] || SCALE_PATTERNS["major"];
  const notes = intervals.map((interval) => (root + interval) % 12);

  return { root, type, intervals, notes };
}

/**
 * Utility function to generate valid chord structure
 */
export function generateChordStructure(
  root: number,
  type: string,
  inversion: number = 0,
): Chord {
  const basePattern = CHORD_PATTERNS[type] || CHORD_PATTERNS["major"];
  let notes = basePattern.map((interval) => (root + interval) % 12);

  // Apply inversion
  for (let i = 0; i < inversion && notes.length > 0; i++) {
    const bass = notes.shift()!;
    notes.push(bass + 12);
  }

  // Add octave spread
  notes = notes.map((note, index) => note + index * 12);

  return {
    root,
    type,
    extensions: [],
    notes,
    inversion,
  };
}

/**
 * Export all generators for easy importing
 */
export const MusicalGenerators = {
  note: noteArbitrary,
  interval: intervalArbitrary,
  timeSignature: timeSignatureArbitrary,
  tempo: tempoArbitrary,
  duration: durationArbitrary,
  rhythmPattern: rhythmPatternArbitrary,
  scaleType: scaleTypeArbitrary,
  chordType: chordTypeArbitrary,
  keySignature: keySignatureArbitrary,
  scale: scaleArbitrary,
  chord: chordArbitrary,
  orchestralInstrument: orchestralInstrumentArbitrary,
  musicalPhrase: musicalPhraseArbitrary,
  melody: melodyArbitrary,
  chordProgression: chordProgressionArbitrary,
  rhythmSequence: rhythmSequenceArbitrary,
  contrapuntalTexture: contrapuntalTextureArbitrary,
  orchestralCombination: orchestralCombinationArbitrary,
  tempoMarking: tempoMarkingArbitrary,
  dynamic: dynamicArbitrary,
  articulation: articulationArbitrary,
};

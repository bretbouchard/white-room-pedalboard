/**
 * @fileoverview Simple Music Theory Content Generator
 * Provides basic musical content for flow nodes to demonstrate music theory integration
 */

import type { MusicalNote, Scale, Chord, Rhythm, Melody } from '@/types/schillinger';
import 'seedrandom';

//================================================================================================
// Basic Music Theory Data
//================================================================================================

// Musical note names with MIDI numbers
const NOTE_NAMES: { [key: string]: number } = {
  'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
  'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
  'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71
};

// Common scales
const SCALES: { [key: string]: number[] } = {
  'C Major': [0, 2, 4, 5, 7, 9, 11],
  'G Major': [0, 2, 4, 5, 7, 9, 11],
  'D Major': [0, 2, 4, 5, 7, 9, 11],
  'A Minor': [0, 2, 3, 5, 7, 8, 10],
  'C Minor': [0, 2, 3, 5, 7, 8, 10],
  'D Dorian': [0, 2, 3, 5, 7, 9, 10],
  'E Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'F Lydian': [0, 2, 4, 6, 7, 9, 11],
  'G Mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'A Locrian': [0, 1, 3, 5, 6, 8, 10]
};

// Common chord types
const CHORD_TYPES: { [key: string]: number[] } = {
  'Major': [0, 4, 7],
  'Minor': [0, 3, 7],
  'Diminished': [0, 3, 6],
  'Augmented': [0, 4, 8],
  'Major 7th': [0, 4, 7, 11],
  'Minor 7th': [0, 3, 7, 10],
  'Dominant 7th': [0, 4, 7, 10],
  'Minor Major 7th': [0, 3, 7, 11],
  'Suspended 2nd': [0, 2, 7],
  'Suspended 4th': [0, 5, 7]
};

// Common rhythmic patterns
const RHYTHMIC_PATTERNS: { [key: string]: number[] } = {
  'Basic Quarter': [1, 0, 0, 0],
  'Basic Eighth': [1, 1, 1, 1, 1, 1, 1, 1],
  'Rock Beat': [1, 0, 1, 0, 1, 0, 1, 0],
  'Jazz Swing': [1, 0, 1, 0, 0, 1, 0, 1],
  'Funk': [1, 0, 0, 1, 0, 1, 0, 0],
  'Blues Shuffle': [1, 0, 0, 1, 0, 0, 1, 0],
  'Latin Clave': [1, 0, 0, 1, 0, 0, 0, 1],
  'Syncopated': [1, 0, 1, 1, 0, 1, 0, 1]
};

//================================================================================================
// Utility Functions
//================================================================================================

function noteToMidi(noteName: string, octave: number = 4): number {
  const baseNote = noteName.replace(/\d+/, '');
  const noteOctave = parseInt(noteName.match(/\d+/)?.[0] || '4');
  const midiNote = NOTE_NAMES[baseNote];
  if (midiNote === undefined) return 60; // Default to middle C
  return midiNote + (noteOctave - 4) * 12;
}

function midiToNote(midiNote: number): { name: string, octave: number } {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return { name: `${noteName}${octave}`, octave };
}

function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

//================================================================================================
// Music Content Generator Class
//================================================================================================

export class SimpleMusicGenerator {
  private static instance: SimpleMusicGenerator;

  static getInstance(): SimpleMusicGenerator {
    if (!SimpleMusicGenerator.instance) {
      SimpleMusicGenerator.instance = new SimpleMusicGenerator();
    }
    return SimpleMusicGenerator.instance;
  }

  // Generate a scale
  generateScale(rootNote: string, scaleType: string): Scale {
    const rootMidi = noteToMidi(rootNote);
    const intervals = SCALES[scaleType] || SCALES['C Major'];

    const notes: MusicalNote[] = intervals.map(interval => {
      const midiNote = rootMidi + interval;
      const { name, octave } = midiToNote(midiNote);
      return {
        midi: midiNote,
        octave,
        frequency: midiToFrequency(midiNote),
        duration: 0.5, // Default duration
        velocity: 80,  // Default velocity
        name
      };
    });

    return {
      root: notes[0],
      type: scaleType,
      intervals,
      notes,
      name: `${rootNote} ${scaleType}`
    };
  }

  // Generate a chord
  generateChord(rootNote: string, chordType: string, duration: number = 1.0): Chord {
    const rootMidi = noteToMidi(rootNote);
    const intervals = CHORD_TYPES[chordType] || CHORD_TYPES['Major'];

    const notes: MusicalNote[] = intervals.map(interval => {
      const midiNote = rootMidi + interval;
      const { name, octave } = midiToNote(midiNote);
      return {
        midi: midiNote,
        octave,
        frequency: midiToFrequency(midiNote),
        duration,
        velocity: 90,
        name
      };
    });

    return {
      root: notes[0],
      type: chordType,
      intervals,
      notes,
      duration,
      name: `${rootNote} ${chordType}`
    };
  }

  // Generate a rhythm pattern
  generateRhythm(patternName: string, tempo: number = 120): Rhythm {
    const pattern = RHYTHMIC_PATTERNS[patternName] || RHYTHMIC_PATTERNS['Basic Quarter'];
    const subdivision = pattern.length;
    const duration = (60 / tempo) * 4; // Duration in seconds for a whole measure

    return {
      pattern,
      timeSignature: [4, 4],
      subdivision,
      duration,
      tempo
    };
  }

  // Generate a simple melody
  generateMelody(scale: Scale, length: number = 8): Melody {
    const notes: MusicalNote[] = [];
    const contour: number[] = [];
    const intervals: number[] = [];

    let previousNote = scale.notes[Math.floor(Math.random() * scale.notes.length)];

    for (let i = 0; i < length; i++) {
      // Choose a note from the scale with some movement
      const step = Math.floor(Math.random() * 5) - 2; // -2 to +2 steps
      const currentIndex = scale.notes.findIndex(note => note.midi === previousNote.midi);
      let newIndex = currentIndex + step;

      // Keep within scale bounds
      newIndex = Math.max(0, Math.min(scale.notes.length - 1, newIndex));
      const currentNote = scale.notes[newIndex];

      // Create note with random duration
      const note: MusicalNote = {
        ...currentNote,
        duration: Math.random() > 0.7 ? 1.0 : 0.5, // Mix of quarter and eighth notes
        velocity: 70 + Math.floor(Math.random() * 30) // Velocity 70-100
      };

      notes.push(note);

      // Calculate contour and intervals
      if (i > 0) {
        contour.push(currentNote.midi - previousNote.midi);
        intervals.push(currentNote.midi - previousNote.midi);
      }

      previousNote = currentNote;
    }

    return {
      notes,
      contour,
      intervals,
      scale,
      rhythm: this.generateRhythm('Basic Quarter')
    };
  }

  // Generate chord progression
  generateChordProgression(key: string, progressionType: string = 'basic'): Chord[] {
    const progressions: { [key: string]: string[] } = {
      'basic': ['Major', 'Minor', 'Minor', 'Major'],
      'pop': ['Major', 'Minor', 'Minor', 'Major'],
      'jazz': ['Major 7th', 'Minor 7th', 'Minor 7th', 'Major 7th'],
      'blues': ['Dominant 7th', 'Dominant 7th', 'Dominant 7th', 'Dominant 7th']
    };

    const chordTypes = progressions[progressionType] || progressions['basic'];
    const rootNotes = this.getRootNotesForProgression(key);

    return chordTypes.map((chordType, index) =>
      this.generateChord(rootNotes[index], chordType, 1.0)
    );
  }

  private getRootNotesForProgression(key: string): string[] {
    const rootNotes: { [key: string]: string[] } = {
      'C': ['C', 'D', 'E', 'F'],
      'G': ['G', 'A', 'B', 'C'],
      'D': ['D', 'E', 'F#', 'G'],
      'A': ['A', 'B', 'C#', 'D'],
      'F': ['F', 'G', 'A', 'Bb']
    };

    return rootNotes[key] || rootNotes['C'];
  }
}

//================================================================================================
// Convenience Functions
//================================================================================================

export function createMusicalContent(nodeType: string, seed?: string) {
  const generator = SimpleMusicGenerator.getInstance();

  // Use seed for reproducible results
  if (seed) {
    // Create a proper prng object that matches the seedrandom interface
    const createSeededRNG = function(seed: string) {
      let x = 0;
      for (let i = 0; i < seed.length; i++) {
        x = ((x << 5) - x) + seed.charCodeAt(i);
        x |= 0; // Convert to 32-bit integer
      }

      const randomFn = function() {
        x = (x + 0x6D2B79F5) | 0;
        let t = Math.imul(x ^ x >>> 15, 1 | x);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };

      // Return a proper prng object that matches the seedrandom interface
      const prng = function() {
        return randomFn();
      } as any;

      prng.quick = randomFn;
      prng.int32 = function() { return Math.floor(randomFn() * 2147483648); };
      prng.double = function() { return randomFn(); };
      prng.state = function() { return {}; };

      return prng;
    };

    (Math as any).seedrandom = createSeededRNG;
    Math.random = ((Math as any).seedrandom)(seed);
  }

  switch (nodeType) {
    case 'scale':
    case 'theory_concept':
      return generator.generateScale('C', 'C Major');

    case 'chord':
      return generator.generateChord('C', 'Major 7th');

    case 'motif':
    case 'progression':
      return generator.generateMelody(generator.generateScale('C', 'C Major'), 8);

    case 'track':
      return {
        chords: generator.generateChordProgression('C', 'basic'),
        melody: generator.generateMelody(generator.generateScale('C', 'C Major'), 16),
        rhythm: generator.generateRhythm('Rock Beat')
      };

    case 'song':
      return {
        form: ['Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus'],
        key: 'C Major',
        tempo: 120,
        sections: {
          'Verse': {
            chords: generator.generateChordProgression('C', 'basic'),
            melody: generator.generateMelody(generator.generateScale('C', 'C Major'), 16)
          },
          'Chorus': {
            chords: generator.generateChordProgression('C', 'pop'),
            melody: generator.generateMelody(generator.generateScale('C', 'C Major'), 16)
          },
          'Bridge': {
            chords: generator.generateChordProgression('A', 'basic'),
            melody: generator.generateMelody(generator.generateScale('A', 'A Minor'), 12)
          }
        }
      };

    default:
      return {
        notes: [generator.generateScale('C', 'C Major').notes[0]],
        description: `Musical content for ${nodeType}`
      };
  }
}

export default SimpleMusicGenerator;
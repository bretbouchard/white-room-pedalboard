/**
 * Quick API for Common Music Theory Operations
 * Simplified interface for common operations across all languages
 */

import { TheoryEngine, getTheoryEngine } from "./theory-engine";
import {
  AnalysisResult,
  ValidationResult,
  Chord,
  Scale,
  Key,
  ChordProgression,
  TheoryEngineResult,
  createResult,
  TheoryEngineError,
} from "./types";

/**
 * Quick chord analysis
 */
export async function quickAnalyzeChords(
  chords: string[],
  key?: string,
): Promise<
  TheoryEngineResult<{
    progression: ChordProgression;
    romanNumerals: string[];
    functions: string[];
    suggestions: string[];
  }>
> {
  try {
    const engine = getTheoryEngine();

    const progressionResult = await engine.analyzeProgression(chords, key);
    const keyResult = key ? null : await engine.detectKey(chords);
    const detectedKey =
      key ||
      keyResult?.data?.tonic?.name +
        " " +
        (keyResult?.data?.scale?.characteristics?.quality || "major");

    const functionsResult = await engine.analyzeHarmonicFunction(
      chords,
      detectedKey,
    );
    const suggestionsResult = await engine.suggestImprovements(
      chords,
      detectedKey,
    );

    const data = {
      progression: progressionResult.data,
      romanNumerals: progressionResult.data.romanNumerals,
      functions: functionsResult.data,
      suggestions: suggestionsResult.data.map((s) => s.description),
    };

    return createResult(true, data, undefined, {
      processingTime: Date.now(),
      cacheHit: false,
      analysisDepth: "basic",
      confidence: progressionResult.confidence,
    });
  } catch (error) {
    return createResult<{
      progression: ChordProgression;
      romanNumerals: string[];
      functions: string[];
      suggestions: string[];
    }>(false, undefined, {
      code: TheoryEngineError.ANALYSIS_FAILED,
      message: `Quick chord analysis failed: ${error}`,
      details: { chords, key },
    });
  }
}

/**
 * Quick key detection
 */
export async function quickDetectKey(musicalData: string[] | number[]): Promise<
  TheoryEngineResult<{
    key: string;
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
    scale: string;
  }>
> {
  try {
    const engine = getTheoryEngine();
    const result = await engine.detectKey(musicalData);

    const data = {
      key: `${result.data.tonic.name} ${result.data.scale.characteristics.quality}`,
      confidence: result.confidence,
      alternatives: [], // Would be populated from alternatives in full result
      scale: result.data.scale.name,
    };

    return createResult(true, data, undefined, {
      processingTime: Date.now(),
      cacheHit: false,
      analysisDepth: "basic",
      confidence: result.confidence,
    });
  } catch (error) {
    return createResult<{
      key: string;
      confidence: number;
      alternatives: Array<{ key: string; confidence: number }>;
      scale: string;
    }>(false, undefined, {
      code: TheoryEngineError.ANALYSIS_FAILED,
      message: `Quick key detection failed: ${error}`,
      details: { musicalData },
    });
  }
}

/**
 * Quick progression validation
 */
export async function quickValidateProgression(
  chords: string[],
  options: {
    key?: string;
    style?: string;
    strictness?: "lenient" | "moderate" | "strict";
  } = {},
): Promise<
  TheoryEngineResult<{
    isValid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
    improvements: string[];
  }>
> {
  try {
    const engine = getTheoryEngine();
    const result = await engine.validateProgression(chords, {
      key: options.key,
      style: options.style || "classical",
      strictness: options.strictness || "moderate",
    });

    const data = {
      isValid: result.isValid,
      score: result.score,
      issues: result.violations.map((v) => v.description),
      suggestions: result.suggestions.map((s) => s.description),
      improvements: [], // Would be populated from improvements in full result
    };

    return createResult(true, data, undefined, {
      processingTime: Date.now(),
      cacheHit: false,
      analysisDepth: "basic",
      confidence: result.score / 100,
    });
  } catch (error) {
    return createResult<{
      isValid: boolean;
      score: number;
      issues: string[];
      suggestions: string[];
      improvements: string[];
    }>(false, undefined, {
      code: TheoryEngineError.VALIDATION_FAILED,
      message: `Quick progression validation failed: ${error}`,
      details: { chords, options },
    });
  }
}

/**
 * Quick scale lookup
 */
export async function quickGetScale(
  scaleName: string,
  tonic: string = "C",
): Promise<
  TheoryEngineResult<{
    name: string;
    notes: string[];
    intervals: number[];
    modes: string[];
    characteristics: string[];
  }>
> {
  try {
    const engine = getTheoryEngine();
    const result = await engine.getScale(scaleName, tonic);

    const data = {
      name: result.data.name,
      notes: result.data.degrees.map((d) => d.note.name),
      intervals: result.data.intervals,
      modes: result.data.modes.map((m) => m.name),
      characteristics: result.data.characteristics.genres,
    };

    return createResult(true, data, undefined, {
      processingTime: Date.now(),
      cacheHit: false,
      analysisDepth: "basic",
      confidence: 1.0,
    });
  } catch (error) {
    return createResult<{
      name: string;
      notes: string[];
      intervals: number[];
      modes: string[];
      characteristics: string[];
    }>(false, undefined, {
      code: TheoryEngineError.ANALYSIS_FAILED,
      message: `Quick scale lookup failed: ${error}`,
      details: { scaleName, tonic },
    });
  }
}

/**
 * Quick chord analysis
 */
export async function quickAnalyzeChord(chordSymbol: string): Promise<
  TheoryEngineResult<{
    name: string;
    root: string;
    quality: string;
    intervals: number[];
    notes: string[];
    function: string;
    substitutions: string[];
  }>
> {
  try {
    const engine = getTheoryEngine();
    const result = await engine.analyzeChord(chordSymbol);
    const substitutionsResult = await engine.getChordSubstitutions(chordSymbol);

    const data = {
      name: result.data.symbol,
      root: result.data.root.name,
      quality: result.data.quality.base,
      intervals: result.data.intervals,
      notes: result.data.tones.map((n) => n.name),
      function: result.data.function.primary,
      substitutions: substitutionsResult.data.map((c) => c.symbol),
    };

    return createResult(true, data, undefined, {
      processingTime: Date.now(),
      cacheHit: false,
      analysisDepth: "basic",
      confidence: result.confidence,
    });
  } catch (error) {
    return createResult<{
      name: string;
      root: string;
      quality: string;
      intervals: number[];
      notes: string[];
      function: string;
      substitutions: string[];
    }>(false, undefined, {
      code: TheoryEngineError.ANALYSIS_FAILED,
      message: `Quick chord analysis failed: ${error}`,
      details: { chordSymbol },
    });
  }
}

/**
 * Quick next chord suggestions
 */
export async function quickSuggestNextChords(
  currentChords: string[],
  key: string,
  count: number = 4,
): Promise<
  TheoryEngineResult<{
    suggestions: Array<{
      chord: string;
      function: string;
      probability: number;
      reasoning: string;
    }>;
  }>
> {
  try {
    const engine = getTheoryEngine();
    const result = await engine.suggestNextChords(currentChords, key, {
      count,
    });

    const data = {
      suggestions: result.data.map((suggestion) => ({
        chord: suggestion.implementation?.chord || "Unknown",
        function: suggestion.type,
        probability: suggestion.expectedImprovement / 100,
        reasoning: suggestion.reasoning,
      })),
    };

    return createResult(true, data, undefined, {
      processingTime: Date.now(),
      cacheHit: false,
      analysisDepth: "basic",
      confidence: result.confidence,
    });
  } catch (error) {
    return createResult<{
      suggestions: Array<{
        chord: string;
        function: string;
        probability: number;
        reasoning: string;
      }>;
    }>(false, undefined, {
      code: TheoryEngineError.ANALYSIS_FAILED,
      message: `Quick chord suggestions failed: ${error}`,
      details: { currentChords, key, count },
    });
  }
}

/**
 * Quick note conversion utilities
 */
export const quickNoteUtils = {
  /**
   * Convert note name to MIDI number
   */
  noteToMidi(noteName: string): number {
    const noteMap: Record<string, number> = {
      C: 0,
      "C#": 1,
      Db: 1,
      D: 2,
      "D#": 3,
      Eb: 3,
      E: 4,
      F: 5,
      "F#": 6,
      Gb: 6,
      G: 7,
      "G#": 8,
      Ab: 8,
      A: 9,
      "A#": 10,
      Bb: 10,
      B: 11,
    };

    const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) return 60; // Default to C4

    const [, note, octave] = match;
    return (parseInt(octave) + 1) * 12 + noteMap[note];
  },

  /**
   * Convert MIDI number to note name
   */
  midiToNote(midi: number): string {
    const notes = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const octave = Math.floor(midi / 12) - 1;
    const note = notes[midi % 12];
    return `${note}${octave}`;
  },

  /**
   * Calculate interval between two notes
   */
  intervalBetween(note1: string, note2: string): number {
    const midi1 = this.noteToMidi(note1);
    const midi2 = this.noteToMidi(note2);
    return Math.abs(midi2 - midi1) % 12;
  },

  /**
   * Transpose note by semitones
   */
  transposeNote(noteName: string, semitones: number): string {
    const midi = this.noteToMidi(noteName);
    const newMidi = midi + semitones;
    return this.midiToNote(newMidi);
  },

  /**
   * Get enharmonic equivalent
   */
  getEnharmonic(noteName: string): string {
    const enharmonics: Record<string, string> = {
      "C#": "Db",
      Db: "C#",
      "D#": "Eb",
      Eb: "D#",
      "F#": "Gb",
      Gb: "F#",
      "G#": "Ab",
      Ab: "G#",
      "A#": "Bb",
      Bb: "A#",
    };

    const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) return noteName;

    const [, note, octave] = match;
    const enharmonic = enharmonics[note];
    return enharmonic ? `${enharmonic}${octave}` : noteName;
  },
};

/**
 * Quick interval utilities
 */
export const quickIntervalUtils = {
  /**
   * Get interval name from semitones
   */
  getIntervalName(semitones: number): string {
    const intervals = [
      "unison",
      "minor_second",
      "major_second",
      "minor_third",
      "major_third",
      "perfect_fourth",
      "tritone",
      "perfect_fifth",
      "minor_sixth",
      "major_sixth",
      "minor_seventh",
      "major_seventh",
    ];
    return intervals[semitones % 12] || "unison";
  },

  /**
   * Get semitones from interval name
   */
  getSemitones(intervalName: string): number {
    const intervalMap: Record<string, number> = {
      unison: 0,
      P1: 0,
      minor_second: 1,
      m2: 1,
      major_second: 2,
      M2: 2,
      minor_third: 3,
      m3: 3,
      major_third: 4,
      M3: 4,
      perfect_fourth: 5,
      P4: 5,
      tritone: 6,
      TT: 6,
      perfect_fifth: 7,
      P5: 7,
      minor_sixth: 8,
      m6: 8,
      major_sixth: 9,
      M6: 9,
      minor_seventh: 10,
      m7: 10,
      major_seventh: 11,
      M7: 11,
      octave: 12,
      P8: 12,
    };

    return intervalMap[intervalName] ?? 0;
  },

  /**
   * Invert interval
   */
  invertInterval(semitones: number): number {
    return 12 - (semitones % 12);
  },

  /**
   * Get interval quality
   */
  getIntervalQuality(semitones: number): string {
    const qualities = [
      "perfect",
      "minor",
      "major",
      "minor",
      "major",
      "perfect",
      "augmented",
      "perfect",
      "minor",
      "major",
      "minor",
      "major",
    ];
    return qualities[semitones % 12] || "perfect";
  },
};

/**
 * Quick chord utilities
 */
export const quickChordUtils = {
  /**
   * Parse chord symbol into components
   */
  parseChordSymbol(chordSymbol: string): {
    root: string;
    quality: string;
    extensions: string[];
    bass?: string;
  } {
    // Simplified chord parsing
    const match = chordSymbol.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return { root: "C", quality: "major", extensions: [] };

    const [, root, rest] = match;
    let quality = "major";
    const extensions: string[] = [];

    if (rest.includes("m")) quality = "minor";
    if (rest.includes("7")) extensions.push("7");
    if (rest.includes("9")) extensions.push("9");
    if (rest.includes("11")) extensions.push("11");
    if (rest.includes("13")) extensions.push("13");

    return { root, quality, extensions };
  },

  /**
   * Build chord from intervals
   */
  buildChord(root: string, intervals: number[]): string[] {
    return intervals.map((interval) =>
      quickNoteUtils.transposeNote(root + "4", interval),
    );
  },

  /**
   * Get chord tones
   */
  getChordTones(chordSymbol: string): string[] {
    const parsed = this.parseChordSymbol(chordSymbol);
    const intervals = [0, 4, 7]; // Basic major triad

    if (parsed.quality === "minor") {
      intervals[1] = 3; // Minor third
    }

    if (parsed.extensions.includes("7")) {
      intervals.push(parsed.quality === "major" ? 11 : 10);
    }

    return this.buildChord(parsed.root, intervals);
  },

  /**
   * Check if chord contains note
   */
  containsNote(chordSymbol: string, noteName: string): boolean {
    const chordTones = this.getChordTones(chordSymbol);
    const noteWithoutOctave = noteName.replace(/\d+$/, "");
    return chordTones.some(
      (tone) => tone.replace(/\d+$/, "") === noteWithoutOctave,
    );
  },
};

/**
 * Quick scale utilities
 */
export const quickScaleUtils = {
  /**
   * Get scale notes
   */
  getScaleNotes(scaleName: string, tonic: string): string[] {
    const scaleIntervals: Record<string, number[]> = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
      pentatonic_major: [0, 2, 4, 7, 9],
      pentatonic_minor: [0, 3, 5, 7, 10],
      blues: [0, 3, 5, 6, 7, 10],
    };

    const intervals = scaleIntervals[scaleName] || scaleIntervals["major"];
    return intervals.map((interval) =>
      quickNoteUtils.transposeNote(tonic + "4", interval),
    );
  },

  /**
   * Check if note is in scale
   */
  isNoteInScale(noteName: string, scaleName: string, tonic: string): boolean {
    const scaleNotes = this.getScaleNotes(scaleName, tonic);
    const noteWithoutOctave = noteName.replace(/\d+$/, "");
    return scaleNotes.some(
      (note) => note.replace(/\d+$/, "") === noteWithoutOctave,
    );
  },

  /**
   * Get scale degree
   */
  getScaleDegree(noteName: string, scaleName: string, tonic: string): number {
    const scaleNotes = this.getScaleNotes(scaleName, tonic);
    const noteWithoutOctave = noteName.replace(/\d+$/, "");
    const index = scaleNotes.findIndex(
      (note) => note.replace(/\d+$/, "") === noteWithoutOctave,
    );
    return index >= 0 ? index + 1 : 0;
  },

  /**
   * Get relative major/minor
   */
  getRelativeScale(
    scaleName: string,
    tonic: string,
  ): { scale: string; tonic: string } {
    if (scaleName === "major") {
      const relativeTonic = quickNoteUtils
        .transposeNote(tonic + "4", 9)
        .replace(/\d+$/, "");
      return { scale: "minor", tonic: relativeTonic };
    } else if (scaleName === "minor") {
      const relativeTonic = quickNoteUtils
        .transposeNote(tonic + "4", 3)
        .replace(/\d+$/, "");
      return { scale: "major", tonic: relativeTonic };
    }
    return { scale: scaleName, tonic };
  },
};

/**
 * Export all quick utilities
 */
export const quickUtils = {
  note: quickNoteUtils,
  interval: quickIntervalUtils,
  chord: quickChordUtils,
  scale: quickScaleUtils,
};

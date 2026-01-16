/**
 * Pattern recognition utilities for musical analysis
 */

import { ValidationUtils, MathUtils } from "./types";

export interface PatternMatch {
  pattern: RhythmicPattern | HarmonicPattern | MelodicPattern;
  confidence: number;
  position: number;
  length: number;
  type: "exact" | "approximate" | "transformed";
  transformation?: string;
}

export interface RhythmicPattern {
  id: string;
  name: string;
  sequence: number[];
  generators?: [number, number];
  complexity: number;
  style?: string;
  metadata?: Record<string, any>;
}

export interface HarmonicPattern {
  id: string;
  name: string;
  chords: string[];
  functions: string[];
  key?: string;
  complexity: number;
  style?: string;
  metadata?: Record<string, any>;
}

export interface MelodicPattern {
  id: string;
  name: string;
  intervals: number[];
  contour: string;
  complexity: number;
  style?: string;
  metadata?: Record<string, any>;
}

export interface PatternLibrary {
  rhythmic: RhythmicPattern[];
  harmonic: HarmonicPattern[];
  melodic: MelodicPattern[];
}

export interface PatternSearchOptions {
  minConfidence?: number;
  maxResults?: number;
  allowTransformations?: boolean;
  style?: string;
  complexityRange?: [number, number];
}

/**
 * Advanced pattern recognition engine for identifying musical patterns
 */
export class PatternRecognizer {
  private library: PatternLibrary = {
    rhythmic: [],
    harmonic: [],
    melodic: [],
  };

  constructor() {
    this.initializeDefaultPatterns();
  }

  /**
   * Find rhythmic patterns in a sequence with advanced matching
   */
  findRhythmicPatterns(
    sequence: number[],
    options: PatternSearchOptions = {},
  ): PatternMatch[] {
    if (!ValidationUtils.isValidDurations(sequence)) {
      throw new Error("Invalid rhythm sequence");
    }

    // Deterministically normalize input sequence
    const normalizedSequence = MathUtils.normalizeSequence(sequence, {
      precision: 6,
      sort: false,
      dedupe: false,
    });

    const {
      minConfidence = 0.7,
      maxResults = 10,
      allowTransformations = true,
      complexityRange,
    } = options;

    const matches: PatternMatch[] = [];

    // Search for exact matches
    for (const pattern of this.library.rhythmic) {
      if (
        complexityRange &&
        (pattern.complexity < complexityRange[0] ||
          pattern.complexity > complexityRange[1])
      ) {
        continue;
      }

      // Normalize pattern sequence for comparison
      const normalizedPatternSeq = MathUtils.normalizeSequence(
        pattern.sequence,
        { precision: 6, sort: false, dedupe: false },
      );

      const exactMatches = this.findExactRhythmicMatches(normalizedSequence, {
        ...pattern,
        sequence: normalizedPatternSeq,
      });
      matches.push(...exactMatches);

      // Search for transformed matches if allowed
      if (allowTransformations) {
        const transformedMatches = this.findTransformedRhythmicMatches(
          normalizedSequence,
          { ...pattern, sequence: normalizedPatternSeq },
        );
        matches.push(...transformedMatches);
      }
    }

    // Filter by confidence and limit results
    return matches
      .filter((match) => match.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxResults);
  }

  /**
   * Find harmonic patterns in a chord progression
   */
  findHarmonicPatterns(
    chords: string[],
    options: PatternSearchOptions = {},
  ): PatternMatch[] {
    if (!ValidationUtils.isValidChordProgression(chords)) {
      throw new Error("Invalid chord progression");
    }

    const {
      minConfidence = 0.7,
      maxResults = 10,
      allowTransformations = true,
      complexityRange,
    } = options;

    const matches: PatternMatch[] = [];

    // Search for exact matches
    for (const pattern of this.library.harmonic) {
      if (
        complexityRange &&
        (pattern.complexity < complexityRange[0] ||
          pattern.complexity > complexityRange[1])
      ) {
        continue;
      }

      const exactMatches = this.findExactHarmonicMatches(chords, pattern);
      matches.push(...exactMatches);

      // Search for functional matches (same harmonic function, different chords)
      if (allowTransformations) {
        const functionalMatches = this.findFunctionalHarmonicMatches();
        matches.push(...functionalMatches);
      }
    }

    return matches
      .filter((match) => match.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxResults);
  }

  /**
   * Find melodic patterns in a note sequence
   */
  findMelodicPatterns(
    notes: number[],
    options: PatternSearchOptions = {},
  ): PatternMatch[] {
    if (
      !Array.isArray(notes) ||
      notes.some((note) => typeof note !== "number")
    ) {
      throw new Error("Invalid note sequence");
    }

    const {
      minConfidence = 0.7,
      maxResults = 10,
      allowTransformations = true,
      complexityRange,
    } = options;

    const matches: PatternMatch[] = [];
    const intervals = this.notesToIntervals(notes);

    // Search for exact interval matches
    for (const pattern of this.library.melodic) {
      if (
        complexityRange &&
        (pattern.complexity < complexityRange[0] ||
          pattern.complexity > complexityRange[1])
      ) {
        continue;
      }

      const exactMatches = this.findExactMelodicMatches(intervals, pattern);
      matches.push(...exactMatches);

      // Search for contour matches if allowed
      if (allowTransformations) {
        const contourMatches = this.findContourMelodicMatches(
          intervals,
          pattern,
        );
        matches.push(...contourMatches);
      }
    }

    return matches
      .filter((match) => match.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxResults);
  }

  /**
   * Add pattern to library with validation
   */
  addPattern(
    type: keyof PatternLibrary,
    pattern: RhythmicPattern | HarmonicPattern | MelodicPattern,
  ): void {
    // Validate pattern based on type
    if (type === "rhythmic") {
      const rhythmicPattern = pattern as RhythmicPattern;
      if (!ValidationUtils.isValidDurations(rhythmicPattern.sequence)) {
        throw new Error("Invalid rhythmic pattern sequence");
      }
    } else if (type === "harmonic") {
      const harmonicPattern = pattern as HarmonicPattern;
      if (!ValidationUtils.isValidChordProgression(harmonicPattern.chords)) {
        throw new Error("Invalid harmonic pattern chords");
      }
    } else if (type === "melodic") {
      const melodicPattern = pattern as MelodicPattern;
      if (!Array.isArray(melodicPattern.intervals)) {
        throw new Error("Invalid melodic pattern intervals");
      }
    }

    this.library[type].push(pattern as any);
  }

  /**
   * Load pattern library from external source
   */
  async loadLibrary(source: string | PatternLibrary): Promise<void> {
    if (typeof source === "string") {
      // Load from URL or file path
      try {
        const response = await fetch(source);
        const library = (await response.json()) as PatternLibrary;
        this.library = { ...this.library, ...library };
      } catch (error) {
        throw new Error(
          `Failed to load pattern library from ${source}: ${error}`,
        );
      }
    } else {
      // Load from object
      this.library = { ...this.library, ...source };
    }
  }

  /**
   * Get pattern library statistics
   */
  getLibraryStats(): {
    rhythmic: number;
    harmonic: number;
    melodic: number;
    total: number;
  } {
    return {
      rhythmic: this.library.rhythmic.length,
      harmonic: this.library.harmonic.length,
      melodic: this.library.melodic.length,
      total:
        this.library.rhythmic.length +
        this.library.harmonic.length +
        this.library.melodic.length,
    };
  }

  /**
   * Search patterns by name or metadata
   */
  searchPatterns(query: string, type?: keyof PatternLibrary): PatternMatch[] {
    const results: PatternMatch[] = [];
    const searchTypes = type
      ? [type]
      : (["rhythmic", "harmonic", "melodic"] as const);

    for (const searchType of searchTypes) {
      const patterns = this.library[searchType];

      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i]!;
        let confidence = 0;

        // Search in name
        if (
          pattern.name &&
          pattern.name.toLowerCase().includes(query.toLowerCase())
        ) {
          confidence += 0.8;
        }

        // Search in style
        if (pattern.style?.toLowerCase().includes(query.toLowerCase())) {
          confidence += 0.6;
        }

        // Search in metadata
        if (pattern.metadata) {
          const metadataString = JSON.stringify(pattern.metadata).toLowerCase();
          if (metadataString.includes(query.toLowerCase())) {
            confidence += 0.4;
          }
        }

        if (confidence > 0) {
          results.push({
            pattern,
            confidence: Math.min(confidence, 1.0),
            position: 0,
            length:
              searchType === "rhythmic"
                ? (pattern as RhythmicPattern).sequence.length
                : searchType === "harmonic"
                  ? (pattern as HarmonicPattern).chords.length
                  : (pattern as MelodicPattern).intervals.length,
            type: "exact",
          });
        }
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  // Private helper methods

  private findExactRhythmicMatches(
    sequence: number[],
    pattern: RhythmicPattern,
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const patternSeq = pattern.sequence;

    for (let i = 0; i <= sequence.length - patternSeq.length; i++) {
      const segment = sequence.slice(i, i + patternSeq.length);
      const similarity = this.calculateSequenceSimilarity(segment, patternSeq);

      if (similarity > 0.8) {
        matches.push({
          pattern,
          confidence: similarity,
          position: i,
          length: patternSeq.length,
          type: similarity === 1.0 ? "exact" : "approximate",
        });
      }
    }

    return matches;
  }

  private findTransformedRhythmicMatches(
    sequence: number[],
    pattern: RhythmicPattern,
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const patternSeq = pattern.sequence;

    // Try retrograde
    const retrograde = [...patternSeq].reverse();
    for (let i = 0; i <= sequence.length - retrograde.length; i++) {
      const segment = sequence.slice(i, i + retrograde.length);
      const similarity = this.calculateSequenceSimilarity(segment, retrograde);

      if (similarity > 0.7) {
        matches.push({
          pattern,
          confidence: similarity * 0.9, // Slightly lower confidence for transformations
          position: i,
          length: retrograde.length,
          type: "transformed",
          transformation: "retrograde",
        });
      }
    }

    // Try augmentation (double values)
    const augmented = patternSeq.map((val) => val * 2);
    for (let i = 0; i <= sequence.length - augmented.length; i++) {
      const segment = sequence.slice(i, i + augmented.length);
      const similarity = this.calculateSequenceSimilarity(segment, augmented);

      if (similarity > 0.7) {
        matches.push({
          pattern,
          confidence: similarity * 0.8,
          position: i,
          length: augmented.length,
          type: "transformed",
          transformation: "augmentation",
        });
      }
    }

    return matches;
  }

  private findExactHarmonicMatches(
    chords: string[],
    pattern: HarmonicPattern,
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const patternChords = pattern.chords;

    for (let i = 0; i <= chords.length - patternChords.length; i++) {
      const segment = chords.slice(i, i + patternChords.length);
      const similarity = this.calculateChordSimilarity(segment, patternChords);

      if (similarity > 0.8) {
        matches.push({
          pattern,
          confidence: similarity,
          position: i,
          length: patternChords.length,
          type: similarity === 1.0 ? "exact" : "approximate",
        });
      }
    }

    return matches;
  }

  private findFunctionalHarmonicMatches(): PatternMatch[] {
    const matches: PatternMatch[] = [];

    // This would implement functional harmonic analysis
    // For now, return empty array as it requires complex harmonic analysis
    return matches;
  }

  private findExactMelodicMatches(
    intervals: number[],
    pattern: MelodicPattern,
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const patternIntervals = pattern.intervals;

    for (let i = 0; i <= intervals.length - patternIntervals.length; i++) {
      const segment = intervals.slice(i, i + patternIntervals.length);
      const similarity = this.calculateSequenceSimilarity(
        segment,
        patternIntervals,
      );

      if (similarity > 0.8) {
        matches.push({
          pattern,
          confidence: similarity,
          position: i,
          length: patternIntervals.length,
          type: similarity === 1.0 ? "exact" : "approximate",
        });
      }
    }

    return matches;
  }

  private findContourMelodicMatches(
    intervals: number[],
    pattern: MelodicPattern,
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    // Convert intervals to contour (up/down/same)
    const contour = this.intervalsToContour(intervals);
    const patternContour = this.intervalsToContour(pattern.intervals);

    for (let i = 0; i <= contour.length - patternContour.length; i++) {
      const segment = contour.slice(i, i + patternContour.length);
      const similarity = this.calculateContourSimilarity(
        segment,
        patternContour,
      );

      if (similarity > 0.7) {
        matches.push({
          pattern,
          confidence: similarity * 0.8, // Lower confidence for contour matches
          position: i,
          length: patternContour.length,
          type: "transformed",
          transformation: "contour",
        });
      }
    }

    return matches;
  }

  private calculateSequenceSimilarity(seq1: number[], seq2: number[]): number {
    if (seq1.length !== seq2.length) return 0;

    let matches = 0;
    for (let i = 0; i < seq1.length; i++) {
      if (seq1[i] === seq2[i]) matches++;
    }

    return matches / seq1.length;
  }

  private calculateChordSimilarity(
    chords1: string[],
    chords2: string[],
  ): number {
    if (chords1.length !== chords2.length) return 0;

    let matches = 0;
    for (let i = 0; i < chords1.length; i++) {
      if (chords1[i] === chords2[i]) matches++;
    }

    return matches / chords1.length;
  }

  private calculateContourSimilarity(
    contour1: string[],
    contour2: string[],
  ): number {
    if (contour1.length !== contour2.length) return 0;

    let matches = 0;
    for (let i = 0; i < contour1.length; i++) {
      if (contour1[i] === contour2[i]) matches++;
    }

    return matches / contour1.length;
  }

  private notesToIntervals(notes: number[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < notes.length!; i++) {
      intervals.push(notes[i]! - notes[i - 1]!);
    }
    return intervals;
  }

  private intervalsToContour(intervals: number[]): string[] {
    return intervals.map((interval) => {
      if (interval > 0) return "up";
      if (interval < 0) return "down";
      return "same";
    });
  }

  private initializeDefaultPatterns(): void {
    // Add some common rhythmic patterns
    this.addPattern("rhythmic", {
      id: "basic-4-4",
      name: "Basic 4/4 Pattern",
      sequence: [1, 0, 1, 0, 1, 0, 1, 0],
      generators: [2, 2],
      complexity: 0.2,
      style: "basic",
      metadata: { timeSignature: [4, 4] },
    });

    this.addPattern("rhythmic", {
      id: "syncopated-3-2",
      name: "Syncopated 3:2 Pattern",
      sequence: [2, 1, 0, 1, 2, 0],
      generators: [3, 2],
      complexity: 0.6,
      style: "syncopated",
      metadata: { timeSignature: [4, 4] },
    });

    // Add some common harmonic patterns
    this.addPattern("harmonic", {
      id: "ii-V-I",
      name: "ii-V-I Progression",
      chords: ["Dm7", "G7", "Cmaj7"],
      functions: ["ii", "V", "I"],
      key: "C",
      complexity: 0.4,
      style: "jazz",
      metadata: { cadence: "authentic" },
    });

    this.addPattern("harmonic", {
      id: "I-vi-IV-V",
      name: "I-vi-IV-V Progression",
      chords: ["C", "Am", "F", "G"],
      functions: ["I", "vi", "IV", "V"],
      key: "C",
      complexity: 0.3,
      style: "pop",
      metadata: { cadence: "plagal" },
    });

    // Add some common melodic patterns
    this.addPattern("melodic", {
      id: "ascending-scale",
      name: "Ascending Scale",
      intervals: [2, 2, 1, 2, 2, 2, 1],
      contour: "ascending",
      complexity: 0.2,
      style: "scalar",
      metadata: { scale: "major" },
    });

    this.addPattern("melodic", {
      id: "arpeggiated-triad",
      name: "Arpeggiated Triad",
      intervals: [4, 3, 5],
      contour: "ascending",
      complexity: 0.3,
      style: "arpeggiated",
      metadata: { chord: "major" },
    });
  }
}

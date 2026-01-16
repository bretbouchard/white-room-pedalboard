/**
 * CounterpointEngine - Schillinger System Counterpoint Implementation
 *
 * Implements Schillinger's counterpoint theory including:
 * - Species counterpoint (1st through 5th species)
 * - Resultant rhythm patterns
 * - Voice leading principles
 * - Intervallic relationships
 * - Harmonic implications
 */

import { Scale, Chord, Interval as TheoryInterval } from "../theory/types";
import { ValidationResult } from "@schillinger-sdk/shared";
import { VoiceLeadingConstraints } from "../counterpoint";

// Counterpoint-specific Note interface with velocity and duration
export interface CounterpointNote {
  midi: number;
  velocity?: number;
  duration?: number;
  pitch: string;
}

// Counterpoint species enumeration
export enum CounterpointSpecies {
  FIRST = 1, // Note against note
  SECOND = 2, // Two notes against one
  THIRD = 3, // Three or more notes against one
  FOURTH = 4, // Suspensions
  FIFTH = 5, // Florid counterpoint (mixed)
}

// Voice leading constraints
export interface CounterpointVoiceLeadingConstraints {
  maxMelodicInterval: number; // Maximum interval between consecutive notes
  maxHarmonicInterval: number; // Maximum interval between voices
  forbiddenIntervals: number[]; // Intervals that should not occur (as numbers)
  requiredIntervals: number[]; // Intervals that must occur (as numbers)
  parallelMovementLimit: number; // Maximum consecutive parallel movements
  voiceCrossing: boolean; // Allow voice crossing
}

// Counterpoint rules configuration
export interface CounterpointRules {
  species: CounterpointSpecies;
  constraints: CounterpointVoiceLeadingConstraints;
  cantusFirmusRange: [number, number]; // MIDI note range
  counterpointRange: [number, number]; // MIDI note range for counterpoint
  rhythmicPatterns?: number[][]; // Specific rhythmic patterns to use
  harmonicFramework?: Scale; // Underlying scale/harmony
}

// Counterpoint analysis result
export interface CounterpointAnalysis {
  validity: ValidationResult;
  speciesConformance: boolean;
  voiceLeadingScore: number; // 0-100 quality score
  harmonicAnalysis: {
    intervals: number[];
    consonances: number;
    dissonances: number;
    suspensions: number;
    resolutions: number;
  };
  rhythmicAnalysis: {
    syncopations: number;
    offbeats: number;
    rhythmicVariety: number;
  };
  suggestions: string[]; // Improvement suggestions
}

// Voice part representation
export interface VoicePart {
  notes: CounterpointNote[];
  name: string; // e.g., "Soprano", "Alto", "Tenor", "Bass"
  midiChannel?: number; // For playback
  range: [number, number]; // Voice range (MIDI notes)
}

// Complete counterpoint composition
export interface CounterpointComposition {
  cantusFirmus: VoicePart;
  counterpoints: VoicePart[];
  rules: CounterpointRules;
  analysis: CounterpointAnalysis;
  metadata: {
    key: string;
    timeSignature: [number, number];
    tempo: number;
    duration: number; // Measures
  };
}

/**
 * CounterpointEngine implements Schillinger's counterpoint methodology
 */
export class CounterpointEngine {
  private readonly PERFECT_CONSONANCES = [1, 5, 8]; // Unison, fifth, octave
  private readonly IMPERFECT_CONSONANCES = [3, 6]; // Third, sixth
  private readonly DISSONANCES = [2, 4, 7]; // Second, fourth, seventh
  private readonly SCHILLINGER_INTERVALS = {
    RESULTANT: [2, 3, 5, 7, 11, 13], // Primary resultants
    SECONDARY: [9, 10, 12, 14], // Secondary intervals
    CONTROL: [1, 4, 6, 8], // Control intervals
  };

  /**
   * Generate counterpoint against a cantus firmus
   */
  async generateCounterpoint(
    cantusFirmus: VoicePart,
    rules: CounterpointRules,
  ): Promise<VoicePart> {
    this.validateInput(cantusFirmus, rules);

    const counterpointNotes: CounterpointNote[] = [];
    const cantusNotes = cantusFirmus.notes;

    for (let i = 0; i < cantusNotes.length; i++) {
      const cantusNote = cantusNotes[i];
      const counterpointNote = await this.generateNoteForCantus(
        cantusNote,
        i,
        counterpointNotes,
        cantusNotes,
        rules,
      );

      counterpointNotes.push(counterpointNote);
    }

    // Apply post-generation refinement
    const refinedNotes = await this.refineCounterpoint(
      counterpointNotes,
      cantusNotes,
      rules,
    );

    const ordinal = this.getOrdinalSuffix(rules.species);
    return {
      notes: refinedNotes,
      name: `Counterpoint ${rules.species}${ordinal} Species`,
      range: rules.counterpointRange,
    };
  }

  /**
   * Generate multiple counterpoints (polyphonic texture)
   */
  async generatePolyphonicTexture(
    cantusFirmus: VoicePart,
    voiceCount: number,
    rules: CounterpointRules,
  ): Promise<VoicePart[]> {
    if (voiceCount < 1) {
      throw new Error("Voice count must be at least 1");
    }

    const counterpoints: VoicePart[] = [];

    for (let voice = 0; voice < voiceCount; voice++) {
      const adaptedRules = this.adaptRulesForVoice(rules, voice, voiceCount);

      // All voices are generated against the original cantus firmus
      const counterpoint = await this.generateCounterpoint(
        cantusFirmus,
        adaptedRules,
      );
      counterpoints.push(counterpoint);
    }

    return counterpoints;
  }

  /**
   * Analyze existing counterpoint
   */
  async analyzeCounterpoint(
    cantusFirmus: VoicePart,
    counterpoint: VoicePart,
    rules: CounterpointRules,
  ): Promise<CounterpointAnalysis> {
    const intervals = this.calculateHarmonicIntervals(
      cantusFirmus.notes,
      counterpoint.notes,
    );

    return {
      validity: await this.validateCounterpoint(
        cantusFirmus,
        counterpoint,
        rules,
      ),
      speciesConformance: this.checkSpeciesConformance(counterpoint, rules),
      voiceLeadingScore: this.calculateVoiceLeadingScore(counterpoint, rules),
      harmonicAnalysis: {
        intervals,
        consonances: this.countConsonances(intervals),
        dissonances: this.countDissonances(intervals),
        suspensions: this.countSuspensions(
          cantusFirmus.notes,
          counterpoint.notes,
        ),
        resolutions: this.countResolutions(
          cantusFirmus.notes,
          counterpoint.notes,
        ),
      },
      rhythmicAnalysis: {
        syncopations: this.countSyncopations(counterpoint),
        offbeats: this.countOffbeats(counterpoint),
        rhythmicVariety: this.calculateRhythmicVariety(counterpoint),
      },
      suggestions: this.generateSuggestions(cantusFirmus, counterpoint, rules),
    };
  }

  /**
   * Generate rhythmic patterns based on Schillinger's resultant theory
   */
  generateRhythmicPatterns(
    basePattern: number[],
    resultantPattern: number[],
    complexity: number = 1,
  ): number[][] {
    const patterns: number[][] = [];

    for (let variation = 0; variation < complexity; variation++) {
      const pattern = this.intersectPatterns(
        basePattern,
        this.rotatePattern(resultantPattern, variation),
      );
      patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Apply Schillinger voice leading principles
   */
  applyVoiceLeading(
    sourceNotes: CounterpointNote[],
    targetNotes: CounterpointNote[],
    constraints: VoiceLeadingConstraints | any,
  ): boolean {
    for (let i = 0; i < Math.min(sourceNotes.length, targetNotes.length); i++) {
      const sourceNote = sourceNotes[i];
      const targetNote = targetNotes[i];

      // Check melodic interval constraints
      const melodicInterval = Math.abs(targetNote.midi - sourceNote.midi);

      // Support both maxLeap and maxMelodicInterval property names
      const maxInterval = constraints.maxLeap ?? constraints.maxMelodicInterval;
      if (maxInterval !== undefined && melodicInterval > maxInterval) {
        return false;
      }

      // Check forbidden intervals (if provided in constraints)
      if (
        constraints.forbiddenIntervals &&
        constraints.forbiddenIntervals.length > 0
      ) {
        const normalizedInterval = melodicInterval % 12 || 12;
        if (constraints.forbiddenIntervals.includes(normalizedInterval)) {
          return false;
        }
      }

      // Check voice crossing if not allowed
      if (constraints.avoidVoiceCrossing && i > 0) {
        const prevSource = sourceNotes[i - 1];
        const prevTarget = targetNotes[i - 1];

        if (
          this.checkVoiceCrossing(
            sourceNote,
            targetNote,
            prevSource,
            prevTarget,
          )
        ) {
          return false;
        }
      }
    }

    return true;
  }

  // Private helper methods

  private validateInput(
    cantusFirmus: VoicePart,
    rules: CounterpointRules,
  ): void {
    if (cantusFirmus.notes.length === 0) {
      throw new Error("Cantus firmus must contain at least one note");
    }

    if (cantusFirmus.notes.length > 32) {
      throw new Error("Cantus firmus is too long (maximum 32 notes)");
    }

    // Validate note ranges against specified range
    for (const note of cantusFirmus.notes) {
      if (
        note.midi < rules.cantusFirmusRange[0] ||
        note.midi > rules.cantusFirmusRange[1]
      ) {
        throw new Error(
          `Cantus firmus note ${note.midi} outside allowed range [${rules.cantusFirmusRange[0]}, ${rules.cantusFirmusRange[1]}]`,
        );
      }
    }
  }

  private async generateNoteForCantus(
    cantusNote: CounterpointNote,
    index: number,
    counterpointNotes: CounterpointNote[],
    cantusNotes: CounterpointNote[],
    rules: CounterpointRules,
  ): Promise<CounterpointNote> {
    const candidates = this.generateCandidateNotes(cantusNote, rules);
    const filteredCandidates = this.filterCandidates(
      candidates,
      cantusNote,
      index,
      counterpointNotes,
      cantusNotes,
      rules,
    );

    if (filteredCandidates.length === 0) {
      throw new Error(
        `No valid counterpoint note found for cantus note at index ${index}`,
      );
    }

    // Select best candidate based on voice leading and harmonic principles
    return this.selectBestCandidate(filteredCandidates, cantusNote, rules);
  }

  private generateCandidateNotes(
    cantusNote: CounterpointNote,
    rules: CounterpointRules,
  ): CounterpointNote[] {
    const candidates: CounterpointNote[] = [];
    const [minNote, maxNote] = rules.counterpointRange;

    // Generate notes within acceptable range and intervals
    for (let midi = minNote; midi <= maxNote; midi++) {
      const interval = Math.abs(midi - cantusNote.midi);

      // Check if interval is allowed
      if (this.isIntervalAllowed(interval, rules)) {
        candidates.push({
          midi,
          velocity: cantusNote.velocity,
          duration: cantusNote.duration,
          pitch: this.midiToPitch(midi),
        });
      }
    }

    return candidates;
  }

  private isIntervalAllowed(
    interval: number,
    rules: CounterpointRules,
  ): boolean {
    const normalizedInterval = interval % 12 || 12;

    // Check forbidden intervals
    if (
      this.containsInterval(
        rules.constraints.forbiddenIntervals,
        normalizedInterval,
      )
    ) {
      return false;
    }

    // Check if it's a consonance (generally preferred)
    const isConsonance =
      this.PERFECT_CONSONANCES.includes(normalizedInterval) ||
      this.IMPERFECT_CONSONANCES.includes(normalizedInterval);

    // For dissonances, ensure they can resolve properly
    if (!isConsonance && rules.species !== CounterpointSpecies.FOURTH) {
      return false; // Dissonances only allowed in suspensions or florid counterpoint
    }

    return true;
  }

  private filterCandidates(
    candidates: CounterpointNote[],
    cantusNote: CounterpointNote,
    index: number,
    counterpointNotes: CounterpointNote[],
    cantusNotes: CounterpointNote[],
    rules: CounterpointRules,
  ): CounterpointNote[] {
    return candidates.filter((candidate) => {
      // Check voice leading with previous note
      if (index > 0) {
        const previousCantus = cantusNotes[index - 1];
        const previousCounterpoint = counterpointNotes[index - 1];

        if (
          !this.applyVoiceLeading(
            [previousCounterpoint],
            [candidate],
            rules.constraints as any,
          )
        ) {
          return false;
        }

        // Check parallel motion limits
        if (
          this.isParallelMotion(
            previousCantus,
            cantusNote,
            previousCounterpoint,
            candidate,
          )
        ) {
          // TODO: Count consecutive parallel motions and check limit
        }
      }

      // Check melodic contour (prefer contrary motion)
      if (
        index > 0 &&
        this.hasSameDirection(
          cantusNotes[index - 1],
          cantusNote,
          counterpointNotes[index - 1],
          candidate,
        )
      ) {
        // Reduce score for same direction motion
      }

      return true;
    });
  }

  private selectBestCandidate(
    candidates: CounterpointNote[],
    cantusNote: CounterpointNote,
    rules: CounterpointRules,
  ): CounterpointNote {
    // Score each candidate based on multiple factors
    const scored = candidates.map((candidate) => ({
      note: candidate,
      score: this.calculateCandidateScore(candidate, cantusNote, rules),
    }));

    // Sort by score (higher is better)
    scored.sort((a, b) => b.score - a.score);

    // Return top candidate
    return scored[0].note;
  }

  private calculateCandidateScore(
    candidate: CounterpointNote,
    cantusNote: CounterpointNote,
    rules: CounterpointRules,
  ): number {
    let score = 0;
    const interval = Math.abs(candidate.midi - cantusNote.midi) % 12 || 12;

    // Prefer consonances
    if (this.PERFECT_CONSONANCES.includes(interval)) {
      score += 10;
    } else if (this.IMPERFECT_CONSONANCES.includes(interval)) {
      score += 8;
    } else {
      score += 2; // Dissonances get minimal score
    }

    // Prefer contrary motion (need previous notes for this)
    // TODO: Implement motion scoring

    // Consider range centering
    const rangeCenter =
      (rules.counterpointRange[0] + rules.counterpointRange[1]) / 2;
    const distanceFromCenter = Math.abs(candidate.midi - rangeCenter);
    score -= distanceFromCenter * 0.1;

    return score;
  }

  private calculateHarmonicIntervals(
    cantusNotes: CounterpointNote[],
    counterpointNotes: CounterpointNote[],
  ): number[] {
    const intervals: number[] = [];
    const minLength = Math.min(cantusNotes.length, counterpointNotes.length);

    for (let i = 0; i < minLength; i++) {
      const interval =
        Math.abs(counterpointNotes[i].midi - cantusNotes[i].midi) % 12 || 12;
      intervals.push(interval);
    }

    return intervals;
  }

  private countConsonances(intervals: number[]): number {
    return intervals.filter(
      (interval) =>
        this.PERFECT_CONSONANCES.includes(interval) ||
        this.IMPERFECT_CONSONANCES.includes(interval),
    ).length;
  }

  private countDissonances(intervals: number[]): number {
    return intervals.filter((interval) => this.DISSONANCES.includes(interval))
      .length;
  }

  private countSuspensions(
    cantusNotes: CounterpointNote[],
    counterpointNotes: CounterpointNote[],
  ): number {
    // TODO: Implement suspension detection
    return 0;
  }

  private countResolutions(
    cantusNotes: CounterpointNote[],
    counterpointNotes: CounterpointNote[],
  ): number {
    // TODO: Implement resolution detection
    return 0;
  }

  private countSyncopations(counterpoint: VoicePart): number {
    // TODO: Implement syncopation detection
    return 0;
  }

  private countOffbeats(counterpoint: VoicePart): number {
    // TODO: Implement offbeat detection
    return 0;
  }

  private calculateRhythmicVariety(counterpoint: VoicePart): number {
    // TODO: Implement rhythmic variety calculation
    return 0;
  }

  private async validateCounterpoint(
    cantusFirmus: VoicePart,
    counterpoint: VoicePart,
    rules: CounterpointRules,
  ): Promise<ValidationResult> {
    // TODO: Implement comprehensive validation
    return {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };
  }

  private checkSpeciesConformance(
    counterpoint: VoicePart,
    rules: CounterpointRules,
  ): boolean {
    // TODO: Implement species-specific validation
    return true;
  }

  private calculateVoiceLeadingScore(
    counterpoint: VoicePart,
    rules: CounterpointRules,
  ): number {
    // TODO: Implement voice leading quality scoring
    return 85;
  }

  private generateSuggestions(
    cantusFirmus: VoicePart,
    counterpoint: VoicePart,
    rules: CounterpointRules,
  ): string[] {
    const suggestions: string[] = [];
    // TODO: Generate improvement suggestions
    return suggestions;
  }

  private async refineCounterpoint(
    counterpointNotes: CounterpointNote[],
    cantusNotes: CounterpointNote[],
    rules: CounterpointRules,
  ): Promise<CounterpointNote[]> {
    // TODO: Apply Schillinger refinement techniques
    return counterpointNotes;
  }

  private adaptRulesForVoice(
    rules: CounterpointRules,
    voiceIndex: number,
    totalVoices: number,
  ): CounterpointRules {
    // Adapt counterpoint range for each voice to ensure proper spacing
    const adapted = { ...rules };

    if (voiceIndex > 0) {
      // For subsequent voices, shift the counterpoint range up
      // to create distinct voice layers
      const rangeShift = voiceIndex * 6; // Shift up by a sixth per voice (distinct but close)
      adapted.counterpointRange = [
        rules.counterpointRange[0] + rangeShift,
        rules.counterpointRange[1] + rangeShift,
      ] as [number, number];
    }

    return adapted;
  }

  private intersectPatterns(pattern1: number[], pattern2: number[]): number[] {
    // Schillinger pattern intersection: combine patterns where either has a 1
    const result: number[] = [];
    const minLength = Math.min(pattern1.length, pattern2.length);

    for (let i = 0; i < minLength; i++) {
      // If either pattern has a 1 at this position, result is 1
      result.push(pattern1[i] || pattern2[i] ? 1 : 0);
    }

    // Handle remaining elements if patterns are different lengths
    const maxLength = Math.max(pattern1.length, pattern2.length);
    for (let i = minLength; i < maxLength; i++) {
      if (i < pattern1.length) {
        result.push(pattern1[i]);
      } else if (i < pattern2.length) {
        result.push(pattern2[i]);
      }
    }

    return result;
  }

  private rotatePattern(pattern: number[], offset: number): number[] {
    const result = [...pattern];
    for (let i = 0; i < offset; i++) {
      result.push(result.shift()!);
    }
    return result;
  }

  private containsInterval(intervals: number[], target: number): boolean {
    return intervals.includes(target);
  }

  private isParallelMotion(
    cantus1: CounterpointNote,
    cantus2: CounterpointNote,
    counterpoint1: CounterpointNote,
    counterpoint2: CounterpointNote,
  ): boolean {
    const cantusDirection = cantus2.midi > cantus1.midi ? 1 : -1;
    const counterpointDirection =
      counterpoint2.midi > counterpoint1.midi ? 1 : -1;
    return cantusDirection === counterpointDirection;
  }

  private hasSameDirection(
    cantus1: CounterpointNote,
    cantus2: CounterpointNote,
    counterpoint1: CounterpointNote,
    counterpoint2: CounterpointNote,
  ): boolean {
    return this.isParallelMotion(
      cantus1,
      cantus2,
      counterpoint1,
      counterpoint2,
    );
  }

  private checkVoiceCrossing(
    source1: CounterpointNote,
    target1: CounterpointNote,
    source2: CounterpointNote,
    target2: CounterpointNote,
  ): boolean {
    return (
      (source1.midi < source2.midi && target1.midi > target2.midi) ||
      (source1.midi > source2.midi && target1.midi < target2.midi)
    );
  }

  private midiToPitch(midi: number): string {
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
    const noteName = notes[midi % 12];
    return `${noteName}${octave}`;
  }

  private getOrdinalSuffix(num: number): string {
    const lastTwo = num % 100;
    const lastOne = num % 10;

    if (lastTwo >= 11 && lastTwo <= 13) {
      return "th";
    }

    switch (lastOne) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }
}

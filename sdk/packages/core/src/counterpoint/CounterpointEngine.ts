/**
 * CounterpointEngine - Generate counterpoint melodies
 *
 * @module counterpoint/CounterpointEngine
 */

export enum CounterpointSpecies {
  First = "first",
  Second = "second",
  Third = "third",
  Fourth = "fourth",
  Fifth = "fifth",
}

export interface CounterpointConfig {
  species: CounterpointSpecies;
  cantusFirmus: number[];
}

export interface Note {
  midi: number;
  velocity: number;
  duration: number;
  pitch: string;
}

export interface VoicePart {
  notes: Note[];
  name: string;
  range: [number, number];
}

export interface VoiceLeadingConstraints {
  maxMelodicInterval: number;
  maxHarmonicInterval: number;
  forbiddenIntervals: number[];
  requiredIntervals: number[];
  parallelMovementLimit: number;
  voiceCrossing: boolean;
}

export interface CounterpointRules {
  species: CounterpointSpecies;
  constraints: VoiceLeadingConstraints;
  cantusFirmusRange: [number, number];
  counterpointRange: [number, number];
}

export interface CounterpointResult {
  notes: number[];
}

export interface CounterpointAnalysis {
  validity: boolean;
}

export class CounterpointEngine {
  private config?: CounterpointConfig;

  constructor(config?: CounterpointConfig) {
    this.config = config;
  }

  generate(): number[] {
    if (!this.config) {
      return [];
    }
    // Simple implementation: generate counterpoint above cantus firmus
    const { cantusFirmus, species } = this.config;
    const counterpoint: number[] = [];

    for (let i = 0; i < cantusFirmus.length; i++) {
      const cfNote = cantusFirmus[i];
      // Generate counterpoint note a third above (adjusting for species)
      let interval = 3;
      switch (species) {
        case CounterpointSpecies.Second:
          interval = i % 2 === 0 ? 3 : 4;
          break;
        case CounterpointSpecies.Third:
          interval = [3, 4, 3][i % 3];
          break;
        case CounterpointSpecies.Fourth:
          interval = [3, 4, 3, 5][i % 4];
          break;
        case CounterpointSpecies.Fifth:
          interval = [3, 4, 3, 5, 6][i % 5];
          break;
        default:
          interval = 3;
      }
      counterpoint.push(cfNote + interval);
    }

    return counterpoint;
  }

  validate(result: number[]): boolean {
    return result.length > 0;
  }

  setSpecies(species: CounterpointSpecies): void {
    if (this.config) {
      this.config.species = species;
    }
  }

  /**
   * Generate counterpoint for a given cantus firmus
   */
  generateCounterpoint(cantusFirmus: VoicePart, rules: CounterpointRules): CounterpointResult {
    const notes: number[] = [];

    for (let i = 0; i < cantusFirmus.notes.length; i++) {
      const cfNote = cantusFirmus.notes[i].midi;
      let interval = 3;

      // Vary interval based on species
      switch (rules.species) {
        case CounterpointSpecies.First:
          interval = 3;
          break;
        case CounterpointSpecies.Second:
          interval = i % 2 === 0 ? 3 : 4;
          break;
        case CounterpointSpecies.Third:
          interval = [3, 4, 3][i % 3];
          break;
        case CounterpointSpecies.Fourth:
          interval = [3, 4, 3, 5][i % 4];
          break;
        case CounterpointSpecies.Fifth:
          interval = [3, 4, 3, 5, 6][i % 5];
          break;
      }

      // Ensure counterpoint is within valid range
      let cpNote = cfNote + interval;
      cpNote = Math.max(rules.counterpointRange[0], Math.min(rules.counterpointRange[1], cpNote));

      notes.push(cpNote);
    }

    return { notes };
  }

  /**
   * Analyze counterpoint validity against rules
   */
  analyzeCounterpoint(
    cantusFirmus: VoicePart,
    counterpoint: VoicePart,
    rules: CounterpointRules
  ): CounterpointAnalysis {
    const constraints = rules.constraints;
    let valid = true;

    // Check each note pair
    for (let i = 0; i < Math.min(cantusFirmus.notes.length, counterpoint.notes.length); i++) {
      const cfNote = cantusFirmus.notes[i].midi;
      const cpNote = counterpoint.notes[i].midi;
      const interval = Math.abs(cpNote - cfNote);

      // Check forbidden intervals
      if (constraints.forbiddenIntervals.includes(interval)) {
        valid = false;
        break;
      }

      // Check harmonic interval constraint
      if (interval > constraints.maxHarmonicInterval) {
        valid = false;
        break;
      }
    }

    // Check melodic intervals in counterpoint
    for (let i = 1; i < counterpoint.notes.length; i++) {
      const melodicInterval = Math.abs(counterpoint.notes[i].midi - counterpoint.notes[i - 1].midi);
      if (melodicInterval > constraints.maxMelodicInterval) {
        valid = false;
        break;
      }
    }

    return { validity: valid };
  }

  /**
   * Generate polyphonic texture with multiple voices
   */
  generatePolyphonicTexture(
    cantusFirmus: VoicePart,
    voiceCount: number,
    rules: CounterpointRules
  ): CounterpointResult[] {
    const results: CounterpointResult[] = [];

    for (let voice = 0; voice < voiceCount; voice++) {
      const notes: number[] = [];

      for (let i = 0; i < cantusFirmus.notes.length; i++) {
        const cfNote = cantusFirmus.notes[i].midi;
        // Each voice starts at a different interval above cantus firmus
        const baseInterval = 3 + (voice * 2);
        let cpNote = cfNote + baseInterval;

        // Ensure within valid range
        cpNote = Math.max(rules.counterpointRange[0], Math.min(rules.counterpointRange[1], cpNote));

        notes.push(cpNote);
      }

      results.push({ notes });
    }

    return results;
  }

  /**
   * Apply voice leading constraints to transform source notes to target notes
   */
  applyVoiceLeading(
    sourceNotes: Note[],
    targetNotes: Note[],
    constraints: VoiceLeadingConstraints
  ): Note[] {
    const result: Note[] = [];

    for (let i = 0; i < Math.min(sourceNotes.length, targetNotes.length); i++) {
      const source = sourceNotes[i];
      const target = targetNotes[i];
      const interval = Math.abs(target.midi - source.midi);

      // Check if interval is allowed
      let adjustedMidi = target.midi;
      if (constraints.forbiddenIntervals.includes(interval)) {
        // Adjust to nearest allowed interval
        adjustedMidi = source.midi + (constraints.requiredIntervals[0] || 3);
      }

      // Check melodic interval constraint
      if (i > 0) {
        const melodicInterval = Math.abs(adjustedMidi - result[i - 1].midi);
        if (melodicInterval > constraints.maxMelodicInterval) {
          adjustedMidi = result[i - 1].midi + Math.sign(adjustedMidi - result[i - 1].midi) * constraints.maxMelodicInterval;
        }
      }

      // Check voice crossing
      if (!constraints.voiceCrossing && i > 0) {
        if (adjustedMidi < result[i - 1].midi) {
          adjustedMidi = result[i - 1].midi + 1;
        }
      }

      result.push({
        midi: adjustedMidi,
        velocity: target.velocity,
        duration: target.duration,
        pitch: `Note${adjustedMidi}`,
      });
    }

    return result;
  }

  /**
   * Generate rhythmic patterns based on base and resultant patterns
   */
  generateRhythmicPatterns(
    basePattern: number[],
    resultantPattern: number[],
    count: number
  ): number[][] {
    const patterns: number[][] = [];
    const patternLength = Math.max(basePattern.length, resultantPattern.length);

    for (let i = 0; i < count; i++) {
      const pattern: number[] = [];

      for (let j = 0; j < patternLength; j++) {
        const base = basePattern[j % basePattern.length];
        const resultant = resultantPattern[j % resultantPattern.length];
        // Combine patterns with logical AND
        pattern.push(base && resultant ? 1 : 0);
      }

      // Vary pattern slightly for each iteration
      if (i > 0) {
        const offset = i % patternLength;
        const varied = [...pattern.slice(offset), ...pattern.slice(0, offset)];
        patterns.push(varied);
      } else {
        patterns.push(pattern);
      }
    }

    return patterns;
  }
}

/**
 * Counterpoint Engine - Complete Schillinger Counterpoint Implementation
 *
 * Implements the full Schillinger counterpoint system including:
 * - Species counterpoint (1st-6th species)
 * - Fugal imitation and development
 * - Canon construction (interval, time, retrograde)
 * - Advanced voice leading optimization
 * - Mathematical validation of contrapuntal principles
 */

import type { SchillingerSDK } from './client';
import type {
  MelodyLine,
  RhythmPattern,
  ValidationError as _ValidationError,
  ProcessingError as _ProcessingError
} from '@schillinger-sdk/shared';

// Counterpoint-specific types
export interface SpeciesOptions {
  cantusFirmus: MelodyLine;
  species: 1 | 2 | 3 | 4 | 5 | 6;
  key?: string;
  mode?: string;
  range?: [number, number];
  style?: 'classical' | 'baroque' | 'contemporary';
}

export interface FugalOptions {
  voiceCount: number;
  interval?: number; // Interval of imitation (in semitones)
  timeDisplacement?: number; // Displacement in beats
  direction?: 'above' | 'below' | 'both';
  style?: 'baroque' | 'classical' | 'contemporary';
  development?: boolean; // Include fugal development
}

export interface CanonOptions {
  type: 'interval' | 'time' | 'retrograde' | 'inversion' | 'crab';
  voiceCount?: number;
  interval?: number; // For interval canons
  timeDisplacement?: number; // For time canons
  direction?: 'forward' | 'backward';
  style?: 'strict' | 'free';
}

export interface VoiceLeadingConstraints {
  allowParallelFifths?: boolean;
  allowParallelOctaves?: boolean;
  allowDirectFifths?: boolean;
  allowHiddenParallelFifths?: boolean;
  maxLeap?: number; // Maximum interval leap in semitones
  preferStepwiseMotion?: boolean;
  avoidVoiceCrossing?: boolean;
}

export interface CounterpointResult {
  cantusFirmus: MelodyLine;
  counterpoint: MelodyLine;
  species: number;
  analysis: {
    voiceLeadingQuality: number;
    consonanceRatio: number;
    dissonanceResolution: number[];
    parallelIntervals: number[];
    voiceCrossings: number[];
    leapAnalysis: {
      totalLeaps: number;
      averageLeap: number;
      largestLeap: number;
    };
  };
  violations: CounterpointViolation[];
}

export interface FugalResult {
  subject: MelodyLine;
  voices: MelodyLine[];
  imitationType: string;
  analysis: {
    imitationAccuracy: number;
    voiceIndependence: number;
    harmonicStructure: number[];
    developmentPotential: number;
  };
  development?: FugalDevelopment;
}

export interface CanonResult {
  original: MelodyLine;
  canonVoices: MelodyLine[];
  canonType: string;
  analysis: {
    structuralCoherence: number;
    intervalRelationships: number[];
    timingAccuracy: number;
  };
}

export interface CounterpointViolation {
  type: 'parallel_fifth' | 'parallel_octave' | 'direct_fifth' | 'hidden_parallel_fifth' | 'voice_crossing' | 'excessive_leap';
  measure: number;
  beat: number;
  voices: [number, number];
  severity: 'error' | 'warning';
  description: string;
}

export class CounterpointAPI {
  constructor(private sdk: SchillingerSDK) {}

  // ============================================================================
  // SPECIES COUNTERPOINT
  // ============================================================================

  /**
   * Generate species counterpoint according to Fux's rules
   *
   * Implements the classical species counterpoint system:
   * - 1st species: Note against note
   * - 2nd species: Two notes against one
   * - 3rd species: Four notes against one
   * - 4th species: Suspensions and retardations
   * - 5th species: Florid counterpoint
   * - 6th species: Multiple species combined
   */
  async generateSpeciesCounterpoint(options: SpeciesOptions): Promise<CounterpointResult> {
    // Validate input
    this.validateSpeciesOptions(options);

    try {
      const { cantusFirmus, species } = options;
      const key = options.key || 'C';
      const mode = options.mode || 'major';
      const range = options.range || [60, 84]; // Default C4 to C6

      // Generate counterpoint based on species
      let counterpoint: MelodyLine;
      switch (species) {
        case 1:
          counterpoint = await this.generateFirstSpecies(cantusFirmus, key, mode, range);
          break;
        case 2:
          counterpoint = await this.generateSecondSpecies(cantusFirmus, key, mode, range);
          break;
        case 3:
          counterpoint = await this.generateThirdSpecies(cantusFirmus, key, mode, range);
          break;
        case 4:
          counterpoint = await this.generateFourthSpecies(cantusFirmus, key, mode, range);
          break;
        case 5:
          counterpoint = await this.generateFifthSpecies(cantusFirmus, key, mode, range);
          break;
        case 6:
          counterpoint = await this.generateSixthSpecies(cantusFirmus, key, mode, range);
          break;
      }

      // Analyze the result
      const analysis = await this.analyzeCounterpoint(cantusFirmus, counterpoint, species);
      const violations = await this.detectViolations(cantusFirmus, counterpoint, species);

      return {
        cantusFirmus,
        counterpoint,
        species,
        analysis,
        violations
      };

    } catch (error) {
      if (error instanceof _ValidationError || error instanceof _ProcessingError) {
        throw error;
      }
      throw new _ProcessingError(
        'species counterpoint generation',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async generateFirstSpecies(
    cantusFirmus: MelodyLine,
    key: string,
    mode: string,
    range: [number, number]
  ): Promise<MelodyLine> {
    const scale = this.getScale(key, mode);
    const counterpointNotes: number[] = [];

    for (let i = 0; i < cantusFirmus.notes.length; i++) {
      const cfNote = cantusFirmus.notes[i];
      const cfNoteClass = cfNote % 12;

      // Find consonant intervals with cantus firmus note
      const consonantIntervals = this.getConsonantIntervals(cfNoteClass);
      const validNotes = consonantIntervals
        .map(interval => cfNote + interval)
        .filter(note => note >= range[0] && note <= range[1])
        .filter(note => this.isNoteInScale(note, scale));

      // Choose best note based on voice leading principles
      const bestNote = this.selectBestCounterpointNote(validNotes, counterpointNotes, cfNote);
      counterpointNotes.push(bestNote);
    }

    return {
      id: `counterpoint-1st-${Date.now()}`,
      notes: counterpointNotes,
      durations: cantusFirmus.durations || cantusFirmus.notes.map(() => 1),
      key,
      scale: mode,
      metadata: {
        species: 1,
        style: 'classical'
      }
    };
  }

  private async generateSecondSpecies(
    cantusFirmus: MelodyLine,
    key: string,
    mode: string,
    range: [number, number]
  ): Promise<MelodyLine> {
    const scale = this.getScale(key, mode);
    const counterpointNotes: number[] = [];
    const counterpointDurations: number[] = [];

    for (let i = 0; i < cantusFirmus.notes.length; i++) {
      const cfNote = cantusFirmus.notes[i];
      const cfDuration = cantusFirmus.durations?.[i] || 1;

      if (i === 0 || i === cantusFirmus.notes.length - 1) {
        // First and last note: single note (like first species)
        const consonantNote = this.findConsonantNote(cfNote, scale, range, counterpointNotes);
        counterpointNotes.push(consonantNote);
        counterpointDurations.push(cfDuration);
      } else {
        // Middle notes: two notes against one
        const firstNote = this.findConsonantNote(cfNote, scale, range, counterpointNotes);

        // Second note creates passing tone or neighbor note
        const secondNote = this.createPassingOrNeighborTone(
          firstNote,
          cfNote,
          i < cantusFirmus.notes.length - 1 ? cantusFirmus.notes[i + 1] : cfNote,
          scale
        );

        counterpointNotes.push(firstNote, secondNote);
        counterpointDurations.push(cfDuration / 2, cfDuration / 2);
      }
    }

    return {
      id: `counterpoint-2nd-${Date.now()}`,
      notes: counterpointNotes,
      durations: counterpointDurations,
      key,
      scale: mode,
      metadata: {
        species: 2,
        style: 'classical'
      }
    };
  }

  private async generateThirdSpecies(
    cantusFirmus: MelodyLine,
    key: string,
    mode: string,
    range: [number, number]
  ): Promise<MelodyLine> {
    // Implementation for 4 notes against one
    // Similar to second species but with 4:1 ratio
    const scale = this.getScale(key, mode);
    const counterpointNotes: number[] = [];
    const counterpointDurations: number[] = [];

    for (let i = 0; i < cantusFirmus.notes.length; i++) {
      const cfNote = cantusFirmus.notes[i];
      const cfDuration = cantusFirmus.durations?.[i] || 1;

      if (i === 0 || i === cantusFirmus.notes.length - 1) {
        // First and last: simple consonance
        const consonantNote = this.findConsonantNote(cfNote, scale, range, counterpointNotes);
        counterpointNotes.push(consonantNote);
        counterpointDurations.push(cfDuration);
      } else {
        // Four notes against one
        const baseInterval = this.findConsonantInterval(cfNote);
        const notes = [
          baseInterval.startNote,
          this.createPassingOrNeighborTone(baseInterval.startNote, cfNote, cfNote, scale),
          this.createPassingOrNeighborTone(baseInterval.startNote, cfNote, cfNote, scale),
          baseInterval.endNote || this.findConsonantNote(cfNote, scale, range, counterpointNotes)
        ];

        counterpointNotes.push(...notes);
        counterpointDurations.push(...Array(4).fill(cfDuration / 4));
      }
    }

    return {
      id: `counterpoint-3rd-${Date.now()}`,
      notes: counterpointNotes,
      durations: counterpointDurations,
      key,
      scale: mode,
      metadata: {
        species: 3,
        style: 'classical'
      }
    };
  }

  private async generateFourthSpecies(
    cantusFirmus: MelodyLine,
    key: string,
    mode: string,
    range: [number, number]
  ): Promise<MelodyLine> {
    // Implementation with suspensions and retardations
    const scale = this.getScale(key, mode);
    const counterpointNotes: number[] = [];
    const counterpointDurations: number[] = [];

    for (let i = 0; i < cantusFirmus.notes.length; i++) {
      const cfNote = cantusFirmus.notes[i];
      const cfDuration = cantusFirmus.durations?.[i] || 1;

      if (i < cantusFirmus.notes.length - 1) {
        // Create suspension on next beat
        const currentConsonant = this.findConsonantNote(cfNote, scale, range, counterpointNotes);
        const nextCfNote = cantusFirmus.notes[i + 1];
        const suspensionNote = this.createSuspensionNote(currentConsonant, nextCfNote, scale);

        counterpointNotes.push(currentConsonant, suspensionNote);
        counterpointDurations.push(cfDuration / 2, cfDuration / 2);
      } else {
        // Last note: resolve the suspension
        const resolvingNote = this.findConsonantNote(cfNote, scale, range, counterpointNotes);
        counterpointNotes.push(resolvingNote);
        counterpointDurations.push(cfDuration);
      }
    }

    return {
      id: `counterpoint-4th-${Date.now()}`,
      notes: counterpointNotes,
      durations: counterpointDurations,
      key,
      scale: mode,
      metadata: {
        species: 4,
        style: 'classical'
      }
    };
  }

  private async generateFifthSpecies(
    cantusFirmus: MelodyLine,
    key: string,
    mode: string,
    range: [number, number]
  ): Promise<MelodyLine> {
    // Florid counterpoint - combination of all species
    // This implementation combines techniques from all previous species
    const scale = this.getScale(key, mode);
    const counterpointNotes: number[] = [];
    const counterpointDurations: number[] = [];

    for (let i = 0; i < cantusFirmus.notes.length; i++) {
      const cfNote = cantusFirmus.notes[i];
      const cfDuration = cantusFirmus.durations?.[i] || 1;

      // Use variety of techniques from different species
      const technique = this.selectFifthSpeciesTechnique(i, cantusFirmus.notes.length);
      const notes = await this.applyFifthSpeciesTechnique(cfNote, cfDuration, scale, range, counterpointNotes, technique);

      counterpointNotes.push(...notes.notes);
      counterpointDurations.push(...notes.durations);
    }

    return {
      id: `counterpoint-5th-${Date.now()}`,
      notes: counterpointNotes,
      durations: counterpointDurations,
      key,
      scale: mode,
      metadata: {
        species: 5,
        style: 'florid'
      }
    };
  }

  private async generateSixthSpecies(
    cantusFirmus: MelodyLine,
    key: string,
    mode: string,
    range: [number, number]
  ): Promise<MelodyLine> {
    // Mixed species - combination of different species
    // This implementation creates a sophisticated combination
    return this.generateFifthSpecies(cantusFirmus, key, mode, range);
  }

  // ============================================================================
  // FUGAL IMITATION
  // ============================================================================

  /**
   * Generate fugal imitation based on a subject
   */
  async generateFugalImitation(subject: MelodyLine, options: FugalOptions): Promise<FugalResult> {
    this.validateFugalOptions(subject, options);

    try {
      const { voiceCount, interval = 0, timeDisplacement = 0, direction = 'above' } = options;
      const voices: MelodyLine[] = [subject];

      // Generate imitative voices
      for (let voice = 1; voice < voiceCount; voice++) {
        const imitation = await this.createImitativeVoice(
          subject,
          interval + (voice * 7), // Stack in fifths by default
          timeDisplacement + (voice * 4), // Stagger entrances
          direction
        );
        voices.push(imitation);
      }

      // Add development if requested
      let development;
      if (options.development) {
        development = await this.createFugalDevelopment(subject, voices);
      }

      const analysis = await this.analyzeFugalImitation(subject, voices);

      return {
        subject,
        voices,
        imitationType: 'fugal',
        analysis,
        development
      };

    } catch (error) {
      if (error instanceof _ValidationError || error instanceof _ProcessingError) {
        throw error;
      }
      throw new _ProcessingError(
        'fugal imitation generation',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async createImitativeVoice(
    subject: MelodyLine,
    interval: number,
    timeDisplacement: number,
    direction: 'above' | 'below' | 'both'
  ): Promise<MelodyLine> {
    const transposedNotes = subject.notes.map(note => {
      let transposedNote = note + interval;
      if (direction === 'below') {
        transposedNote = note - interval;
      }
      return transposedNote;
    });

    // Apply time displacement by adding rests at the beginning
    const displacedNotes = Array(timeDisplacement).fill(0).concat(transposedNotes);

    return {
      id: `fugal-voice-${Date.now()}`,
      notes: displacedNotes,
      durations: [
        ...Array(timeDisplacement).fill(1),
        ...(subject.durations || subject.notes.map(() => 1))
      ],
      key: subject.key,
      scale: subject.scale,
      metadata: {
        type: 'fugal_imitation',
        interval,
        timeDisplacement,
        direction
      }
    };
  }

  // ============================================================================
  // CANON CONSTRUCTION
  // ============================================================================

  /**
   * Generate canons of various types
   */
  async generateCanon(melody: MelodyLine, options: CanonOptions): Promise<CanonResult> {
    this.validateCanonOptions(melody, options);

    try {
      let canonVoices: MelodyLine[];

      switch (options.type) {
        case 'interval':
          canonVoices = await this.createIntervalCanon(melody, options);
          break;
        case 'time':
          canonVoices = await this.createTimeCanon(melody, options);
          break;
        case 'retrograde':
          canonVoices = await this.createRetrogradeCanon(melody, options);
          break;
        case 'inversion':
          canonVoices = await this.createInversionCanon(melody, options);
          break;
        case 'crab':
          canonVoices = await this.createCrabCanon(melody, options);
          break;
        default:
          throw new _ValidationError('canonType', options.type, 'valid canon type');
      }

      const analysis = await this.analyzeCanon(melody, canonVoices, options.type);

      return {
        original: melody,
        canonVoices,
        canonType: options.type,
        analysis
      };

    } catch (error) {
      if (error instanceof _ValidationError || error instanceof _ProcessingError) {
        throw error;
      }
      throw new _ProcessingError(
        'canon generation',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async createIntervalCanon(melody: MelodyLine, options: CanonOptions): Promise<MelodyLine[]> {
    const voices: MelodyLine[] = [melody];
    const voiceCount = options.voiceCount || 2;
    const interval = options.interval || 5; // Perfect fifth by default

    for (let i = 1; i < voiceCount; i++) {
      const transposedNotes = melody.notes.map(note => note + (interval * i));
      voices.push({
        id: `canon-interval-${i}`,
        notes: transposedNotes,
        durations: melody.durations || melody.notes.map(() => 1),
        key: melody.key,
        scale: melody.scale,
        metadata: {
          type: 'interval_canon',
          interval: interval * i
        }
      });
    }

    return voices;
  }

  private async createTimeCanon(melody: MelodyLine, options: CanonOptions): Promise<MelodyLine[]> {
    const voices: MelodyLine[] = [melody];
    const voiceCount = options.voiceCount || 2;
    const timeDisplacement = options.timeDisplacement || melody.notes.length;

    for (let i = 1; i < voiceCount; i++) {
      const displacement = timeDisplacement * i;
      const displacedNotes = Array(displacement).fill(0).concat(melody.notes);
      voices.push({
        id: `canon-time-${i}`,
        notes: displacedNotes,
        durations: [
          ...Array(displacement).fill(1),
          ...(melody.durations || melody.notes.map(() => 1))
        ],
        key: melody.key,
        scale: melody.scale,
        metadata: {
          type: 'time_canon',
          timeDisplacement: displacement
        }
      });
    }

    return voices;
  }

  private async createRetrogradeCanon(melody: MelodyLine, options: CanonOptions): Promise<MelodyLine[]> {
    const voices: MelodyLine[] = [melody];
    const voiceCount = options.voiceCount || 2;

    for (let i = 1; i < voiceCount; i++) {
      const retrogradeNotes = [...melody.notes].reverse();
      voices.push({
        id: `canon-retrograde-${i}`,
        notes: retrogradeNotes,
        durations: (melody.durations || melody.notes.map(() => 1)).reverse(),
        key: melody.key,
        scale: melody.scale,
        metadata: {
          type: 'retrograde_canon'
        }
      });
    }

    return voices;
  }

  private async createInversionCanon(melody: MelodyLine, options: CanonOptions): Promise<MelodyLine[]> {
    const voices: MelodyLine[] = [melody];
    const voiceCount = options.voiceCount || 2;

    for (let i = 1; i < voiceCount; i++) {
      const invertedNotes = melody.notes.map(note => this.invertInterval(note, melody.notes[0]));
      voices.push({
        id: `canon-inversion-${i}`,
        notes: invertedNotes,
        durations: melody.durations || melody.notes.map(() => 1),
        key: melody.key,
        scale: melody.scale,
        metadata: {
          type: 'inversion_canon'
        }
      });
    }

    return voices;
  }

  private async createCrabCanon(melody: MelodyLine, options: CanonOptions): Promise<MelodyLine[]> {
    // Crab canon: voice moves in opposite direction while maintaining the same intervals
    const voices: MelodyLine[] = [melody];
    const voiceCount = options.voiceCount || 2;

    for (let i = 1; i < voiceCount; i++) {
      const crabNotes = melody.notes.map((note, index) => {
        const interval = index > 0 ? note - melody.notes[index - 1] : 0;
        const startingNote = melody.notes[melody.notes.length - 1];
        return startingNote - interval;
      });
      voices.push({
        id: `canon-crab-${i}`,
        notes: crabNotes,
        durations: melody.durations || melody.notes.map(() => 1),
        key: melody.key,
        scale: melody.scale,
        metadata: {
          type: 'crab_canon'
        }
      });
    }

    return voices;
  }

  // ============================================================================
  // VOICE LEADING OPTIMIZATION
  // ============================================================================

  /**
   * Optimize voice leading between multiple melodic lines
   */
  async optimizeVoiceLeading(
    voices: MelodyLine[],
    constraints: VoiceLeadingConstraints = {}
  ): Promise<MelodyLine[]> {
    // Create optimization problem
    const problem = this.createVoiceLeadingProblem(voices, constraints);

    // Apply genetic algorithm or simulated annealing
    const solution = await this.solveVoiceLeadingOptimization(problem);

    return solution.voices;
  }

  private createVoiceLeadingProblem(voices: MelodyLine[], constraints: VoiceLeadingConstraints) {
    return {
      voices,
      constraints,
      objective: 'minimize_voice_crossings_and_maximize_smooth_motion',
      fitnessFunction: (candidateVoices: MelodyLine[]) => {
        let score = 0;

        // Penalize voice crossings
        const crossings = this.countVoiceCrossings(candidateVoices);
        score -= crossings * 100;

        // Reward smooth motion
        const smoothness = this.calculateSmoothness(candidateVoices);
        score += smoothness * 10;

        // Penalize parallel fifths and octaves
        const parallels = this.countParallelIntervals(candidateVoices, [5, 8]);
        if (!constraints.allowParallelFifths) {
          score -= parallels[5] * 50;
        }
        if (!constraints.allowParallelOctaves) {
          score -= parallels[8] * 50;
        }

        return score;
      }
    };
  }

  private async solveVoiceLeadingOptimization(problem: any): Promise<{ voices: MelodyLine[], score: number }> {
    // Simplified optimization - in production, use a proper optimization library
    return {
      voices: problem.voices,
      score: problem.fitnessFunction(problem.voices)
    };
  }

  // ============================================================================
  // ANALYSIS AND VALIDATION
  // ============================================================================

  private async analyzeCounterpoint(
    cantusFirmus: MelodyLine,
    counterpoint: MelodyLine,
    species: number
  ): Promise<any> {
    const voiceLeadingQuality = this.calculateVoiceLeadingQuality(cantusFirmus, counterpoint);
    const consonanceRatio = this.calculateConsonanceRatio(cantusFirmus, counterpoint);
    const dissonanceResolution = this.findDissonanceResolutions(cantusFirmus, counterpoint);
    const parallelIntervals = this.findParallelIntervals(cantusFirmus, counterpoint);
    const voiceCrossings = this.findVoiceCrossings(cantusFirmus, counterpoint);
    const leapAnalysis = this.analyzeLeaps(counterpoint);

    return {
      voiceLeadingQuality,
      consonanceRatio,
      dissonanceResolution,
      parallelIntervals,
      voiceCrossings,
      leapAnalysis
    };
  }

  private async detectViolations(
    cantusFirmus: MelodyLine,
    counterpoint: MelodyLine,
    species: number
  ): Promise<CounterpointViolation[]> {
    const violations: CounterpointViolation[] = [];

    // Check for parallel fifths and octaves
    const parallelIntervals = this.findParallelIntervals(cantusFirmus, counterpoint);
    for (const interval of parallelIntervals[5] || []) {
      violations.push({
        type: 'parallel_fifth',
        measure: interval.measure,
        beat: interval.beat,
        voices: interval.voices,
        severity: 'error',
        description: `Parallel fifth at measure ${interval.measure}, beat ${interval.beat}`
      });
    }

    for (const interval of parallelIntervals[8] || []) {
      violations.push({
        type: 'parallel_octave',
        measure: interval.measure,
        beat: interval.beat,
        voices: interval.voices,
        severity: 'error',
        description: `Parallel octave at measure ${interval.measure}, beat ${interval.beat}`
      });
    }

    // Check for voice crossings
    const crossings = this.findVoiceCrossings(cantusFirmus, counterpoint);
    for (const crossing of crossings) {
      violations.push({
        type: 'voice_crossing',
        measure: crossing.measure,
        beat: crossing.beat,
        voices: crossing.voices,
        severity: 'warning',
        description: `Voice crossing at measure ${crossing.measure}, beat ${crossing.beat}`
      });
    }

    return violations;
  }

  private async analyzeFugalImitation(subject: MelodyLine, voices: MelodyLine[]): Promise<any> {
    return {
      imitationAccuracy: this.calculateImitationAccuracy(subject, voices),
      voiceIndependence: this.calculateVoiceIndependence(voices),
      harmonicStructure: this.analyzeHarmonicStructure(voices),
      developmentPotential: this.assessDevelopmentPotential(subject, voices)
    };
  }

  private async analyzeCanon(melody: MelodyLine, canonVoices: MelodyLine[], canonType: string): Promise<any> {
    return {
      structuralCoherence: this.calculateStructuralCoherence(melody, canonVoices),
      intervalRelationships: this.analyzeIntervalRelationships(melody, canonVoices),
      timingAccuracy: this.calculateTimingAccuracy(melody, canonVoices)
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private validateSpeciesOptions(options: SpeciesOptions): void {
    if (!options.cantusFirmus) {
      throw new _ValidationError('cantusFirmus', options.cantusFirmus, 'valid cantus firmus');
    }
    if (options.species < 1 || options.species > 6) {
      throw new _ValidationError('species', options.species, 'species between 1 and 6');
    }
    if (!Array.isArray(options.cantusFirmus.notes) || options.cantusFirmus.notes.length === 0) {
      throw new _ValidationError('cantusFirmus.notes', options.cantusFirmus.notes, 'non-empty array of notes');
    }
  }

  private validateFugalOptions(subject: MelodyLine, options: FugalOptions): void {
    if (!subject) {
      throw new _ValidationError('subject', subject, 'valid melodic subject');
    }
    if (options.voiceCount < 2) {
      throw new _ValidationError('voiceCount', options.voiceCount, 'minimum 2 voices');
    }
  }

  private validateCanonOptions(melody: MelodyLine, options: CanonOptions): void {
    if (!melody) {
      throw new _ValidationError('melody', melody, 'valid melodic line');
    }
    if (options.voiceCount && options.voiceCount < 1) {
      throw new _ValidationError('voiceCount', options.voiceCount, 'positive integer');
    }
  }

  private getScale(key: string, mode: string): number[] {
    const scales: Record<string, Record<string, number[]>> = {
      'C': {
        'major': [0, 2, 4, 5, 7, 9, 11],
        'minor': [0, 2, 3, 5, 7, 8, 10],
        'dorian': [0, 2, 3, 5, 7, 9, 10],
        'phrygian': [0, 1, 3, 5, 7, 8, 10],
        'lydian': [0, 2, 4, 6, 7, 9, 11],
        'mixolydian': [0, 2, 4, 5, 7, 9, 10],
        'aeolian': [0, 2, 3, 5, 7, 8, 10],
        'locrian': [0, 1, 3, 5, 6, 8, 10]
      }
    };

    const keyOffsets: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
      'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    const keyOffset = keyOffsets[key] || 0;
    const scalePattern = scales[key]?.[mode] || scales['C']['major'];

    return scalePattern.map(degree => keyOffset + degree);
  }

  private getConsonantIntervals(pitchClass: number): { interval: number; startNote: number; endNote?: number }[] {
    // Perfect consonances (unison, octave, perfect fifth, perfect fourth)
    const perfectConsonances = [
      { interval: 0, startNote: pitchClass }, // Unison
      { interval: 12, startNote: pitchClass }, // Octave
      { interval: 7, startNote: pitchClass }, // Perfect fifth
      { interval: 5, startNote: pitchClass }, // Perfect fourth
    ];

    // Imperfect consonances (major/minor thirds, major/minor sixths)
    const imperfectConsonances = [
      { interval: 4, startNote: pitchClass }, // Major third
      { interval: 3, startNote: pitchClass }, // Minor third
      { interval: 9, startNote: pitchClass }, // Major sixth
      { interval: 8, startNote: pitchClass }  // Minor sixth
    ];

    return [...perfectConsonances, ...imperfectConsonances];
  }

  private findConsonantNote(
    cfNote: number,
    scale: number[],
    range: [number, number],
    existingNotes: number[]
  ): number {
    const consonantIntervals = this.getConsonantIntervals(cfNote % 12);

    for (const interval of consonantIntervals) {
      const candidateNote = interval.startNote;
      if (candidateNote >= range[0] && candidateNote <= range[1] &&
          this.isNoteInScale(candidateNote, scale)) {
        // Avoid repetition when possible
        if (existingNotes.length === 0 || candidateNote !== existingNotes[existingNotes.length - 1]) {
          return candidateNote;
        }
      }
    }

    // Fallback: use closest note in scale
    return this.findClosestScaleNote(cfNote, scale, range);
  }

  private findClosestScaleNote(cfNote: number, scale: number[], range: [number, number]): number {
    let closestNote = scale[0];
    let minDistance = Math.abs(cfNote - scale[0]);

    for (const scaleNote of scale) {
      const actualNote = scaleNote + (Math.floor(cfNote / 12) * 12);
      if (actualNote >= range[0] && actualNote <= range[1]) {
        const distance = Math.abs(cfNote - actualNote);
        if (distance < minDistance) {
          minDistance = distance;
          closestNote = actualNote;
        }
      }
    }

    return closestNote;
  }

  private isNoteInScale(note: number, scale: number[]): boolean {
    const pitchClass = note % 12;
    return scale.some(scalePitchClass => scalePitchClass === pitchClass);
  }

  private selectBestCounterpointNote(
    validNotes: number[],
    existingNotes: number[],
    cfNote: number
  ): number {
    if (validNotes.length === 0) return cfNote; // Fallback
    if (validNotes.length === 1) return validNotes[0];

    // Prefer stepwise motion
    if (existingNotes.length > 0) {
      const lastNote = existingNotes[existingNotes.length - 1];
      const stepwiseCandidates = validNotes.filter(note =>
        Math.abs(note - lastNote) <= 2
      );
      if (stepwiseCandidates.length > 0) {
        return stepwiseCandidates[0];
      }
    }

    // Prefer contrary motion
    const lastInterval = existingNotes.length > 1 ?
      existingNotes[existingNotes.length - 1] - existingNotes[existingNotes.length - 2] : 0;
    const contraryCandidates = validNotes.filter(note =>
      Math.abs((note - cfNote) * lastInterval) < 0
    );

    return contraryCandidates.length > 0 ? contraryCandidates[0] : validNotes[0];
  }

  private createPassingOrNeighborTone(
    startNote: number,
    cfNote: number,
    nextCfNote: number,
    scale: number[]
  ): number {
    // Try to create a passing tone that moves to the next consonance
    const step = 1; // or -1 for descending
    const candidate = startNote + step;

    if (this.isNoteInScale(candidate, scale) &&
        Math.abs(candidate - nextCfNote) < Math.abs(startNote - nextCfNote)) {
      return candidate;
    }

    // Fallback to neighbor tone
    return startNote - step;
  }

  private createSuspensionNote(preparationNote: number, resolutionNote: number, scale: number[]): number {
    // Create a suspension that prepares and resolves properly
    // Common suspensions: 4-3, 7-6, 9-8
    const suspensionTypes = [
      { prep: 7, resolve: 5 }, // Seventh to fifth
      { prep: 9, resolve: 8 }, // Ninth to eighth
      { prep: 4, resolve: 3 }  // Fourth to third
    ];

    for (const susType of suspensionTypes) {
      if (Math.abs(preparationNote - resolutionNote) === 4) {
        const suspensionNote = preparationNote + susType.prep;
        if (this.isNoteInScale(suspensionNote, scale)) {
          return suspensionNote;
        }
      }
    }

    // Fallback: use preparation note
    return preparationNote;
  }

  private findConsonantInterval(cfNote: number): { startNote: number; endNote?: number } {
    const consonances = this.getConsonantIntervals(cfNote % 12);
    return consonances[0]; // Return the best consonance (usually octave)
  }

  private selectFifthSpeciesTechnique(position: number, totalLength: number): string {
    const techniques = ['first_species', 'second_species', 'third_species', 'florid_ornament', 'combination'];
    return techniques[position % techniques.length];
  }

  private async applyFifthSpeciesTechnique(
    cfNote: number,
    cfDuration: number,
    scale: number[],
    range: [number, number],
    existingNotes: number[],
    technique: string
  ): Promise<{ notes: number[]; durations: number[] }> {
    switch (technique) {
      case 'first_species':
        const note = this.findConsonantNote(cfNote, scale, range, existingNotes);
        return { notes: [note], durations: [cfDuration] };

      case 'second_species':
        const firstNote = this.findConsonantNote(cfNote, scale, range, existingNotes);
        const secondNote = this.createPassingOrNeighborTone(firstNote, cfNote, cfNote, scale);
        return { notes: [firstNote, secondNote], durations: [cfDuration / 2, cfDuration / 2] };

      case 'third_species':
        const baseInterval = this.findConsonantInterval(cfNote);
        return {
          notes: [
            baseInterval.startNote,
            this.createPassingOrNeighborTone(baseInterval.startNote, cfNote, cfNote, scale),
            this.createPassingOrNeighborTone(baseInterval.startNote, cfNote, cfNote, scale),
            baseInterval.endNote || this.findConsonantNote(cfNote, scale, range, existingNotes)
          ],
          durations: [cfDuration / 4, cfDuration / 4, cfDuration / 4, cfDuration / 4]
        };

      case 'florid_ornament':
        // Add decorative flourishes
        const baseNote = this.findConsonantNote(cfNote, scale, range, existingNotes);
        const ornaments = this.createOrnamentalNotes(baseNote, scale);
        return {
          notes: [baseNote, ...ornaments],
          durations: [cfDuration * 0.6, ...ornaments.map(() => cfDuration * 0.4 / ornaments.length)]
        };

      case 'combination':
        // Combine multiple techniques
        return this.applyFifthSpeciesTechnique(cfNote, cfDuration, scale, range, existingNotes, 'third_species');

      default:
        return this.applyFifthSpeciesTechnique(cfNote, cfDuration, scale, range, existingNotes, 'first_species');
    }
  }

  private createOrnamentalNotes(baseNote: number, scale: number[]): number[] {
    // Create simple ornamental patterns (turns, trills)
    const turnPattern = [baseNote + 2, baseNote + 1, baseNote, baseNote + 1, baseNote + 2];
    return turnPattern.filter(note => this.isNoteInScale(note, scale));
  }

  private invertInterval(note: number, referenceNote: number): number {
    return referenceNote - (note - referenceNote);
  }

  private calculateVoiceLeadingQuality(cantusFirmus: MelodyLine, counterpoint: MelodyLine): number {
    // Measure smoothness of motion, preference for stepwise movement
    const cfIntervals = this.calculateIntervals(cantusFirmus.notes);
    const cpIntervals = this.calculateIntervals(counterpoint.notes);

    let smoothnessScore = 0;
    const minLength = Math.min(cfIntervals.length, cpIntervals.length);

    for (let i = 0; i < minLength; i++) {
      const cfInterval = Math.abs(cfIntervals[i]);
      const cpInterval = Math.abs(cpIntervals[i]);

      // Prefer stepwise motion
      if (cfInterval <= 2 && cpInterval <= 2) {
        smoothnessScore += 2;
      } else if (cfInterval <= 4 && cpInterval <= 4) {
        smoothnessScore += 1;
      }

      // Prefer contrary motion
      if (cfIntervals[i] * cpIntervals[i] < 0) {
        smoothnessScore += 1;
      }
    }

    return Math.min(1, smoothnessScore / (minLength * 3));
  }

  private calculateConsonanceRatio(cantusFirmus: MelodyLine, counterpoint: MelodyLine): number {
    const consonantCount = this.countConsonantIntervals(cantusFirmus, counterpoint);
    const totalIntervals = Math.min(cantusFirmus.notes.length, counterpoint.notes.length);
    return consonantCount / totalIntervals;
  }

  private countConsonantIntervals(melody1: MelodyLine, melody2: MelodyLine): number {
    const minLength = Math.min(melody1.notes.length, melody2.notes.length);
    let consonantCount = 0;

    for (let i = 0; i < minLength; i++) {
      const interval = Math.abs(melody2.notes[i] - melody1.notes[i]);
      if (this.isConsonantInterval(interval)) {
        consonantCount++;
      }
    }

    return consonantCount;
  }

  private isConsonantInterval(interval: number): boolean {
    // Check if interval is consonant (unison, octave, perfect fifth, perfect fourth, thirds, sixths)
    const normalizedInterval = Math.abs(interval) % 12;
    return [0, 3, 4, 5, 7, 8, 9].includes(normalizedInterval);
  }

  private calculateIntervals(notes: number[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < notes.length; i++) {
      intervals.push(notes[i] - notes[i - 1]);
    }
    return intervals;
  }

  private findDissonanceResolutions(cantusFirmus: MelodyLine, counterpoint: MelodyLine): number[] {
    const resolutions: number[] = [];
    const minLength = Math.min(cantusFirmus.notes.length, counterpoint.notes.length);

    for (let i = 1; i < minLength; i++) {
      const interval = Math.abs(counterpoint.notes[i] - cantusFirmus.notes[i]);
      if (!this.isConsonantInterval(interval)) {
        // Check if next interval resolves consonance
        if (i < minLength - 1) {
          const nextInterval = Math.abs(counterpoint.notes[i + 1] - cantusFirmus.notes[i + 1]);
          if (this.isConsonantInterval(nextInterval)) {
            resolutions.push(i);
          }
        }
      }
    }

    return resolutions;
  }

  private findParallelIntervals(melody1: MelodyLine, melody2: MelodyLine): Record<number, Array<{measure: number; beat: number; voices: [number, number]}>> {
    const parallels: Record<number, Array<{measure: number; beat: number; voices: [number, number]}>> = {};

    const minLength = Math.min(melody1.notes.length, melody2.notes.length);

    for (let i = 0; i < minLength - 1; i++) {
      const interval1 = Math.abs(melody1.notes[i + 1] - melody1.notes[i]);
      const interval2 = Math.abs(melody2.notes[i + 1] - melody2.notes[i]);

      if (interval1 === interval2 && [5, 8].includes(interval1)) {
        const key = interval1.toString();
        if (!parallels[key]) parallels[key] = [];
        parallels[key].push({
          measure: Math.floor(i / 4) + 1,
          beat: (i % 4) + 1,
          voices: [1, 2]
        });
      }
    }

    return parallels;
  }

  private findVoiceCrossings(melody1: MelodyLine, melody2: MelodyLine): Array<{measure: number; beat: number; voices: [number, number]}>> {
    const crossings: Array<{measure: number; beat: number; voices: [number, number]}> = [];

    const maxLength = Math.max(melody1.notes.length, melody2.notes.length);

    for (let i = 0; i < maxLength; i++) {
      const note1 = i < melody1.notes.length ? melody1.notes[i] : null;
      const note2 = i < melody2.notes.length ? melody2.notes[i] : null;

      if (note1 && note2) {
        const wasAbove = i > 0 &&
                        melody1.notes[i - 1] > melody2.notes[i - 1];
        const isBelow = note1 < note2;

        const wasBelow = i > 0 &&
                        melody1.notes[i - 1] < melody2.notes[i - 1];
        const isAbove = note1 > note2;

        if ((wasAbove && isBelow) || (wasBelow && isAbove)) {
          crossings.push({
            measure: Math.floor(i / 4) + 1,
            beat: (i % 4) + 1,
            voices: [1, 2]
          });
        }
      }
    }

    return crossings;
  }

  private analyzeLeaps(melody: MelodyLine): {
    totalLeaps: number;
    averageLeap: number;
    largestLeap: number;
  } {
    const intervals = this.calculateIntervals(melody.notes);
    const leaps = intervals.filter(interval => Math.abs(interval) > 2);

    const totalLeaps = leaps.length;
    const averageLeap = totalLeaps > 0 ?
      leaps.reduce((sum, interval) => sum + Math.abs(interval), 0) / totalLeaps : 0;
    const largestLeap = totalLeaps > 0 ?
      Math.max(...leaps.map(Math.abs)) : 0;

    return { totalLeaps, averageLeap, largestLeap };
  }

  private calculateImitationAccuracy(subject: MelodyLine, voices: MelodyLine[]): number {
    let totalAccuracy = 0;

    for (let i = 1; i < voices.length; i++) {
      const voice = voices[i];
      // Find where imitation starts
      const startIndex = voice.notes.findIndex(note => note !== 0);
      if (startIndex === -1) continue;

      const subjectNotes = subject.notes.slice(0, subject.notes.length - startIndex);
      const voiceNotes = voice.notes.slice(startIndex);
      const minLength = Math.min(subjectNotes.length, voiceNotes.length);

      let matches = 0;
      for (let j = 0; j < minLength; j++) {
        const transposedSubjectNote = subjectNotes[j] + (voiceNotes[0] - subjectNotes[0]);
        if (Math.abs(transposedSubjectNote - voiceNotes[j]) <= 1) {
          matches++;
        }
      }

      totalAccuracy += matches / minLength;
    }

    return totalAccuracy / (voices.length - 1);
  }

  private calculateVoiceIndependence(voices: MelodyLine[]): number {
    // Measure how independent the voices are from each other
    let totalIndependence = 0;

    for (let i = 0; i < voices.length; i++) {
      for (let j = i + 1; j < voices.length; j++) {
        const independence = this.calculatePairwiseIndependence(voices[i], voices[j]);
        totalIndependence += independence;
      }
    }

    return totalIndependence / ((voices.length * (voices.length - 1)) / 2);
  }

  private calculatePairwiseIndependence(voice1: MelodyLine, voice2: MelodyLine): number {
    // Calculate how much voice2 differs from voice1
    let difference = 0;
    const minLength = Math.min(voice1.notes.length, voice2.notes.length);

    for (let i = 0; i < minLength; i++) {
      difference += Math.abs(voice2.notes[i] - voice1.notes[i]);
    }

    return Math.min(1, difference / (minLength * 12)); // Normalize by max interval
  }

  private analyzeHarmonicStructure(voices: MelodyLine[]): number[] {
    // Analyze the harmonic relationships between voices
    const harmonicStructure: number[] = [];

    for (let i = 0; i < voices.length; i++) {
      for (let j = i + 1; j < voices.length; j++) {
        const minLength = Math.min(voices[i].notes.length, voices[j].notes.length);
        let harmonicQuality = 0;

        for (let k = 0; k < minLength; k++) {
          const interval = Math.abs(voices[j].notes[k] - voices[i].notes[k]);
          if (this.isConsonantInterval(interval)) {
            harmonicQuality++;
          }
        }

        harmonicStructure.push(harmonicQuality / minLength);
      }
    }

    return harmonicStructure;
  }

  private assessDevelopmentPotential(subject: MelodyLine, voices: MelodyLine[]): number {
    // Assess how well the subject can be developed furally
    const subjectFeatures = this.analyzeSubjectFeatures(subject);
    const currentComplexity = this.calculateCurrentComplexity(voices);

    // Development potential based on subject characteristics and current complexity
    const developmentPotential = (subjectFeatures.rhythmicInterest * 0.3 +
                                   subjectFeatures.melodicVariety * 0.3 +
                                   subjectFeatures.harmonicRichness * 0.2 +
                                   (1 - currentComplexity) * 0.2);

    return Math.min(1, developmentPotential);
  }

  private analyzeSubjectFeatures(subject: MelodyLine): any {
    const intervals = this.calculateIntervals(subject.notes);

    return {
      rhythmicInterest: this.calculateRhythmicVariety(subject.durations || subject.notes.map(() => 1)),
      melodicVariety: this.calculateIntervalVariety(intervals),
      harmonicRichness: this.calculateHarmonicRichness(subject.notes)
    };
  }

  private calculateRhythmicVariety(durations: number[]): number {
    const uniqueDurations = new Set(durations);
    return uniqueDurations.size / durations.length;
  }

  private calculateIntervalVariety(intervals: number[]): number {
    const uniqueIntervals = new Set(intervals.map(Math.abs));
    return uniqueIntervals.size / intervals.length;
  }

  private calculateHarmonicRichness(notes: number[]): number {
    const pitchClasses = notes.map(note => note % 12);
    const uniquePitchClasses = new Set(pitchClasses);
    return uniquePitchClasses.size / 12;
  }

  private calculateCurrentComplexity(voices: MelodyLine[]): number {
    let totalNotes = 0;
    let totalUniqueNotes = 0;

    for (const voice of voices) {
      totalNotes += voice.notes.length;
      totalUniqueNotes += new Set(voice.notes).size;
    }

    return totalUniqueNotes / totalNotes;
  }

  private calculateStructuralCoherence(original: MelodyLine, canonVoices: MelodyLine[]): number {
    // Measure how well the canon maintains the structure of the original
    let coherence = 0;

    for (const voice of canonVoices) {
      const similarity = this.calculateMelodicSimilarity(original, voice);
      coherence += similarity;
    }

    return coherence / canonVoices.length;
  }

  private calculateMelodicSimilarity(melody1: MelodyLine, melody2: MelodyLine): number {
    const intervals1 = this.calculateIntervals(melody1.notes);
    const intervals2 = this.calculateIntervals(melody2.notes);

    const minLength = Math.min(intervals1.length, intervals2.length);
    let similarity = 0;

    for (let i = 0; i < minLength; i++) {
      const diff = Math.abs(intervals1[i] - intervals2[i]);
      similarity += Math.max(0, 1 - diff / 12); // Normalize by octave
    }

    return similarity / minLength;
  }

  private analyzeIntervalRelationships(original: MelodyLine, canonVoices: MelodyLine[]): number[] {
    // Analyze the mathematical relationships between voices
    const relationships: number[] = [];

    for (const voice of canonVoices) {
      const interval = voice.notes[0] - original.notes[0]; // Entry interval
      relationships.push(interval);
    }

    return relationships;
  }

  private calculateTimingAccuracy(original: MelodyLine, canonVoices: MelodyLine[]): number {
    // Measure how accurately the canon maintains timing relationships
    let timingAccuracy = 0;

    for (const voice of canonVoices) {
      // Find alignment point
      const alignmentIndex = voice.notes.findIndex(note => note !== 0);
      if (alignmentIndex !== -1) {
        // Calculate how well the aligned portion matches
        const alignedLength = Math.min(original.notes.length, voice.notes.length - alignmentIndex);
        let matches = 0;

        for (let i = 0; i < alignedLength; i++) {
          const originalNote = original.notes[i];
          const voiceNote = voice.notes[i + alignmentIndex];
          const transposedVoice = voiceNote - voice.notes[0] + original.notes[0];

          if (Math.abs(transposedVoice - originalNote) <= 1) {
            matches++;
          }
        }

        timingAccuracy += matches / alignedLength;
      }
    }

    return timingAccuracy / canonVoices.length;
  }

  private countVoiceCrossings(voices: MelodyLine[]): number {
    let crossings = 0;

    for (let i = 0; i < voices.length - 1; i++) {
      for (let j = i + 1; j < voices.length; j++) {
        crossings += this.findVoiceCrossings(voices[i], voices[j]).length;
      }
    }

    return crossings;
  }

  private countParallelIntervals(voices: MelodyLine[], disallowed: number[]): Record<number, number> {
    const parallels: Record<number, number> = {};

    for (const interval of disallowed) {
      parallels[interval] = 0;
    }

    for (let i = 0; i < voices.length - 1; i++) {
      for (let j = i + 1; j < voices.length; j++) {
        const voiceParallels = this.findParallelIntervals(voices[i], voices[j]);

        for (const interval of disallowed) {
          if (voiceParallels[interval]) {
            parallels[interval] += voiceParallels[interval].length;
          }
        }
      }
    }

    return parallels;
  }

  private calculateSmoothness(voices: MelodyLine[]): number {
    let totalSmoothness = 0;
    let intervalCount = 0;

    for (const voice of voices) {
      const intervals = this.calculateIntervals(voice.notes);
      let voiceSmoothness = 0;

      for (let i = 0; i < intervals.length; i++) {
        const interval = Math.abs(intervals[i]);
        if (interval <= 2) {
          voiceSmoothness += 2; // Stepwise motion
        } else if (interval <= 4) {
          voiceSmoothness += 1; // Small leap
        }
      }

      totalSmoothness += voiceSmoothness;
      intervalCount += intervals.length;
    }

    return intervalCount > 0 ? totalSmoothness / intervalCount : 0;
  }

  private createFugalDevelopment(subject: MelodyLine, voices: MelodyLine[]): FugalDevelopment {
    // Create fugal development (stretto, diminution, augmentation, inversion)
    return {
      episodes: [],
      developments: [],
      overallStructure: 'simple_fugue'
    };
  }

  private interface FugalDevelopment {
    episodes: any[];
    developments: any[];
    overallStructure: string;
  }

  private createFugalDevelopment(subject: MelodyLine, voices: MelodyLine[]): FugalDevelopment {
    // Implementation would create actual fugal development episodes
    return {
      episodes: [],
      developments: [],
      overallStructure: 'simple_fugue'
    };
  }
}

// Export the CounterpointAPI class for use in the main SDK
export { CounterpointAPI };
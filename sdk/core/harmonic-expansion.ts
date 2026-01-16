/**
 * Advanced Harmonic Expansion Engine for Schillinger System
 * Book 3: Harmony - Section 4: Harmonic Expansion Operations
 */

export interface HarmonicElement {
  pitch: number; // MIDI note number
  root: number; // Root of the harmony
  quality: string; // major, minor, diminished, augmented, etc.
  tension: number; // 0-1 harmonic tension
  function: string; // tonic, dominant, subdominant, etc.
  inversion: number; // 0=root position, 1=first inversion, etc.
}

export interface HarmonicField {
  elements: HarmonicElement[];
  key: string;
  mode: string; // major, minor, dorian, etc.
  tonalCenter: number; // Root of the key
  stability: number; // 0-1 how stable this field is
  tension: number; // 0-1 overall tension level
}

export interface Polychord {
  chords: HarmonicElement[][];
  intervals: number[]; // Intervals between chord roots
  density: number; // 0-1 how dense the polychord is
  clarity: number; // 0-1 how clear the individual voices are
  tension: number; // 0-1 overall polychord tension
}

export interface TensionModel {
  dissonance: number; // 0-1 harmonic dissonance
  voiceLeading: number; // 0-1 voice leading quality
  functional: number; // 0-1 functional harmony compliance
  chromatic: number; // 0-1 chromatic alteration level
  rhythmic: number; // 0-1 rhythmic tension contribution
  total: number; // Combined tension score
}

export interface HarmonicExpansion {
  originalHarmony: HarmonicElement[];
  expandedHarmony: HarmonicElement[];
  expansionType: HarmonicExpansionType;
  parameters: HarmonicExpansionParameters;
  analysis: TensionModel;
  quality: number; // 0-1 overall quality
}

export type HarmonicExpansionType =
  | "parallel"
  | "contrary"
  | "oblique"
  | "mixed"
  | "rotational"
  | "retrograde"
  | "invertible"
  | "pandiatonic"
  | "chromatic"
  | "polychordal"
  | "tension_based"
  | "functional";

export interface HarmonicExpansionParameters {
  type: HarmonicExpansionType;
  intensity: number; // 0-1 strength of expansion
  preserveFunction?: boolean; // Keep original harmonic functions
  targetTension?: number; // Target tension level
  voiceLeadingConstraints?: HarmonicHarmonicVoiceLeadingConstraints;
  harmonicLimits?: HarmonicLimits;
}

export interface HarmonicHarmonicVoiceLeadingConstraints {
  maxInterval?: number; // Maximum interval between voices
  avoidParallelFifths?: boolean;
  avoidOctaveDoubling?: boolean;
  preferContraryMotion?: boolean;
  maxLeap?: number; // Maximum melodic leap
  resolutionPreference?: number; // 0-1 preference for resolution
}

export interface HarmonicLimits {
  minDensity?: number; // Minimum voices in harmony
  maxDensity?: number; // Maximum voices in harmony
  allowedQualities?: string[]; // Allowed chord qualities
  avoidAugmented?: boolean;
  avoidDiminished?: boolean;
  allowPolychords?: boolean;
}

export interface HarmonicAnalysis {
  tensionProfile: TensionModel[];
  functionAnalysis: {
    progression: string[];
    modulations: HarmonicModulation[];
    cadences: HarmonicCadence[];
    stability: number;
  };
  voiceLeading: {
    parallelMotion: number; // Percentage of parallel motion
    contraryMotion: number; // Percentage of contrary motion
    obliqueMotion: number; // Percentage of oblique motion
    resolutionQuality: number; // 0-1 quality of resolutions
  };
  structural: {
    symmetry: number; // 0-1 harmonic symmetry
    balance: number; // 0-1 voice balance
    clarity: number; // 0-1 harmonic clarity
    complexity: number; // 0-1 structural complexity
  };
}

export interface HarmonicModulation {
  fromKey: string;
  toKey: string;
  pivotChords: HarmonicElement[];
  type: "diatonic" | "chromatic" | "enharmonic";
  strength: number; // 0-1 how clearly modulated
}

export interface HarmonicCadence {
  type: "authentic" | "plagal" | "half" | "deceptive" | "picardy";
  strength: number; // 0-1 cadential strength
  resolution: number; // 0-1 resolution quality
}

/**
 * Advanced Harmonic Expansion Engine
 *
 * Mathematical engine for generating and analyzing complex harmonic expansions
 * based on Schillinger's comprehensive harmonic theory.
 */
export class HarmonicExpansionEngine {
  private static readonly INTERVAL_TENSIONS: Map<number, number> = new Map([
    [0, 0], // Unison
    [1, 0.9], // Minor second
    [2, 0.4], // Major second
    [3, 0.6], // Minor third
    [4, 0.1], // Major third
    [5, 0.8], // Perfect fourth
    [6, 1.0], // Tritone
    [7, 0.1], // Perfect fifth
    [8, 0.3], // Minor sixth
    [9, 0.2], // Major sixth
    [10, 0.7], // Minor seventh
    [11, 0.5], // Major seventh
    [12, 0], // Octave
  ]);

  /**
   * Generate harmonic expansion using various expansion types
   */
  static expandHarmony(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicExpansion {
    let expandedHarmony: HarmonicElement[];
    let analysis: TensionModel;

    switch (parameters.type) {
      case "parallel":
        expandedHarmony = this.createParallelExpansion(harmony, parameters);
        break;
      case "contrary":
        expandedHarmony = this.createContraryExpansion(harmony, parameters);
        break;
      case "oblique":
        expandedHarmony = this.createObliqueExpansion(harmony, parameters);
        break;
      case "mixed":
        expandedHarmony = this.createMixedExpansion(harmony, parameters);
        break;
      case "rotational":
        expandedHarmony = this.createRotationalExpansion(harmony, parameters);
        break;
      case "retrograde":
        expandedHarmony = this.createRetrogradeExpansion(harmony, parameters);
        break;
      case "invertible":
        expandedHarmony = this.createInvertibleExpansion(harmony, parameters);
        break;
      case "pandiatonic":
        expandedHarmony = this.createPandiatonicExpansion(harmony, parameters);
        break;
      case "chromatic":
        expandedHarmony = this.createChromaticExpansion(harmony, parameters);
        break;
      case "polychordal":
        expandedHarmony = this.createPolychordalExpansion(harmony, parameters);
        break;
      case "tension_based":
        expandedHarmony = this.createTensionBasedExpansion(harmony, parameters);
        break;
      case "functional":
        expandedHarmony = this.createFunctionalExpansion(harmony, parameters);
        break;
      default:
        throw new Error(`Unknown expansion type: ${parameters.type}`);
    }

    analysis = this.calculateTensionModel(expandedHarmony);
    const quality = this.calculateExpansionQuality(
      harmony,
      expandedHarmony,
      analysis,
    );

    return {
      originalHarmony: harmony,
      expandedHarmony,
      expansionType: parameters.type,
      parameters,
      analysis,
      quality,
    };
  }

  /**
   * Create parallel harmonic expansion (all voices move in same direction)
   */
  private static createParallelExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const interval = Math.round(parameters.intensity * 7); // Interval up to a tritone
    const direction = Math.random() > 0.5 ? 1 : -1;

    return harmony.map((element) => ({
      ...element,
      pitch: element.pitch + direction * interval,
      tension: Math.min(1, element.tension + Math.abs(interval) * 0.1),
      function: parameters.preserveFunction
        ? element.function
        : this.analyzeFunction(
            element.pitch + direction * interval,
            element.root,
          ),
      inversion: (element.inversion + direction * 2) % 4,
    }));
  }

  /**
   * Create contrary harmonic expansion (voices move in opposite directions)
   */
  private static createContraryExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const interval = Math.round(parameters.intensity * 7);
    const sortedHarmony = [...harmony].sort((a, b) => a.pitch - b.pitch);
    const midPoint = sortedHarmony[Math.floor(sortedHarmony.length / 2)];

    return harmony.map((element, index) => {
      const direction = element.pitch > midPoint.pitch ? 1 : -1;
      return {
        ...element,
        pitch: element.pitch + direction * interval,
        tension: Math.min(1, element.tension + Math.abs(interval) * 0.15),
        function: this.analyzeFunction(
          element.pitch + direction * interval,
          element.root,
        ),
        inversion: (element.inversion + direction * 2) % 4,
      };
    });
  }

  /**
   * Create oblique harmonic expansion (one voice moves, others stay)
   */
  private static createObliqueExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const interval = Math.round(parameters.intensity * 7);
    const movingVoiceIndex = Math.floor(Math.random() * harmony.length);

    return harmony.map((element, index) => {
      if (index === movingVoiceIndex) {
        return {
          ...element,
          pitch: element.pitch + interval,
          tension: Math.min(1, element.tension + Math.abs(interval) * 0.1),
          inversion: (element.inversion + 1) % 4,
        };
      }
      return element; // Keep other voices static
    });
  }

  /**
   * Create mixed harmonic expansion (combination of motions)
   */
  private static createMixedExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const intervals = harmony.map(() =>
      Math.round((Math.random() - 0.5) * parameters.intensity * 14),
    );

    return harmony.map((element, index) => ({
      ...element,
      pitch: element.pitch + intervals[index],
      tension: Math.min(1, element.tension + Math.abs(intervals[index]) * 0.1),
      function: this.analyzeFunction(
        element.pitch + intervals[index],
        element.root,
      ),
      inversion:
        Math.abs(element.inversion + Math.floor(intervals[index] / 2)) % 4,
    }));
  }

  /**
   * Create rotational harmonic expansion (circular permutation)
   */
  private static createRotationalExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const rotation =
      Math.floor(parameters.intensity * (harmony.length - 1)) + 1;
    const pitchIntervals = harmony.map((element, index) =>
      index < harmony.length - 1
        ? harmony[index + 1].pitch - element.pitch
        : harmony[0].pitch - element.pitch,
    );

    return harmony.map((element, index) => {
      const nextIndex = (index + rotation) % harmony.length;
      const pitchShift = pitchIntervals[index] * Math.sign(rotation);

      return {
        ...element,
        pitch: element.pitch + pitchShift,
        tension: Math.min(1, element.tension + Math.abs(pitchShift) * 0.1),
        function: this.analyzeFunction(
          element.pitch + pitchShift,
          element.root,
        ),
        inversion: (element.inversion + Math.sign(rotation)) % 4,
      };
    });
  }

  /**
   * Create retrograde harmonic expansion (reverse order)
   */
  private static createRetrogradeExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const reversed = [...harmony].reverse();

    return harmony.map((element, index) => ({
      ...element,
      pitch: reversed[index].pitch,
      tension: reversed[index].tension,
      function: reversed[index].function,
      inversion: reversed[index].inversion,
    }));
  }

  /**
   * Create invertible harmonic expansion (interval inversion)
   */
  private static createInvertibleExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const axis =
      harmony[0].pitch +
      (harmony[harmony.length - 1].pitch - harmony[0].pitch) / 2;

    return harmony.map((element) => ({
      ...element,
      pitch: Math.round(2 * axis - element.pitch),
      tension: Math.min(
        1,
        element.tension +
          Math.abs(2 * axis - element.pitch - element.pitch) * 0.1,
      ),
      function: this.analyzeFunction(
        Math.round(2 * axis - element.pitch),
        element.root,
      ),
      inversion: (element.inversion + 2) % 4,
    }));
  }

  /**
   * Create pandiatonic harmonic expansion (using all diatonic modes)
   */
  private static createPandiatonicExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const diatonicIntervals = [0, 2, 4, 5, 7, 9, 11]; // Diatonic scale degrees
    const root = harmony[0].root;

    return harmony.map((element, index) => {
      const scaleDegree = Math.floor(Math.random() * diatonicIntervals.length);
      const newPitch = root + diatonicIntervals[scaleDegree] + 60; // +60 for octave adjustment

      return {
        ...element,
        pitch: newPitch,
        tension: 0.3, // Low tension for diatonic
        function: this.analyzeFunction(newPitch, root),
        inversion: 0,
      };
    });
  }

  /**
   * Create chromatic harmonic expansion
   */
  private static createChromaticExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const chromaticInterval = Math.round(parameters.intensity * 12); // Full chromatic range
    const direction = Math.random() > 0.5 ? 1 : -1;

    return harmony.map((element) => ({
      ...element,
      pitch: element.pitch + direction * chromaticInterval,
      tension: 0.9 + Math.random() * 0.1, // Very high tension for chromatic
      function: "chromatic",
      inversion: (element.inversion + direction * 3) % 4,
    }));
  }

  /**
   * Create polychordal harmonic expansion (multiple chord layers)
   */
  private static createPolychordalExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const numLayers = Math.max(2, Math.floor(parameters.intensity * 4) + 1);
    const expanded: HarmonicElement[] = [];

    for (let layer = 0; layer < numLayers; layer++) {
      const layerInterval = layer * 3; // Minor third intervals
      expanded.push(
        ...harmony.map((element) => ({
          ...element,
          pitch: element.pitch + layerInterval,
          tension: Math.min(1, element.tension + layer * 0.2),
          function: element.function,
          inversion: element.inversion,
        })),
      );
    }

    return expanded;
  }

  /**
   * Create tension-based harmonic expansion
   */
  private static createTensionBasedExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const targetTension = parameters.targetTension || 0.7;
    const intervals = harmony.map((element) => {
      const currentTension = this.calculateIntervalTension(
        element.pitch,
        harmony[0].pitch,
      );
      const tensionDiff = targetTension - currentTension;
      return Math.round(tensionDiff * 12); // Convert tension difference to interval
    });

    return harmony.map((element, index) => ({
      ...element,
      pitch: element.pitch + intervals[index],
      tension: targetTension,
      function: this.analyzeFunction(
        element.pitch + intervals[index],
        element.root,
      ),
      inversion: Math.abs(
        (element.inversion + Math.floor(intervals[index] / 2)) % 4,
      ),
    }));
  }

  /**
   * Create functional harmonic expansion (based on functional harmony)
   */
  private static createFunctionalExpansion(
    harmony: HarmonicElement[],
    parameters: HarmonicExpansionParameters,
  ): HarmonicElement[] {
    const functions = [
      "tonic",
      "dominant",
      "subdominant",
      "submediant",
      "mediant",
      "supertonic",
    ];
    const rootMovement = [0, 5, 7, 9, 4, 2]; // Functional root movements

    return harmony.map((element, index) => {
      const functionalIndex =
        (index + Math.floor(parameters.intensity * 3)) % functions.length;
      const newRoot = harmony[0].root + rootMovement[functionalIndex];
      const pitchInterval = rootMovement[functionalIndex];

      return {
        ...element,
        pitch: element.pitch + pitchInterval,
        tension: this.calculateFunctionalTension(functions[functionalIndex]),
        function: functions[functionalIndex],
        inversion: 0, // Use root position for functional clarity
      };
    });
  }

  /**
   * Analyze harmonic tension using multiple models
   */
  static calculateTensionModel(harmony: HarmonicElement[]): TensionModel {
    if (harmony.length < 2) {
      return {
        dissonance: 0,
        voiceLeading: 0,
        functional: 0,
        chromatic: 0,
        rhythmic: 0,
        total: 0,
      };
    }

    const dissonance = this.calculateDissonance(harmony);
    const voiceLeading = this.calculateVoiceLeadingTension(harmony);
    const functional = this.calculateFunctionalTensionAverage(harmony);
    const chromatic = this.calculateChromaticTension(harmony);
    const rhythmic = this.calculateRhythmicTension(harmony);

    // Weight the components
    const total =
      dissonance * 0.25 +
      voiceLeading * 0.2 +
      functional * 0.25 +
      chromatic * 0.25 +
      rhythmic * 0.05;

    return {
      dissonance,
      voiceLeading,
      functional,
      chromatic,
      rhythmic,
      total: Math.min(1, total),
    };
  }

  /**
   * Generate polychord structures
   */
  static generatePolychord(
    chords: HarmonicElement[][],
    intervals: number[] = [0, 7, 12], // Default: stacked fifths
  ): Polychord {
    const combinedChords: HarmonicElement[] = [];
    let currentInterval = 0;

    chords.forEach((chord, chordIndex) => {
      const transposedChord = chord.map((element) => ({
        ...element,
        pitch: element.pitch + currentInterval,
        root: element.root + currentInterval,
        tension: element.tension + (currentInterval / 12) * 0.1,
      }));
      combinedChords.push(...transposedChord);
      // Move to next interval for the next chord
      if (chordIndex < chords.length - 1) {
        currentInterval +=
          intervals[chordIndex + 1] ?? intervals[intervals.length - 1];
      }
    });

    const density =
      combinedChords.length / Math.max(...chords.map((c) => c.length));
    const clarity = this.calculatePolychordClarity(
      combinedChords,
      chords.length,
    );
    const tension = this.calculateTensionModel(combinedChords).total;

    // Return original chords plus transposed versions for the combined result
    const transposedChords = chords.map((chord, i) => {
      let intervalOffset = 0;
      // For chord i, sum intervals from 0 to i-1
      for (let j = 0; j < i; j++) {
        intervalOffset += intervals[j] ?? intervals[intervals.length - 1];
      }
      // For chords after the first, also add the interval that applies to them
      if (i > 0 && i <= intervals.length) {
        intervalOffset += intervals[i] ?? intervals[intervals.length - 1];
      }
      return chord.map((element) => ({
        ...element,
        pitch: element.pitch + intervalOffset,
      }));
    });

    return {
      chords: transposedChords, // Return transposed chords
      intervals,
      density: Math.min(1, density),
      clarity,
      tension,
    };
  }

  /**
   * Create harmonic field with tonal relationships
   */
  static createHarmonicField(
    key: string,
    mode: string,
    elements: HarmonicElement[],
  ): HarmonicField {
    const tonalCenter = this.getKeyRoot(key);
    const diatonicScale = this.getDiatonicScale(mode);

    const fieldElements = elements.map((element) => ({
      ...element,
      function: this.analyzeFunction(element.pitch, tonalCenter),
      tension: this.calculateTonalTension(
        element.pitch,
        tonalCenter,
        diatonicScale,
      ),
    }));

    const stability =
      1 -
      fieldElements.reduce((sum, e) => sum + e.tension, 0) /
        fieldElements.length;
    const overallTension =
      fieldElements.reduce((sum, e) => sum + e.tension, 0) /
      fieldElements.length;

    return {
      elements: fieldElements,
      key,
      mode,
      tonalCenter,
      stability: Math.max(0, Math.min(1, stability)),
      tension: Math.max(0, Math.min(1, overallTension)),
    };
  }

  /**
   * Analyze complete harmonic structure
   */
  static analyzeHarmony(harmony: HarmonicElement[]): HarmonicAnalysis {
    const tensionProfile = this.calculateTensionProfile(harmony);
    const functionAnalysis = this.analyzeFunctions(harmony);
    const voiceLeading = this.analyzeVoiceLeading(harmony);
    const structural = this.analyzeStructure(harmony);

    return {
      tensionProfile,
      functionAnalysis,
      voiceLeading,
      structural,
    };
  }

  /**
   * Optimize voice leading for better harmonic flow
   */
  static optimizeVoiceLeading(
    harmony: HarmonicElement[],
    constraints: HarmonicHarmonicVoiceLeadingConstraints,
  ): HarmonicElement[] {
    if (harmony.length === 0) return harmony;

    let optimized = [...harmony];
    let improved = true;
    let iterations = 0;
    const maxIterations = 10;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 1; i < optimized.length; i++) {
        const prevElement = optimized[i - 1];
        const currentElement = optimized[i];

        // First, enforce maxLeap constraint by direct adjustment if needed
        const maxLeap = constraints.maxLeap || 12;
        let currentPitch = currentElement.pitch;
        const leap = Math.abs(currentPitch - prevElement.pitch);

        // If leap exceeds constraint, adjust pitch to be within constraint
        if (leap > maxLeap) {
          const direction = currentPitch > prevElement.pitch ? 1 : -1;
          currentPitch = prevElement.pitch + direction * maxLeap;
          // Ensure pitch stays in valid MIDI range
          currentPitch = Math.max(0, Math.min(127, currentPitch));
          optimized[i] = { ...currentElement, pitch: currentPitch };
          improved = true;
          continue; // Skip further optimization for this element
        }

        // If within constraints, try to optimize further
        let bestPitch = currentPitch;
        let bestScore = this.calculateVoiceLeadingScore(
          prevElement,
          { ...currentElement, pitch: currentPitch },
          constraints,
        );

        // Test alternative pitches within constraint limits
        const testPitches = [
          currentPitch - 2, // Down step
          currentPitch - 1, // Down half step
          currentPitch,
          currentPitch + 1, // Up half step
          currentPitch + 2, // Up step
        ].filter(
          (pitch) =>
            Math.abs(pitch - prevElement.pitch) <= maxLeap &&
            pitch >= 0 &&
            pitch <= 127,
        );

        for (const testPitch of testPitches) {
          const testElement = { ...currentElement, pitch: testPitch };
          const testScore = this.calculateVoiceLeadingScore(
            prevElement,
            testElement,
            constraints,
          );

          if (testScore > bestScore) {
            bestScore = testScore;
            bestPitch = testPitch;
            improved = true;
          }
        }

        if (bestPitch !== currentPitch) {
          optimized[i] = { ...currentElement, pitch: bestPitch };
        }
      }
    }

    return optimized;
  }

  // Private helper methods

  private static calculateIntervalTension(
    pitch1: number,
    pitch2: number,
  ): number {
    const interval = Math.abs(pitch1 - pitch2) % 12;
    return this.INTERVAL_TENSIONS.get(interval) || 0.5;
  }

  private static calculateDissonance(harmony: HarmonicElement[]): number {
    let totalDissonance = 0;
    let intervalCount = 0;

    for (let i = 0; i < harmony.length; i++) {
      for (let j = i + 1; j < harmony.length; j++) {
        const interval = Math.abs(harmony[i].pitch - harmony[j].pitch) % 12;
        totalDissonance += this.INTERVAL_TENSIONS.get(interval) || 0.5;
        intervalCount++;
      }
    }

    return intervalCount > 0 ? totalDissonance / intervalCount : 0;
  }

  private static calculateVoiceLeadingTension(
    harmony: HarmonicElement[],
  ): number {
    if (harmony.length < 2) return 0;

    let parallelMotion = 0;
    let contraryMotion = 0;
    let obliqueMotion = 0;
    let totalMotion = 0;

    for (let i = 1; i < harmony.length; i++) {
      const prevPitch = harmony[i - 1].pitch;
      const currPitch = harmony[i].pitch;

      // This is simplified - in reality we'd track voice movements across time
      if (Math.abs(currPitch - prevPitch) < 2) {
        obliqueMotion++;
      } else {
        totalMotion++;
      }
    }

    // Penalize lack of voice movement diversity
    return 1 - obliqueMotion / Math.max(totalMotion, 1);
  }

  private static calculateFunctionalTensionAverage(
    harmony: HarmonicElement[],
  ): number {
    const functionalTensions = {
      tonic: 0.1,
      dominant: 0.7,
      subdominant: 0.4,
      submediant: 0.3,
      mediant: 0.3,
      supertonic: 0.5,
      chromatic: 0.8,
    };

    return (
      harmony.reduce(
        (sum, element) =>
          sum +
          (functionalTensions[
            element.function as keyof typeof functionalTensions
          ] || 0.5),
        0,
      ) / harmony.length
    );
  }

  private static calculateChromaticTension(harmony: HarmonicElement[]): number {
    let chromaticCount = 0;

    harmony.forEach((element) => {
      // Check if pitch is outside diatonic framework
      const root = element.root % 12;
      const pitchClass = element.pitch % 12;
      const diatonicPitches = [0, 2, 4, 5, 7, 9, 11]; // Major scale

      if (!diatonicPitches.includes((pitchClass - root + 12) % 12)) {
        chromaticCount++;
      }
    });

    // All chromatic = maximum tension
    return chromaticCount / harmony.length;
  }

  private static calculateRhythmicTension(harmony: HarmonicElement[]): number {
    // Simplified rhythmic tension based on distribution
    const intervals = [];
    for (let i = 1; i < harmony.length; i++) {
      intervals.push(Math.abs(harmony[i].pitch - harmony[i - 1].pitch));
    }

    const avgInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    return Math.min(1, avgInterval / 6); // Normalize by a major sixth
  }

  private static analyzeFunction(pitch: number, root: number): string {
    const interval = (pitch - root) % 12;
    const diatonicIntervals = [0, 2, 4, 5, 7, 9, 11]; // Major scale

    if (!diatonicIntervals.includes(interval >= 0 ? interval : interval + 12)) {
      return "chromatic";
    }

    const functionalMap: { [key: number]: string } = {
      0: "tonic",
      1: "supertonic",
      2: "mediant",
      3: "subdominant",
      4: "dominant",
      5: "submediant",
      6: "leading tone",
    };

    return functionalMap[interval] || "tonic";
  }

  private static calculateExpansionQuality(
    original: HarmonicElement[],
    expanded: HarmonicElement[],
    analysis: TensionModel,
  ): number {
    // Handle edge case of single element
    if (expanded.length === 0) return 0;
    if (expanded.length === 1) {
      // Single element quality based on tension balance
      return 1 - Math.abs(0.5 - analysis.total);
    }

    // Multiple quality factors
    const tensionBalance = 1 - Math.abs(0.5 - analysis.total); // Prefer moderate tension
    const voiceLeadingQuality =
      analysis.voiceLeading > 0.3 ? 0.3 : analysis.voiceLeading;
    const functionalClarity = analysis.functional < 0.8 ? 0.4 : 0.1;
    const structuralStability = this.calculateStructuralStability(expanded);

    return (
      tensionBalance * 0.3 +
      voiceLeadingQuality * 0.3 +
      functionalClarity * 0.2 +
      structuralStability * 0.2
    );
  }

  private static calculateStructuralStability(
    harmony: HarmonicElement[],
  ): number {
    if (harmony.length === 0) return 0;
    if (harmony.length === 1) return 0.5;

    const functions = harmony.map((e) => e.function);
    const uniqueFunctions = new Set(functions);
    const functionalBalance = uniqueFunctions.size / functions.length;

    const intervals = [];
    for (let i = 1; i < harmony.length; i++) {
      intervals.push(Math.abs(harmony[i].pitch - harmony[i - 1].pitch));
    }
    const avgInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const intervalStability = 1 - Math.abs(7 - avgInterval) / 7; // Perfect fifth as ideal

    return (functionalBalance + intervalStability) / 2;
  }

  private static calculatePolychordClarity(
    combined: HarmonicElement[],
    numChords: number,
  ): number {
    // Higher clarity when individual chords remain distinct
    const chordBoundaries = combined.length / numChords;
    let clarityScore = 0;

    for (let i = 0; i < numChords; i++) {
      const chordStart = i * chordBoundaries;
      const chordEnd = (i + 1) * chordBoundaries;
      const chord = combined.slice(chordStart, chordEnd);

      // Check if chord remains cohesive
      const chordRange =
        Math.max(...chord.map((e) => e.pitch)) -
        Math.min(...chord.map((e) => e.pitch));
      clarityScore += Math.max(0, 1 - chordRange / 24); // Penalize very wide chords
    }

    return clarityScore / numChords;
  }

  private static getKeyRoot(key: string): number {
    const keyMap: { [key: string]: number } = {
      C: 60,
      "C#": 61,
      Db: 61,
      D: 62,
      "D#": 63,
      Eb: 63,
      E: 64,
      F: 65,
      "F#": 66,
      Gb: 66,
      G: 67,
      "G#": 68,
      Ab: 68,
      A: 69,
      "A#": 70,
      Bb: 70,
      B: 71,
    };
    return keyMap[key] || 60;
  }

  private static getDiatonicScale(mode: string): number[] {
    const scales: { [key: string]: number[] } = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      locrian: [0, 1, 3, 5, 6, 8, 10],
    };
    return scales[mode] || scales["major"];
  }

  private static calculateTonalTension(
    pitch: number,
    root: number,
    scale: number[],
  ): number {
    const pitchClass = (pitch - root) % 12;
    const normalizedPitch = pitchClass >= 0 ? pitchClass : pitchClass + 12;

    if (scale.includes(normalizedPitch)) {
      return 0.1; // Low tension for diatonic notes
    } else {
      return 0.7; // High tension for non-diatonic notes
    }
  }

  private static calculateFunctionalTension(functionName: string): number {
    const tensions: { [key: string]: number } = {
      tonic: 0.1,
      dominant: 0.7,
      subdominant: 0.4,
      submediant: 0.3,
      mediant: 0.3,
      supertonic: 0.5,
      chromatic: 0.8,
    };
    return tensions[functionName] || 0.5;
  }

  private static calculateTensionProfile(
    harmony: HarmonicElement[],
  ): TensionModel[] {
    const profile: TensionModel[] = [];

    harmony.forEach((element) => {
      const model = this.calculateTensionModel([element]);
      profile.push(model);
    });

    return profile;
  }

  private static analyzeFunctions(harmony: HarmonicElement[]): {
    progression: string[];
    modulations: HarmonicModulation[];
    cadences: HarmonicCadence[];
    stability: number;
  } {
    const progression = harmony.map((e) => e.function);
    const functions = Array.from(new Set(progression));
    const stability = 1 - (functions.length / progression.length) * 0.5;

    return {
      progression: functions,
      modulations: [], // Simplified - would need context
      cadences: [], // Simplified - would need progression context
      stability,
    };
  }

  private static analyzeVoiceLeading(harmony: HarmonicElement[]): {
    parallelMotion: number;
    contraryMotion: number;
    obliqueMotion: number;
    resolutionQuality: number;
  } {
    // Simplified analysis
    return {
      parallelMotion: 0.2,
      contraryMotion: 0.3,
      obliqueMotion: 0.5,
      resolutionQuality: 0.7,
    };
  }

  private static analyzeStructure(harmony: HarmonicElement[]): {
    symmetry: number;
    balance: number;
    clarity: number;
    complexity: number;
  } {
    const pitches = harmony.map((e) => e.pitch);
    const range = Math.max(...pitches) - Math.min(...pitches);
    const center = (Math.max(...pitches) + Math.min(...pitches)) / 2;

    // Calculate symmetry
    let symmetry = 0;
    for (let i = 0; i < harmony.length / 2; i++) {
      const mirrorIndex = harmony.length - 1 - i;
      const distance = Math.abs(
        harmony[i].pitch - center - (center - harmony[mirrorIndex].pitch),
      );
      symmetry += 1 - distance / range;
    }
    symmetry = symmetry / Math.floor(harmony.length / 2);

    // Calculate balance (even distribution)
    const averagePitch =
      pitches.reduce((sum, p) => sum + p, 0) / pitches.length;
    const balance = 1 - Math.abs(averagePitch - center) / (range / 2);

    return {
      symmetry: Math.max(0, Math.min(1, symmetry)),
      balance: Math.max(0, Math.min(1, balance)),
      clarity: 0.7,
      complexity: Math.min(1, new Set(pitches).size / pitches.length),
    };
  }

  private static calculateVoiceLeadingScore(
    prevElement: HarmonicElement,
    currElement: HarmonicElement,
    constraints: HarmonicHarmonicVoiceLeadingConstraints,
  ): number {
    let score = 1.0;

    const interval = Math.abs(currElement.pitch - prevElement.pitch);

    // Penalize large leaps heavily
    if (constraints.maxLeap && interval > constraints.maxLeap) {
      score -= 1.0; // Large penalty for exceeding maxLeap
    }

    // Prefer contrary motion (simplified)
    if (constraints.preferContraryMotion && interval > 0) {
      score -= 0.1;
    }

    // Reward stepwise motion
    if (interval <= 2) {
      score += 0.3;
    }

    return Math.max(0, score);
  }
}

/**
 * High-level API for harmonic expansion operations
 */
export class HarmonicExpansionAPI {
  /**
   * Generate intelligent harmonic expansion
   */
  static async generateHarmonicExpansion(
    harmony: HarmonicElement[],
    expansionType: HarmonicExpansionType,
    options: {
      intensity?: number;
      preserveFunction?: boolean;
      targetTension?: number;
      voiceLeadingConstraints?: HarmonicHarmonicVoiceLeadingConstraints;
      harmonicLimits?: HarmonicLimits;
    } = {},
  ): Promise<{
    expansion: HarmonicExpansion;
    recommendations: string[];
    alternativeExpansions: HarmonicExpansion[];
  }> {
    const parameters: HarmonicExpansionParameters = {
      type: expansionType,
      intensity: options.intensity || 0.5,
      preserveFunction: options.preserveFunction || false,
      targetTension: options.targetTension,
      voiceLeadingConstraints: options.voiceLeadingConstraints,
      harmonicLimits: options.harmonicLimits,
    };

    const expansion = HarmonicExpansionEngine.expandHarmony(
      harmony,
      parameters,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(expansion);

    // Generate alternative expansions
    const alternativeTypes: HarmonicExpansionType[] = [
      "parallel",
      "contrary",
      "mixed",
    ].filter((type): type is HarmonicExpansionType => type !== expansionType);
    const alternativeExpansions = alternativeTypes
      .slice(0, 2)
      .map((type) =>
        HarmonicExpansionEngine.expandHarmony(harmony, { ...parameters, type }),
      );

    return {
      expansion,
      recommendations,
      alternativeExpansions,
    };
  }

  /**
   * Create polychord with intelligence
   */
  static async createPolychord(
    chords: HarmonicElement[][],
    intervals?: number[],
    options: {
      optimizeClarity?: boolean;
      targetDensity?: number;
      tensionProfile?: "low" | "medium" | "high";
    } = {},
  ): Promise<{
    polychord: Polychord;
    analysis: {
      clarity: number;
      tension: TensionModel;
      complexity: number;
    };
    recommendations: string[];
  }> {
    const polychord = HarmonicExpansionEngine.generatePolychord(
      chords,
      intervals,
    );
    const analysis = {
      clarity: polychord.clarity,
      tension: HarmonicExpansionEngine.calculateTensionModel(
        chords.flat().map((element, index) => ({
          ...element,
          pitch:
            element.pitch +
            Math.floor(index / chords[0].length) * (intervals?.[0] || 7),
        })),
      ),
      complexity: polychord.density,
    };

    const recommendations = this.generatePolychordRecommendations(
      polychord,
      analysis,
    );

    return {
      polychord,
      analysis,
      recommendations,
    };
  }

  /**
   * Create harmonic field with tonal analysis
   */
  static async createHarmonicField(
    key: string,
    mode: string,
    elements: HarmonicElement[],
    options: {
      optimizeStability?: boolean;
      targetTension?: number;
      includeAnalysis?: boolean;
    } = {},
  ): Promise<{
    field: HarmonicField;
    tonalAnalysis?: {
      keyStability: number;
      tonalCenter: number;
      modeCharacteristics: string[];
      modulations: string[];
    };
  }> {
    const field = HarmonicExpansionEngine.createHarmonicField(
      key,
      mode,
      elements,
    );

    // Always include tonal analysis
    const tonalAnalysis = {
      keyStability: field.stability,
      tonalCenter: field.tonalCenter,
      modeCharacteristics: this.getModeCharacteristics(mode),
      modulations: [], // Would need context to detect
    };

    const result: any = {
      field,
      tonalAnalysis,
    };

    return result;
  }

  /**
   * Analyze complete harmonic structure
   */
  static async analyzeCompleteHarmony(harmony: HarmonicElement[]): Promise<{
    analysis: HarmonicAnalysis;
    qualityAssessment: {
      overall: number;
      voiceLeading: number;
      functional: number;
      structural: number;
    };
    improvementSuggestions: string[];
  }> {
    const analysis = HarmonicExpansionEngine.analyzeHarmony(harmony);

    const qualityAssessment = {
      overall:
        analysis.structural.complexity * 0.3 +
        (1 - analysis.voiceLeading.parallelMotion) * 0.3 +
        analysis.functionAnalysis.stability * 0.2 +
        analysis.structural.clarity * 0.2,
      voiceLeading: 1 - analysis.voiceLeading.parallelMotion,
      functional: analysis.functionAnalysis.stability,
      structural: analysis.structural.complexity,
    };

    const improvementSuggestions = this.generateImprovementSuggestions(
      harmony,
      analysis,
    );

    return {
      analysis,
      qualityAssessment,
      improvementSuggestions,
    };
  }

  /**
   * Optimize harmony for better voice leading
   */
  static async optimizeHarmony(
    harmony: HarmonicElement[],
    constraints: HarmonicHarmonicVoiceLeadingConstraints,
  ): Promise<{
    optimizedHarmony: HarmonicElement[];
    improvement: {
      voiceLeadingScore: number;
      tensionImprovement: number;
      functionalClarity: number;
    };
  }> {
    const originalTension =
      HarmonicExpansionEngine.calculateTensionModel(harmony);
    const optimizedHarmony = HarmonicExpansionEngine.optimizeVoiceLeading(
      harmony,
      constraints,
    );
    const optimizedTension =
      HarmonicExpansionEngine.calculateTensionModel(optimizedHarmony);

    // Calculate improvements - lower voiceLeading tension is better, so flip the sign
    const voiceLeadingImprovement =
      originalTension.voiceLeading - optimizedTension.voiceLeading;
    const tensionImprovement = originalTension.total - optimizedTension.total;

    const improvement = {
      voiceLeadingScore: Math.max(0, voiceLeadingImprovement), // Non-negative improvement
      tensionImprovement: Math.max(0, tensionImprovement), // Non-negative improvement
      functionalClarity: 0.5, // Simplified - would calculate actual improvement
    };

    return {
      optimizedHarmony,
      improvement,
    };
  }

  // Private helper methods

  private static generateRecommendations(
    expansion: HarmonicExpansion,
  ): string[] {
    const recommendations: string[] = [];

    if (expansion.quality > 0.8) {
      recommendations.push(
        "Excellent harmonic expansion with high musical quality",
      );
    }

    if (expansion.analysis.total > 0.7) {
      recommendations.push(
        "High tension detected - consider resolution in following bars",
      );
    }

    if (expansion.expansionType === "chromatic") {
      recommendations.push(
        "Chromatic expansion creates rich color but may need resolution",
      );
    }

    if (expansion.expansionType === "polychordal") {
      recommendations.push(
        "Polychordal structure provides excellent depth and complexity",
      );
    }

    // Always provide at least one recommendation
    if (recommendations.length === 0) {
      recommendations.push(
        `Harmonic expansion generated using ${expansion.expansionType} method`,
      );
    }

    return recommendations;
  }

  private static generatePolychordRecommendations(
    polychord: Polychord,
    analysis: any,
  ): string[] {
    const recommendations: string[] = [];

    if (polychord.clarity > 0.7) {
      recommendations.push(
        "Excellent polychord clarity - individual voices remain distinct",
      );
    }

    if (polychord.density > 0.8) {
      recommendations.push(
        "High density polychord - excellent for complex textures",
      );
    }

    if (polychord.tension > 0.6) {
      recommendations.push(
        "Moderate tension - good for creating forward motion",
      );
    }

    return recommendations;
  }

  private static getModeCharacteristics(mode: string): string[] {
    const characteristics: { [key: string]: string[] } = {
      major: ["bright", "stable", "triadic", "functional"],
      minor: ["dark", "emotional", "triadic", "flexible"],
      dorian: ["modal", "bright minor", "versatile"],
      phrygian: ["modal", "exotic", "flamenco"],
      lydian: ["modal", "dreamy", "bright"],
      mixolydian: ["modal", "bluesy", "folk"],
      locrian: ["modal", "tense", "unstable"],
    };
    return characteristics[mode] || ["standard"];
  }

  private static generateImprovementSuggestions(
    harmony: HarmonicElement[],
    analysis: HarmonicAnalysis,
  ): string[] {
    const suggestions: string[] = [];

    if (analysis.voiceLeading.parallelMotion > 0.5) {
      suggestions.push("Reduce parallel motion for better voice leading");
    }

    if (analysis.functionAnalysis.stability < 0.4) {
      suggestions.push("Consider stronger functional relationships");
    }

    if (analysis.structural.complexity > 0.8) {
      suggestions.push(
        "High complexity achieved - ensure clarity is maintained",
      );
    }

    if (analysis.structural.balance < 0.5) {
      suggestions.push("Improve voice distribution for better balance");
    }

    // Check for large melodic leaps
    for (let i = 1; i < harmony.length; i++) {
      const leap = Math.abs(harmony[i].pitch - harmony[i - 1].pitch);
      if (leap > 12) {
        suggestions.push(
          "Consider reducing large melodic leaps for smoother voice leading",
        );
        break;
      }
    }

    return suggestions;
  }
}

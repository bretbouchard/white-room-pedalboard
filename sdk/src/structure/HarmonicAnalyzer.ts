/**
 * Harmonic Analyzer - Tension from Chord Quality
 *
 * Schillinger Principle: Harmony creates tension through
 * interval dissonance and functional instability.
 *
 * This module analyzes chord quality and calculates harmonic
 * tension contribution to the total structural tension signal.
 *
 * @module structure/HarmonicAnalyzer
 */

import { TensionAccumulator } from "./TensionAccumulator";

/**
 * Chord quality with interval analysis
 */
export interface ChordQuality {
  /** Root note (MIDI number) */
  root: number;

  /** Chord type (triad, 7th, 9th, etc.) */
  type:
    | "major"
    | "minor"
    | "diminished"
    | "augmented"
    | "dominant7"
    | "major7"
    | "minor7"
    | "halfDiminished"
    | "diminished7";

  /** Extensions (9, 11, 13) */
  extensions?: number[];

  /** Alterations (#5, b9, #11, etc.) */
  alterations?: number[];
}

/**
 * Harmonic tension analysis result
 */
export interface HarmonicTensionAnalysis {
  /** Raw tension from chord quality (0..1) */
  chordTension: number;

  /** Tension from functional instability (0..1) */
  functionalTension: number;

  /** Tension from voice leading motion (0..1) */
  voiceLeadingTension: number;

  /** Total harmonic tension (weighted combination) */
  totalHarmonicTension: number;

  /** Explainable cause */
  cause: string;
}

/**
 * Analyzes harmonic content and calculates tension
 *
 * Usage:
 * ```typescript
 * const analyzer = new HarmonicAnalyzer();
 * const chord = { root: 60, type: 'dominant7', extensions: [13] };
 * const analysis = analyzer.analyzeChord(chord, 'dominant');
 * ```
 */
export class HarmonicAnalyzer {
  private previousChord: ChordQuality | null = null;

  /**
   * Analyze a single chord and calculate its harmonic tension
   *
   * @param chord - Chord to analyze
   * @param function - Harmonic function (tonic, subdominant, dominant)
   * @returns Tension analysis
   */
  analyzeChord(
    chord: ChordQuality,
    harmonicFunction: "tonic" | "subdominant" | "dominant" = "tonic",
  ): HarmonicTensionAnalysis {
    // Calculate tension components
    const chordTension = this.calculateChordTension(chord);
    const functionalTension = this.calculateFunctionalTension(harmonicFunction);
    const voiceLeadingTension = this.calculateVoiceLeadingTension(chord);

    // Weighted combination (chord quality is most important)
    const totalHarmonicTension =
      0.5 * chordTension + 0.3 * functionalTension + 0.2 * voiceLeadingTension;

    // Clamp to [0, 1]
    const clamped = Math.max(0, Math.min(1, totalHarmonicTension));

    return {
      chordTension,
      functionalTension,
      voiceLeadingTension,
      totalHarmonicTension: clamped,
      cause: this.generateCause(chord, harmonicFunction, clamped),
    };
  }

  /**
   * Write harmonic tension to accumulator
   *
   * This is the main integration point - use this to update
   * the global tension state based on harmonic analysis.
   *
   * @param chord - Chord to analyze
   * @param harmonicFunction - Functional analysis
   * @param accumulator - Tension accumulator to update
   */
  writeHarmonicTension(
    chord: ChordQuality,
    harmonicFunction: "tonic" | "subdominant" | "dominant",
    accumulator: TensionAccumulator,
  ): void {
    const analysis = this.analyzeChord(chord, harmonicFunction);

    accumulator.writeHarmonicTension(
      analysis.totalHarmonicTension,
      analysis.cause,
    );

    // Store for voice leading analysis next time
    this.previousChord = chord;
  }

  /**
   * Calculate tension from chord quality alone
   */
  private calculateChordTension(chord: ChordQuality): number {
    let tension = 0;

    // Base tension from chord type
    switch (chord.type) {
      case "major":
        tension = 0.1; // Most stable
        break;
      case "minor":
        tension = 0.15; // Slightly more tense
        break;
      case "dominant7":
        tension = 0.4; // Tritone creates strong tension
        break;
      case "major7":
        tension = 0.2; // Stable but colorful
        break;
      case "minor7":
        tension = 0.25; // Mild tension
        break;
      case "diminished":
        tension = 0.5; // High tension from diminished 5th
        break;
      case "augmented":
        tension = 0.45; // High tension from augmented 5th
        break;
      case "halfDiminished":
        tension = 0.55; // Very tense
        break;
      case "diminished7":
        tension = 0.6; // Maximum tension
        break;
    }

    // Add tension from extensions
    if (chord.extensions) {
      // 9ths add mild color
      if (chord.extensions.includes(9)) {
        tension += 0.05;
      }

      // 11ths add dissonance
      if (chord.extensions.includes(11)) {
        tension += 0.1;
      }

      // 13ths add richness but also tension
      if (chord.extensions.includes(13)) {
        tension += 0.08;
      }
    }

    // Add tension from alterations
    if (chord.alterations) {
      tension += chord.alterations.length * 0.1;
    }

    return Math.min(tension, 1);
  }

  /**
   * Calculate tension from harmonic function
   */
  private calculateFunctionalTension(
    harmonicFunction: "tonic" | "subdominant" | "dominant",
  ): number {
    switch (harmonicFunction) {
      case "tonic":
        return 0.0; // Most stable
      case "subdominant":
        return 0.2; // Moderate tension (away from tonic)
      case "dominant":
        return 0.5; // High tension (needs resolution)
      default:
        return 0.1;
    }
  }

  /**
   * Calculate tension from voice leading
   */
  private calculateVoiceLeadingTension(chord: ChordQuality): number {
    if (!this.previousChord) {
      return 0; // No previous chord, no motion
    }

    // Calculate root motion
    const rootMotion = Math.abs(chord.root - this.previousChord.root);
    const normalizedMotion = rootMotion / 12; // Normalize to octave

    // Larger leaps create more tension
    let tension = normalizedMotion * 0.3;

    // Chromatic motion (half steps) is smoother
    if (rootMotion === 1 || rootMotion === 11) {
      tension *= 0.5;
    }

    // Perfect fourths/fifths are strong but smooth
    if (rootMotion === 5 || rootMotion === 7) {
      tension *= 0.7;
    }

    // Tritone is maximum tension
    if (rootMotion === 6) {
      tension = 0.6;
    }

    return Math.min(tension, 1);
  }

  /**
   * Generate explainable cause for tension change
   */
  private generateCause(
    chord: ChordQuality,
    harmonicFunction: "tonic" | "subdominant" | "dominant",
    tension: number,
  ): string {
    const parts: string[] = [];

    // Chord type
    parts.push(chord.type);

    // Function
    if (harmonicFunction !== "tonic") {
      parts.push(harmonicFunction);
    }

    // Extensions
    if (chord.extensions && chord.extensions.length > 0) {
      parts.push(`extensions: ${chord.extensions.join(", ")}`);
    }

    // Alterations
    if (chord.alterations && chord.alterations.length > 0) {
      parts.push(`altered: ${chord.alterations.length}`);
    }

    // Previous chord motion
    if (this.previousChord) {
      const rootMotion = Math.abs(chord.root - this.previousChord.root);
      parts.push(`root_motion: ${rootMotion} semitones`);
    }

    return `harmony_${parts.join("_")}`;
  }

  /**
   * Reset voice leading history
   */
  reset(): void {
    this.previousChord = null;
  }
}

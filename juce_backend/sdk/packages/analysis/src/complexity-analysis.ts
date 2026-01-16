/**
 * Complexity analysis utilities for musical content
 */

export interface ComplexityMetrics {
  rhythmic: number;
  harmonic: number;
  melodic: number;
  structural: number;
  overall: number;
}

export interface ComplexityAnalysis {
  metrics: ComplexityMetrics;
  breakdown: Record<string, number>;
  suggestions: string[];
}

/**
 * Complexity analyzer for musical content
 */
export class ComplexityAnalyzer {
  /**
   * Analyze overall complexity of musical content
   */
  analyzeComplexity(content: {
    rhythm?: number[];
    harmony?: string[];
    melody?: number[];
    structure?: any;
  }): ComplexityAnalysis {
    const metrics: ComplexityMetrics = {
      rhythmic: content.rhythm
        ? this.analyzeRhythmicComplexitySync(content.rhythm)
        : 0,
      harmonic: content.harmony
        ? this.analyzeHarmonicComplexity(content.harmony)
        : 0,
      melodic: content.melody
        ? this.analyzeMelodicComplexitySync(content.melody)
        : 0,
      structural: content.structure ? this.analyzeStructuralComplexity() : 0,
      overall: 0,
    };

    // Calculate overall complexity
    const components = [
      metrics.rhythmic,
      metrics.harmonic,
      metrics.melodic,
      metrics.structural,
    ];
    const validComponents = components.filter(c => c > 0);
    metrics.overall =
      validComponents.length > 0
        ? validComponents.reduce((sum, c) => sum + c, 0) /
          validComponents.length
        : 0;

    const breakdown = {
      'Rhythmic Variety': metrics.rhythmic,
      'Harmonic Sophistication': metrics.harmonic,
      'Melodic Complexity': metrics.melodic,
      'Structural Complexity': metrics.structural,
    };

    const suggestions = this.generateComplexitySuggestions(metrics);

    return {
      metrics,
      breakdown,
      suggestions,
    };
  }

  /**
   * Analyze rhythmic complexity (synchronous)
   */
  private analyzeRhythmicComplexitySync(rhythm: number[]): number {
    if (rhythm.length === 0) return 0;

    // Count unique values
    const uniqueValues = new Set(rhythm).size;
    const uniqueRatio = uniqueValues / rhythm.length;

    // Count transitions
    let transitions = 0;
    for (let i = 1; i < rhythm.length; i++) {
      if (rhythm[i] !== rhythm[i - 1]) {
        transitions++;
      }
    }
    const transitionRatio = transitions / (rhythm.length - 1);

    // Calculate syncopation
    const syncopation = this.calculateSyncopation(rhythm);

    return (uniqueRatio + transitionRatio + syncopation) / 3;
  }

  /**
   * Analyze harmonic complexity
   */
  private analyzeHarmonicComplexity(harmony: string[]): number {
    if (harmony.length === 0) return 0;

    // Count unique chords
    const uniqueChords = new Set(harmony).size;
    const uniqueRatio = uniqueChords / harmony.length;

    // Analyze chord complexity (extensions, alterations)
    const chordComplexity =
      harmony.reduce((sum, chord) => {
        let complexity = 0.3; // Base complexity for any chord

        // Add complexity for extensions
        if (chord.includes('7')) complexity += 0.2;
        if (chord.includes('9')) complexity += 0.2;
        if (chord.includes('11')) complexity += 0.2;
        if (chord.includes('13')) complexity += 0.2;

        // Add complexity for alterations
        if (chord.includes('#') || chord.includes('b')) complexity += 0.1;

        return sum + Math.min(complexity, 1.0);
      }, 0) / harmony.length;

    return (uniqueRatio + chordComplexity) / 2;
  }

  /**
   * Analyze melodic complexity (public method)
   */
  async analyzeMelodicComplexity(melody: number[]): Promise<number> {
    return this.analyzeMelodicComplexitySync(melody);
  }

  /**
   * Analyze rhythmic complexity (public method)
   */
  async analyzeRhythmicComplexity(rhythm: number[] | any): Promise<number> {
    // Handle different input formats
    const rhythmArray = Array.isArray(rhythm) ? rhythm : rhythm.pattern || [];
    return this.analyzeRhythmicComplexitySync(rhythmArray);
  }

  /**
   * Analyze melodic complexity (synchronous)
   */
  private analyzeMelodicComplexitySync(melody: number[]): number {
    if (melody.length < 2) return 0;

    // Calculate interval variety
    const intervals = new Set<number>();
    for (let i = 1; i < melody.length; i++) {
      const currentNote = melody[i];
      const previousNote = melody[i - 1];
      if (currentNote !== undefined && previousNote !== undefined) {
        intervals.add(Math.abs(currentNote - previousNote));
      }
    }
    const intervalVariety =
      melody.length > 1 ? intervals.size / (melody.length - 1) : 0;

    // Calculate range
    const range = Math.max(...melody) - Math.min(...melody);
    const normalizedRange = Math.min(range / 24, 1); // Normalize to 2 octaves

    // Calculate direction changes
    let directionChanges = 0;
    let lastDirection = 0;
    for (let i = 1; i < melody.length; i++) {
      const currentNote = melody[i];
      const previousNote = melody[i - 1];
      if (currentNote !== undefined && previousNote !== undefined) {
        const direction =
          currentNote > previousNote ? 1 : currentNote < previousNote ? -1 : 0;
        if (
          direction !== 0 &&
          direction !== lastDirection &&
          lastDirection !== 0
        ) {
          directionChanges++;
        }
        if (direction !== 0) lastDirection = direction;
      }
    }
    const directionChangeRatio =
      melody.length > 1 ? directionChanges / (melody.length - 1) : 0;

    return (intervalVariety + normalizedRange + directionChangeRatio) / 3;
  }

  /**
   * Analyze structural complexity
   */
  private analyzeStructuralComplexity(): number {
    // Placeholder implementation
    // In a real implementation, this would analyze form complexity,
    // section variety, transition sophistication, etc.
    return 0.5;
  }

  /**
   * Calculate syncopation level
   */
  private calculateSyncopation(rhythm: number[]): number {
    // Simple syncopation calculation
    // In a real implementation, this would be more sophisticated
    let syncopationScore = 0;
    const strongBeats = [0, rhythm.length / 2]; // Simplified strong beats

    for (let i = 0; i < rhythm.length; i++) {
      const currentBeat = rhythm[i];
      if (
        currentBeat !== undefined &&
        currentBeat > 0 &&
        !strongBeats.includes(i)
      ) {
        syncopationScore++;
      }
    }

    return rhythm.length > 0 ? syncopationScore / rhythm.length : 0;
  }

  /**
   * Generate suggestions based on complexity analysis
   */
  private generateComplexitySuggestions(metrics: ComplexityMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.overall < 0.3) {
      suggestions.push('Consider adding more musical variety and complexity');
    } else if (metrics.overall > 0.8) {
      suggestions.push(
        'High complexity - ensure musical coherence is maintained'
      );
    }

    if (metrics.rhythmic < 0.2) {
      suggestions.push('Rhythmic patterns could be more varied');
    }

    if (metrics.harmonic < 0.2) {
      suggestions.push('Harmonic progression could be more sophisticated');
    }

    if (metrics.melodic < 0.2) {
      suggestions.push('Melodic line could be more complex and interesting');
    }

    if (metrics.rhythmic > 0.9) {
      suggestions.push(
        'Very complex rhythm - consider simplifying for clarity'
      );
    }

    if (metrics.harmonic > 0.9) {
      suggestions.push(
        'Very complex harmony - ensure it serves the musical expression'
      );
    }

    if (metrics.melodic > 0.9) {
      suggestions.push(
        'Very complex melody - consider balance with other elements'
      );
    }

    return suggestions;
  }
}

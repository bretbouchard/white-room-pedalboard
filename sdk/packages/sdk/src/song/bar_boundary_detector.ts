/**
 * BarBoundaryDetector - Calculate bar boundaries for performance switching
 *
 * Provides sample-accurate bar boundary detection to enable seamless performance
 * switching at musically appropriate moments (bar boundaries).
 *
 * Key Features:
 * - Sample-accurate bar boundary calculation
 * - Tempo and time signature aware
 * - Sample rate independent
 * - Support for any time signature (4/4, 3/4, 6/8, etc.)
 *
 * Use Cases:
 * - Schedule performance switches at next bar boundary
 * - Calculate samples until next bar for precise timing
 * - Detect when currently at a bar boundary
 * - Support syncopated switching (specific beat within bar)
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Time signature: [numerator, denominator]
 * - Numerator: Number of beats per bar (e.g., 4, 3, 6)
 * - Denominator: Note value per beat (e.g., 4 for quarter note, 8 for eighth)
 */
export type TimeSignature = readonly [numerator: number, denominator: number];

/**
 * Bar position in samples
 */
export interface BarPosition {
  readonly bar: number; // Bar number (0-indexed)
  readonly position: number; // Sample position of bar boundary
}

/**
 * Samples until next bar boundary
 */
export interface SamplesToBoundary {
  readonly samples: number; // Samples until next bar boundary
  readonly bars: number; // Number of bars until boundary (0 = at boundary, 1 = next bar)
  readonly seconds: number; // Time until next bar boundary (at current sample rate)
}

// ============================================================================
// BarBoundaryDetector Implementation
// ============================================================================

export class BarBoundaryDetector {
  private readonly sampleRate: number;
  private readonly tempo: number;
  private readonly timeSignature: TimeSignature;

  constructor(options: {
    sampleRate: number;
    tempo: number;
    timeSignature: TimeSignature;
  }) {
    this.sampleRate = options.sampleRate;
    this.tempo = options.tempo;
    this.timeSignature = options.timeSignature;

    // Validate inputs
    if (this.sampleRate <= 0) {
      throw new Error(`Sample rate must be positive: ${this.sampleRate}`);
    }
    if (this.tempo <= 0) {
      throw new Error(`Tempo must be positive: ${this.tempo}`);
    }
    if (this.timeSignature[0] <= 0 || this.timeSignature[1] <= 0) {
      throw new Error(`Invalid time signature: ${this.timeSignature.join('/')}`);
    }
  }

  /**
   * Calculate samples per beat at current tempo
   */
  samplesPerBeat(): number {
    // 60 seconds per minute * sampleRate / tempo
    return (60 * this.sampleRate) / this.tempo;
  }

  /**
   * Calculate samples per bar
   *
   * For 4/4 time: samplesPerBeat * 4
   * For 3/4 time: samplesPerBeat * 3
   * For 6/8 time: samplesPerBeat * 6 (beats are eighth notes)
   */
  samplesPerBar(): number {
    const beatsPerBar = this.timeSignature[0];
    return this.samplesPerBeat() * beatsPerBar;
  }

  /**
   * Calculate bar boundary from current position
   *
   * Returns the sample position of the NEXT bar boundary.
   * If exactly at a bar boundary, returns the next one.
   */
  calculateBarBoundary(currentPosition: number): number {
    const samplesPerBar = this.samplesPerBar();
    const currentBar = Math.floor(currentPosition / samplesPerBar);
    return (currentBar + 1) * samplesPerBar;
  }

  /**
   * Calculate samples until next bar boundary
   *
   * Returns detailed information about time until next bar.
   * If currently at a bar boundary (except position 0), returns 0 samples.
   * Position 0 is special: returns samples to first bar boundary.
   */
  samplesToNextBar(currentPosition: number): SamplesToBoundary {
    // Position 0 is special - always return samples to first bar
    if (currentPosition === 0) {
      const samplesPerBar = this.samplesPerBar();
      return {
        samples: samplesPerBar,
        bars: 1,
        seconds: samplesPerBar / this.sampleRate
      };
    }

    // Check if already at a bar boundary
    if (this.isAtBarBoundary(currentPosition)) {
      return {
        samples: 0,
        bars: 0,
        seconds: 0
      };
    }

    const samplesPerBar = this.samplesPerBar();
    const nextBarPosition = this.calculateBarBoundary(currentPosition);
    const samples = nextBarPosition - currentPosition;
    const bars = 1; // 1 bar to the next boundary
    const seconds = samples / this.sampleRate;

    return {
      samples,
      bars,
      seconds
    };
  }

  /**
   * Check if currently at a bar boundary
   *
   * Returns true if position is exactly on a bar boundary (within sample precision).
   */
  isAtBarBoundary(currentPosition: number): boolean {
    const samplesPerBar = this.samplesPerBar();
    const currentBar = Math.floor(currentPosition / samplesPerBar);
    const barStart = currentBar * samplesPerBar;
    return Math.abs(currentPosition - barStart) < 1.0; // Within 1 sample
  }

  /**
   * Calculate Nth bar boundary from start
   *
   * barNumber = 0 returns first bar boundary (position 0)
   * barNumber = 1 returns end of first bar
   * barNumber = 2 returns end of second bar
   */
  calculateNthBarBoundary(barNumber: number): number {
    if (barNumber < 0) {
      throw new Error(`Bar number must be >= 0: ${barNumber}`);
    }
    return this.samplesPerBar() * barNumber;
  }

  /**
   * Get current bar number from position
   *
   * Returns which bar we're currently in (0-indexed).
   */
  getCurrentBar(currentPosition: number): number {
    const samplesPerBar = this.samplesPerBar();
    return Math.floor(currentPosition / samplesPerBar);
  }

  /**
   * Calculate position within current bar (0 to samplesPerBar)
   */
  positionInBar(currentPosition: number): number {
    const samplesPerBar = this.samplesPerBar();
    return currentPosition % samplesPerBar;
  }

  /**
   * Convert sample position to bar:beat format
   *
   * Returns bar number and beat number within that bar.
   */
  positionToBarBeat(currentPosition: number): BarPosition {
    const samplesPerBeat = this.samplesPerBeat();
    const samplesPerBar = this.samplesPerBar();
    const beatsPerBar = this.timeSignature[0];

    const bar = Math.floor(currentPosition / samplesPerBar);
    const positionInBar = currentPosition % samplesPerBar;
    const beat = Math.floor(positionInBar / samplesPerBeat);

    return {
      bar,
      position: bar * samplesPerBar + beat * samplesPerBeat
    };
  }

  /**
   * Calculate specific beat boundary within a bar
   *
   * beatIndex: 0 = first beat, 1 = second beat, etc.
   * barNumber: Which bar to target (0 = current bar context)
   */
  calculateBeatBoundary(beatIndex: number, barNumber: number = 0): number {
    const beatsPerBar = this.timeSignature[0];

    if (beatIndex < 0 || beatIndex >= beatsPerBar) {
      throw new Error(
        `Beat index ${beatIndex} out of range for ${beatsPerBar}/${this.timeSignature[1]} time`
      );
    }

    const samplesPerBeat = this.samplesPerBeat();
    const barStart = barNumber * this.samplesPerBar();
    return barStart + (beatIndex * samplesPerBeat);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a BarBoundaryDetector with standard parameters
 */
export function createBarBoundaryDetector(options: {
  sampleRate: number;
  tempo: number;
  timeSignature: TimeSignature;
}): BarBoundaryDetector {
  return new BarBoundaryDetector(options);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate bar boundary without instantiating detector
 *
 * Convenience function for one-off calculations.
 */
export function calculateBarBoundary(options: {
  currentPosition: number;
  tempo: number;
  timeSignature: TimeSignature;
  sampleRate: number;
}): number {
  const detector = new BarBoundaryDetector(options);
  return detector.calculateBarBoundary(options.currentPosition);
}

/**
 * Calculate samples to next bar without instantiating detector
 */
export function samplesToNextBar(options: {
  currentPosition: number;
  tempo: number;
  timeSignature: TimeSignature;
  sampleRate: number;
}): SamplesToBoundary {
  const detector = new BarBoundaryDetector(options);
  return detector.samplesToNextBar(options.currentPosition);
}

/**
 * Check if at bar boundary without instantiating detector
 */
export function isAtBarBoundary(options: {
  currentPosition: number;
  tempo: number;
  timeSignature: TimeSignature;
  sampleRate: number;
}): boolean {
  const detector = new BarBoundaryDetector(options);
  return detector.isAtBarBoundary(options.currentPosition);
}

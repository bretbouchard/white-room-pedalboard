/**
 * TensionAccumulator - Central tension state management
 *
 * This service provides the single source of truth for structural tension
 * across all musical domains. Components write tension changes here, and
 * the system reads the aggregated tension to drive decisions.
 *
 * Schillinger Principle:
 * - All tension MUST be written by actual musical events
 * - Tension accumulates across domains but can be queried as a total
 * - Tension changes must be explainable and reversible
 *
 * @module structure/TensionAccumulator
 */

import {
  StructuralTension,
  totalTension,
  zeroTension,
  copyTension,
} from "./StructuralTension";

/**
 * Context for tension changes (critical for explainability)
 */
export interface TensionChange {
  /** Which domain changed */
  domain: "rhythmic" | "harmonic" | "formal";

  /** Previous value */
  from: number;

  /** New value */
  to: number;

  /** What caused this change (e.g., "drill_fill_bar_16", "cadence_perfect") */
  cause: string;

  /** When this change occurred (musical time) */
  musicalTime: {
    bar: number;
    beat: number;
    position: number;
  };

  /** Severity/direction of change */
  magnitude: number;
}

/**
 * Tension history for analysis and explainability
 */
export interface TensionSnapshot {
  tension: StructuralTension;
  total: number;
  time: number; // milliseconds
  musicalTime: {
    bar: number;
    beat: number;
  };
}

/**
 * Accumulates and manages structural tension across the composition
 *
 * Usage:
 * 1. Create accumulator at start of composition
 * 2. Components write tension via writeRhythmicTension(), writeHarmonicTension(), etc.
 * 3. Query current state via getCurrent() or getTotal()
 * 4. Access history for explainability
 */
export class TensionAccumulator {
  private current: StructuralTension;
  private history: TensionSnapshot[] = [];
  private changes: TensionChange[] = [];
  private startTime: number = Date.now();

  /**
   * Maximum history length (prevent memory issues in long compositions)
   */
  private static readonly MAX_HISTORY = 10000;

  /**
   * Musical time tracking
   */
  private musicalPosition: {
    bar: number;
    beat: number;
    position: number; // position within beat (0..1)
  } = { bar: 1, beat: 1, position: 0 };

  constructor() {
    this.current = zeroTension();
  }

  /**
   * Update musical position (called by timing system)
   *
   * @param bar - Current bar number (1-indexed)
   * @param beat - Current beat within bar (1-indexed)
   * @param position - Position within beat (0..1)
   */
  updatePosition(bar: number, beat: number, position: number = 0): void {
    this.musicalPosition = { bar, beat, position };
  }

  /**
   * Get current musical position
   *
   * Returns the current bar, beat, and position within beat
   */
  getMusicalPosition(): { bar: number; beat: number; position: number } {
    return { ...this.musicalPosition };
  }

  /**
   * Write rhythmic tension (drill, fills, gates, density, etc.)
   *
   * Usage examples:
   * - Drill at bar 16: writeRhythmicTension(0.8, "drill_fill_bar_16")
   * - Silence gate: writeRhythmicTension(0.9, "gate_silence_expected")
   * - Normal groove: writeRhythmicTension(0.1, "groove_stable")
   *
   * @param value - Tension value 0..1
   * @param cause - What musical event caused this change
   */
  writeRhythmicTension(value: number, cause: string): void {
    const previous = this.current.rhythmic;
    const clamped = Math.max(0, Math.min(1, value));

    this.current.rhythmic = clamped;
    this.recordChange("rhythmic", previous, clamped, cause);
    this.snapshot();
  }

  /**
   * Write harmonic tension (chord instability, dissonance, etc.)
   *
   * Usage examples:
   * - Stable tonic: writeHarmonicTension(0.1, "chord_C_major")
   * - Dominant preparation: writeHarmonicTension(0.6, "dominant_preparation_G7")
   * - Diminished seventh: writeHarmonicTension(0.9, "chord_fully_diminished")
   *
   * @param value - Tension value 0..1
   * @param cause - What musical event caused this change
   */
  writeHarmonicTension(value: number, cause: string): void {
    const previous = this.current.harmonic;
    const clamped = Math.max(0, Math.min(1, value));

    this.current.harmonic = clamped;
    this.recordChange("harmonic", previous, clamped, cause);
    this.snapshot();
  }

  /**
   * Write formal tension (phrase boundaries, cadences, etc.)
   *
   * Usage examples:
   * - Mid-phrase: writeFormalTension(0.2, "phrase_continuation")
   * - Phrase ending: writeFormalTension(0.7, "phrase_boundary_bar_4")
   * - Perfect cadence: writeFormalTension(0.9, "cadence_perfect_section_end")
   *
   * @param value - Tension value 0..1
   * @param cause - What musical event caused this change
   */
  writeFormalTension(value: number, cause: string): void {
    const previous = this.current.formal;
    const clamped = Math.max(0, Math.min(1, value));

    this.current.formal = clamped;
    this.recordChange("formal", previous, clamped, cause);
    this.snapshot();
  }

  /**
   * Write multiple tension domains atomically
   *
   * Use this when multiple domains change simultaneously
   * (e.g., section transition affects all domains)
   */
  writeTension(tension: Partial<StructuralTension>, cause: string): void {
    if (tension.rhythmic !== undefined) {
      this.writeRhythmicTension(tension.rhythmic, `${cause}_rhythmic`);
    }
    if (tension.harmonic !== undefined) {
      this.writeHarmonicTension(tension.harmonic, `${cause}_harmonic`);
    }
    if (tension.formal !== undefined) {
      this.writeFormalTension(tension.formal, `${cause}_formal`);
    }
  }

  /**
   * Get current tension state
   */
  getCurrent(): StructuralTension {
    return copyTension(this.current);
  }

  /**
   * Get total aggregated tension
   */
  getTotal(): number {
    return totalTension(this.current);
  }

  /**
   * Get tension change history
   */
  getChanges(): TensionChange[] {
    return [...this.changes];
  }

  /**
   * Get recent changes within a time window
   *
   * @param bars - Number of bars to look back
   */
  getRecentChanges(bars: number): TensionChange[] {
    const currentBar = this.musicalPosition.bar;
    return this.changes.filter(
      (change) => change.musicalTime.bar >= currentBar - bars,
    );
  }

  /**
   * Get tension history snapshots
   */
  getHistory(): TensionSnapshot[] {
    return [...this.history];
  }

  /**
   * Find tension peak in recent history
   *
   * Useful for resolution logic and avoiding repeated climaxes
   *
   * @param bars - Number of bars to look back (default: 32)
   */
  findPeakTension(
    bars: number = 32,
  ): { tension: number; at: TensionSnapshot } | null {
    const currentBar = this.musicalPosition.bar;
    const recentHistory = this.history.filter(
      (snapshot) => snapshot.musicalTime.bar >= currentBar - bars,
    );

    if (recentHistory.length === 0) {
      return null;
    }

    const peak = recentHistory.reduce((max, snapshot) =>
      snapshot.total > max.total ? snapshot : max,
    );

    return {
      tension: peak.total,
      at: peak,
    };
  }

  /**
   * Explain why tension is at its current level
   *
   * Returns human-readable explanation of recent tension changes
   */
  explainCurrentState(): string {
    const recentChanges = this.getRecentChanges(4);
    if (recentChanges.length === 0) {
      return "No tension changes recorded yet";
    }

    const explanations = recentChanges
      .slice(-3) // Last 3 changes
      .map((change) => {
        const direction = change.to > change.from ? "increased" : "decreased";
        const magnitude = Math.abs(change.magnitude).toFixed(2);
        return `${change.domain} ${direction} to ${change.to.toFixed(2)} (${magnitude}) due to ${change.cause} at bar ${change.musicalTime.bar}`;
      });

    return `Current tension: ${this.getTotal().toFixed(2)}. Recent changes:\n  - ${explanations.join("\n  - ")}`;
  }

  /**
   * Reset tension to zero (use between compositions)
   */
  reset(): void {
    this.current = zeroTension();
    this.history = [];
    this.changes = [];
    this.startTime = Date.now();
    this.musicalPosition = { bar: 1, beat: 1, position: 0 };
  }

  /**
   * Record a tension change for history
   */
  private recordChange(
    domain: "rhythmic" | "harmonic" | "formal",
    from: number,
    to: number,
    cause: string,
  ): void {
    const change: TensionChange = {
      domain,
      from,
      to,
      cause,
      musicalTime: {
        bar: this.musicalPosition.bar,
        beat: this.musicalPosition.beat,
        position: this.musicalPosition.position,
      },
      magnitude: to - from,
    };

    this.changes.push(change);

    // Limit changes history size
    if (this.changes.length > TensionAccumulator.MAX_HISTORY) {
      this.changes.shift();
    }
  }

  /**
   * Take a snapshot of current tension state
   */
  private snapshot(): void {
    const snapshot: TensionSnapshot = {
      tension: copyTension(this.current),
      total: totalTension(this.current),
      time: Date.now() - this.startTime,
      musicalTime: {
        bar: this.musicalPosition.bar,
        beat: this.musicalPosition.beat,
      },
    };

    this.history.push(snapshot);

    // Limit history size
    if (this.history.length > TensionAccumulator.MAX_HISTORY) {
      this.history.shift();
    }
  }
}

/**
 * Global tension accumulator singleton
 *
 * In most cases, use this global instance rather than creating
 * your own TensionAccumulator. This ensures all components
 * write to the same tension state.
 */
export const globalTension = new TensionAccumulator();

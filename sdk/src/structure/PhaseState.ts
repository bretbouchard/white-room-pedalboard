/**
 * Phase State - Persistent Phase Interference as Motion
 *
 * Schillinger Principle: Phase is motion, not decoration.
 * Controlled phase drift creates musical tension through
 * interference patterns between rhythmic layers.
 *
 * Key difference from humanization:
 * - Humanization: Random timing variations to sound "natural"
 * - Phase interference: Persistent, structured drift that creates motion
 *
 * @module structure/PhaseState
 */

import { clampTension } from "./StructuralTension";

/**
 * Phase state for a single rhythmic role
 */
export interface RolePhaseState {
  /** Current accumulated phase offset (beats, can be negative) */
  phaseOffset: number;

  /** Rate of drift per bar (beats/bar) */
  driftRate: number;

  /** Maximum allowed phase offset (beats) */
  maxOffset: number;

  /** Whether phase is locked (no drift) */
  locked: boolean;

  /** Role identifier */
  role: string;
}

/**
 * Phase event for tracking changes
 */
export interface PhaseEvent {
  role: string;
  previousOffset: number;
  newOffset: number;
  musicalTime: {
    bar: number;
    beat: number;
  };
  cause: string;
}

/**
 * Manages phase interference across multiple rhythmic roles
 *
 * Usage:
 * 1. Create phase state for each role (kick, snare, hats, etc.)
 * 2. Each bar, call advancePhase() to accumulate drift
 * 3. At phrase boundaries, call resetPhase() or invertPhase()
 * 4. Query current phase offsets for timing adjustments
 * 5. Phase magnitude contributes to rhythmic tension
 */
export class PhaseStateManager {
  private phases: Map<string, RolePhaseState> = new Map();
  private history: PhaseEvent[] = [];
  private currentBar: number = 1;
  private currentBeat: number = 1;

  /**
   * Register a rhythmic role for phase tracking
   *
   * @param role - Role identifier (e.g., "hats", "snare")
   * @param config - Phase configuration
   */
  registerRole(
    role: string,
    config: {
      initialOffset?: number;
      driftRate?: number;
      maxOffset?: number;
      locked?: boolean;
    } = {},
  ): void {
    const phase: RolePhaseState = {
      phaseOffset: config.initialOffset ?? 0,
      driftRate: config.driftRate ?? 0,
      maxOffset: config.maxOffset ?? 0.25, // Default: 1/16 note max drift
      locked: config.locked ?? false,
      role,
    };

    this.phases.set(role, phase);
  }

  /**
   * Update musical position
   */
  updatePosition(bar: number, beat: number): void {
    this.currentBar = bar;
    this.currentBeat = beat;
  }

  /**
   * Advance phase for a role (call once per bar)
   *
   * @param role - Role to advance
   * @returns New phase offset
   */
  advancePhase(role: string): number {
    const phase = this.phases.get(role);
    if (!phase || phase.locked) {
      return 0;
    }

    const previous = phase.phaseOffset;
    phase.phaseOffset += phase.driftRate;

    // Clamp to maximum offset
    phase.phaseOffset = Math.max(
      -phase.maxOffset,
      Math.min(phase.maxOffset, phase.phaseOffset),
    );

    this.recordEvent(role, previous, phase.phaseOffset, "phase_drift");

    return phase.phaseOffset;
  }

  /**
   * Reset phase to zero (use at section boundaries)
   *
   * Creates sense of resolution and return to stability
   *
   * @param role - Role to reset
   */
  resetPhase(role: string): void {
    const phase = this.phases.get(role);
    if (!phase) return;

    const previous = phase.phaseOffset;
    phase.phaseOffset = 0;

    this.recordEvent(role, previous, 0, "phase_reset");
  }

  /**
   * Invert phase (multiply by -1)
   *
   * Creates mirror image of current phase, useful for
   * creating variation while maintaining structure
   *
   * @param role - Role to invert
   */
  invertPhase(role: string): void {
    const phase = this.phases.get(role);
    if (!phase) return;

    const previous = phase.phaseOffset;
    phase.phaseOffset = -phase.phaseOffset;

    this.recordEvent(role, previous, phase.phaseOffset, "phase_inversion");
  }

  /**
   * Get current phase offset for a role
   *
   * @param role - Role to query
   * @returns Phase offset in beats
   */
  getPhase(role: string): number {
    const phase = this.phases.get(role);
    return phase?.phaseOffset ?? 0;
  }

  /**
   * Calculate phase magnitude as tension contribution
   *
   * Larger phase offsets create more rhythmic tension
   *
   * @param role - Role to measure
   * @returns Tension contribution 0..1
   */
  getPhaseTension(role: string): number {
    const phase = this.phases.get(role);
    if (!phase) return 0;

    // Normalize phase offset to tension
    // 0 offset = 0 tension, max offset = 0.3 tension
    const magnitude = Math.abs(phase.phaseOffset);
    const normalized = magnitude / phase.maxOffset;

    return clampTension(normalized * 0.3);
  }

  /**
   * Get total phase tension across all roles
   *
   * @returns Aggregate phase tension 0..1
   */
  getTotalPhaseTension(): number {
    let total = 0;

    for (const phase of this.phases.values()) {
      total += this.getPhaseTension(phase.role);
    }

    // Average across all roles
    const count = this.phases.size || 1;
    return clampTension(total / count);
  }

  /**
   * Set drift rate for a role
   *
   * @param role - Role to modify
   * @param rate - New drift rate (beats/bar)
   */
  setDriftRate(role: string, rate: number): void {
    const phase = this.phases.get(role);
    if (phase) {
      phase.driftRate = rate;
    }
  }

  /**
   * Lock a role's phase (prevent drift)
   *
   * Use for roles that should remain stable (e.g., kick)
   *
   * @param role - Role to lock
   * @param locked - Lock state
   */
  lockPhase(role: string, locked: boolean = true): void {
    const phase = this.phases.get(role);
    if (phase) {
      phase.locked = locked;
    }
  }

  /**
   * Get phase event history
   */
  getHistory(): PhaseEvent[] {
    return [...this.history];
  }

  /**
   * Get recent phase events within window
   *
   * @param bars - Number of bars to look back
   */
  getRecentEvents(bars: number): PhaseEvent[] {
    const currentBar = this.currentBar;
    return this.history.filter(
      (event) => event.musicalTime.bar >= currentBar - bars,
    );
  }

  /**
   * Explain current phase state
   */
  explainState(): string {
    const explanations: string[] = [];

    for (const phase of this.phases.values()) {
      const offsetMs = (phase.phaseOffset * 500).toFixed(0); // At 120 BPM
      const direction =
        phase.phaseOffset > 0
          ? "ahead"
          : phase.phaseOffset < 0
            ? "behind"
            : "locked";

      if (phase.locked) {
        explanations.push(`${phase.role}: locked (no drift)`);
      } else if (Math.abs(phase.phaseOffset) < 0.01) {
        explanations.push(`${phase.role}: in phase`);
      } else {
        explanations.push(
          `${phase.role}: ${offsetMs}ms ${direction} ` +
            `(drifting ${phase.driftRate > 0 ? "forward" : phase.driftRate < 0 ? "backward" : "none"})`,
        );
      }
    }

    return explanations.join("\n") || "No phase states registered";
  }

  /**
   * Reset all phases (use between pieces)
   */
  reset(): void {
    for (const phase of this.phases.values()) {
      phase.phaseOffset = 0;
    }
    this.history = [];
    this.currentBar = 1;
    this.currentBeat = 1;
  }

  /**
   * Record a phase event for history
   */
  private recordEvent(
    role: string,
    previousOffset: number,
    newOffset: number,
    cause: string,
  ): void {
    const event: PhaseEvent = {
      role,
      previousOffset,
      newOffset,
      musicalTime: {
        bar: this.currentBar,
        beat: this.currentBeat,
      },
      cause,
    };

    this.history.push(event);

    // Limit history size
    if (this.history.length > 10000) {
      this.history.shift();
    }
  }
}

/**
 * Global phase state manager singleton
 */
export const globalPhaseState = new PhaseStateManager();

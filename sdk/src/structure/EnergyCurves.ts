/**
 * Energy Curves - Directionality, Inertia, and Exhaustion
 *
 * Schillinger Principle: Musical energy is separate from tension.
 * Tension is the current state, but energy tracks:
 * - Direction (rising vs falling)
 * - Inertia (resistance to change)
 * - Exhaustion (fatigue from sustained intensity)
 *
 * Energy prevents "always maximum tension" fatigue by adding
 * temporal dynamics and sustainability tracking.
 *
 * Examples:
 * - High tension with rising momentum → exciting, forward motion
 * - High tension with high exhaustion → fatiguing, needs resolution
 * - Low tension with falling momentum → relaxing, resolving
 *
 * @module structure/EnergyCurves
 */

import { TensionAccumulator } from "./TensionAccumulator";

/**
 * Energy state snapshot
 */
export interface EnergyState {
  /** Rate of tension change (-1.0 = falling fast, 1.0 = rising fast) */
  momentum: number;

  /** Resistance to tension change (0.0 = no resistance, 1.0 = high resistance) */
  inertia: number;

  /** Fatigue from sustained high tension (0.0 = fresh, 1.0 = exhausted) */
  exhaustion: number;

  /** Total energy score (0.0-1.0) */
  totalEnergy: number;
}

/**
 * Energy history entry
 */
export interface EnergySnapshot {
  /** Musical time */
  bar: number;
  beat: number;

  /** Energy state at this moment */
  energy: EnergyState;

  /** Tension at this moment */
  tension: number;

  /** Cause of the energy state */
  cause: string;
}

/**
 * Manages energy curves separate from tension
 *
 * Usage:
 * ```typescript
 * const energy = new EnergyManager(accumulator);
 *
 * // Update energy state
 * energy.update(bar, beat, 'high_energy_section');
 *
 * // Get current energy
 * const state = energy.getEnergyState();
 * console.log(`Momentum: ${state.momentum}, Exhaustion: ${state.exhaustion}`);
 *
 * // Check if exhausted (needs resolution)
 * if (energy.isExhausted()) {
 *   // Trigger resolution
 * }
 * ```
 */
export class EnergyManager {
  private accumulator: TensionAccumulator;
  private history: EnergySnapshot[] = [];
  private tensionHistory: number[] = [];
  private exhaustionAccumulator: number = 0;
  private currentBar: number = 1;
  private currentBeat: number = 1;

  // Configuration
  private readonly HISTORY_SIZE = 100; // Beats to track for momentum
  private readonly EXHAUSTION_THRESHOLD = 0.3; // Tension level that causes fatigue (accounting for weighted total)
  private readonly EXHAUSTION_DECAY = 0.05; // How fast exhaustion recovers
  private readonly MOMENTUM_WINDOW = 4; // Beats to average for momentum

  constructor(accumulator: TensionAccumulator) {
    this.accumulator = accumulator;
  }

  /**
   * Update energy state based on current tension
   */
  update(bar: number, beat: number, cause?: string): void {
    this.currentBar = bar;
    this.currentBeat = beat;

    const currentTension = this.accumulator.getTotal();

    // Update tension history
    this.tensionHistory.push(currentTension);
    if (this.tensionHistory.length > this.HISTORY_SIZE) {
      this.tensionHistory.shift();
    }

    // Calculate energy components
    const momentum = this.calculateMomentum();
    const inertia = this.calculateInertia();
    const exhaustion = this.updateExhaustion(currentTension);

    // Calculate total energy (momentum + (1 - exhaustion) / 2)
    // High momentum = high energy, high exhaustion = low energy
    const totalEnergy = (Math.abs(momentum) + (1 - exhaustion)) / 2;

    const energyState: EnergyState = {
      momentum,
      inertia,
      exhaustion,
      totalEnergy,
    };

    // Record snapshot
    this.recordSnapshot(energyState, currentTension, cause || "energy_update");
  }

  /**
   * Get current energy state
   */
  getEnergyState(): EnergyState {
    const currentTension = this.accumulator.getTotal();

    // Recalculate if history exists
    if (this.tensionHistory.length > 0) {
      const momentum = this.calculateMomentum();
      const inertia = this.calculateInertia();
      const exhaustion = this.exhaustionAccumulator;
      const totalEnergy = (Math.abs(momentum) + (1 - exhaustion)) / 2;

      return { momentum, inertia, exhaustion, totalEnergy };
    }

    // Default state
    return {
      momentum: 0,
      inertia: 0,
      exhaustion: 0,
      totalEnergy: 0.5,
    };
  }

  /**
   * Check if system is exhausted (needs resolution)
   */
  isExhausted(): boolean {
    const state = this.getEnergyState();
    return state.exhaustion > this.EXHAUSTION_THRESHOLD;
  }

  /**
   * Check if energy is rising (momentum > 0)
   */
  isRising(): boolean {
    const state = this.getEnergyState();
    return state.momentum > 0.1;
  }

  /**
   * Check if energy is falling (momentum < 0)
   */
  isFalling(): boolean {
    const state = this.getEnergyState();
    return state.momentum < -0.1;
  }

  /**
   * Get energy history
   */
  getHistory(): EnergySnapshot[] {
    return [...this.history];
  }

  /**
   * Reset energy state (fresh start)
   */
  reset(): void {
    this.tensionHistory = [];
    this.exhaustionAccumulator = 0;
    this.history = [];
  }

  /**
   * Reset exhaustion only (after resolution)
   */
  resetExhaustion(): void {
    this.exhaustionAccumulator = 0;
  }

  /**
   * Explain current energy state
   */
  explainState(): string {
    const state = this.getEnergyState();

    const momentumDesc = this.describeMomentum(state.momentum);
    const exhaustionDesc = this.describeExhaustion(state.exhaustion);
    const energyDesc = this.describeTotalEnergy(state.totalEnergy);

    return `Energy: ${momentumDesc}, ${exhaustionDesc}, Total: ${energyDesc}`;
  }

  /**
   * Calculate momentum from tension rate of change
   * @returns -1.0 (falling fast) to 1.0 (rising fast)
   */
  private calculateMomentum(): number {
    if (this.tensionHistory.length < 2) {
      return 0;
    }

    // Calculate slope over momentum window
    const window = Math.min(this.MOMENTUM_WINDOW, this.tensionHistory.length);
    const recent = this.tensionHistory.slice(-window);

    // Simple linear regression slope
    const n = recent.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = recent.reduce((a, b) => a + b, 0);
    const sumXY = recent.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Normalize slope to [-1, 1] (assuming max change of 0.5 per beat)
    return Math.max(-1, Math.min(1, slope * 2));
  }

  /**
   * Calculate inertia from resistance to change
   * @returns 0.0 (no resistance) to 1.0 (high resistance)
   */
  private calculateInertia(): number {
    if (this.tensionHistory.length < 3) {
      return 0;
    }

    // Calculate variance in recent tension
    const window = Math.min(this.MOMENTUM_WINDOW, this.tensionHistory.length);
    const recent = this.tensionHistory.slice(-window);

    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance =
      recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      recent.length;

    // Higher variance = lower inertia (more changeable)
    // Lower variance = higher inertia (more resistant)
    // Adjust formula: 1 - sqrt(variance) gives better sensitivity
    return Math.max(0, Math.min(1, 1 - Math.sqrt(variance) * 2));
  }

  /**
   * Update exhaustion based on sustained high tension
   * @returns 0.0 (fresh) to 1.0 (exhausted)
   */
  private updateExhaustion(currentTension: number): number {
    // Increase exhaustion if tension is high
    if (currentTension > this.EXHAUSTION_THRESHOLD) {
      // Accumulate exhaustion based on how far above threshold
      const excess = currentTension - this.EXHAUSTION_THRESHOLD;
      this.exhaustionAccumulator += excess * 0.5; // Increased accumulation rate
    } else {
      // Decay exhaustion when tension is low
      this.exhaustionAccumulator = Math.max(
        0,
        this.exhaustionAccumulator - this.EXHAUSTION_DECAY,
      );
    }

    // Clamp to [0, 1]
    return Math.min(1, this.exhaustionAccumulator);
  }

  /**
   * Describe momentum in human-readable terms
   */
  private describeMomentum(momentum: number): string {
    if (momentum > 0.5) return "rising fast";
    if (momentum > 0.1) return "rising";
    if (momentum < -0.5) return "falling fast";
    if (momentum < -0.1) return "falling";
    return "stable";
  }

  /**
   * Describe exhaustion in human-readable terms
   */
  private describeExhaustion(exhaustion: number): string {
    if (exhaustion > 0.8) return "exhausted";
    if (exhaustion > 0.5) return "fatigued";
    if (exhaustion > 0.2) return "tiring";
    return "fresh";
  }

  /**
   * Describe total energy in human-readable terms
   */
  private describeTotalEnergy(energy: number): string {
    if (energy > 0.8) return "very high";
    if (energy > 0.6) return "high";
    if (energy > 0.4) return "moderate";
    if (energy > 0.2) return "low";
    return "very low";
  }

  /**
   * Record current state snapshot
   */
  private recordSnapshot(
    energy: EnergyState,
    tension: number,
    cause: string,
  ): void {
    const snapshot: EnergySnapshot = {
      bar: this.currentBar,
      beat: this.currentBeat,
      energy,
      tension,
      cause,
    };

    this.history.push(snapshot);

    // Limit history size
    if (this.history.length > 1000) {
      this.history.shift();
    }
  }
}

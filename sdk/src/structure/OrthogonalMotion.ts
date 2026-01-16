/**
 * Orthogonal Parameter Motion - Counter-Motion as Musical Principle
 *
 * Schillinger Principle: Parameters move in opposition to create
 * sophisticated musical texture. When one parameter increases,
 * another decreases, creating dynamic balance.
 *
 * This is NOT randomization - it's structured, explainable,
 * and driven by musical tension.
 *
 * Examples:
 * - Density ↑ → Velocity ↓ (more notes, each quieter)
 * - Filter opens → Resonance ↓ (brighter tone, less ring)
 * - Pan widens → Reverb wet ↓ (stereo spread, less wash)
 *
 * @module structure/OrthogonalMotion
 */

import { TensionAccumulator } from "./TensionAccumulator";

/**
 * Parameter type that can have orthogonal motion
 */
export type ParameterType =
  | "density" // Note density (events per beat)
  | "velocity" // Note velocity/volume
  | "filter_cutoff" // Filter frequency
  | "filter_resonance" // Filter resonance/Q
  | "pan" // Stereo pan width
  | "reverb_wet" // Reverb mix
  | "attack" // Envelope attack time
  | "release" // Envelope release time
  | "mod_depth" // Modulation depth
  | "mod_rate"; // Modulation rate

/**
 * Parameter pair with inverse relationship
 */
export interface ParameterPair {
  /** Primary parameter that drives the relationship */
  primary: ParameterType;

  /** Secondary parameter that responds inversely */
  secondary: ParameterType;

  /** Correlation strength (0 = no relationship, 1 = perfect inverse) */
  correlation: number;

  /** Minimum value for both parameters */
  min: number;

  /** Maximum value for both parameters */
  max: number;

  /** Current primary value */
  primaryValue: number;

  /** Current secondary value */
  secondaryValue: number;
}

/**
 * Orthogonal motion snapshot
 */
export interface OrthogonalMotionSnapshot {
  /** Musical time */
  bar: number;
  beat: number;

  /** All parameter pairs with their values */
  parameters: Map<ParameterType, number>;

  /** Total orthogonal tension (how much counter-motion is happening) */
  tension: number;

  /** Cause of the motion */
  cause: string;
}

/**
 * Manages orthogonal parameter motion based on musical tension
 *
 * Usage:
 * ```typescript
 * const motion = new OrthogonalMotion(accumulator);
 *
 * // Register a parameter pair
 * motion.registerPair({
 *   primary: 'density',
 *   secondary: 'velocity',
 *   correlation: 0.8,
 *   min: 0,
 *   max: 1
 * });
 *
 * // Update parameters based on tension
 * motion.updateParameters(bar, beat);
 * ```
 */
export class OrthogonalMotionManager {
  private pairs: Map<string, ParameterPair> = new Map();
  private accumulator: TensionAccumulator;
  private history: OrthogonalMotionSnapshot[] = [];
  private currentBar: number = 1;
  private currentBeat: number = 1;

  constructor(accumulator: TensionAccumulator) {
    this.accumulator = accumulator;
  }

  /**
   * Register a parameter pair with inverse relationship
   */
  registerPair(config: {
    primary: ParameterType;
    secondary: ParameterType;
    correlation?: number;
    min?: number;
    max?: number;
    initialPrimary?: number;
  }): void {
    const pair: ParameterPair = {
      primary: config.primary,
      secondary: config.secondary,
      correlation: config.correlation ?? 0.8,
      min: config.min ?? 0,
      max: config.max ?? 1,
      primaryValue: config.initialPrimary ?? 0.5,
      secondaryValue: 0.5, // Will be calculated
    };

    // Calculate initial secondary value
    pair.secondaryValue = this.calculateSecondary(pair);

    const key = this.getPairKey(config.primary, config.secondary);
    this.pairs.set(key, pair);
  }

  /**
   * Update all parameter pairs based on current musical tension
   *
   * High tension → primary increases, secondary decreases
   * Low tension → primary decreases, secondary increases
   */
  updateParameters(bar: number, beat: number, cause?: string): void {
    this.currentBar = bar;
    this.currentBeat = beat;

    const currentTension = this.accumulator.getTotal();

    // Update each pair based on tension
    for (const pair of this.pairs.values()) {
      // High tension drives primary up, secondary down
      // Low tension drives primary down, secondary up

      // Map tension [0, 1] to primary value [min, max]
      const targetPrimary = this.mapTensionToValue(
        currentTension,
        pair.min,
        pair.max,
      );

      // Smooth transition to target (prevent jumping)
      pair.primaryValue = this.smoothTransition(
        pair.primaryValue,
        targetPrimary,
        0.5, // Smoothing factor (more responsive)
      );

      // Calculate inverse secondary value
      pair.secondaryValue = this.calculateSecondary(pair);

      // Clamp to bounds
      pair.primaryValue = Math.max(
        pair.min,
        Math.min(pair.max, pair.primaryValue),
      );
      pair.secondaryValue = Math.max(
        pair.min,
        Math.min(pair.max, pair.secondaryValue),
      );
    }

    // Record snapshot
    this.recordSnapshot(cause || "orthogonal_motion_update");
  }

  /**
   * Get current value of a parameter
   */
  getParameterValue(param: ParameterType): number {
    for (const pair of this.pairs.values()) {
      if (pair.primary === param) {
        return pair.primaryValue;
      }
      if (pair.secondary === param) {
        return pair.secondaryValue;
      }
    }
    return 0.5; // Default
  }

  /**
   * Get all current parameter values
   */
  getAllParameters(): Map<ParameterType, number> {
    const params = new Map<ParameterType, number>();

    for (const pair of this.pairs.values()) {
      params.set(pair.primary, pair.primaryValue);
      params.set(pair.secondary, pair.secondaryValue);
    }

    return params;
  }

  /**
   * Get snapshot history
   */
  getHistory(): OrthogonalMotionSnapshot[] {
    return [...this.history];
  }

  /**
   * Calculate total orthogonal tension
   *
   * Measures how much counter-motion is happening across all pairs
   */
  getOrthogonalTension(): number {
    let totalDeviation = 0;
    let pairCount = 0;

    for (const pair of this.pairs.values()) {
      // Deviation from center (0.5) indicates orthogonal motion
      const primaryDev = Math.abs(pair.primaryValue - 0.5);
      const secondaryDev = Math.abs(pair.secondaryValue - 0.5);

      // Ideal orthogonal motion: one high, one low
      // Maximum tension when primary=1, secondary=0 or vice versa
      const pairTension = primaryDev + secondaryDev;

      totalDeviation += pairTension;
      pairCount++;
    }

    // Average across all pairs, normalized to [0, 1]
    return pairCount > 0 ? Math.min(totalDeviation / pairCount, 1) : 0;
  }

  /**
   * Manually set a parameter value (for direct control)
   */
  setParameter(param: ParameterType, value: number): void {
    for (const pair of this.pairs.values()) {
      if (pair.primary === param) {
        pair.primaryValue = value;
        pair.secondaryValue = this.calculateSecondary(pair);
        return;
      }
      if (pair.secondary === param) {
        pair.secondaryValue = value;
        // Recalculate primary based on correlation
        const normalized = (value - pair.min) / (pair.max - pair.min);
        const inverseNormalized = 1 - normalized;
        pair.primaryValue =
          pair.min + inverseNormalized * (pair.max - pair.min);
        pair.primaryValue =
          pair.primaryValue * pair.correlation + 0.5 * (1 - pair.correlation);
        return;
      }
    }
  }

  /**
   * Reset all parameters to center
   */
  reset(): void {
    for (const pair of this.pairs.values()) {
      pair.primaryValue = 0.5;
      pair.secondaryValue = 0.5;
    }
    this.history = [];
  }

  /**
   * Explain current orthogonal motion state
   */
  explainState(): string {
    const explanations: string[] = [];

    for (const pair of this.pairs.values()) {
      const primaryDirection =
        pair.primaryValue > 0.5
          ? "high"
          : pair.primaryValue < 0.5
            ? "low"
            : "neutral";
      const secondaryDirection =
        pair.secondaryValue > 0.5
          ? "high"
          : pair.secondaryValue < 0.5
            ? "low"
            : "neutral";

      const orthogonal = primaryDirection !== secondaryDirection;

      explanations.push(
        `${pair.primary} (${primaryDirection}) ↔ ${pair.secondary} (${secondaryDirection})` +
          (orthogonal ? " [orthogonal]" : " [parallel]"),
      );
    }

    return explanations.join("\n") || "No parameter pairs registered";
  }

  /**
   * Calculate secondary value from primary (inverse relationship)
   */
  private calculateSecondary(pair: ParameterPair): number {
    // Normalize primary to [0, 1]
    const normalizedPrimary =
      (pair.primaryValue - pair.min) / (pair.max - pair.min);

    // Inverse for secondary
    const inverseNormalized = 1 - normalizedPrimary;

    // Apply correlation (1.0 = perfect inverse, 0.0 = no relationship)
    const blended =
      inverseNormalized * pair.correlation +
      normalizedPrimary * (1 - pair.correlation);

    // Map back to parameter range
    return pair.min + blended * (pair.max - pair.min);
  }

  /**
   * Map tension value to parameter value
   */
  private mapTensionToValue(tension: number, min: number, max: number): number {
    // Higher tension = higher primary parameter
    return min + tension * (max - min);
  }

  /**
   * Smooth transition between values (prevents jumping)
   */
  private smoothTransition(
    current: number,
    target: number,
    factor: number,
  ): number {
    return current + factor * (target - current);
  }

  /**
   * Get key for parameter pair storage
   */
  private getPairKey(primary: ParameterType, secondary: ParameterType): string {
    return `${primary}_${secondary}`;
  }

  /**
   * Record current state snapshot
   */
  private recordSnapshot(cause: string): void {
    const snapshot: OrthogonalMotionSnapshot = {
      bar: this.currentBar,
      beat: this.currentBeat,
      parameters: this.getAllParameters(),
      tension: this.getOrthogonalTension(),
      cause,
    };

    this.history.push(snapshot);

    // Limit history size
    if (this.history.length > 10000) {
      this.history.shift();
    }
  }
}

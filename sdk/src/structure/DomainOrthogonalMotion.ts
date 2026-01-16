/**
 * Domain-Level Orthogonal Motion
 *
 * Implements Schillinger's principle of domain-level counter-motion:
 * "If rhythm ↑ then harmony ↓"
 *
 * Musical domains should move in opposition to create sophisticated texture.
 * When one domain becomes complex, another should simplify to maintain balance.
 *
 * This is different from parameter-level orthogonal motion (OrthogonalMotionManager).
 * Domain orthogonal motion operates at the musical level (rhythm, harmony, orchestration),
 * not the synthesis level (density, velocity, filter).
 *
 * Schillinger Principle:
 * - Too much complexity in all domains = overwhelming chaos
 * - Balanced opposition = sophisticated, listenable music
 * - Counter-motion creates clarity through contrast
 *
 * @module structure/DomainOrthogonalMotion
 */

import { StructuralTension } from "./StructuralTension";
import { TensionAccumulator, globalTension } from "./TensionAccumulator";

/**
 * Musical domains that can move orthogonally
 */
export type MusicalDomain = "rhythm" | "harmony" | "orchestration";

/**
 * Domain complexity level
 */
export interface DomainLevel {
  /** Current complexity level 0..1 */
  complexity: number;
  /** Rate of change (increasing/decreasing/stable) */
  trend: "increasing" | "decreasing" | "stable";
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Domain pair with inverse relationship
 */
export interface DomainPair {
  primary: MusicalDomain;
  secondary: MusicalDomain;
  /** Strength of inverse relationship 0..1 */
  correlation: number;
  /** Whether counter-motion is active */
  active: boolean;
}

/**
 * Orthogonal motion snapshot
 */
export interface DomainOrthogonalSnapshot {
  /** Current domain levels */
  domains: Record<MusicalDomain, DomainLevel>;
  /** Active domain pairs */
  pairs: DomainPair[];
  /** Total orthogonal tension (how much counter-motion is happening) */
  orthogonalTension: number;
  /** Musical balance score (0..1, higher = more balanced) */
  balance: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Domain recommendation
 */
export interface DomainRecommendation {
  /** Which domain should adjust */
  domain: MusicalDomain;
  /** Recommended action */
  action: "increase" | "decrease" | "maintain";
  /** Target complexity */
  target: number;
  /** Reason for recommendation */
  reason: string;
}

/**
 * Domain orthogonal motion configuration
 */
export interface DomainOrthogonalConfig {
  /** Enable rhythm-harmony counter-motion */
  rhythmHarmony: boolean;
  /** Enable rhythm-orchestration counter-motion */
  rhythmOrchestration: boolean;
  /** Enable harmony-orchestration counter-motion */
  harmonyOrchestration: boolean;
  /** Threshold for activating counter-motion (0..1) */
  activationThreshold: number;
  /** Smoothing factor for domain changes (0..1) */
  smoothing: number;
  /** Minimum time between adjustments (ms) */
  minAdjustmentInterval: number;
}

/**
 * Domain-Level Orthogonal Motion Manager
 *
 * Manages counter-motion between musical domains to create
 * sophisticated, balanced textures.
 *
 * Usage:
 * ```typescript
 * const manager = new DomainOrthogonalMotionManager(accumulator, {
 *   rhythmHarmony: true,
 *   rhythmOrchestration: false,
 *   harmonyOrchestration: true
 * });
 *
 * // Update domains based on current musical state
 * manager.updateDomains(currentTension, bar, beat, 'building_section');
 *
 * // Get domain recommendations
 * const recommendations = manager.getRecommendations();
 *
 * // Check if music is balanced
 * const snapshot = manager.getSnapshot();
 * console.log(`Balance: ${snapshot.balance.toFixed(2)}`);
 * ```
 */
export class DomainOrthogonalMotionManager {
  private accumulator: TensionAccumulator;
  private config: DomainOrthogonalConfig;

  // Domain levels
  private domains: Record<MusicalDomain, DomainLevel>;

  // Domain pairs
  private pairs: DomainPair[];

  // History of snapshots
  private history: DomainOrthogonalSnapshot[] = [];
  private static readonly MAX_HISTORY = 500;

  // Last adjustment time
  private lastAdjustmentTime: number = 0;

  // Default configuration
  private readonly DEFAULT_ACTIVATION_THRESHOLD = 0.6;
  private readonly DEFAULT_SMOOTHING = 0.3;
  private readonly DEFAULT_MIN_INTERVAL = 1000; // 1 second

  constructor(
    accumulator: TensionAccumulator,
    config?: Partial<DomainOrthogonalConfig>,
  ) {
    this.accumulator = accumulator;

    this.config = {
      rhythmHarmony: config?.rhythmHarmony ?? true,
      rhythmOrchestration: config?.rhythmOrchestration ?? false,
      harmonyOrchestration: config?.harmonyOrchestration ?? true,
      activationThreshold:
        config?.activationThreshold ?? this.DEFAULT_ACTIVATION_THRESHOLD,
      smoothing: config?.smoothing ?? this.DEFAULT_SMOOTHING,
      minAdjustmentInterval:
        config?.minAdjustmentInterval ?? this.DEFAULT_MIN_INTERVAL,
    };

    // Initialize domain levels
    this.domains = {
      rhythm: { complexity: 0, trend: "stable", lastUpdate: Date.now() },
      harmony: { complexity: 0, trend: "stable", lastUpdate: Date.now() },
      orchestration: { complexity: 0, trend: "stable", lastUpdate: Date.now() },
    };

    // Initialize domain pairs
    this.pairs = [];
    if (this.config.rhythmHarmony) {
      this.pairs.push({
        primary: "rhythm",
        secondary: "harmony",
        correlation: 0.8,
        active: true,
      });
    }
    if (this.config.rhythmOrchestration) {
      this.pairs.push({
        primary: "rhythm",
        secondary: "orchestration",
        correlation: 0.7,
        active: true,
      });
    }
    if (this.config.harmonyOrchestration) {
      this.pairs.push({
        primary: "harmony",
        secondary: "orchestration",
        correlation: 0.6,
        active: true,
      });
    }
  }

  /**
   * Update domain levels based on current musical tension
   *
   * @param tension - Current structural tension
   * @param cause - Musical cause of this update
   * @returns Snapshot of domain state after update
   */
  updateDomains(
    tension: StructuralTension,
    cause: string,
  ): DomainOrthogonalSnapshot {
    const now = Date.now();

    // Check if enough time has passed since last adjustment
    if (now - this.lastAdjustmentTime < this.config.minAdjustmentInterval) {
      return this.getSnapshot();
    }

    // Update domain levels from tension
    this.updateDomainLevel("rhythm", tension.rhythmic, now);
    this.updateDomainLevel("harmony", tension.harmonic, now);
    this.updateDomainLevel("orchestration", tension.formal, now); // Use formal as proxy

    // Apply counter-motion if needed
    this.applyCounterMotion(cause);

    // Record snapshot
    const snapshot = this.recordSnapshot();

    this.lastAdjustmentTime = now;

    return snapshot;
  }

  /**
   * Update a single domain level
   */
  private updateDomainLevel(
    domain: MusicalDomain,
    tension: number,
    now: number,
  ): void {
    const previous = this.domains[domain];
    const previousComplexity = previous.complexity;

    // Determine trend based on previous value, not current
    let trend: "increasing" | "decreasing" | "stable";
    if (tension > previousComplexity + 0.05) {
      trend = "increasing";
    } else if (tension < previousComplexity - 0.05) {
      trend = "decreasing";
    } else {
      trend = "stable";
    }

    // Smooth update
    const smoothing = this.config.smoothing;
    const newComplexity =
      previousComplexity + smoothing * (tension - previousComplexity);

    this.domains[domain] = {
      complexity: Math.max(0, Math.min(1, newComplexity)),
      trend,
      lastUpdate: now,
    };
  }

  /**
   * Apply counter-motion between domain pairs
   */
  private applyCounterMotion(cause: string): void {
    for (const pair of this.pairs) {
      if (!pair.active) continue;

      const primary = this.domains[pair.primary];
      const secondary = this.domains[pair.secondary];

      // Only apply counter-motion if primary is above threshold
      if (primary.complexity < this.config.activationThreshold) {
        continue;
      }

      // Calculate how much secondary should decrease
      const excess = primary.complexity - this.config.activationThreshold;
      const adjustment = excess * pair.correlation;

      // Decrease secondary (can go to 0, not 0.1)
      const targetSecondary = Math.max(0, secondary.complexity - adjustment);

      // Apply change directly (no smoothing for counter-motion - should be responsive)
      this.domains[pair.secondary] = {
        ...secondary,
        complexity: Math.max(0, Math.min(1, targetSecondary)),
        trend:
          targetSecondary < secondary.complexity
            ? "decreasing"
            : secondary.trend,
      };

      // Write to formal tension to explain the adjustment
      const tensionImpact = adjustment * 0.2; // Counter-motion adds some formal tension
      if (tensionImpact > 0.01) {
        this.accumulator.writeFormalTension(
          tensionImpact,
          `domain_counter_motion: ${pair.primary}↑ → ${pair.secondary}↓ (${cause})`,
        );
      }
    }
  }

  /**
   * Get current domain levels
   */
  getDomainLevels(): Record<MusicalDomain, DomainLevel> {
    return { ...this.domains };
  }

  /**
   * Get recommendations for balancing domains
   */
  getRecommendations(): DomainRecommendation[] {
    const recommendations: DomainRecommendation[] = [];
    const snapshot = this.getSnapshot();

    // Check if balance is low
    if (snapshot.balance > 0.6) {
      return recommendations; // Already balanced
    }

    // Find most imbalanced pair
    for (const pair of this.pairs) {
      const primary = this.domains[pair.primary];
      const secondary = this.domains[pair.secondary];

      // If primary is much higher than secondary
      if (primary.complexity > secondary.complexity + 0.3) {
        recommendations.push({
          domain: pair.secondary,
          action: "increase",
          target: Math.min(1, secondary.complexity + 0.2),
          reason: `${pair.secondary} is too low compared to ${pair.primary} (counter-motion)`,
        });
      }

      // If secondary is too low overall
      if (secondary.complexity < 0.2 && primary.complexity > 0.5) {
        recommendations.push({
          domain: pair.secondary,
          action: "increase",
          target: 0.3,
          reason: `${pair.secondary} is too low (counter-motion with ${pair.primary})`,
        });
      }
    }

    return recommendations;
  }

  /**
   * Get current snapshot of domain state
   */
  getSnapshot(): DomainOrthogonalSnapshot {
    const domains = this.getDomainLevels();

    // Calculate orthogonal tension (total deviation from center)
    const center = 0.5;
    const totalDeviation = Object.values(domains).reduce(
      (sum, domain) => sum + Math.abs(domain.complexity - center),
      0,
    );
    const orthogonalTension = Math.min(totalDeviation / 1.5, 1);

    // Calculate balance (inverse of range, normalized 0-1)
    const values = Object.values(domains).map((d) => d.complexity);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;
    const balance = Math.max(0, 1 - range / 1); // Normalize to 0-1

    return {
      domains,
      pairs: [...this.pairs],
      orthogonalTension,
      balance,
      timestamp: Date.now(),
    };
  }

  /**
   * Explain current domain state
   */
  explainState(): string[] {
    const explanations: string[] = [];
    const snapshot = this.getSnapshot();

    for (const [domain, level] of Object.entries(snapshot.domains)) {
      const complexity = level.complexity;
      let description: string;

      if (complexity < 0.3) {
        description = "low";
      } else if (complexity < 0.7) {
        description = "medium";
      } else {
        description = "high";
      }

      const trend =
        level.trend === "increasing"
          ? "↑"
          : level.trend === "decreasing"
            ? "↓"
            : "→";

      explanations.push(`${domain} (${description}${trend})`);
    }

    // Explain counter-motion
    for (const pair of snapshot.pairs) {
      if (!pair.active) continue;

      const primary = snapshot.domains[pair.primary];
      const secondary = snapshot.domains[pair.secondary];

      if (primary.complexity > 0.6 && secondary.complexity < 0.4) {
        explanations.push(
          `${pair.primary}↑ ↔ ${pair.secondary}↓ [counter-motion]`,
        );
      }
    }

    // Overall balance
    explanations.push(`balance: ${(snapshot.balance * 100).toFixed(0)}%`);
    explanations.push(
      `orthogonal tension: ${snapshot.orthogonalTension.toFixed(2)}`,
    );

    return explanations;
  }

  /**
   * Record snapshot to history
   */
  private recordSnapshot(): DomainOrthogonalSnapshot {
    const snapshot = this.getSnapshot();
    this.history.push(snapshot);

    // Limit history
    if (this.history.length > DomainOrthogonalMotionManager.MAX_HISTORY) {
      this.history.shift();
    }

    return snapshot;
  }

  /**
   * Get snapshot history
   */
  getHistory(): DomainOrthogonalSnapshot[] {
    return [...this.history];
  }

  /**
   * Get recent snapshots within time window
   */
  getRecentHistory(durationMs: number): DomainOrthogonalSnapshot[] {
    const now = Date.now();
    return this.history.filter((s) => now - s.timestamp < durationMs);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DomainOrthogonalConfig>): void {
    this.config = { ...this.config, ...config };

    // Update pairs based on new config
    this.pairs = [];
    if (this.config.rhythmHarmony) {
      this.pairs.push({
        primary: "rhythm",
        secondary: "harmony",
        correlation: 0.8,
        active: true,
      });
    }
    if (this.config.rhythmOrchestration) {
      this.pairs.push({
        primary: "rhythm",
        secondary: "orchestration",
        correlation: 0.7,
        active: true,
      });
    }
    if (this.config.harmonyOrchestration) {
      this.pairs.push({
        primary: "harmony",
        secondary: "orchestration",
        correlation: 0.6,
        active: true,
      });
    }
  }

  /**
   * Reset domain state
   */
  reset(): void {
    this.domains = {
      rhythm: { complexity: 0, trend: "stable", lastUpdate: Date.now() },
      harmony: { complexity: 0, trend: "stable", lastUpdate: Date.now() },
      orchestration: { complexity: 0, trend: "stable", lastUpdate: Date.now() },
    };
    this.history = [];
    this.lastAdjustmentTime = 0;
  }
}

/**
 * Global domain orthogonal motion manager singleton
 */
export const globalDomainOrthogonalMotion = new DomainOrthogonalMotionManager(
  globalTension,
);

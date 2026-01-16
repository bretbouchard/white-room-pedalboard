/**
 * Long Cycle Memory - Tension Peak Avoidance
 *
 * Schillinger Principle: Avoid repeating identical tension peaks.
 * Musical interest requires variety in高潮 (climax) intensity and placement.
 *
 * This system:
 * - Records all significant tension peaks
 * - Detects when approaching similar peaks to previous ones
 * - Provides alternative resolution strategies to avoid repetition
 * - Maintains long-term memory across entire piece (not just recent bars)
 *
 * @module structure/LongCycleMemory
 */

import { TensionAccumulator } from "./TensionAccumulator";
import { StructuralTension } from "./StructuralTension";

/**
 * Musical context of a tension peak
 */
export interface PeakContext {
  /** Bar number where peak occurred */
  bar: number;

  /** Beat within bar */
  beat: number;

  /** Section type at peak */
  section: string;

  /** Musical role causing peak (drill, gate, harmonic, etc.) */
  cause: string;

  /** Domain that contributed most to peak */
  primaryDomain: "rhythmic" | "harmonic" | "formal";
}

/**
 * Tension peak record
 */
export interface PeakInfo {
  /** Total tension value at peak */
  tension: number;

  /** When the peak occurred */
  context: PeakContext;

  /** Timestamp (for ordering) */
  timestamp: number;

  /** Whether this peak was used to avoid repetition */
  wasAvoided: boolean;
}

/**
 * Resolution strategies for avoiding repetition
 */
export type ResolutionStrategy =
  | "return_to_groove" // Drop rhythmic tension, maintain harmonic
  | "thin_texture" // Reduce density (both rhythmic and harmonic)
  | "silence_cadence" // Dramatic silence
  | "register_shift" // Change register (if implemented)
  | "harmonic_resolution" // Resolve harmony while maintaining rhythm
  | "formal_release" // Reduce formal tension (phrase endings)
  | "hybrid_approach"; // Combination of multiple strategies

/**
 * Strategy suggestion with details
 */
export interface StrategySuggestion {
  /** Strategy to use */
  strategy: ResolutionStrategy;

  /** Why this strategy was suggested */
  reason: string;

  /** Previous peak we're avoiding */
  avoidingPeak: PeakInfo | null;

  /** Target tension values if using this strategy */
  targetTension: {
    rhythmic: number;
    harmonic: number;
    formal: number;
  };

  /** Expected total tension after applying strategy */
  expectedTotal: number;
}

/**
 * Configuration for long cycle memory
 */
export interface MemoryConfig {
  /** Minimum tension to be considered a peak (default 0.3) */
  peakThreshold: number;

  /** Tolerance for considering peaks similar (default 0.1) */
  similarityTolerance: number;

  /** How many previous peaks to remember (default 20) */
  memoryDepth: number;

  /** Whether to enable auto-avoidance suggestions (default true) */
  enableSuggestions: boolean;
}

/**
 * Manages long-term memory of tension peaks to avoid repetition
 *
 * Usage:
 * ```typescript
 * const memory = new LongCycleMemory(accumulator);
 *
 * // Record a significant peak
 * memory.recordPeak(0.65, {
 *   bar: 32,
 *   beat: 4,
 *   section: 'development',
 *   cause: 'drill_fill',
 *   primaryDomain: 'rhythmic'
 * });
 *
 * // Check if current tension is repeating
 * if (memory.isRepeatingPeak(0.63)) {
 *   const strategy = memory.getAlternativeStrategy();
 *   // Apply alternative resolution to avoid repetition
 * }
 *
 * // Get explanation
 * console.log(memory.explainAvoidance(0.63));
 * // "Avoiding repetition of peak at bar 32 (0.65 tension).
 * //  Suggested: thin_texture to create different climax character."
 * ```
 */
export class LongCycleMemory {
  private accumulator: TensionAccumulator;
  private peaks: PeakInfo[] = [];
  private peakCounter: number = 0;
  private config: MemoryConfig;

  // Default thresholds (account for weighted tension)
  private readonly DEFAULT_PEAK_THRESHOLD = 0.3; // Total tension, not raw
  private readonly DEFAULT_SIMILARITY_TOLERANCE = 0.08; // Tight tolerance
  private readonly DEFAULT_MEMORY_DEPTH = 20;

  constructor(accumulator: TensionAccumulator, config?: Partial<MemoryConfig>) {
    this.accumulator = accumulator;
    this.config = {
      peakThreshold: config?.peakThreshold ?? this.DEFAULT_PEAK_THRESHOLD,
      similarityTolerance:
        config?.similarityTolerance ?? this.DEFAULT_SIMILARITY_TOLERANCE,
      memoryDepth: config?.memoryDepth ?? this.DEFAULT_MEMORY_DEPTH,
      enableSuggestions: config?.enableSuggestions ?? true,
    };
  }

  /**
   * Record a tension peak
   *
   * Only records peaks above threshold to avoid cluttering memory with minor fluctuations
   */
  recordPeak(tension: number, context: PeakContext): void {
    // Only record significant peaks
    if (tension < this.config.peakThreshold) {
      return;
    }

    // Check if this is very close to an existing peak (avoid duplicates)
    const existing = this.peaks.find(
      (p) =>
        Math.abs(p.tension - tension) < 0.02 && p.context.bar === context.bar,
    );

    if (existing) {
      return; // Already recorded this peak
    }

    const peak: PeakInfo = {
      tension,
      context: { ...context },
      timestamp: this.peakCounter++,
      wasAvoided: false,
    };

    this.peaks.push(peak);

    // Maintain memory depth
    if (this.peaks.length > this.config.memoryDepth) {
      this.peaks.shift();
    }
  }

  /**
   * Auto-record current tension as peak if it's significant
   *
   * Convenience method that reads from accumulator
   */
  recordCurrentPeak(section: string, cause: string): boolean {
    const currentTension = this.accumulator.getTotal();
    const position = this.accumulator.getMusicalPosition();

    // Find primary domain
    const current = this.accumulator.getCurrent();
    const domains = [
      { name: "rhythmic" as const, value: current.rhythmic },
      { name: "harmonic" as const, value: current.harmonic },
      { name: "formal" as const, value: current.formal },
    ];
    const primary = domains.reduce((max, d) => (d.value > max.value ? d : max));

    const context: PeakContext = {
      bar: position.bar,
      beat: position.beat,
      section,
      cause,
      primaryDomain: primary.name,
    };

    this.recordPeak(currentTension, context);
    return currentTension >= this.config.peakThreshold;
  }

  /**
   * Check if current tension is repeating a previous peak
   *
   * Returns true if current tension is within tolerance of any previous peak
   */
  isRepeatingPeak(currentTension: number, tolerance?: number): boolean {
    const actualTolerance = tolerance ?? this.config.similarityTolerance;
    const similarPeak = this.findSimilarPeak(currentTension, actualTolerance);
    return similarPeak !== null;
  }

  /**
   * Find the most similar previous peak
   *
   * Returns null if no similar peak found
   */
  findSimilarPeak(currentTension: number, tolerance?: number): PeakInfo | null {
    const actualTolerance = tolerance ?? this.config.similarityTolerance;

    // Find most recent similar peak
    const similar = this.peaks
      .slice()
      .reverse()
      .find(
        (peak) => Math.abs(peak.tension - currentTension) < actualTolerance,
      );

    return similar ?? null;
  }

  /**
   * Get alternative resolution strategy to avoid repetition
   *
   * Analyzes previous peaks and suggests strategy to create variety
   */
  getAlternativeStrategy(currentTension?: number): StrategySuggestion {
    const tension = currentTension ?? this.accumulator.getTotal();
    const avoidingPeak = this.findSimilarPeak(tension);
    const current = this.accumulator.getCurrent();

    // Mark that we're avoiding this peak
    if (avoidingPeak) {
      avoidingPeak.wasAvoided = true;
    }

    // Choose strategy based on what was used previously
    const strategy = this.selectStrategy(avoidingPeak, current);

    // Calculate target tension values
    const targets = this.calculateTargetTension(strategy.type, current);

    // Expected total after applying strategy
    const expectedTotal =
      targets.rhythmic * 0.4 + targets.harmonic * 0.4 + targets.formal * 0.2;

    return {
      strategy: strategy.type,
      reason: strategy.reason,
      avoidingPeak,
      targetTension: targets,
      expectedTotal,
    };
  }

  /**
   * Get all recorded peaks
   */
  getPeakHistory(): PeakInfo[] {
    return [...this.peaks];
  }

  /**
   * Get significant peaks (above threshold)
   */
  getSignificantPeaks(): PeakInfo[] {
    return this.peaks.filter((p) => p.tension >= this.config.peakThreshold);
  }

  /**
   * Explain why we're avoiding a certain tension path
   */
  explainAvoidance(currentTension?: number): string {
    const tension = currentTension ?? this.accumulator.getTotal();
    const similarPeak = this.findSimilarPeak(tension);

    if (!similarPeak) {
      return `Current tension (${tension.toFixed(2)}) is unique, no avoidance needed.`;
    }

    const strategy = this.getAlternativeStrategy(tension);

    return (
      `Avoiding repetition of peak at bar ${similarPeak.context.bar} ` +
      `(${similarPeak.tension.toFixed(2)} tension, caused by ${similarPeak.context.cause}). ` +
      `Suggested: ${strategy.strategy} to create different climax character. ` +
      `Expected tension: ${strategy.expectedTotal.toFixed(2)} (vs ${tension.toFixed(2)} current).`
    );
  }

  /**
   * Get statistics about peak distribution
   */
  getPeakStatistics() {
    if (this.peaks.length === 0) {
      return {
        totalPeaks: 0,
        averageTension: 0,
        maxTension: 0,
        minTension: 0,
        peaksAvoided: 0,
        tensionRange: [0, 0] as [number, number],
      };
    }

    const tensions = this.peaks.map((p) => p.tension);
    const avoided = this.peaks.filter((p) => p.wasAvoided).length;

    return {
      totalPeaks: this.peaks.length,
      averageTension: tensions.reduce((a, b) => a + b, 0) / tensions.length,
      maxTension: Math.max(...tensions),
      minTension: Math.min(...tensions),
      peaksAvoided: avoided,
      tensionRange: [Math.min(...tensions), Math.max(...tensions)] as [
        number,
        number,
      ],
    };
  }

  /**
   * Reset all peak memory
   */
  reset(): void {
    this.peaks = [];
    this.peakCounter = 0;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Select resolution strategy based on previous peaks
   */
  private selectStrategy(
    avoidingPeak: PeakInfo | null,
    current: StructuralTension,
  ): {
    type: ResolutionStrategy;
    reason: string;
  } {
    // If no similar peak, no specific strategy needed
    if (!avoidingPeak) {
      return {
        type: "return_to_groove",
        reason: "No repetition detected, standard resolution",
      };
    }

    // Choose strategy based on what domain caused previous peak
    const primaryDomain = avoidingPeak.context.primaryDomain;

    switch (primaryDomain) {
      case "rhythmic":
        // Previous peak was rhythmic (drill/gate)
        // Use different strategy: focus on harmonic or formal resolution
        if (current.harmonic > 0.3) {
          return {
            type: "harmonic_resolution",
            reason:
              "Previous peak was rhythmic, resolve through harmony instead",
          };
        } else {
          return {
            type: "thin_texture",
            reason:
              "Previous peak was rhythmic, thin texture for different character",
          };
        }

      case "harmonic":
        // Previous peak was harmonic
        // Use rhythmic resolution instead
        return {
          type: "return_to_groove",
          reason: "Previous peak was harmonic, resolve through rhythm instead",
        };

      case "formal":
        // Previous peak was formal (phrase boundary)
        // Use hybrid approach
        return {
          type: "hybrid_approach",
          reason: "Previous peak was formal, use combination for variety",
        };

      default:
        return {
          type: "silence_cadence",
          reason: "Dramatic silence to create contrast",
        };
    }
  }

  /**
   * Calculate target tension values for a strategy
   */
  private calculateTargetTension(
    strategy: ResolutionStrategy,
    current: StructuralTension,
  ): { rhythmic: number; harmonic: number; formal: number } {
    switch (strategy) {
      case "return_to_groove":
        // Drop rhythmic dramatically, maintain others
        return {
          rhythmic: 0.1,
          harmonic: current.harmonic * 0.6,
          formal: current.formal * 0.5,
        };

      case "thin_texture":
        // Reduce both rhythmic and harmonic
        return {
          rhythmic: current.rhythmic * 0.4,
          harmonic: current.harmonic * 0.3,
          formal: current.formal * 0.7,
        };

      case "silence_cadence":
        // Dramatic reduction in all domains
        return {
          rhythmic: 0.0,
          harmonic: 0.1,
          formal: 0.1,
        };

      case "harmonic_resolution":
        // Focus on resolving harmony, maintain some rhythm
        return {
          rhythmic: current.rhythmic * 0.7,
          harmonic: 0.2,
          formal: current.formal * 0.6,
        };

      case "formal_release":
        // Reduce formal tension significantly
        return {
          rhythmic: current.rhythmic * 0.8,
          harmonic: current.harmonic * 0.7,
          formal: 0.1,
        };

      case "hybrid_approach":
        // Moderate reduction across all domains
        return {
          rhythmic: current.rhythmic * 0.5,
          harmonic: current.harmonic * 0.5,
          formal: current.formal * 0.5,
        };

      case "register_shift":
        // Similar tension but different register (simulated by slight reduction)
        return {
          rhythmic: current.rhythmic * 0.8,
          harmonic: current.harmonic * 0.8,
          formal: current.formal,
        };

      default:
        return {
          rhythmic: current.rhythmic * 0.5,
          harmonic: current.harmonic * 0.5,
          formal: current.formal * 0.5,
        };
    }
  }
}

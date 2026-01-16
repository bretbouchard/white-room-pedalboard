/**
 * Section Transition Manager - Tension-Driven Form
 *
 * Schillinger Principle: Section transitions respond to accumulated
 * tension, not arbitrary bar counts. High tension forces resolution,
 * low tension allows development.
 *
 * This creates natural musical form:
 * - Low tension → Continue building (development)
 * - Medium tension → Sustain (stability)
 * - High tension → Resolve (transition to new section)
 * - Exhaustion → Force resolution (peak followed by release)
 *
 * @module structure/SectionTransition
 */

import { TensionAccumulator } from "./TensionAccumulator";
import { EnergyManager } from "./EnergyCurves";

/**
 * Section types in musical form
 */
export type SectionType =
  | "introduction" // Opening, establishing material
  | "development" // Building tension, exploring material
  | "climax" // Peak tension, maximum intensity
  | "resolution" // Releasing tension, returning home
  | "coda"; // Final statement, fading out

/**
 * Transition trigger
 */
export interface TransitionTrigger {
  /** Type of transition */
  type: SectionType;

  /** Cause of the transition */
  cause: string;

  /** Tension level that triggered transition */
  tension: number;

  /** Energy state at transition */
  energy: {
    momentum: number;
    exhaustion: number;
  };
}

/**
 * Section configuration
 */
export interface SectionConfig {
  /** Section type */
  type: SectionType;

  /** Start bar (1-indexed) */
  startBar: number;

  /** End bar (inclusive, or null for open-ended) */
  endBar: number | null;

  /** Minimum bars before allowing transition */
  minBars: number;

  /** Maximum bars (force transition if reached) */
  maxBars: number | null;

  /** Target tension range for this section */
  tensionRange: [number, number];

  /** Allow transition if tension exceeds this threshold */
  tensionThreshold: number | null;
}

/**
 * Manages tension-driven section transitions
 *
 * Usage:
 * ```typescript
 * const transitions = new SectionTransitionManager(accumulator, energy);
 *
 * // Configure sections
 * transitions.defineSection({
 *   type: 'development',
 *   startBar: 17,
 *   endBar: null,
 *   minBars: 8,
 *   maxBars: 24,
 *   tensionRange: [0.3, 0.7],
 *   tensionThreshold: 0.8
 * });
 *
 * // Check if should transition
 * const trigger = transitions.shouldTransition(bar, beat);
 * if (trigger) {
 *   // Transition to next section
 * }
 * ```
 */
export class SectionTransitionManager {
  private accumulator: TensionAccumulator;
  private energy: EnergyManager;
  private sections: Map<string, SectionConfig> = new Map();
  private currentSection: string | null = null;
  private transitionHistory: TransitionTrigger[] = [];

  // Default thresholds (account for weighted tension from getTotal())
  // getTotal() returns: rhythmic * 0.4 + harmonic * 0.4 + formal * 0.2
  private readonly HIGH_TENSION_THRESHOLD = 0.35; // ~0.9 raw * 0.4
  private readonly EXHAUSTION_THRESHOLD = 0.7;

  constructor(accumulator: TensionAccumulator, energy: EnergyManager) {
    this.accumulator = accumulator;
    this.energy = energy;
  }

  /**
   * Define a section with constraints
   */
  defineSection(id: string, config: SectionConfig): void {
    this.sections.set(id, config);
  }

  /**
   * Set current active section
   */
  setCurrentSection(sectionId: string): void {
    this.currentSection = sectionId;
  }

  /**
   * Check if should transition based on tension and energy
   */
  shouldTransition(bar: number, beat: number): TransitionTrigger | null {
    if (!this.currentSection) {
      return null;
    }

    const section = this.sections.get(this.currentSection);
    if (!section) {
      return null;
    }

    const currentTension = this.accumulator.getTotal();
    const energyState = this.energy.getEnergyState();
    const barsInSection = bar - section.startBar + 1;

    // Check exhaustion first (highest priority)
    if (energyState.exhaustion > this.EXHAUSTION_THRESHOLD) {
      return this.createTrigger(
        "resolution",
        "exhaustion_forces_resolution",
        currentTension,
        energyState,
      );
    }

    // Check tension threshold (section-specific, checked before global)
    if (section.tensionThreshold && currentTension > section.tensionThreshold) {
      // Only transition if minimum bars reached
      if (barsInSection >= section.minBars) {
        return this.createTrigger(
          this.getNextSectionType(section.type),
          "tension_threshold_exceeded",
          currentTension,
          energyState,
        );
      }
    }

    // Check high tension (global threshold, only if no section threshold)
    if (
      !section.tensionThreshold &&
      currentTension > this.HIGH_TENSION_THRESHOLD
    ) {
      if (barsInSection >= section.minBars) {
        return this.createTrigger(
          this.getNextSectionType(section.type),
          "high_tension_resolution",
          currentTension,
          energyState,
        );
      }
    }

    // Check maximum bars (hard limit)
    if (section.maxBars && barsInSection >= section.maxBars) {
      return this.createTrigger(
        this.getNextSectionType(section.type),
        "max_bars_reached",
        currentTension,
        energyState,
      );
    }

    // Check if tension is below range (only after minBars reached)
    if (barsInSection >= section.minBars) {
      if (currentTension < section.tensionRange[0]) {
        return this.createTrigger(
          this.getNextSectionType(section.type),
          "tension_below_range",
          currentTension,
          energyState,
        );
      }
    }

    // No transition needed
    return null;
  }

  /**
   * Force a transition (used for manual control)
   */
  forceTransition(type: SectionType, cause: string): TransitionTrigger {
    const currentTension = this.accumulator.getTotal();
    const energyState = this.energy.getEnergyState();

    return this.createTrigger(type, cause, currentTension, energyState);
  }

  /**
   * Get transition history
   */
  getHistory(): TransitionTrigger[] {
    return [...this.transitionHistory];
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.currentSection = null;
    this.transitionHistory = [];
  }

  /**
   * Get next section type in musical form
   */
  private getNextSectionType(current: SectionType): SectionType {
    const sequence: Record<SectionType, SectionType> = {
      introduction: "development",
      development: "climax",
      climax: "resolution",
      resolution: "development", // Can build again after resolution
      coda: null as any, // End of piece
    };

    return sequence[current];
  }

  /**
   * Create transition trigger
   */
  private createTrigger(
    type: SectionType,
    cause: string,
    tension: number,
    energyState: { momentum: number; exhaustion: number },
  ): TransitionTrigger {
    const trigger: TransitionTrigger = {
      type,
      cause,
      tension,
      energy: {
        momentum: energyState.momentum,
        exhaustion: energyState.exhaustion,
      },
    };

    // Record in history
    this.transitionHistory.push(trigger);

    return trigger;
  }

  /**
   * Explain current section state
   */
  explainCurrentState(): string {
    if (!this.currentSection) {
      return "No section active";
    }

    const section = this.sections.get(this.currentSection);
    if (!section) {
      return `Unknown section: ${this.currentSection}`;
    }

    const currentTension = this.accumulator.getTotal();
    const energyState = this.energy.getEnergyState();

    const inRange =
      currentTension >= section.tensionRange[0] &&
      currentTension <= section.tensionRange[1];

    return (
      `Section: ${section.type} (${this.currentSection}), ` +
      `Tension: ${currentTension.toFixed(2)} ${inRange ? "✓" : "out of range"}, ` +
      `Energy: ${this.describeEnergy(energyState)}`
    );
  }

  /**
   * Describe energy state
   */
  private describeEnergy(state: {
    momentum: number;
    exhaustion: number;
  }): string {
    const momentumDesc = Math.abs(state.momentum) > 0.3 ? "dynamic" : "stable";
    const exhaustionDesc = state.exhaustion > 0.5 ? "tired" : "fresh";
    return `${momentumDesc}, ${exhaustionDesc}`;
  }
}

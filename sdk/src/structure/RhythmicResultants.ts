/**
 * Rhythmic Resultants - Live Generators
 *
 * Integrates rhythmic resultant generation with structural tension system.
 * Resultants are no longer just analysis tools - they're live generators
 * that write rhythmic tension when applied.
 *
 * Schillinger Principle:
 * - Resultants create rhythmic interest through interference patterns
 * - Complex resultants (syncopation, density) create higher tension
 * - Resultant selection should be driven by compositional needs
 * - Different resultant pairs create different tension levels
 *
 * @module structure/RhythmicResultants
 */

import { TensionAccumulator, globalTension } from "./TensionAccumulator";
import {
  generateRhythmicResultant,
  generateMultipleResultants,
  generateCustomAccentResultant,
  generatePolyrhythmicResultant,
  generateSwingResultant,
  findOptimalResultant,
  type RhythmicResultant,
  type ResultantOptions,
} from "../../packages/shared/src/math/rhythmic-resultants";

/**
 * Generator pair for rhythmic resultants
 */
export type GeneratorPair = { a: number; b: number };

/**
 * Resultant application context
 */
export interface ResultantContext {
  /** Musical bar number */
  bar: number;
  /** Beat within bar */
  beat: number;
  /** Position within beat (0..1) */
  position: number;
  /** Which role is applying this resultant */
  role: string;
  /** Section of piece */
  section: string;
  /** Why this resultant was chosen */
  reason: string;
}

/**
 * Resultant selection strategy
 */
export type SelectionStrategy =
  | "simplest" // Choose least complex resultant
  | "most_complex" // Choose most complex resultant
  | "balanced" // Choose moderate complexity
  | "syncopated" // Maximize syncopation
  | "straight" // Minimize syncopation
  | "high_density" // Maximize density
  | "low_density" // Minimize density
  | "custom"; // Custom target characteristics

/**
 * Custom selection target
 */
export interface CustomTarget {
  length?: number;
  complexity?: number;
  density?: number;
  syncopation?: number;
}

/**
 * Resultant application record
 */
export interface ResultantApplication {
  /** The resultant that was applied */
  resultant: RhythmicResultant;
  /** Context of application */
  context: ResultantContext;
  /** Tension level created */
  tensionLevel: number;
  /** When applied */
  timestamp: number;
}

/**
 * Rhythmic Resultants configuration
 */
export interface ResultantsConfig {
  /** Maximum generator value to consider */
  maxGenerator: number;
  /** Whether to write tension automatically */
  autoWriteTension: boolean;
  /** Base tension multiplier */
  tensionMultiplier: number;
  /** Enable complexity-based tension */
  complexityTension: boolean;
  /** Enable syncopation-based tension */
  syncopationTension: boolean;
  /** Enable density-based tension */
  densityTension: boolean;
}

/**
 * Rhythmic Resultants Generator
 *
 * Wraps the existing resultant math with tension system integration.
 * Resultants become live generators that write rhythmic tension.
 *
 * Usage:
 * ```typescript
 * const generator = new RhythmicResultantsGenerator(accumulator);
 *
 * // Generate and apply a resultant (writes tension automatically)
 * const resultant = generator.generateAndApply(3, 4, {
 *   bar: 16,
 *   beat: 1,
 *   role: 'drums',
 *   section: 'development',
 *   reason: 'building_intensity'
 * });
 *
 * // Select optimal resultant for target characteristics
 * const candidates = generator.selectByStrategy('syncopated', {
 *   bar: 32,
 *   role: 'melody',
 *   section: 'climax',
 *   reason: 'maximum_interest'
 * });
 *
 * // Get application history
 * const history = generator.getApplicationHistory();
 * ```
 */
export class RhythmicResultantsGenerator {
  private accumulator: TensionAccumulator;
  private config: ResultantsConfig;
  private applicationHistory: ResultantApplication[] = [];
  private static readonly MAX_HISTORY = 1000;

  // Default configuration
  private readonly DEFAULT_MAX_GENERATOR = 16;
  private readonly DEFAULT_TENSION_MULTIPLIER = 0.3;
  private readonly DEFAULT_AUTO_WRITE = true;

  constructor(
    accumulator: TensionAccumulator,
    config?: Partial<ResultantsConfig>,
  ) {
    this.accumulator = accumulator;
    this.config = {
      maxGenerator: config?.maxGenerator ?? this.DEFAULT_MAX_GENERATOR,
      autoWriteTension: config?.autoWriteTension ?? this.DEFAULT_AUTO_WRITE,
      tensionMultiplier:
        config?.tensionMultiplier ?? this.DEFAULT_TENSION_MULTIPLIER,
      complexityTension: config?.complexityTension ?? true,
      syncopationTension: config?.syncopationTension ?? true,
      densityTension: config?.densityTension ?? true,
    };
  }

  /**
   * Generate a rhythmic resultant from two generators
   *
   * @param a - First generator (e.g., 3 for triplets)
   * @param b - Second generator (e.g., 4 for sixteenths)
   * @param options - Resultant generation options
   * @returns The generated resultant
   */
  generate(
    a: number,
    b: number,
    options?: ResultantOptions,
  ): RhythmicResultant {
    return generateRhythmicResultant(a, b, options);
  }

  /**
   * Generate and apply a resultant (writes tension)
   *
   * @param a - First generator
   * @param b - Second generator
   * @param context - Application context
   * @param options - Resultant generation options
   * @returns The applied resultant with tension level
   */
  generateAndApply(
    a: number,
    b: number,
    context: ResultantContext,
    options?: ResultantOptions,
  ): { resultant: RhythmicResultant; tensionLevel: number } {
    // Generate the resultant
    const resultant = this.generate(a, b, options);

    // Calculate tension level
    const tensionLevel = this.calculateTensionLevel(resultant);

    // Write tension if enabled
    if (this.config.autoWriteTension) {
      this.accumulator.writeRhythmicTension(tensionLevel, context.reason);
    }

    // Record application
    const application: ResultantApplication = {
      resultant,
      context,
      tensionLevel,
      timestamp: Date.now(),
    };

    this.applicationHistory.push(application);

    // Limit history
    if (
      this.applicationHistory.length > RhythmicResultantsGenerator.MAX_HISTORY
    ) {
      this.applicationHistory.shift();
    }

    return { resultant, tensionLevel };
  }

  /**
   * Select resultant by strategy
   *
   * @param strategy - Selection strategy
   * @param context - Application context
   * @param customTarget - Custom target (for 'custom' strategy)
   * @param options - Resultant generation options
   * @returns The selected and applied resultant
   */
  selectByStrategy(
    strategy: SelectionStrategy,
    context: ResultantContext,
    customTarget?: CustomTarget,
    options?: ResultantOptions,
  ): { resultant: RhythmicResultant; tensionLevel: number } {
    let target: CustomTarget = {};

    // Map strategy to target characteristics
    switch (strategy) {
      case "simplest":
        target = { complexity: 5, syncopation: 0.1, density: 0.3 };
        break;
      case "most_complex":
        target = { complexity: 50, syncopation: 0.7, density: 0.9 };
        break;
      case "balanced":
        target = { complexity: 15, syncopation: 0.4, density: 0.5 };
        break;
      case "syncopated":
        target = { syncopation: 0.7 };
        break;
      case "straight":
        target = { syncopation: 0.1 };
        break;
      case "high_density":
        target = { density: 0.8 };
        break;
      case "low_density":
        target = { density: 0.2 };
        break;
      case "custom":
        target = customTarget ?? {};
        break;
    }

    // Find optimal resultants
    const candidates = findOptimalResultant(target, this.config.maxGenerator);

    if (candidates.length === 0) {
      throw new Error("No resultants found matching target characteristics");
    }

    // Select best candidate
    const resultant = candidates[0];

    // Calculate tension level
    const tensionLevel = this.calculateTensionLevel(resultant);

    // Write tension if enabled
    if (this.config.autoWriteTension) {
      this.accumulator.writeRhythmicTension(tensionLevel, context.reason);
    }

    // Record application
    const application: ResultantApplication = {
      resultant,
      context,
      tensionLevel,
      timestamp: Date.now(),
    };

    this.applicationHistory.push(application);

    // Limit history
    if (
      this.applicationHistory.length > RhythmicResultantsGenerator.MAX_HISTORY
    ) {
      this.applicationHistory.shift();
    }

    return { resultant, tensionLevel };
  }

  /**
   * Generate multiple resultants for comparison
   *
   * @param generators - List of generator pairs
   * @param context - Application context
   * @param options - Resultant generation options
   * @returns All generated resultants with tension levels
   */
  generateMultiple(
    generators: GeneratorPair[],
    context: ResultantContext,
    options?: ResultantOptions,
  ): Array<{ resultant: RhythmicResultant; tensionLevel: number }> {
    const resultants = generateMultipleResultants(generators, options);

    return resultants.map((resultant) => {
      const tensionLevel = this.calculateTensionLevel(resultant);

      // Write tension for each if enabled
      if (this.config.autoWriteTension) {
        this.accumulator.writeRhythmicTension(tensionLevel, context.reason);
      }

      // Record application
      const application: ResultantApplication = {
        resultant,
        context,
        tensionLevel,
        timestamp: Date.now(),
      };

      this.applicationHistory.push(application);

      return { resultant, tensionLevel };
    });
  }

  /**
   * Generate polyrhythmic resultant
   *
   * @param generatorPairs - Multiple generator pairs
   * @param context - Application context
   * @param options - Resultant generation options
   * @returns The polyrhythmic resultant with tension level
   */
  generatePolyrhythmic(
    generatorPairs: GeneratorPair[],
    context: ResultantContext,
    options?: ResultantOptions,
  ): { resultant: RhythmicResultant; tensionLevel: number } {
    const resultant = generatePolyrhythmicResultant(generatorPairs, options);

    // Calculate tension level (polyrhythms create higher tension)
    const tensionLevel = this.calculateTensionLevel(resultant) * 1.2;

    // Write tension if enabled
    if (this.config.autoWriteTension) {
      this.accumulator.writeRhythmicTension(tensionLevel, context.reason);
    }

    // Record application
    const application: ResultantApplication = {
      resultant,
      context,
      tensionLevel,
      timestamp: Date.now(),
    };

    this.applicationHistory.push(application);

    // Limit history
    if (
      this.applicationHistory.length > RhythmicResultantsGenerator.MAX_HISTORY
    ) {
      this.applicationHistory.shift();
    }

    return { resultant, tensionLevel };
  }

  /**
   * Generate resultant with swing feel
   *
   * @param a - First generator
   * @param b - Second generator
   * @param swingRatio - Swing ratio (0.5-1.0, default 0.67)
   * @param context - Application context
   * @param options - Resultant generation options
   * @returns The swing resultant with tension level
   */
  generateSwing(
    a: number,
    b: number,
    swingRatio: number,
    context: ResultantContext,
    options?: ResultantOptions,
  ): { resultant: RhythmicResultant; tensionLevel: number } {
    const resultant = generateSwingResultant(a, b, swingRatio, options);

    // Calculate tension level (swing increases syncopation)
    const tensionLevel = this.calculateTensionLevel(resultant);

    // Write tension if enabled
    if (this.config.autoWriteTension) {
      this.accumulator.writeRhythmicTension(tensionLevel, context.reason);
    }

    // Record application
    const application: ResultantApplication = {
      resultant,
      context,
      tensionLevel,
      timestamp: Date.now(),
    };

    this.applicationHistory.push(application);

    // Limit history
    if (
      this.applicationHistory.length > RhythmicResultantsGenerator.MAX_HISTORY
    ) {
      this.applicationHistory.shift();
    }

    return { resultant, tensionLevel };
  }

  /**
   * Calculate tension level for a resultant
   *
   * Based on:
   * - Complexity (pattern variety)
   * - Syncopation (off-beat emphasis)
   * - Density (ratio of hits to total)
   *
   * @param resultant - The resultant to analyze
   * @returns Tension level 0-1
   */
  private calculateTensionLevel(resultant: RhythmicResultant): number {
    let tension = 0;

    // Complexity contribution
    if (this.config.complexityTension) {
      // Normalize complexity: typical range 5-50, map to 0-0.4
      const complexityTension = Math.min(resultant.complexity / 100, 0.4);
      tension += complexityTension;
    }

    // Syncopation contribution
    if (this.config.syncopationTension) {
      // Syncopation 0-1 directly maps to tension
      const syncopationTension = resultant.metadata.syncopation * 0.3;
      tension += syncopationTension;
    }

    // Density contribution
    if (this.config.densityTension) {
      // Density 0-1 maps to tension
      const densityTension = resultant.metadata.density * 0.3;
      tension += densityTension;
    }

    // Apply multiplier and clamp
    tension = Math.min(tension * this.config.tensionMultiplier, 1);

    return tension;
  }

  /**
   * Get application history
   */
  getApplicationHistory(): ResultantApplication[] {
    return [...this.applicationHistory];
  }

  /**
   * Get recent applications for a specific role
   */
  getRecentApplicationsForRole(
    role: string,
    bars: number = 16,
  ): ResultantApplication[] {
    const currentBar = this.accumulator.getMusicalPosition().bar;
    return this.applicationHistory.filter(
      (app) =>
        app.context.role === role && app.context.bar >= currentBar - bars,
    );
  }

  /**
   * Get statistics about resultant usage
   */
  getUsageStatistics(): {
    totalApplications: number;
    averageTension: number;
    mostUsedGenerators: GeneratorPair[];
    tensionByRole: Map<string, number[]>;
  } {
    if (this.applicationHistory.length === 0) {
      return {
        totalApplications: 0,
        averageTension: 0,
        mostUsedGenerators: [],
        tensionByRole: new Map(),
      };
    }

    // Average tension
    const totalTension = this.applicationHistory.reduce(
      (sum, app) => sum + app.tensionLevel,
      0,
    );
    const averageTension = totalTension / this.applicationHistory.length;

    // Most used generators
    const generatorCounts = new Map<string, number>();
    this.applicationHistory.forEach((app) => {
      const key = `${app.resultant.generators.a}x${app.resultant.generators.b}`;
      generatorCounts.set(key, (generatorCounts.get(key) || 0) + 1);
    });

    const mostUsedGenerators = Array.from(generatorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => {
        const [a, b] = key.split("x").map(Number);
        return { a, b };
      });

    // Tension by role
    const tensionByRole = new Map<string, number[]>();
    this.applicationHistory.forEach((app) => {
      const role = app.context.role;
      if (!tensionByRole.has(role)) {
        tensionByRole.set(role, []);
      }
      tensionByRole.get(role)!.push(app.tensionLevel);
    });

    return {
      totalApplications: this.applicationHistory.length,
      averageTension,
      mostUsedGenerators,
      tensionByRole,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ResultantsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset history
   */
  reset(): void {
    this.applicationHistory = [];
  }
}

/**
 * Global rhythmic resultants generator singleton
 */
export const globalRhythmicResultants = new RhythmicResultantsGenerator(
  globalTension,
);

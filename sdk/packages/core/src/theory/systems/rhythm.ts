/**
 * Book I: Rhythm System Implementation
 *
 * Implements Schillinger's rhythm theory using periodic generators and resultants.
 *
 * Key concepts:
 * - Generators: Periodic pulse trains with period and phase
 * - Resultants: Interference patterns between generators
 * - Permutations: Rotation, retrograde, inversion
 * - Accent displacement: Shifted accents
 * - Density constraints: Min/max attacks per measure
 * - Quantization: Grid alignment
 */

import {
  type RhythmSystem,
  type Generator,
  type PermutationRule,
  type AccentDisplacementRule,
} from "../../types";

/**
 * Attack point - a rhythmic event
 */
export interface Attack {
  time: number; // Time in beats
  accent: number; // Accent level (0-1, 1 = strongest)
}

/**
 * Rhythm pattern - sequence of attacks
 */
export interface RhythmPattern {
  attacks: Attack[];
  duration: number; // In beats
}

/**
 * RhythmSystem class - Book I implementation
 */
export class RhythmSystemImpl implements RhythmSystem {
  readonly systemId: string;
  readonly systemType = "rhythm" as const;
  generators: Generator[];
  resultantSelection: {
    method: "interference" | "modulo" | "custom";
    targetPeriod?: number;
  };
  permutations: PermutationRule[];
  accentDisplacement: AccentDisplacementRule[];
  densityConstraints: {
    constraintId: string;
    scope: "global" | "system";
    minAttacksPerMeasure?: number;
    maxAttacksPerMeasure?: number;
  };
  quantizationConstraint: {
    constraintId: string;
    grid: number; // Quantization grid in beats
    allowOffset: boolean;
  };

  constructor(data: RhythmSystem) {
    this.systemId = data.systemId;
    this.generators = data.generators;
    this.resultantSelection = data.resultantSelection;
    this.permutations = data.permutations;
    this.accentDisplacement = data.accentDisplacement;
    this.densityConstraints = data.densityConstraints;
    this.quantizationConstraint = data.quantizationConstraint;
  }

  /**
   * Generate rhythm pattern from generators
   *
   * @param duration - Duration in beats to generate
   * @param measureLength - Length of one measure in beats
   * @returns Rhythm pattern with attacks
   */
  generatePattern(duration: number, _measureLength: number = 4): RhythmPattern {
    const attacks: Attack[] = [];

    // Generate base pattern from generators using interference
    const basePattern = this.generateInterference(duration);

    // Apply permutations
    let permutedPattern = this.applyPermutations(basePattern);

    // Apply accent displacement
    let accentedPattern = this.applyAccentDisplacement(permutedPattern);

    // Apply quantization
    let quantizedPattern = this.applyQuantization(accentedPattern);

    // Apply density constraints
    attacks.push(...quantizedPattern);

    return {
      attacks: attacks.sort((a, b) => a.time - b.time),
      duration,
    };
  }

  /**
   * Generate interference pattern from generators
   *
   * Combines periodic generators using interference (resultant) method.
   *
   * @param duration - Duration in beats
   * @returns Array of attack times
   */
  private generateInterference(duration: number): Attack[] {
    if (this.generators.length < 2) {
      throw new Error("RhythmSystem requires at least 2 generators for resultant");
    }

    const attacks: Attack[] = [];
    const grid = this.quantizationConstraint.grid;

    // Sample at quantization grid resolution
    for (let t = 0; t < duration; t += grid) {
      // Check each generator's pulse at time t
      const values = this.generators.map((gen) => {
        const phase = gen.phase || 0;
        const phaseTime = (t - phase + gen.period) % gen.period;
        // Generator fires when phaseTime is close to 0
        const pulse = Math.abs(phaseTime) < 0.01;
        return pulse ? gen.weight || 1.0 : 0;
      });

      // Interference: sum all generator values
      const sum = values.reduce((acc, val) => acc + val, 0);

      // Threshold to create attack
      if (sum > 0.5) {
        // Normalize accent by number of generators
        const accent = Math.min(sum / this.generators.length, 1.0);
        attacks.push({ time: t, accent });
      }
    }

    return attacks;
  }

  /**
   * Apply permutation rules
   *
   * @param attacks - Base attacks
   * @returns Permuted attacks
   */
  private applyPermutations(attacks: Attack[]): Attack[] {
    let result = [...attacks];

    for (const rule of this.permutations) {
      result = this.applyPermutationRule(result, rule);
    }

    return result;
  }

  /**
   * Apply single permutation rule
   *
   * @param attacks - Attacks to permute
   * @param rule - Permutation rule
   * @returns Permuted attacks
   */
  private applyPermutationRule(attacks: Attack[], rule: PermutationRule): Attack[] {
    switch (rule.type) {
      case "rotation":
        return this.rotate(attacks, rule.period, rule.parameter as number | undefined);
      case "retrograde":
        return this.retrograde(attacks);
      case "inversion":
        return this.invert(attacks);
      default:
        return attacks;
    }
  }

  /**
   * Rotate pattern by N positions
   *
   * @param attacks - Attacks to rotate
   * @param period - Rotation period
   * @param amount - Amount to rotate
   * @returns Rotated attacks
   */
  private rotate(attacks: Attack[], _period: number, amount?: number): Attack[] {
    if (!amount || amount === 0) {
      return attacks;
    }

    const n = Math.floor(amount);
    const len = attacks.length;
    if (len === 0) {
      return attacks;
    }

    // Rotate by n positions
    const rotated = [...attacks];
    for (let i = 0; i < len; i++) {
      rotated[(i + n) % len] = attacks[i];
    }

    return rotated;
  }

  /**
   * Retrograde pattern (reverse time)
   *
   * @param attacks - Attacks to reverse
   * @returns Reversed attacks
   */
  private retrograde(attacks: Attack[]): Attack[] {
    if (attacks.length === 0) {
      return attacks;
    }

    const duration = attacks[attacks.length - 1].time;
    return attacks.map((attack) => ({
      ...attack,
      time: duration - attack.time,
    }));
  }

  /**
   * Invert pattern (reverse accents)
   *
   * @param attacks - Attacks to invert
   * @returns Attacks with inverted accents
   */
  private invert(attacks: Attack[]): Attack[] {
    return attacks.map((attack) => ({
      ...attack,
      accent: 1.0 - attack.accent,
    }));
  }

  /**
   * Apply accent displacement rules
   *
   * @param attacks - Attacks with accents
   * @returns Attacks with displaced accents
   */
  private applyAccentDisplacement(attacks: Attack[]): Attack[] {
    let result = [...attacks];

    for (const rule of this.accentDisplacement) {
      result = this.applyAccentRule(result, rule);
    }

    return result;
  }

  /**
   * Apply single accent displacement rule
   *
   * @param attacks - Attacks
   * @param rule - Accent displacement rule
   * @returns Attacks with displaced accents
   */
  private applyAccentRule(attacks: Attack[], rule: AccentDisplacementRule): Attack[] {
    return attacks.map((attack) => {
      const shouldDisplace = this.shouldDisplaceAccent(attack, rule.trigger);

      if (shouldDisplace) {
        return {
          ...attack,
          time: attack.time + rule.displacement,
        };
      }

      return attack;
    });
  }

  /**
   * Check if accent should be displaced
   *
   * @param attack - Attack to check
   * @param trigger - Displacement trigger
   * @returns True if should displace
   */
  private shouldDisplaceAccent(attack: Attack, trigger: string): boolean {
    switch (trigger) {
      case "strong":
        return attack.accent > 0.7;
      case "weak":
        return attack.accent < 0.3;
      case "custom":
        return false; // User-defined logic would go here
      default:
        return false;
    }
  }

  /**
   * Apply quantization constraint
   *
   * @param attacks - Attacks to quantize
   * @returns Quantized attacks
   */
  private applyQuantization(attacks: Attack[]): Attack[] {
    const grid = this.quantizationConstraint.grid;

    if (this.quantizationConstraint.allowOffset) {
      return attacks; // No quantization if offset allowed
    }

    // Snap to grid
    return attacks.map((attack) => ({
      ...attack,
      time: Math.round(attack.time / grid) * grid,
    }));
  }

  /**
   * Calculate resultant period
   *
   * For generators with periods p1, p2, p3, ...,
   * the resultant period is LCM of all periods.
   *
   * @returns Resultant period in beats
   */
  getResultantPeriod(): number {
    const periods = this.generators.map((g) => g.period);
    return this.lcm(periods);
  }

  /**
   * Calculate greatest common divisor
   *
   * @param a - First number
   * @param b - Second number
   * @returns GCD
   */
  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  /**
   * Calculate least common multiple
   *
   * @param numbers - Array of numbers
   * @returns LCM
   */
  private lcm(numbers: number[]): number {
    if (numbers.length === 0) {
      return 1;
    }

    if (numbers.length === 1) {
      return numbers[0];
    }

    const lcm2 = (a: number, b: number) => (a * b) / this.gcd(a, b);
    return numbers.reduce(lcm2);
  }

  /**
   * Calculate density (attacks per measure)
   *
   * @param pattern - Rhythm pattern
   * @param measureLength - Length of measure in beats
   * @returns Attacks per measure
   */
  calculateDensity(pattern: RhythmPattern, measureLength: number): number {
    return pattern.attacks.length / measureLength;
  }

  /**
   * Validate rhythm system
   *
   * @returns Validation result
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check generators
    if (this.generators.length < 2) {
      errors.push("RhythmSystem requires at least 2 generators");
    }

    for (const gen of this.generators) {
      if (gen.period < 1 || gen.period > 16) {
        errors.push(`Generator period ${gen.period} out of range (1-16)`);
      }

      if (gen.phase < 0 || gen.phase >= gen.period) {
        errors.push(`Generator phase ${gen.phase} must be < period ${gen.period}`);
      }

      if (gen.weight !== undefined && (gen.weight < 0.1 || gen.weight > 2.0)) {
        errors.push(`Generator weight ${gen.weight} out of range (0.1-2.0)`);
      }
    }

    // Check quantization grid
    const grid = this.quantizationConstraint.grid;
    if (!isPowerOfTwo(grid) || grid < 0.0625) {
      errors.push(`Quantization grid ${grid} must be power of 2 and >= 0.0625`);
    }

    // Check density constraints
    if (this.densityConstraints.minAttacksPerMeasure !== undefined) {
      if (this.densityConstraints.minAttacksPerMeasure < 0) {
        errors.push("Min attacks per measure cannot be negative");
      }
    }

    if (this.densityConstraints.maxAttacksPerMeasure !== undefined) {
      if (this.densityConstraints.maxAttacksPerMeasure < 0) {
        errors.push("Max attacks per measure cannot be negative");
      }

      if (
        this.densityConstraints.minAttacksPerMeasure !== undefined &&
        this.densityConstraints.maxAttacksPerMeasure < this.densityConstraints.minAttacksPerMeasure
      ) {
        errors.push("Max attacks per measure must be >= min attacks per measure");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Check if a number is a power of 2
 *
 * @param n - Number to check
 * @returns True if power of 2
 */
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Create a RhythmSystem with defaults
 *
 * @param overrides - Properties to override
 * @returns New RhythmSystem
 */
export function createRhythmSystem(overrides?: Partial<RhythmSystem>): RhythmSystemImpl {
  const systemId = overrides?.systemId || generateUUID();

  const defaults: RhythmSystem = {
    systemId,
    systemType: "rhythm",
    generators: [
      { period: 3, phase: 0, weight: 1.0 },
      { period: 4, phase: 0, weight: 1.0 },
    ],
    resultantSelection: {
      method: "interference",
    },
    permutations: [],
    accentDisplacement: [],
    densityConstraints: {
      constraintId: generateUUID(),
      scope: "system",
    },
    quantizationConstraint: {
      constraintId: generateUUID(),
      grid: 0.25,
      allowOffset: false,
    },
  };

  const data = { ...defaults, ...overrides, systemId };
  return new RhythmSystemImpl(data);
}

/**
 * Helper function to generate UUID
 * (Import from utils in production)
 */
function generateUUID(): string {
  // Simple UUID v4 generator for now
  // In production: import { generateUUID } from '../utils/uuid';
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

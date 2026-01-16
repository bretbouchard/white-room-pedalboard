/**
 * Book II: Melody System Implementation
 *
 * Implements Schillinger's melody theory using pitch cycles, intervals,
 * and transformational rules.
 *
 * Key concepts:
 * - Pitch cycles: Modulo N pitch sequences
 * - Interval seeds: Ordered interval patterns
 * - Rotation: Cyclic or random interval rotation
 * - Expansion/contraction: Multiplicative interval transformations
 * - Contour constraints: Directional and leap constraints
 * - Register constraints: Pitch range limits
 */

import {
  type MelodySystem,
  type RotationRule,
  type ExpansionRule,
  type ContractionRule,
  type ContourConstraint,
  type RegisterConstraint,
} from "../../types";

/**
 * Pitch event - a melodic event
 */
export interface PitchEvent {
  time: number; // Time in beats
  pitch: number; // MIDI note number (0-127)
  velocity: number; // 0-127
  duration: number; // In beats
}

/**
 * Melody contour - sequence of pitch changes
 */
export interface MelodyContour {
  intervals: number[]; // Ordered intervals
  direction: "ascending" | "descending" | "oscillating";
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

/**
 * MelodySystem class - Book II implementation
 */
export class MelodySystemImpl implements MelodySystem {
  readonly systemId: string;
  readonly systemType = "melody" as const;
  cycleLength: number; // mod N (2-24)
  intervalSeed: number[]; // Ordered intervals (-12 to +12)
  rotationRule: RotationRule;
  expansionRules: ExpansionRule[];
  contractionRules: ContractionRule[];
  contourConstraints: ContourConstraint;
  directionalBias: number; // -1 (descending) to 1 (ascending)
  registerConstraints: RegisterConstraint;
  rhythmBinding: string; // RhythmSystem ID

  constructor(data: MelodySystem) {
    this.systemId = data.systemId;
    this.cycleLength = data.cycleLength ?? 7;
    this.intervalSeed = data.intervalSeed ?? [2, 2, 1, 2, 2, 2, 1];
    this.rotationRule = data.rotationRule ?? {
      ruleId: generateUUID(),
      type: "cyclic",
      interval: 7,
      amount: 0,
    };
    this.expansionRules = data.expansionRules ?? [];
    this.contractionRules = data.contractionRules ?? [];
    this.contourConstraints = data.contourConstraints ?? {
      constraintId: generateUUID(),
      type: "oscillating",
    };
    this.directionalBias = data.directionalBias ?? 0;
    this.registerConstraints = data.registerConstraints ?? {
      constraintId: generateUUID(),
      minPitch: 48,
      maxPitch: 84,
      allowTransposition: true,
    };
    this.rhythmBinding = data.rhythmBinding ?? "";
  }

  /**
   * Generate melody from pitch cycle and intervals
   *
   * @param duration - Duration in beats to generate
   * @param rhythmPattern - Rhythm attack times (from Book I)
   * @param rootPitch - Root MIDI note number
   * @returns Melody with pitches
   */
  generateMelody(duration: number, rhythmPattern: number[], rootPitch: number = 60): PitchEvent[] {
    const events: PitchEvent[] = [];

    // Apply rotation to interval seed
    const rotatedIntervals = this.applyRotation(this.intervalSeed);

    // Generate base pitch sequence from cycle
    let currentPitch = rootPitch;

    for (let i = 0; i < rhythmPattern.length; i++) {
      const time = rhythmPattern[i];
      if (time >= duration) break;

      // First note is at root pitch, subsequent notes add intervals
      if (i > 0) {
        // Get interval from cycle (mod cycleLength)
        // Use (i-1) since first note (i=0) has no interval
        const intervalIndex = (i - 1) % this.cycleLength;
        const interval = rotatedIntervals[intervalIndex];

        // Apply expansion/contraction (using 0-based index)
        const transformedInterval = this.applyIntervalTransformations(
          interval,
          i - 1 // Index for transformation rules
        );

        // Add interval to current pitch
        currentPitch += transformedInterval;
      }

      // Apply contour constraints
      const constrainedPitch = this.applyContourConstraints(currentPitch, events);

      // Apply register constraints
      const finalPitch = this.applyRegisterConstraints(constrainedPitch);

      // Calculate velocity based on contour
      const previousPitch = events.length > 0 ? events[events.length - 1].pitch : rootPitch;
      const velocity = this.calculateVelocity(finalPitch, previousPitch);

      // Calculate duration (until next event or end)
      const nextTime = rhythmPattern[i + 1] ?? duration;
      const noteDuration = Math.max(nextTime - time, 0.25);

      events.push({
        time,
        pitch: finalPitch,
        velocity,
        duration: noteDuration,
      });
    }

    return events;
  }

  /**
   * Apply rotation to interval seed
   *
   * @param intervals - Base intervals
   * @returns Rotated intervals
   */
  private applyRotation(intervals: number[]): number[] {
    if (this.rotationRule.type === "cyclic") {
      const amount = this.rotationRule.amount !== undefined ? this.rotationRule.amount : 1;
      const n = Math.floor(amount) % intervals.length;
      return [...intervals.slice(n), ...intervals.slice(0, n)];
    } else {
      // Random rotation - for now, return as-is
      // In production with PRNG: rotate by random amount
      return intervals;
    }
  }

  /**
   * Apply expansion/contraction transformations
   *
   * @param interval - Base interval
   * @param index - Position in sequence
   * @returns Transformed interval
   */
  private applyIntervalTransformations(interval: number, index: number): number {
    let result = interval;

    // Apply expansion rules
    for (const rule of this.expansionRules) {
      if (this.shouldApplyRule(rule, index)) {
        result = result * rule.multiplier;
      }
    }

    // Apply contraction rules
    for (const rule of this.contractionRules) {
      if (this.shouldApplyRule(rule, index)) {
        result = result / rule.divisor;
      }
    }

    // Round to nearest integer
    return Math.round(result);
  }

  /**
   * Check if transformation rule should be applied
   *
   * @param rule - Expansion or contraction rule
   * @param index - Position in sequence (0-based, corresponds to note index)
   * @returns True if rule should apply
   */
  private shouldApplyRule(rule: ExpansionRule | ContractionRule, index: number): boolean {
    if (rule.trigger === "periodic" && rule.period !== undefined) {
      // Apply at 1-based positions: period, 2*period, 3*period, ...
      // Convert to 0-based: period-1, 2*period-1, 3*period-1, ...
      // Which is: (index + 1) % period === 0
      return (index + 1) % rule.period === 0;
    } else {
      // Conditional logic would go here
      return false;
    }
  }

  /**
   * Apply contour constraints
   *
   * @param pitch - Proposed pitch
   * @param events - Previous events
   * @returns Constrained pitch
   */
  private applyContourConstraints(pitch: number, events: PitchEvent[]): number {
    if (events.length === 0) {
      return pitch;
    }

    const lastPitch = events[events.length - 1].pitch;

    // Check max interval leaps
    if (this.contourConstraints.maxIntervalLeaps !== undefined) {
      const interval = pitch - lastPitch;
      if (Math.abs(interval) > this.contourConstraints.maxIntervalLeaps) {
        // Clamp to max leap
        return lastPitch + Math.sign(interval) * this.contourConstraints.maxIntervalLeaps;
      }
    }

    // Apply directional bias
    if (this.directionalBias !== 0) {
      const biasedPitch = pitch + this.directionalBias * 2;
      return Math.round(biasedPitch);
    }

    // Apply contour type constraints
    switch (this.contourConstraints.type) {
      case "ascending":
        return pitch > lastPitch ? pitch : lastPitch + 1;
      case "descending":
        return pitch < lastPitch ? pitch : lastPitch - 1;
      case "oscillating":
        // Allow oscillation - no constraint
        return pitch;
      case "custom":
        // Custom logic would go here
        return pitch;
      default:
        return pitch;
    }
  }

  /**
   * Apply register constraints
   *
   * @param pitch - Proposed pitch
   * @returns Pitch within register
   */
  private applyRegisterConstraints(pitch: number): number {
    if (!this.registerConstraints.allowTransposition) {
      // Clamp to register
      if (this.registerConstraints.minPitch !== undefined) {
        pitch = Math.max(pitch, this.registerConstraints.minPitch);
      }
      if (this.registerConstraints.maxPitch !== undefined) {
        pitch = Math.min(pitch, this.registerConstraints.maxPitch);
      }
    } else {
      // Transpose by octaves to fit in register
      if (
        this.registerConstraints.minPitch !== undefined &&
        pitch < this.registerConstraints.minPitch
      ) {
        while (pitch < this.registerConstraints.minPitch) {
          pitch += 12;
        }
      }
      if (
        this.registerConstraints.maxPitch !== undefined &&
        pitch > this.registerConstraints.maxPitch
      ) {
        while (pitch > this.registerConstraints.maxPitch) {
          pitch -= 12;
        }
      }
    }

    // Ensure within MIDI range
    return Math.max(0, Math.min(127, pitch));
  }

  /**
   * Calculate velocity based on contour
   *
   * @param currentPitch - Current pitch
   * @param previousPitch - Previous pitch
   * @returns Velocity (0-127)
   */
  private calculateVelocity(currentPitch: number, previousPitch: number): number {
    // Ascending = slightly louder, descending = slightly softer
    const interval = currentPitch - previousPitch;
    const baseVelocity = 80;

    // Map interval (-12 to +12) to velocity adjustment (-20 to +20)
    const adjustment = Math.max(-20, Math.min(20, interval * 2));
    const velocity = baseVelocity + adjustment;

    return Math.max(0, Math.min(127, Math.round(velocity)));
  }

  /**
   * Get cycle length
   *
   * @returns Cycle length (mod N)
   */
  getCycleLength(): number {
    return this.cycleLength;
  }

  /**
   * Get interval seed
   *
   * @returns Interval seed array
   */
  getIntervalSeed(): number[] {
    return [...this.intervalSeed];
  }

  /**
   * Calculate contour from melody
   *
   * @param events - Melody events
   * @returns Melody contour
   */
  calculateContour(events: PitchEvent[]): MelodyContour {
    if (events.length < 2) {
      return {
        intervals: [],
        direction: "oscillating",
      };
    }

    const intervals: number[] = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push(events[i].pitch - events[i - 1].pitch);
    }

    // Determine overall direction
    const ascending = intervals.filter((i) => i > 0).length;
    const descending = intervals.filter((i) => i < 0).length;
    const total = intervals.length;

    let direction: "ascending" | "descending" | "oscillating";

    // Need 67% (2/3) in one direction to claim that direction
    const ascendingRatio = ascending / total;
    const descendingRatio = descending / total;

    if (ascendingRatio >= 0.67) {
      direction = "ascending";
    } else if (descendingRatio >= 0.67) {
      direction = "descending";
    } else {
      direction = "oscillating";
    }

    return { intervals, direction };
  }

  /**
   * Validate melody system
   *
   * @returns Validation result
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check cycle length
    if (this.cycleLength < 2 || this.cycleLength > 24) {
      errors.push(`Cycle length ${this.cycleLength} out of range (2-24)`);
    }

    // Check interval seed
    if (this.intervalSeed.length === 0) {
      errors.push("Interval seed cannot be empty");
    }

    for (const interval of this.intervalSeed) {
      if (interval < -12 || interval > 12) {
        errors.push(`Interval ${interval} out of range (-12 to +12)`);
      }
    }

    // Check rotation rule
    if (this.rotationRule.interval < 1) {
      errors.push(`Rotation interval ${this.rotationRule.interval} must be >= 1`);
    }

    // Check expansion rules
    for (const rule of this.expansionRules) {
      if (rule.multiplier < 1 || rule.multiplier > 4) {
        errors.push(`Expansion multiplier ${rule.multiplier} out of range (1-4)`);
      }
      if (rule.trigger === "periodic" && rule.period !== undefined && rule.period < 1) {
        errors.push(`Expansion period ${rule.period} must be >= 1`);
      }
    }

    // Check contraction rules
    for (const rule of this.contractionRules) {
      if (rule.divisor < 1 || rule.divisor > 4) {
        errors.push(`Contraction divisor ${rule.divisor} out of range (1-4)`);
      }
      if (rule.trigger === "periodic" && rule.period !== undefined && rule.period < 1) {
        errors.push(`Contraction period ${rule.period} must be >= 1`);
      }
    }

    // Check contour constraints
    if (
      this.contourConstraints.maxIntervalLeaps !== undefined &&
      this.contourConstraints.maxIntervalLeaps < 0
    ) {
      errors.push("Max interval leaps cannot be negative");
    }

    // Check directional bias
    if (this.directionalBias < -1 || this.directionalBias > 1) {
      errors.push(`Directional bias ${this.directionalBias} out of range (-1 to 1)`);
    }

    // Check register constraints
    if (this.registerConstraints.minPitch !== undefined) {
      if (this.registerConstraints.minPitch < 0 || this.registerConstraints.minPitch > 127) {
        errors.push(`Min pitch ${this.registerConstraints.minPitch} out of range (0-127)`);
      }
    }

    if (this.registerConstraints.maxPitch !== undefined) {
      if (this.registerConstraints.maxPitch < 0 || this.registerConstraints.maxPitch > 127) {
        errors.push(`Max pitch ${this.registerConstraints.maxPitch} out of range (0-127)`);
      }
    }

    if (
      this.registerConstraints.minPitch !== undefined &&
      this.registerConstraints.maxPitch !== undefined &&
      this.registerConstraints.minPitch > this.registerConstraints.maxPitch
    ) {
      errors.push("Min pitch cannot be greater than max pitch");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Create a MelodySystem with defaults
 *
 * @param overrides - Properties to override
 * @returns New MelodySystemImpl instance
 */
export function createMelodySystem(overrides?: Partial<MelodySystem>): MelodySystemImpl {
  const systemId = overrides?.systemId || generateUUID();

  const defaults: MelodySystem = {
    systemId,
    systemType: "melody",
    cycleLength: 7,
    intervalSeed: [2, 2, 1, 2, 2, 2, 1], // Major scale intervals
    rotationRule: {
      ruleId: generateUUID(),
      type: "cyclic",
      interval: 7,
      amount: 0,
    },
    expansionRules: [],
    contractionRules: [],
    contourConstraints: {
      constraintId: generateUUID(),
      type: "oscillating",
    },
    directionalBias: 0, // No bias by default
    registerConstraints: {
      constraintId: generateUUID(),
      minPitch: 48,
      maxPitch: 84,
      allowTransposition: true,
    },
    rhythmBinding: "", // No binding by default
  };

  const data = { ...defaults, ...overrides, systemId };
  return new MelodySystemImpl(data);
}

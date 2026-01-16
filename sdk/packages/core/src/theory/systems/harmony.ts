/**
 * Book III: Harmony System Implementation
 *
 * Implements Schillinger's harmony theory using vertical distributions,
 * voice-leading, and resolution rules.
 *
 * Key concepts:
 * - Vertical distribution: Interval weights (1-12 semitones)
 * - Harmonic rhythm: Binds to Book I rhythm system
 * - Voice-leading: Motion constraints between chords
 * - Resolution: Cadence and conditional rules
 */

import { type HarmonySystem, type VoiceLeadingConstraint, type ResolutionRule } from "../../types";

/**
 * Chord representation - vertical collection of pitches
 */
export interface Chord {
  time: number; // Time in beats
  root: number; // Root MIDI note number
  intervals: number[]; // Intervals above root (1-12 semitones)
  weight: number; // Importance in progression (0-1)
}

/**
 * HarmonySystem class - Book III implementation
 */
export class HarmonySystemImpl implements HarmonySystem {
  readonly systemId: string;
  readonly systemType = "harmony" as const;
  distribution: number[]; // Interval weights (intervals 1-12)
  harmonicRhythmBinding: string; // RhythmSystem ID
  voiceLeadingConstraints: VoiceLeadingConstraint[];
  resolutionRules: ResolutionRule[];

  constructor(data: HarmonySystem) {
    this.systemId = data.systemId;
    this.distribution = data.distribution;
    this.harmonicRhythmBinding = data.harmonicRhythmBinding;
    this.voiceLeadingConstraints = data.voiceLeadingConstraints;
    this.resolutionRules = data.resolutionRules;
  }

  /**
   * Generate harmony progression from distribution and rhythm
   *
   * @param duration - Duration in beats to generate
   * @param rhythmPattern - Rhythm attack times (from Book I binding)
   * @param rootPitch - Root MIDI note number
   * @returns Harmony progression with chords
   */
  generateHarmony(duration: number, rhythmPattern: number[], rootPitch: number = 60): Chord[] {
    const chords: Chord[] = [];

    // Generate chords at each rhythmic attack point
    let currentRoot = rootPitch;
    let chordIndex = 0;

    for (const time of rhythmPattern) {
      if (time >= duration) break;

      // Generate chord based on distribution
      const intervals = this.generateChordIntervals(chordIndex);

      // Calculate weight based on position
      const weight = this.calculateChordWeight(chordIndex, rhythmPattern.length);

      // Apply voice-leading constraints
      const constrainedIntervals = this.applyVoiceLeading(
        intervals,
        chords.length > 0 ? chords[chords.length - 1] : null
      );

      // Apply resolution rules
      const resolvedRoot = this.applyResolution(currentRoot, chordIndex);

      const chord: Chord = {
        time,
        root: resolvedRoot,
        intervals: constrainedIntervals,
        weight,
      };

      chords.push(chord);

      // Move to next chord (may transpose root)
      currentRoot = this.transitionRoot(resolvedRoot, chordIndex);

      chordIndex++;
    }

    return chords;
  }

  /**
   * Generate chord intervals from distribution
   *
   * @param chordIndex - Position in progression
   * @returns Array of intervals above root
   */
  private generateChordIntervals(chordIndex: number): number[] {
    const intervals: number[] = [];

    // Use distribution as weights for interval selection
    // For now, deterministically select intervals based on distribution weights
    const cumulativeWeights: number[] = [];
    let sum = 0;

    for (let i = 0; i < this.distribution.length; i++) {
      sum += this.distribution[i];
      cumulativeWeights.push(sum);
    }

    // Normalize weights
    const normalized = cumulativeWeights.map((w) => w / sum);

    // Select intervals (e.g., top 3-5 weighted intervals)
    const numVoices = 3 + (chordIndex % 3); // 3-5 voices

    for (let i = 0; i < numVoices; i++) {
      // Use deterministic selection based on index
      const intervalIndex = (chordIndex + i) % normalized.length;

      // Select interval if weight is significant (> 0.1)
      if (this.distribution[intervalIndex] > 0.1) {
        intervals.push(intervalIndex + 1); // Intervals are 1-based (1-12)
      }
    }

    // Remove duplicates and sort
    const unique = [...new Set(intervals)].sort((a, b) => a - b);

    // Ensure at least a triad (root, 3rd, 5th)
    if (unique.length < 3) {
      return [3, 5, 7]; // Default major triad
    }

    return unique;
  }

  /**
   * Calculate chord weight based on position
   *
   * @param chordIndex - Position in progression
   * @param totalChords - Total number of chords
   * @returns Weight (0-1)
   */
  private calculateChordWeight(chordIndex: number, totalChords: number): number {
    // First and last chords are more important
    if (chordIndex === 0 || chordIndex === totalChords - 1) {
      return 1.0;
    }

    // Middle chords have lower weight
    return 0.7;
  }

  /**
   * Apply voice-leading constraints
   *
   * @param intervals - Proposed intervals
   * @param previousChord - Previous chord in progression
   * @returns Constrained intervals
   */
  private applyVoiceLeading(intervals: number[], previousChord: Chord | null): number[] {
    if (!previousChord || this.voiceLeadingConstraints.length === 0) {
      return intervals;
    }

    let result = [...intervals];

    for (const constraint of this.voiceLeadingConstraints) {
      // Check max interval leap
      if (constraint.maxIntervalLeap !== undefined) {
        result = this.limitIntervalLeaps(
          result,
          previousChord.intervals,
          constraint.maxIntervalLeap
        );
      }

      // Avoid parallels (simplified check)
      if (constraint.avoidParallels) {
        result = this.avoidParallelMotion(result, previousChord.intervals);
      }

      // Preferred motion type
      if (constraint.preferredMotion) {
        result = this.applyPreferredMotion(
          result,
          previousChord.intervals,
          constraint.preferredMotion
        );
      }
    }

    return result;
  }

  /**
   * Limit interval leaps between chords
   *
   * @param intervals - Current chord intervals
   * @param previousIntervals - Previous chord intervals
   * @param maxLeap - Maximum allowed leap
   * @returns Adjusted intervals
   */
  private limitIntervalLeaps(
    intervals: number[],
    previousIntervals: number[],
    maxLeap: number
  ): number[] {
    // Simplified: check root motion
    // In full implementation, check each voice
    return intervals.map((interval, i) => {
      if (i < previousIntervals.length) {
        const leap = Math.abs(interval - previousIntervals[i]);
        if (leap > maxLeap) {
          // Clamp to max leap
          return previousIntervals[i] + Math.sign(interval - previousIntervals[i]) * maxLeap;
        }
      }
      return interval;
    });
  }

  /**
   * Avoid parallel motion (simplified)
   *
   * @param intervals - Current chord intervals
   * @param previousIntervals - Previous chord intervals
   * @returns Adjusted intervals
   */
  private avoidParallelMotion(intervals: number[], previousIntervals: number[]): number[] {
    // Simplified check: avoid parallel 5ths and 8ves
    // In full implementation, would check all voice pairs
    return intervals.map((interval, i) => {
      if (i < previousIntervals.length) {
        const prevInterval = previousIntervals[i];
        const motion = interval - prevInterval;

        // Check for parallel 5th (7 semitones) or 8ve (12 semitones)
        if ((prevInterval === 7 || prevInterval === 12) && motion === 0) {
          // Alter interval slightly to break parallel
          return interval + 1;
        }
      }
      return interval;
    });
  }

  /**
   * Apply preferred motion type
   *
   * @param intervals - Current chord intervals
   * @param previousIntervals - Previous chord intervals
   * @param motionType - Preferred motion type
   * @returns Adjusted intervals
   */
  private applyPreferredMotion(
    intervals: number[],
    previousIntervals: number[],
    motionType: "contrary" | "oblique" | "similar" | "parallel"
  ): number[] {
    // Simplified implementation
    switch (motionType) {
      case "contrary":
        // Move in opposite direction
        return intervals.map((interval, i) => {
          if (i < previousIntervals.length) {
            const direction = Math.sign(interval - previousIntervals[i]);
            // Reverse direction
            return previousIntervals[i] - direction * Math.abs(interval - previousIntervals[i]);
          }
          return interval;
        });

      case "oblique":
        // Keep one voice stationary
        if (intervals.length > 0 && previousIntervals.length > 0) {
          // Keep bass (first interval) stationary
          const result = [...intervals];
          result[0] = previousIntervals[0];
          return result;
        }
        return intervals;

      case "similar":
        // Move in same direction
        return intervals.map((interval, i) => {
          if (i < previousIntervals.length) {
            const direction = Math.sign(interval - previousIntervals[i]);
            // Ensure same direction
            if (direction === 0) {
              return interval + 1; // Add small motion
            }
          }
          return interval;
        });

      case "parallel":
        // All voices move in parallel (already default behavior)
        return intervals;

      default:
        return intervals;
    }
  }

  /**
   * Apply resolution rules
   *
   * @param root - Current root pitch
   * @param chordIndex - Position in progression
   * @returns Resolved root pitch
   */
  private applyResolution(root: number, chordIndex: number): number {
    for (const rule of this.resolutionRules) {
      if (rule.trigger === "cadence" && chordIndex === this.getLastChordIndex()) {
        // Apply cadential resolution
        return this.resolveToTarget(root, rule.targetDistribution, rule.tendency);
      } else if (rule.trigger === "conditional") {
        // Check conditional logic (simplified)
        // In full implementation, would check specific conditions
        if (chordIndex % 4 === 3) {
          // Every 4th chord
          return this.resolveToTarget(root, rule.targetDistribution, rule.tendency);
        }
      }
    }

    return root;
  }

  /**
   * Resolve root to target distribution
   *
   * @param root - Current root
   * @param targetDistribution - Target interval weights
   * @param tendency - Resolution tendency
   * @returns Resolved root
   */
  private resolveToTarget(
    root: number,
    _targetDistribution: number[],
    tendency: "resolve" | "suspend" | "avoid"
  ): number {
    if (tendency === "resolve") {
      // Move toward tonic (assume root is tonic for simplicity)
      // In full implementation, would analyze tonal center

      // TODO: Use interval or remove
      // const _interval = this.findStrongestInterval(targetDistribution);
      return root; // Simplified: stay on root for authentic cadence
    } else if (tendency === "suspend") {
      // Add suspension (4th)
      return root + 5;
    } else if (tendency === "avoid") {
      // Avoid resolution
      return root + 2; // Move away by whole step
    }

    return root;
  }

  /**
   * Find strongest interval in distribution
   *
   * @param distribution - Interval weights
   * @returns Strongest interval (1-based)
   */
  // TODO: Implement or remove - currently unused
  /*
  private findStrongestInterval(distribution: number[]): number {
    let maxWeight = 0;
    let maxIndex = 0;

    for (let i = 0; i < distribution.length; i++) {
      if (distribution[i] > maxWeight) {
        maxWeight = distribution[i];
        maxIndex = i;
      }
    }

    return maxIndex + 1; // Convert to 1-based
  }
  */

  /**
   * Get last chord index (for cadence detection)
   *
   * @returns Estimated last chord index
   */
  private getLastChordIndex(): number {
    // In full implementation, would analyze rhythm pattern
    // For now, assume a fixed progression length
    return 3; // 4th chord (0-indexed)
  }

  /**
   * Transition to next root
   *
   * @param currentRoot - Current root pitch
   * @param chordIndex - Position in progression
   * @returns Next root pitch
   */
  private transitionRoot(currentRoot: number, chordIndex: number): number {
    // Simple root progression (circle of fifths, stepwise, etc.)
    // For now, use stepwise motion
    const step = [2, -2, 3, -3][chordIndex % 4]; // Mix of steps
    return currentRoot + step;
  }

  /**
   * Get distribution
   *
   * @returns Interval weights array
   */
  getDistribution(): number[] {
    return [...this.distribution];
  }

  /**
   * Validate harmony system
   *
   * @returns Validation result
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check distribution length
    if (this.distribution.length !== 12) {
      errors.push(`Distribution must have 12 elements, got ${this.distribution.length}`);
    }

    // Check distribution weights
    for (let i = 0; i < this.distribution.length; i++) {
      if (this.distribution[i] < 0 || this.distribution[i] > 1) {
        errors.push(`Distribution weight at index ${i} is ${this.distribution[i]}, must be 0-1`);
      }
    }

    // Check that at least one interval has weight
    if (this.distribution.every((w) => w === 0)) {
      errors.push("Distribution must have at least one non-zero weight");
    }

    // Check harmonic rhythm binding
    if (!this.harmonicRhythmBinding || this.harmonicRhythmBinding.trim() === "") {
      errors.push("Harmonic rhythm binding cannot be empty");
    }

    // Check voice-leading constraints
    for (const constraint of this.voiceLeadingConstraints) {
      if (constraint.maxIntervalLeap !== undefined) {
        if (constraint.maxIntervalLeap < 1 || constraint.maxIntervalLeap > 12) {
          errors.push(`Max interval leap ${constraint.maxIntervalLeap} out of range (1-12)`);
        }
      }

      if (constraint.preferredMotion !== undefined) {
        const validMotions = ["contrary", "oblique", "similar", "parallel"];
        if (!validMotions.includes(constraint.preferredMotion)) {
          errors.push(`Preferred motion "${constraint.preferredMotion}" is invalid`);
        }
      }
    }

    // Check resolution rules
    for (const rule of this.resolutionRules) {
      if (rule.targetDistribution.length !== 12) {
        errors.push(
          `Target distribution must have 12 elements, got ${rule.targetDistribution.length}`
        );
      }

      if (rule.tendency !== undefined) {
        const validTendencies = ["resolve", "suspend", "avoid"];
        if (!validTendencies.includes(rule.tendency)) {
          errors.push(`Tendency "${rule.tendency}" is invalid`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Create a HarmonySystem with defaults
 *
 * @param overrides - Properties to override
 * @returns New HarmonySystem
 */
export function createHarmonySystem(overrides?: Partial<HarmonySystem>): HarmonySystemImpl {
  const systemId = overrides?.systemId || generateUUID();

  const defaults: HarmonySystem = {
    systemId,
    systemType: "harmony",
    distribution: [
      0.1, // minor 2nd
      0.3, // major 2nd
      0.8, // minor 3rd
      1.0, // major 3rd
      0.6, // perfect 4th
      0.1, // tritone
      0.9, // perfect 5th
      0.4, // minor 6th
      0.7, // major 6th
      0.5, // minor 7th
      0.2, // major 7th
      0.0, // octave (12th)
    ], // Interval weights (tonal hierarchy)
    harmonicRhythmBinding: "default-rhythm",
    voiceLeadingConstraints: [
      {
        constraintId: generateUUID(),
        maxIntervalLeap: 7, // Perfect 5th
        avoidParallels: true,
        preferredMotion: "contrary",
      },
    ],
    resolutionRules: [],
  };

  const data = { ...defaults, ...overrides, systemId };
  return new HarmonySystemImpl(data);
}

/**
 * Helper function to generate UUID
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

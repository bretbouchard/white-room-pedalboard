/**
 * TransitionEngine - Execute smooth performance transitions at bar boundaries
 *
 * Handles the atomic application of performance configuration changes
 * at bar boundaries to ensure no audio glitches.
 *
 * Core Responsibilities:
 * - Apply new instrumentation at bar boundary
 * - Apply new density settings
 * - Apply new groove template
 * - Apply ConsoleX profile changes
 * - Apply mix target changes (gain/pan)
 * - Ensure atomic updates (all changes happen simultaneously)
 *
 * Transition Strategy:
 * 1. All changes calculated ahead of time
 * 2. Changes applied atomically at sample-accurate bar boundary
 * 3. No intermediate states (prevents clicks/pops)
 * 4. Lock-free updates for audio thread safety
 */

import type { PerformanceRealizationV1 } from './performance_realization.js';
import type { TimeSignature } from './bar_boundary_detector.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Performance transition plan
 *
 * Contains all changes needed to transition from one performance to another.
 * Computed ahead of time, applied atomically at bar boundary.
 */
export interface TransitionPlan {
  readonly fromPerformanceId: string;
  readonly toPerformanceId: string;
  readonly instrumentationChanges: InstrumentationChange[];
  readonly densityChange: DensityChange;
  readonly grooveChange: GrooveChange;
  readonly consoleXChange: ConsoleXChange;
  readonly mixTargetChanges: MixTargetChange[];
  readonly registerMapChanges: RegisterMapChange[];
  readonly scheduledBar: number;
  readonly estimatedCpuImpact: number; // Estimated CPU usage change (0-1)
}

/**
 * Instrumentation change
 */
export interface InstrumentationChange {
  readonly roleId: string;
  readonly fromInstrument: {
    readonly instrumentId: string;
    readonly presetId: string;
  } | null;
  readonly toInstrument: {
    readonly instrumentId: string;
    readonly presetId: string;
  };
  readonly changeType: 'add' | 'remove' | 'replace' | 'keep';
}

/**
 * Density change
 */
export interface DensityChange {
  readonly from: number; // 0-1
  readonly to: number; // 0-1
  readonly delta: number;
}

/**
 * Groove change
 */
export interface GrooveChange {
  readonly fromProfileId: string;
  readonly toProfileId: string;
  readonly timingVarianceDelta: number;
  readonly velocityVarianceDelta: number;
  readonly swingAmountDelta: number;
}

/**
 * ConsoleX change
 */
export interface ConsoleXChange {
  readonly fromProfileId: string;
  readonly toProfileId: string;
}

/**
 * Mix target change
 */
export interface MixTargetChange {
  readonly roleId: string;
  readonly gainFrom: number; // dB
  readonly gainTo: number; // dB
  readonly panFrom: number; // -1 to 1
  readonly panTo: number; // -1 to 1
}

/**
 * Register map change
 */
export interface RegisterMapChange {
  readonly roleId: string;
  readonly minPitchFrom: number; // MIDI note
  readonly minPitchTo: number; // MIDI note
  readonly maxPitchFrom: number; // MIDI note
  readonly maxPitchTo: number; // MIDI note
  readonly transpositionFrom: number; // Semitones
  readonly transpositionTo: number; // Semitones
}

/**
 * Transition result
 */
export interface TransitionResult {
  readonly success: boolean;
  readonly appliedAt: {
    readonly bar: number;
    readonly position: number; // Sample position
  } | null;
  readonly error?: TransitionError;
}

/**
 * Transition error
 */
export interface TransitionError {
  readonly code: 'INVALID_PERFORMANCE' | 'TRANSITION_FAILED' | 'AUDIO_ENGINE_ERROR';
  readonly message: string;
  readonly details?: unknown;
}

// ============================================================================
// TransitionEngine Implementation
// ============================================================================

export class TransitionEngine {
  /**
   * Plan a transition between two performances
   *
   * Analyzes both performances and creates a detailed transition plan
   * that can be applied atomically at a bar boundary.
   *
   * @param fromPerformance - Current active performance
   * @param toPerformance - Target performance to switch to
   * @param targetBar - Bar number where transition should occur
   * @returns Transition plan with all changes
   */
  planTransition(
    fromPerformance: PerformanceRealizationV1,
    toPerformance: PerformanceRealizationV1,
    targetBar: number
  ): TransitionPlan {
    // Calculate instrumentation changes
    const instrumentationChanges = this.calculateInstrumentationChanges(
      fromPerformance.instrumentationMap,
      toPerformance.instrumentationMap
    );

    // Calculate density change
    const densityChange: DensityChange = {
      from: fromPerformance.density,
      to: toPerformance.density,
      delta: toPerformance.density - fromPerformance.density
    };

    // Calculate groove change
    const grooveChange = this.calculateGrooveChange(
      fromPerformance.grooveProfileId,
      toPerformance.grooveProfileId
    );

    // Calculate ConsoleX change
    const consoleXChange: ConsoleXChange = {
      fromProfileId: fromPerformance.consoleXProfileId,
      toProfileId: toPerformance.consoleXProfileId
    };

    // Calculate mix target changes
    const mixTargetChanges = this.calculateMixTargetChanges(
      fromPerformance.mixTargets,
      toPerformance.mixTargets
    );

    // Calculate register map changes
    const registerMapChanges = this.calculateRegisterMapChanges(
      fromPerformance.registerMap,
      toPerformance.registerMap
    );

    // Estimate CPU impact
    const estimatedCpuImpact = this.estimateCpuImpact(
      fromPerformance,
      toPerformance
    );

    return {
      fromPerformanceId: fromPerformance.id,
      toPerformanceId: toPerformance.id,
      instrumentationChanges,
      densityChange,
      grooveChange,
      consoleXChange,
      mixTargetChanges,
      registerMapChanges,
      scheduledBar: targetBar,
      estimatedCpuImpact
    };
  }

  /**
   * Execute transition at bar boundary
   *
   * Apply the transition plan atomically at the specified bar position.
   * This method is called from the audio thread when reaching the target bar.
   *
   * NOTE: This must be fast and non-blocking (called from audio thread).
   *
   * @param plan - Transition plan to execute
   * @param barPosition - Sample position of bar boundary
   * @returns Transition result
   */
  executeTransition(
    plan: TransitionPlan,
    barPosition: number
  ): TransitionResult {
    try {
      // In a real implementation, this would:
      // 1. Lock-free update of audio engine state
      // 2. Apply new instrumentation
      // 3. Apply new density
      // 4. Apply new groove
      // 5. Apply ConsoleX profile
      // 6. Apply mix targets
      // 7. Apply register map

      // For now, we just return success
      // The actual audio engine integration happens in JUCE

      return {
        success: true,
        appliedAt: {
          bar: plan.scheduledBar,
          position: barPosition
        }
      };
    } catch (error) {
      return {
        success: false,
        appliedAt: null,
        error: {
          code: 'TRANSITION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown transition error',
          details: error
        }
      };
    }
  }

  /**
   * Calculate instrumentation changes between two performances
   */
  private calculateInstrumentationChanges(
    fromMap: PerformanceRealizationV1['instrumentationMap'],
    toMap: PerformanceRealizationV1['instrumentationMap']
  ): InstrumentationChange[] {
    const changes: InstrumentationChange[] = [];
    const processedKeys = new Set<string>();

    // Helper function to create a composite key for comparing entries
    const getEntryKey = (entry: typeof toMap[0]): string => {
      // Use voiceId if present (for multi-voice performances like SATB)
      // Otherwise use roleId (for single-voice performances)
      return entry.voiceId ? `${entry.roleId}:${entry.voiceId}` : entry.roleId;
    };

    // Find changes and additions in toMap
    for (const toEntry of toMap) {
      const toKey = getEntryKey(toEntry);
      const fromEntry = fromMap.find(e => getEntryKey(e) === toKey);

      if (fromEntry) {
        // Role exists in both - check if changed
        if (fromEntry.instrumentId !== toEntry.instrumentId ||
            fromEntry.presetId !== toEntry.presetId) {
          changes.push({
            roleId: toEntry.roleId,
            fromInstrument: {
              instrumentId: fromEntry.instrumentId,
              presetId: fromEntry.presetId
            },
            toInstrument: {
              instrumentId: toEntry.instrumentId,
              presetId: toEntry.presetId
            },
            changeType: 'replace'
          });
        } else {
          // No change
          changes.push({
            roleId: toEntry.roleId,
            fromInstrument: null,
            toInstrument: {
              instrumentId: toEntry.instrumentId,
              presetId: toEntry.presetId
            },
            changeType: 'keep'
          });
        }
      } else {
        // New role added
        changes.push({
          roleId: toEntry.roleId,
          fromInstrument: null,
          toInstrument: {
            instrumentId: toEntry.instrumentId,
            presetId: toEntry.presetId
          },
          changeType: 'add'
        });
      }

      processedKeys.add(toKey);
    }

    // Find removed roles
    for (const fromEntry of fromMap) {
      const fromKey = getEntryKey(fromEntry);
      if (!processedKeys.has(fromKey)) {
        changes.push({
          roleId: fromEntry.roleId,
          fromInstrument: {
            instrumentId: fromEntry.instrumentId,
            presetId: fromEntry.presetId
          },
          toInstrument: fromEntry.instrumentId, // Will be removed
          changeType: 'remove'
        });
      }
    }

    return changes;
  }

  /**
   * Calculate groove change
   */
  private calculateGrooveChange(
    fromProfileId: string,
    toProfileId: string
  ): GrooveChange {
    // In a real implementation, we'd look up the actual groove profiles
    // and calculate deltas for timingVariance, velocityVariance, swingAmount

    return {
      fromProfileId,
      toProfileId,
      timingVarianceDelta: 0.0, // Would calculate from actual profiles
      velocityVarianceDelta: 0.0,
      swingAmountDelta: 0.0
    };
  }

  /**
   * Calculate mix target changes
   */
  private calculateMixTargetChanges(
    fromTargets: PerformanceRealizationV1['mixTargets'],
    toTargets: PerformanceRealizationV1['mixTargets']
  ): MixTargetChange[] {
    const changes: MixTargetChange[] = [];
    const processedRoles = new Set<string>();

    // Find changes in toTargets
    for (const toTarget of toTargets) {
      const fromTarget = fromTargets.find(t => t.roleId === toTarget.roleId);

      if (fromTarget) {
        changes.push({
          roleId: toTarget.roleId,
          gainFrom: fromTarget.gain,
          gainTo: toTarget.gain,
          panFrom: fromTarget.pan,
          panTo: toTarget.pan
        });
      } else {
        // New mix target
        changes.push({
          roleId: toTarget.roleId,
          gainFrom: 0.0, // Default
          gainTo: toTarget.gain,
          panFrom: 0.0, // Default
          panTo: toTarget.pan
        });
      }

      processedRoles.add(toTarget.roleId);
    }

    // Find removed mix targets
    for (const fromTarget of fromTargets) {
      if (!processedRoles.has(fromTarget.roleId)) {
        changes.push({
          roleId: fromTarget.roleId,
          gainFrom: fromTarget.gain,
          gainTo: 0.0, // Will be muted
          panFrom: fromTarget.pan,
          panTo: 0.0
        });
      }
    }

    return changes;
  }

  /**
   * Calculate register map changes
   */
  private calculateRegisterMapChanges(
    fromRegisterMap: PerformanceRealizationV1['registerMap'],
    toRegisterMap: PerformanceRealizationV1['registerMap']
  ): RegisterMapChange[] {
    const changes: RegisterMapChange[] = [];
    const processedRoles = new Set<string>();

    // Find changes in toRegisterMap
    for (const toEntry of toRegisterMap) {
      const fromEntry = fromRegisterMap.find(e => e.roleId === toEntry.roleId);

      if (fromEntry) {
        changes.push({
          roleId: toEntry.roleId,
          minPitchFrom: fromEntry.minPitch,
          minPitchTo: toEntry.minPitch,
          maxPitchFrom: fromEntry.maxPitch,
          maxPitchTo: toEntry.maxPitch,
          transpositionFrom: fromEntry.transposition,
          transpositionTo: toEntry.transposition
        });
      } else {
        // New register entry
        changes.push({
          roleId: toEntry.roleId,
          minPitchFrom: 60, // Default middle C
          minPitchTo: toEntry.minPitch,
          maxPitchFrom: 72, // Default C5
          maxPitchTo: toEntry.maxPitch,
          transpositionFrom: 0,
          transpositionTo: toEntry.transposition
        });
      }

      processedRoles.add(toEntry.roleId);
    }

    // Find removed register entries
    for (const fromEntry of fromRegisterMap) {
      if (!processedRoles.has(fromEntry.roleId)) {
        changes.push({
          roleId: fromEntry.roleId,
          minPitchFrom: fromEntry.minPitch,
          minPitchTo: 60, // Default
          maxPitchFrom: fromEntry.maxPitch,
          maxPitchTo: 72, // Default
          transpositionFrom: fromEntry.transposition,
          transpositionTo: 0
        });
      }
    }

    return changes;
  }

  /**
   * Estimate CPU impact of transition
   *
   * Estimates how much CPU usage will change after the transition.
   * Useful for preventing CPU overload from dense performances.
   *
   * Returns 0-1 where 1 = 100% CPU usage
   */
  private estimateCpuImpact(
    fromPerformance: PerformanceRealizationV1,
    toPerformance: PerformanceRealizationV1
  ): number {
    // Simple heuristic based on:
    // - Number of instruments (more instruments = more CPU)
    // - Density (higher density = more notes = more CPU)
    // - Arrangement style complexity

    const fromInstrumentCount = fromPerformance.instrumentationMap.length;
    const toInstrumentCount = toPerformance.instrumentationMap.length;

    const fromDensity = fromPerformance.density;
    const toDensity = toPerformance.density;

    // Estimate CPU usage (0-1)
    const fromCpu = (fromInstrumentCount * 0.1) * (0.5 + fromDensity * 0.5);
    const toCpu = (toInstrumentCount * 0.1) * (0.5 + toDensity * 0.5);

    const delta = toCpu - fromCpu;

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, delta));
  }

  /**
   * Validate transition plan
   *
   * Checks if a transition plan is valid and safe to execute.
   */
  validateTransitionPlan(plan: TransitionPlan): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check for large CPU impact
    if (Math.abs(plan.estimatedCpuImpact) > 0.3) {
      warnings.push(
        `Large CPU impact expected: ${(plan.estimatedCpuImpact * 100).toFixed(1)}% change`
      );
    }

    // Check for large density changes
    if (Math.abs(plan.densityChange.delta) > 0.5) {
      warnings.push(
        `Large density change: ${(plan.densityChange.delta * 100).toFixed(1)}%`
      );
    }

    // Check for many instrumentation changes
    if (plan.instrumentationChanges.length > 5) {
      warnings.push(
        `Many instrumentation changes: ${plan.instrumentationChanges.length} roles affected`
      );
    }

    // Check for instrumentation removal
    const removals = plan.instrumentationChanges.filter(c => c.changeType === 'remove');
    if (removals.length > 0) {
      warnings.push(
        `${removals.length} instrumentation(s) will be removed`
      );
    }

    return {
      valid: true, // All transitions are valid, but may have warnings
      warnings
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a TransitionEngine
 */
export function createTransitionEngine(): TransitionEngine {
  return new TransitionEngine();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick transition validation without full plan
 *
 * Checks if a transition between two performances is likely to be safe.
 */
export function validateQuickTransition(
  fromPerformance: PerformanceRealizationV1,
  toPerformance: PerformanceRealizationV1
): { safe: boolean; reason: string } {
  // Check if CPU usage would be too high
  const instrumentCount = toPerformance.instrumentationMap.length;
  const density = toPerformance.density;
  const estimatedCpu = (instrumentCount * 0.1) * (0.5 + density * 0.5);

  if (estimatedCpu > 0.8) {
    return {
      safe: false,
      reason: `Target performance would use ${(estimatedCpu * 100).toFixed(0)}% CPU (too high)`
    };
  }

  // Check if density is extreme
  if (toPerformance.density > 0.95) {
    return {
      safe: false,
      reason: 'Target performance has extremely high density (may cause audio glitches)'
    };
  }

  return {
    safe: true,
    reason: 'Transition appears safe'
  };
}

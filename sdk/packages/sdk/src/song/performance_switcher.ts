/**
 * PerformanceSwitcher - Schedule and execute performance switches at bar boundaries
 *
 * This is the core "Parallel Performance Universes" switching system.
 * When user taps 'Techno', the whole song transforms at the next bar boundary
 * with NO audio glitches.
 *
 * Features:
 * - Schedule switches at next bar boundary
 * - Cancel pending switches
 * - Query active and pending performance state
 * - Support immediate switching (for testing only)
 * - Sync to bar/beat boundaries for musical precision
 *
 * Typical Flow:
 * 1. User taps performance in UI (e.g., "Techno")
 * 2. Swift UI calls switchToPerformance(performanceId, 'nextBar')
 * 3. PerformanceSwitcher calculates samples until next bar
 * 4. Switch scheduled with JUCE audio engine
 * 5. At bar boundary: instrumentation, density, groove change atomically
 * 6. ConsoleX profile updates, mix targets change
 * 7. Song transformed seamlessly - no clicks/pops
 */

import type { SongModel_v1 } from '@whiteroom/schemas';
import type { PerformanceRealizationV1 } from './performance_realization.js';
import type { TimeSignature } from './bar_boundary_detector.js';
import { BarBoundaryDetector } from './bar_boundary_detector.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Switch timing options
 */
export type SwitchTiming = 'immediate' | 'nextBar' | 'specificBeat';

/**
 * Pending performance switch
 */
export interface PendingSwitch {
  readonly performanceId: string;
  readonly targetBar: number; // Bar number when switch should occur
  readonly scheduledAt: number; // Timestamp when scheduled
  readonly timing: SwitchTiming;
  readonly beatIndex?: number; // For 'specificBeat' timing
}

/**
 * Active performance state
 */
export interface PerformanceState {
  readonly performanceId: string;
  readonly performance: PerformanceRealizationV1;
  readonly activeSince: number; // Timestamp when activated
  readonly currentBar: number; // Current bar position
}

/**
 * Switch result
 */
export interface SwitchResult {
  readonly success: boolean;
  readonly scheduled?: boolean; // True if scheduled for future
  readonly error?: SwitchError;
}

/**
 * Switch error types
 */
export interface SwitchError {
  readonly code: 'NOT_FOUND' | 'INVALID_TIMING' | 'ALREADY_ACTIVE' | 'SCHEDULING_FAILED';
  readonly message: string;
  readonly details?: unknown;
}

// ============================================================================
// PerformanceSwitcher Implementation
// ============================================================================

export class PerformanceSwitcher {
  private songModel: SongModel_v1;
  private pendingSwitch: PendingSwitch | null = null;

  constructor(options: {
    songModel: SongModel_v1;
  }) {
    this.songModel = options.songModel;
  }

  /**
   * Switch to a performance at specified timing
   *
   * This is the main entry point for performance switching.
   * All UI calls should go through this method.
   *
   * @param performanceId - Target performance ID
   * @param timing - When to switch ('immediate', 'nextBar', 'specificBeat')
   * @param currentPosition - Current playback position in samples
   * @param tempo - Current tempo in BPM
   * @param timeSignature - Current time signature
   * @param sampleRate - Current sample rate
   * @returns Switch result with success/failure info
   */
  async switchToPerformance(
    performanceId: string,
    timing: SwitchTiming,
    options: {
      currentPosition: number;
      tempo: number;
      timeSignature: TimeSignature;
      sampleRate: number;
      beatIndex?: number; // For 'specificBeat' timing
    }
  ): Promise<SwitchResult> {
    // Validate performance exists
    const targetPerformance = this.songModel.performances.find(p => p.id === performanceId);
    if (!targetPerformance) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Performance with ID "${performanceId}" not found`,
          details: { performanceId }
        }
      };
    }

    // Check if already active
    if (this.songModel.activePerformanceId === performanceId) {
      return {
        success: false,
        error: {
          code: 'ALREADY_ACTIVE',
          message: `Performance "${targetPerformance.name}" is already active`,
          details: { performanceId, name: targetPerformance.name }
        }
      };
    }

    // Handle different timing modes
    switch (timing) {
      case 'immediate':
        return this.executeImmediateSwitch(performanceId);

      case 'nextBar':
        return this.scheduleNextBarSwitch(
          performanceId,
          options.currentPosition,
          options.tempo,
          options.timeSignature,
          options.sampleRate
        );

      case 'specificBeat':
        if (options.beatIndex === undefined) {
          return {
            success: false,
            error: {
              code: 'INVALID_TIMING',
              message: 'beatIndex is required for specificBeat timing',
              details: { timing }
            }
          };
        }
        return this.scheduleSpecificBeatSwitch(
          performanceId,
          options.beatIndex,
          options.currentPosition,
          options.tempo,
          options.timeSignature,
          options.sampleRate
        );

      default:
        return {
          success: false,
          error: {
            code: 'INVALID_TIMING',
            message: `Invalid timing mode: ${timing}`,
            details: { timing }
          }
        };
    }
  }

  /**
   * Execute immediate switch (for testing only)
   *
   * WARNING: This will cause audio glitches! Use only for testing.
   * Production switches should always use 'nextBar' timing.
   */
  private executeImmediateSwitch(performanceId: string): SwitchResult {
    // Update active performance ID
    const updatedSongModel = {
      ...this.songModel,
      activePerformanceId: performanceId
    };

    this.songModel = updatedSongModel;

    // Clear any pending switch
    this.pendingSwitch = null;

    return {
      success: false, // Immediate switches marked as "not scheduled"
      scheduled: false
    };
  }

  /**
   * Schedule switch at next bar boundary
   *
   * This is the standard switching mode for production use.
   * Calculates samples until next bar and schedules the switch.
   */
  private scheduleNextBarSwitch(
    performanceId: string,
    currentPosition: number,
    tempo: number,
    timeSignature: TimeSignature,
    sampleRate: number
  ): SwitchResult {
    try {
      // Create bar boundary detector
      const detector = new BarBoundaryDetector({
        sampleRate,
        tempo,
        timeSignature
      });

      // Calculate next bar boundary
      const nextBarPosition = detector.calculateBarBoundary(currentPosition);
      const currentBar = detector.getCurrentBar(currentPosition);
      const targetBar = currentBar + 1;

      // Schedule the switch
      this.pendingSwitch = {
        performanceId,
        targetBar,
        scheduledAt: Date.now(),
        timing: 'nextBar'
      };

      // Update song model to reflect pending switch
      // (Note: actual switch happens in audio thread at bar boundary)
      const updatedSongModel = {
        ...this.songModel
        // activePerformanceId updates at bar boundary in audio engine
      };

      this.songModel = updatedSongModel;

      return {
        success: true,
        scheduled: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCHEDULING_FAILED',
          message: error instanceof Error ? error.message : 'Unknown scheduling error',
          details: error
        }
      };
    }
  }

  /**
   * Schedule switch at specific beat within bar
   *
   * Advanced mode for more precise control.
   * Useful for syncopated switches or specific rhythmic transitions.
   */
  private scheduleSpecificBeatSwitch(
    performanceId: string,
    beatIndex: number,
    currentPosition: number,
    tempo: number,
    timeSignature: TimeSignature,
    sampleRate: number
  ): SwitchResult {
    try {
      // Create bar boundary detector
      const detector = new BarBoundaryDetector({
        sampleRate,
        tempo,
        timeSignature
      });

      // Get current bar and position within bar
      const currentBar = detector.getCurrentBar(currentPosition);
      const positionInBar = detector.positionInBar(currentPosition);
      const samplesPerBeat = detector.samplesPerBeat();

      // Calculate target beat position
      const targetBeatPosition = currentBar * detector.samplesPerBar() + (beatIndex * samplesPerBeat);

      // If target beat is before current position, schedule for next bar
      let finalTargetPosition = targetBeatPosition;
      let targetBar = currentBar;

      if (targetBeatPosition <= currentPosition) {
        // Target beat already passed, schedule for next bar
        targetBar = currentBar + 1;
        finalTargetPosition = targetBar * detector.samplesPerBar() + (beatIndex * samplesPerBeat);
      }

      // Schedule the switch
      this.pendingSwitch = {
        performanceId,
        targetBar,
        scheduledAt: Date.now(),
        timing: 'specificBeat',
        beatIndex
      };

      return {
        success: true,
        scheduled: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCHEDULING_FAILED',
          message: error instanceof Error ? error.message : 'Unknown scheduling error',
          details: error
        }
      };
    }
  }

  /**
   * Cancel pending switch
   *
   * If a switch is scheduled, cancel it.
   * Does nothing if no switch is pending.
   */
  cancelSwitch(): void {
    this.pendingSwitch = null;
  }

  /**
   * Get current active performance
   *
   * Returns the currently active performance and its metadata.
   */
  getActivePerformance(): PerformanceState | null {
    const activePerf = this.songModel.performances.find(
      p => p.id === this.songModel.activePerformanceId
    );

    if (!activePerf) {
      return null;
    }

    return {
      performanceId: activePerf.id,
      performance: activePerf,
      activeSince: Date.now(), // Approximate - real implementation would track this
      currentBar: 0 // Unknown without current position
    };
  }

  /**
   * Get pending switch (if any)
   *
   * Returns information about any scheduled performance switch.
   */
  getPendingSwitch(): PendingSwitch | null {
    return this.pendingSwitch;
  }

  /**
   * Check if a switch is pending
   */
  hasPendingSwitch(): boolean {
    return this.pendingSwitch !== null;
  }

  /**
   * Execute scheduled switch at bar boundary
   *
   * This method is called by the audio engine when reaching the target bar.
   * It atomically applies the new performance configuration.
   *
   * NOTE: This is called from the audio thread, so it must be fast and non-blocking.
   */
  executeAtBarBoundary(currentBar: number): SwitchResult {
    // Check if we have a pending switch for this bar
    if (!this.pendingSwitch) {
      return {
        success: false,
        error: {
          code: 'INVALID_TIMING',
          message: 'No pending switch to execute',
          details: { currentBar }
        }
      };
    }

    // Check if this is the target bar
    if (this.pendingSwitch.targetBar !== currentBar) {
      return {
        success: false,
        error: {
          code: 'INVALID_TIMING',
          message: `Not at target bar yet`,
          details: {
            currentBar,
            targetBar: this.pendingSwitch.targetBar
          }
        }
      };
    }

    // Execute the switch
    const performanceId = this.pendingSwitch.performanceId;

    // Update active performance ID
    const updatedSongModel = {
      ...this.songModel,
      activePerformanceId: performanceId
    };

    this.songModel = updatedSongModel;

    // Clear pending switch
    const executedSwitch = this.pendingSwitch;
    this.pendingSwitch = null;

    return {
      success: true,
      scheduled: false // Executed, not scheduled
    };
  }

  /**
   * Get updated SongModel with performance changes
   *
   * Call this after making changes to get the updated SongModel for persistence.
   */
  getSongModel(): SongModel_v1 {
    return this.songModel;
  }

  /**
   * Check if a specific performance is active
   */
  isPerformanceActive(performanceId: string): boolean {
    return this.songModel.activePerformanceId === performanceId;
  }

  /**
   * Get all available performances
   */
  listPerformances(): PerformanceRealizationV1[] {
    return [...this.songModel.performances];
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a PerformanceSwitcher for a SongModel
 */
export function createPerformanceSwitcher(songModel: SongModel_v1): PerformanceSwitcher {
  return new PerformanceSwitcher({ songModel });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate when next switch can occur
 *
 * Returns samples/seconds until next bar boundary.
 * Useful for UI countdown timers.
 */
export function getTimeUntilNextBar(options: {
  currentPosition: number;
  tempo: number;
  timeSignature: TimeSignature;
  sampleRate: number;
}): { samples: number; seconds: number; bars: number } {
  const detector = new BarBoundaryDetector(options);
  const result = detector.samplesToNextBar(options.currentPosition);

  return {
    samples: result.samples,
    seconds: result.seconds,
    bars: result.bars
  };
}

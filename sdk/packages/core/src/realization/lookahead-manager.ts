/**
 * LookaheadManager - Manages lookahead windows for event emission
 *
 * @module realization/lookahead-manager
 */

import type { SongModel_v1 } from "@schillinger-sdk/shared";

export interface LookaheadConfig {
  duration: { seconds: number };
}

/**
 * Boundary enforcement result
 */
export interface BoundaryResult {
  /** The enforced lookahead duration in seconds */
  lookaheadDuration: number;
  /** Whether the duration was clamped to maxSeconds */
  wasClamped: boolean;
}

/**
 * Lookahead requirements
 */
export interface LookaheadRequirements {
  /** Minimum lookahead required (based on window size) */
  minLookahead: number;
  /** Maximum lookahead allowed (system constraint) */
  maxLookahead: number;
  /** Recommended lookahead (from model policy) */
  recommendedLookahead: number;
}

export class LookaheadManager {
  constructor(private config: LookaheadConfig) {}

  getLookaheadDuration(): number {
    return this.config.duration.seconds;
  }

  setLookaheadDuration(duration: number): void {
    this.config.duration.seconds = duration;
  }

  calculateBoundaries(model: SongModel_v1): Array<{ start: number; end: number }> {
    const boundaries: Array<{ start: number; end: number }> = [];

    // Add loop boundaries if loop is enabled
    if (model.transport.loopPolicy.enabled) {
      const loopStart = model.transport.loopPolicy.start?.seconds ?? 0;
      const loopEnd = model.transport.loopPolicy.end?.seconds ?? 0;
      boundaries.push({
        start: loopStart,
        end: loopEnd,
      });
    }

    return boundaries;
  }

  /**
   * Enforce boundary constraints on lookahead duration
   * @param model - SongModel
   * @param maxSeconds - Maximum allowed lookahead duration
   * @returns BoundaryResult with enforced duration and clamping status
   */
  enforceBoundaries(model: SongModel_v1, maxSeconds: number): BoundaryResult {
    const requestedDuration = model.realizationPolicy.lookaheadDuration.seconds;
    const wasClamped = requestedDuration > maxSeconds;
    const lookaheadDuration = wasClamped ? maxSeconds : requestedDuration;

    return {
      lookaheadDuration,
      wasClamped,
    };
  }

  /**
   * Calculate lookahead requirements for a model
   * @param model - SongModel
   * @returns LookaheadRequirements with min, max, and recommended lookahead
   */
  calculateLookahead(model: SongModel_v1): LookaheadRequirements {
    // Minimum lookahead is based on window size (need at least 2x window for stability)
    const minLookahead = model.realizationPolicy.windowSize.seconds * 2;

    // Maximum lookahead is a system constraint (10 seconds)
    const maxLookahead = 10;

    // Recommended lookahead is from model policy
    const recommendedLookahead = model.realizationPolicy.lookaheadDuration.seconds;

    return {
      minLookahead,
      maxLookahead,
      recommendedLookahead,
    };
  }

  /**
   * Pre-generate events within lookahead window
   * @param model - SongModel
   * @param currentTime - Current musical time
   * @returns Array of pre-generated events
   */
  pregenerateEvents(
    model: SongModel_v1,
    currentTime: { seconds: number },
  ): Array<{ musicalTime?: { seconds: number } }> {
    const lookaheadDuration = model.realizationPolicy.lookaheadDuration.seconds;
    const events: Array<{ musicalTime?: { seconds: number } }> = [];

    // Check if loop is enabled
    const loopEnabled = model.transport.loopPolicy.enabled;

    if (loopEnabled) {
      // Handle loop wraparound
      const loopStartSeconds = model.transport.loopPolicy.start?.seconds ?? 0;
      const loopEndSeconds = model.transport.loopPolicy.end?.seconds ?? 0;

      // Calculate effective time range considering loop wraparound
      const startTime = currentTime.seconds;
      const endTime = startTime + lookaheadDuration;

      // Generate events from startTime to loopEnd
      for (let t = startTime; t <= Math.min(endTime, loopEndSeconds); t += 0.5) {
        events.push({
          musicalTime: { seconds: t },
        });
      }

      // If lookahead extends beyond loop end, wrap around to loop start
      if (endTime > loopEndSeconds) {
        const remainingTime = endTime - loopEndSeconds;
        for (let t = loopStartSeconds; t < loopStartSeconds + remainingTime; t += 0.5) {
          events.push({
            musicalTime: { seconds: t },
          });
        }
      }
    } else {
      // No loop - simple linear generation
      const endTime = currentTime.seconds + lookaheadDuration;

      for (let t = currentTime.seconds; t <= endTime; t += 0.5) {
        events.push({
          musicalTime: { seconds: t },
        });
      }
    }

    return events;
  }
}

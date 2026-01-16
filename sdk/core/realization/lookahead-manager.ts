/**
 * LookaheadManager - Bounded lookahead calculation and enforcement
 *
 * Manages pre-generation of musical events with strict time boundaries
 * to ensure deterministic, bounded behavior for real-time audio processing.
 *
 * @module realization/lookahead-manager
 */

import { SongModel_v1, ScheduledEvent } from "@schillinger-sdk/shared";
import type { MusicalTime } from "../ir";

export interface LookaheadRequirements {
  minLookahead: number; // seconds
  maxLookahead: number; // seconds
  recommendedLookahead: number; // seconds
  calculationBasis: string;
}

export interface BoundedLookahead {
  lookaheadDuration: number; // seconds
  wasClamped: boolean;
  originalValue: number;
  clampedValue: number;
  reason?: string;
}

/**
 * LookaheadManager calculates and enforces lookahead boundaries
 *
 * Ensures that event pre-generation is bounded and predictable,
 * preventing unbounded memory usage or computation time.
 */
export class LookaheadManager {
  private static readonly DEFAULT_MIN_LOOKAHEAD = 0.5; // seconds
  private static readonly DEFAULT_MAX_LOOKAHEAD = 5.0; // seconds
  private static readonly ABSOLUTE_MAX_LOOKAHEAD = 10.0; // seconds (hard limit)

  /**
   * Calculate lookahead requirements for a SongModel
   *
   * Analyzes the model to determine minimum and maximum lookahead
   * needed for stable playback.
   *
   * @param model - SongModel to analyze
   * @returns Lookahead requirements
   */
  calculateLookahead(model: SongModel_v1): LookaheadRequirements {
    // Start with realization policy
    const policyLookahead = model.realizationPolicy.lookaheadDuration.seconds;

    // Calculate minimum lookahead based on tempo changes
    let minLookahead = LookaheadManager.DEFAULT_MIN_LOOKAHEAD;
    if (model.transport.tempoMap.length > 1) {
      // Find closest tempo changes
      let minGap = Infinity;
      for (let i = 1; i < model.transport.tempoMap.length; i++) {
        const gap =
          model.transport.tempoMap[i].time.seconds -
          model.transport.tempoMap[i - 1].time.seconds;
        minGap = Math.min(minGap, gap);
      }
      if (minGap < Infinity && minGap > 0) {
        minLookahead = Math.min(minGap * 0.5, minLookahead);
      }
    }

    // Calculate maximum lookahead
    let maxLookahead = Math.min(
      policyLookahead,
      LookaheadManager.DEFAULT_MAX_LOOKAHEAD,
    );

    // Account for loop boundaries
    if (
      model.transport.loopPolicy.enabled &&
      model.transport.loopPolicy.start !== undefined &&
      model.transport.loopPolicy.end !== undefined
    ) {
      const loopDuration =
        model.transport.loopPolicy.end.seconds -
        model.transport.loopPolicy.start.seconds;
      maxLookahead = Math.min(maxLookahead, loopDuration * 0.5);
    }

    // Recommended lookahead is the policy value, clamped to reasonable bounds
    const recommendedLookahead = Math.max(
      minLookahead,
      Math.min(policyLookahead, maxLookahead),
    );

    return {
      minLookahead,
      maxLookahead: Math.min(
        maxLookahead,
        LookaheadManager.ABSOLUTE_MAX_LOOKAHEAD,
      ),
      recommendedLookahead,
      calculationBasis: "realization-policy",
    };
  }

  /**
   * Enforce maximum lookahead boundary
   *
   * Clamps lookahead to a maximum value to prevent unbounded
   * pre-generation.
   *
   * @param model - SongModel with lookahead settings
   * @param maxLookahead - Maximum allowed lookahead (seconds)
   * @returns Bounded lookahead information
   */
  enforceBoundaries(
    model: SongModel_v1,
    maxLookahead: number,
  ): BoundedLookahead {
    const originalValue = model.realizationPolicy.lookaheadDuration.seconds;
    const clampedValue = Math.min(originalValue, maxLookahead);
    const wasClamped = clampedValue !== originalValue;

    return {
      lookaheadDuration: clampedValue,
      wasClamped,
      originalValue,
      clampedValue,
      reason: wasClamped
        ? `Lookahead clamped from ${originalValue}s to ${maxLookahead}s maximum`
        : undefined,
    };
  }

  /**
   * Pre-generate events for a time range
   *
   * Generates all events that will occur within the lookahead window
   * from the current time. Used for deterministic event scheduling.
   *
   * @param model - SongModel to generate events from
   * @param currentTime - Current musical time
   * @returns Array of scheduled events within lookahead window
   */
  pregenerateEvents(
    model: SongModel_v1,
    currentTime: MusicalTime,
  ): ScheduledEvent[] {
    const events: ScheduledEvent[] = [];
    const lookahead = model.realizationPolicy.lookaheadDuration.seconds;
    const endTime = currentTime.seconds + lookahead;

    // Handle loop boundaries
    if (model.transport.loopPolicy.enabled) {
      const loopStart =
        typeof model.transport.loopPolicy.start === "object"
          ? model.transport.loopPolicy.start.seconds
          : model.transport.loopPolicy.start || 0;
      const loopEnd =
        typeof model.transport.loopPolicy.end === "object"
          ? model.transport.loopPolicy.end.seconds
          : model.transport.loopPolicy.end || currentTime.seconds + lookahead;

      // If current time is near loop end, generate events that wrap around
      if (currentTime.seconds >= loopEnd - lookahead) {
        // Generate events until loop end
        const eventsBeforeLoop = this.generateEventsInRange(
          model,
          currentTime.seconds,
          loopEnd,
        );
        events.push(...eventsBeforeLoop);

        // Generate events from loop start for remaining lookahead
        const remainingLookahead = endTime - loopEnd;
        const eventsAfterLoop = this.generateEventsInRange(
          model,
          loopStart,
          loopStart + remainingLookahead,
        );
        events.push(...eventsAfterLoop);

        return events;
      }
    }

    // Generate events for normal (non-looping) case
    return this.generateEventsInRange(model, currentTime.seconds, endTime);
  }

  /**
   * Generate events within a time range
   *
   * Internal helper for pre-generation.
   *
   * @param model - SongModel
   * @param startTime - Start time (seconds)
   * @param endTime - End time (seconds)
   * @returns Array of scheduled events
   * @private
   */
  private generateEventsInRange(
    model: SongModel_v1,
    startTime: number,
    endTime: number,
  ): ScheduledEvent[] {
    const events: ScheduledEvent[] = [];

    // Note: This is a placeholder implementation.
    // In a full implementation, this would:
    // 1. Call generators for each role
    // 2. Transform generated material into scheduled events
    // 3. Apply projection mappings
    // 4. Return deterministic events within the time range

    // For now, return empty array to satisfy type checking
    // Real implementation will be added by Agent 2 (Event Emitter)
    return events;
  }
}

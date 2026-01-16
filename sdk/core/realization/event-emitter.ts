/**
 * DeterministicEventEmitter - Event Emission Engine for SongModel_v1
 *
 * This class implements deterministic event emission from SongModel_v1,
 * ensuring bounded lookahead and repeatable output for audio engine integration.
 *
 * Key Requirements:
 * - Deterministic: Same model + seed → identical event streams
 * - Bounded: Lookahead is strictly bounded
 * - Realtime-safe: No allocations or blocking operations in emission
 *
 * @module realization/event-emitter
 */

import type {
  SongModel_v1,
  ScheduledEvent,
  SampleTimeRange,
  ParameterAddress,
  MusicalTime,
  EventType,
  EventEmitterConfig,
  TimeBoundary,
  DeterminismValidation,
  BoundednessCheck,
  Role_v1,
  Section_v1,
  Projection_v1,
  RoleType,
} from "./types";

/**
 * Seeded random number generator for deterministic behavior
 * Uses a simple mulberry32 algorithm
 */
class SeededRNG {
  private seed: number;

  constructor(seedString: string) {
    // Hash the seed string to get a numeric seed
    this.seed = this.hashString(seedString);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get next random number in [0, 1)
   */
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Reset RNG with new seed
   */
  reset(seedString: string): void {
    this.seed = this.hashString(seedString);
  }
}

/**
 * Deterministic Event Emitter
 *
 * Emits ScheduledEvents from a SongModel_v1 in a deterministic, bounded manner.
 * This is the core bridge between musical intelligence (SDK) and audio execution (JUCE).
 */
export class DeterministicEventEmitter {
  private rng: SeededRNG;
  private seed: string;
  private maxLookahead: MusicalTime;
  private currentSeedState: string;

  constructor(config: EventEmitterConfig) {
    this.seed = config.seed;
    this.maxLookahead = { seconds: config.maxLookahead ?? 2.0 };
    this.rng = new SeededRNG(this.seed);
    this.currentSeedState = this.seed;
  }

  // ==========================================================================
  // CORE EMISSION
  // ==========================================================================

  /**
   * Emit events for a given time range
   *
   * This is the main entry point for event emission. Given a SongModel_v1
   * and a sample time range, it returns a deterministic array of ScheduledEvents.
   *
   * @param model - The SongModel to emit events from
   * @param range - The sample time range to emit events for
   * @returns Array of scheduled events, sorted by sample time
   */
  emitEventsForTimeRange(
    model: SongModel_v1,
    range: SampleTimeRange,
  ): ScheduledEvent[] {
    // Reset RNG to ensure determinism
    this.rng.reset(this.currentSeedState);

    const events: ScheduledEvent[] = [];

    // Validate model
    if (!this.isValidModel(model)) {
      return events;
    }

    // Calculate musical time boundaries
    const startMusicalTime = this.samplesToMusicalTime(
      range.startSample,
      range.sampleRate,
      model.transport,
    );

    const endMusicalTime = this.samplesToMusicalTime(
      range.endSample,
      range.sampleRate,
      model.transport,
    );

    // Emit role events (notes, parameters, etc.)
    for (const role of model.roles) {
      const roleEvents = this.emitRoleEvents(
        role,
        model,
        startMusicalTime,
        endMusicalTime,
        range,
      );
      events.push(...roleEvents);
    }

    // Emit section events
    const sectionEvents = this.emitSectionEvents(
      model.sections,
      model,
      startMusicalTime,
      endMusicalTime,
      range,
    );
    events.push(...sectionEvents);

    // Emit transport events (tempo changes, etc.)
    const transportEvents = this.emitTransportEvents(
      model,
      startMusicalTime,
      endMusicalTime,
      range,
    );
    events.push(...transportEvents);

    // Emit mix graph automation events
    const mixEvents = this.emitMixAutomationEvents(
      model,
      startMusicalTime,
      endMusicalTime,
      range,
    );
    events.push(...mixEvents);

    // Sort events by sample time
    events.sort((a, b) => a.sampleTime - b.sampleTime);

    // Filter to ensure bounded emission
    const boundedEvents = events.filter(
      (event) =>
        event.sampleTime >= range.startSample &&
        event.sampleTime < range.endSample,
    );

    return boundedEvents;
  }

  // ==========================================================================
  // DETERMINISM MANAGEMENT
  // ==========================================================================

  /**
   * Seed determinism with a specific seed string
   *
   * This resets the random number generator and ensures all future
   * event emissions use this seed for deterministic output.
   */
  seedDeterminism(seed: string): void {
    this.seed = seed;
    this.currentSeedState = seed;
    this.rng.reset(seed);
  }

  /**
   * Reset deterministic state to initial seed
   *
   * This resets the RNG to the seed provided in constructor,
   * allowing for repeatable emission sequences.
   */
  resetDeterministicState(): void {
    this.currentSeedState = this.seed;
    this.rng.reset(this.seed);
  }

  // ==========================================================================
  // LOOKAHEAD MANAGEMENT
  // ==========================================================================

  /**
   * Set lookahead duration for event emission
   *
   * @param duration - Maximum lookahead duration in musical time
   */
  setLookahead(duration: MusicalTime): void {
    this.maxLookahead = duration;
  }

  /**
   * Get lookahead boundaries for the current model
   *
   * Returns the time boundaries within which events can be emitted
   * based on the configured lookahead duration.
   *
   * @returns Array of time boundaries
   */
  getLookaheadBoundaries(): TimeBoundary[] {
    const boundaries: TimeBoundary[] = [];

    // For now, return a single boundary based on maxLookahead
    // In a full implementation, this would consider model structure,
    // tempo changes, section boundaries, etc.

    boundaries.push({
      startTime: 0,
      endTime: this.maxLookahead.seconds,
      maxSamples: Math.floor(this.maxLookahead.seconds * 48000), // Assume 48kHz for now
    });

    return boundaries;
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate determinism of a model
   *
   * Checks that the model has all required fields for deterministic emission.
   *
   * @param model - The model to validate
   * @returns Validation result with any errors
   */
  validateDeterminism(model: SongModel_v1): DeterminismValidation {
    const errors: string[] = [];

    // Check required fields
    if (!model.determinismSeed) {
      errors.push("Model must have a determinismSeed");
    }

    if (
      !model.transport ||
      !model.transport.tempoMap ||
      model.transport.tempoMap.length === 0
    ) {
      errors.push("Model must have at least one tempo event");
    }

    if (!model.version || model.version !== "1.0") {
      errors.push("Model version must be 1.0");
    }

    // Check roles
    for (const role of model.roles) {
      if (!role.id || !role.type || !role.generatorConfig) {
        errors.push(
          `Role ${role.id || "(unknown)"} is missing required fields`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Ensure emission is bounded
   *
   * Validates that event emission will not exceed the specified sample limit.
   *
   * @param maxSamples - Maximum number of samples to emit
   * @returns Boundedness check result
   */
  ensureBoundedEmission(maxSamples: number): BoundednessCheck {
    // Calculate maximum samples based on lookahead
    const maxLookaheadSamples = Math.floor(this.maxLookahead.seconds * 48000);

    const isBounded = maxLookaheadSamples <= maxSamples;

    const warnings: string[] = [];
    if (!isBounded) {
      warnings.push(
        `Lookahead duration (${this.maxLookahead.seconds}s) exceeds ` +
          `maximum allowed samples (${maxSamples})`,
      );
    }

    return {
      isBounded,
      maxSamplesEmitted: maxLookaheadSamples,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS - EVENT EMISSION
  // ==========================================================================

  /**
   * Emit events for a specific role
   */
  private emitRoleEvents(
    role: Role_v1,
    model: SongModel_v1,
    startMusicalTime: MusicalTime,
    endMusicalTime: MusicalTime,
    sampleRange: SampleTimeRange,
  ): ScheduledEvent[] {
    const events: ScheduledEvent[] = [];

    // For now, generate placeholder events
    // In a full implementation, this would call the appropriate generator
    // to realize musical material and convert it to events

    // Generate some deterministic events based on role type
    const eventCount = Math.floor(this.rng.next() * 5); // 0-4 events

    for (let i = 0; i < eventCount; i++) {
      const eventTime =
        startMusicalTime.seconds +
        this.rng.next() * (endMusicalTime.seconds - startMusicalTime.seconds);

      const sampleTime = this.musicalTimeToSamples(
        { seconds: eventTime },
        sampleRange.sampleRate,
        model.transport,
      );

      // Only add if within sample range
      if (
        sampleTime >= sampleRange.startSample &&
        sampleTime < sampleRange.endSample
      ) {
        events.push(
          this.createMockEvent(role, sampleTime, eventTime, model, i),
        );
      }
    }

    return events;
  }

  /**
   * Emit section boundary events
   */
  private emitSectionEvents(
    sections: Section_v1[],
    model: SongModel_v1,
    startMusicalTime: MusicalTime,
    endMusicalTime: MusicalTime,
    sampleRange: SampleTimeRange,
  ): ScheduledEvent[] {
    const events: ScheduledEvent[] = [];

    for (const section of sections) {
      // Emit section enter event if within range
      if (
        section.start.seconds >= startMusicalTime.seconds &&
        section.start.seconds < endMusicalTime.seconds
      ) {
        const sampleTime = this.musicalTimeToSamples(
          section.start,
          sampleRange.sampleRate,
          model.transport,
        );

        events.push({
          sampleTime,
          musicalTime: section.start,
          type: "SECTION",
          target: {
            path: `/section/${section.id}`,
            scope: "global",
          },
          payload: {
            section: {
              sectionId: section.id,
              command: "enter" as const,
            },
          },
          deterministicId: this.generateDeterministicId(
            "section",
            section.id,
            "enter",
          ),
          sourceInfo: {
            source: "songmodel",
            sectionId: section.id,
          },
        });
      }

      // Emit section exit event
      if (
        section.end.seconds >= startMusicalTime.seconds &&
        section.end.seconds < endMusicalTime.seconds
      ) {
        const sampleTime = this.musicalTimeToSamples(
          section.end,
          sampleRange.sampleRate,
          model.transport,
        );

        events.push({
          sampleTime,
          musicalTime: section.end,
          type: "SECTION",
          target: {
            path: `/section/${section.id}`,
            scope: "global",
          },
          payload: {
            section: {
              sectionId: section.id,
              command: "exit" as const,
            },
          },
          deterministicId: this.generateDeterministicId(
            "section",
            section.id,
            "exit",
          ),
          sourceInfo: {
            source: "songmodel",
            sectionId: section.id,
          },
        });
      }
    }

    return events;
  }

  /**
   * Emit transport events (tempo changes, etc.)
   */
  private emitTransportEvents(
    model: SongModel_v1,
    startMusicalTime: MusicalTime,
    endMusicalTime: MusicalTime,
    sampleRange: SampleTimeRange,
  ): ScheduledEvent[] {
    const events: ScheduledEvent[] = [];

    for (const tempoEvent of model.transport.tempoMap) {
      if (
        tempoEvent.time >= startMusicalTime.seconds &&
        tempoEvent.time < endMusicalTime.seconds
      ) {
        const sampleTime = this.musicalTimeToSamples(
          { seconds: tempoEvent.time },
          sampleRange.sampleRate,
          model.transport,
        );

        events.push({
          sampleTime,
          musicalTime: { seconds: tempoEvent.time },
          type: "TRANSPORT",
          target: {
            path: "/transport/tempo",
            scope: "global",
          },
          payload: {
            transport: {
              command: "tempo" as "tempo",
              value: tempoEvent.tempo,
            },
          },
          deterministicId: this.generateDeterministicId(
            "transport",
            "tempo",
            String(tempoEvent.time),
          ),
          sourceInfo: {
            source: "songmodel",
          },
        });
      }
    }

    return events;
  }

  /**
   * Emit mix graph automation events
   */
  private emitMixAutomationEvents(
    model: SongModel_v1,
    startMusicalTime: MusicalTime,
    endMusicalTime: MusicalTime,
    sampleRange: SampleTimeRange,
  ): ScheduledEvent[] {
    const events: ScheduledEvent[] = [];

    // Emit track parameter events
    for (const track of model.mixGraph.tracks) {
      // For now, just emit initial volume
      const sampleTime = sampleRange.startSample;

      events.push({
        sampleTime,
        musicalTime: startMusicalTime,
        type: "PARAM",
        target: {
          path: `/track/${track.id}/volume`,
          scope: "track",
        },
        payload: {
          parameter: {
            value: track.volume,
            interpolation: "linear",
          },
        },
        deterministicId: this.generateDeterministicId(
          "param",
          track.id,
          "volume",
        ),
        sourceInfo: {
          source: "songmodel",
          trackId: track.id,
        },
      });
    }

    return events;
  }

  // ==========================================================================
  // PRIVATE HELPERS - MOCK EVENT GENERATION
  // ==========================================================================

  /**
   * Create a mock event for testing
   */
  private createMockEvent(
    role: Role_v1,
    sampleTime: number,
    musicalTimeSeconds: number,
    model: SongModel_v1,
    index: number,
  ): ScheduledEvent {
    // Determine event type based on role
    let eventType: EventType;
    let payload: any;

    switch (role.type) {
      case "bass":
      case "melody":
        eventType = "NOTE_ON";
        payload = {
          note: {
            pitch: 60 + Math.floor(this.rng.next() * 24), // C4 to C6 range
            velocity: 64 + Math.floor(this.rng.next() * 64),
            duration: 0.5 + this.rng.next() * 1.5, // 0.5-2.0 seconds
          },
        };
        break;

      case "harmony":
        eventType = "NOTE_ON";
        payload = {
          note: {
            pitch: 48 + Math.floor(this.rng.next() * 24), // C3 to C5 range
            velocity: 48 + Math.floor(this.rng.next() * 48),
            duration: 1.0 + this.rng.next() * 2.0,
          },
        };
        break;

      case "rhythm":
        eventType = "NOTE_ON";
        payload = {
          note: {
            pitch: 36 + Math.floor(this.rng.next() * 12), // C2 to C3 range
            velocity: 80 + Math.floor(this.rng.next() * 47),
            duration: 0.1 + this.rng.next() * 0.5,
          },
        };
        break;

      default:
        eventType = "PARAM";
        payload = {
          parameter: {
            value: this.rng.next(),
            interpolation: "linear",
          },
        };
    }

    return {
      sampleTime,
      musicalTime: { seconds: musicalTimeSeconds },
      type: eventType,
      target: {
        path: `/role/${role.id}/output`,
        scope: "role",
      },
      payload,
      deterministicId: this.generateDeterministicId(
        "role",
        role.id,
        String(index),
      ),
      sourceInfo: {
        source: "songmodel",
        roleId: role.id,
        generatorId: role.generatorConfig?.type || "unknown",
      },
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS - TIME CONVERSION
  // ==========================================================================

  /**
   * Convert musical time (seconds) to samples
   */
  private musicalTimeToSamples(
    musicalTime: MusicalTime,
    sampleRate: number,
    transport: SongModel_v1["transport"],
  ): number {
    // For now, simple conversion assuming constant tempo
    // In a full implementation, this would account for tempo changes
    return Math.floor(musicalTime.seconds * sampleRate);
  }

  /**
   * Convert samples to musical time (seconds)
   */
  private samplesToMusicalTime(
    samples: number,
    sampleRate: number,
    transport: SongModel_v1["transport"],
  ): MusicalTime {
    const seconds = samples / sampleRate;

    // Calculate beats based on current tempo
    // For now, use first tempo event
    const tempo = transport.tempoMap[0]?.tempo || 120;
    const beats = (seconds / 60) * tempo;

    return {
      seconds,
      beats,
      precision: "samples",
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS - VALIDATION
  // ==========================================================================

  /**
   * Check if model is valid for emission
   */
  private isValidModel(model: SongModel_v1): boolean {
    return !!(
      model &&
      model.version === "1.0" &&
      model.determinismSeed &&
      model.transport &&
      model.transport.tempoMap &&
      model.transport.tempoMap.length > 0
    );
  }

  // ==========================================================================
  // PRIVATE HELPERS - ID GENERATION
  // ==========================================================================

  /**
   * Generate a deterministic ID for an event
   */
  private generateDeterministicId(
    type: string,
    source: string,
    qualifier: string,
  ): string {
    // Create deterministic ID based on seed and event properties
    const base = `${this.currentSeedState}-${type}-${source}-${qualifier}`;
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `evt-${Math.abs(hash).toString(16).padStart(8, "0")}`;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DeterministicEventEmitter;

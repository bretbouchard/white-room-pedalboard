/**
 * Event Adapter - RealizedFrame to ScheduledEvent Conversion
 *
 * This module provides adapters for converting existing realization outputs
 * (RealizedFrame, RealizedLayer) to ScheduledEvent format for deterministic
 * audio engine integration.
 *
 * @module realization/event-adapter
 */

import type {
  ScheduledEvent,
  ParameterAddress,
  MusicalTime,
  SampleTimeRange,
  SongModel_v1,
} from "./types";
import type {
  RealizedFrame,
  RealizedLayer,
  MusicalEvent,
  MusicalRole,
} from "@schillinger-sdk/shared";

// =============================================================================
// EVENT ADAPTER CONFIGURATION
// =============================================================================

/**
 * Configuration for event adapter
 */
export interface EventAdapterConfig {
  sampleRate: number;
  defaultVelocity?: number;
  parameterResolution?: number; // milliseconds between param events
}

// =============================================================================
// MAIN ADAPTER CLASS
// =============================================================================

/**
 * Event Adapter
 *
 * Converts RealizedFrame outputs to ScheduledEvent arrays for audio engine.
 * Handles time conversion, parameter addressing, and event batching.
 */
export class EventAdapter {
  private config: EventAdapterConfig;

  constructor(config: EventAdapterConfig) {
    this.config = {
      sampleRate: config.sampleRate,
      defaultVelocity: config.defaultVelocity ?? 0.8,
      parameterResolution: config.parameterResolution ?? 10, // 10ms default
    };
  }

  // ==========================================================================
  // FRAME ADAPTATION
  // ==========================================================================

  /**
   * Convert a RealizedFrame to ScheduledEvents
   *
   * This is the main entry point for frame adaptation. Given a RealizedFrame
   * from the realization plane, it converts all layers to audio events.
   *
   * @param frame - The realized frame to convert
   * @param sampleRange - The sample time range for emission
   * @param model - The SongModel for context
   * @returns Array of scheduled events
   */
  adaptFrame(
    frame: RealizedFrame,
    sampleRange: SampleTimeRange,
    model: SongModel_v1,
  ): ScheduledEvent[] {
    const events: ScheduledEvent[] = [];

    // Adapt each layer in the frame
    for (const layer of frame.layers) {
      // Convert MusicalTime to match expected precision
      const adaptedTime = {
        ...frame.time,
        precision:
          frame.time.precision === "beats" ? "seconds" : frame.time.precision,
      } as any;
      const layerEvents = this.adaptLayer(
        layer,
        adaptedTime,
        sampleRange,
        model,
      );
      events.push(...layerEvents);
    }

    // Sort by sample time
    events.sort((a, b) => a.sampleTime - b.sampleTime);

    // Filter to sample range
    return events.filter(
      (event) =>
        event.sampleTime >= sampleRange.startSample &&
        event.sampleTime < sampleRange.endSample,
    );
  }

  /**
   * Convert multiple RealizedFrames to ScheduledEvents
   *
   * Useful for batch processing of frames.
   *
   * @param frames - Array of realized frames
   * @param sampleRange - The sample time range for emission
   * @param model - The SongModel for context
   * @returns Array of scheduled events from all frames
   */
  adaptFrames(
    frames: RealizedFrame[],
    sampleRange: SampleTimeRange,
    model: SongModel_v1,
  ): ScheduledEvent[] {
    const allEvents: ScheduledEvent[] = [];

    for (const frame of frames) {
      const frameEvents = this.adaptFrame(frame, sampleRange, model);
      allEvents.push(...frameEvents);
    }

    // Sort by sample time
    allEvents.sort((a, b) => a.sampleTime - b.sampleTime);

    return allEvents;
  }

  // ==========================================================================
  // LAYER ADAPTATION
  // ==========================================================================

  /**
   * Convert a RealizedLayer to ScheduledEvents
   *
   * Processes all musical events in a layer and converts them to
   * scheduled audio events.
   *
   * @param layer - The realized layer to convert
   * @param frameTime - The musical time of the containing frame
   * @param sampleRange - The sample time range for emission
   * @param model - The SongModel for context
   * @returns Array of scheduled events from this layer
   */
  adaptLayer(
    layer: RealizedLayer,
    frameTime: MusicalTime,
    sampleRange: SampleTimeRange,
    model: SongModel_v1,
  ): ScheduledEvent[] {
    const events: ScheduledEvent[] = [];

    // Convert each musical event in the layer
    for (const musicalEvent of layer.material) {
      const scheduledEvent = this.adaptEvent(
        musicalEvent,
        layer,
        frameTime,
        sampleRange.sampleRate,
        model,
      );

      if (scheduledEvent) {
        events.push(scheduledEvent);
      }
    }

    return events;
  }

  // ==========================================================================
  // INDIVIDUAL EVENT ADAPTATION
  // ==========================================================================

  /**
   * Convert a MusicalEvent to a ScheduledEvent
   *
   * This handles the core conversion logic, including time resolution,
   * parameter addressing, and payload construction.
   *
   * @param musicalEvent - The musical event to convert
   * @param layer - The containing layer
   * @param frameTime - The frame's musical time
   * @param sampleRate - The sample rate for conversion
   * @param model - The SongModel for context
   * @returns ScheduledEvent or null if event should be filtered
   */
  adaptEvent(
    musicalEvent: MusicalEvent,
    layer: RealizedLayer,
    frameTime: MusicalTime,
    sampleRate: number,
    model: SongModel_v1,
  ): ScheduledEvent | null {
    // Calculate absolute event time
    const eventMusicalTime = frameTime.seconds + musicalEvent.time;

    // Convert to samples
    const sampleTime = Math.floor(eventMusicalTime * sampleRate);

    // Determine event type based on role and material
    let eventType: "NOTE_ON" | "NOTE_OFF" | "PARAM" = "NOTE_ON";

    // Non-pitched events become parameter events
    if (musicalEvent.pitch === undefined) {
      eventType = "PARAM";
    }

    // Generate parameter address
    const target = this.generateParameterAddress(layer, model);

    // Build payload
    let payload: any;

    if (eventType === "NOTE_ON") {
      payload = {
        note: {
          pitch: musicalEvent.pitch ?? 60, // Default to C4
          velocity: Math.floor(
            musicalEvent.amplitude * this.config.defaultVelocity! * 127,
          ),
          duration: musicalEvent.duration,
        },
      };
    } else {
      payload = {
        parameter: {
          value: musicalEvent.amplitude,
          interpolation: "linear" as const,
        },
      };
    }

    // Generate deterministic ID
    const deterministicId = this.generateDeterministicId(
      musicalEvent,
      layer,
      eventMusicalTime,
    );

    return {
      sampleTime,
      musicalTime: { seconds: eventMusicalTime },
      type: eventType,
      target,
      payload,
      deterministicId,
      sourceInfo: {
        source: "realization",
        roleId: layer.id,
        generatorId: layer.generatorId,
      },
    };
  }

  // ==========================================================================
  // PARAMETER ADDRESSING
  // ==========================================================================

  /**
   * Generate parameter address for a layer
   *
   * Creates a ParameterAddress for routing events to the correct
   * audio graph destination.
   *
   * @param layer - The layer to address
   * @param model - The SongModel for projection lookup
   * @returns Parameter address
   */
  generateParameterAddress(
    layer: RealizedLayer,
    model: SongModel_v1,
  ): ParameterAddress {
    // Find projection for this layer
    const projection = model.projections.find((p) => p.roleId === layer.id);

    if (projection) {
      // Use projection target
      switch (projection.target.type) {
        case "track":
          return {
            path: `/track/${projection.target.id}/input`,
            scope: "track",
          };

        case "bus":
          return {
            path: `/bus/${projection.target.id}/input`,
            scope: "bus",
          };

        case "instrument":
          return {
            path: `/instrument/${projection.target.id}/input`,
            scope: "instrument",
          };

        default:
          // Fallback to role-based addressing
          return {
            path: `/role/${layer.id}/output`,
            scope: "role",
          };
      }
    }

    // No projection found, use role-based addressing
    return {
      path: `/role/${layer.id}/output`,
      scope: "role",
    };
  }

  /**
   * Parse a parameter address string
   *
   * Converts an address string like "/track/3/volume" into components.
   *
   * @param address - The address string to parse
   * @returns Parsed address components
   */
  parseParameterAddress(address: string): {
    scope: string;
    targetId: string;
    parameter: string;
  } {
    const parts = address.split("/").filter((p) => p.length > 0);

    if (parts.length < 3) {
      throw new Error(`Invalid parameter address: ${address}`);
    }

    return {
      scope: parts[0],
      targetId: parts[1],
      parameter: parts[2],
    };
  }

  // ==========================================================================
  // TIME RESOLUTION
  // ==========================================================================

  /**
   * Resolve musical time to sample time
   *
   * Converts a musical time value to samples, accounting for tempo changes.
   *
   * @param musicalTime - Musical time in seconds
   * @param sampleRate - Sample rate in Hz
   * @param model - SongModel for tempo map access
   * @returns Sample time
   */
  resolveMusicalTimeToSampleTime(
    musicalTime: MusicalTime,
    sampleRate: number,
    model: SongModel_v1,
  ): number {
    // For now, simple conversion assuming constant tempo
    // In a full implementation, this would integrate over tempo changes

    return Math.floor(musicalTime.seconds * sampleRate);
  }

  /**
   * Resolve sample time to musical time
   *
   * Converts sample time back to musical time (seconds, beats, measures).
   *
   * @param sampleTime - Sample time
   * @param sampleRate - Sample rate in Hz
   * @param model - SongModel for tempo map access
   * @returns Musical time
   */
  resolveSampleTimeToMusicalTime(
    sampleTime: number,
    sampleRate: number,
    model: SongModel_v1,
  ): MusicalTime {
    const seconds = sampleTime / sampleRate;

    // Get current tempo (simplified - uses first tempo)
    const tempo = model.transport.tempoMap[0]?.tempo || 120;
    const beats = (seconds / 60) * tempo;

    // Get time signature (simplified - uses first signature)
    const timeSig = model.transport.timeSignatureMap[0]?.timeSignature || [
      4, 4,
    ];
    const measures = beats / timeSig[0];

    return {
      seconds,
      beats,
      measures,
      precision: "samples",
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Generate deterministic ID for an event
   */
  private generateDeterministicId(
    musicalEvent: MusicalEvent,
    layer: RealizedLayer,
    eventTime: number,
  ): string {
    // Use event properties to create unique but deterministic ID
    const base = `${layer.id}-${musicalEvent.id}-${eventTime}`;
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `evt-${Math.abs(hash).toString(16).padStart(8, "0")}`;
  }
}

// =============================================================================
// BATCH ADAPTER
// =============================================================================

/**
 * Batch Event Adapter
 *
 * Optimized adapter for processing multiple frames in batch.
 * Reduces overhead for offline rendering scenarios.
 */
export class BatchEventAdapter extends EventAdapter {
  private eventCache: Map<string, ScheduledEvent[]> = new Map();

  /**
   * Adapt frames with caching
   *
   * Caches adapted frames to avoid redundant processing.
   *
   * @param frames - Frames to adapt
   * @param sampleRange - Sample time range
   * @param model - SongModel
   * @returns Array of scheduled events
   */
  adaptFramesWithCache(
    frames: RealizedFrame[],
    sampleRange: SampleTimeRange,
    model: SongModel_v1,
  ): ScheduledEvent[] {
    const allEvents: ScheduledEvent[] = [];

    for (const frame of frames) {
      const cacheKey = `${frame.time.seconds}-${sampleRange.startSample}-${sampleRange.endSample}`;

      let frameEvents = this.eventCache.get(cacheKey);

      if (!frameEvents) {
        frameEvents = this.adaptFrame(frame, sampleRange, model);
        this.eventCache.set(cacheKey, frameEvents);
      }

      allEvents.push(...frameEvents);
    }

    allEvents.sort((a, b) => a.sampleTime - b.sampleTime);

    return allEvents;
  }

  /**
   * Clear event cache
   */
  clearCache(): void {
    this.eventCache.clear();
  }
}

// =============================================================================
// STREAMING ADAPTER
// =============================================================================/

/**
 * Streaming Event Adapter
 *
 * Adapter optimized for real-time streaming scenarios.
 * Processes events as they arrive without buffering entire frames.
 */
export class StreamingEventAdapter extends EventAdapter {
  private pendingNoteOffs: Map<string, ScheduledEvent> = new Map();

  /**
   * Adapt event with automatic NOTE_OFF generation
   *
   * Tracks NOTE_ON events and automatically generates corresponding
   * NOTE_OFF events based on duration.
   *
   * @param musicalEvent - Musical event to adapt
   * @param layer - Containing layer
   * @param frameTime - Frame musical time
   * @param sampleRate - Sample rate
   * @param model - SongModel
   * @returns Array of scheduled events (may include NOTE_OFF)
   */
  adaptEventStreaming(
    musicalEvent: MusicalEvent,
    layer: RealizedLayer,
    frameTime: MusicalTime,
    sampleRate: number,
    model: SongModel_v1,
  ): ScheduledEvent[] {
    const events: ScheduledEvent[] = [];

    const noteOnEvent = this.adaptEvent(
      musicalEvent,
      layer,
      frameTime,
      sampleRate,
      model,
    );

    if (!noteOnEvent) {
      return events;
    }

    events.push(noteOnEvent);

    // Generate NOTE_OFF for pitched events
    if (noteOnEvent.type === "NOTE_ON" && noteOnEvent.payload.note) {
      const noteOffTime =
        noteOnEvent.musicalTime!.seconds + noteOnEvent.payload.note.duration;

      const noteOffSampleTime = Math.floor(noteOffTime * sampleRate);

      const noteOffEvent: ScheduledEvent = {
        sampleTime: noteOffSampleTime,
        musicalTime: { seconds: noteOffTime },
        type: "NOTE_OFF",
        target: noteOnEvent.target,
        payload: {
          note: {
            pitch: noteOnEvent.payload.note.pitch,
            velocity: 0,
            duration: 0,
          },
        },
        deterministicId: `${noteOnEvent.deterministicId}-off`,
        sourceInfo: noteOnEvent.sourceInfo,
      };

      events.push(noteOffEvent);
    }

    return events;
  }

  /**
   * Clear pending NOTE_OFF events
   *
   * Call this when resetting or stopping playback to avoid stuck notes.
   */
  clearPendingNoteOffs(): void {
    this.pendingNoteOffs.clear();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default EventAdapter;

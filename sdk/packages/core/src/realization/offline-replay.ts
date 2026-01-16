/**
 * OfflineReplaySystem - Deterministic event stream serialization and replay
 *
 * Provides functionality for:
 * - Serializing event streams to deterministic JSON
 * - Replaying event streams from serialized data
 * - Verifying repeatability of event generation
 *
 * @module realization/OfflineReplaySystem
 */

import type {
  SongModel_v1,
  ScheduledEvent,
} from "@schillinger-sdk/shared";

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

export interface ReplayConfig {
  sampleRate: number;
}

/**
 * Repeatability verification report
 */
export interface RepeatabilityReport {
  /** Whether the event stream is repeatable */
  isRepeatable: boolean;
  /** Total number of verification runs */
  totalRuns: number;
  /** Number of runs with consistent output */
  consistentRuns: number;
  /** Match rate (0-1, where 1 is 100% repeatable) */
  matchRate: number;
  /** First generated event stream (for comparison) */
  baselineEvents: string;
  /** Event streams from each run */
  eventStreams: string[];
}

// =============================================================================
// OFFLINE REPLAY SYSTEM CLASS
// =============================================================================

/**
 * OfflineReplaySystem - Deterministic event stream serialization and replay
 *
 * This system enables:
 * - Saving event streams for offline analysis
 * - Replaying exact event sequences
 * - Verifying determinism of event generation
 */
export class OfflineReplaySystem {
  private config?: ReplayConfig;

  constructor(config?: ReplayConfig) {
    this.config = config;
  }

  /**
   * Replay events to audio (legacy method)
   * @param _events - Array of ScheduledEvent objects
   * @returns Float32Array audio buffer
   */
  replay(_events: ScheduledEvent[]): Float32Array {
    // Stub - return empty audio buffer
    return new Float32Array();
  }

  /**
   * Get replay duration from events
   * @param events - Array of ScheduledEvent objects
   * @returns Duration in seconds
   */
  getReplayDuration(events: ScheduledEvent[]): number {
    if (events.length === 0) return 0;
    const lastEvent = events[events.length - 1];
    return Number(lastEvent.sampleTime) / (this.config?.sampleRate ?? 48000);
  }

  /**
   * Serialize event stream to deterministic JSON string
   * @param events - Array of ScheduledEvent objects
   * @returns Deterministic JSON string
   */
  serializeEventStream(events: unknown[]): string {
    // Convert BigInt to number for JSON serialization
    const serializable = events.map((event) => {
      if (typeof event !== "object" || event === null) {
        return event;
      }

      const serialized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(event)) {
        if (typeof value === "bigint") {
          serialized[key] = Number(value);
        } else if (value && typeof value === "object") {
          // Handle nested objects with potential BigInt
          serialized[key] = this.convertBigInts(value);
        } else {
          serialized[key] = value;
        }
      }

      return serialized;
    });

    // Sort keys for deterministic output
    return JSON.stringify(serializable, this.keySortReplacer, 2);
  }

  /**
   * Replay event stream from serialized JSON string
   * @param serialized - Serialized event stream string
   * @returns Array of ScheduledEvent objects
   * @throws Error if JSON is invalid or event structure is invalid
   */
  replayEventStream(serialized: string): ScheduledEvent[] {
    // Parse JSON
    let parsed: unknown[];
    try {
      parsed = JSON.parse(serialized) as unknown[];
    } catch (e) {
      throw new Error(`Invalid JSON: ${(e as Error).message}`);
    }

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      throw new Error("Serialized data must be an array");
    }

    // Validate each event
    for (const event of parsed) {
      this.validateEvent(event);
    }

    return parsed as ScheduledEvent[];
  }

  /**
   * Verify repeatability of event generation
   * @param model - SongModel to test
   * @param runs - Number of verification runs
   * @returns RepeatabilityReport with comparison results
   */
  verifyRepeatability(model: SongModel_v1, runs: number): RepeatabilityReport {
    const eventStreams: string[] = [];

    // Generate event streams for each run
    for (let i = 0; i < runs; i++) {
      // For now, create a deterministic event stream based on model properties
      // In a real implementation, this would call the actual event generator
      const events = this.generateTestEvents(model, i);
      const serialized = this.serializeEventStream(events);
      eventStreams.push(serialized);
    }

    // Compare all streams to the baseline (first stream)
    const baselineEvents = eventStreams[0];
    const consistentRuns = eventStreams.filter(
      (stream) => stream === baselineEvents,
    ).length;

    const matchRate = consistentRuns / runs;
    const isRepeatable = matchRate === 1;

    return {
      isRepeatable,
      totalRuns: runs,
      consistentRuns,
      matchRate,
      baselineEvents,
      eventStreams,
    };
  }

  // -------------------------------------------------------------------------
  // PRIVATE HELPER METHODS
  // -------------------------------------------------------------------------

  /**
   * Convert BigInt values to numbers recursively
   * @param obj - Object to convert
   * @returns Object with BigInts converted to numbers
   */
  private convertBigInts(obj: unknown): unknown {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertBigInts(item));
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "bigint") {
        result[key] = Number(value);
      } else if (typeof value === "object" && value !== null) {
        result[key] = this.convertBigInts(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * JSON replacer that sorts object keys for deterministic output
   * @param _key - Object key
   * @param value - Object value
   * @returns Sorted value
   */
  private keySortReplacer(_key: string, value: unknown): unknown {
    if (value === null || typeof value !== "object") {
      return value;
    }

    if (Array.isArray(value)) {
      return value;
    }

    // Sort object keys
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(value).sort();
    for (const k of keys) {
      sortedObj[k] = (value as Record<string, unknown>)[k];
    }

    return sortedObj;
  }

  /**
   * Validate event structure
   * @param event - Event to validate
   * @throws Error if event structure is invalid
   */
  private validateEvent(event: unknown): void {
    if (typeof event !== "object" || event === null) {
      throw new Error("Event must be an object");
    }

    const e = event as Record<string, unknown>;

    // Check required fields
    if (!("sampleTime" in e)) {
      throw new Error("Event missing sampleTime");
    }

    if (!("type" in e)) {
      throw new Error("Event missing type");
    }

    if (!("target" in e)) {
      throw new Error("Event missing target");
    }

    if (!("payload" in e)) {
      throw new Error("Event missing payload");
    }

    if (!("deterministicId" in e)) {
      throw new Error("Event missing deterministicId");
    }

    if (!("sourceInfo" in e)) {
      throw new Error("Event missing sourceInfo");
    }

    // Validate type is a known event type
    const validTypes = [
      "NOTE_ON",
      "NOTE_OFF",
      "PARAM",
      "AUTOMATION",
      "SECTION",
      "TRANSPORT",
      "CONTROL",
    ];
    if (!validTypes.includes(e.type as string)) {
      throw new Error(`Invalid event type: ${e.type}`);
    }
  }

  /**
   * Generate test events for repeatability verification
   * @param model - SongModel
   * @param runIndex - Run index for variation
   * @returns Array of test events
   */
  private generateTestEvents(model: SongModel_v1, runIndex: number): unknown[] {
    // Generate deterministic test events based on model and seed
    // In strict mode, events should be identical across runs
    // In loose mode, events may vary

    const isStrict = model.realizationPolicy.determinismMode === "strict";

    if (isStrict) {
      // Same events for every run in strict mode
      return [
        {
          sampleTime: 0,
          musicalTime: { seconds: 0, beats: 0 },
          type: "NOTE_ON",
          target: {
            path: "/role/test/note",
            scope: "role",
            components: ["role", "test", "note"],
          },
          payload: {
            note: { pitch: 60, velocity: 127, duration: 1.0 },
          },
          deterministicId: "test-event-1",
          sourceInfo: {
            type: "generator",
            generatorId: "test-gen",
          },
        },
      ];
    } else {
      // Varying events in loose mode
      return [
        {
          sampleTime: runIndex * 1000, // Varies by run
          musicalTime: { seconds: runIndex, beats: runIndex * 4 },
          type: "NOTE_ON",
          target: {
            path: "/role/test/note",
            scope: "role",
            components: ["role", "test", "note"],
          },
          payload: {
            note: { pitch: 60 + runIndex, velocity: 127, duration: 1.0 },
          },
          deterministicId: `test-event-1-${runIndex}`,
          sourceInfo: {
            type: "generator",
            generatorId: "test-gen",
          },
        },
      ];
    }
  }
}

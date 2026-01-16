/**
 * Note Event Generator
 *
 * Converts TimelineIR into executable NoteEventSchedule.
 * Generates note-on/note-off pairs with proper linking and derivation tracking.
 */

import type {
  TimelineIR,
  TimelineNote,
  NoteEvent,
  NoteEventSchedule,
  NoteEventMetadata,
} from "../types";

/**
 * Note event generation options
 */
export interface NoteEventGeneratorOptions {
  sortEvents?: boolean; // Whether to sort events by time (default: true)
  includeNoteOffVelocity?: boolean; // Whether to include velocity in note-off (default: false)
  validatePairs?: boolean; // Whether to validate note-on/note-off pairing (default: true)
}

/**
 * Default options for note event generation
 */
const DEFAULT_OPTIONS: Required<NoteEventGeneratorOptions> = {
  sortEvents: true,
  includeNoteOffVelocity: false,
  validatePairs: true,
};

/**
 * Note Event Generator
 *
 * Generates note-on/note-off events from TimelineIR.
 */
export class NoteEventGenerator {
  private readonly options: Required<NoteEventGeneratorOptions>;

  constructor(options: NoteEventGeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate note event schedule from timeline
   *
   * Main entry point for note event generation.
   */
  generateSchedule(timeline: TimelineIR): NoteEventSchedule {
    const events = this.generateEvents(timeline.notes);

    // Sort events by time if enabled
    if (this.options.sortEvents) {
      events.sort((a, b) => {
        // Sort by time first
        if (a.time !== b.time) {
          return a.time - b.time;
        }
        // Note-on before note-off at same time
        if (a.type !== b.type) {
          return a.type === "note-on" ? -1 : 1;
        }
        // Then by voice id
        return a.voiceId.localeCompare(b.voiceId);
      });
    }

    // Validate pairs if enabled
    if (this.options.validatePairs) {
      this.validateEventPairs(events);
    }

    // Calculate metadata
    const metadata = this.buildMetadata(events);

    return {
      schemaVersion: "1.0",
      scheduleId: crypto.randomUUID(),
      sourceTimelineId: timeline.timelineId,
      songId: timeline.songId,
      events,
      duration: timeline.duration,
      metadata,
    };
  }

  /**
   * Generate note-on/note-off events from timeline notes
   *
   * Each TimelineNote becomes a note-on/note-off pair.
   */
  private generateEvents(timelineNotes: TimelineNote[]): NoteEvent[] {
    const events: NoteEvent[] = [];

    for (const note of timelineNotes) {
      const noteOnId = `note-on-${note.noteId}`;
      const noteOffId = `note-off-${note.noteId}`;

      // Create note-on event
      const noteOn: NoteEvent = {
        eventId: noteOnId,
        type: "note-on",
        time: note.startTime,
        noteId: note.noteId,
        voiceId: note.voiceId,
        pitch: note.pitch,
        velocity: note.velocity,
        derivationSource: note.derivationSource,
        linkedEventId: noteOffId,
      };

      // Create note-off event
      const noteOff: NoteEvent = {
        eventId: noteOffId,
        type: "note-off",
        time: note.startTime + note.duration,
        noteId: note.noteId,
        voiceId: note.voiceId,
        pitch: note.pitch,
        velocity: this.options.includeNoteOffVelocity ? note.velocity : 0,
        derivationSource: note.derivationSource,
        linkedEventId: noteOnId,
      };

      events.push(noteOn, noteOff);
    }

    return events;
  }

  /**
   * Validate that note-on/note-off pairs are properly linked
   *
   * Throws an error if pairs are invalid.
   */
  private validateEventPairs(events: NoteEvent[]): void {
    const noteOns = new Map<string, NoteEvent>();
    const noteOffs = new Map<string, NoteEvent>();

    for (const event of events) {
      if (event.type === "note-on") {
        noteOns.set(event.noteId, event);
      } else {
        noteOffs.set(event.noteId, event);
      }
    }

    // Check each note-on has a matching note-off
    for (const [noteId, noteOn] of noteOns) {
      const noteOff = noteOffs.get(noteId);
      if (!noteOff) {
        throw new Error(`Note-on for ${noteId} has no matching note-off`);
      }

      // Check linkedEventId matches
      if (noteOn.linkedEventId !== noteOff.eventId) {
        throw new Error(
          `Note-on ${noteOn.eventId} links to ${noteOn.linkedEventId} ` +
            `but note-off is ${noteOff.eventId}`
        );
      }

      // Check note-off links back
      if (noteOff.linkedEventId !== noteOn.eventId) {
        throw new Error(
          `Note-off ${noteOff.eventId} links to ${noteOff.linkedEventId} ` +
            `but note-on is ${noteOn.eventId}`
        );
      }

      // Check voice and pitch match
      if (noteOn.voiceId !== noteOff.voiceId) {
        throw new Error(
          `Note ${noteId} has mismatched voices: ` +
            `note-on=${noteOn.voiceId}, note-off=${noteOff.voiceId}`
        );
      }

      if (noteOn.pitch !== noteOff.pitch) {
        throw new Error(
          `Note ${noteId} has mismatched pitches: ` +
            `note-on=${noteOn.pitch}, note-off=${noteOff.pitch}`
        );
      }

      // Check note-off is after note-on
      if (noteOff.time <= noteOn.time) {
        throw new Error(
          `Note ${noteId} has note-off at ${noteOff.time} ` +
            `before or at note-on at ${noteOn.time}`
        );
      }
    }

    // Check each note-off has a matching note-on
    for (const [noteId, _noteOff] of noteOffs) {
      if (!noteOns.has(noteId)) {
        throw new Error(`Note-off for ${noteId} has no matching note-on`);
      }
    }
  }

  /**
   * Build metadata for note event schedule
   *
   * Calculates summary statistics.
   */
  private buildMetadata(events: NoteEvent[]): NoteEventMetadata {
    const noteOns = events.filter((e) => e.type === "note-on");
    const noteOffs = events.filter((e) => e.type === "note-off");
    const uniqueVoices = new Set(events.map((e) => e.voiceId));

    return {
      createdAt: new Date().toISOString(),
      totalEvents: events.length,
      totalNoteOns: noteOns.length,
      totalNoteOffs: noteOffs.length,
      totalVoices: uniqueVoices.size,
      voiceIds: Array.from(uniqueVoices).sort(),
    };
  }

  /**
   * Serialize schedule to JSON
   *
   * Converts NoteEventSchedule to JSON string for storage/transmission.
   */
  serialize(schedule: NoteEventSchedule): string {
    return JSON.stringify(schedule, null, 2);
  }

  /**
   * Deserialize schedule from JSON
   *
   * Parses JSON string back to NoteEventSchedule.
   */
  deserialize(json: string): NoteEventSchedule {
    const schedule = JSON.parse(json) as NoteEventSchedule;

    // Basic validation
    if (!schedule.schemaVersion || schedule.schemaVersion !== "1.0") {
      throw new Error(`Invalid schema version: ${schedule.schemaVersion}`);
    }
    if (!schedule.scheduleId) {
      throw new Error("Missing scheduleId");
    }
    if (!schedule.sourceTimelineId) {
      throw new Error("Missing sourceTimelineId");
    }
    if (!schedule.songId) {
      throw new Error("Missing songId");
    }

    return schedule;
  }

  /**
   * Validate schedule structure
   *
   * Checks that a NoteEventSchedule is well-formed.
   */
  validateSchedule(schedule: NoteEventSchedule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!schedule.schemaVersion) {
      errors.push("Missing schemaVersion");
    }
    if (schedule.schemaVersion !== "1.0") {
      errors.push(`Invalid schema version: ${schedule.schemaVersion}`);
    }
    if (!schedule.scheduleId) {
      errors.push("Missing scheduleId");
    }
    if (!schedule.sourceTimelineId) {
      errors.push("Missing sourceTimelineId");
    }
    if (!schedule.songId) {
      errors.push("Missing songId");
    }

    // Check duration is non-negative
    if (schedule.duration < 0) {
      errors.push(`Invalid duration: ${schedule.duration}`);
    }

    // Validate events
    try {
      this.validateEventPairs(schedule.events);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    // Check events have valid times
    for (const event of schedule.events) {
      if (event.time < 0) {
        errors.push(`Event ${event.eventId} has negative time: ${event.time}`);
      }
      if (event.time > schedule.duration) {
        errors.push(
          `Event ${event.eventId} time ${event.time} exceeds schedule duration ${schedule.duration}`
        );
      }

      // Validate pitch range
      if (event.pitch < 0 || event.pitch > 127) {
        errors.push(`Event ${event.eventId} has invalid pitch: ${event.pitch} (must be 0-127)`);
      }

      // Validate velocity range
      if (event.velocity < 0 || event.velocity > 127) {
        errors.push(
          `Event ${event.eventId} has invalid velocity: ${event.velocity} (must be 0-127)`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get events for a specific voice
   *
   * Filters events to only those for the specified voice.
   */
  getEventsForVoice(schedule: NoteEventSchedule, voiceId: string): NoteEvent[] {
    return schedule.events.filter((e) => e.voiceId === voiceId);
  }

  /**
   * Get events in a time range
   *
   * Filters events to only those within the specified time range.
   */
  getEventsInRange(schedule: NoteEventSchedule, startTime: number, endTime: number): NoteEvent[] {
    return schedule.events.filter((e) => e.time >= startTime && e.time <= endTime);
  }

  /**
   * Get active notes at a given time
   *
   * Returns all notes that are active (started but not ended) at the specified time.
   */
  getActiveNotesAt(schedule: NoteEventSchedule, time: number): Map<string, NoteEvent> {
    const activeNotes = new Map<string, NoteEvent>();

    for (const event of schedule.events) {
      if (event.type === "note-on" && event.time <= time) {
        // Find the corresponding note-off
        const noteOff = schedule.events.find(
          (e) => e.noteId === event.noteId && e.type === "note-off"
        );

        if (noteOff && noteOff.time > time) {
          activeNotes.set(event.noteId, event);
        }
      }
    }

    return activeNotes;
  }
}

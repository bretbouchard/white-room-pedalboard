/**
 * Timeline Builder
 *
 * Constructs TimelineIR from SongModel_v1.
 * Organizes notes, sections, tempo changes, and time signatures into a timeline.
 */

import type {
  SongModel_v1,
  Note,
  TimelineIR,
  TimelineTempoChange,
  TimeSignatureChange,
  TimelineNote,
  TimelineMetadata,
} from "../types";
import { SectionDetector } from "./SectionDetector";

/**
 * Timeline builder options
 */
export interface TimelineBuilderOptions {
  validateSections?: boolean; // Whether to validate sections don't overlap (default: true)
  sortNotes?: boolean; // Whether to sort notes by start time (default: true)
  includeSectionEnds?: boolean; // Whether to include section end boundaries (default: true)
}

/**
 * Default options for timeline building
 */
const DEFAULT_OPTIONS: Required<TimelineBuilderOptions> = {
  validateSections: true,
  sortNotes: true,
  includeSectionEnds: true,
};

/**
 * Timeline Builder
 *
 * Constructs TimelineIR from SongModel_v1.
 */
export class TimelineBuilder {
  private readonly options: Required<TimelineBuilderOptions>;
  private readonly sectionDetector: SectionDetector;

  constructor(options: TimelineBuilderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.sectionDetector = new SectionDetector({
      includeSectionEnds: this.options.includeSectionEnds,
    });
  }

  /**
   * Build TimelineIR from SongModel
   *
   * Main entry point for timeline construction.
   */
  buildTimeline(songModel: SongModel_v1): TimelineIR {
    // Validate sections if enabled
    if (this.options.validateSections && songModel.sections.length > 0) {
      const validation = this.sectionDetector.validateSections(songModel.sections);
      if (!validation.valid) {
        console.warn("Section validation warnings:", validation.errors);
      }
    }

    // Build section boundaries
    const sectionBoundaries = this.sectionDetector.detectBoundaries(songModel.sections);

    // Build tempo changes
    const tempoChanges = this.buildTempoChanges(songModel);

    // Build time signature changes (default to 4/4 if none specified)
    const timeSignatureChanges = this.buildTimeSignatureChanges(songModel);

    // Build timeline notes
    const notes = this.buildTimelineNotes(songModel.notes);

    // Calculate metadata
    const metadata = this.buildMetadata(songModel, notes, sectionBoundaries);

    // Create timeline
    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: crypto.randomUUID(),
      songId: songModel.songId,
      duration: songModel.duration,
      tempoChanges,
      timeSignatureChanges,
      sectionBoundaries,
      notes,
      metadata,
    };

    return timeline;
  }

  /**
   * Build tempo change events from SongModel
   *
   * Converts SongModel tempoChanges to TimelineTempoChange[] with UUIDs.
   */
  private buildTempoChanges(songModel: SongModel_v1): TimelineTempoChange[] {
    // If no tempo changes exist, create default at time 0
    if (songModel.tempoChanges.length === 0) {
      return [
        {
          time: 0,
          tempo: 120, // Default tempo
          eventId: "tempo-default",
        },
      ];
    }

    // Convert tempo changes to timeline events with UUIDs
    return songModel.tempoChanges.map((change, index) => ({
      time: change.time,
      tempo: change.tempo,
      eventId: `tempo-${index}-${crypto.randomUUID()}`,
    }));
  }

  /**
   * Build time signature change events
   *
   * Currently defaults to 4/4 throughout. Future versions will support
   * time signature changes from SongModel.
   */
  private buildTimeSignatureChanges(_songModel: SongModel_v1): TimeSignatureChange[] {
    // Default to 4/4 at time 0
    return [
      {
        time: 0,
        numerator: 4,
        denominator: 4,
        eventId: "timesig-default",
      },
    ];
  }

  /**
   * Build timeline notes from SongModel notes
   *
   * Converts Note[] to TimelineNote[].
   */
  private buildTimelineNotes(notes: Note[]): TimelineNote[] {
    const timelineNotes = notes.map((note) => ({
      noteId: note.noteId,
      voiceId: note.voiceId,
      startTime: note.startTime,
      duration: note.duration,
      pitch: note.pitch,
      velocity: note.velocity,
      derivationSource: note.derivationSource,
    }));

    // Sort notes by start time if enabled
    if (this.options.sortNotes) {
      timelineNotes.sort((a, b) => {
        // Sort by start time first
        if (a.startTime !== b.startTime) {
          return a.startTime - b.startTime;
        }
        // Then by voice id for consistent ordering
        return a.voiceId.localeCompare(b.voiceId);
      });
    }

    return timelineNotes;
  }

  /**
   * Build timeline metadata
   *
   * Calculates summary statistics for the timeline.
   */
  private buildMetadata(
    songModel: SongModel_v1,
    notes: TimelineNote[],
    sectionBoundaries: ReturnType<typeof SectionDetector.prototype.detectBoundaries>
  ): TimelineMetadata {
    // Count unique voices
    const uniqueVoices = new Set(notes.map((n) => n.voiceId));

    // Count unique sections (only count starts, not ends)
    const uniqueSections = new Set(
      sectionBoundaries.filter((b) => b.type === "start").map((b) => b.sectionId)
    );

    return {
      createdAt: new Date().toISOString(),
      sourceDerivationId: songModel.derivationId,
      totalNotes: notes.length,
      totalVoices: uniqueVoices.size,
      totalSections: uniqueSections.size,
    };
  }

  /**
   * Serialize timeline to JSON
   *
   * Converts TimelineIR to JSON string for storage/transmission.
   */
  serialize(timeline: TimelineIR): string {
    return JSON.stringify(timeline, null, 2);
  }

  /**
   * Deserialize timeline from JSON
   *
   * Parses JSON string back to TimelineIR.
   */
  deserialize(json: string): TimelineIR {
    const timeline = JSON.parse(json) as TimelineIR;

    // Basic validation
    if (!timeline.schemaVersion || timeline.schemaVersion !== "1.0") {
      throw new Error(`Invalid schema version: ${timeline.schemaVersion}`);
    }
    if (!timeline.timelineId) {
      throw new Error("Missing timelineId");
    }
    if (!timeline.songId) {
      throw new Error("Missing songId");
    }

    return timeline;
  }

  /**
   * Validate timeline structure
   *
   * Checks that a TimelineIR is well-formed.
   */
  validateTimeline(timeline: TimelineIR): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!timeline.schemaVersion) {
      errors.push("Missing schemaVersion");
    }
    if (!timeline.timelineId) {
      errors.push("Missing timelineId");
    }
    if (!timeline.songId) {
      errors.push("Missing songId");
    }

    // Check duration is non-negative
    if (timeline.duration < 0) {
      errors.push(`Invalid duration: ${timeline.duration}`);
    }

    // Check tempo changes are sorted
    for (let i = 1; i < timeline.tempoChanges.length; i++) {
      if (timeline.tempoChanges[i].time < timeline.tempoChanges[i - 1].time) {
        errors.push(
          `Tempo changes not sorted: ${timeline.tempoChanges[i - 1].time} -> ${timeline.tempoChanges[i].time}`
        );
      }
    }

    // Check time signature changes are sorted
    for (let i = 1; i < timeline.timeSignatureChanges.length; i++) {
      if (timeline.timeSignatureChanges[i].time < timeline.timeSignatureChanges[i - 1].time) {
        errors.push(
          `Time signature changes not sorted: ${timeline.timeSignatureChanges[i - 1].time} -> ${timeline.timeSignatureChanges[i].time}`
        );
      }
    }

    // Check section boundaries are sorted
    for (let i = 1; i < timeline.sectionBoundaries.length; i++) {
      if (timeline.sectionBoundaries[i].time < timeline.sectionBoundaries[i - 1].time) {
        errors.push(
          `Section boundaries not sorted: ${timeline.sectionBoundaries[i - 1].time} -> ${timeline.sectionBoundaries[i].time}`
        );
      }
    }

    // Check notes have valid times
    for (const note of timeline.notes) {
      if (note.startTime < 0) {
        errors.push(`Note ${note.noteId} has negative start time: ${note.startTime}`);
      }
      if (note.duration < 0) {
        errors.push(`Note ${note.noteId} has negative duration: ${note.duration}`);
      }
      if (note.startTime + note.duration > timeline.duration) {
        errors.push(
          `Note ${note.noteId} extends beyond timeline duration: ` +
            `${note.startTime} + ${note.duration} > ${timeline.duration}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

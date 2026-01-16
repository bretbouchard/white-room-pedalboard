/**
 * Note Event Generation Tests
 *
 * Tests for NoteEventGenerator and note-on/note-off pairing.
 */

import { describe, it, expect } from "vitest";
import { NoteEventGenerator, TimelineBuilder, RealizationEngine } from "../src/realize";
import type { TimelineIR, TimelineNote } from "../src/types";

describe("NoteEventGenerator", () => {
  let generator: NoteEventGenerator;

  beforeEach(() => {
    generator = new NoteEventGenerator();
  });

  it("should generate note-on/note-off pairs", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 8,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 1,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);

    expect(schedule.events).toHaveLength(2); // note-on + note-off
    expect(schedule.events[0].type).toBe("note-on");
    expect(schedule.events[1].type).toBe("note-off");
    expect(schedule.events[0].noteId).toBe("note-1");
    expect(schedule.events[1].noteId).toBe("note-1");
  });

  it("should link note-on and note-off events", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 8,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 1,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);

    const noteOn = schedule.events.find((e) => e.type === "note-on")!;
    const noteOff = schedule.events.find((e) => e.type === "note-off")!;

    expect(noteOn.linkedEventId).toBe(noteOff.eventId);
    expect(noteOff.linkedEventId).toBe(noteOn.eventId);
  });

  it("should set correct times for note-on and note-off", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 8,
        duration: 4,
        pitch: 62,
        velocity: 90,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 16,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 1,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);

    const noteOn = schedule.events.find((e) => e.type === "note-on")!;
    const noteOff = schedule.events.find((e) => e.type === "note-off")!;

    expect(noteOn.time).toBe(8);
    expect(noteOff.time).toBe(12); // 8 + 4
  });

  it("should preserve voice and pitch across note-on/note-off", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "piano",
        startTime: 0,
        duration: 2,
        pitch: 72,
        velocity: 100,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 4,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 1,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);

    const noteOn = schedule.events.find((e) => e.type === "note-on")!;
    const noteOff = schedule.events.find((e) => e.type === "note-off")!;

    expect(noteOn.voiceId).toBe("piano");
    expect(noteOff.voiceId).toBe("piano");
    expect(noteOn.pitch).toBe(72);
    expect(noteOff.pitch).toBe(72);
  });

  it("should set note-off velocity to 0 by default", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 8,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 1,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);

    const noteOff = schedule.events.find((e) => e.type === "note-off")!;
    expect(noteOff.velocity).toBe(0);
  });

  it("should include note-off velocity when enabled", () => {
    const generatorWithVelocity = new NoteEventGenerator({
      includeNoteOffVelocity: true,
    });

    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 8,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 1,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule = generatorWithVelocity.generateSchedule(timeline);

    const noteOff = schedule.events.find((e) => e.type === "note-off")!;
    expect(noteOff.velocity).toBe(100);
  });

  it("should preserve derivation source", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "rhythm-system-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 8,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 1,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);

    for (const event of schedule.events) {
      expect(event.derivationSource).toBe("rhythm-system-1");
    }
  });

  it("should calculate metadata correctly", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "melody-1",
      },
      {
        noteId: "note-2",
        voiceId: "voice-2",
        startTime: 4,
        duration: 4,
        pitch: 62,
        velocity: 90,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 8,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 2,
        totalVoices: 2,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);

    expect(schedule.metadata.totalEvents).toBe(4); // 2 notes * 2 events
    expect(schedule.metadata.totalNoteOns).toBe(2);
    expect(schedule.metadata.totalNoteOffs).toBe(2);
    expect(schedule.metadata.totalVoices).toBe(2);
    expect(schedule.metadata.voiceIds).toContain("voice-1");
    expect(schedule.metadata.voiceIds).toContain("voice-2");
  });

  it("should serialize and deserialize schedule", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 8,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 1,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule1 = generator.generateSchedule(timeline);
    const json = generator.serialize(schedule1);
    const schedule2 = generator.deserialize(json);

    expect(schedule2.scheduleId).toBe(schedule1.scheduleId);
    expect(schedule2.events).toHaveLength(schedule1.events.length);
  });

  it("should validate correct schedule", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 8,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 1,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);
    const validation = generator.validateSchedule(schedule);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("should get events for voice", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "piano",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "melody-1",
      },
      {
        noteId: "note-2",
        voiceId: "drums",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "rhythm-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 8,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 2,
        totalVoices: 2,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);
    const pianoEvents = generator.getEventsForVoice(schedule, "piano");

    expect(pianoEvents).toHaveLength(2); // note-on + note-off
    expect(pianoEvents.every((e) => e.voiceId === "piano")).toBe(true);
  });

  it("should get events in range", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 0,
        duration: 4,
        pitch: 60,
        velocity: 100,
        derivationSource: "melody-1",
      },
      {
        noteId: "note-2",
        voiceId: "voice-1",
        startTime: 8,
        duration: 4,
        pitch: 62,
        velocity: 100,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 16,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 2,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);
    const eventsInRange = generator.getEventsInRange(schedule, 0, 5);

    // Should include note-1 events (at 0 and 4) but not note-2 (at 8 and 12)
    expect(eventsInRange.length).toBeGreaterThanOrEqual(2);
    expect(eventsInRange.every((e) => e.time <= 5)).toBe(true);
  });

  it("should get active notes at time", () => {
    const timelineNotes: TimelineNote[] = [
      {
        noteId: "note-1",
        voiceId: "voice-1",
        startTime: 0,
        duration: 8,
        pitch: 60,
        velocity: 100,
        derivationSource: "melody-1",
      },
      {
        noteId: "note-2",
        voiceId: "voice-1",
        startTime: 8,
        duration: 4,
        pitch: 62,
        velocity: 100,
        derivationSource: "melody-1",
      },
    ];

    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 16,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: timelineNotes,
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 2,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const schedule = generator.generateSchedule(timeline);

    // At time 4, note-1 should be active
    const activeAt4 = generator.getActiveNotesAt(schedule, 4);
    expect(activeAt4.size).toBe(1);
    expect(activeAt4.has("note-1")).toBe(true);

    // At time 10, note-2 should be active
    const activeAt10 = generator.getActiveNotesAt(schedule, 10);
    expect(activeAt10.size).toBe(1);
    expect(activeAt10.has("note-2")).toBe(true);

    // At time 0, note-1 should be starting
    const activeAt0 = generator.getActiveNotesAt(schedule, 0);
    expect(activeAt0.size).toBe(1);
    expect(activeAt0.has("note-1")).toBe(true);
  });
});

describe("Note Events Integration", () => {
  it("should generate events from timeline", () => {
    const timeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "test-timeline",
      songId: "test-song",
      duration: 16,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: [
        {
          noteId: "note-1",
          voiceId: "voice-1",
          startTime: 0,
          duration: 4,
          pitch: 60,
          velocity: 100,
          derivationSource: "melody-1",
        },
        {
          noteId: "note-2",
          voiceId: "voice-1",
          startTime: 4,
          duration: 4,
          pitch: 62,
          velocity: 90,
          derivationSource: "melody-1",
        },
        {
          noteId: "note-3",
          voiceId: "voice-1",
          startTime: 8,
          duration: 4,
          pitch: 64,
          velocity: 80,
          derivationSource: "melody-1",
        },
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 3,
        totalVoices: 1,
        totalSections: 0,
      },
    };

    const generator = new NoteEventGenerator();
    const schedule = generator.generateSchedule(timeline);

    expect(schedule.events).toHaveLength(6); // 3 notes * 2 events
    expect(schedule.metadata.totalNoteOns).toBe(3);
    expect(schedule.metadata.totalNoteOffs).toBe(3);
  });

  it("should generate events from realized song", async () => {
    const engine = new RealizationEngine();
    const timelineBuilder = new TimelineBuilder();
    const eventGenerator = new NoteEventGenerator();

    const song = {
      schemaVersion: "1.0" as const,
      songId: "integration-events",
      globals: {
        tempo: 120,
        timeSignature: [4, 4],
        key: 0,
      },
      bookI_rhythmSystems: [
        {
          systemId: "rhythm-1",
          systemType: "generator",
          generators: [{ period: 4, phase: 0, weight: 1.0 }],
          resolutionBars: 4,
        },
      ],
      bookII_melodySystems: [
        {
          systemId: "melody-1",
          pitchCycle: {
            modulus: 12,
            roots: [0, 4, 7],
          },
          intervalSeed: [2, 2, 1],
          contourConstraints: {
            maxAscend: 5,
            maxDescend: 5,
          },
          registerConstraints: {
            minPitch: 60,
            maxPitch: 72,
          },
        },
      ],
      bookIII_harmonySystems: [],
      bookIV_formSystem: {
        systemId: "form-1",
        systemType: "form",
        ratioTree: [4],
        nestedPeriodicity: [],
        reuseRules: [],
        transformationReferences: [],
        cadenceConstraints: [],
        symmetryRules: [],
      },
      bookV_orchestration: {
        ensembleId: "ensemble-1",
        voices: [
          {
            id: "piano",
            name: "Piano",
            rolePools: [
              {
                role: "primary",
                functionalClass: "motion",
                enabled: true,
              },
            ],
            groupIds: [],
          },
        ],
      },
      ensembleModel: {
        version: "1.0",
        id: "ensemble-1",
        voices: [],
        voiceCount: 1,
      },
      bindings: {
        roleRhythmBindings: [],
        roleMelodyBindings: [],
        roleHarmonyBindings: [],
        roleEnsembleBindings: [],
      },
      constraints: [],
      provenance: {
        createdAt: new Date().toISOString(),
        createdBy: "test",
        modifiedAt: new Date().toISOString(),
        derivationChain: [],
      },
    };

    // Realize song
    const result = await engine.realize(song, 12345);

    // Build timeline
    const timeline = timelineBuilder.buildTimeline(result.songModel);

    // Generate note events
    const schedule = eventGenerator.generateSchedule(timeline);

    // Verify schedule is complete
    expect(schedule.schemaVersion).toBe("1.0");
    expect(schedule.songId).toBe("integration-events");
    expect(schedule.events.length).toBeGreaterThan(0);
    expect(schedule.metadata.totalNoteOns).toBe(schedule.metadata.totalNoteOffs);
    expect(schedule.events.every((e) => e.linkedEventId)).toBe(true);

    // Verify all events are traceable
    for (const event of schedule.events) {
      expect(event.derivationSource).toBeDefined();
      expect(event.noteId).toBeDefined();
    }
  });
});

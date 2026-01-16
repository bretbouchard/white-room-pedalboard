/**
 * Timeline Generation Tests
 *
 * Tests for TimelineBuilder and SectionDetector.
 */

import { describe, it, expect } from "vitest";
import { TimelineBuilder, SectionDetector, RealizationEngine } from "../src/realize";
import type { SongModel_v1, Section, TimelineIR } from "../src/types";
import { createOrchestrationSystem } from "../src/theory/systems/orchestration";

describe("SectionDetector", () => {
  it("should detect section boundaries", () => {
    const detector = new SectionDetector();
    const sections: Section[] = [
      { sectionId: "A", name: "Section A", startTime: 0, duration: 16 },
      { sectionId: "B", name: "Section B", startTime: 16, duration: 16 },
    ];

    const boundaries = detector.detectBoundaries(sections);

    expect(boundaries).toHaveLength(4); // 2 starts + 2 ends
    expect(boundaries[0]).toMatchObject({
      time: 0,
      sectionId: "A",
      sectionName: "Section A",
      type: "start",
    });
    expect(boundaries[1]).toMatchObject({
      time: 16,
      sectionId: "A",
      sectionName: "Section A",
      type: "end",
    });
  });

  it("should get section at time", () => {
    const detector = new SectionDetector();
    const sections: Section[] = [
      { sectionId: "A", name: "Section A", startTime: 0, duration: 16 },
      { sectionId: "B", name: "Section B", startTime: 16, duration: 16 },
    ];

    const sectionAt8 = detector.getSectionAtTime(sections, 8);
    expect(sectionAt8?.sectionId).toBe("A");

    const sectionAt20 = detector.getSectionAtTime(sections, 20);
    expect(sectionAt20?.sectionId).toBe("B");

    const sectionAt50 = detector.getSectionAtTime(sections, 50);
    expect(sectionAt50).toBeNull();
  });

  it("should validate sections without overlaps", () => {
    const detector = new SectionDetector();
    const sections: Section[] = [
      { sectionId: "A", name: "Section A", startTime: 0, duration: 16 },
      { sectionId: "B", name: "Section B", startTime: 16, duration: 16 },
    ];

    const result = detector.validateSections(sections);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect overlapping sections", () => {
    const detector = new SectionDetector();
    const sections: Section[] = [
      { sectionId: "A", name: "Section A", startTime: 0, duration: 20 },
      { sectionId: "B", name: "Section B", startTime: 16, duration: 16 }, // Overlaps
    ];

    const result = detector.validateSections(sections);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("overlap");
  });

  it("should merge overlapping sections", () => {
    const detector = new SectionDetector();
    const sections: Section[] = [
      { sectionId: "A", name: "Section A", startTime: 0, duration: 20 },
      { sectionId: "B", name: "Section B", startTime: 16, duration: 16 }, // Overlaps
    ];

    const merged = detector.mergeOverlappingSections(sections);

    expect(merged).toHaveLength(2);
    expect(merged[0].startTime).toBe(0);
    expect(merged[0].duration).toBe(20);
    expect(merged[1].startTime).toBe(20); // Adjusted to not overlap
  });

  it("should get boundaries in range", () => {
    const detector = new SectionDetector();
    const sections: Section[] = [
      { sectionId: "A", name: "Section A", startTime: 0, duration: 16 },
      { sectionId: "B", name: "Section B", startTime: 16, duration: 16 },
      { sectionId: "C", name: "Section C", startTime: 32, duration: 16 },
    ];

    const boundaries = detector.getBoundariesInRange(sections, 10, 20);

    // Should include A start at 0 (not in range), A end at 16 (in range)
    // and B start at 16 (in range)
    expect(boundaries.length).toBeGreaterThanOrEqual(2);
  });
});

describe("TimelineBuilder", () => {
  let builder: TimelineBuilder;

  beforeEach(() => {
    builder = new TimelineBuilder();
  });

  it("should build timeline from song model", () => {
    const songModel: SongModel_v1 = {
      schemaVersion: "1.0",
      songId: "test-song",
      derivationId: "test-derivation",
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
      ],
      events: [],
      voiceAssignments: [],
      duration: 32,
      tempoChanges: [],
      sections: [
        { sectionId: "A", name: "Section A", startTime: 0, duration: 16 },
        { sectionId: "B", name: "Section B", startTime: 16, duration: 16 },
      ],
    };

    const timeline = builder.buildTimeline(songModel);

    expect(timeline.schemaVersion).toBe("1.0");
    expect(timeline.songId).toBe("test-song");
    expect(timeline.duration).toBe(32);
    expect(timeline.notes).toHaveLength(1);
    expect(timeline.sectionBoundaries.length).toBeGreaterThan(0);
  });

  it("should create default tempo change if none exist", () => {
    const songModel: SongModel_v1 = {
      schemaVersion: "1.0",
      songId: "test-song",
      derivationId: "test-derivation",
      notes: [],
      events: [],
      voiceAssignments: [],
      duration: 32,
      tempoChanges: [], // No tempo changes
      sections: [],
    };

    const timeline = builder.buildTimeline(songModel);

    expect(timeline.tempoChanges).toHaveLength(1);
    expect(timeline.tempoChanges[0]).toMatchObject({
      time: 0,
      tempo: 120,
    });
  });

  it("should create default time signature", () => {
    const songModel: SongModel_v1 = {
      schemaVersion: "1.0",
      songId: "test-song",
      derivationId: "test-derivation",
      notes: [],
      events: [],
      voiceAssignments: [],
      duration: 32,
      tempoChanges: [],
      sections: [],
    };

    const timeline = builder.buildTimeline(songModel);

    expect(timeline.timeSignatureChanges).toHaveLength(1);
    expect(timeline.timeSignatureChanges[0]).toMatchObject({
      time: 0,
      numerator: 4,
      denominator: 4,
    });
  });

  it("should sort notes by start time", () => {
    const songModel: SongModel_v1 = {
      schemaVersion: "1.0",
      songId: "test-song",
      derivationId: "test-derivation",
      notes: [
        {
          noteId: "note-2",
          voiceId: "voice-1",
          startTime: 8,
          duration: 4,
          pitch: 62,
          velocity: 100,
          derivationSource: "melody-1",
        },
        {
          noteId: "note-1",
          voiceId: "voice-1",
          startTime: 0,
          duration: 4,
          pitch: 60,
          velocity: 100,
          derivationSource: "melody-1",
        },
      ],
      events: [],
      voiceAssignments: [],
      duration: 16,
      tempoChanges: [],
      sections: [],
    };

    const timeline = builder.buildTimeline(songModel);

    expect(timeline.notes[0].noteId).toBe("note-1"); // Earlier note first
    expect(timeline.notes[1].noteId).toBe("note-2");
  });

  it("should calculate metadata correctly", () => {
    const songModel: SongModel_v1 = {
      schemaVersion: "1.0",
      songId: "test-song",
      derivationId: "test-derivation",
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
          voiceId: "voice-2",
          startTime: 4,
          duration: 4,
          pitch: 62,
          velocity: 100,
          derivationSource: "melody-1",
        },
      ],
      events: [],
      voiceAssignments: [],
      duration: 16,
      tempoChanges: [],
      sections: [
        { sectionId: "A", name: "Section A", startTime: 0, duration: 16 },
        { sectionId: "B", name: "Section B", startTime: 16, duration: 16 },
      ],
    };

    const timeline = builder.buildTimeline(songModel);

    expect(timeline.metadata.totalNotes).toBe(2);
    expect(timeline.metadata.totalVoices).toBe(2);
    expect(timeline.metadata.totalSections).toBe(2);
    expect(timeline.metadata.sourceDerivationId).toBe("test-derivation");
    expect(timeline.metadata.createdAt).toBeDefined();
  });

  it("should serialize and deserialize timeline", () => {
    const songModel: SongModel_v1 = {
      schemaVersion: "1.0",
      songId: "test-song",
      derivationId: "test-derivation",
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
      ],
      events: [],
      voiceAssignments: [],
      duration: 16,
      tempoChanges: [],
      sections: [],
    };

    const timeline1 = builder.buildTimeline(songModel);
    const json = builder.serialize(timeline1);
    const timeline2 = builder.deserialize(json);

    expect(timeline2.timelineId).toBe(timeline1.timelineId);
    expect(timeline2.songId).toBe(timeline1.songId);
    expect(timeline2.notes).toHaveLength(timeline1.notes.length);
  });

  it("should validate correct timeline", () => {
    const songModel: SongModel_v1 = {
      schemaVersion: "1.0",
      songId: "test-song",
      derivationId: "test-derivation",
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
      ],
      events: [],
      voiceAssignments: [],
      duration: 16,
      tempoChanges: [],
      sections: [],
    };

    const timeline = builder.buildTimeline(songModel);
    const validation = builder.validateTimeline(timeline);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("should detect invalid timeline", () => {
    const invalidTimeline: TimelineIR = {
      schemaVersion: "1.0",
      timelineId: "",
      songId: "",
      duration: -10,
      tempoChanges: [],
      timeSignatureChanges: [],
      sectionBoundaries: [],
      notes: [],
      metadata: {
        createdAt: new Date().toISOString(),
        totalNotes: 0,
        totalVoices: 0,
        totalSections: 0,
      },
    };

    const validation = builder.validateTimeline(invalidTimeline);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

describe("Timeline Integration", () => {
  it("should build timeline from realized song", async () => {
    const engine = new RealizationEngine();
    const builder = new TimelineBuilder();

    const song = {
      schemaVersion: "1.0" as const,
      songId: "integration-test",
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
        ratioTree: [4, 4],
        nestedPeriodicity: [],
        reuseRules: [],
        transformationReferences: [],
        cadenceConstraints: [],
        symmetryRules: [],
      },
      bookV_orchestration: createOrchestrationSystem({
        systemId: "orchestration-1",
      }),
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
    const timeline = builder.buildTimeline(result.songModel);

    // Verify timeline is complete
    expect(timeline.schemaVersion).toBe("1.0");
    expect(timeline.songId).toBe("integration-test");
    expect(timeline.notes.length).toBeGreaterThan(0);
    expect(timeline.sectionBoundaries.length).toBeGreaterThan(0);
    expect(timeline.metadata.totalNotes).toBe(timeline.notes.length);
  });
});

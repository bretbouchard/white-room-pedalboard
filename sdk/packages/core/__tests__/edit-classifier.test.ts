/**
 * Edit Classification Tests
 *
 * Tests for classifying edits to realized song models
 * into decorative, structural, and destructive categories.
 */

import { describe, it, expect } from "vitest";
import {
  classifyEdits,
  EditType,
  getClassificationSummary,
  type ClassifiedEdit,
  type EditClassification,
} from "../src/realization/edit-classifier";
import type { SongModel_v1, Note } from "../src/types";
import type { DerivationRecord } from "../src/realization/realization-engine";

describe("classifyEdits", () => {
  describe("decorative edits", () => {
    it("should classify tempo change as decorative", () => {
      const original = createSongModel({ tempo: 120 });
      const edited = createSongModel({ tempo: 140 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.edits).toHaveLength(1);
      expect(classification.edits[0].type).toBe(EditType.DECORATIVE);
      expect(classification.edits[0].confidence).toBe(1.0);
      expect(classification.edits[0].ambiguity).toBe(0.0);
      expect(classification.overallConfidence).toBe(1.0);
      expect(classification.canReconcile).toBe(true);
      expect(classification.estimatedLoss).toBe(0.0);
    });

    it("should classify velocity changes as decorative", () => {
      const original = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const edited = createSongModelWithNotes([{ pitch: 60, time: 0, duration: 1, velocity: 100 }]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      const velocityEdits = classification.edits.filter((e) => e.description.includes("velocity"));
      expect(velocityEdits).toHaveLength(1);
      expect(velocityEdits[0].type).toBe(EditType.DECORATIVE);
    });

    it("should classify duration changes as decorative", () => {
      const original = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const edited = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 0.5, velocity: 80 },
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      const durationEdits = classification.edits.filter((e) => e.description.includes("duration"));
      expect(durationEdits).toHaveLength(1);
      expect(durationEdits[0].type).toBe(EditType.DECORATIVE);
    });
  });

  describe("structural edits", () => {
    it("should classify time signature change as structural", () => {
      const original = createSongModel({ timeSignature: [4, 4] });
      const edited = createSongModel({ timeSignature: [3, 4] });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.edits).toHaveLength(1);
      expect(classification.edits[0].type).toBe(EditType.STRUCTURAL);
      expect(classification.canReconcile).toBe(true);
    });

    it("should classify key change as structural", () => {
      const original = createSongModel({ key: 0 });
      const edited = createSongModel({ key: 5 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.edits).toHaveLength(1);
      expect(classification.edits[0].type).toBe(EditType.STRUCTURAL);
      expect(classification.canReconcile).toBe(true);
    });

    it("should classify small pitch changes as structural", () => {
      const original = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const edited = createSongModelWithNotes([
        { pitch: 62, time: 0, duration: 1, velocity: 80 }, // +2 semitones
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      const pitchEdits = classification.edits.filter((e) => e.description.includes("pitch"));
      expect(pitchEdits).toHaveLength(1);
      expect(pitchEdits[0].type).toBe(EditType.STRUCTURAL);
      expect(pitchEdits[0].confidence).toBeGreaterThan(0.5);
    });

    it("should classify small time shifts as structural", () => {
      const original = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const edited = createSongModelWithNotes([
        { pitch: 60, time: 0.25, duration: 1, velocity: 80 }, // +0.25 beat shift
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      const timeEdits = classification.edits.filter((e) => e.description.includes("time"));
      expect(timeEdits.length).toBeGreaterThan(0);
      expect(timeEdits[0].type).toBe(EditType.STRUCTURAL);
    });

    it("should classify note additions as structural when within tolerance", () => {
      const original = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
        { pitch: 62, time: 1, duration: 1, velocity: 80 },
        { pitch: 64, time: 2, duration: 1, velocity: 80 },
        { pitch: 65, time: 3, duration: 1, velocity: 80 },
        { pitch: 67, time: 4, duration: 1, velocity: 80 },
      ]);
      const edited = createSongModelWithNotes([
        ...original.notes,
        { pitch: 69, time: 5, duration: 1, velocity: 80 }, // +1 note (< 20%)
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      const additionEdits = classification.edits.filter((e) => e.description.includes("added"));
      expect(additionEdits).toHaveLength(1);
      expect(additionEdits[0].type).toBe(EditType.STRUCTURAL);
    });

    it("should classify note deletions as structural when maintaining integrity", () => {
      const original = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
        { pitch: 62, time: 1, duration: 1, velocity: 80 },
        { pitch: 64, time: 2, duration: 1, velocity: 80 },
        { pitch: 65, time: 3, duration: 1, velocity: 80 },
        { pitch: 67, time: 4, duration: 1, velocity: 80 },
      ]);
      const edited = createSongModelWithNotes(original.notes.slice(0, -1)); // -1 note (< 20%)
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      const deletionEdits = classification.edits.filter((e) => e.description.includes("deleted"));
      expect(deletionEdits).toHaveLength(1);
      expect(deletionEdits[0].type).toBe(EditType.STRUCTURAL);
    });
  });

  describe("destructive edits", () => {
    it("should classify large pitch changes as destructive", () => {
      const original = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const edited = createSongModelWithNotes([
        { pitch: 84, time: 0, duration: 1, velocity: 80 }, // +24 semitones (2 octaves)
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      const pitchEdits = classification.edits.filter((e) => e.description.includes("pitch"));
      expect(pitchEdits).toHaveLength(1);
      expect(pitchEdits[0].type).toBe(EditType.DESTRUCTIVE);
      expect(pitchEdits[0].confidence).toBeLessThan(0.5);
    });

    it("should classify large time shifts as destructive", () => {
      const original = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const edited = createSongModelWithNotes([
        { pitch: 60, time: 2, duration: 1, velocity: 80 }, // +2 beats (large shift)
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      const timeEdits = classification.edits.filter((e) => e.description.includes("time"));
      expect(timeEdits.length).toBeGreaterThan(0);
      expect(timeEdits[0].type).toBe(EditType.DESTRUCTIVE);
    });

    it("should classify excessive note additions as destructive", () => {
      const original = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
        { pitch: 62, time: 1, duration: 1, velocity: 80 },
        { pitch: 64, time: 2, duration: 1, velocity: 80 },
        { pitch: 65, time: 3, duration: 1, velocity: 80 },
        { pitch: 67, time: 4, duration: 1, velocity: 80 },
      ]);
      const edited = createSongModelWithNotes([
        ...original.notes,
        ...Array.from({ length: 5 }, (_, i) => ({
          pitch: 60 + i * 2,
          time: 5 + i,
          duration: 1,
          velocity: 80,
        })), // +5 notes (100% increase)
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      const additionEdits = classification.edits.filter((e) => e.description.includes("added"));
      expect(additionEdits).toHaveLength(1);
      expect(additionEdits[0].type).toBe(EditType.DESTRUCTIVE);
      expect(classification.canReconcile).toBe(false);
    });

    it("should classify section deletions as destructive", () => {
      const original = createSongModel({
        sections: [
          { sectionId: "section-1", start: 0, end: 32, label: "A" },
          { sectionId: "section-2", start: 32, end: 64, label: "B" },
        ],
      });
      const edited = createSongModel({
        sections: [original.sections[0]],
      });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      const sectionEdits = classification.edits.filter((e) => e.description.includes("section"));
      expect(sectionEdits).toHaveLength(1);
      expect(sectionEdits[0].type).toBe(EditType.DESTRUCTIVE);
      expect(classification.canReconcile).toBe(false);
    });
  });

  describe("confidence and ambiguity scoring", () => {
    it("should calculate high confidence for decorative edits", () => {
      const original = createSongModel({ tempo: 120 });
      const edited = createSongModel({ tempo: 140 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.overallConfidence).toBeGreaterThan(0.9);
      expect(classification.overallAmbiguity).toBeLessThan(0.1);
    });

    it("should calculate medium confidence for structural edits", () => {
      const original = createSongModel({ key: 0 });
      const edited = createSongModel({ key: 5 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.overallConfidence).toBeGreaterThan(0.5);
      expect(classification.overallConfidence).toBeLessThan(0.9);
      expect(classification.overallAmbiguity).toBeGreaterThan(0.2);
    });

    it("should calculate low confidence for destructive edits", () => {
      const original = createSongModelWithNotes([
        { pitch: 60, time: 0, duration: 1, velocity: 80 },
      ]);
      const edited = createSongModelWithNotes([
        { pitch: 84, time: 0, duration: 1, velocity: 80 }, // Large pitch change
      ]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.overallConfidence).toBeLessThan(0.5);
    });

    it("should calculate zero loss for decorative edits", () => {
      const original = createSongModel({ tempo: 120 });
      const edited = createSongModel({ tempo: 140 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.estimatedLoss).toBe(0.0);
    });

    it("should calculate non-zero loss for structural edits", () => {
      const original = createSongModel({ key: 0 });
      const edited = createSongModel({ key: 5 });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.estimatedLoss).toBeGreaterThan(0.0);
      expect(classification.estimatedLoss).toBeLessThan(1.0);
    });
  });

  describe("classification summary", () => {
    it("should generate readable summary", () => {
      const original = createSongModel({
        tempo: 120,
        key: 0,
      });
      const edited = createSongModel({
        tempo: 140,
        key: 5,
      });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);
      const summary = getClassificationSummary(classification);

      expect(summary).toContain("Overall Confidence:");
      expect(summary).toContain("Overall Ambiguity:");
      expect(summary).toContain("Can Reconcile:");
      expect(summary).toContain("Estimated Loss:");
      expect(summary).toContain("Edits:");
    });
  });

  describe("edge cases", () => {
    it("should handle identical models", () => {
      const original = createSongModel({});
      const edited = createSongModel({});
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.edits).toHaveLength(0);
      expect(classification.overallConfidence).toBe(1.0);
      expect(classification.overallAmbiguity).toBe(0.0);
      expect(classification.canReconcile).toBe(true);
      expect(classification.estimatedLoss).toBe(0.0);
    });

    it("should handle empty note arrays", () => {
      const original = createSongModelWithNotes([]);
      const edited = createSongModelWithNotes([{ pitch: 60, time: 0, duration: 1, velocity: 80 }]);
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.edits.length).toBeGreaterThan(0);
    });

    it("should handle multiple concurrent edits", () => {
      const original = createSongModel({
        tempo: 120,
        key: 0,
      });
      const edited = createSongModel({
        tempo: 140,
        key: 5,
      });
      const derivation = createDerivationRecord();

      const classification = classifyEdits(original, edited, derivation);

      expect(classification.edits.length).toBeGreaterThan(1);
      expect(classification.overallConfidence).toBeGreaterThan(0.0);
      expect(classification.overallConfidence).toBeLessThanOrEqual(1.0);
    });
  });
});

// Helper functions

function createSongModel(overrides?: Partial<SongModel_v1>): SongModel_v1 {
  const defaults: SongModel_v1 = {
    schemaVersion: "1.0",
    songId: "test-song",
    sourceSongId: "test-source",
    notes: [],
    sections: [],
    tempo: 120,
    timeSignature: [4, 4],
    key: 0,
    duration: 32,
    createdAt: new Date().toISOString(),
  };

  return { ...defaults, ...overrides };
}

function createSongModelWithNotes(notes: Note[]): SongModel_v1 {
  return createSongModel({
    notes,
    duration: notes.length > 0 ? Math.max(...notes.map((n) => n.time + n.duration)) : 0,
  });
}

function createDerivationRecord(): DerivationRecord {
  return {
    schemaVersion: "1.0",
    derivationId: "test-derivation",
    sourceSongId: "test-source",
    realizedSongId: "test-song",
    seed: 42,
    executionPhases: [["rhythm:test", "melody:test", "harmony:test", "form:test"]],
    systemOutputs: {},
    bindingAssignments: [],
    createdAt: new Date().toISOString(),
  };
}

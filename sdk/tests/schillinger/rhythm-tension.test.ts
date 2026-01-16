/**
 * CI Tests: Rhythmic Tension from Drill and Silence
 *
 * These tests enforce critical Schillinger principles:
 * 1. Drill increases rhythmic tension measurably
 * 2. Silence INCREASES tension (not decreases) - counterintuitive but essential
 * 3. Tension changes are explainable with musical causes
 *
 * If any of these tests fail, the system is not responding to musical events.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TensionAccumulator } from "../../src/structure/TensionAccumulator";
import { zeroTension } from "../../src/structure/StructuralTension";

describe("Rhythmic tension from drill and silence", () => {
  let accumulator: TensionAccumulator;

  beforeEach(() => {
    accumulator = new TensionAccumulator();
  });

  describe("drill increases rhythmic tension", () => {
    it("increases rhythmic tension when drill is active", () => {
      // Set up at bar 8 (phrase boundary)
      accumulator.updatePosition(8, 1, 0);

      // Baseline: normal groove
      accumulator.writeRhythmicTension(0.1, "groove_stable");
      const baseTension = accumulator.getCurrent();

      // Activate drill at phrase end
      accumulator.writeRhythmicTension(0.7, "drill_fill_phrase_end");

      const drilledTension = accumulator.getCurrent();

      expect(drilledTension.rhythmic).toBeGreaterThan(baseTension.rhythmic);
      expect(drilledTension.rhythmic).toBeCloseTo(0.7, 1);
    });

    it("records drill as tension change with correct cause", () => {
      accumulator.updatePosition(16, 4, 0);

      accumulator.writeRhythmicTension(0.8, "drill_fill_bar_16");

      const changes = accumulator.getChanges();
      const drillChange = changes[changes.length - 1];

      expect(drillChange.cause).toBe("drill_fill_bar_16");
      expect(drillChange.domain).toBe("rhythmic");
      expect(drillChange.to).toBe(0.8);
      expect(drillChange.musicalTime.bar).toBe(16);
    });

    it("accumulates tension across multiple drill events", () => {
      accumulator.updatePosition(1, 1, 0);

      // First drill
      accumulator.writeRhythmicTension(0.6, "drill_fill_bar_4");
      const afterFirst = accumulator.getCurrent();

      // Second drill (higher intensity)
      accumulator.writeRhythmicTension(0.9, "drill_burst_bar_8");
      const afterSecond = accumulator.getCurrent();

      expect(afterSecond.rhythmic).toBeGreaterThan(afterFirst.rhythmic);
      expect(afterFirst.rhythmic).toBeCloseTo(0.6, 1);
      expect(afterSecond.rhythmic).toBeCloseTo(0.9, 1);
    });
  });

  describe("silence increases tension (critical Schillinger rule)", () => {
    it("silence increases rhythmic tension, not decreases it", () => {
      accumulator.updatePosition(1, 1, 0);

      // Normal playing
      accumulator.writeRhythmicTension(0.2, "groove_normal");
      const normalTension = accumulator.getCurrent();

      // Silence gate activates
      accumulator.writeRhythmicTension(0.7, "gate_silence_expected");

      const gatedTension = accumulator.getCurrent();

      // CRITICAL: Silence must INCREASE tension
      expect(gatedTension.rhythmic).toBeGreaterThan(normalTension.rhythmic);
      expect(gatedTension.rhythmic).toBeCloseTo(0.7, 1);
    });

    it("records silence gate with explanatory cause", () => {
      accumulator.updatePosition(32, 3, 0);

      accumulator.writeRhythmicTension(0.9, "gate_silence_section_collapse");

      const changes = accumulator.getChanges();
      const silenceChange = changes[changes.length - 1];

      expect(silenceChange.cause).toBe("gate_silence_section_collapse");
      expect(silenceChange.domain).toBe("rhythmic");
      expect(silenceChange.to).toBe(0.9);
    });

    it("silence followed by burst increases tension further", () => {
      accumulator.updatePosition(33, 1, 0);

      // Gate creates silence (high tension)
      accumulator.writeRhythmicTension(0.8, "gate_silence");
      const gatedTension = accumulator.getCurrent();

      // Burst replaces silence (even higher tension)
      accumulator.writeRhythmicTension(0.95, "drill_burst_post_silence");

      const burstTension = accumulator.getCurrent();

      expect(burstTension.rhythmic).toBeGreaterThan(gatedTension.rhythmic);
    });
  });

  describe("phrase boundaries increase formal tension", () => {
    it("phrase endings have higher formal tension than mid-phrase", () => {
      // Mid-phrase (bar 3 of 4)
      accumulator.updatePosition(3, 1, 0);
      accumulator.writeFormalTension(0.2, "phrase_continuation");
      const midPhraseTension = accumulator.getCurrent();

      // Phrase boundary (bar 4)
      accumulator.updatePosition(4, 4, 0);
      accumulator.writeFormalTension(0.7, "phrase_boundary_bar_4");

      const phraseEndTension = accumulator.getCurrent();

      expect(phraseEndTension.formal).toBeGreaterThan(midPhraseTension.formal);
      expect(phraseEndTension.formal).toBeCloseTo(0.7, 1);
    });

    it("section endings have highest formal tension", () => {
      // Regular phrase boundary
      accumulator.updatePosition(4, 4, 0);
      accumulator.writeFormalTension(0.6, "phrase_boundary");
      const phraseBoundary = accumulator.getCurrent();

      // Section ending (cadence)
      accumulator.updatePosition(16, 4, 0);
      accumulator.writeFormalTension(0.9, "cadence_perfect_section_end");

      const sectionEnd = accumulator.getCurrent();

      expect(sectionEnd.formal).toBeGreaterThan(phraseBoundary.formal);
    });

    it("records phrase position in tension changes", () => {
      accumulator.updatePosition(8, 4, 0);

      accumulator.writeFormalTension(0.7, "phrase_boundary_bar_8");

      const changes = accumulator.getChanges();
      const phraseChange = changes[changes.length - 1];

      expect(phraseChange.musicalTime.bar).toBe(8);
      expect(phraseChange.musicalTime.beat).toBe(4);
      expect(phraseChange.domain).toBe("formal");
    });
  });

  describe("tension affects total", () => {
    it("rhythmic tension contributes to total tension", () => {
      accumulator.updatePosition(1, 1, 0);

      accumulator.writeRhythmicTension(0.5, "test_rhythm");

      const total = accumulator.getTotal();

      // Rhythm is weighted 40%, so 0.5 * 0.4 = 0.2
      expect(total).toBeCloseTo(0.2, 1);
    });

    it("combined tensions increase total appropriately", () => {
      accumulator.updatePosition(16, 4, 0);

      // High rhythmic tension (drill)
      accumulator.writeRhythmicTension(0.8, "drill_fill");

      // High formal tension (phrase end)
      accumulator.writeFormalTension(0.7, "phrase_boundary");

      const total = accumulator.getTotal();

      // Expected: 0.8 * 0.4 + 0.7 * 0.2 = 0.32 + 0.14 = 0.46
      expect(total).toBeCloseTo(0.46, 1);
    });
  });

  describe("explainability", () => {
    it("explains why tension is at current level", () => {
      accumulator.updatePosition(16, 4, 0);

      accumulator.writeRhythmicTension(0.8, "drill_fill_bar_16");
      accumulator.writeFormalTension(0.7, "phrase_boundary");

      const explanation = accumulator.explainCurrentState();

      expect(explanation).toContain("drill_fill_bar_16");
      expect(explanation).toContain("phrase_boundary");
      expect(explanation).toContain("bar 16");
    });

    it("tracks recent changes within time window", () => {
      accumulator.updatePosition(1, 1, 0);
      accumulator.writeRhythmicTension(0.3, "event_1");

      accumulator.updatePosition(2, 1, 0);
      accumulator.writeRhythmicTension(0.5, "event_2");

      accumulator.updatePosition(3, 1, 0);
      accumulator.writeRhythmicTension(0.7, "event_3");

      accumulator.updatePosition(10, 1, 0);
      accumulator.writeRhythmicTension(0.2, "event_10");

      // Get recent 4 bars
      const recent = accumulator.getRecentChanges(4);

      // Should include event_10 and event_3 (bars 7-10), but not events 1-2
      expect(recent.length).toBeLessThanOrEqual(2);
      expect(recent.some((c) => c.cause === "event_10")).toBe(true);
    });
  });

  describe("Schillinger compliance", () => {
    it("tension never exceeds 1.0 even with extreme events", () => {
      accumulator.updatePosition(1, 1, 0);

      // Extreme drill
      accumulator.writeRhythmicTension(2.0, "extreme_drill");

      // Extreme formal tension
      accumulator.writeFormalTension(1.5, "extreme_cadence");

      const current = accumulator.getCurrent();
      const total = accumulator.getTotal();

      // Should clamp to 1.0
      expect(current.rhythmic).toBe(1.0);
      expect(current.formal).toBe(1.0);
      expect(total).toBeLessThanOrEqual(1.0);
    });

    it("all tension changes have musical causes", () => {
      accumulator.updatePosition(4, 2, 0);

      accumulator.writeRhythmicTension(0.6, "fill_phrase_end");
      accumulator.writeHarmonicTension(0.5, "chord_dominant");
      accumulator.writeFormalTension(0.7, "cadence_imperfect");

      const changes = accumulator.getChanges();

      changes.forEach((change) => {
        expect(change.cause).toBeTruthy();
        expect(change.cause.length).toBeGreaterThan(0);
        expect(change.musicalTime.bar).toBeGreaterThan(0);
      });
    });
  });
});

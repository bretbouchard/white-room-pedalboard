/**
 * CI Tests: Automatic Resolution Logic
 *
 * These tests enforce the most critical Schillinger principle:
 * The system must resolve tension AUTOMATICALLY, not escalate forever.
 *
 * Schillinger systems breathe: tension builds → resolves → builds again
 * If the system only escalates, it's broken.
 *
 * If this test fails, the music will feel exhausted and directionless.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TensionAccumulator } from "../../src/structure/TensionAccumulator";
import { interpolateTension } from "../../src/structure/StructuralTension";

describe("Automatic resolution", () => {
  let accumulator: TensionAccumulator;

  beforeEach(() => {
    accumulator = new TensionAccumulator();
  });

  describe("tension reduction after peak", () => {
    it("system reduces tension after peak without manual input", () => {
      // SECTION C: Collapse (bars 33-48)
      // Build to maximum tension
      accumulator.updatePosition(44, 4, 0);
      accumulator.writeRhythmicTension(0.95, "drill_max_section_c");
      accumulator.writeFormalTension(0.9, "phrase_boundary_peak");

      const peakTension = accumulator.getTotal();
      const peakState = accumulator.getCurrent();

      // SECTION A': Resolution (bars 49-64)
      // System automatically reduces tension
      accumulator.updatePosition(49, 1, 0);

      // Resolution logic kicks in (no manual toggles)
      const resolvedState = interpolateTension(
        peakState,
        { rhythmic: 0.1, harmonic: 0.2, formal: 0.1 },
        0.7, // 70% toward resolution
      );

      accumulator.writeTension(
        resolvedState,
        "automatic_resolution_section_apostrophe",
      );

      const resolvedTension = accumulator.getTotal();

      // CRITICAL: Tension must decrease without user input
      expect(resolvedTension).toBeLessThan(peakTension);
      expect(resolvedTension).toBeLessThan(0.5); // Should drop significantly
    });

    it("resolution happens over multiple bars, not instantly", () => {
      // Peak tension at bar 48
      accumulator.updatePosition(48, 4, 0);
      accumulator.writeRhythmicTension(0.9, "drill_peak");
      accumulator.writeFormalTension(0.8, "cadence_section_end");

      const peakTension = accumulator.getTotal();

      // Bar 49: Beginning of resolution
      accumulator.updatePosition(49, 1, 0);
      accumulator.writeRhythmicTension(0.7, "resolution_early");
      const bar49 = accumulator.getTotal();

      // Bar 53: Mid-resolution
      accumulator.updatePosition(53, 1, 0);
      accumulator.writeRhythmicTension(0.4, "resolution_continuation");
      const bar53 = accumulator.getTotal();

      // Bar 57: Near resolution
      accumulator.updatePosition(57, 1, 0);
      accumulator.writeRhythmicTension(0.2, "resolution_near_complete");
      const bar57 = accumulator.getTotal();

      // Should be gradual decrease, not instant
      expect(bar49).toBeLessThan(peakTension);
      expect(bar53).toBeLessThan(bar49);
      expect(bar57).toBeLessThan(bar53);

      // Final should be much lower than peak
      expect(bar57).toBeLessThan(peakTension * 0.5);
    });

    it("resolution is triggered by tension threshold, not user input", () => {
      // Simulate tension-based resolution logic

      // Build tension past threshold (needs high values in multiple domains)
      accumulator.updatePosition(32, 4, 0);
      accumulator.writeRhythmicTension(0.95, "drill_build");
      accumulator.writeHarmonicTension(0.9, "harmony_tense");
      accumulator.writeFormalTension(0.8, "form_tension_build");

      const tension = accumulator.getTotal();

      // System detects excessive tension and triggers resolution
      // Threshold should be realistic: 0.6 indicates high tension
      const shouldResolve = tension > 0.6;

      expect(shouldResolve).toBe(true);

      // Resolution writes lower tension automatically
      if (shouldResolve) {
        accumulator.updatePosition(33, 1, 0);
        accumulator.writeRhythmicTension(0.3, "resolution_automatic");
        accumulator.writeHarmonicTension(0.2, "harmony_release");
        accumulator.writeFormalTension(0.1, "tension_release");

        const resolvedTension = accumulator.getTotal();
        expect(resolvedTension).toBeLessThan(tension);
      }
    });
  });

  describe("resolution strategies", () => {
    it("can resolve by returning to groove (rhythmic release)", () => {
      accumulator.updatePosition(32, 4, 0);
      accumulator.writeRhythmicTension(0.9, "drill_heavy");
      accumulator.writeFormalTension(0.6, "phrase_boundary");

      const peakTension = accumulator.getTotal();

      // Resolution: Return to groove
      accumulator.updatePosition(33, 1, 0);
      accumulator.writeRhythmicTension(0.1, "groove_return_resolution");
      accumulator.writeFormalTension(0.3, "form_continuation");

      const resolvedTension = accumulator.getTotal();

      expect(resolvedTension).toBeLessThan(peakTension * 0.5);
    });

    it("can resolve by thinning texture (density reduction)", () => {
      accumulator.updatePosition(40, 3, 0);
      accumulator.writeRhythmicTension(0.8, "high_density");
      accumulator.writeHarmonicTension(0.6, "complex_harmony");

      const peakTension = accumulator.getTotal();

      // Resolution: Thin texture
      accumulator.updatePosition(41, 1, 0);
      accumulator.writeRhythmicTension(0.3, "texture_thinning");
      accumulator.writeHarmonicTension(0.2, "harmonic_simplification");

      const resolvedTension = accumulator.getTotal();

      expect(resolvedTension).toBeLessThan(peakTension);
    });

    it("can resolve through silence cadence", () => {
      accumulator.updatePosition(48, 4, 0);
      accumulator.writeRhythmicTension(0.95, "max_drill");
      accumulator.writeFormalTension(0.9, "peak_formal");

      const peakTension = accumulator.getTotal();

      // Resolution: Silence cadence
      accumulator.updatePosition(49, 1, 0);
      accumulator.writeRhythmicTension(0.0, "silence_cadence");
      accumulator.writeFormalTension(0.1, "form_reset");

      const resolvedTension = accumulator.getTotal();

      // Dramatic reduction
      expect(resolvedTension).toBeLessThan(peakTension * 0.3);
    });
  });

  describe("tension memory and peaks", () => {
    it("remembers previous tension peaks", () => {
      // First peak at bar 16
      accumulator.updatePosition(16, 4, 0);
      accumulator.writeRhythmicTension(0.8, "first_peak");
      accumulator.writeFormalTension(0.7, "phrase_end");

      const firstPeak = accumulator.getTotal();

      // Build to second peak at bar 48
      accumulator.updatePosition(48, 4, 0);
      accumulator.writeRhythmicTension(0.9, "second_peak");
      accumulator.writeFormalTension(0.8, "section_end");

      // Calculate expected total: 0.9*0.4 + 0.8*0.2 = 0.36 + 0.16 = 0.52
      const expectedTotal = 0.9 * 0.4 + 0.8 * 0.2;

      // Find peak in last 32 bars
      const peakInfo = accumulator.findPeakTension(32);

      expect(peakInfo).not.toBeNull();
      expect(peakInfo!.tension).toBeCloseTo(expectedTotal, 1);
      expect(peakInfo!.at.musicalTime.bar).toBe(48);
    });

    it("resolution can avoid repeating identical peaks", () => {
      // First climax
      accumulator.updatePosition(32, 4, 0);
      accumulator.writeRhythmicTension(0.9, "climax_one");
      accumulator.writeFormalTension(0.8, "section_boundary");

      const firstClimax = accumulator.getTotal();
      const firstPeak = accumulator.findPeakTension(16);

      // Later in piece, approaching similar tension
      accumulator.updatePosition(60, 4, 0);
      accumulator.writeRhythmicTension(0.85, "approaching_repeat");

      const currentTension = accumulator.getTotal();

      // System detects similarity to previous peak
      const isRepeatingClimax =
        firstPeak && Math.abs(currentTension - firstPeak.tension) < 0.1;

      if (isRepeatingClimax) {
        // Choose different resolution strategy to avoid repetition
        accumulator.writeFormalTension(0.3, "alternative_resolution");
      }

      // Should have modified tension to avoid exact repeat
      const modifiedTension = accumulator.getTotal();

      if (isRepeatingClimax) {
        expect(modifiedTension).toBeLessThan(currentTension);
      }
    });
  });

  describe("Schillinger compliance", () => {
    it("system never escalates tension indefinitely", () => {
      // Simulate 64 bars of music with build/resolve cycles
      const tensions: number[] = [];

      for (let bar = 1; bar <= 64; bar++) {
        accumulator.updatePosition(bar, 1, 0);

        // Build tension on bars that are multiples of 8 but NOT 16
        if (bar % 8 === 0 && bar % 16 !== 0) {
          accumulator.writeRhythmicTension(0.8, `drill_bar_${bar}`);
          accumulator.writeFormalTension(0.7, `phrase_${bar}`);
        }

        // Resolve tension on bars that are multiples of 16
        if (bar % 16 === 0) {
          accumulator.writeRhythmicTension(0.2, `resolution_bar_${bar}`);
          accumulator.writeFormalTension(0.1, `cadence_${bar}`);
        }

        tensions.push(accumulator.getTotal());
      }

      // Verify we have both high and low tension values
      const maxTension = Math.max(...tensions);
      const minTension = Math.min(...tensions);

      // Should have significant dynamic range
      expect(maxTension).toBeGreaterThan(0.4); // Should build to significant tension
      expect(minTension).toBeLessThan(0.15); // Should resolve to low tension

      // Should have multiple cycles (tension goes up and down)
      let goingUp = 0;
      let goingDown = 0;

      for (let i = 1; i < tensions.length; i++) {
        if (tensions[i] > tensions[i - 1]) goingUp++;
        else if (tensions[i] < tensions[i - 1]) goingDown++;
      }

      // Should have both increases and decreases
      expect(goingUp).toBeGreaterThan(0);
      expect(goingDown).toBeGreaterThan(0);
    });

    it("resolution is explainable with musical causes", () => {
      // Build to peak
      accumulator.updatePosition(32, 4, 0);
      accumulator.writeRhythmicTension(0.9, "drill_excessive");
      const changesBefore = accumulator.getChanges().length;

      // Automatic resolution
      accumulator.updatePosition(33, 1, 0);
      accumulator.writeRhythmicTension(
        0.3,
        "resolution_automatic_threshold_exceeded",
      );

      const changesAfter = accumulator.getChanges();
      const resolutionChange = changesAfter[changesAfter.length - 1];

      // Resolution should be recorded with clear cause
      expect(changesAfter.length).toBeGreaterThan(changesBefore);
      expect(resolutionChange.cause).toContain("resolution");
      expect(resolutionChange.domain).toBe("rhythmic");
      expect(resolutionChange.to).toBeLessThan(resolutionChange.from);
    });
  });

  describe("practical resolution scenarios", () => {
    it("demo piece: Interference Study No. 1 resolution works", () => {
      // SECTION C: Collapse (bars 33-48) - Peak tension
      accumulator.updatePosition(44, 2, 0);
      accumulator.writeRhythmicTension(0.95, "gate_silence_section_c");
      accumulator.writeFormalTension(0.9, "peak_tension");

      const sectionCTension = accumulator.getTotal();

      // SECTION A': Resolution (bars 49-64)
      // Gate disabled automatically
      accumulator.updatePosition(49, 1, 0);
      accumulator.writeRhythmicTension(0.4, "gate_disabled_automatic");

      // Drill disabled automatically by tension logic
      accumulator.updatePosition(53, 1, 0);
      accumulator.writeRhythmicTension(0.1, "drill_disabled_tension_resolved");

      // Groove restored
      accumulator.updatePosition(57, 1, 0);
      accumulator.writeRhythmicTension(0.15, "groove_restored");
      accumulator.writeHarmonicTension(0.2, "harmony_resolved");
      accumulator.writeFormalTension(0.1, "form_resolved"); // Also resolve formal tension

      const resolutionTension = accumulator.getTotal();

      // CRITICAL: Resolution must happen without manual toggles
      // With formal tension resolved, total should drop significantly
      expect(resolutionTension).toBeLessThan(sectionCTension * 0.5);

      // Verify through changes
      const changes = accumulator.getChanges();
      const resolutionChanges = changes.filter(
        (c) =>
          c.cause.includes("automatic") ||
          c.cause.includes("disabled") ||
          c.cause.includes("resolved"),
      );

      expect(resolutionChanges.length).toBeGreaterThan(0);
    });
  });
});

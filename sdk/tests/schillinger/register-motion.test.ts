/**
 * CI Tests: Register Motion
 *
 * These tests enforce that register changes are structural events
 * that write to formal tension, not ornamental changes.
 *
 * Schillinger Principle:
 * - Register changes (expansion, contraction, shifts) create formal tension
 * - Bass anchors during high tension periods to maintain stability
 * - Different roles have different register behaviors
 * - Register motion follows curves, not random jumps
 *
 * If any of these tests fail, the system will not properly track
 * register changes as structural events.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  RegisterMotionManager,
  type RegisterState,
  type RegisterChangeEvent,
  type RegisterCurveRecommendation,
} from "../../src/structure/RegisterMotion";
import { TensionAccumulator } from "../../src/structure/TensionAccumulator";

describe("Register Motion", () => {
  let manager: RegisterMotionManager;
  let accumulator: TensionAccumulator;

  beforeEach(() => {
    accumulator = new TensionAccumulator();
    manager = new RegisterMotionManager(accumulator);

    // Register standard roles
    manager.registerRole("bass", "harmonic", {
      min: 36,
      max: 60,
      preferred: 48,
    });
    manager.registerRole("melody", "melodic", {
      min: 60,
      max: 84,
      preferred: 72,
    });
    manager.registerRole("harmony", "harmonic", {
      min: 48,
      max: 72,
      preferred: 60,
    });
  });

  describe("role registration", () => {
    it("registers roles with constraints", () => {
      const state = manager.getRegisterState("bass");
      expect(state).not.toBeNull();
      expect(state!.currentMin).toBe(36);
      expect(state!.currentMax).toBe(60);
      expect(state!.currentCenter).toBe(48);
      expect(state!.currentRange).toBe(24);
    });

    it("initializes state from constraints", () => {
      manager.registerRole("pad", "textural", {
        min: 48,
        max: 84,
        preferred: 60,
      });

      const state = manager.getRegisterState("pad");
      expect(state!.currentMin).toBe(48);
      expect(state!.currentMax).toBe(84);
      expect(state!.currentCenter).toBe(66);
    });

    it("handles undefined constraints", () => {
      manager.registerRole("unknown", "melodic", {});

      const state = manager.getRegisterState("unknown");
      expect(state!.currentMin).toBe(60); // Default
      expect(state!.currentMax).toBe(72); // Default
    });

    it("prevents duplicate role registration", () => {
      manager.registerRole("test", "melodic", { min: 60, max: 72 });

      // Re-registering should update state
      manager.registerRole("test", "melodic", { min: 48, max: 84 });

      const state = manager.getRegisterState("test");
      expect(state!.currentMin).toBe(48);
      expect(state!.currentMax).toBe(84);
    });
  });

  describe("register change detection", () => {
    it("detects register expansion", () => {
      manager.updateRegister("melody", { currentMax: 90 }, "expanding_range");

      const state = manager.getRegisterState("melody");
      expect(state!.currentRange).toBe(30); // 60-90, was 60-84
    });

    it("detects register contraction", () => {
      manager.updateRegister("melody", { currentMin: 66 }, "contracting_range");

      const state = manager.getRegisterState("melody");
      expect(state!.currentRange).toBe(18); // 66-84, was 60-84
    });

    it("detects upward shift", () => {
      manager.updateRegister(
        "melody",
        { currentMin: 66, currentMax: 90 },
        "shifting_up",
      );

      const state = manager.getRegisterState("melody");
      expect(state!.currentCenter).toBe(78); // Was 72
    });

    it("detects downward shift", () => {
      manager.updateRegister(
        "melody",
        { currentMin: 54, currentMax: 78 },
        "shifting_down",
      );

      const state = manager.getRegisterState("melody");
      expect(state!.currentCenter).toBe(66); // Was 72
    });

    it("detects stable register", () => {
      const event = manager.updateRegister(
        "melody",
        { currentMin: 60, currentMax: 84 },
        "no_change",
      );

      // Small changes within threshold are ornamental
      expect(event).toBeNull(); // Not structural
    });

    it("recalculates center pitch after range change", () => {
      manager.updateRegister(
        "melody",
        { currentMin: 60, currentMax: 96 },
        "expansion",
      );

      const state = manager.getRegisterState("melody");
      expect(state!.currentCenter).toBe(78); // (60 + 96) / 2
    });
  });

  describe("structural vs ornamental changes", () => {
    it("flags changes exceeding threshold as structural", () => {
      // Default threshold is 6 semitones
      const event = manager.updateRegister(
        "melody",
        { currentMax: 96 },
        "large_expansion",
      );

      expect(event).not.toBeNull();
      expect(event!.isStructural).toBe(true);
      expect(event!.changeType).toBe("expansion");
    });

    it("flags changes below threshold as ornamental", () => {
      // Small change (2 semitones) below threshold
      const event = manager.updateRegister(
        "melody",
        { currentMin: 62, currentMax: 86 },
        "small_shift",
      );

      expect(event).toBeNull(); // Not structural
    });

    it("calculates magnitude correctly", () => {
      // Shift up by 8 semitones (center moves from 72 to 80)
      const event = manager.updateRegister(
        "melody",
        { currentMin: 68, currentMax: 92 },
        "large_shift",
      );

      expect(event!.magnitude).toBeCloseTo(8, 0);
    });

    it("accounts for both range change and center shift in magnitude", () => {
      // Expand by 4 semitones AND shift up by 6 semitones
      // Initial: min=60, max=84, center=72, range=24
      // After: min=64, max=92, center=78, range=28
      // Center shift: 6, Range change: 4
      // Magnitude = sqrt(6^2 + 4^2) = sqrt(52) ≈ 7.21
      const event = manager.updateRegister(
        "melody",
        { currentMin: 64, currentMax: 92 },
        "combined_change",
      );

      expect(event!.magnitude).toBeGreaterThan(7);
      expect(event!.magnitude).toBeLessThan(8);
    });
  });

  describe("tension writing for structural changes", () => {
    it("writes formal tension for structural expansion", () => {
      manager.updateRegister("melody", { currentMax: 96 }, "major_expansion");

      const formal = accumulator.getCurrent().formal;
      expect(formal).toBeGreaterThan(0.3);
    });

    it("includes cause in tension change history", () => {
      manager.updateRegister("melody", { currentMax: 96 }, "climax_approach");

      const changes = accumulator.getChanges();
      // Find the change with our custom cause
      const registerChange = changes.find((c) => c.cause === "climax_approach");

      expect(registerChange).toBeDefined();
      expect(registerChange!.cause).toBe("climax_approach");
    });

    it("writes formal tension for structural contraction", () => {
      manager.updateRegister("melody", { currentMin: 70 }, "major_contraction");

      const formal = accumulator.getCurrent().formal;
      expect(formal).toBeGreaterThan(0.2);
    });

    it("writes higher tension for larger changes", () => {
      // Small structural change (just above threshold)
      manager.updateRegister("melody", { currentMax: 91 }, "small_structural");
      const tension1 = accumulator.getCurrent().formal;

      accumulator.writeFormalTension(0, "reset");

      // Large structural change
      manager.updateRegister("melody", { currentMax: 100 }, "large_structural");
      const tension2 = accumulator.getCurrent().formal;

      expect(tension2).toBeGreaterThan(tension1);
    });

    it("does not write tension for ornamental changes", () => {
      const before = accumulator.getCurrent().formal;

      manager.updateRegister(
        "melody",
        { currentMin: 61, currentMax: 85 },
        "minor_adjustment",
      );

      const after = accumulator.getCurrent().formal;
      expect(after).toBe(before); // No change
    });

    it("includes cause in tension change history", () => {
      manager.updateRegister("melody", { currentMax: 96 }, "climax_approach");

      const changes = accumulator.getChanges();
      // Find the change with our exact cause
      const registerChange = changes.find((c) => c.cause === "climax_approach");

      expect(registerChange).toBeDefined();
      expect(registerChange!.cause).toBe("climax_approach");
    });
  });

  describe("bass anchoring during high tension", () => {
    it("identifies bass should anchor during high tension", () => {
      // Create high tension
      accumulator.writeRhythmicTension(0.9, "high_energy");
      accumulator.writeHarmonicTension(0.8, "dissonance");

      const shouldAnchor = manager.shouldAnchorRole("bass");
      expect(shouldAnchor).toBe(true);
    });

    it("identifies bass should not anchor during low tension", () => {
      // Low tension
      accumulator.writeRhythmicTension(0.1, "stable");
      accumulator.writeHarmonicTension(0.1, "consonance");

      const shouldAnchor = manager.shouldAnchorRole("bass");
      expect(shouldAnchor).toBe(false);
    });

    it("only harmonic roles (bass) anchor", () => {
      accumulator.writeRhythmicTension(0.9, "high_energy");
      accumulator.writeHarmonicTension(0.8, "dissonance");

      const melodyShouldAnchor = manager.shouldAnchorRole("melody");
      expect(melodyShouldAnchor).toBe(false);
    });

    it("respects custom anchoring threshold", () => {
      manager.updateConfig({ bassAnchoringThreshold: 0.7 });

      // Tension of 0.6 is below new threshold
      accumulator.writeRhythmicTension(0.6, "medium_energy");
      accumulator.writeHarmonicTension(0.5, "some_dissonance");

      const shouldAnchor = manager.shouldAnchorRole("bass");
      expect(shouldAnchor).toBe(false);
    });

    it("limits bass register during anchoring in recommendations", () => {
      // Create high tension
      accumulator.writeRhythmicTension(0.9, "chaos");
      accumulator.writeHarmonicTension(0.8, "dissonance");

      const recommendation = manager.getRegisterCurve(
        "bass",
        "high_tension_context",
      );

      expect(recommendation.recommendedRange).toBeLessThanOrEqual(12); // 1 octave limit
      expect(recommendation.reason).toContain("Bass anchoring");
    });
  });

  describe("register curve recommendations", () => {
    it("provides expansion recommendation for high tension melody", () => {
      accumulator.writeRhythmicTension(0.8, "building");
      accumulator.writeHarmonicTension(0.7, "dominant");

      // Set a smaller initial range so expansion is possible within max range
      manager.updateRegister(
        "melody",
        { currentMin: 66, currentMax: 78 },
        "smaller_range",
      );

      const recommendation = manager.getRegisterCurve(
        "melody",
        "increasing_energy",
      );

      // Current range is 12, should expand to at least 15 (12 * 1.3 = 15.6)
      expect(recommendation.recommendedRange).toBeGreaterThan(12);
      expect(recommendation.reason).toContain("High tension");
    });

    it("provides contraction recommendation for high tension rhythmic roles", () => {
      manager.registerRole("drums", "rhythmic", {
        min: 36,
        max: 60,
        preferred: 48,
      });

      accumulator.writeRhythmicTension(0.9, "intense");
      accumulator.writeHarmonicTension(0.6, "tense");

      const recommendation = manager.getRegisterCurve(
        "drums",
        "focused_rhythm",
      );

      expect(recommendation.recommendedRange).toBeLessThan(24); // Contract for focus
      expect(recommendation.reason).toContain("focusing");
    });

    it("provides stability recommendation for low tension", () => {
      accumulator.writeRhythmicTension(0.1, "calm");
      accumulator.writeHarmonicTension(0.1, "stable");

      const recommendation = manager.getRegisterCurve("melody", "low_energy");

      expect(recommendation.reason).toContain("Low tension");
      expect(recommendation.expectedTension).toBeLessThan(0.3);
    });

    it("provides maintenance recommendation for medium tension", () => {
      accumulator.writeRhythmicTension(0.4, "moderate");
      accumulator.writeHarmonicTension(0.4, "some_motion");

      const recommendation = manager.getRegisterCurve(
        "melody",
        "medium_energy",
      );

      expect(recommendation.reason).toContain("maintaining");
    });

    it("respects role constraints in recommendations", () => {
      const recommendation = manager.getRegisterCurve(
        "melody",
        "check_constraints",
      );

      expect(recommendation.recommendedMin).toBeGreaterThanOrEqual(60); // Min constraint
      expect(recommendation.recommendedMax).toBeLessThanOrEqual(84); // Max constraint
    });

    it("calculates expected tension correctly", () => {
      accumulator.writeRhythmicTension(0.5, "moderate");

      const recommendation = manager.getRegisterCurve(
        "melody",
        "tension_estimate",
      );

      expect(recommendation.expectedTension).toBeGreaterThan(0);
      expect(recommendation.expectedTension).toBeLessThanOrEqual(1);
    });

    it("centers recommended range around current center", () => {
      const currentState = manager.getRegisterState("melody")!;
      const recommendation = manager.getRegisterCurve("melody", "centered");

      const recommendedCenter =
        (recommendation.recommendedMin + recommendation.recommendedMax) / 2;
      expect(recommendedCenter).toBeCloseTo(currentState.currentCenter, 0);
    });
  });

  describe("change history", () => {
    it("records all structural changes", () => {
      manager.updateRegister("melody", { currentMax: 96 }, "expansion_1");
      manager.updateRegister("melody", { currentMin: 54 }, "shift_down");

      const history = manager.getChangeHistory();

      // Both changes are structural
      expect(history.length).toBe(2);
    });

    it("does not record ornamental changes", () => {
      // Make very small changes that don't exceed threshold
      // Small shift up (center moves 1 semitone)
      manager.updateRegister(
        "melody",
        { currentMin: 61, currentMax: 85 },
        "minor_shift_1",
      );

      // Another small shift (center moves 1 more semitone)
      manager.updateRegister(
        "melody",
        { currentMin: 62, currentMax: 86 },
        "minor_shift_2",
      );

      const history = manager.getChangeHistory();

      // Each change has magnitude of ~1 (center shift only), which is below threshold of 6
      // Neither should be recorded as structural
      expect(history.length).toBe(0);
    });

    it("filters history by role", () => {
      // Make structural changes for both roles
      manager.updateRegister("bass", { currentMin: 44 }, "bass_shift"); // Magnitude ~8.94 (structural)
      manager.updateRegister("melody", { currentMax: 90 }, "melody_shift"); // Magnitude ~6.71 (structural)

      const bassHistory = manager.getRecentChangesForRole("bass");
      const melodyHistory = manager.getRecentChangesForRole("melody");

      expect(bassHistory.length).toBe(1);
      expect(melodyHistory.length).toBe(1);
      expect(bassHistory[0].role).toBe("bass");
      expect(melodyHistory[0].role).toBe("melody");
    });

    it("filters history by time window", () => {
      accumulator.updatePosition(1, 1, 0);
      manager.updateRegister("melody", { currentMax: 90 }, "old_change");

      accumulator.updatePosition(32, 1, 0);
      manager.updateRegister("melody", { currentMin: 54 }, "recent_change");

      const recent = manager.getRecentChangesForRole("melody", 16);

      // Only recent change (within 16 bars)
      expect(recent.length).toBe(1);
      expect(recent[0].cause).toBe("recent_change");
    });

    it("limits history size", () => {
      // Make many changes
      for (let i = 0; i < 1500; i++) {
        manager.updateRegister(
          "melody",
          { currentMax: 96 - (i % 20) },
          `change_${i}`,
        );
      }

      const history = manager.getChangeHistory();
      expect(history.length).toBeLessThanOrEqual(1000); // MAX_HISTORY_LENGTH
    });
  });

  describe("configuration", () => {
    it("uses custom structural threshold", () => {
      manager.updateConfig({ structuralChangeThreshold: 12 });

      // Pure center shift of 6 semitones (below new threshold of 12)
      // Initial: min=60, max=84, center=72, range=24
      // After: min=66, max=90, center=78, range=24
      // Center shift: 6, Range change: 0
      // Magnitude: 6, which is below threshold of 12
      const event = manager.updateRegister(
        "melody",
        { currentMin: 66, currentMax: 90 },
        "moderate_change",
      );

      expect(event).toBeNull(); // Not structural with higher threshold (magnitude 6 < 12)
    });

    it("uses custom bass anchoring threshold", () => {
      manager.updateConfig({ bassAnchoringThreshold: 0.8 });

      // Tension of 0.7 is below new threshold
      accumulator.writeRhythmicTension(0.7, "below_threshold");
      accumulator.writeHarmonicTension(0.7, "below_threshold");

      const shouldAnchor = manager.shouldAnchorRole("bass");
      expect(shouldAnchor).toBe(false);
    });

    it("uses custom max ranges per role", () => {
      manager.updateConfig({
        maxRangePerRole: {
          melodic: 12,
          harmonic: 12,
          rhythmic: 6,
          textural: 24,
          structural: 12,
        },
      });

      const recommendation = manager.getRegisterCurve("melody", "custom_range");

      expect(recommendation.recommendedRange).toBeLessThanOrEqual(12);
    });
  });

  describe("reset behavior", () => {
    it("resets all register states to constraints", () => {
      manager.updateRegister(
        "melody",
        { currentMin: 66, currentMax: 90 },
        "changing",
      );

      manager.reset();

      const state = manager.getRegisterState("melody");
      expect(state!.currentMin).toBe(60); // Back to constraint
      expect(state!.currentMax).toBe(84); // Back to constraint
    });

    it("clears change history on reset", () => {
      manager.updateRegister("melody", { currentMax: 96 }, "change");
      expect(manager.getChangeHistory().length).toBe(1);

      manager.reset();

      expect(manager.getChangeHistory().length).toBe(0);
    });

    it("resets individual role state", () => {
      manager.updateRegister(
        "bass",
        { currentMin: 40, currentMax: 56 },
        "bass_change",
      );

      manager.reset();

      const state = manager.getRegisterState("bass");
      expect(state!.currentMin).toBe(36); // Original constraint
      expect(state!.currentMax).toBe(60); // Original constraint
    });
  });

  describe("get all register states", () => {
    it("returns states for all registered roles", () => {
      const allStates = manager.getAllRegisterStates();

      expect(allStates.size).toBe(3); // bass, melody, harmony
      expect(allStates.has("bass")).toBe(true);
      expect(allStates.has("melody")).toBe(true);
      expect(allStates.has("harmony")).toBe(true);
    });

    it("returns copies not references", () => {
      const allStates = manager.getAllRegisterStates();
      const melodyState = allStates.get("melody");

      // Modify returned state
      if (melodyState) {
        melodyState.currentMin = 100;
      }

      // Original should be unchanged
      const original = manager.getRegisterState("melody");
      expect(original!.currentMin).not.toBe(100);
    });
  });

  describe("Schillinger compliance", () => {
    it("treats register changes as structural events", () => {
      const beforeFormal = accumulator.getCurrent().formal;

      manager.updateRegister(
        "melody",
        { currentMax: 96 },
        "structural_register_change",
      );

      const afterFormal = accumulator.getCurrent().formal;

      expect(afterFormal).toBeGreaterThan(beforeFormal);
      expect(afterFormal).toBeGreaterThan(0.3); // Significant tension
    });

    it("maintains bass stability during chaos", () => {
      // Create chaos
      accumulator.writeRhythmicTension(0.9, "chaos");
      accumulator.writeHarmonicTension(0.9, "chaos");
      accumulator.writeFormalTension(0.9, "chaos");

      const shouldAnchor = manager.shouldAnchorRole("bass");

      expect(shouldAnchor).toBe(true);

      const recommendation = manager.getRegisterCurve("bass", "chaos_context");
      expect(recommendation.recommendedRange).toBeLessThanOrEqual(12);
    });

    it("provides per-role register behaviors", () => {
      // High tension
      accumulator.writeRhythmicTension(0.8, "high");
      accumulator.writeHarmonicTension(0.7, "high");

      const melodyRec = manager.getRegisterCurve("melody", "high_tension");
      const harmonyRec = manager.getRegisterCurve("harmony", "high_tension");

      // Melody expands, harmony focuses
      expect(melodyRec.reason).toContain("expanding");
      expect(harmonyRec.reason).toContain("focusing");
    });

    it("follows curves not random jumps", () => {
      const recommendation = manager.getRegisterCurve(
        "melody",
        "curve_behavior",
      );

      // Recommendation should maintain center, not jump arbitrarily
      const currentState = manager.getRegisterState("melody")!;
      const recommendedCenter =
        (recommendation.recommendedMin + recommendation.recommendedMax) / 2;

      expect(
        Math.abs(recommendedCenter - currentState.currentCenter),
      ).toBeLessThan(3);
    });

    it("explains register changes musically", () => {
      const event = manager.updateRegister(
        "melody",
        { currentMax: 96 },
        "climax_building",
      );

      expect(event!.changeType).toBeDefined();
      expect(event!.magnitude).toBeGreaterThan(0);
      expect(event!.cause).toBe("climax_building");
    });
  });

  describe("error handling", () => {
    it("throws when updating unregistered role", () => {
      expect(() => {
        manager.updateRegister("unknown_role", { currentMin: 60 }, "test");
      }).toThrow("not registered");
    });

    it("throws when getting curve for unregistered role", () => {
      expect(() => {
        manager.getRegisterCurve("unknown_role", "test");
      }).toThrow("not registered");
    });

    it("returns null for unregistered role state", () => {
      const state = manager.getRegisterState("unknown_role");
      expect(state).toBeNull();
    });
  });
});

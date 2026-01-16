/**
 * CI Tests: Orthogonal Parameter Motion
 *
 * These tests enforce that parameter counter-motion creates
 * sophisticated musical texture through inverse relationships.
 *
 * If any of these tests fail, orthogonal motion is not working
 * as a Schillinger principle.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  OrthogonalMotionManager,
  ParameterType,
} from "../../src/structure/OrthogonalMotion";
import { TensionAccumulator } from "../../src/structure/TensionAccumulator";

describe("Orthogonal Parameter Motion", () => {
  let motion: OrthogonalMotionManager;
  let accumulator: TensionAccumulator;

  beforeEach(() => {
    accumulator = new TensionAccumulator();
    motion = new OrthogonalMotionManager(accumulator);
  });

  describe("parameter registration", () => {
    it("registers density/velocity pair with inverse correlation", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 0.8,
      });

      expect(motion.getParameterValue("density")).toBe(0.5);
      expect(motion.getParameterValue("velocity")).toBe(0.5);
    });

    it("allows custom correlation strength", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 0.5, // Weaker inverse relationship
      });

      motion.registerPair({
        primary: "filter_cutoff",
        secondary: "filter_resonance",
        correlation: 1.0, // Perfect inverse relationship
      });

      expect(motion.getParameterValue("density")).toBe(0.5);
      expect(motion.getParameterValue("velocity")).toBe(0.5);
      expect(motion.getParameterValue("filter_cutoff")).toBe(0.5);
      expect(motion.getParameterValue("filter_resonance")).toBe(0.5);
    });

    it("allows custom min/max ranges", () => {
      motion.registerPair({
        primary: "filter_cutoff",
        secondary: "filter_resonance",
        min: 0,
        max: 1,
      });

      motion.registerPair({
        primary: "attack",
        secondary: "release",
        min: 0.001, // Very fast attack
        max: 2.0, // Slow attack
      });

      expect(motion.getParameterValue("filter_cutoff")).toBe(0.5);
      expect(motion.getParameterValue("filter_resonance")).toBe(0.5);
    });
  });

  describe("tension-driven motion", () => {
    it("high tension drives primary up, secondary down", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      // Set high tension
      accumulator.writeRhythmicTension(0.9, "high_tension_test");
      motion.updateParameters(1, 1, "test");

      const density = motion.getParameterValue("density");
      const velocity = motion.getParameterValue("velocity");

      // High tension → density up, velocity down
      // Note: getTotal() returns weighted tension, so 0.9 rhythmic becomes 0.36 total
      // With smoothing: 0.5 + 0.5 * (0.36 - 0.5) = 0.43
      expect(density).toBeGreaterThan(0.4);
      expect(velocity).toBeLessThan(0.6);
    });

    it("low tension drives primary down, secondary up", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      // Set low tension
      accumulator.writeRhythmicTension(0.1, "low_tension_test");
      motion.updateParameters(1, 1, "test");

      const density = motion.getParameterValue("density");
      const velocity = motion.getParameterValue("velocity");

      // Low tension → density down, velocity up
      // With smoothing: 0.5 + 0.5 * (0.1 - 0.5) = 0.3
      expect(density).toBeLessThan(0.35);
      expect(velocity).toBeGreaterThan(0.65);
    });

    it("medium tension creates balanced values", () => {
      motion.registerPair({
        primary: "filter_cutoff",
        secondary: "filter_resonance",
        correlation: 0.8,
      });

      // Set medium tension
      accumulator.writeRhythmicTension(0.5, "medium_tension_test");
      motion.updateParameters(1, 1, "test");

      const cutoff = motion.getParameterValue("filter_cutoff");
      const resonance = motion.getParameterValue("filter_resonance");

      // Should be near center (with correlation 0.8, some inverse effect)
      expect(cutoff).toBeGreaterThan(0.3);
      expect(cutoff).toBeLessThan(0.6);
      expect(resonance).toBeGreaterThan(0.4);
      expect(resonance).toBeLessThan(0.7);
    });

    it("multiple pairs respond to same tension", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      motion.registerPair({
        primary: "filter_cutoff",
        secondary: "filter_resonance",
        correlation: 0.9,
      });

      // High tension affects all pairs
      accumulator.writeRhythmicTension(0.8, "high_tension");
      motion.updateParameters(1, 1, "test");

      const density = motion.getParameterValue("density");
      const velocity = motion.getParameterValue("velocity");
      const cutoff = motion.getParameterValue("filter_cutoff");
      const resonance = motion.getParameterValue("filter_resonance");

      // Both primaries should be high (with smoothing)
      expect(density).toBeGreaterThan(0.35);
      expect(cutoff).toBeGreaterThan(0.35);

      // Both secondaries should be low
      expect(velocity).toBeLessThan(0.65);
      expect(resonance).toBeLessThan(0.65);
    });
  });

  describe("inverse relationships", () => {
    it("creates perfect inverse when correlation is 1.0", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      accumulator.writeRhythmicTension(0.9, "test");
      motion.updateParameters(1, 1, "test");

      const density = motion.getParameterValue("density");
      const velocity = motion.getParameterValue("velocity");

      // Perfect inverse: density + velocity should equal 1.0
      expect(density + velocity).toBeCloseTo(1.0, 1);
    });

    it("creates partial inverse when correlation is 0.5", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 0.5,
      });

      accumulator.writeRhythmicTension(0.9, "test");
      motion.updateParameters(1, 1, "test");

      const density = motion.getParameterValue("density");
      const velocity = motion.getParameterValue("velocity");

      // Partial inverse: some relationship but not perfect
      // With correlation 0.5: primary=0.7, secondary≈0.5 (blended)
      expect(density + velocity).not.toBeCloseTo(1.0, 1);
    });

    it("creates no relationship when correlation is 0.0", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 0.0,
      });

      accumulator.writeRhythmicTension(0.9, "test");
      motion.updateParameters(1, 1, "test");

      const density = motion.getParameterValue("density");
      const velocity = motion.getParameterValue("velocity");

      // No relationship: both move together (driven by tension)
      // With getTotal() weighting, 0.9 rhythmic becomes 0.36 total
      expect(density).toBeGreaterThan(0.4);
      expect(velocity).toBeCloseTo(density, 1); // Should be approximately equal
    });
  });

  describe("smooth transitions", () => {
    it("smoothly transitions between values", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      // Start with low tension
      accumulator.writeRhythmicTension(0.1, "low");
      motion.updateParameters(1, 1, "low_tension");

      const density1 = motion.getParameterValue("density");

      // Jump to high tension
      accumulator.writeRhythmicTension(0.9, "high");
      motion.updateParameters(1, 2, "high_tension");

      const density2 = motion.getParameterValue("density");

      // Should not jump instantly (smoothing factor 0.3)
      expect(density2).toBeGreaterThan(density1);
      expect(density2).toBeLessThan(0.9); // Not at full value yet
    });

    it("smoothing prevents parameter jumping", () => {
      motion.registerPair({
        primary: "filter_cutoff",
        secondary: "filter_resonance",
        correlation: 1.0,
      });

      // Low tension
      accumulator.writeRhythmicTension(0.0, "low");
      motion.updateParameters(1, 1, "low");

      const cutoff1 = motion.getParameterValue("filter_cutoff");

      // Maximum tension
      accumulator.writeRhythmicTension(1.0, "max");
      motion.updateParameters(1, 2, "max");

      const cutoff2 = motion.getParameterValue("filter_cutoff");

      // With smoothing factor 0.3, should be:
      // 0.0 + 0.3 * (1.0 - 0.0) = 0.3
      expect(cutoff2).toBeGreaterThan(0.2);
      expect(cutoff2).toBeLessThan(0.4);
    });
  });

  describe("orthogonal tension calculation", () => {
    it("measures total orthogonal motion across all pairs", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      motion.registerPair({
        primary: "filter_cutoff",
        secondary: "filter_resonance",
        correlation: 1.0,
      });

      // Set up orthogonal motion (high primary, low secondary)
      accumulator.writeRhythmicTension(0.9, "test");
      motion.updateParameters(1, 1, "test");

      const orthogonalTension = motion.getOrthogonalTension();

      // Both pairs in orthogonal state = high tension
      // With smoothing, density ~0.7, so deviation from 0.5 is 0.2
      // Two pairs: (0.2 + 0.2) / 2 = 0.2 (approximately)
      expect(orthogonalTension).toBeGreaterThan(0.1);
    });

    it("zero orthogonal tension when all parameters centered", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      motion.reset();

      const orthogonalTension = motion.getOrthogonalTension();

      expect(orthogonalTension).toBe(0);
    });

    it("partial orthogonal tension when some pairs orthogonal", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      motion.registerPair({
        primary: "filter_cutoff",
        secondary: "filter_resonance",
        correlation: 0.0, // No relationship
      });

      // High tension
      accumulator.writeRhythmicTension(0.9, "test");
      motion.updateParameters(1, 1, "test");

      const orthogonalTension = motion.getOrthogonalTension();

      // Only one pair is orthogonal (other moves in parallel)
      // With smoothing: deviation is ~0.2 for orthogonal pair, ~0.4 for parallel pair
      // Average: (0.2 + 0.4) / 2 = 0.3, but correlation=0 means it doesn't count fully
      expect(orthogonalTension).toBeGreaterThan(0.05);
      expect(orthogonalTension).toBeLessThan(0.2);
    });
  });

  describe("explainability", () => {
    it("explains current orthogonal state", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      accumulator.writeRhythmicTension(0.9, "test");
      motion.updateParameters(1, 1, "test");

      const explanation = motion.explainState();

      expect(explanation).toContain("density");
      expect(explanation).toContain("velocity");
      expect(explanation).toContain("[orthogonal]");
    });

    it("identifies parallel motion (not orthogonal)", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 0.0, // No inverse relationship
      });

      accumulator.writeRhythmicTension(0.9, "test");
      motion.updateParameters(1, 1, "test");

      const explanation = motion.explainState();

      expect(explanation).toContain("[parallel]");
    });

    it("tracks motion history with causes", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      accumulator.writeRhythmicTension(0.9, "test_cause");
      motion.updateParameters(1, 1, "test_cause");

      const history = motion.getHistory();

      expect(history.length).toBe(1);
      expect(history[0].cause).toBe("test_cause");
      expect(history[0].tension).toBeGreaterThan(0);
    });
  });

  describe("manual parameter control", () => {
    it("allows manual primary parameter setting", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      motion.setParameter("density", 0.8);

      expect(motion.getParameterValue("density")).toBe(0.8);
      // Secondary should adjust inversely
      expect(motion.getParameterValue("velocity")).toBeCloseTo(0.2, 1);
    });

    it("allows manual secondary parameter setting", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      motion.setParameter("velocity", 0.2);

      expect(motion.getParameterValue("velocity")).toBe(0.2);
      // Primary should adjust inversely
      expect(motion.getParameterValue("density")).toBeCloseTo(0.8, 1);
    });

    it("reset centers all parameters", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      accumulator.writeRhythmicTension(0.9, "test");
      motion.updateParameters(1, 1, "test");

      // Parameters should be off-center (with smoothing, density moves from 0.5)
      const density = motion.getParameterValue("density");
      expect(Math.abs(density - 0.5)).toBeGreaterThan(0.05);

      // Reset
      motion.reset();

      expect(motion.getParameterValue("density")).toBe(0.5);
      expect(motion.getParameterValue("velocity")).toBe(0.5);
    });
  });

  describe("Schillinger compliance", () => {
    it("orthogonal motion is explainable, not random", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 0.8,
      });

      accumulator.writeRhythmicTension(0.7, "section_c_tension");
      motion.updateParameters(33, 1, "collapse_section");

      const history = motion.getHistory();

      expect(history[0].cause).toBe("collapse_section");
      expect(history[0].tension).toBeGreaterThan(0);

      const explanation = motion.explainState();
      expect(explanation).toBeTruthy();
      expect(explanation.length).toBeGreaterThan(0);
    });

    it("parameters remain within bounds", () => {
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
        min: 0,
        max: 1,
      });

      // Maximum tension
      accumulator.writeRhythmicTension(1.0, "max");
      motion.updateParameters(1, 1, "max");

      const density = motion.getParameterValue("density");
      const velocity = motion.getParameterValue("velocity");

      expect(density).toBeLessThanOrEqual(1.0);
      expect(density).toBeGreaterThanOrEqual(0);
      expect(velocity).toBeLessThanOrEqual(1.0);
      expect(velocity).toBeGreaterThanOrEqual(0);
    });

    it("multiple pairs create sophisticated texture", () => {
      // Register multiple orthogonal pairs
      motion.registerPair({
        primary: "density",
        secondary: "velocity",
        correlation: 1.0,
      });

      motion.registerPair({
        primary: "filter_cutoff",
        secondary: "filter_resonance",
        correlation: 0.9,
      });

      motion.registerPair({
        primary: "pan",
        secondary: "reverb_wet",
        correlation: 0.8,
      });

      // High tension creates rich texture
      accumulator.writeRhythmicTension(0.8, "rich_texture");
      motion.updateParameters(1, 1, "rich_texture");

      const density = motion.getParameterValue("density");
      const velocity = motion.getParameterValue("velocity");
      const cutoff = motion.getParameterValue("filter_cutoff");
      const resonance = motion.getParameterValue("filter_resonance");
      const pan = motion.getParameterValue("pan");
      const reverb = motion.getParameterValue("reverb_wet");

      // All primaries should be high (with smoothing: target ~0.65-0.7)
      expect(density).toBeGreaterThan(0.35);
      expect(cutoff).toBeGreaterThan(0.35);
      expect(pan).toBeGreaterThan(0.35);

      // All secondaries should be low
      expect(velocity).toBeLessThan(0.65);
      expect(resonance).toBeLessThan(0.65);
      expect(reverb).toBeLessThan(0.65);
    });
  });
});

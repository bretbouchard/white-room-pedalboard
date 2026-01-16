/**
 * Curve Engine Unit Tests
 *
 * Comprehensive test suite for the Curve Engine with >80% coverage target.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CurveEngine } from "../CurveEngine";
import { Curve, CurvePoint, CurveType } from "../CurveTypes";

describe("CurveEngine", () => {
  let engine: CurveEngine;

  beforeEach(() => {
    engine = new CurveEngine();
  });

  describe("Basic Evaluation", () => {
    it("should evaluate empty curve", () => {
      const curve: Curve = {
        id: "test-1",
        name: "Empty Curve",
        points: [],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = engine.evaluate(curve, 0.5);
      expect(result.value).toBe(0);
      expect(result.slope).toBe(0);
      expect(result.curvature).toBe(0);
    });

    it("should evaluate single point curve", () => {
      const curve: Curve = {
        id: "test-2",
        name: "Single Point",
        points: [{ id: "p1", time: 0.5, value: 0.75, curveType: "linear" }],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = engine.evaluate(curve, 0.5);
      expect(result.value).toBe(0.75);
      expect(result.slope).toBe(0);
      expect(result.curvature).toBe(0);
    });

    it("should evaluate two point linear curve", () => {
      const curve: Curve = {
        id: "test-3",
        name: "Linear",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = engine.evaluate(curve, 0.5);
      expect(result.value).toBeCloseTo(0.5, 5);
      expect(result.slope).toBeCloseTo(1, 5);
    });
  });

  describe("Interpolation Types", () => {
    const createCurve = (curveType: CurveType): Curve => ({
      id: `test-${curveType}`,
      name: `${curveType} Curve`,
      points: [
        { id: "p1", time: 0, value: 0, curveType },
        { id: "p2", time: 1, value: 1, curveType: "linear" },
      ],
      minValue: 0,
      maxValue: 1,
      minTime: 0,
      maxTime: 1,
      loop: false,
      loopStart: 0,
      loopEnd: 1,
    });

    it("should interpolate linearly", () => {
      const curve = createCurve("linear");
      const result = engine.evaluate(curve, 0.5);
      expect(result.value).toBeCloseTo(0.5, 5);
    });

    it("should interpolate exponentially", () => {
      const curve = createCurve("exponential");
      const result = engine.evaluate(curve, 0.5);
      // Exponential from 0-1 with factor 1 equals linear at midpoint
      // (special case when going from 0)
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
    });

    it("should interpolate logarithmically", () => {
      const curve = createCurve("logarithmic");
      const result = engine.evaluate(curve, 0.5);
      // Logarithmic from 0-1 equals linear (special case)
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
    });

    it("should interpolate with sine", () => {
      const curve = createCurve("sine");
      const result = engine.evaluate(curve, 0.5);
      // Sine interpolation at midpoint
      expect(result.value).toBeCloseTo(0.5, 4);
    });

    it("should interpolate with step", () => {
      const curve = createCurve("step");
      const result1 = engine.evaluate(curve, 0.4);
      const result2 = engine.evaluate(curve, 0.6);
      // Step should hold first value until midpoint
      expect(result1.value).toBe(0);
      expect(result2.value).toBe(1);
    });

    it("should interpolate with smooth (hermite)", () => {
      const curve: Curve = {
        id: "test-smooth",
        name: "Smooth Curve",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "smooth", tension: 0 },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = engine.evaluate(curve, 0.5);
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThan(1);
    });

    it("should interpolate with catmull-rom", () => {
      const curve = createCurve("catmull-rom");
      const result = engine.evaluate(curve, 0.5);
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThan(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle out-of-bounds time (before start)", () => {
      const curve: Curve = {
        id: "test-oob1",
        name: "OOB Before",
        points: [
          { id: "p1", time: 0.5, value: 0.5, curveType: "linear" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0.5,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = engine.evaluate(curve, 0);
      expect(result.value).toBe(0.5); // Clamped to first point
    });

    it("should handle out-of-bounds time (after end)", () => {
      const curve: Curve = {
        id: "test-oob2",
        name: "OOB After",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 0.5, value: 0.5, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 0.5,
        loop: false,
        loopStart: 0,
        loopEnd: 0.5,
      };

      const result = engine.evaluate(curve, 1);
      expect(result.value).toBe(0.5); // Clamped to last point
    });

    it("should handle zero-length segment", () => {
      const curve: Curve = {
        id: "test-zero",
        name: "Zero Length",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 0, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 0,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
      };

      const result = engine.evaluate(curve, 0);
      expect(result.value).toBe(0); // Returns first point value
    });

    it("should handle exponential with negative values", () => {
      const curve: Curve = {
        id: "test-neg-exp",
        name: "Negative Exponential",
        points: [
          { id: "p1", time: 0, value: -1, curveType: "exponential" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: -1,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = engine.evaluate(curve, 0.5);
      // Should fallback to linear for negative values
      expect(result.value).toBeCloseTo(0, 5);
    });

    it("should handle logarithmic with zero values", () => {
      const curve: Curve = {
        id: "test-zero-log",
        name: "Zero Logarithmic",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "logarithmic" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = engine.evaluate(curve, 0.5);
      // Should fallback to linear for zero values
      expect(result.value).toBeCloseTo(0.5, 5);
    });
  });

  describe("Looping", () => {
    it("should handle looping", () => {
      const curve: Curve = {
        id: "test-loop",
        name: "Looping Curve",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: true,
        loopStart: 0,
        loopEnd: 1,
      };

      const result1 = engine.evaluate(curve, 0.5);
      const result2 = engine.evaluate(curve, 1.5); // Should wrap to 0.5
      const result3 = engine.evaluate(curve, 2.5); // Should wrap to 0.5

      expect(result1.value).toBeCloseTo(result2.value, 5);
      expect(result2.value).toBeCloseTo(result3.value, 5);
    });

    it("should handle partial loop region", () => {
      const curve: Curve = {
        id: "test-partial-loop",
        name: "Partial Loop",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
          { id: "p3", time: 2, value: 0.5, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 2,
        loop: true,
        loopStart: 0,
        loopEnd: 1,
      };

      const result1 = engine.evaluate(curve, 0.5);
      const result2 = engine.evaluate(curve, 1.5); // Should wrap to 0.5

      expect(result1.value).toBeCloseTo(result2.value, 5);
    });

    it("should handle non-looping curve", () => {
      const curve: Curve = {
        id: "test-no-loop",
        name: "No Loop",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result1 = engine.evaluate(curve, 0.5);
      const result2 = engine.evaluate(curve, 1.5); // Should clamp to end

      expect(result2.value).toBe(1); // Clamped to last point
    });
  });

  describe("Derivatives", () => {
    it("should calculate slope correctly for linear", () => {
      const curve: Curve = {
        id: "test-slope",
        name: "Slope Test",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = engine.evaluate(curve, 0.5);
      expect(result.slope).toBeCloseTo(1, 2); // Slope of 1:1 line
    });

    it("should calculate curvature", () => {
      const curve: Curve = {
        id: "test-curve",
        name: "Curvature Test",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "sine" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = engine.evaluate(curve, 0.5);
      // Curvature should be non-zero for non-linear curves
      expect(result.curvature).not.toBe(0);
    });

    it("should have zero slope for flat segment", () => {
      const curve: Curve = {
        id: "test-flat",
        name: "Flat Segment",
        points: [
          { id: "p1", time: 0, value: 0.5, curveType: "linear" },
          { id: "p2", time: 1, value: 0.5, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = engine.evaluate(curve, 0.5);
      expect(result.slope).toBeCloseTo(0, 5);
    });
  });

  describe("Cache Management", () => {
    it("should clear cache", () => {
      const curve: Curve = {
        id: "test-cache",
        name: "Cache Test",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      // Evaluate to populate cache
      engine.evaluate(curve, 0.5);

      // Clear cache
      engine.clearCache();

      // Should still work after cache clear
      const result = engine.evaluate(curve, 0.5);
      expect(result.value).toBeCloseTo(0.5, 5);
    });
  });

  describe("Performance", () => {
    it("should evaluate quickly (<100μs target)", () => {
      const curve: Curve = {
        id: "test-perf",
        name: "Performance Test",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 1, value: 1, curveType: "linear" },
          { id: "p3", time: 2, value: 0.5, curveType: "sine" },
          { id: "p4", time: 3, value: 0.75, curveType: "exponential" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 3,
        loop: false,
        loopStart: 0,
        loopEnd: 3,
      };

      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        engine.evaluate(curve, (i % 30) / 10);
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      // Target: <100μs (0.1ms) per evaluation
      expect(avgTime).toBeLessThan(0.1);
    });
  });
});

/**
 * Curve Utils Unit Tests
 *
 * Comprehensive test suite for Curve Utilities with >80% coverage target.
 */

import { describe, it, expect } from "vitest";
import { CurveUtils } from "../CurveUtils";
import { Curve, CurvePoint, CurveOptimizationOptions } from "../CurveTypes";

describe("CurveUtils", () => {
  const createTestCurve = (): Curve => ({
    id: "test-curve",
    name: "Test Curve",
    points: [
      { id: "p1", time: 0, value: 0, curveType: "linear" },
      { id: "p2", time: 0.5, value: 0.5, curveType: "linear" },
      { id: "p3", time: 1, value: 1, curveType: "linear" },
    ],
    minValue: 0,
    maxValue: 1,
    minTime: 0,
    maxTime: 1,
    loop: false,
    loopStart: 0,
    loopEnd: 1,
  });

  describe("Validation", () => {
    it("should validate correct curve", () => {
      const curve = createTestCurve();
      const result = CurveUtils.validate(curve);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect empty curve", () => {
      const curve: Curve = {
        id: "empty",
        name: "Empty",
        points: [],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const result = CurveUtils.validate(curve);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Curve must have at least one point");
    });

    it("should detect unsorted points", () => {
      const curve = createTestCurve();
      curve.points[1].time = 2; // Out of order

      const result = CurveUtils.validate(curve);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should detect duplicate times", () => {
      const curve = createTestCurve();
      curve.points[1].time = 0; // Duplicate time

      const result = CurveUtils.validate(curve);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate time"))).toBe(true);
    });

    it("should warn about out-of-range values", () => {
      const curve = createTestCurve();
      curve.points[1].value = 2; // Outside range

      const result = CurveUtils.validate(curve);

      expect(result.isValid).toBe(true); // Still valid, just warning
      expect(result.warnings.some((w) => w.includes("outside range"))).toBe(true);
    });

    it("should detect invalid loop configuration", () => {
      const curve = createTestCurve();
      curve.loop = true;
      curve.loopStart = 1;
      curve.loopEnd = 0.5; // End before start

      const result = CurveUtils.validate(curve);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Loop start"))).toBe(true);
    });

    it("should warn about loop outside bounds", () => {
      const curve = createTestCurve();
      curve.loop = true;
      curve.loopStart = -0.5;
      curve.loopEnd = 1.5;

      const result = CurveUtils.validate(curve);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes("extends beyond curve bounds"))).toBe(true);
    });

    it("should detect invalid time range", () => {
      const curve = createTestCurve();
      curve.minTime = 1;
      curve.maxTime = 0;

      const result = CurveUtils.validate(curve);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Min time"))).toBe(true);
    });

    it("should detect invalid value range", () => {
      const curve = createTestCurve();
      curve.minValue = 1;
      curve.maxValue = 0;

      const result = CurveUtils.validate(curve);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Min value"))).toBe(true);
    });
  });

  describe("Optimization", () => {
    it("should optimize with redundant point removal", () => {
      const curve: Curve = {
        id: "redundant",
        name: "Redundant Points",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 0.25, value: 0.25, curveType: "linear" },
          { id: "p3", time: 0.5, value: 0.5, curveType: "linear" },
          { id: "p4", time: 0.75, value: 0.75, curveType: "linear" },
          { id: "p5", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const options: CurveOptimizationOptions = {
        tolerance: 0.01,
        minPointSpacing: 0,
        removeRedundant: true,
        simplifyLinear: false,
      };

      const optimized = CurveUtils.optimize(curve, options);

      // Should remove middle points on straight line
      expect(optimized.points.length).toBeLessThan(curve.points.length);
      expect(optimized.points.length).toBe(2); // Just endpoints
    });

    it("should optimize with linear simplification", () => {
      const curve: Curve = {
        id: "linear",
        name: "Linear Segments",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 0.3, value: 0.3, curveType: "linear" },
          { id: "p3", time: 0.6, value: 0.6, curveType: "linear" },
          { id: "p4", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const options: CurveOptimizationOptions = {
        tolerance: 0.01,
        minPointSpacing: 0,
        removeRedundant: false,
        simplifyLinear: true,
      };

      const optimized = CurveUtils.optimize(curve, options);

      expect(optimized.points.length).toBeLessThan(curve.points.length);
    });

    it("should enforce minimum point spacing", () => {
      const curve: Curve = {
        id: "spacing",
        name: "Close Points",
        points: [
          { id: "p1", time: 0, value: 0, curveType: "linear" },
          { id: "p2", time: 0.05, value: 0.1, curveType: "linear" },
          { id: "p3", time: 0.1, value: 0.2, curveType: "linear" },
          { id: "p4", time: 1, value: 1, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 1,
        loop: false,
        loopStart: 0,
        loopEnd: 1,
      };

      const options: CurveOptimizationOptions = {
        tolerance: 0,
        minPointSpacing: 0.2,
        removeRedundant: false,
        simplifyLinear: false,
      };

      const optimized = CurveUtils.optimize(curve, options);

      // Should remove points closer than 0.2
      expect(optimized.points.length).toBeLessThan(curve.points.length);
    });

    it("should keep first and last points", () => {
      const curve = createTestCurve();

      const options: CurveOptimizationOptions = {
        tolerance: 1,
        minPointSpacing: 10,
        removeRedundant: true,
        simplifyLinear: true,
      };

      const optimized = CurveUtils.optimize(curve, options);

      expect(optimized.points.length).toBeGreaterThanOrEqual(2);
      expect(optimized.points[0].id).toBe("p1");
      expect(optimized.points[optimized.points.length - 1].id).toBe("p3");
    });

    it("should change curve ID", () => {
      const curve = createTestCurve();
      const optimized = CurveUtils.optimize(curve, {
        tolerance: 0.01,
        minPointSpacing: 0,
        removeRedundant: false,
        simplifyLinear: false,
      });

      expect(optimized.id).toContain("-optimized");
    });
  });

  describe("Normalization", () => {
    it("should normalize to new range", () => {
      const curve = createTestCurve();

      const normalized = CurveUtils.normalize(curve, 0, 100);

      expect(normalized.minValue).toBe(0);
      expect(normalized.maxValue).toBe(100);
      expect(normalized.points[0].value).toBe(0);
      expect(normalized.points[1].value).toBe(50);
      expect(normalized.points[2].value).toBe(100);
    });

    it("should normalize to negative range", () => {
      const curve = createTestCurve();

      const normalized = CurveUtils.normalize(curve, -1, 1);

      expect(normalized.minValue).toBe(-1);
      expect(normalized.maxValue).toBe(1);
      expect(normalized.points[0].value).toBe(-1);
      expect(normalized.points[1].value).toBe(0);
      expect(normalized.points[2].value).toBe(1);
    });

    it("should preserve curve structure", () => {
      const curve = createTestCurve();
      const originalPointCount = curve.points.length;

      const normalized = CurveUtils.normalize(curve, 20, 20000);

      expect(normalized.points.length).toBe(originalPointCount);
      expect(normalized.minTime).toBe(curve.minTime);
      expect(normalized.maxTime).toBe(curve.maxTime);
    });
  });

  describe("Reverse", () => {
    it("should reverse curve in time", () => {
      const curve = createTestCurve();

      const reversed = CurveUtils.reverse(curve);

      // After reverse: time 0 becomes 1, time 0.5 becomes 0.5, time 1 becomes 0
      // Sorted: 0, 0.5, 1
      expect(reversed.points[0].time).toBe(0);
      expect(reversed.points[1].time).toBe(0.5);
      expect(reversed.points[2].time).toBe(1);
    });

    it("should preserve values when reversing", () => {
      const curve = createTestCurve();

      const reversed = CurveUtils.reverse(curve);

      // Values stay with their original points
      // Point at time 0 (value 0) -> time 1 (value 0)
      // Point at time 0.5 (value 0.5) -> time 0.5 (value 0.5)
      // Point at time 1 (value 1) -> time 0 (value 1)
      expect(reversed.points[0].value).toBe(1); // Was at time 1
      expect(reversed.points[1].value).toBe(0.5); // Was at time 0.5
      expect(reversed.points[2].value).toBe(0); // Was at time 0
    });
  });

  describe("Time Scale", () => {
    it("should stretch curve in time", () => {
      const curve = createTestCurve();

      const stretched = CurveUtils.timeScale(curve, 2.0);

      expect(stretched.minTime).toBe(0);
      expect(stretched.maxTime).toBe(2);
      expect(stretched.points[0].time).toBe(0);
      expect(stretched.points[1].time).toBe(1);
      expect(stretched.points[2].time).toBe(2);
    });

    it("should compress curve in time", () => {
      const curve = createTestCurve();

      const compressed = CurveUtils.timeScale(curve, 0.5);

      expect(compressed.minTime).toBe(0);
      expect(compressed.maxTime).toBe(0.5);
      expect(compressed.points[0].time).toBe(0);
      expect(compressed.points[1].time).toBe(0.25);
      expect(compressed.points[2].time).toBe(0.5);
    });

    it("should scale loop points", () => {
      const curve = createTestCurve();
      curve.loop = true;
      curve.loopStart = 0.25;
      curve.loopEnd = 0.75;

      const scaled = CurveUtils.timeScale(curve, 2.0);

      expect(scaled.loopStart).toBe(0.5);
      expect(scaled.loopEnd).toBe(1.5);
    });
  });

  describe("Time Shift", () => {
    it("should shift curve forward in time", () => {
      const curve = createTestCurve();

      const shifted = CurveUtils.timeShift(curve, 1.0);

      expect(shifted.minTime).toBe(1);
      expect(shifted.maxTime).toBe(2);
      expect(shifted.points[0].time).toBe(1);
      expect(shifted.points[1].time).toBe(1.5);
      expect(shifted.points[2].time).toBe(2);
    });

    it("should shift curve backward in time", () => {
      const curve = createTestCurve();

      const shifted = CurveUtils.timeShift(curve, -0.5);

      expect(shifted.minTime).toBe(-0.5);
      expect(shifted.maxTime).toBe(0.5);
      expect(shifted.points[0].time).toBe(-0.5);
      expect(shifted.points[1].time).toBe(0);
      expect(shifted.points[2].time).toBe(0.5);
    });

    it("should shift loop points", () => {
      const curve = createTestCurve();
      curve.loop = true;
      curve.loopStart = 0.25;
      curve.loopEnd = 0.75;

      const shifted = CurveUtils.timeShift(curve, 1.0);

      expect(shifted.loopStart).toBe(1.25);
      expect(shifted.loopEnd).toBe(1.75);
    });
  });

  describe("Invert", () => {
    it("should invert curve values", () => {
      const curve = createTestCurve();

      const inverted = CurveUtils.invert(curve);

      expect(inverted.points[0].value).toBe(1);
      expect(inverted.points[1].value).toBe(0.5);
      expect(inverted.points[2].value).toBe(0);
    });

    it("should preserve range when inverting", () => {
      const curve = createTestCurve();

      const inverted = CurveUtils.invert(curve);

      expect(inverted.minValue).toBe(curve.minValue);
      expect(inverted.maxValue).toBe(curve.maxValue);
    });
  });

  describe("Utility Functions", () => {
    it("should get duration", () => {
      const curve = createTestCurve();

      const duration = CurveUtils.getDuration(curve);

      expect(duration).toBe(1);
    });

    it("should get value range", () => {
      const curve = createTestCurve();

      const range = CurveUtils.getValueRange(curve);

      expect(range).toBe(1);
    });

    it("should get value range for custom range", () => {
      const curve = createTestCurve();
      curve.minValue = -10;
      curve.maxValue = 10;

      const range = CurveUtils.getValueRange(curve);

      expect(range).toBe(20);
    });
  });

  describe("Clone", () => {
    it("should clone curve with new ID", () => {
      const curve = createTestCurve();

      const cloned = CurveUtils.clone(curve);

      expect(cloned.id).not.toBe(curve.id);
      expect(cloned.points).toEqual(curve.points);
    });

    it("should clone with custom ID", () => {
      const curve = createTestCurve();

      const cloned = CurveUtils.clone(curve, "custom-id");

      expect(cloned.id).toBe("custom-id");
    });

    it("should create deep copy of points", () => {
      const curve = createTestCurve();

      const cloned = CurveUtils.clone(curve);
      cloned.points[0].value = 999;

      expect(curve.points[0].value).toBe(0); // Original unchanged
    });
  });

  describe("Merge", () => {
    it("should throw on empty array", () => {
      expect(() => CurveUtils.merge([])).toThrow("Cannot merge empty curve array");
    });

    it("should return clone for single curve", () => {
      const curve = createTestCurve();

      const merged = CurveUtils.merge([curve]);

      expect(merged.id).not.toBe(curve.id);
      expect(merged.points.length).toBe(curve.points.length);
    });

    it("should merge multiple curves", () => {
      const curve1: Curve = {
        id: "c1",
        name: "Curve 1",
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

      const curve2: Curve = {
        id: "c2",
        name: "Curve 2",
        points: [
          { id: "p3", time: 0, value: 0.5, curveType: "linear" },
          { id: "p4", time: 0.5, value: 0.75, curveType: "linear" },
        ],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 0.5,
        loop: false,
        loopStart: 0,
        loopEnd: 0.5,
      };

      const merged = CurveUtils.merge([curve1, curve2]);

      expect(merged.points.length).toBe(4);
      expect(merged.maxTime).toBe(1.5); // 1 + 0.5
    });

    it("should calculate global min/max values", () => {
      const curve1: Curve = {
        id: "c1",
        name: "Curve 1",
        points: [{ id: "p1", time: 0, value: 0, curveType: "linear" }],
        minValue: 0,
        maxValue: 0.5,
        minTime: 0,
        maxTime: 0,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
      };

      const curve2: Curve = {
        id: "c2",
        name: "Curve 2",
        points: [{ id: "p2", time: 0, value: 1, curveType: "linear" }],
        minValue: 0.5,
        maxValue: 1,
        minTime: 0,
        maxTime: 0,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
      };

      const merged = CurveUtils.merge([curve1, curve2]);

      expect(merged.minValue).toBe(0);
      expect(merged.maxValue).toBe(1);
    });

    it("should merge with custom ID", () => {
      const curve1 = createTestCurve();
      const curve2 = createTestCurve();

      const merged = CurveUtils.merge([curve1, curve2], "merged-id");

      expect(merged.id).toBe("merged-id");
    });
  });
});

/**
 * Curve Recorder Unit Tests
 *
 * Comprehensive test suite for the Curve Recorder with >80% coverage target.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CurveRecorder } from "../CurveRecorder";
import { Curve, CurveType } from "../CurveTypes";

describe("CurveRecorder", () => {
  let recorder: CurveRecorder;

  beforeEach(() => {
    recorder = new CurveRecorder();
  });

  describe("Basic Recording", () => {
    it("should start recording", () => {
      expect(recorder.isRecording()).toBe(false);
      recorder.startRecording(60);
      expect(recorder.isRecording()).toBe(true);
    });

    it("should throw when starting recording twice", () => {
      recorder.startRecording();
      expect(() => recorder.startRecording()).toThrow("Already recording");
    });

    it("should stop recording and return curve", () => {
      recorder.startRecording();
      recorder.addValue(0.5);
      const curve = recorder.stopRecording();

      expect(curve).toBeDefined();
      expect(curve.points.length).toBeGreaterThan(0);
      expect(recorder.isRecording()).toBe(false);
    });

    it("should throw when stopping without recording", () => {
      expect(() => recorder.stopRecording()).toThrow("Not recording");
    });

    it("should throw when adding value without recording", () => {
      expect(() => recorder.addValue(0.5)).toThrow("Not recording");
    });
  });

  describe("Value Recording", () => {
    it("should record single value", () => {
      recorder.startRecording();
      recorder.addValue(0.5);
      const curve = recorder.stopRecording();

      expect(curve.points.length).toBe(1);
      expect(curve.points[0].value).toBe(0.5);
    });

    it("should record multiple values", () => {
      recorder.startRecording(1000); // High sample rate to avoid rate limiting
      recorder.addValue(0);
      recorder.addPointAt(0.1, 0.5); // Use explicit time to avoid rate limiting
      recorder.addPointAt(0.2, 1);
      const curve = recorder.stopRecording();

      expect(curve.points.length).toBeGreaterThanOrEqual(2);
      expect(curve.points[0].value).toBe(0);
      expect(curve.points[curve.points.length - 1].value).toBe(1);
    });

    it("should sort points by time", () => {
      recorder.startRecording();
      recorder.addPointAt(1.5, 0.75);
      recorder.addPointAt(0.5, 0.25);
      recorder.addPointAt(1.0, 0.5);
      const curve = recorder.stopRecording();

      expect(curve.points[0].time).toBe(0.5);
      expect(curve.points[1].time).toBe(1.0);
      expect(curve.points[2].time).toBe(1.5);
    });

    it("should handle rate limiting", () => {
      recorder.startRecording(10); // 10 Hz = 100ms interval

      // Add values rapidly (should be rate limited)
      recorder.addValue(0);
      recorder.addValue(0.5);
      recorder.addValue(1);

      const curve = recorder.stopRecording();

      // Should have fewer points due to rate limiting
      expect(curve.points.length).toBeLessThan(3);
    });

    it("should deduplicate similar values", () => {
      recorder.startRecording();

      // Add very similar values
      recorder.addValue(0.5);
      recorder.addValue(0.5005);
      recorder.addValue(0.501);

      const curve = recorder.stopRecording();

      // Should deduplicate values within tolerance
      expect(curve.points.length).toBeLessThan(3);
    });
  });

  describe("Point Management", () => {
    it("should add point at specific time", () => {
      recorder.startRecording();
      recorder.addPointAt(1.5, 0.75, "sine");

      const curve = recorder.stopRecording();

      expect(curve.points[0].time).toBe(1.5);
      expect(curve.points[0].value).toBe(0.75);
      expect(curve.points[0].curveType).toBe("sine");
    });

    it("should clamp negative time to zero", () => {
      recorder.startRecording();
      recorder.addPointAt(-1, 0.5);

      const curve = recorder.stopRecording();

      expect(curve.points[0].time).toBe(0);
    });

    it("should clamp values to -1 to 1 range", () => {
      recorder.startRecording();
      recorder.addPointAt(0, 2);
      recorder.addPointAt(1, -2);

      const curve = recorder.stopRecording();

      expect(curve.points[0].value).toBe(1);
      expect(curve.points[1].value).toBe(-1);
    });

    it("should generate unique point IDs", () => {
      recorder.startRecording();
      recorder.addPointAt(0, 0);
      recorder.addPointAt(1, 1);

      const curve = recorder.stopRecording();

      expect(curve.points[0].id).not.toBe(curve.points[1].id);
    });
  });

  describe("Curve Metadata", () => {
    it("should calculate min/max values", () => {
      recorder.startRecording();
      recorder.addPointAt(0, 0);
      recorder.addPointAt(0.1, 0.5);
      recorder.addPointAt(0.2, 1);
      const curve = recorder.stopRecording();

      expect(curve.minValue).toBe(0);
      expect(curve.maxValue).toBe(1);
    });

    it("should calculate time range", () => {
      recorder.startRecording();
      recorder.addPointAt(0, 0);
      recorder.addPointAt(1.5, 1);
      const curve = recorder.stopRecording();

      expect(curve.minTime).toBe(0);
      expect(curve.maxTime).toBe(1.5);
    });

    it("should set loop points to time range", () => {
      recorder.startRecording();
      recorder.addPointAt(0.5, 0.5);
      recorder.addPointAt(2.0, 1);
      const curve = recorder.stopRecording();

      expect(curve.loopStart).toBe(0.5);
      expect(curve.loopEnd).toBe(2.0);
    });

    it("should generate unique curve ID", () => {
      recorder.startRecording();
      recorder.addPointAt(0, 0.5);
      const curve1 = recorder.stopRecording();

      // Small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait 10ms
      }

      recorder.startRecording();
      recorder.addPointAt(0, 0.5);
      const curve2 = recorder.stopRecording();

      expect(curve1.id).not.toBe(curve2.id);
    });

    it("should include timestamp in curve name", () => {
      recorder.startRecording();
      recorder.addValue(0.5);
      const curve = recorder.stopRecording();

      expect(curve.name).toContain("Recorded Curve");
      expect(curve.name).toMatch(/\d{4}-\d{2}-\d{2}/); // ISO date format
    });
  });

  describe("Progress Tracking", () => {
    it("should return zero progress when not recording", () => {
      const progress = recorder.getProgress();

      expect(progress.duration).toBe(0);
      expect(progress.pointCount).toBe(0);
    });

    it("should track recording duration", () => {
      recorder.startRecording();

      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 100) {
        // Busy wait for 100ms
      }

      const progress = recorder.getProgress();

      expect(progress.duration).toBeGreaterThan(0.09); // At least 90ms
      expect(progress.duration).toBeLessThan(0.2); // Less than 200ms
    });

    it("should track point count", () => {
      recorder.startRecording();
      expect(recorder.getProgress().pointCount).toBe(0);

      recorder.addPointAt(0, 0);
      expect(recorder.getProgress().pointCount).toBeGreaterThanOrEqual(1);

      recorder.addPointAt(0.1, 1);
      expect(recorder.getProgress().pointCount).toBeGreaterThanOrEqual(1);
    });

    it("should return point count", () => {
      recorder.startRecording();
      expect(recorder.getPointCount()).toBe(0);

      recorder.addPointAt(0, 0);
      expect(recorder.getPointCount()).toBe(1);

      recorder.addPointAt(0.1, 1);
      expect(recorder.getPointCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Cancel Recording", () => {
    it("should cancel active recording", () => {
      recorder.startRecording();
      recorder.addValue(0.5);

      recorder.cancelRecording();

      expect(recorder.isRecording()).toBe(false);
    });

    it("should reset state after cancel", () => {
      recorder.startRecording();
      recorder.addValue(0.5);
      recorder.cancelRecording();

      // Should be able to start new recording
      recorder.startRecording();
      recorder.addValue(0.75);
      const curve = recorder.stopRecording();

      expect(curve.points.length).toBe(1);
      expect(curve.points[0].value).toBe(0.75);
    });

    it("should handle cancel when not recording", () => {
      expect(() => recorder.cancelRecording()).not.toThrow();
      expect(recorder.isRecording()).toBe(false);
    });
  });

  describe("Recording State", () => {
    it("should return null when not recording", () => {
      const state = recorder.getRecordingState();
      expect(state).toBeNull();
    });

    it("should return recording state when active", () => {
      recorder.startRecording(60);
      const state = recorder.getRecordingState();

      expect(state).toBeDefined();
      expect(state?.isRecording).toBe(true);
      expect(state?.sampleRate).toBe(60);
      expect(state?.startTime).toBeDefined();
    });

    it("should not return state after stop", () => {
      recorder.startRecording();
      recorder.stopRecording();

      const state = recorder.getRecordingState();
      expect(state).toBeNull();
    });
  });

  describe("Empty Recording", () => {
    it("should handle empty recording", () => {
      recorder.startRecording();
      const curve = recorder.stopRecording();

      expect(curve.points.length).toBe(0);
      expect(curve.minValue).toBe(0);
      expect(curve.maxValue).toBe(1);
      expect(curve.minTime).toBe(0);
      expect(curve.maxTime).toBe(0);
    });

    it("should name empty recording appropriately", () => {
      recorder.startRecording();
      const curve = recorder.stopRecording();

      expect(curve.name).toBe("Empty Recording");
    });
  });

  describe("Sample Rate Handling", () => {
    it("should clamp sample rate to minimum", () => {
      recorder.startRecording(0);
      const state = recorder.getRecordingState();

      expect(state?.sampleRate).toBe(1); // Clamped to minimum
    });

    it("should clamp sample rate to maximum", () => {
      recorder.startRecording(10000);
      const state = recorder.getRecordingState();

      expect(state?.sampleRate).toBe(1000); // Clamped to maximum
    });

    it("should use default sample rate", () => {
      recorder.startRecording();
      const state = recorder.getRecordingState();

      expect(state?.sampleRate).toBe(60); // Default
    });
  });

  describe("Curve Type Defaults", () => {
    it("should use linear as default curve type", () => {
      recorder.startRecording();
      recorder.addValue(0.5);
      const curve = recorder.stopRecording();

      expect(curve.points[0].curveType).toBe("linear");
    });

    it("should allow custom curve type", () => {
      recorder.startRecording();
      recorder.addPointAt(0, 0.5, "sine");
      const curve = recorder.stopRecording();

      expect(curve.points[0].curveType).toBe("sine");
    });
  });

  describe("Lock State", () => {
    it("should create unlocked points by default", () => {
      recorder.startRecording();
      recorder.addValue(0.5);
      const curve = recorder.stopRecording();

      expect(curve.points[0].locked).toBe(false);
    });
  });

  describe("Integration with Curve Engine", () => {
    it("should produce valid curve for engine evaluation", async () => {
      const { CurveEngine } = await import("../CurveEngine");
      const engine = new CurveEngine();

      recorder.startRecording();
      recorder.addPointAt(0, 0);
      recorder.addPointAt(1, 1);
      const curve = recorder.stopRecording();

      // Should be evaluable by CurveEngine
      const result = engine.evaluate(curve, 0.5);
      expect(result.value).toBeCloseTo(0.5, 5);
    });
  });
});

/**
 * Curve Recorder for White Room DSP UI Foundation
 *
 * Real-time parameter recording system that captures value changes
 * and converts them into editable curves.
 *
 * @module curves/CurveRecorder
 */

import { Curve, CurvePoint, CurveRecording, CurveType } from "./CurveTypes";

/**
 * Records parameter changes in real-time
 *
 * Captures value changes over time and creates editable curves from the recording.
 * Useful for automation drawing, envelope capture, and performance recording.
 *
 * @class CurveRecorder
 * @example
 * ```typescript
 * const recorder = new CurveRecorder();
 * recorder.startRecording(60); // 60 Hz sample rate
 *
 * // In your automation loop:
 * recorder.addParameterValue(currentValue);
 *
 * // When done:
 * const curve = recorder.stopRecording();
 * ```
 */
export class CurveRecorder {
  /**
   * Current recording state
   * @private
   */
  private recording: CurveRecording | null = null;

  /**
   * Array of recorded points
   * @private
   */
  private recordedPoints: CurvePoint[] = [];

  /**
   * Counter for generating unique point IDs
   * @private
   */
  private idCounter = 0;

  /**
   * Sample interval in milliseconds (calculated from sample rate)
   * @private
   */
  private sampleInterval = 0;

  /**
   * Last recorded value (for deduplication)
   * @private
   */
  private lastValue: number | null = null;

  /**
   * Last sample time (for rate limiting)
   * @private
   */
  private lastSampleTime = 0;

  /**
   * Start recording a new curve
   *
   * Initializes recording state and prepares to capture value changes.
   *
   * @param sampleRate - Sample rate in Hz (default: 60)
   * @throws Error if already recording
   *
   * @example
   * ```typescript
   * recorder.startRecording(60); // 60 samples per second
   * ```
   */
  startRecording(sampleRate: number = 60): void {
    if (this.recording?.isRecording) {
      throw new Error("Already recording. Call stopRecording() first.");
    }

    const clampedSampleRate = Math.max(1, Math.min(sampleRate, 1000));
    this.sampleInterval = 1000 / clampedSampleRate;

    this.recording = {
      isRecording: true,
      startTime: Date.now(),
      sampleRate: clampedSampleRate,
    };

    this.recordedPoints = [];
    this.idCounter = 0;
    this.lastValue = null;
    this.lastSampleTime = 0;
  }

  /**
   * Stop recording and return the curve
   *
   * Finalizes the recording and converts it into a Curve object.
   * Automatically calculates min/max values and time ranges.
   *
   * @returns The recorded curve
   * @throws Error if not recording
   *
   * @example
   * ```typescript
   * const curve = recorder.stopRecording();
   * console.log(`Recorded ${curve.points.length} points`);
   * ```
   */
  stopRecording(): Curve {
    if (!this.recording?.isRecording) {
      throw new Error("Not recording. Call startRecording() first.");
    }

    // Handle empty recording
    if (this.recordedPoints.length === 0) {
      this.recording.isRecording = false;

      // Return empty curve
      const emptyCurve: Curve = {
        id: `curve-${Date.now()}`,
        name: "Empty Recording",
        points: [],
        minValue: 0,
        maxValue: 1,
        minTime: 0,
        maxTime: 0,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
      };

      this.recording = null;
      return emptyCurve;
    }

    // Sort points by time (in case of any timing issues)
    this.recordedPoints.sort((a, b) => a.time - b.time);

    // Calculate curve metadata
    const values = this.recordedPoints.map((p) => p.value);
    const times = this.recordedPoints.map((p) => p.time);

    const curve: Curve = {
      id: `curve-${Date.now()}`,
      name: `Recorded Curve ${new Date().toISOString()}`,
      points: [...this.recordedPoints],
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      minTime: times[0],
      maxTime: times[times.length - 1],
      loop: false,
      loopStart: times[0],
      loopEnd: times[times.length - 1],
    };

    this.recording.isRecording = false;
    this.recording = null;

    return curve;
  }

  /**
   * Add a value to the recording
   *
   * Samples the current value at the specified time. Includes rate limiting
   * and value deduplication to reduce unnecessary points.
   *
   * @param value - Value to record
   * @param timestamp - Optional timestamp (default: current time)
   * @throws Error if not recording
   *
   * @example
   * ```typescript
   * // In your automation loop:
   * recorder.addValue(parameter.getValue());
   * ```
   */
  addValue(value: number, timestamp?: number): void {
    if (!this.recording?.isRecording) {
      throw new Error("Not recording. Call startRecording() first.");
    }

    const now = timestamp || Date.now();
    const elapsed = (now - this.recording.startTime) / 1000;

    // Rate limiting - only sample at configured interval
    if (now - this.lastSampleTime < this.sampleInterval) {
      return;
    }

    this.lastSampleTime = now;

    // Value deduplication - skip if value hasn't changed significantly
    if (this.lastValue !== null && Math.abs(value - this.lastValue) < 0.001) {
      return;
    }

    this.lastValue = value;

    const point: CurvePoint = {
      id: `point-${this.idCounter++}`,
      time: elapsed,
      value: value,
      curveType: "linear",
      locked: false,
    };

    this.recordedPoints.push(point);
  }

  /**
   * Add a point with explicit time
   *
   * Useful for manual editing or importing data from other sources.
   *
   * @param time - Time in seconds
   * @param value - Value at that time
   * @param curveType - Interpolation type (default: 'linear')
   * @throws Error if not recording
   *
   * @example
   * ```typescript
   * recorder.addPointAt(1.5, 0.75, 'sine');
   * ```
   */
  addPointAt(time: number, value: number, curveType: CurveType = "linear"): void {
    if (!this.recording?.isRecording) {
      throw new Error("Not recording. Call startRecording() first.");
    }

    const point: CurvePoint = {
      id: `point-${this.idCounter++}`,
      time: Math.max(0, time), // Ensure non-negative
      value: Math.max(-1, Math.min(1, value)), // Clamp to -1 to 1 range
      curveType: curveType,
      locked: false,
    };

    this.recordedPoints.push(point);
  }

  /**
   * Check if currently recording
   *
   * @returns True if recording is active
   *
   * @example
   * ```typescript
   * if (recorder.isRecording()) {
   *   recorder.addValue(currentValue);
   * }
   * ```
   */
  isRecording(): boolean {
    return this.recording?.isRecording || false;
  }

  /**
   * Get current recording progress
   *
   * Returns duration and point count for monitoring recording progress.
   *
   * @returns Progress information
   *
   * @example
   * ```typescript
   * const progress = recorder.getProgress();
   * console.log(`Duration: ${progress.duration}s, Points: ${progress.pointCount}`);
   * ```
   */
  getProgress(): { duration: number; pointCount: number } {
    if (!this.recording?.isRecording) {
      return { duration: 0, pointCount: 0 };
    }

    return {
      duration: (Date.now() - this.recording.startTime) / 1000,
      pointCount: this.recordedPoints.length,
    };
  }

  /**
   * Cancel recording without saving
   *
   * Discards the current recording and resets the recorder state.
   *
   * @example
   * ```typescript
   * if (userCancelled) {
   *   recorder.cancelRecording();
   * }
   * ```
   */
  cancelRecording(): void {
    if (!this.recording) {
      return;
    }

    this.recording.isRecording = false;
    this.recording = null;
    this.recordedPoints = [];
    this.idCounter = 0;
    this.lastValue = null;
    this.lastSampleTime = 0;
  }

  /**
   * Get the current recording state
   *
   * Returns detailed information about the active recording.
   *
   * @returns Recording state or null if not recording
   *
   * @example
   * ```typescript
   * const state = recorder.getRecordingState();
   * if (state) {
   *   console.log(`Sample rate: ${state.sampleRate}Hz`);
   * }
   * ```
   */
  getRecordingState(): CurveRecording | null {
    if (!this.recording?.isRecording) {
      return null;
    }

    return { ...this.recording };
  }

  /**
   * Get the number of recorded points
   *
   * Useful for monitoring recording size during long sessions.
   *
   * @returns Number of points recorded so far
   *
   * @example
   * ```typescript
   * console.log(`Recorded ${recorder.getPointCount()} points`);
   * ```
   */
  getPointCount(): number {
    return this.recordedPoints.length;
  }
}

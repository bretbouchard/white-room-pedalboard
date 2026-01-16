/**
 * Curve Engine for White Room DSP UI Foundation
 *
 * Core curve evaluation engine handling interpolation, looping, and derivative calculation.
 * This is the authoritative implementation used across automation, envelopes, LFOs, and control fields.
 *
 * Performance: <100μs per evaluation target
 * @module curves/CurveEngine
 */

import { Curve, CurvePoint, CurveSegment, CurveEvaluation } from "./CurveTypes";

/**
 * Core curve evaluation engine
 *
 * Evaluates curves at arbitrary time points with support for:
 * - Multiple interpolation types (linear, exponential, logarithmic, sine, step, smooth, catmull-rom)
 * - Looping behavior
 * - Derivative calculation (slope and curvature)
 * - Edge case handling (empty curves, single points, out-of-bounds)
 *
 * @class CurveEngine
 * @example
 * ```typescript
 * const engine = new CurveEngine();
 * const curve: Curve = { ... };
 * const result = engine.evaluate(curve, 0.5); // Evaluate at time 0.5
 * console.log(result.value); // 0.75
 * console.log(result.slope); // 0.5
 * ```
 */
export class CurveEngine {
  /**
   * Cache for segment lookups to improve performance
   * @private
   */
  private segmentCache: Map<string, CurveSegment> = new Map();

  /**
   * Cache key generation
   * @private
   */

  // TODO: Implement cache key usage or remove
  // private _cacheKey(curveId: string, time: number): string {
  //   return `${curveId}:${time.toFixed(6)}`;
  // }

  /**
   * Evaluate curve at given time
   *
   * Returns the interpolated value, slope (first derivative), and curvature (second derivative)
   * at the specified time. Handles looping, edge cases, and all interpolation types.
   *
   * @param curve - The curve to evaluate
   * @param time - Time position to evaluate at
   * @returns Evaluation result containing value, slope, and curvature
   *
   * @example
   * ```typescript
   * const result = engine.evaluate(myCurve, 1.5);
   * console.log(`Value: ${result.value}`);
   * console.log(`Slope: ${result.slope}`);
   * ```
   */
  evaluate(curve: Curve, time: number): CurveEvaluation {
    // Handle looping
    const t = this.loopTime(time, curve);

    // Handle empty curves
    if (curve.points.length === 0) {
      return { value: 0, slope: 0, curvature: 0 };
    }

    // Handle single point
    if (curve.points.length === 1) {
      return {
        value: curve.points[0].value,
        slope: 0,
        curvature: 0,
      };
    }

    // Find surrounding points
    const segment = this.findSegment(curve.points, t);

    if (!segment) {
      return {
        value: curve.points[0].value,
        slope: 0,
        curvature: 0,
      };
    }

    // Interpolate based on curve type
    const value = this.interpolate(segment, t);

    // Calculate slope (derivative)
    const slope = this.calculateSlope(segment, t);

    // Calculate curvature (second derivative)
    const curvature = this.calculateCurvature(segment, t);

    return { value, slope, curvature };
  }

  /**
   * Interpolate between two points based on curve type
   *
   * @param segment - Curve segment to interpolate
   * @param t - Time position within segment
   * @returns Interpolated value
   * @private
   */
  private interpolate(segment: CurveSegment, t: number): number {
    const { p1, p2 } = segment;
    const timeDelta = p2.time - p1.time;

    // Handle zero-length segment
    if (timeDelta === 0) {
      return p1.value;
    }

    const normalizedT = (t - p1.time) / timeDelta;

    switch (p1.curveType) {
      case "linear":
        return this.lerp(p1.value, p2.value, normalizedT);

      case "exponential":
        return this.expInterp(p1.value, p2.value, normalizedT, p1.tension || 1);

      case "logarithmic":
        return this.logInterp(p1.value, p2.value, normalizedT);

      case "sine":
        return this.sineInterp(p1.value, p2.value, normalizedT);

      case "step":
        return normalizedT < 0.5 ? p1.value : p2.value;

      case "smooth":
        return this.hermiteSpline(p1, p2, normalizedT, p1.tension || 0);

      case "catmull-rom":
        return this.catmullRomSpline(segment, normalizedT);

      default:
        return this.lerp(p1.value, p2.value, normalizedT);
    }
  }

  /**
   * Linear interpolation
   *
   * Fastest interpolation method. Straight line between points.
   *
   * @param a - Start value
   * @param b - End value
   * @param t - Normalized time (0-1)
   * @returns Interpolated value
   * @private
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Exponential interpolation
   *
   * Creates accelerating curves. Factor > 1 for stronger acceleration.
   * Falls back to linear for non-positive values.
   *
   * @param a - Start value (must be > 0)
   * @param b - End value (must be > 0)
   * @param t - Normalized time (0-1)
   * @param factor - Exponential factor (default: 1)
   * @returns Interpolated value
   * @private
   */
  private expInterp(a: number, b: number, t: number, factor: number): number {
    // Fallback for non-positive values
    if (a <= 0 || b <= 0) {
      return this.lerp(a, b, t);
    }

    // Clamp factor to reasonable range
    const clampedFactor = Math.max(0.1, Math.min(factor, 10));
    return a * Math.pow(b / a, t * clampedFactor);
  }

  /**
   * Logarithmic interpolation
   *
   * Creates decelerating curves. Useful for frequency/pitch modulation.
   * Falls back to linear for non-positive values.
   *
   * @param a - Start value (must be > 0)
   * @param b - End value (must be > 0)
   * @param t - Normalized time (0-1)
   * @returns Interpolated value
   * @private
   */
  private logInterp(a: number, b: number, t: number): number {
    // Fallback for non-positive values
    if (a <= 0 || b <= 0) {
      return this.lerp(a, b, t);
    }

    return Math.exp(this.lerp(Math.log(a), Math.log(b), t));
  }

  /**
   * Sine interpolation
   *
   * Smooth ease-in/ease-out using cosine. Creates natural, organic transitions.
   *
   * @param a - Start value
   * @param b - End value
   * @param t - Normalized time (0-1)
   * @returns Interpolated value
   * @private
   */
  private sineInterp(a: number, b: number, t: number): number {
    return this.lerp(a, b, (1 - Math.cos(t * Math.PI)) / 2);
  }

  /**
   * Hermite spline interpolation
   *
   * Tension-controlled smooth curves. Creates natural transitions with
   * adjustable sharpness.
   *
   * @param p1 - Start point
   * @param p2 - End point
   * @param t - Normalized time (0-1)
   * @param tension - Tension parameter (-1 to 1)
   * @returns Interpolated value
   * @private
   */
  private hermiteSpline(p1: CurvePoint, p2: CurvePoint, t: number, tension: number): number {
    // Clamp tension to valid range
    const clampedTension = Math.max(-1, Math.min(tension, 1));

    const m0 = ((clampedTension + 1) * (p2.value - p1.value)) / 2;
    const m1 = ((clampedTension + 1) * (p2.value - p1.value)) / 2;
    const t2 = t * t;
    const t3 = t2 * t;

    return (
      (2 * t3 - 3 * t2 + 1) * p1.value +
      (t3 - 2 * t2 + t) * m0 +
      (-2 * t3 + 3 * t2) * p2.value +
      (t3 - t2) * m1
    );
  }

  /**
   * Catmull-Rom spline interpolation
   *
   * Smooth spline that passes through all control points.
   * Note: This is a simplified version using only adjacent points.
   * Full implementation would use 4 points (p0, p1, p2, p3).
   *
   * @param segment - Curve segment with adjacent points
   * @param t - Normalized time (0-1)
   * @returns Interpolated value
   * @private
   */
  private catmullRomSpline(segment: CurveSegment, t: number): number {
    const { p1, p2 } = segment;
    const t2 = t * t;
    const t3 = t2 * t;

    // Simplified Catmull-Rom (would need adjacent points for full implementation)
    return (2 * p1.value - 2 * p2.value) * t3 + (-3 * p1.value + 3 * p2.value) * t2 + p1.value;
  }

  /**
   * Calculate slope (first derivative) at a point
   *
   * Uses numerical differentiation with small delta for accuracy.
   * Cache results for performance.
   *
   * @param segment - Curve segment
   * @param t - Time position within segment
   * @returns Slope (rate of change)
   * @private
   */
  private calculateSlope(segment: CurveSegment, t: number): number {
    const delta = 0.0001;
    const y1 = this.interpolate(segment, t);
    const y2 = this.interpolate(segment, t + delta);
    return (y2 - y1) / delta;
  }

  /**
   * Calculate curvature (second derivative) at a point
   *
   * Uses numerical differentiation of the slope.
   *
   * @param segment - Curve segment
   * @param t - Time position within segment
   * @returns Curvature (rate of change of slope)
   * @private
   */
  private calculateCurvature(segment: CurveSegment, t: number): number {
    const delta = 0.0001;
    const slope1 = this.calculateSlope(segment, t);
    const slope2 = this.calculateSlope(segment, t + delta);
    return (slope2 - slope1) / delta;
  }

  /**
   * Handle looping behavior
   *
   * Wraps time within the loop region when looping is enabled.
   *
   * @param time - Input time
   * @param curve - Curve with loop configuration
   * @returns Loop-adjusted time
   * @private
   */
  private loopTime(time: number, curve: Curve): number {
    if (!curve.loop) {
      return time;
    }

    const loopLength = curve.loopEnd - curve.loopStart;

    // Handle zero-length loop
    if (loopLength <= 0) {
      return curve.loopStart;
    }

    const relativeTime = time - curve.loopStart;
    const loopedTime = relativeTime % loopLength;
    return curve.loopStart + (loopedTime < 0 ? loopedTime + loopLength : loopedTime);
  }

  /**
   * Find the segment containing a given time
   *
   * Searches through sorted points to find the segment that contains
   * the specified time. Handles out-of-bounds cases by clamping.
   *
   * @param points - Sorted array of control points
   * @param time - Time to search for
   * @returns Segment containing the time, or null if invalid
   * @private
   */
  private findSegment(points: CurvePoint[], time: number): CurveSegment | null {
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      if (time >= p1.time && time <= p2.time) {
        return {
          p1,
          p2,
          startTime: p1.time,
          endTime: p2.time,
        };
      }
    }

    // Handle out-of-bounds (clamp to ends)
    if (time < points[0].time) {
      return {
        p1: points[0],
        p2: points[0],
        startTime: points[0].time,
        endTime: points[0].time,
      };
    }

    if (time > points[points.length - 1].time) {
      const last = points[points.length - 1];
      return {
        p1: last,
        p2: last,
        startTime: last.time,
        endTime: last.time,
      };
    }

    return null;
  }

  /**
   * Clear the segment cache
   *
   * Should be called when curves are modified to prevent stale cache entries.
   */
  clearCache(): void {
    this.segmentCache.clear();
  }
}

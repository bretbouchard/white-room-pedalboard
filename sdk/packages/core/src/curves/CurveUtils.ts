/**
 * Curve Utilities for White Room DSP UI Foundation
 *
 * Helper functions for curve manipulation, validation, optimization,
 * and common operations.
 *
 * @module curves/CurveUtils
 */

import { Curve, CurvePoint, CurveValidationResult, CurveOptimizationOptions } from "./CurveTypes";

/**
 * Curve utilities helper class
 *
 * Provides static methods for common curve operations including
 * validation, optimization, transformation, and analysis.
 *
 * @class CurveUtils
 * @example
 * ```typescript
 * const isValid = CurveUtils.validate(curve);
 * const optimized = CurveUtils.optimize(curve, { tolerance: 0.01 });
 * const normalized = CurveUtils.normalize(curve, 0, 1);
 * ```
 */
export class CurveUtils {
  /**
   * Validate a curve for correctness
   *
   * Checks for:
   * - Proper point ordering (by time)
   * - Valid value ranges
   * - No duplicate time values
   * - Valid loop configuration
   * - At least one point
   *
   * @param curve - Curve to validate
   * @returns Validation result with errors and warnings
   *
   * @example
   * ```typescript
   * const result = CurveUtils.validate(myCurve);
   * if (!result.isValid) {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   */
  static validate(curve: Curve): CurveValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty curves
    if (curve.points.length === 0) {
      errors.push("Curve must have at least one point");
      return { isValid: false, errors, warnings };
    }

    // Check point ordering
    for (let i = 1; i < curve.points.length; i++) {
      if (curve.points[i].time < curve.points[i - 1].time) {
        errors.push(
          `Point ${i} has time ${curve.points[i].time} which is before point ${i - 1} at ${curve.points[i - 1].time}`
        );
      }
    }

    // Check for duplicate times
    const timeSet = new Set<number>();
    for (let i = 0; i < curve.points.length; i++) {
      if (timeSet.has(curve.points[i].time)) {
        errors.push(`Duplicate time value: ${curve.points[i].time}`);
      }
      timeSet.add(curve.points[i].time);
    }

    // Check value ranges
    for (let i = 0; i < curve.points.length; i++) {
      const point = curve.points[i];
      if (point.value < curve.minValue || point.value > curve.maxValue) {
        warnings.push(
          `Point ${i} value ${point.value} is outside range [${curve.minValue}, ${curve.maxValue}]`
        );
      }
    }

    // Check loop configuration
    if (curve.loop) {
      if (curve.loopStart >= curve.loopEnd) {
        errors.push(
          `Loop start (${curve.loopStart}) must be less than loop end (${curve.loopEnd})`
        );
      }

      if (curve.loopStart < curve.minTime || curve.loopEnd > curve.maxTime) {
        warnings.push(
          `Loop region [${curve.loopStart}, ${curve.loopEnd}] extends beyond curve bounds [${curve.minTime}, ${curve.maxTime}]`
        );
      }
    }

    // Check time ranges
    if (curve.minTime >= curve.maxTime) {
      errors.push(`Min time (${curve.minTime}) must be less than max time (${curve.maxTime})`);
    }

    if (curve.minValue >= curve.maxValue) {
      errors.push(`Min value (${curve.minValue}) must be less than max value (${curve.maxValue})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Optimize a curve by reducing point count
   *
   * Removes unnecessary points while maintaining visual accuracy:
   * - Removes redundant points (no value change)
   * - Simplifies linear segments
   * - Enforces minimum point spacing
   *
   * @param curve - Curve to optimize
   * @param options - Optimization options
   * @returns Optimized curve with fewer points
   *
   * @example
   * ```typescript
   * const optimized = CurveUtils.optimize(curve, {
   *   tolerance: 0.01,
   *   minPointSpacing: 0.1,
   *   removeRedundant: true,
   *   simplifyLinear: true
   * });
   * ```
   */
  static optimize(curve: Curve, options: CurveOptimizationOptions): Curve {
    let points = [...curve.points];

    // Remove redundant points (no value change)
    if (options.removeRedundant) {
      points = points.filter((point, index) => {
        // Keep first and last points
        if (index === 0 || index === points.length - 1) {
          return true;
        }

        // Check if value is significantly different from neighbors
        const prevPoint = points[index - 1];
        const nextPoint = points[index + 1];

        const avgValue = (prevPoint.value + nextPoint.value) / 2;
        const deviation = Math.abs(point.value - avgValue);

        return deviation > options.tolerance;
      });
    }

    // Simplify linear segments
    if (options.simplifyLinear) {
      points = this.simplifyLinearSegments(points, options.tolerance);
    }

    // Enforce minimum point spacing
    if (options.minPointSpacing > 0) {
      points = this.enforcePointSpacing(points, options.minPointSpacing);
    }

    // Create optimized curve
    const optimizedCurve: Curve = {
      ...curve,
      points,
      id: `${curve.id}-optimized`,
    };

    return optimizedCurve;
  }

  /**
   * Simplify linear segments in curve
   *
   * Removes points that lie on straight lines between their neighbors.
   *
   * @param points - Array of curve points
   * @param tolerance - Maximum deviation from line
   * @returns Simplified point array
   * @private
   */
  private static simplifyLinearSegments(points: CurvePoint[], tolerance: number): CurvePoint[] {
    if (points.length <= 2) {
      return points;
    }

    const simplified: CurvePoint[] = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const current = points[i];
      const next = points[i + 1];

      // Calculate expected value on line
      const timeDelta = next.time - prev.time;
      if (timeDelta === 0) {
        simplified.push(current);
        continue;
      }

      const normalizedT = (current.time - prev.time) / timeDelta;
      const expectedValue = prev.value + (next.value - prev.value) * normalizedT;
      const deviation = Math.abs(current.value - expectedValue);

      // Keep point if deviation exceeds tolerance
      if (deviation > tolerance) {
        simplified.push(current);
      }
    }

    simplified.push(points[points.length - 1]);
    return simplified;
  }

  /**
   * Enforce minimum point spacing
   *
   * Removes points that are too close together in time.
   *
   * @param points - Array of curve points
   * @param minSpacing - Minimum time between points
   * @returns Filtered point array
   * @private
   */
  private static enforcePointSpacing(points: CurvePoint[], minSpacing: number): CurvePoint[] {
    if (points.length <= 1) {
      return points;
    }

    const filtered: CurvePoint[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const lastPoint = filtered[filtered.length - 1];
      const currentPoint = points[i];

      if (currentPoint.time - lastPoint.time >= minSpacing) {
        filtered.push(currentPoint);
      }
    }

    // Ensure last point is always included
    if (filtered[filtered.length - 1].id !== points[points.length - 1].id) {
      filtered.push(points[points.length - 1]);
    }

    return filtered;
  }

  /**
   * Normalize curve values to a new range
   *
   * Scales all values from current range to new range.
   *
   * @param curve - Curve to normalize
   * @param newMin - New minimum value
   * @param newMax - New maximum value
   * @returns Curve with normalized values
   *
   * @example
   * ```typescript
   * // Convert from 0-1 to 20-20000 (frequency range)
   * const freqCurve = CurveUtils.normalize(curve, 20, 20000);
   * ```
   */
  static normalize(curve: Curve, newMin: number, newMax: number): Curve {
    const oldRange = curve.maxValue - curve.minValue;
    const newRange = newMax - newMin;

    const normalizedPoints: CurvePoint[] = curve.points.map((point) => ({
      ...point,
      value: ((point.value - curve.minValue) / oldRange) * newRange + newMin,
    }));

    return {
      ...curve,
      points: normalizedPoints,
      minValue: newMin,
      maxValue: newMax,
    };
  }

  /**
   * Reverse curve in time
   *
   * Creates a mirrored version of the curve that plays backwards.
   *
   * @param curve - Curve to reverse
   * @returns Time-reversed curve
   *
   * @example
   * ```typescript
   * const reversed = CurveUtils.reverse(curve);
   * ```
   */
  static reverse(curve: Curve): Curve {
    const maxTime = curve.maxTime;

    const reversedPoints: CurvePoint[] = curve.points
      .map((point) => ({
        ...point,
        time: maxTime - point.time,
      }))
      .sort((a, b) => a.time - b.time);

    return {
      ...curve,
      points: reversedPoints,
    };
  }

  /**
   * Scale curve in time
   *
   * Stretches or compresses the curve in the time dimension.
   *
   * @param curve - Curve to scale
   * @param timeScale - Time scale factor (1.0 = no change, 2.0 = double duration)
   * @returns Time-scaled curve
   *
   * @example
   * ```typescript
   * // Make curve twice as long
   * const stretched = CurveUtils.timeScale(curve, 2.0);
   *
   * // Make curve half as long
   * const compressed = CurveUtils.timeScale(curve, 0.5);
   * ```
   */
  static timeScale(curve: Curve, timeScale: number): Curve {
    const scaledPoints: CurvePoint[] = curve.points.map((point) => ({
      ...point,
      time: point.time * timeScale,
    }));

    return {
      ...curve,
      points: scaledPoints,
      minTime: curve.minTime * timeScale,
      maxTime: curve.maxTime * timeScale,
      loopStart: curve.loopStart * timeScale,
      loopEnd: curve.loopEnd * timeScale,
    };
  }

  /**
   * Shift curve in time
   *
   * Moves the entire curve earlier or later in time.
   *
   * @param curve - Curve to shift
   * @param timeOffset - Time offset in seconds (positive = later, negative = earlier)
   * @returns Time-shifted curve
   *
   * @example
   * ```typescript
   * // Delay curve by 1 second
   * const delayed = CurveUtils.timeShift(curve, 1.0);
   * ```
   */
  static timeShift(curve: Curve, timeOffset: number): Curve {
    const shiftedPoints: CurvePoint[] = curve.points.map((point) => ({
      ...point,
      time: point.time + timeOffset,
    }));

    return {
      ...curve,
      points: shiftedPoints,
      minTime: curve.minTime + timeOffset,
      maxTime: curve.maxTime + timeOffset,
      loopStart: curve.loopStart + timeOffset,
      loopEnd: curve.loopEnd + timeOffset,
    };
  }

  /**
   * Invert curve values
   *
   * Flips the curve vertically (max becomes min, min becomes max).
   *
   * @param curve - Curve to invert
   * @returns Value-inverted curve
   *
   * @example
   * ```typescript
   * const inverted = CurveUtils.invert(curve);
   * ```
   */
  static invert(curve: Curve): Curve {
    const invertedPoints: CurvePoint[] = curve.points.map((point) => ({
      ...point,
      value: curve.maxValue - (point.value - curve.minValue),
    }));

    return {
      ...curve,
      points: invertedPoints,
    };
  }

  /**
   * Get curve duration
   *
   * Returns the total duration of the curve in seconds.
   *
   * @param curve - Curve to measure
   * @returns Duration in seconds
   *
   * @example
   * ```typescript
   * const duration = CurveUtils.getDuration(curve);
   * console.log(`Curve length: ${duration}s`);
   * ```
   */
  static getDuration(curve: Curve): number {
    return curve.maxTime - curve.minTime;
  }

  /**
   * Get curve value range
   *
   * Returns the difference between maximum and minimum values.
   *
   * @param curve - Curve to measure
   * @returns Value range
   *
   * @example
   * ```typescript
   * const range = CurveUtils.getValueRange(curve);
   * console.log(`Value range: ${range}`);
   * ```
   */
  static getValueRange(curve: Curve): number {
    return curve.maxValue - curve.minValue;
  }

  /**
   * Clone a curve
   *
   * Creates a deep copy of a curve with a new ID.
   *
   * @param curve - Curve to clone
   * @param newId - Optional new ID (default: auto-generated)
   * @returns Cloned curve
   *
   * @example
   * ```typescript
   * const copy = CurveUtils.clone(curve);
   * ```
   */
  static clone(curve: Curve, newId?: string): Curve {
    return {
      ...curve,
      id: newId || `${curve.id}-clone-${Date.now()}`,
      points: curve.points.map((point) => ({ ...point })),
    };
  }

  /**
   * Merge multiple curves into one
   *
   * Combines multiple curves by concatenating their points.
   * Curves are placed end-to-end in time.
   *
   * @param curves - Array of curves to merge
   * @param newId - Optional ID for merged curve
   * @returns Merged curve
   *
   * @example
   * ```typescript
   * const merged = CurveUtils.merge([curve1, curve2, curve3]);
   * ```
   */
  static merge(curves: Curve[], newId?: string): Curve {
    if (curves.length === 0) {
      throw new Error("Cannot merge empty curve array");
    }

    if (curves.length === 1) {
      return this.clone(curves[0], newId);
    }

    let timeOffset = 0;
    const allPoints: CurvePoint[] = [];
    let globalMinValue = Infinity;
    let globalMaxValue = -Infinity;

    for (const curve of curves) {
      const shiftedPoints = curve.points.map((point) => ({
        ...point,
        id: `${point.id}-merged`,
        time: point.time + timeOffset,
      }));

      allPoints.push(...shiftedPoints);

      globalMinValue = Math.min(globalMinValue, curve.minValue);
      globalMaxValue = Math.max(globalMaxValue, curve.maxValue);

      timeOffset += this.getDuration(curve);
    }

    return {
      id: newId || `merged-${Date.now()}`,
      name: "Merged Curve",
      points: allPoints,
      minValue: globalMinValue,
      maxValue: globalMaxValue,
      minTime: 0,
      maxTime: timeOffset,
      loop: false,
      loopStart: 0,
      loopEnd: timeOffset,
    };
  }
}

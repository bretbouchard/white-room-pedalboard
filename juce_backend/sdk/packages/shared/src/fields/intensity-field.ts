/**
 * Intensity Field Implementation
 *
 * Intensity fields drive the emotional and dynamic shape of musical
 * material, enabling continuous evolution and climactic development.
 */

import {
  IntensityField as IIntensityField,
  MusicalTime,
} from '../types/realization';

/**
 * Intensity interpolation strategies
 */
export type InterpolationStrategy = 'linear' | 'cubic' | 'exponential' | 'sine';

/**
 * Intensity curve generation algorithms
 */
export type IntensityCurveType =
  | 'constant'
  | 'linear-ramp'
  | 'exponential-rise'
  | 'logarithmic-fall'
  | 'sine-wave'
  | 'sawtooth'
  | 'square'
  | 'custom';

/**
 * Intensity field implementation with support for various curves
 */
export class IntensityField implements IIntensityField {
  public readonly id: string;
  public values: number[];
  public timePoints: number[];
  public interpolation: 'linear' | 'cubic' | 'exponential';

  private _curveType: IntensityCurveType;
  private _parameters: Record<string, number>;
  private _cache: Map<string, number> = new Map();

  constructor(options: {
    id: string;
    values?: number[];
    timePoints?: number[];
    interpolation?: 'linear' | 'cubic' | 'exponential';
    curveType?: IntensityCurveType;
    parameters?: Record<string, number>;
  }) {
    this.id = options.id;
    this.values = options.values || [];
    this.timePoints = options.timePoints || [];
    this.interpolation = options.interpolation || 'cubic';
    this._curveType = options.curveType || 'constant';
    this._parameters = options.parameters || {};

    // Generate values if curve type is specified
    if (this.values.length === 0 && this._curveType !== 'custom') {
      this.generateFromCurve();
    }
  }

  /**
   * Get intensity value at specific time
   */
  getValueAt(time: number): number {
    // Check cache first
    const cacheKey = `v_${time.toFixed(6)}`;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey)!;
    }

    let value: number;

    if (this.values.length === 0) {
      value = 0.5; // Default moderate intensity
    } else if (this.timePoints.length <= 1) {
      // Single point case
      value = this.values[0];
    } else if (time <= this.timePoints[0]) {
      // Before first point - extrapolate
      value = this.extrapolateBefore(time);
    } else if (time >= this.timePoints[this.timePoints.length - 1]) {
      // After last point - extrapolate
      value = this.extrapolateAfter(time);
    } else {
      // Between points - interpolate
      value = this.interpolate(time);
    }

    // Clamp to valid range
    value = Math.max(0, Math.min(1, value));

    // Cache result
    if (this._cache.size < 10000) { // Prevent memory bloat
      this._cache.set(cacheKey, value);
    }

    return value;
  }

  /**
   * Get intensity gradient (rate of change) at specific time
   */
  getGradientAt(time: number): number {
    const delta = 0.001; // Small time step for numerical differentiation
    const value1 = this.getValueAt(time - delta);
    const value2 = this.getValueAt(time + delta);

    return (value2 - value1) / (2 * delta);
  }

  /**
   * Generate intensity values from curve type and parameters
   */
  private generateFromCurve(): void {
    const duration = this._parameters.duration || 10.0;
    const resolution = this._parameters.resolution || 100;
    const sampleRate = duration / resolution;

    this.timePoints = [];
    this.values = [];

    for (let i = 0; i <= resolution; i++) {
      const time = i * sampleRate;
      const value = this.calculateCurveValue(time, duration);

      this.timePoints.push(time);
      this.values.push(value);
    }
  }

  /**
   * Calculate curve value at specific time based on curve type
   */
  private calculateCurveValue(time: number, duration: number): number {
    const normalizedTime = time / duration;
    const { amplitude = 1.0, offset = 0.0, frequency = 1.0, phase = 0.0 } = this._parameters;

    switch (this._curveType) {
      case 'constant':
        return Math.max(0, Math.min(1, offset));

      case 'linear-ramp':
        return Math.max(0, Math.min(1, amplitude * normalizedTime + offset));

      case 'exponential-rise':
        return Math.max(0, Math.min(1, amplitude * Math.pow(normalizedTime, 2) + offset));

      case 'logarithmic-fall':
        return Math.max(0, Math.min(1, amplitude * (1 - Math.pow(normalizedTime, 0.5)) + offset));

      case 'sine-wave':
        return Math.max(0, Math.min(1,
          amplitude * Math.sin(2 * Math.PI * frequency * normalizedTime + phase) * 0.5 + 0.5 + offset
        ));

      case 'sawtooth':
        const sawValue = (normalizedTime * frequency + phase / (2 * Math.PI)) % 1;
        return Math.max(0, Math.min(1, amplitude * sawValue + offset));

      case 'square':
        const squareValue = Math.sin(2 * Math.PI * frequency * normalizedTime + phase) > 0 ? 1 : 0;
        return Math.max(0, Math.min(1, amplitude * squareValue + offset));

      default:
        return 0.5;
    }
  }

  /**
   * Interpolate between known points
   */
  private interpolate(time: number): number {
    // Find surrounding points
    let index = 0;
    while (index < this.timePoints.length - 1 && this.timePoints[index + 1] <= time) {
      index++;
    }

    const t1 = this.timePoints[index];
    const t2 = this.timePoints[index + 1];
    const v1 = this.values[index];
    const v2 = this.values[index + 1];

    if (t2 === t1) {
      return v1; // Avoid division by zero
    }

    const normalizedT = (time - t1) / (t2 - t1);

    switch (this.interpolation) {
      case 'linear':
        return v1 + normalizedT * (v2 - v1);

      case 'cubic':
        // Cubic interpolation using neighboring points
        const v0 = index > 0 ? this.values[index - 1] : v1;
        const v3 = index < this.values.length - 2 ? this.values[index + 2] : v2;

        const t = normalizedT;
        const tt = t * t;
        const ttt = tt * t;

        return v0 * (-ttt + 2 * tt - t) +
               v1 * (3 * ttt - 5 * tt + 2) +
               v2 * (-3 * ttt + 4 * tt + t) +
               v3 * (ttt - tt);

      case 'exponential':
        // Exponential interpolation
        const logV1 = v1 > 0 ? Math.log(v1) : -10;
        const logV2 = v2 > 0 ? Math.log(v2) : -10;
        const logInterpolated = logV1 + normalizedT * (logV2 - logV1);
        return Math.exp(logInterpolated);

      default:
        return v1 + normalizedT * (v2 - v1);
    }
  }

  /**
   * Extrapolate before first point
   */
  private extrapolateBefore(time: number): number {
    if (this.values.length === 0) return 0.5;

    const firstTime = this.timePoints[0];
    const firstValue = this.values[0];
    const gradient = this.getGradientAt(firstTime);

    const extrapolatedValue = firstValue + gradient * (time - firstTime);
    return Math.max(0, Math.min(1, extrapolatedValue));
  }

  /**
   * Extrapolate after last point
   */
  private extrapolateAfter(time: number): number {
    if (this.values.length === 0) return 0.5;

    const lastIndex = this.values.length - 1;
    const lastTime = this.timePoints[lastIndex];
    const lastValue = this.values[lastIndex];
    const gradient = this.getGradientAt(lastTime);

    const extrapolatedValue = lastValue + gradient * (time - lastTime);
    return Math.max(0, Math.min(1, extrapolatedValue));
  }

  /**
   * Create intensity field from preset
   */
  static fromPreset(preset: IntensityPreset): IntensityField {
    const presets: Record<IntensityPreset, Partial<IntensityFieldOptions>> = {
      'constant-medium': {
        curveType: 'constant',
        parameters: { offset: 0.5 }
      },
      'gradual-rise': {
        curveType: 'exponential-rise',
        parameters: { amplitude: 0.8, offset: 0.2, duration: 10.0 }
      },
      'dramatic-climax': {
        curveType: 'sine-wave',
        parameters: {
          amplitude: 0.9,
          offset: 0.1,
          frequency: 0.5,
          phase: -Math.PI / 2,
          duration: 20.0
        }
      },
      'wave-motion': {
        curveType: 'sine-wave',
        parameters: {
          amplitude: 0.6,
          offset: 0.4,
          frequency: 2.0,
          duration: 15.0
        }
      },
      'tension-release': {
        curveType: 'sawtooth',
        parameters: {
          amplitude: 0.8,
          offset: 0.1,
          frequency: 0.3,
          duration: 12.0
        }
      },
      'pulsating': {
        curveType: 'square',
        parameters: {
          amplitude: 0.7,
          offset: 0.15,
          frequency: 3.0,
          duration: 8.0
        }
      }
    };

    const config = presets[preset];
    if (!config) {
      throw new Error(`Unknown intensity preset: ${preset}`);
    }

    return new IntensityField({
      id: `intensity-${preset}-${Date.now()}`,
      ...config
    });
  }

  /**
   * Blend multiple intensity fields
   */
  static blend(fields: Array<{ field: IntensityField; weight: number }>): IntensityField {
    if (fields.length === 0) {
      throw new Error('At least one field required for blending');
    }

    // Use first field's time points as reference
    const referenceField = fields[0].field;
    const blendedValues = referenceField.timePoints.map((time, index) => {
      return fields.reduce((sum, { field, weight }) => {
        return sum + field.getValueAt(time) * weight;
      }, 0);
    });

    const totalWeight = fields.reduce((sum, { weight }) => sum + weight, 0);

    return new IntensityField({
      id: `blended-${Date.now()}`,
      values: blendedValues.map(v => v / totalWeight),
      timePoints: referenceField.timePoints,
      interpolation: 'cubic'
    });
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this._cache.clear();
  }

  /**
   * Get field statistics
   */
  getStatistics(): {
    min: number;
    max: number;
    mean: number;
    variance: number;
    range: number;
  } {
    if (this.values.length === 0) {
      return { min: 0, max: 0, mean: 0, variance: 0, range: 0 };
    }

    const min = Math.min(...this.values);
    const max = Math.max(...this.values);
    const mean = this.values.reduce((sum, v) => sum + v, 0) / this.values.length;
    const variance = this.values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / this.values.length;

    return {
      min,
      max,
      mean,
      variance,
      range: max - min
    };
  }
}

/**
 * Intensity field configuration options
 */
export interface IntensityFieldOptions {
  id: string;
  values?: number[];
  timePoints?: number[];
  interpolation?: 'linear' | 'cubic' | 'exponential';
  curveType?: IntensityCurveType;
  parameters?: Record<string, number>;
}

/**
 * Predefined intensity presets
 */
export type IntensityPreset =
  | 'constant-medium'
  | 'gradual-rise'
  | 'dramatic-climax'
  | 'wave-motion'
  | 'tension-release'
  | 'pulsating';

/**
 * Utility functions for intensity field manipulation
 */
export class IntensityFieldUtils {
  /**
   * Create field from array of control points
   */
  static fromControlPoints(
    id: string,
    points: Array<{ time: number; value: number }>,
    interpolation: 'linear' | 'cubic' | 'exponential' = 'cubic'
  ): IntensityField {
    const sortedPoints = points.sort((a, b) => a.time - b.time);
    const times = sortedPoints.map(p => p.time);
    const values = sortedPoints.map(p => p.value);

    return new IntensityField({
      id,
      values,
      timePoints: times,
      interpolation
    });
  }

  /**
   * Extract control points from existing field at regular intervals
   */
  static extractControlPoints(
    field: IntensityField,
    intervalCount: number
  ): Array<{ time: number; value: number }> {
    if (field.timePoints.length < 2) {
      return field.timePoints.map((time, index) => ({
        time,
        value: field.values[index] || 0.5
      }));
    }

    const startTime = field.timePoints[0];
    const endTime = field.timePoints[field.timePoints.length - 1];
    const interval = (endTime - startTime) / (intervalCount - 1);

    const points: Array<{ time: number; value: number }> = [];

    for (let i = 0; i < intervalCount; i++) {
      const time = startTime + i * interval;
      const value = field.getValueAt(time);
      points.push({ time, value });
    }

    return points;
  }

  /**
   * Resample field to new time resolution
   */
  static resample(
    field: IntensityField,
    newDuration: number,
    newResolution: number
  ): IntensityField {
    const sampleRate = newDuration / newResolution;
    const newTimePoints: number[] = [];
    const newValues: number[] = [];

    for (let i = 0; i <= newResolution; i++) {
      const time = i * sampleRate;
      const oldTime = (time / newDuration) *
        (field.timePoints[field.timePoints.length - 1] || 10.0);

      newTimePoints.push(time);
      newValues.push(field.getValueAt(oldTime));
    }

    return new IntensityField({
      id: `${field.id}-resampled`,
      values: newValues,
      timePoints: newTimePoints,
      interpolation: field.interpolation
    });
  }
}
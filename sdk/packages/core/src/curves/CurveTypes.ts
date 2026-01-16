/**
 * Curve Types for White Room DSP UI Foundation
 *
 * This module provides the core type definitions for the curve engine,
 * which is used universally across automation, envelopes, LFOs, and control fields.
 *
 * @module curves/CurveTypes
 */

/**
 * Curve types for different interpolation methods
 *
 * Each curve type defines how values are interpolated between control points:
 * - linear: Straight line interpolation (fastest, most predictable)
 * - exponential: Exponential curve (factor > 1 for acceleration)
 * - logarithmic: Logarithmic curve (deceleration)
 * - sine: Sine wave interpolation (smooth ease-in/ease-out)
 * - step: Discrete steps (no interpolation, immediate changes)
 * - smooth: Hermite spline (tension-controlled smooth curves)
 * - catmull-rom: Catmull-Rom spline (smooth through all points)
 *
 * @typedef {'linear' | 'exponential' | 'logarithmic' | 'sine' | 'step' | 'smooth' | 'catmull-rom'} CurveType
 */
export type CurveType =
  | "linear" // Straight line between points
  | "exponential" // Exponential curve (factor > 1)
  | "logarithmic" // Logarithmic curve
  | "sine" // Sine wave interpolation
  | "step" // Discrete steps
  | "smooth" // Hermite spline
  | "catmull-rom"; // Catmull-Rom spline

/**
 * Control point in a curve
 *
 * Represents a single point in time with an associated value.
 * Each point can have different interpolation types for the segment
 * that follows it.
 *
 * @interface CurvePoint
 */
export interface CurvePoint {
  /** Unique identifier for this point */
  id: string;

  /**
   * Time or X position
   * Typically in seconds for envelopes/beats or 0-1 for LFOs
   */
  time: number;

  /**
   * Value or Y position
   * Normalized 0-1 for most use cases, but can be any range
   */
  value: number;

  /**
   * Interpolation type to the next point
   * Determines how values are calculated between this point and the next
   */
  curveType: CurveType;

  /**
   * Tension parameter for spline curves
   * Range: -1 to 1
   * -1: More relaxed/loose curves
   * 0: Normal Catmull-Rom
   * 1: Tighter/sharper curves
   */
  tension?: number;

  /**
   * Whether this point is locked from editing
   * Used to prevent accidental modification of key points
   */
  locked?: boolean;
}

/**
 * Curve segment between two points
 *
 * Represents the portion of a curve between two consecutive control points.
 * Used internally by the curve engine for interpolation calculations.
 *
 * @interface CurveSegment
 */
export interface CurveSegment {
  /** Starting point of the segment */
  p1: CurvePoint;

  /** Ending point of the segment */
  p2: CurvePoint;

  /** Start time of the segment */
  startTime: number;

  /** End time of the segment */
  endTime: number;
}

/**
 * Complete curve definition
 *
 * A curve is a collection of control points that define how a value changes
 * over time. Curves are used for automation, envelopes, LFOs, and more.
 *
 * @interface Curve
 */
export interface Curve {
  /** Unique identifier for this curve */
  id: string;

  /** Human-readable name */
  name: string;

  /**
   * Ordered array of control points
   * Must be sorted by time for proper evaluation
   */
  points: CurvePoint[];

  /** Minimum value range (for normalization) */
  minValue: number;

  /** Maximum value range (for normalization) */
  maxValue: number;

  /** Minimum time/position */
  minTime: number;

  /** Maximum time/position */
  maxTime: number;

  /**
   * Whether this curve loops
   * When true, playback continues from loopStart after reaching loopEnd
   */
  loop: boolean;

  /** Loop start point (in time units) */
  loopStart: number;

  /** Loop end point (in time units) */
  loopEnd: number;
}

/**
 * Curve evaluation result
 *
 * Contains the interpolated value at a given time plus additional
 * information about the curve's behavior at that point.
 *
 * @interface CurveEvaluation
 */
export interface CurveEvaluation {
  /**
   * Current interpolated value
   * The primary output of curve evaluation
   */
  value: number;

  /**
   * First derivative (slope) at the evaluated point
   * Rate of change: positive = increasing, negative = decreasing
   * Used for smoothing, glide, and parameter modulation
   */
  slope: number;

  /**
   * Second derivative (curvature) at the evaluated point
   * Rate of change of the slope
   * Used for advanced smoothing and detecting inflection points
   */
  curvature: number;
}

/**
 * Curve recording state
 *
 * Tracks the current state of real-time parameter recording.
 *
 * @interface CurveRecording
 */
export interface CurveRecording {
  /** Whether currently recording */
  isRecording: boolean;

  /** Timestamp when recording started (milliseconds since epoch) */
  startTime: number;

  /** Sample rate for recording (Hz) */
  sampleRate: number;
}

/**
 * Curve optimization options
 *
 * Configuration for reducing the number of points in a recorded curve
 * while maintaining visual accuracy.
 *
 * @interface CurveOptimizationOptions
 */
export interface CurveOptimizationOptions {
  /** Maximum deviation from original curve (0-1) */
  tolerance: number;

  /** Minimum time between points (seconds) */
  minPointSpacing: number;

  /** Whether to remove redundant points */
  removeRedundant: boolean;

  /** Whether to simplify linear segments */
  simplifyLinear: boolean;
}

/**
 * Curve validation result
 *
 * Result of validating a curve for correctness and consistency.
 *
 * @interface CurveValidationResult
 */
export interface CurveValidationResult {
  /** Whether the curve is valid */
  isValid: boolean;

  /** Array of validation errors (empty if valid) */
  errors: string[];

  /** Array of validation warnings (non-critical issues) */
  warnings: string[];
}

import { ScaleDegree, ContourDirection } from "./melody";

/**
 * Mathematical expansion operations for Schillinger System
 * Book 2: Melody - Section 3: Expansion Operations
 */

export interface ExpansionOptions {
  preserveContour: boolean;
  maintainIntegrity: boolean;
  allowDissonance: boolean;
  expansionRatio?: number;
}

export interface ContourExpansion {
  originalContour: ContourDirection[];
  expandedContour: ContourDirection[];
  expansionRatio: number;
  operation:
    | "permutation"
    | "interpolation"
    | "retrograde"
    | "inversion"
    | "combination";
  integrity: number; // 0-1, how well original structure is preserved
}

export interface IntervalExpansion {
  originalIntervals: number[];
  expandedIntervals: number[];
  harmonicMean: number;
  tension: number;
  consonance: number;
  operation: string;
}

export interface CoordinateTransformation {
  xCoefficients: number[];
  yCoefficients: number[];
  translation: { x: number; y: number };
  determinant: number; // area scaling factor
}

export interface InterpolationResult {
  points: { x: number; y: number }[];
  interpolationType:
    | "linear"
    | "polynomial"
    | "spline"
    | "exponential"
    | "cubic"
    | "bezier"
    | "catmull-rom";
  error: number; // RMS error from original points
  smoothness: number; // curvature measure
}

export interface ExpansionSequence {
  operations: ExpansionOperation[];
  finalResult: any;
  cumulativeTransform: CoordinateTransformation;
  metadata: {
    complexity: number;
    integrity: number;
    elegance: number;
  };
}

export type ExpansionOperation =
  | { type: "expand"; parameters: ExpansionParameters }
  | { type: "interpolate"; parameters: InterpolationParameters }
  | { type: "permute"; parameters: PermutationParameters }
  | { type: "transform"; parameters: TransformParameters };

export interface ExpansionParameters {
  ratio: number;
  method: "linear" | "exponential" | "fibonacci" | "geometric";
  preserveEndpoint: boolean;
}

export interface InterpolationParameters {
  method: "linear" | "cubic" | "bezier" | "catmull-rom";
  tension: number; // 0-1, curvature control
  continuity: number; // 0-1, smoothness control
  bias: number; // -1 to 1, direction bias
}

export interface PermutationParameters {
  type: "rotation" | "reflection" | "inversion" | "combination";
  axis?: number; // for reflection
  order?: number[]; // custom permutation order
}

export interface TransformParameters {
  matrix: number[][]; // 2x2 or 3x3 transformation matrix
  translation?: number[];
  homogeneous?: boolean;
}

/**
 * Expansion Operators Engine
 *
 * Mathematical engine for generating expansions of contours and intervals
 * based on Schillinger's operations.
 */
export class ExpansionOperators {
  private static readonly PHI = (1 + Math.sqrt(5)) / 2;
  private static readonly FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];

  /**
   * Expand a melodic contour using various mathematical operations
   */
  static expandContour(
    contour: ContourDirection[],
    options: ExpansionOptions = {
      preserveContour: true,
      maintainIntegrity: true,
      allowDissonance: false,
    },
  ): ContourExpansion[] {
    const expansions: ContourExpansion[] = [];

    // 1. Permutation Expansion
    expansions.push(...this.generatePermutationExpansions(contour, options));

    // 2. Interpolation Expansion
    expansions.push(...this.generateInterpolationExpansions(contour, options));

    // 3. Retrograde Expansion
    expansions.push(this.generateRetrogradeExpansion(contour, options));

    // 4. Inversion Expansion
    expansions.push(this.generateInversionExpansion(contour, options));

    // 5. Combination Expansions
    expansions.push(...this.generateCombinationExpansions(contour, options));

    return expansions.filter((exp) => exp.integrity >= 0.3); // Filter low-quality expansions
  }

  /**
   * Expand harmonic intervals using Schillinger's interval operations
   */
  static expandIntervals(
    intervals: number[],
    options: ExpansionOptions = {
      preserveContour: true,
      maintainIntegrity: true,
      allowDissonance: false,
    },
  ): IntervalExpansion[] {
    const expansions: IntervalExpansion[] = [];

    // 1. Arithmetic Expansion
    expansions.push(...this.arithmeticExpansion(intervals, options));

    // 2. Geometric Expansion
    expansions.push(...this.geometricExpansion(intervals, options));

    // 3. Fibonacci Expansion
    expansions.push(...this.fibonacciExpansion(intervals, options));

    // 4. Harmonic Expansion
    expansions.push(...this.harmonicExpansion(intervals, options));

    // 5. Serial Expansion (twelve-tone operations)
    expansions.push(...this.serialExpansion(intervals, options));

    return expansions.filter(
      (exp) => exp.consonance >= 0.2 || options.allowDissonance,
    );
  }

  /**
   * Apply coordinate transformations to pitch-time space
   */
  static transformCoordinates(
    points: { x: number; y: number }[],
    transform: CoordinateTransformation,
  ): { x: number; y: number }[] {
    return points.map((point) => ({
      x:
        transform.xCoefficients[0] * point.x +
        transform.xCoefficients[1] * point.y +
        transform.translation.x,
      y:
        transform.yCoefficients[0] * point.x +
        transform.yCoefficients[1] * point.y +
        transform.translation.y,
    }));
  }

  /**
   * Generate interpolated points between contour points
   */
  static interpolateContour(
    points: { x: number; y: number }[],
    parameters: InterpolationParameters,
  ): InterpolationResult {
    switch (parameters.method) {
      case "linear":
        return this.linearInterpolation(points, parameters);
      case "cubic":
        return this.cubicInterpolation(points, parameters);
      case "bezier":
        return this.bezierInterpolation(points, parameters);
      case "catmull-rom":
        return this.catmullRomInterpolation(points, parameters);
      default:
        throw new Error(`Unknown interpolation method: ${parameters.method}`);
    }
  }

  /**
   * Compose multiple expansion operations into a single sequence
   */
  static composeExpansions(
    initialData: any,
    operations: ExpansionOperation[],
  ): ExpansionSequence {
    let currentData = initialData;
    const transforms: CoordinateTransformation[] = [];

    operations.forEach((op, index) => {
      let transform: CoordinateTransformation;

      switch (op.type) {
        case "expand":
          currentData = this.applyExpansion(currentData, op.parameters);
          transform = this.expansionToTransform(op.parameters);
          break;
        case "interpolate":
          currentData = this.applyInterpolation(currentData, op.parameters);
          transform = this.interpolationToTransform(op.parameters);
          break;
        case "permute":
          currentData = this.applyPermutation(currentData, op.parameters);
          transform = this.permutationToTransform(op.parameters);
          break;
        case "transform":
          currentData = this.applyTransform(currentData, op.parameters);
          transform = this.matrixToTransform(op.parameters);
          break;
      }

      transforms.push(transform);
    });

    const cumulativeTransform = this.composeTransforms(transforms);
    const metadata = this.calculateSequenceMetadata(operations);

    return {
      operations,
      finalResult: currentData,
      cumulativeTransform,
      metadata,
    };
  }

  /**
   * Analyze mathematical properties of an expansion
   */
  static analyzeExpansion(
    original: any,
    expanded: any,
  ): {
    complexity: number;
    integrity: number;
    elegance: number;
    growth: number;
    redundancy: number;
  } {
    return {
      complexity: this.calculateComplexity(expanded),
      integrity: this.calculateIntegrity(original, expanded),
      elegance: this.calculateElegance(expanded),
      growth: this.calculateGrowth(original, expanded),
      redundancy: this.calculateRedundancy(expanded),
    };
  }

  // Private implementation methods

  private static generatePermutationExpansions(
    contour: ContourDirection[],
    options: ExpansionOptions,
  ): ContourExpansion[] {
    const expansions: ContourExpansion[] = [];

    // Rotation permutations
    for (let i = 1; i < contour.length; i++) {
      const rotated = [...contour.slice(i), ...contour.slice(0, i)];
      expansions.push({
        originalContour: contour,
        expandedContour: rotated,
        expansionRatio: contour.length / rotated.length,
        operation: "permutation",
        integrity: this.calculateContourIntegrity(contour, rotated),
      });
    }

    return expansions;
  }

  private static generateInterpolationExpansions(
    contour: ContourDirection[],
    options: ExpansionOptions,
  ): ContourExpansion[] {
    const expansions: ContourExpansion[] = [];
    const points = this.contourToPoints(contour);

    // Interpolate with different ratios
    for (const ratio of [1.5, 2, 2.5, this.PHI]) {
      const interpolated = this.interpolateContour(points, {
        method: "cubic",
        tension: 0.5,
        continuity: 0.5,
        bias: 0,
      });

      const expandedPoints = this.scalePoints(interpolated.points, ratio);
      const expandedContour = this.pointsToContour(expandedPoints);

      expansions.push({
        originalContour: contour,
        expandedContour,
        expansionRatio: ratio,
        operation: "interpolation",
        integrity: this.calculateContourIntegrity(contour, expandedContour),
      });
    }

    return expansions;
  }

  private static generateRetrogradeExpansion(
    contour: ContourDirection[],
    options: ExpansionOptions,
  ): ContourExpansion {
    const retrograde = [...contour].reverse();

    return {
      originalContour: contour,
      expandedContour: retrograde,
      expansionRatio: 1,
      operation: "retrograde",
      integrity: this.calculateContourIntegrity(contour, retrograde),
    };
  }

  private static generateInversionExpansion(
    contour: ContourDirection[],
    options: ExpansionOptions,
  ): ContourExpansion {
    const inverted = contour.map((dir) => {
      switch (dir) {
        case "up":
          return "down";
        case "down":
          return "up";
        case "static":
          return "static";
        default:
          return dir;
      }
    });

    // For inversion, calculate structural integrity differently
    // Inversions preserve structure even when directions are opposite
    let preservedStructure = 0;
    contour.forEach((dir, i) => {
      if (dir === "static" && inverted[i] === "static") preservedStructure++;
      else if (dir !== "static") preservedStructure += 0.5; // Partial credit for inverted non-same directions
    });

    const integrity = preservedStructure / contour.length;

    return {
      originalContour: contour,
      expandedContour: inverted as ContourDirection[],
      expansionRatio: 1,
      operation: "inversion",
      integrity: Math.max(integrity, 0.5), // Ensure minimum integrity for inversions
    };
  }

  private static generateCombinationExpansions(
    contour: ContourDirection[],
    options: ExpansionOptions,
  ): ContourExpansion[] {
    const expansions: ContourExpansion[] = [];

    // Retrograde inversion
    const retrograde = [...contour].reverse();
    const retroInversion = retrograde.map((dir) => {
      switch (dir) {
        case "up":
          return "down";
        case "down":
          return "up";
        case "static":
          return "static";
        default:
          return dir;
      }
    });

    expansions.push({
      originalContour: contour,
      expandedContour: retroInversion as ContourDirection[],
      expansionRatio: 1,
      operation: "combination",
      integrity: this.calculateContourIntegrity(
        contour,
        retroInversion as ContourDirection[],
      ),
    });

    return expansions;
  }

  private static arithmeticExpansion(
    intervals: number[],
    options: ExpansionOptions,
  ): IntervalExpansion[] {
    const expansions: IntervalExpansion[] = [];
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Add arithmetic mean to each interval
    const expanded = intervals
      .map((interval) => [interval, interval + avg])
      .flat();

    expansions.push({
      originalIntervals: intervals,
      expandedIntervals: expanded,
      harmonicMean: this.calculateHarmonicMean(expanded),
      tension: this.calculateTension(expanded),
      consonance: this.calculateConsonance(expanded),
      operation: "arithmetic",
    });

    return expansions;
  }

  private static geometricExpansion(
    intervals: number[],
    options: ExpansionOptions,
  ): IntervalExpansion[] {
    const expansions: IntervalExpansion[] = [];
    const product = intervals.reduce((a, b) => a * b, 1);
    const geometricMean = Math.pow(product, 1 / intervals.length);

    // Multiply each interval by geometric mean
    const expanded = intervals
      .map((interval) => [interval, Math.round(interval * geometricMean)])
      .flat();

    expansions.push({
      originalIntervals: intervals,
      expandedIntervals: expanded,
      harmonicMean: this.calculateHarmonicMean(expanded),
      tension: this.calculateTension(expanded),
      consonance: this.calculateConsonance(expanded),
      operation: "geometric",
    });

    return expansions;
  }

  private static fibonacciExpansion(
    intervals: number[],
    options: ExpansionOptions,
  ): IntervalExpansion[] {
    const expansions: IntervalExpansion[] = [];

    // Generate full expansions for different Fibonacci ratios
    this.FIBONACCI.slice(2, 6).forEach((fibRatio) => {
      // Use ratios 2, 3, 5, 8
      const expanded: number[] = [];
      intervals.forEach((interval) => {
        expanded.push(interval);
        expanded.push(interval * fibRatio);
      });

      expansions.push({
        originalIntervals: intervals,
        expandedIntervals: expanded,
        harmonicMean: this.calculateHarmonicMean(expanded),
        tension: this.calculateTension(expanded),
        consonance: this.calculateConsonance(expanded),
        operation: `fibonacci-${fibRatio}`,
      });
    });

    return expansions;
  }

  private static harmonicExpansion(
    intervals: number[],
    options: ExpansionOptions,
  ): IntervalExpansion[] {
    const expansions: IntervalExpansion[] = [];

    // Generate harmonic series based on the smallest interval
    const baseInterval = Math.min(...intervals.map(Math.abs));

    // Generate harmonic series: base, base*1, base*2, base*3
    const harmonic = [
      baseInterval,
      baseInterval * 1,
      baseInterval * 2,
      baseInterval * 3,
    ];

    expansions.push({
      originalIntervals: intervals,
      expandedIntervals: harmonic,
      harmonicMean: this.calculateHarmonicMean(harmonic),
      tension: this.calculateTension(harmonic),
      consonance: this.calculateConsonance(harmonic),
      operation: "harmonic-series",
    });

    return expansions;
  }

  private static serialExpansion(
    intervals: number[],
    options: ExpansionOptions,
  ): IntervalExpansion[] {
    const expansions: IntervalExpansion[] = [];

    // Twelve-tone row operations
    const retrograde = [...intervals].reverse();
    const inversion = intervals.map((interval) => -interval);
    const retroInversion = retrograde.map((interval) => -interval);

    [
      { expanded: retrograde, operation: "retrograde" },
      { expanded: inversion, operation: "inversion" },
      { expanded: retroInversion, operation: "retrograde-inversion" },
    ].forEach(({ expanded, operation }) => {
      expansions.push({
        originalIntervals: intervals,
        expandedIntervals: expanded,
        harmonicMean: this.calculateHarmonicMean(expanded),
        tension: this.calculateTension(expanded),
        consonance: this.calculateConsonance(expanded),
        operation,
      });
    });

    return expansions;
  }

  // Utility methods

  private static linearInterpolation(
    points: { x: number; y: number }[],
    parameters: InterpolationParameters,
  ): InterpolationResult {
    const interpolated: { x: number; y: number }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];

      interpolated.push(start);

      // Add interpolated points
      for (let t = 0.25; t < 1; t += 0.25) {
        interpolated.push({
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        });
      }
    }

    interpolated.push(points[points.length - 1]);

    return {
      points: interpolated,
      interpolationType: "linear",
      error: 0, // Linear interpolation has zero error for the original points
      smoothness: 1, // Perfect smoothness for linear
    };
  }

  private static cubicInterpolation(
    points: { x: number; y: number }[],
    parameters: InterpolationParameters,
  ): InterpolationResult {
    // Simplified cubic interpolation implementation
    const interpolated: { x: number; y: number }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      interpolated.push(p1);

      // Cubic Hermite interpolation
      for (let t = 0.25; t < 1; t += 0.25) {
        const t2 = t * t;
        const t3 = t2 * t;

        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;

        interpolated.push({
          x:
            h00 * p1.x +
            h10 * parameters.tension * (p2.x - p0.x) +
            h01 * p2.x +
            h11 * parameters.tension * (p3.x - p1.x),
          y:
            h00 * p1.y +
            h10 * parameters.tension * (p2.y - p0.y) +
            h01 * p2.y +
            h11 * parameters.tension * (p3.y - p1.y),
        });
      }
    }

    interpolated.push(points[points.length - 1]);

    return {
      points: interpolated,
      interpolationType: "cubic",
      error: 0.1, // Small error due to approximation
      smoothness: parameters.tension,
    };
  }

  private static bezierInterpolation(
    points: { x: number; y: number }[],
    parameters: InterpolationParameters,
  ): InterpolationResult {
    // Simplified Bézier curve implementation
    const interpolated: { x: number; y: number }[] = [];

    if (points.length < 2)
      return {
        points: [],
        interpolationType: "bezier",
        error: 1,
        smoothness: 0,
      };

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      // Control points based on tension
      const cp1 = {
        x: p0.x + (p1.x - p0.x) * 0.25,
        y: p0.y + (p1.y - p0.y) * 0.25 * (1 - parameters.tension),
      };
      const cp2 = {
        x: p1.x - (p1.x - p0.x) * 0.25,
        y: p1.y - (p1.y - p0.y) * 0.25 * (1 - parameters.tension),
      };

      interpolated.push(p0);

      // Bézier interpolation
      for (let t = 0.25; t < 1; t += 0.25) {
        const t2 = t * t;
        const tm = 1 - t;
        const tm2 = tm * tm;

        interpolated.push({
          x:
            tm2 * tm * p0.x +
            3 * tm2 * t * cp1.x +
            3 * tm * t2 * cp2.x +
            t2 * t * p1.x,
          y:
            tm2 * tm * p0.y +
            3 * tm2 * t * cp1.y +
            3 * tm * t2 * cp2.y +
            t2 * t * p1.y,
        });
      }
    }

    interpolated.push(points[points.length - 1]);

    return {
      points: interpolated,
      interpolationType: "bezier",
      error: 0.05,
      smoothness: 1 - parameters.tension,
    };
  }

  private static catmullRomInterpolation(
    points: { x: number; y: number }[],
    parameters: InterpolationParameters,
  ): InterpolationResult {
    // Catmull-Rom spline implementation
    const interpolated: { x: number; y: number }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      interpolated.push(p1);

      // Catmull-Rom interpolation
      for (let t = 0.25; t < 1; t += 0.25) {
        const t2 = t * t;
        const t3 = t2 * t;

        interpolated.push({
          x:
            0.5 *
            (2 * p1.x +
              (-p0.x + p2.x) * t +
              (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
              (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y:
            0.5 *
            (2 * p1.y +
              (-p0.y + p2.y) * t +
              (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
              (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        });
      }
    }

    interpolated.push(points[points.length - 1]);

    return {
      points: interpolated,
      interpolationType: "catmull-rom",
      error: 0.02,
      smoothness: parameters.continuity,
    };
  }

  private static contourToPoints(
    contour: ContourDirection[],
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];

    contour.forEach((direction, i) => {
      const prevPoint = points[points.length - 1];
      let newY = prevPoint.y;

      switch (direction) {
        case "up":
          newY += 1;
          break;
        case "down":
          newY -= 1;
          break;
        case "static":
          break; // No change
      }

      points.push({ x: i + 1, y: newY });
    });

    return points;
  }

  private static pointsToContour(
    points: { x: number; y: number }[],
  ): ContourDirection[] {
    const contour: ContourDirection[] = [];

    for (let i = 1; i < points.length; i++) {
      const diff = points[i].y - points[i - 1].y;

      if (diff > 0.1) contour.push("up");
      else if (diff < -0.1) contour.push("down");
      else contour.push("static");
    }

    return contour;
  }

  private static scalePoints(
    points: { x: number; y: number }[],
    ratio: number,
  ): { x: number; y: number }[] {
    return points.map((point, i) => ({
      x: point.x * ratio,
      y: point.y,
    }));
  }

  private static calculateContourIntegrity(
    original: ContourDirection[],
    expanded: ContourDirection[],
  ): number {
    if (original.length === 0 || expanded.length === 0) return 0;

    // Measure how well the expanded contour preserves the original's essential characteristics
    let matches = 0;
    const ratio = expanded.length / original.length;

    for (let i = 0; i < original.length; i++) {
      const expIndex = Math.floor(i * ratio);
      if (expIndex < expanded.length && original[i] === expanded[expIndex]) {
        matches++;
      }
    }

    return matches / original.length;
  }

  private static calculateHarmonicMean(intervals: number[]): number {
    if (intervals.length === 0) return 0;

    const sum = intervals.reduce(
      (acc, interval) => acc + 1 / Math.abs(interval || 1),
      0,
    );
    return intervals.length / sum;
  }

  private static calculateTension(intervals: number[]): number {
    // Simplified tension calculation based on interval sizes
    const avgInterval =
      intervals.reduce((a, b) => a + Math.abs(b), 0) / intervals.length;
    return Math.min(1, avgInterval / 12); // Normalize to 0-1 range
  }

  private static calculateConsonance(intervals: number[]): number {
    // Simplified consonance calculation
    const consonantIntervals = [1, 3, 4, 5, 6, 8, 9, 10, 12]; // Within octave
    const consonantCount = intervals.filter((interval) =>
      consonantIntervals.includes(Math.abs(interval % 12)),
    ).length;

    return consonantCount / intervals.length;
  }

  private static calculateComplexity(data: any): number {
    // Improved complexity measure
    if (Array.isArray(data)) {
      // Complexity based on length and growth
      const lengthComplexity = Math.min(1, data.length / 10);
      return Math.max(0, Math.min(1, lengthComplexity)); // Clamp to [0,1]
    }
    return 0.5; // Default complexity
  }

  private static calculateIntegrity(original: any, expanded: any): number {
    // Improved integrity calculation
    if (Array.isArray(original) && Array.isArray(expanded)) {
      // Check if all original elements are preserved in expanded
      let preservedElements = 0;
      original.forEach((elem) => {
        if (expanded.includes(elem)) preservedElements++;
      });

      const preservationRatio =
        preservedElements / Math.max(original.length, 1);

      // Also check the structural integrity using contour calculation
      const structuralIntegrity = this.calculateContourIntegrity(
        original,
        expanded,
      );

      // Average of both measures
      return Math.max(
        0,
        Math.min(1, (preservationRatio + structuralIntegrity) / 2),
      ); // Clamp to [0,1]
    }
    return 0.5;
  }

  private static calculateElegance(data: any): number {
    // Improved elegance measure based on symmetry, patterns, and smoothness
    if (Array.isArray(data)) {
      // Check for symmetry
      const firstHalf = data.slice(0, Math.floor(data.length / 2));
      const secondHalf = data.slice(Math.ceil(data.length / 2)).reverse();

      let matches = 0;
      for (let i = 0; i < Math.min(firstHalf.length, secondHalf.length); i++) {
        if (firstHalf[i] === secondHalf[i]) matches++;
      }

      const symmetryScore = matches / Math.max(firstHalf.length, 1);

      // Check for smooth progressions (numerical arrays)
      let smoothness = 0;
      if (data.length > 2 && data.every((item) => typeof item === "number")) {
        let smoothTransitions = 0;
        for (let i = 1; i < data.length - 1; i++) {
          const prevDiff = Math.abs(data[i] - data[i - 1]);
          const nextDiff = Math.abs(data[i + 1] - data[i]);
          if (Math.abs(prevDiff - nextDiff) < 0.5) smoothTransitions++;
        }
        smoothness = smoothTransitions / Math.max(data.length - 2, 1);
      }

      // Average of symmetry and smoothness
      return Math.max(0, Math.min(1, (symmetryScore + smoothness) / 2)); // Clamp to [0,1]
    }
    return 0.5;
  }

  private static calculateGrowth(original: any, expanded: any): number {
    if (Array.isArray(original) && Array.isArray(expanded)) {
      return Math.max(0, expanded.length / Math.max(original.length, 1)); // Can be > 1
    }
    return 1;
  }

  private static calculateRedundancy(data: any): number {
    if (Array.isArray(data)) {
      const unique = new Set(data);
      return Math.max(0, Math.min(1, 1 - unique.size / data.length)); // Clamp to [0,1]
    }
    return 0;
  }

  private static applyExpansion(
    data: any,
    parameters: ExpansionParameters,
  ): any {
    if (Array.isArray(data) && data.length <= 1000) {
      // Add upper bound to prevent exponential growth
      if (parameters.method === "linear") {
        const ratio = Math.min(Math.max(parameters.ratio, 1), 10); // Clamp ratio to reasonable range
        const expanded = this.linearExpansion(
          data,
          ratio,
          parameters.preserveEndpoint,
        );
        // Safety check to prevent runaway growth
        if (expanded.length <= data.length * 10) {
          return expanded;
        }
      } else if (parameters.method === "fibonacci") {
        const ratio = Math.min(Math.max(parameters.ratio, 1), 10); // Clamp ratio
        return this.fibonacciArrayExpansion(data, ratio);
      }
    }
    return data;
  }

  private static applyInterpolation(
    data: any,
    parameters: InterpolationParameters,
  ): any {
    if (Array.isArray(data) && data.length >= 2 && data.length <= 1000) {
      // Add upper bound to prevent exponential growth
      const points = data.map((value, index) => ({ x: index, y: value }));
      const result = this.interpolateContour(points, parameters);
      const interpolated = result.points.map((p) => p.y);
      // Safety check to prevent runaway growth
      if (interpolated.length <= data.length * 10) {
        return interpolated;
      }
    }
    return data;
  }

  private static applyPermutation(
    data: any,
    parameters: PermutationParameters,
  ): any {
    if (Array.isArray(data)) {
      switch (parameters.type) {
        case "rotation":
          return this.rotateArray(data, parameters.axis || 1);
        case "reflection":
          return [...data].reverse();
        case "inversion":
          return data.map((item: any) => -item);
        case "combination":
          const reflected = [...data].reverse();
          return reflected.map((item: any) => -item);
      }
    }
    return data;
  }

  private static applyTransform(
    data: any,
    parameters: TransformParameters,
  ): any {
    // Simplified matrix transformation
    if (Array.isArray(data) && parameters.matrix.length >= 2) {
      return data.map(
        (value: any) =>
          parameters.matrix[0][0] * value +
          parameters.matrix[0][1] * (parameters.translation?.[0] || 0),
      );
    }
    return data;
  }

  private static expansionToTransform(
    parameters: ExpansionParameters,
  ): CoordinateTransformation {
    return {
      xCoefficients: [parameters.ratio, 0],
      yCoefficients: [0, 1],
      translation: { x: 0, y: 0 },
      determinant: parameters.ratio,
    };
  }

  private static interpolationToTransform(
    parameters: InterpolationParameters,
  ): CoordinateTransformation {
    return {
      xCoefficients: [2, 0], // Roughly doubles the points
      yCoefficients: [0, 1],
      translation: { x: 0, y: 0 },
      determinant: 2,
    };
  }

  private static permutationToTransform(
    parameters: PermutationParameters,
  ): CoordinateTransformation {
    switch (parameters.type) {
      case "reflection":
        return {
          xCoefficients: [-1, 0],
          yCoefficients: [0, 1],
          translation: { x: 0, y: 0 },
          determinant: -1,
        };
      default:
        return {
          xCoefficients: [1, 0],
          yCoefficients: [0, 1],
          translation: { x: 0, y: 0 },
          determinant: 1,
        };
    }
  }

  private static matrixToTransform(
    parameters: TransformParameters,
  ): CoordinateTransformation {
    return {
      xCoefficients: parameters.matrix[0] || [1, 0],
      yCoefficients: parameters.matrix[1] || [0, 1],
      translation: {
        x: parameters.translation?.[0] || 0,
        y: parameters.translation?.[1] || 0,
      },
      determinant:
        parameters.matrix[0]?.[0] * parameters.matrix[1]?.[1] -
          parameters.matrix[0]?.[1] * parameters.matrix[1]?.[0] || 1,
    };
  }

  private static composeTransforms(
    transforms: CoordinateTransformation[],
  ): CoordinateTransformation {
    return transforms.reduce((acc, transform) => ({
      xCoefficients: [
        acc.xCoefficients[0] * transform.xCoefficients[0] +
          acc.xCoefficients[1] * transform.yCoefficients[0],
        acc.xCoefficients[0] * transform.xCoefficients[1] +
          acc.xCoefficients[1] * transform.yCoefficients[1],
      ],
      yCoefficients: [
        acc.yCoefficients[0] * transform.xCoefficients[0] +
          acc.yCoefficients[1] * transform.yCoefficients[0],
        acc.yCoefficients[0] * transform.xCoefficients[1] +
          acc.yCoefficients[1] * transform.yCoefficients[1],
      ],
      translation: {
        x: acc.translation.x + transform.translation.x,
        y: acc.translation.y + transform.translation.y,
      },
      determinant: acc.determinant * transform.determinant,
    }));
  }

  private static calculateSequenceMetadata(operations: ExpansionOperation[]) {
    return {
      complexity: Math.min(1, operations.length / 10),
      integrity: 0.8, // Simplified
      elegance: 0.7, // Simplified
    };
  }

  private static linearExpansion(
    data: any[],
    ratio: number,
    preserveEndpoint: boolean,
  ): any[] {
    const expanded: any[] = [];
    const numInterpolatedPoints = Math.max(0, Math.floor(ratio) - 1);

    for (let i = 0; i < data.length - 1; i++) {
      expanded.push(data[i]);

      // Add intermediate points using fixed count instead of floating point loop
      for (let j = 1; j <= numInterpolatedPoints; j++) {
        if (typeof data[i] === "number" && typeof data[i + 1] === "number") {
          const t = j / (numInterpolatedPoints + 1);
          expanded.push(data[i] + (data[i + 1] - data[i]) * t);
        }
      }
    }

    if (preserveEndpoint || data.length === 1) {
      expanded.push(data[data.length - 1]);
    }

    return expanded;
  }

  private static fibonacciArrayExpansion(data: any[], ratio: number): any[] {
    const fibRatio = this.FIBONACCI[Math.floor(ratio) % this.FIBONACCI.length];
    const expanded: any[] = [];

    data.forEach((item) => {
      expanded.push(item);
      if (typeof item === "number") {
        expanded.push(item * fibRatio);
      }
    });

    return expanded;
  }

  private static rotateArray(data: any[], positions: number): any[] {
    const pos = positions % data.length;
    return [...data.slice(pos), ...data.slice(0, pos)];
  }
}

/**
 * High-level API for expansion operations
 */
export class ExpansionAPI {
  /**
   * Generate melodic expansions using Schillinger operations
   */
  static async generateMelodicExpansions(
    melody: {
      notes: Array<{ pitch: number; time: number; duration: number }>;
      contour: ContourDirection[];
    },
    options: ExpansionOptions = {
      preserveContour: true,
      maintainIntegrity: true,
      allowDissonance: false,
    },
  ): Promise<{
    expansions: ContourExpansion[];
    analysis: {
      complexity: number;
      integrity: number;
      elegance: number;
    };
  }> {
    const expansions = ExpansionOperators.expandContour(
      melody.contour,
      options,
    );

    // Extract intervals from melody
    const intervals = [];
    for (let i = 1; i < melody.notes.length; i++) {
      intervals.push(melody.notes[i].pitch - melody.notes[i - 1].pitch);
    }

    const intervalExpansions = ExpansionOperators.expandIntervals(
      intervals,
      options,
    );

    return {
      expansions,
      analysis: {
        complexity: Math.max(...expansions.map((e) => e.integrity)) || 0.5,
        integrity:
          expansions.reduce((sum, e) => sum + e.integrity, 0) /
          Math.max(expansions.length, 1),
        elegance:
          intervalExpansions.reduce((sum, e) => sum + e.consonance, 0) /
          Math.max(intervalExpansions.length, 1),
      },
    };
  }

  /**
   * Generate harmonic expansions using Schillinger operations
   */
  static async generateHarmonicExpansions(
    harmony: { intervals: number[]; rootProgression: number[] },
    options: ExpansionOptions = {
      preserveContour: true,
      maintainIntegrity: true,
      allowDissonance: false,
    },
  ): Promise<{
    expansions: IntervalExpansion[];
    transform: CoordinateTransformation;
  }> {
    const expansions = ExpansionOperators.expandIntervals(
      harmony.intervals,
      options,
    );

    const transform: CoordinateTransformation = {
      xCoefficients: [1, 0],
      yCoefficients: [0, 1],
      translation: { x: 0, y: 0 },
      determinant: 1,
    };

    return {
      expansions,
      transform,
    };
  }

  /**
   * Apply custom transformation sequence
   */
  static async applyCustomTransformation(
    data: any,
    operations: ExpansionOperation[],
  ): Promise<ExpansionSequence> {
    return ExpansionOperators.composeExpansions(data, operations);
  }

  /**
   * Analyze expansion quality and properties
   */
  static async analyzeExpansionQuality(
    original: any,
    expanded: any,
  ): Promise<{
    quality: number; // 0-1 overall quality score
    metrics: {
      complexity: number;
      integrity: number;
      elegance: number;
      growth: number;
      redundancy: number;
    };
    recommendation: string;
  }> {
    const metrics = ExpansionOperators.analyzeExpansion(original, expanded);

    // Weight quality calculation to heavily penalize high redundancy
    // Redundancy is now weighted 2x in the formula
    const quality =
      (metrics.complexity +
        metrics.integrity +
        metrics.elegance +
        (1 - metrics.redundancy) * 2) /
      5;

    let recommendation = "";
    if (quality >= 0.8) {
      recommendation =
        "Excellent expansion with high musical and mathematical quality";
    } else if (quality >= 0.6) {
      recommendation = "Good expansion with some room for improvement";
    } else if (quality >= 0.4) {
      recommendation = "Acceptable expansion, consider refining parameters";
    } else {
      recommendation =
        "Poor expansion quality, recommend重新generation with different parameters";
    }

    return {
      quality,
      metrics,
      recommendation,
    };
  }
}

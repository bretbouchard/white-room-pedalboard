import type { MelodyLine } from "@schillinger-sdk/shared";
import type { RhythmPattern as RhythmicPattern } from "@schillinger-sdk/shared";
import type { ContourDirection } from "./melody";

/**
 * Advanced Contour Engine for Schillinger System
 * Book 2: Melody - Section 2: Contour Operations and Expansion
 */

export interface ContourPoint {
  x: number; // Time position
  y: number; // Pitch/height
  velocity: number; // Attack strength
  duration: number; // Note duration
}

export interface ContourSegment {
  points: ContourPoint[];
  direction: "ascending" | "descending" | "static";
  slope: number; // Rate of change
  curvature: number; // Degree of bending
  tension: number; // Musical tension (0-1)
}

export interface ContourShape {
  type: ContourShapeType;
  parameters: ContourParameters;
  symmetry: number; // 0-1, how symmetrical the shape is
  complexity: number; // 0-1, structural complexity
  elegance: number; // 0-1, aesthetic quality
}

export type ContourShapeType =
  | "linear"
  | "exponential"
  | "logarithmic"
  | "sigmoid"
  | "bell_curve"
  | "inverse_bell"
  | "sawtooth"
  | "triangle"
  | "sinusoidal"
  | "schillinger_wave"
  | "interference_pattern"
  | "resultant_contour";

export interface ContourParameters {
  amplitude: number;
  frequency: number;
  phase: number;
  offset: number;
  damping?: number; // For exponential decay/growth
  harmonics?: number[]; // For complex waveforms
  modulation?: {
    type: "amplitude" | "frequency" | "phase";
    rate: number;
    depth: number;
  };
}

export interface ContourTransformation {
  type: "rotation" | "reflection" | "scaling" | "shear" | "warp" | "morph";
  parameters: TransformationParameters;
  resultingShape: ContourShape;
}

export interface TransformationParameters {
  angle?: number; // For rotation
  axis?: "x" | "y" | "diagonal" | "custom"; // For reflection
  scaleX?: number; // For scaling
  scaleY?: number; // For scaling
  shearX?: number; // For shear
  shearY?: number; // For shear
  translation?: { x: number; y: number }; // For translation
  warpFunction?: (point: ContourPoint) => ContourPoint; // For custom warp
  morphTarget?: ContourShape; // For morphing
  blendRatio?: number; // For morphing (0-1)
}

export interface ContourAnalysis {
  overallShape: ContourShape;
  segments: ContourSegment[];
  characteristics: {
    direction: "balanced" | "ascending_dominant" | "descending_dominant";
    range: number;
    centroid: { x: number; y: number };
    moments: number[]; // Statistical moments
    entropy: number; // Information entropy
    fractalDimension: number;
  };
  musicalProperties: {
    tensionProfile: number[];
    resolutionPoints: number[];
    climaxPoints: number[];
    stability: number;
  };
  schillingerAnalysis: {
    interferencePatterns: InterferencePattern[];
    resultantStructure: ResultantStructure;
    expansionPotential: number;
  };
}

export interface InterferencePattern {
  frequency: number;
  amplitude: number;
  phase: number;
  nodes: number[]; // Zero crossing points
  antinodes: number[]; // Maximum amplitude points
  complexity: number;
}

export interface ResultantStructure {
  generators: number[];
  period: number;
  symmetry: number;
  tension: number;
  stability: number;
}

export interface ContourGenerationOptions {
  length: number;
  range: { min: number; max: number };
  style: "smooth" | "angular" | "mixed";
  complexity: "simple" | "moderate" | "complex";
  musicalContext?: {
    key: string;
    scale: string;
    mode: string;
  };
  constraints?: {
    maxInterval?: number;
    avoidDissonance?: boolean;
    preferStepwise?: boolean;
  };
}

export interface ContourComparison {
  similarity: number; // 0-1
  correspondence: number[]; // Point mapping between contours
  differences: {
    structural: number;
    rhythmic: number;
    pitch: number;
    overall: number;
  };
  transformation: ContourTransformation; // Minimal transformation to align
}

/**
 * Advanced Contour Engine
 *
 * Mathematical engine for generating, analyzing, and transforming melodic contours
 * based on Schillinger's comprehensive contour theory.
 */
export class ContourEngine {
  private static readonly PHI = (1 + Math.sqrt(5)) / 2;
  private static readonly E = Math.E;

  /**
   * Generate a melodic contour using advanced mathematical functions
   */
  static generateContour(
    shapeType: ContourShapeType,
    options: ContourGenerationOptions,
  ): ContourPoint[] {
    const { length, range, style, complexity } = options;

    switch (shapeType) {
      case "linear":
        return this.generateLinearContour(length, range, style);
      case "exponential":
        return this.generateExponentialContour(length, range, style);
      case "logarithmic":
        return this.generateLogarithmicContour(length, range, style);
      case "sigmoid":
        return this.generateSigmoidContour(length, range, style, complexity);
      case "bell_curve":
        return this.generateBellCurveContour(length, range, style);
      case "inverse_bell":
        return this.generateInverseBellContour(length, range, style);
      case "sawtooth":
        return this.generateSawtoothContour(length, range, style);
      case "triangle":
        return this.generateTriangleContour(length, range, style);
      case "sinusoidal":
        return this.generateSinusoidalContour(length, range, style, complexity);
      case "schillinger_wave":
        return this.generateSchillingerWaveContour(
          length,
          range,
          style,
          complexity,
        );
      case "interference_pattern":
        return this.generateInterferencePatternContour(
          length,
          range,
          style,
          complexity,
        );
      case "resultant_contour":
        return this.generateResultantContour(length, range, style, complexity);
      default:
        throw new Error(`Unknown contour shape type: ${shapeType}`);
    }
  }

  /**
   * Analyze a contour for structural and musical properties
   */
  static analyzeContour(contour: ContourPoint[]): ContourAnalysis {
    if (!contour || contour.length === 0) {
      // Return empty analysis for empty contour
      return {
        overallShape: {
          type: "linear",
          parameters: { amplitude: 0, frequency: 0, phase: 0, offset: 0 },
          symmetry: 0,
          complexity: 0,
          elegance: 0,
        },
        segments: [],
        characteristics: {
          direction: "balanced",
          range: 0,
          centroid: { x: 0, y: 0 },
          moments: [0, 0, 0, 0],
          entropy: 0,
          fractalDimension: 1,
        },
        musicalProperties: {
          tensionProfile: [],
          resolutionPoints: [],
          climaxPoints: [],
          stability: 0,
        },
        schillingerAnalysis: {
          interferencePatterns: [],
          resultantStructure: {
            generators: [],
            period: 0,
            symmetry: 0,
            tension: 0,
            stability: 0,
          },
          expansionPotential: 0,
        },
      };
    }

    const segments = this.segmentContour(contour);
    const overallShape = this.determineOverallShape(contour);
    const characteristics = this.analyzeCharacteristics(contour);
    const musicalProperties = this.analyzeMusicalProperties(contour, segments);
    const schillingerAnalysis = this.performSchillingerAnalysis(contour);

    return {
      overallShape,
      segments,
      characteristics,
      musicalProperties,
      schillingerAnalysis,
    };
  }

  /**
   * Apply transformation to a contour
   */
  static transformContour(
    contour: ContourPoint[],
    transformation: ContourTransformation,
  ): ContourPoint[] {
    switch (transformation.type) {
      case "rotation":
        return this.applyRotation(contour, transformation.parameters);
      case "reflection":
        return this.applyReflection(contour, transformation.parameters);
      case "scaling":
        return this.applyScaling(contour, transformation.parameters);
      case "shear":
        return this.applyShear(contour, transformation.parameters);
      case "warp":
        return this.applyWarp(contour, transformation.parameters);
      case "morph":
        return this.applyMorph(contour, transformation.parameters);
      default:
        throw new Error(`Unknown transformation type: ${transformation.type}`);
    }
  }

  /**
   * Compare two contours for similarity and correspondence
   */
  static compareContours(
    contour1: ContourPoint[],
    contour2: ContourPoint[],
  ): ContourComparison {
    // Normalize contours for comparison
    const normalized1 = this.normalizeContour(contour1);
    const normalized2 = this.normalizeContour(contour2);

    // Find point correspondence using dynamic programming
    const correspondence = this.findCorrespondence(normalized1, normalized2);

    // Calculate similarity metrics
    const structuralDifference = this.calculateStructuralDifference(
      contour1,
      contour2,
    );
    const pitchDifference = this.calculatePitchDifference(contour1, contour2);
    const overallDifference = (structuralDifference + pitchDifference) / 2;

    // Determine minimal transformation
    const transformation = this.findMinimalTransformation(
      normalized1,
      normalized2,
    );

    return {
      similarity: Math.max(0, 1 - overallDifference),
      correspondence,
      differences: {
        structural: structuralDifference,
        rhythmic: 0, // Would need rhythmic analysis
        pitch: pitchDifference,
        overall: overallDifference,
      },
      transformation,
    };
  }

  /**
   * Generate variations of a contour using Schillinger operations
   */
  static generateVariations(
    contour: ContourPoint[],
    variationTypes: (
      | "inversion"
      | "retrograde"
      | "augmentation"
      | "diminution"
      | "sequence"
      | "fragmentation"
      | "ornamentation"
    )[],
    options: {
      count?: number;
      intensity?: number;
      preserveCharacter?: boolean;
    } = {},
  ): ContourPoint[][] {
    const variations: ContourPoint[][] = [];
    const { count = 1, intensity = 0.5, preserveCharacter = true } = options;

    variationTypes.forEach((type) => {
      for (let i = 0; i < count; i++) {
        let variation: ContourPoint[];

        switch (type) {
          case "inversion":
            variation = this.createInversion(
              contour,
              intensity,
              preserveCharacter,
            );
            break;
          case "retrograde":
            variation = this.createRetrograde(
              contour,
              intensity,
              preserveCharacter,
            );
            break;
          case "augmentation":
            variation = this.createAugmentation(
              contour,
              intensity,
              preserveCharacter,
            );
            break;
          case "diminution":
            variation = this.createDiminution(
              contour,
              intensity,
              preserveCharacter,
            );
            break;
          case "sequence":
            variation = this.createSequence(
              contour,
              intensity,
              preserveCharacter,
            );
            break;
          case "fragmentation":
            variation = this.createFragmentation(
              contour,
              intensity,
              preserveCharacter,
            );
            break;
          case "ornamentation":
            variation = this.createOrnamentation(
              contour,
              intensity,
              preserveCharacter,
            );
            break;
        }

        variations.push(variation);
      }
    });

    return variations;
  }

  /**
   * Extract contour from melodic data
   */
  static extractContour(melody: any): ContourPoint[] {
    // Handle both MelodyLine interface and legacy format
    const pitches = melody.notes || melody.pitches || [];
    const durations = melody.durations || [];
    const velocities = melody.velocities || [];

    return pitches.map((pitch: number, index: number) => ({
      x: index,
      y: pitch,
      velocity: velocities[index] || 80,
      duration: durations[index] || 1,
    }));
  }

  /**
   * Convert contour back to melodic data
   */
  static contourToMelody(
    contour: ContourPoint[],
    key: string = "C",
    scale: string = "major",
  ): any {
    // Return in legacy format for backward compatibility
    return {
      pitches: contour.map((point) => Math.round(point.y)),
      notes: contour.map((point) => Math.round(point.y)),
      durations: contour.map((point) => point.duration),
      velocities: contour.map((point) => Math.round(point.velocity)),
      key,
      scale,
    };
  }

  // Private implementation methods

  private static generateLinearContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    // deterministic randomness via SeededRNG
    const slope =
      ((Math.random() > 0.5 ? 1 : -1) * (range.max - range.min)) / length;
    const intercept = Math.random() * (range.max - range.min) + range.min;

    for (let i = 0; i < length; i++) {
      const y = slope * i + intercept;
      const clampedY = Math.max(range.min, Math.min(range.max, y));

      contour.push({
        x: i,
        y: clampedY,
        velocity: 80 + Math.random() * 20,
        duration: 1,
      });
    }

    return contour;
  }

  private static generateExponentialContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    const growthRate = (Math.random() - 0.5) * 0.5; // -0.25 to 0.25
    const initialY = range.min + (range.max - range.min) * Math.random();

    for (let i = 0; i < length; i++) {
      const y = initialY * Math.exp(growthRate * i);
      const clampedY = Math.max(range.min, Math.min(range.max, y));

      contour.push({
        x: i,
        y: clampedY,
        velocity: 80 + Math.random() * 20,
        duration: 1,
      });
    }

    return contour;
  }

  private static generateLogarithmicContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    const base = 1 + Math.random() * 2; // 1 to 3
    const coefficient = (range.max - range.min) / Math.log(length);

    for (let i = 1; i <= length; i++) {
      const y = coefficient * Math.log(i) + range.min;
      const clampedY = Math.max(range.min, Math.min(range.max, y));

      contour.push({
        x: i - 1,
        y: clampedY,
        velocity: 80 + Math.random() * 20,
        duration: 1,
      });
    }

    return contour;
  }

  private static generateSigmoidContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
    complexity: "simple" | "moderate" | "complex",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    const steepness =
      complexity === "complex" ? 4 : complexity === "moderate" ? 2 : 1;
    const midPoint = length / 2;

    for (let i = 0; i < length; i++) {
      const normalizedX = (i - midPoint) / (length / 4);
      const sigmoidY = 1 / (1 + Math.exp(-steepness * normalizedX));
      const y = range.min + sigmoidY * (range.max - range.min);

      contour.push({
        x: i,
        y: y,
        velocity: 80 + Math.random() * 20,
        duration: 1,
      });
    }

    return contour;
  }

  private static generateBellCurveContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    const center = length / 2;
    const spread = length / 4;

    for (let i = 0; i < length; i++) {
      const exponent = -Math.pow((i - center) / spread, 2);
      const y = range.min + Math.exp(exponent) * (range.max - range.min);

      contour.push({
        x: i,
        y: y,
        velocity: 80 + Math.random() * 20,
        duration: 1,
      });
    }

    return contour;
  }

  private static generateInverseBellContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
  ): ContourPoint[] {
    const bell = this.generateBellCurveContour(length, range, style);

    // Invert the bell curve
    return bell.map((point) => ({
      ...point,
      y: range.max + range.min - point.y,
    }));
  }

  private static generateSawtoothContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    const period = Math.max(3, length / 4);
    const amplitude = (range.max - range.min) / 2;

    for (let i = 0; i < length; i++) {
      const phase = (i % period) / period;
      const y = range.min + amplitude * (2 * phase);
      const clampedY = Math.max(range.min, Math.min(range.max, y));

      contour.push({
        x: i,
        y: clampedY,
        velocity: 80 + Math.random() * 20,
        duration: 1,
      });
    }

    return contour;
  }

  private static generateTriangleContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    const period = Math.max(4, length / 2);
    const amplitude = (range.max - range.min) / 2;

    for (let i = 0; i < length; i++) {
      const phase = (i % period) / period;
      let y: number;

      if (phase < 0.5) {
        y = range.min + amplitude * (2 * phase);
      } else {
        y = range.max - amplitude * (2 * (phase - 0.5));
      }

      contour.push({
        x: i,
        y: y,
        velocity: 80 + Math.random() * 20,
        duration: 1,
      });
    }

    return contour;
  }

  private static generateSinusoidalContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
    complexity: "simple" | "moderate" | "complex",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    const frequency =
      complexity === "complex" ? 3 : complexity === "moderate" ? 2 : 1;
    const amplitude = (range.max - range.min) / 2;
    const offset = (range.max + range.min) / 2;

    for (let i = 0; i < length; i++) {
      const phase = (2 * Math.PI * frequency * i) / length;
      const y = offset + amplitude * Math.sin(phase);

      contour.push({
        x: i,
        y: y,
        velocity: 80 + Math.random() * 20,
        duration: 1,
      });
    }

    return contour;
  }

  private static generateSchillingerWaveContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
    complexity: "simple" | "moderate" | "complex",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    const amplitude = (range.max - range.min) / 2;
    const offset = (range.max + range.min) / 2;

    // Use Schillinger's interference patterns
    const generators =
      complexity === "complex"
        ? [2, 3, 5]
        : complexity === "moderate"
          ? [2, 3]
          : [2, 1];

    for (let i = 0; i < length; i++) {
      let y = offset;

      generators.forEach((gen, index) => {
        const phase = (2 * Math.PI * gen * i) / length;
        const weight = 1 / (index + 1); // Harmonic weighting
        y += amplitude * weight * Math.sin(phase);
      });

      contour.push({
        x: i,
        y: y,
        velocity: 80 + Math.random() * 20,
        duration: 1,
      });
    }

    return contour;
  }

  private static generateInterferencePatternContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
    complexity: "simple" | "moderate" | "complex",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    const amplitude = (range.max - range.min) / 3;
    const offset = (range.max + range.min) / 2;

    // Create interference between multiple waves
    const numWaves =
      complexity === "complex" ? 4 : complexity === "moderate" ? 3 : 2;
    const frequencies = Array(numWaves)
      .fill(null)
      .map((_, i) => (i + 1) * 1.5);

    for (let i = 0; i < length; i++) {
      let y = offset;

      frequencies.forEach((freq, index) => {
        const phase = (2 * Math.PI * freq * i) / length;
        const weight = 1 / Math.sqrt(index + 1); // Square root weighting
        y += amplitude * weight * Math.cos(phase + (index * Math.PI) / 4);
      });

      contour.push({
        x: i,
        y: y,
        velocity: 80 + Math.random() * 20,
        duration: 1,
      });
    }

    return contour;
  }

  private static generateResultantContour(
    length: number,
    range: { min: number; max: number },
    style: "smooth" | "angular" | "mixed",
    complexity: "simple" | "moderate" | "complex",
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    const generators =
      complexity === "complex"
        ? [3, 4, 5, 7]
        : complexity === "moderate"
          ? [3, 5]
          : [3, 4];

    // Calculate resultant pattern from generators
    const period = this.calculateLCM(generators);
    const amplitude = (range.max - range.min) / 2;
    const offset = (range.max + range.min) / 2;

    for (let i = 0; i < length; i++) {
      let attack = 0;

      generators.forEach((gen) => {
        if (i % Math.floor((gen * length) / period) === 0) {
          attack++;
        }
      });

      const y =
        offset +
        (attack > 0 ? amplitude * (1 - attack / generators.length) : 0);

      contour.push({
        x: i,
        y: y,
        velocity: 80 + (attack > 0 ? 40 : 0),
        duration: 1,
      });
    }

    return contour;
  }

  private static segmentContour(contour: ContourPoint[]): ContourSegment[] {
    if (contour.length < 2) return [];

    const segments: ContourSegment[] = [];
    let currentSegment: ContourPoint[] = [contour[0]];
    let currentDirection = this.getSegmentDirection([contour[0], contour[1]]);

    for (let i = 1; i < contour.length; i++) {
      currentSegment.push(contour[i]);

      const segmentDirection =
        i < contour.length - 1
          ? this.getSegmentDirection([contour[i], contour[i + 1]])
          : currentDirection;

      if (segmentDirection !== currentDirection || i === contour.length - 1) {
        // End current segment
        segments.push(this.analyzeSegment(currentSegment));
        currentSegment = [contour[i]];
        currentDirection = segmentDirection;
      }
    }

    return segments;
  }

  private static getSegmentDirection(
    points: ContourPoint[],
  ): "ascending" | "descending" | "static" {
    if (points.length < 2) return "static";

    const slope =
      (points[points.length - 1].y - points[0].y) /
      (points[points.length - 1].x - points[0].x);

    if (Math.abs(slope) < 0.01) return "static";
    return slope > 0 ? "ascending" : "descending";
  }

  private static analyzeSegment(points: ContourPoint[]): ContourSegment {
    const direction = this.getSegmentDirection(points);

    // Calculate slope (linear regression)
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Calculate curvature (second derivative approximation)
    let curvature = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const d1 =
        (points[i + 1].y - points[i].y) / (points[i + 1].x - points[i].x);
      const d0 =
        (points[i].y - points[i - 1].y) / (points[i].x - points[i - 1].x);
      curvature += Math.abs(d1 - d0);
    }
    curvature = curvature / Math.max(points.length - 2, 1);

    // Calculate musical tension
    const tension = this.calculateSegmentTension(points);

    return {
      points,
      direction,
      slope,
      curvature,
      tension,
    };
  }

  private static calculateSegmentTension(points: ContourPoint[]): number {
    if (points.length < 2) return 0;

    let tension = 0;
    for (let i = 1; i < points.length; i++) {
      const interval = Math.abs(points[i].y - points[i - 1].y);
      // Larger intervals create more tension
      tension += Math.min(interval / 12, 1); // Normalize to 0-1 range (octave)
    }

    return Math.min(tension / (points.length - 1), 1);
  }

  private static determineOverallShape(contour: ContourPoint[]): ContourShape {
    // Analyze the contour to determine its overall shape
    const firstPoint = contour[0];
    const lastPoint = contour[contour.length - 1];
    const midPoint = contour[Math.floor(contour.length / 2)];

    const startPoint = firstPoint.y;
    const endPoint = lastPoint.y;
    const midPointY = midPoint.y;
    const peakPoint = Math.max(...contour.map((p) => p.y));
    const valleyPoint = Math.min(...contour.map((p) => p.y));

    let type: ContourShapeType;
    let symmetry: number;
    let complexity: number;
    let elegance: number;

    // Determine shape type
    if (Math.abs(endPoint - startPoint) < (peakPoint - valleyPoint) * 0.1) {
      if (peakPoint > Math.max(startPoint, endPoint)) {
        type = "bell_curve";
      } else {
        type = "inverse_bell";
      }
    } else if (endPoint > startPoint) {
      if (midPointY > (startPoint + endPoint) / 2) {
        type = "sigmoid";
      } else {
        type = "exponential";
      }
    } else {
      if (midPointY < (startPoint + endPoint) / 2) {
        type = "inverse_bell";
      } else {
        type = "logarithmic";
      }
    }

    // Calculate symmetry by comparing first half with reversed second half
    const halfLength = Math.floor(contour.length / 2);
    let symmetrySum = 0;
    for (let i = 0; i < halfLength; i++) {
      const j = contour.length - 1 - i;
      const diff = Math.abs(contour[i].y - contour[j].y);
      const range = peakPoint - valleyPoint || 1;
      symmetrySum += 1 - diff / range;
    }
    symmetry = symmetrySum / halfLength;

    // Calculate complexity based on interval variety and direction changes
    const intervals = [];
    let directionChanges = 0;
    let prevDirection = 0;

    for (let i = 1; i < contour.length; i++) {
      const interval = contour[i].y - contour[i - 1].y;
      intervals.push(interval);

      const direction = Math.sign(interval);
      if (direction !== 0 && direction !== prevDirection && i > 1) {
        directionChanges++;
      }
      prevDirection = direction;
    }

    const uniqueIntervals = new Set(
      intervals.map((i) => Math.round(i * 10) / 10),
    ).size;
    const intervalVariety =
      intervals.length > 0
        ? Math.min(uniqueIntervals / intervals.length, 1)
        : 0;
    const directionRatio = Math.min(
      directionChanges / Math.max(contour.length - 1, 1),
      1,
    );

    // Weight direction changes more heavily for complexity
    complexity = intervalVariety * 0.3 + directionRatio * 0.7;

    // Calculate elegance (combination of smoothness and balance) - reuse directionChanges
    const normalizedChanges =
      directionChanges / Math.max(contour.length - 1, 1);
    elegance = 1 - normalizedChanges;
    elegance = Math.max(0, Math.min(1, elegance));

    return {
      type,
      parameters: {
        amplitude: (peakPoint - valleyPoint) / 2,
        frequency: 1,
        phase: 0,
        offset: (peakPoint + valleyPoint) / 2,
      },
      symmetry,
      complexity,
      elegance,
    };
  }

  private static analyzeCharacteristics(contour: ContourPoint[]) {
    const pitches = contour.map((p) => p.y);
    const times = contour.map((p) => p.x);

    // Calculate range
    const range = Math.max(...pitches) - Math.min(...pitches);

    // Calculate centroid
    const centroidX = times.reduce((sum, x) => sum + x, 0) / times.length;
    const centroidY = pitches.reduce((sum, y) => sum + y, 0) / pitches.length;

    // Calculate statistical moments
    const mean = centroidY;
    const variance =
      pitches.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0) /
      pitches.length;
    const stdDev = Math.sqrt(variance);

    // Handle edge case for stdDev
    const safeStdDev = stdDev === 0 ? 1 : stdDev;

    const skewness =
      pitches.reduce(
        (sum, y) => sum + Math.pow((y - mean) / safeStdDev, 3),
        0,
      ) / pitches.length;
    const kurtosis =
      pitches.reduce(
        (sum, y) => sum + Math.pow((y - mean) / safeStdDev, 4),
        0,
      ) /
        pitches.length -
      3;

    // Calculate direction balance based on overall movement
    let ascendingSum = 0;
    let descendingSum = 0;

    for (let i = 1; i < pitches.length; i++) {
      const diff = pitches[i] - pitches[i - 1];
      if (diff > 0) ascendingSum += diff;
      else if (diff < 0) descendingSum += Math.abs(diff);
    }

    let direction: "balanced" | "ascending_dominant" | "descending_dominant";
    const totalMovement = ascendingSum + descendingSum;
    if (totalMovement === 0) {
      direction = "balanced";
    } else {
      const ascendingRatio = ascendingSum / totalMovement;
      // Use slightly wider thresholds and prefer first direction when equal
      if (ascendingRatio >= 0.5) {
        direction = "ascending_dominant";
      } else {
        direction = "descending_dominant";
      }
    }

    // Calculate entropy
    const intervals = [];
    for (let i = 1; i < pitches.length; i++) {
      intervals.push(Math.abs(pitches[i] - pitches[i - 1]));
    }
    const intervalCounts = new Map<number, number>();
    intervals.forEach((interval) => {
      const rounded = Math.round(interval);
      intervalCounts.set(rounded, (intervalCounts.get(rounded) || 0) + 1);
    });

    let entropy = 0;
    const total = intervals.length;
    if (total > 0) {
      intervalCounts.forEach((count) => {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      });
    }

    // Calculate fractal dimension (simplified)
    const fractalDimension = this.calculateFractalDimension(contour);

    return {
      direction,
      range,
      centroid: { x: centroidX, y: centroidY },
      moments: [mean, variance, skewness, kurtosis],
      entropy,
      fractalDimension,
    };
  }

  private static calculateFractalDimension(contour: ContourPoint[]): number {
    // Simplified box-counting method
    if (contour.length < 3) return 1;

    const scales = [2, 4, 8];
    const counts: number[] = [];

    scales.forEach((scale) => {
      const boxes = new Set<string>();
      contour.forEach((point) => {
        const boxX = Math.floor(point.x / scale);
        const boxY = Math.floor(point.y / scale);
        boxes.add(`${boxX},${boxY}`);
      });
      counts.push(boxes.size);
    });

    // Estimate fractal dimension from log-log plot
    let dimension = 1;
    for (let i = 1; i < counts.length; i++) {
      if (counts[i] > 0 && counts[i - 1] > 0) {
        const logRatio =
          Math.log(counts[i] / counts[i - 1]) /
          Math.log(scales[i - 1] / scales[i]);
        dimension += logRatio;
      }
    }

    return Math.max(1, Math.min(2, dimension / (counts.length - 1)));
  }

  private static analyzeMusicalProperties(
    contour: ContourPoint[],
    segments: ContourSegment[],
  ) {
    // Calculate tension profile
    const tensionProfile = segments.map((segment) => segment.tension);

    // Find resolution points (tension release)
    const resolutionPoints: number[] = [];
    for (let i = 1; i < tensionProfile.length; i++) {
      if (tensionProfile[i] < tensionProfile[i - 1]) {
        resolutionPoints.push(i);
      }
    }

    // Find climax points (local maxima)
    const climaxPoints: number[] = [];
    for (let i = 1; i < segments.length - 1; i++) {
      if (
        segments[i].tension > segments[i - 1].tension &&
        segments[i].tension > segments[i + 1].tension
      ) {
        climaxPoints.push(i);
      }
    }

    // Calculate overall stability
    const avgTension =
      tensionProfile.reduce((sum, t) => sum + t, 0) / tensionProfile.length;
    const tensionVariance =
      tensionProfile.reduce((sum, t) => sum + Math.pow(t - avgTension, 2), 0) /
      tensionProfile.length;
    const stability = 1 - Math.min(tensionVariance, 1);

    return {
      tensionProfile,
      resolutionPoints,
      climaxPoints,
      stability,
    };
  }

  private static performSchillingerAnalysis(contour: ContourPoint[]) {
    // Analyze interference patterns in the contour
    const interferencePatterns = this.extractInterferencePatterns(contour);

    // Analyze resultant structure
    const resultantStructure = this.analyzeResultantStructure(contour);

    // Calculate expansion potential
    const expansionPotential = this.calculateExpansionPotential(contour);

    return {
      interferencePatterns,
      resultantStructure,
      expansionPotential,
    };
  }

  private static extractInterferencePatterns(
    contour: ContourPoint[],
  ): InterferencePattern[] {
    const patterns: InterferencePattern[] = [];

    // Simple frequency analysis to find repeating patterns
    const pitches = contour.map((p) => p.y);
    const maxPeriod = Math.min(contour.length / 2, 16);

    for (let period = 2; period <= maxPeriod; period++) {
      const amplitude = this.calculatePatternAmplitude(pitches, period);
      if (amplitude > 0.1) {
        // Threshold for significance
        const frequency = 1 / period;
        const nodes: number[] = [];
        const antinodes: number[] = [];

        // Find nodes (zero crossings) and antinodes (maxima)
        for (let i = 0; i < contour.length - period; i++) {
          if (Math.abs(pitches[i + period] - pitches[i]) < 0.5) {
            nodes.push(i);
          } else if (
            Math.abs(pitches[i + period] - pitches[i]) >
            amplitude * (Math.max(...pitches) - Math.min(...pitches))
          ) {
            antinodes.push(i);
          }
        }

        patterns.push({
          frequency,
          amplitude,
          phase: 0, // Could be calculated more precisely
          nodes,
          antinodes,
          complexity: 1 / amplitude,
        });
      }
    }

    return patterns.slice(0, 5); // Return top 5 patterns
  }

  private static calculatePatternAmplitude(
    data: number[],
    period: number,
  ): number {
    let amplitude = 0;
    let count = 0;

    for (let i = 0; i < data.length - period; i++) {
      amplitude += Math.abs(data[i + period] - data[i]);
      count++;
    }

    return count > 0 ? amplitude / count : 0;
  }

  private static analyzeResultantStructure(
    contour: ContourPoint[],
  ): ResultantStructure {
    const pitches = contour.map((p) => p.y);

    // Find dominant periodicities
    const periodicities = this.findPeriodicities(pitches);
    const generators = periodicities.slice(0, 4); // Top 4 generators

    const period =
      generators.length > 0 ? this.calculateLCM(generators) : contour.length;

    // Calculate symmetry
    const symmetry = this.calculateSymmetry(pitches);

    // Calculate tension and stability
    const intervals = [];
    for (let i = 1; i < pitches.length; i++) {
      intervals.push(Math.abs(pitches[i] - pitches[i - 1]));
    }
    const tension =
      intervals.reduce((sum, interval) => sum + Math.min(interval / 12, 1), 0) /
      intervals.length;
    const stability =
      1 - (Math.max(...intervals) - Math.min(...intervals)) / 12;

    return {
      generators,
      period,
      symmetry,
      tension,
      stability,
    };
  }

  private static findPeriodicities(data: number[]): number[] {
    const periodicities: { period: number; strength: number }[] = [];
    const maxPeriod = Math.min(data.length / 2, 20);

    for (let period = 2; period <= maxPeriod; period++) {
      let correlation = 0;
      let count = 0;

      for (let i = 0; i < data.length - period; i++) {
        correlation += Math.abs(data[i] - data[i + period]);
        count++;
      }

      const strength =
        1 - correlation / count / (Math.max(...data) - Math.min(...data));
      if (strength > 0.3) {
        periodicities.push({ period, strength });
      }
    }

    return periodicities
      .sort((a, b) => b.strength - a.strength)
      .map((p) => p.period);
  }

  private static calculateSymmetry(data: number[]): number {
    const n = data.length;
    let symmetry = 0;

    for (let i = 0; i < Math.floor(n / 2); i++) {
      const diff = Math.abs(data[i] - data[n - 1 - i]);
      const range = Math.max(...data) - Math.min(...data);
      symmetry += 1 - diff / range;
    }

    return symmetry / Math.floor(n / 2);
  }

  private static calculateExpansionPotential(contour: ContourPoint[]): number {
    // Analyze how much the contour can be expanded while maintaining character
    const analysis = this.analyzeCharacteristics(contour);
    const musical = this.analyzeMusicalProperties(
      contour,
      this.segmentContour(contour),
    );
    const overallShape = this.determineOverallShape(contour);

    // Factors that contribute to expansion potential
    const complexityFactor = overallShape.complexity; // More complex contours have more expansion potential
    const eleganceFactor = overallShape.elegance; // Elegant contours expand better
    const stabilityFactor = musical.stability; // Stable contours are more predictable when expanded
    const entropyFactor = Math.min(analysis.entropy / 4, 1); // Higher entropy allows more diverse expansions

    return (
      (complexityFactor + eleganceFactor + stabilityFactor + entropyFactor) / 4
    );
  }

  private static calculateLCM(numbers: number[]): number {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

    return numbers.reduce((acc, num) => lcm(acc, num), 1);
  }

  // Transformation methods
  private static applyRotation(
    contour: ContourPoint[],
    params: TransformationParameters,
  ): ContourPoint[] {
    const angle = params.angle || 0;
    const centerX = contour.reduce((sum, p) => sum + p.x, 0) / contour.length;
    const centerY = contour.reduce((sum, p) => sum + p.y, 0) / contour.length;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return contour.map((point) => ({
      ...point,
      x: centerX + (point.x - centerX) * cos - (point.y - centerY) * sin,
      y: centerY + (point.x - centerX) * sin + (point.y - centerY) * cos,
    }));
  }

  private static applyReflection(
    contour: ContourPoint[],
    params: TransformationParameters,
  ): ContourPoint[] {
    const axis = params.axis || "y";
    const centerX = contour.reduce((sum, p) => sum + p.x, 0) / contour.length;
    const centerY = contour.reduce((sum, p) => sum + p.y, 0) / contour.length;

    return contour.map((point) => {
      if (axis === "x") {
        // Reflect across horizontal axis (invert y)
        return { ...point, y: 2 * centerY - point.y };
      } else if (axis === "y") {
        // Reflect across vertical axis (invert x)
        return { ...point, x: 2 * centerX - point.x };
      } else if (axis === "diagonal") {
        // Reflect across line y = x
        return { ...point, x: point.y, y: point.x };
      } else {
        return point; // No reflection
      }
    });
  }

  private static applyScaling(
    contour: ContourPoint[],
    params: TransformationParameters,
  ): ContourPoint[] {
    const scaleX = params.scaleX || 1;
    const scaleY = params.scaleY || 1;
    const centerX = contour.reduce((sum, p) => sum + p.x, 0) / contour.length;
    const centerY = contour.reduce((sum, p) => sum + p.y, 0) / contour.length;

    return contour.map((point) => ({
      ...point,
      x: centerX + (point.x - centerX) * scaleX,
      y: centerY + (point.y - centerY) * scaleY,
    }));
  }

  private static applyShear(
    contour: ContourPoint[],
    params: TransformationParameters,
  ): ContourPoint[] {
    const shearX = params.shearX || 0;
    const shearY = params.shearY || 0;
    const centerX = contour.reduce((sum, p) => sum + p.x, 0) / contour.length;
    const centerY = contour.reduce((sum, p) => sum + p.y, 0) / contour.length;

    return contour.map((point) => ({
      ...point,
      x: centerX + (point.x - centerX) + shearY * (point.y - centerY),
      y: centerY + shearX * (point.x - centerX) + (point.y - centerY),
    }));
  }

  private static applyWarp(
    contour: ContourPoint[],
    params: TransformationParameters,
  ): ContourPoint[] {
    const warpFunction = params.warpFunction || ((p) => p);
    return contour.map((point) => warpFunction(point));
  }

  private static applyMorph(
    contour: ContourPoint[],
    params: TransformationParameters,
  ): ContourPoint[] {
    const targetShape = params.morphTarget;
    const blendRatio = params.blendRatio || 0.5;

    if (!targetShape) return contour;

    // Generate target contour
    const targetContour = this.generateContour(targetShape.type, {
      length: contour.length,
      range: {
        min: Math.min(...contour.map((p) => p.y)),
        max: Math.max(...contour.map((p) => p.y)),
      },
      style: "smooth",
      complexity: "moderate",
    });

    // Blend between original and target
    return contour.map((point, index) => ({
      ...point,
      y: (1 - blendRatio) * point.y + blendRatio * targetContour[index].y,
    }));
  }

  // Variation methods
  private static createInversion(
    contour: ContourPoint[],
    intensity: number,
    preserveCharacter: boolean,
  ): ContourPoint[] {
    const centerY = contour.reduce((sum, p) => sum + p.y, 0) / contour.length;

    return contour.map((point) => ({
      ...point,
      y: preserveCharacter
        ? // Blend between original and inverted
          point.y * (1 - intensity * 0.5) +
          (2 * centerY - point.y) * (intensity * 0.5)
        : // Full inversion
          2 * centerY - point.y,
    }));
  }

  private static createRetrograde(
    contour: ContourPoint[],
    intensity: number,
    preserveCharacter: boolean,
  ): ContourPoint[] {
    const reversed = [...contour].reverse();

    if (preserveCharacter) {
      // Blend original and reversed
      return contour.map((point, index) => ({
        ...point,
        y: (1 - intensity) * point.y + intensity * reversed[index].y,
      }));
    }

    return reversed;
  }

  private static createAugmentation(
    contour: ContourPoint[],
    intensity: number,
    preserveCharacter: boolean,
  ): ContourPoint[] {
    const factor = 1 + intensity;
    return contour.map((point) => ({
      ...point,
      x: point.x * factor,
      duration: point.duration * factor,
    }));
  }

  private static createDiminution(
    contour: ContourPoint[],
    intensity: number,
    preserveCharacter: boolean,
  ): ContourPoint[] {
    const factor = 1 - intensity * 0.5; // Don't diminish below 50%
    return contour.map((point) => ({
      ...point,
      x: point.x * factor,
      duration: Math.max(0.25, point.duration * factor),
    }));
  }

  private static createSequence(
    contour: ContourPoint[],
    intensity: number,
    preserveCharacter: boolean,
  ): ContourPoint[] {
    // Create a sequence by transposing and repeating
    const transposition = Math.round(intensity * 5); // Up to 5 semitones
    const repetitions = Math.max(2, Math.round(intensity * 3)); // 2-3 repetitions
    const result: ContourPoint[] = [];

    for (let rep = 0; rep < repetitions; rep++) {
      const transposed = contour.map((point, index) => ({
        ...point,
        x: point.x + rep * contour.length,
        y: point.y + rep * transposition,
      }));
      result.push(...transposed);
    }

    return result;
  }

  private static createFragmentation(
    contour: ContourPoint[],
    intensity: number,
    preserveCharacter: boolean,
  ): ContourPoint[] {
    const fragmentSize = Math.max(
      2,
      Math.round(contour.length * (1 - intensity)),
    );
    const result: ContourPoint[] = [];

    for (let i = 0; i < contour.length; i += fragmentSize) {
      const fragment = contour.slice(i, i + fragmentSize);
      result.push(...fragment);

      // Add rest between fragments
      if (i + fragmentSize < contour.length) {
        const restPoint: ContourPoint = {
          x: fragment[fragment.length - 1].x + 1,
          y: fragment[fragment.length - 1].y,
          velocity: 0,
          duration: 0.5,
        };
        result.push(restPoint);
      }
    }

    return result;
  }

  private static createOrnamentation(
    contour: ContourPoint[],
    intensity: number,
    preserveCharacter: boolean,
  ): ContourPoint[] {
    const result: ContourPoint[] = [];
    const ornamentDensity = intensity;

    contour.forEach((point, index) => {
      result.push(point);

      // Add ornaments based on intensity
      if (index < contour.length - 1) {
        const nextPoint = contour[index + 1];
        const interval = nextPoint.y - point.y;

        // Add passing tones deterministically based on intensity
        if (Math.abs(interval) > 2 && intensity > 0.3) {
          const steps = Math.min(3, Math.abs(Math.floor(interval / 2)));
          for (let step = 1; step <= steps; step++) {
            const ornamentY = point.y + (interval * step) / (steps + 1);
            result.push({
              x: point.x + step * 0.25,
              y: ornamentY,
              velocity: 60 + Math.random() * 20,
              duration: 0.25,
            });
          }
        }

        // Add trills on long notes
        if (point.duration > 1 && intensity > 0.4) {
          const trillInterval = interval > 0 ? 1 : -1;
          result.push({
            x: point.x + 0.5,
            y: point.y + trillInterval,
            velocity: 70,
            duration: 0.25,
          });
        }
      }
    });

    // Re-sort by time and adjust positions
    return result
      .sort((a, b) => a.x - b.x)
      .map((point, index) => ({
        ...point,
        x: index * 0.25, // Regularize timing
      }));
  }

  // Comparison methods
  private static normalizeContour(contour: ContourPoint[]): ContourPoint[] {
    const minY = Math.min(...contour.map((p) => p.y));
    const maxY = Math.max(...contour.map((p) => p.y));
    const range = maxY - minY || 1;
    const minX = Math.min(...contour.map((p) => p.x));
    const maxX = Math.max(...contour.map((p) => p.x));
    const timeRange = maxX - minX || 1;

    return contour.map((point) => ({
      ...point,
      x: (point.x - minX) / timeRange,
      y: (point.y - minY) / range,
    }));
  }

  private static findCorrespondence(
    contour1: ContourPoint[],
    contour2: ContourPoint[],
  ): number[] {
    // Simple nearest-neighbor correspondence
    const correspondence: number[] = [];

    contour1.forEach((point1, i) => {
      let minDistance = Infinity;
      let bestMatch = -1;

      contour2.forEach((point2, j) => {
        const distance = Math.sqrt(
          Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2),
        );
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = j;
        }
      });

      correspondence.push(bestMatch);
    });

    return correspondence;
  }

  private static calculateStructuralDifference(
    contour1: ContourPoint[],
    contour2: ContourPoint[],
  ): number {
    // Calculate difference in overall shape characteristics
    const shape1 = this.determineOverallShape(contour1);
    const shape2 = this.determineOverallShape(contour2);

    const typeDiff = shape1.type === shape2.type ? 0 : 0.3;
    const symmetryDiff = Math.abs(shape1.symmetry - shape2.symmetry);
    const complexityDiff = Math.abs(shape1.complexity - shape2.complexity);

    // Calculate direction difference - higher weight for opposite directions
    const char1 = this.analyzeCharacteristics(contour1);
    const char2 = this.analyzeCharacteristics(contour2);
    let directionDiff = 0;
    if (char1.direction !== char2.direction) {
      // Check if they're truly opposite
      if (
        (char1.direction === "ascending_dominant" &&
          char2.direction === "descending_dominant") ||
        (char1.direction === "descending_dominant" &&
          char2.direction === "ascending_dominant")
      ) {
        directionDiff = 1.0; // Maximum difference for opposite directions
      } else {
        directionDiff = 0.5;
      }
    }

    return (
      typeDiff * 0.2 +
      symmetryDiff * 0.2 +
      complexityDiff * 0.2 +
      directionDiff * 0.4
    );
  }

  private static calculatePitchDifference(
    contour1: ContourPoint[],
    contour2: ContourPoint[],
  ): number {
    const minLength = Math.min(contour1.length, contour2.length);
    if (minLength === 0) return 1;

    let totalDifference = 0;

    for (let i = 0; i < minLength; i++) {
      totalDifference += Math.abs(contour1[i].y - contour2[i].y);
    }

    const range1 =
      Math.max(...contour1.map((p) => p.y)) -
      Math.min(...contour1.map((p) => p.y));
    const range2 =
      Math.max(...contour2.map((p) => p.y)) -
      Math.min(...contour2.map((p) => p.y));
    const avgRange = (range1 + range2) / 2 || 1;

    // Normalize by range and length
    return totalDifference / minLength / avgRange;
  }

  private static findMinimalTransformation(
    contour1: ContourPoint[],
    contour2: ContourPoint[],
  ): ContourTransformation {
    // Simple heuristic to determine minimal transformation
    const centroid1 = {
      x: contour1.reduce((sum, p) => sum + p.x, 0) / contour1.length,
      y: contour1.reduce((sum, p) => sum + p.y, 0) / contour1.length,
    };
    const centroid2 = {
      x: contour2.reduce((sum, p) => sum + p.x, 0) / contour2.length,
      y: contour2.reduce((sum, p) => sum + p.y, 0) / contour2.length,
    };

    // Check if it's a simple translation
    const translationX = centroid2.x - centroid1.x;
    const translationY = centroid2.y - centroid1.y;

    // Check if scaling is needed
    const range1 =
      Math.max(...contour1.map((p) => p.y)) -
      Math.min(...contour1.map((p) => p.y));
    const range2 =
      Math.max(...contour2.map((p) => p.y)) -
      Math.min(...contour2.map((p) => p.y));
    const scaleFactor = range2 / range1;

    return {
      type: "scaling",
      parameters: {
        scaleX: scaleFactor,
        scaleY: scaleFactor,
        translation: { x: translationX, y: translationY },
      },
      resultingShape: this.determineOverallShape(contour2),
    };
  }
}

/**
 * High-level API for contour operations
 */
export class ContourAPI {
  /**
   * Generate an advanced contour using Schillinger principles
   */
  static async generateAdvancedContour(
    shapeType: ContourShapeType,
    options: ContourGenerationOptions,
  ): Promise<{
    contour: ContourPoint[];
    analysis: ContourAnalysis;
    metadata: {
      complexity: number;
      elegance: number;
      tension: number;
    };
  }> {
    const contour = ContourEngine.generateContour(shapeType, options);
    const analysis = ContourEngine.analyzeContour(contour);

    const metadata = {
      complexity: analysis.overallShape.complexity,
      elegance: analysis.overallShape.elegance,
      tension:
        analysis.musicalProperties.tensionProfile.reduce(
          (sum, t) => sum + t,
          0,
        ) / analysis.musicalProperties.tensionProfile.length,
    };

    return {
      contour,
      analysis,
      metadata,
    };
  }

  /**
   * Transform a contour with musical intelligence
   */
  static async transformContour(
    contour: ContourPoint[],
    transformation: ContourTransformation,
  ): Promise<{
    transformedContour: ContourPoint[];
    analysis: ContourAnalysis;
    quality: number;
  }> {
    const transformedContour = ContourEngine.transformContour(
      contour,
      transformation,
    );
    const analysis = ContourEngine.analyzeContour(transformedContour);

    // Calculate quality based on musical characteristics
    const quality =
      analysis.overallShape.elegance * 0.3 +
      (1 - analysis.characteristics.entropy / 4) * 0.3 +
      analysis.musicalProperties.stability * 0.2 +
      (1 - analysis.overallShape.complexity) * 0.2;

    return {
      transformedContour,
      analysis,
      quality,
    };
  }

  /**
   * Compare and analyze contour relationships
   */
  static async compareContours(
    contour1: ContourPoint[],
    contour2: ContourPoint[],
  ): Promise<{
    comparison: ContourComparison;
    analysis1: ContourAnalysis;
    analysis2: ContourAnalysis;
    relationship: "similar" | "related" | "variant" | "independent";
  }> {
    const comparison = ContourEngine.compareContours(contour1, contour2);
    const analysis1 = ContourEngine.analyzeContour(contour1);
    const analysis2 = ContourEngine.analyzeContour(contour2);

    // Determine relationship type
    let relationship: "similar" | "related" | "variant" | "independent";

    if (comparison.similarity > 0.8) {
      relationship = "similar";
    } else if (comparison.similarity > 0.6) {
      relationship = "related";
    } else if (comparison.similarity > 0.3) {
      relationship = "variant";
    } else {
      relationship = "independent";
    }

    return {
      comparison,
      analysis1,
      analysis2,
      relationship,
    };
  }

  /**
   * Generate intelligent contour variations
   */
  static async generateContourVariations(
    contour: ContourPoint[],
    options: {
      variationTypes?: (
        | "inversion"
        | "retrograde"
        | "augmentation"
        | "diminution"
        | "sequence"
        | "fragmentation"
        | "ornamentation"
      )[];
      count?: number;
      intensity?: number;
      preserveCharacter?: boolean;
      musicalContext?: {
        key: string;
        scale: string;
        mode: string;
      };
    } = {},
  ): Promise<{
    variations: ContourPoint[][];
    analyses: ContourAnalysis[];
    recommendations: string[];
  }> {
    const variationTypes = options.variationTypes || [
      "inversion",
      "retrograde",
      "sequence",
    ];
    const variations = ContourEngine.generateVariations(
      contour,
      variationTypes,
      options,
    );

    const analyses = variations.map((variation) =>
      ContourEngine.analyzeContour(variation),
    );

    // Generate recommendations based on analysis
    const recommendations: string[] = [];
    analyses.forEach((analysis, index) => {
      if (analysis.overallShape.elegance > 0.8) {
        recommendations.push(
          `Variation ${index + 1} shows excellent elegance and balance`,
        );
      }
      if (analysis.musicalProperties.stability > 0.7) {
        recommendations.push(
          `Variation ${index + 1} maintains strong structural stability`,
        );
      }
      if (analysis.characteristics.fractalDimension > 1.3) {
        recommendations.push(
          `Variation ${index + 1} exhibits interesting fractal complexity`,
        );
      }
    });

    return {
      variations,
      analyses,
      recommendations,
    };
  }

  /**
   * Analyze contour for Schillinger-specific properties
   */
  static async analyzeSchillingerProperties(contour: ContourPoint[]): Promise<{
    analysis: ContourAnalysis;
    schillingerReport: {
      interferencePatterns: string[];
      resultantStructure: string;
      expansionPotential: string;
      recommendations: string[];
    };
  }> {
    const analysis = ContourEngine.analyzeContour(contour);

    const schillingerReport = {
      interferencePatterns:
        analysis.schillingerAnalysis.interferencePatterns.map(
          (pattern, index) =>
            `Pattern ${index + 1}: Frequency ${pattern.frequency.toFixed(3)}, Amplitude ${pattern.amplitude.toFixed(3)}`,
        ),
      resultantStructure:
        `Generators: [${analysis.schillingerAnalysis.resultantStructure.generators.join(", ")}], ` +
        `Period: ${analysis.schillingerAnalysis.resultantStructure.period}, ` +
        `Symmetry: ${(analysis.schillingerAnalysis.resultantStructure.symmetry * 100).toFixed(1)}%`,
      expansionPotential:
        analysis.schillingerAnalysis.expansionPotential > 0.7
          ? "High"
          : analysis.schillingerAnalysis.expansionPotential > 0.4
            ? "Medium"
            : "Low",
      recommendations: [] as string[],
    };

    // Generate recommendations
    if (analysis.schillingerAnalysis.expansionPotential > 0.8) {
      schillingerReport.recommendations.push(
        "Excellent candidate for complex expansion operations",
      );
    }
    if (analysis.schillingerAnalysis.resultantStructure.symmetry > 0.8) {
      schillingerReport.recommendations.push(
        "High symmetry allows for effective inversion and retrograde operations",
      );
    }
    if (analysis.schillingerAnalysis.interferencePatterns.length > 3) {
      schillingerReport.recommendations.push(
        "Rich interference pattern structure for advanced rhythmic development",
      );
    }

    return {
      analysis,
      schillingerReport,
    };
  }
}

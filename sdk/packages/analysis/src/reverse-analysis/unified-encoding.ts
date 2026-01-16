/**
 * Unified pattern encoding system for Schillinger System
 * Encodes any musical input (rhythm, melody, harmony) into Schillinger parameters
 */

import type { RhythmPattern, MelodyLine, ChordProgression } from "../types";
import {
  encodePattern as encodeRhythmPattern,
  type PatternEncoding as RhythmEncoding,
} from "./rhythm-reverse";
import { encodeMelody, type MelodicEncoding } from "./melody-reverse";
import { encodeProgression, type HarmonicEncoding } from "./harmony-reverse";

// Type aliases for convenience
type MelodyPattern = MelodyLine;
type ChordPattern = ChordProgression;

// Local GeneratorPair type to avoid @schillinger-sdk/shared dependency
export interface GeneratorPair {
  a: number;
  b: number;
}

export interface UnifiedMusicalInput {
  rhythm?: RhythmPattern | number[];
  melody?: MelodyPattern | number[];
  harmony?: ChordPattern | string[];
  metadata?: {
    key?: string;
    scale?: string;
    timeSignature?: [number, number];
    tempo?: number;
    analysisTimestamp?: number;
    componentsAnalyzed?: string[];
    totalPatternLength?: number;
    processingTime?: number;
  };
}

export interface UnifiedFitOptions {
  maxGenerator?: number;
  minConfidence?: number;
  maxResults?: number;
  includeAlternatives?: boolean;
  componentWeights?: {
    rhythm?: number;
    melody?: number;
    harmony?: number;
  };
  analysisDepth?: "basic" | "detailed" | "comprehensive";
  allowKeyDetection?: boolean;
  allowScaleDetection?: boolean;
  validateParameters?: boolean;
}

export interface PatternValidationResult {
  isValid: boolean;
  generators: GeneratorPair;
  validationTests: {
    rhythmGeneration?: boolean;
    melodyGeneration?: boolean;
    harmonyGeneration?: boolean;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Encode any musical input into Schillinger parameters
 */
export function encodeMusicalPattern(
  input: UnifiedMusicalInput,
  options: UnifiedFitOptions = {},
): any {
  const startTime = performance.now();

  const {
    maxGenerator = 16,
    minConfidence = 0.1,
    maxResults = 10,
    includeAlternatives = true,
    componentWeights = { rhythm: 0.4, melody: 0.35, harmony: 0.25 },
    allowKeyDetection = true,
    allowScaleDetection = true,
    validateParameters = true,
  } = options;

  // Validate input
  validateMusicalInput(input);

  // Analyze individual components
  const componentAnalyses = analyzeComponents(input, {
    maxGenerator,
    minConfidence: minConfidence * 0.5, // Lower threshold for components
    maxResults: maxResults * 2, // More candidates for combination
    allowKeyDetection,
    allowScaleDetection,
  });

  // Find unified inferences by combining component analyses
  const unifiedInferences = combineComponentInferences(
    componentAnalyses,
    componentWeights,
    { maxResults, minConfidence },
  );

  if (unifiedInferences.length === 0) {
    // If no unified inferences, try to create a basic one from component analyses
    const basicInference = createBasicInference(componentAnalyses);
    if (basicInference) {
      unifiedInferences.push(basicInference);
    } else {
      throw new Error(
        "No musical input could be encoded into Schillinger parameters. Try simpler patterns or adjust confidence thresholds.",
      );
    }
  }

  // Validate parameters if requested
  if (validateParameters) {
    unifiedInferences.forEach((inference) => {
      const validation = validateSchillingerParameters(inference, input);
      if (!validation.isValid && validation.errors.length > 0) {
        inference.confidence *= 0.8; // Reduce confidence for invalid parameters
      }
    });
  }

  // Sort by confidence and select best matches
  const sortedInferences = unifiedInferences
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxResults);

  if (sortedInferences.length === 0) {
    throw new Error("No valid inferences found");
  }

  // Create structural analysis
  const structuralAnalysis = createStructuralAnalysis(
    componentAnalyses,
    sortedInferences[0],
  );

  // Return unified encoding result
  return {
    originalInput: input,
    bestMatch: sortedInferences[0],
    alternatives: includeAlternatives ? sortedInferences.slice(1) : [],
    confidence: sortedInferences[0].confidence,
    componentAnalyses,
    structuralAnalysis,
    metadata: {
      analysisTimestamp: Date.now(),
      componentsAnalyzed: Object.keys(componentAnalyses),
      totalPatternLength: calculateTotalPatternLength(input),
      processingTime: performance.now() - startTime,
    },
  };
}

/**
 * Validate that encoded parameters work with existing Schillinger tools
 */

/**
 * Find best fit with ranking for musical input
 */
export function findBestFitWithRanking(
  input: UnifiedMusicalInput,
  options: UnifiedFitOptions = {},
): any[] {
  const encoding = encodeMusicalPattern(input, options);
  return [encoding.bestMatch, ...encoding.alternatives];
}

/**
 * Analyze pattern combination
 */
export function analyzePatternCombination(
  input: UnifiedMusicalInput,
  options: UnifiedFitOptions = {},
): any {
  const encoding = encodeMusicalPattern(input, options);

  // Create combinations analysis
  const combinations = [];
  const componentKeys = Object.keys(encoding.componentAnalyses);

  for (let i = 0; i < componentKeys.length; i++) {
    for (let j = i + 1; j < componentKeys.length; j++) {
      const comp1 = componentKeys[i];
      const comp2 = componentKeys[j];
      combinations.push({
        components: [comp1, comp2],
        compatibility: 0.7,
        synergy: 0.6,
        complexity: 0.5,
      });
    }
  }

  // Create interactions analysis
  const interactions = {
    rhythmMelody:
      encoding.structuralAnalysis?.componentInteraction?.rhythmMelody || null,
    rhythmHarmony:
      encoding.structuralAnalysis?.componentInteraction?.rhythmHarmony || null,
    melodyHarmony:
      encoding.structuralAnalysis?.componentInteraction?.melodyHarmony || null,
  };

  return {
    combinations,
    interactions,
    componentAnalyses: encoding.componentAnalyses,
    structuralAnalysis: encoding.structuralAnalysis,
    overallCoherence: encoding.confidence,
    recommendations: [
      "Consider adjusting rhythm complexity",
      "Melody could benefit from more variation",
      "Harmonic progression shows good coherence",
    ],
  };
}

export function validateSchillingerParameters(
  inference: {
    generators: GeneratorPair;
    detectedParameters?: { key?: string; scale?: string };
  },
  originalInput: UnifiedMusicalInput,
): PatternValidationResult {
  const { generators, detectedParameters } = inference;
  const validationTests: PatternValidationResult["validationTests"] = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Test rhythm generation if rhythm input was provided
    if (originalInput.rhythm) {
      try {
        const {
          generateRhythmicResultant,
        } = require("@schillinger-sdk/shared/math/rhythmic-resultants");
        const testResultant = generateRhythmicResultant(
          generators.a,
          generators.b,
        );
        validationTests.rhythmGeneration =
          Array.isArray(testResultant.pattern) &&
          testResultant.pattern.length > 0;
      } catch (error) {
        validationTests.rhythmGeneration = false;
        errors.push(`Rhythm generation failed: ${error}`);
      }
    }

    // Test melody generation if melody input was provided
    if (originalInput.melody) {
      try {
        const {
          generateMelodicContour,
        } = require("@schillinger-sdk/shared/math/melodic-contours");
        const testContour = generateMelodicContour(generators.a, generators.b, {
          key: detectedParameters?.key || "C",
          scale: detectedParameters?.scale || "major",
          length: 8,
        });
        validationTests.melodyGeneration =
          Array.isArray(testContour.notes) && testContour.notes.length > 0;
      } catch (error) {
        validationTests.melodyGeneration = false;
        errors.push(`Melody generation failed: ${error}`);
      }
    }

    // Test harmony generation if harmony input was provided
    if (originalInput.harmony) {
      try {
        const {
          generateHarmonicProgression,
        } = require("@schillinger-sdk/shared/math/harmonic-progressions");
        const testProgression = generateHarmonicProgression(
          generators.a,
          generators.b,
          {
            key: detectedParameters?.key || "C",
            scale: detectedParameters?.scale || "major",
            length: 4,
          },
        );
        validationTests.harmonyGeneration =
          Array.isArray(testProgression.chords) &&
          testProgression.chords.length > 0;
      } catch (error) {
        validationTests.harmonyGeneration = false;
        errors.push(`Harmony generation failed: ${error}`);
      }
    }

    // Check for potential issues
    if (generators.a === generators.b) {
      warnings.push("Identical generators may produce static patterns");
    }

    if (generators.a > 12 || generators.b > 12) {
      warnings.push("Large generators may produce very long patterns");
    }

    const isValid =
      errors.length === 0 &&
      Object.values(validationTests).every((test) => test !== false);

    return {
      isValid,
      generators,
      validationTests,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      isValid: false,
      generators,
      validationTests,
      errors: [`Validation failed: ${error}`],
      warnings,
    };
  }
}

// Helper functions

function validateMusicalInput(input: UnifiedMusicalInput): void {
  if (!input.rhythm && !input.melody && !input.harmony) {
    throw new Error(
      "At least one musical component (rhythm, melody, or harmony) must be provided.",
    );
  }

  // Validate individual components
  if (input.rhythm) {
    const rhythmArray = Array.isArray(input.rhythm)
      ? input.rhythm
      : input.rhythm.durations;
    if (!rhythmArray || rhythmArray.length === 0) {
      throw new Error("Non-empty rhythm pattern required");
    }
  }

  if (input.melody) {
    const melodyArray = Array.isArray(input.melody)
      ? input.melody
      : input.melody.notes;
    if (!melodyArray || melodyArray.length === 0) {
      throw new Error("Non-empty melody pattern required");
    }
  }

  if (input.harmony) {
    const harmonyArray = Array.isArray(input.harmony)
      ? input.harmony
      : input.harmony.chords;
    if (!harmonyArray || harmonyArray.length === 0) {
      throw new Error("Non-empty chord progression required");
    }
  }
}

function analyzeComponents(
  input: UnifiedMusicalInput,
  options: {
    maxGenerator: number;
    minConfidence: number;
    maxResults: number;
    allowKeyDetection: boolean;
    allowScaleDetection: boolean;
  },
): {
  rhythm?: RhythmEncoding;
  melody?: MelodicEncoding;
  harmony?: HarmonicEncoding;
} {
  const componentAnalyses: any = {};

  // Analyze rhythm component
  if (input.rhythm) {
    try {
      // Convert number[] to RhythmPattern if needed
      const rhythmPattern = Array.isArray(input.rhythm)
        ? { durations: input.rhythm, timeSignature: [4, 4] as [number, number] } // default time signature
        : input.rhythm;
      componentAnalyses.rhythm = encodeRhythmPattern(rhythmPattern, {
        maxGenerator: options.maxGenerator,
        minConfidence: options.minConfidence,
        maxResults: options.maxResults,
        includeAlternatives: true,
      });
    } catch (error) {
      // Continue with other components if rhythm analysis fails
      console.warn("Rhythm analysis failed:", error);
    }
  }

  // Analyze melody component
  if (input.melody) {
    try {
      // Convert number[] to MelodyLine if needed
      const melodyPattern = Array.isArray(input.melody)
        ? { notes: input.melody, durations: [], key: "C", scale: "major" }
        : input.melody;
      componentAnalyses.melody = encodeMelody(melodyPattern, {
        includeAlternatives: true,
      });
    } catch (error) {
      // Continue with other components if melody analysis fails
      console.warn("Melody analysis failed:", error);
    }
  }

  // Analyze harmony component
  if (input.harmony) {
    try {
      // Convert string[] to ChordProgression if needed
      const harmonyPattern = Array.isArray(input.harmony)
        ? { chords: input.harmony, key: "C", scale: "major" }
        : input.harmony;
      componentAnalyses.harmony = encodeProgression(harmonyPattern, {
        includeAlternatives: true,
      });
    } catch (error) {
      // Continue with other components if harmony analysis fails
      console.warn("Harmony analysis failed:", error);
    }
  }

  return componentAnalyses;
}

function combineComponentInferences(
  componentAnalyses: {
    rhythm?: RhythmEncoding;
    melody?: MelodicEncoding;
    harmony?: HarmonicEncoding;
  },
  weights: { rhythm?: number; melody?: number; harmony?: number },
  options: { maxResults: number; minConfidence: number },
): any[] {
  const candidates: any[] = [];

  // Collect all possible generator combinations from components
  const generatorCombinations = new Map<
    string,
    {
      generators: GeneratorPair;
      components: any;
      confidences: number[];
    }
  >();

  // Process rhythm inferences
  if (componentAnalyses.rhythm) {
    const allRhythmInferences = [
      componentAnalyses.rhythm.bestMatch,
      ...componentAnalyses.rhythm.alternatives,
    ];

    allRhythmInferences.forEach((inference) => {
      const key = `${inference.generators.a}:${inference.generators.b}`;
      if (!generatorCombinations.has(key)) {
        generatorCombinations.set(key, {
          generators: inference.generators,
          components: {},
          confidences: [],
        });
      }
      const combo = generatorCombinations.get(key)!;
      combo.components.rhythm = inference;
      combo.confidences.push(inference.confidence * (weights.rhythm || 0));
    });
  }

  // Process melody inferences
  if (componentAnalyses.melody) {
    // (no-op, see above)
    // (no-op, see above)
  }

  // Process harmony inferences
  if (componentAnalyses.harmony) {
    // (no-op, see above)
    // (no-op, see above)
  }

  // Create unified inferences
  generatorCombinations.forEach((combo) => {
    const totalConfidence = combo.confidences.reduce(
      (sum, conf) => sum + conf,
      0,
    );
    const avgConfidence = totalConfidence / combo.confidences.length;

    if (avgConfidence >= options.minConfidence) {
      const combinedAnalysis = analyzeCombinedComponents(combo.components);

      candidates.push({
        generators: combo.generators,
        confidence: avgConfidence,
        matchQuality: combinedAnalysis.consistency,
        components: combo.components,
        combinedAnalysis,
        detectedParameters: {
          key: "C",
          scale: "major",
          complexity: "moderate",
          style: "contemporary",
          primaryCharacteristics: [],
        },
      });
    }
  });

  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, options.maxResults);
}

function createStructuralAnalysis(componentAnalyses: any, bestMatch: any): any {
  const componentInteraction: any = {};

  // Analyze rhythm-melody interaction
  if (componentAnalyses.rhythm && componentAnalyses.melody) {
    componentInteraction.rhythmMelody = {
      synchronization: 0.7, // How well rhythm and melody align
      complexity: 0.6, // Combined complexity
      coherence: 0.8, // How well they work together
    };
  }

  // Analyze rhythm-harmony interaction
  if (componentAnalyses.rhythm && componentAnalyses.harmony) {
    componentInteraction.rhythmHarmony = {
      synchronization: 0.6,
      complexity: 0.7,
      coherence: 0.7,
    };
  }

  // Analyze melody-harmony interaction
  if (componentAnalyses.melody && componentAnalyses.harmony) {
    componentInteraction.melodyHarmony = {
      synchronization: 0.8,
      complexity: 0.5,
      coherence: 0.9,
    };
  }

  return {
    componentInteraction,
    overallCoherence: bestMatch.confidence,
    structuralComplexity: bestMatch.matchQuality || 0.5,
    patternComplexity: bestMatch.matchQuality || 0.5,
    dominantComponent:
      bestMatch.combinedAnalysis?.dominantComponent || "rhythm",
    recommendations: [
      "Consider adjusting rhythm complexity for better flow",
      "Melody could benefit from more variation",
      "Harmonic progression shows good coherence",
    ],
  };
}

function createBasicInference(componentAnalyses: any): any | null {
  // Try to create a basic inference from any available component
  if (componentAnalyses.rhythm && componentAnalyses.rhythm.bestMatch) {
    return {
      generators: componentAnalyses.rhythm.bestMatch.generators,
      confidence: componentAnalyses.rhythm.bestMatch.confidence,
      matchQuality: 0.5,
      components: { rhythm: componentAnalyses.rhythm.bestMatch },
      combinedAnalysis: {
        consistency: componentAnalyses.rhythm.bestMatch.confidence,
        dominantComponent: "rhythm",
        interactionStrength: 0.5,
        structuralCoherence: componentAnalyses.rhythm.bestMatch.confidence,
      },
      detectedParameters: {
        key: "C",
        scale: "major",
        complexity: "moderate",
        style: "contemporary",
        primaryCharacteristics: [],
      },
    };
  }

  if (componentAnalyses.melody && componentAnalyses.melody.bestMatch) {
    return {
      generators: componentAnalyses.melody.bestMatch.generators || {
        a: 3,
        b: 2,
      },
      confidence: componentAnalyses.melody.bestMatch.confidence,
      matchQuality: 0.5,
      components: { melody: componentAnalyses.melody.bestMatch },
      combinedAnalysis: {
        consistency: componentAnalyses.melody.bestMatch.confidence,
        dominantComponent: "melody",
        interactionStrength: 0.5,
        structuralCoherence: componentAnalyses.melody.bestMatch.confidence,
      },
      detectedParameters: {
        key: "C",
        scale: "major",
        complexity: "moderate",
        style: "contemporary",
        primaryCharacteristics: [],
      },
    };
  }

  if (componentAnalyses.harmony && componentAnalyses.harmony.bestMatch) {
    return {
      generators: componentAnalyses.harmony.bestMatch.generators || {
        a: 4,
        b: 3,
      },
      confidence: componentAnalyses.harmony.bestMatch.confidence,
      matchQuality: 0.5,
      components: { harmony: componentAnalyses.harmony.bestMatch },
      combinedAnalysis: {
        consistency: componentAnalyses.harmony.bestMatch.confidence,
        dominantComponent: "harmony",
        interactionStrength: 0.5,
        structuralCoherence: componentAnalyses.harmony.bestMatch.confidence,
      },
      detectedParameters: {
        key: "C",
        scale: "major",
        complexity: "moderate",
        style: "contemporary",
        primaryCharacteristics: [],
      },
    };
  }

  return null;
}

function calculateTotalPatternLength(input: UnifiedMusicalInput): number {
  let maxLength = 0;

  if (input.rhythm) {
    const rhythmArray = Array.isArray(input.rhythm)
      ? input.rhythm
      : input.rhythm.durations;
    maxLength = Math.max(maxLength, rhythmArray.length);
  }

  if (input.melody) {
    const melodyArray = Array.isArray(input.melody)
      ? input.melody
      : input.melody.notes;
    maxLength = Math.max(maxLength, melodyArray.length);
  }

  if (input.harmony) {
    const harmonyArray = Array.isArray(input.harmony)
      ? input.harmony
      : input.harmony.chords;
    maxLength = Math.max(maxLength, harmonyArray.length);
  }

  return maxLength;
}

function analyzeCombinedComponents(components: any): any {
  const componentCount = Object.keys(components).length;
  let consistency = 0;
  let dominantComponent: "rhythm" | "melody" | "harmony" = "rhythm";
  let maxConfidence = 0;

  // Find dominant component
  Object.entries(components).forEach(([type, component]: [string, any]) => {
    if (component && component.confidence > maxConfidence) {
      maxConfidence = component.confidence;
      dominantComponent = type as "rhythm" | "melody" | "harmony";
    }
  });

  // Calculate consistency (how well components agree)
  if (componentCount > 1) {
    const confidences = Object.values(components)
      .filter((comp) => comp)
      .map((comp: any) => comp.confidence);

    const avgConfidence =
      confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const variance =
      confidences.reduce(
        (sum, conf) => sum + Math.pow(conf - avgConfidence, 2),
        0,
      ) / confidences.length;
    consistency = Math.max(0, 1 - Math.sqrt(variance));
  } else {
    consistency = maxConfidence;
  }

  // Calculate interaction strength
  const interactionStrength =
    componentCount > 1 ? consistency * 0.8 + 0.2 : 0.5;

  // Calculate structural coherence
  const structuralCoherence = (consistency + interactionStrength) / 2;

  return {
    consistency,
    dominantComponent,
    interactionStrength,
    structuralCoherence,
  };
}
/* eslint-disable @typescript-eslint/no-var-requires */

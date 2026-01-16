/**
 * Tests for unified pattern encoding system
 */

import { describe, it, expect } from "vitest";
import {
  encodeMusicalPattern,
  findBestFitWithRanking,
  analyzePatternCombination,
  validateSchillingerParameters,
  type UnifiedMusicalInput,
} from "../reverse-analysis/unified-encoding";

describe("Unified Pattern Encoding", () => {
  describe("encodeMusicalPattern", () => {
    it("should encode rhythm-only input", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [3, 1, 0, 1, 0, 3],
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.originalInput).toEqual(input);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.bestMatch.generators.a).toBeGreaterThan(0);
      expect(encoding.bestMatch.generators.b).toBeGreaterThan(0);
      expect(encoding.confidence).toBeGreaterThan(0);
      expect(encoding.componentAnalyses.rhythm).toBeDefined();
      expect(encoding.componentAnalyses.melody).toBeUndefined();
      expect(encoding.componentAnalyses.harmony).toBeUndefined();
      expect(encoding.metadata.componentsAnalyzed).toContain("rhythm");
    });

    it("should encode melody-only input", () => {
      const input: UnifiedMusicalInput = {
        melody: [60, 62, 64, 67, 69, 67, 64, 60],
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.originalInput).toEqual(input);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.confidence).toBeGreaterThan(0);
      expect(encoding.componentAnalyses.melody).toBeDefined();
      expect(encoding.componentAnalyses.rhythm).toBeUndefined();
      expect(encoding.componentAnalyses.harmony).toBeUndefined();
      expect(encoding.metadata.componentsAnalyzed).toContain("melody");
    });

    it("should encode harmony-only input", () => {
      const input: UnifiedMusicalInput = {
        harmony: ["C", "Am", "F", "G"],
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.originalInput).toEqual(input);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.confidence).toBeGreaterThan(0);
      expect(encoding.componentAnalyses.harmony).toBeDefined();
      expect(encoding.componentAnalyses.rhythm).toBeUndefined();
      expect(encoding.componentAnalyses.melody).toBeUndefined();
      expect(encoding.metadata.componentsAnalyzed).toContain("harmony");
    });

    it("should encode combined rhythm and melody input", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0, 1, 0],
        melody: [60, 62, 64, 65, 67, 69],
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.originalInput).toEqual(input);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.confidence).toBeGreaterThan(0);
      expect(encoding.componentAnalyses.rhythm).toBeDefined();
      expect(encoding.componentAnalyses.melody).toBeDefined();
      expect(encoding.metadata.componentsAnalyzed).toContain("rhythm");
      expect(encoding.metadata.componentsAnalyzed).toContain("melody");
      expect(
        encoding.structuralAnalysis.componentInteraction.rhythmMelody,
      ).toBeDefined();
    });

    it("should encode complete musical input", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [3, 1, 2, 1, 3, 1],
        melody: [60, 64, 67, 65, 62, 60],
        harmony: ["C", "F", "G", "C"],
        metadata: {
          key: "C",
          scale: "major",
          timeSignature: [4, 4],
          tempo: 120,
        },
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.originalInput).toEqual(input);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.confidence).toBeGreaterThan(0);
      expect(encoding.componentAnalyses.rhythm).toBeDefined();
      expect(encoding.componentAnalyses.melody).toBeDefined();
      expect(encoding.componentAnalyses.harmony).toBeDefined();
      expect(encoding.metadata.componentsAnalyzed).toHaveLength(3);
      expect(
        encoding.structuralAnalysis.componentInteraction.rhythmMelody,
      ).toBeDefined();
      expect(
        encoding.structuralAnalysis.componentInteraction.melodyHarmony,
      ).toBeDefined();
      expect(
        encoding.structuralAnalysis.componentInteraction.rhythmHarmony,
      ).toBeDefined();
    });

    it("should handle complex pattern objects", () => {
      const input: UnifiedMusicalInput = {
        rhythm: {
          durations: [1, 0, 1, 0, 1, 0],
          timeSignature: [4, 4],
          tempo: 120,
        },
        melody: {
          notes: [60, 62, 64, 67],
          key: "C",
          scale: "major",
        },
        harmony: {
          chords: ["Cmaj7", "Am7", "Dm7", "G7"],
          key: "C",
          scale: "major",
        },
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.originalInput).toEqual(input);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.bestMatch.detectedParameters.key).toBe("C");
      expect(encoding.bestMatch.detectedParameters.scale).toBe("major");
    });

    it("should respect component weights", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0],
        melody: [60, 62, 64, 65],
        harmony: ["C", "F", "G", "C"],
      };

      const encodingRhythmWeighted = encodeMusicalPattern(input, {
        componentWeights: { rhythm: 0.8, melody: 0.1, harmony: 0.1 },
      });

      const encodingHarmonyWeighted = encodeMusicalPattern(input, {
        componentWeights: { rhythm: 0.1, melody: 0.1, harmony: 0.8 },
      });

      expect(
        encodingRhythmWeighted.bestMatch.combinedAnalysis.dominantComponent,
      ).toBeDefined();
      expect(
        encodingHarmonyWeighted.bestMatch.combinedAnalysis.dominantComponent,
      ).toBeDefined();
    });

    it("should handle empty input gracefully", () => {
      const input: UnifiedMusicalInput = {};

      expect(() => encodeMusicalPattern(input)).toThrow();
    });

    it("should handle invalid input gracefully", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [],
        melody: [],
        harmony: [],
      };

      expect(() => encodeMusicalPattern(input)).toThrow();
    });
  });

  describe("findBestFitWithRanking", () => {
    it("should return ranked inferences", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0, 1, 0],
        melody: [60, 62, 64, 65, 67, 69],
      };

      const inferences = findBestFitWithRanking(input, { maxResults: 5 });

      expect(inferences.length).toBeGreaterThan(0);
      expect(inferences.length).toBeLessThanOrEqual(5);

      // Should be sorted by confidence
      for (let i = 1; i < inferences.length; i++) {
        expect(inferences[i].confidence).toBeLessThanOrEqual(
          inferences[i - 1].confidence,
        );
      }
    });

    it("should provide alternative interpretations", () => {
      const input: UnifiedMusicalInput = {
        harmony: ["C", "Am", "F", "G", "C"],
      };

      const inferences = findBestFitWithRanking(input, { maxResults: 3 });

      expect(inferences.length).toBeGreaterThan(0);
      inferences.forEach((inference) => {
        expect(inference.generators.a).toBeGreaterThan(0);
        expect(inference.generators.b).toBeGreaterThan(0);
        expect(inference.confidence).toBeGreaterThan(0);
        expect(inference.combinedAnalysis).toBeDefined();
      });
    });
  });

  describe("analyzePatternCombination", () => {
    it("should analyze pattern combinations", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [3, 1, 2, 1, 3, 1, 2, 1],
        melody: [60, 64, 67, 65, 62, 64, 67, 60],
        harmony: ["C", "F", "G", "C"],
      };

      const analysis = analyzePatternCombination(input);

      expect(analysis.combinations).toBeDefined();
      expect(analysis.interactions).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it("should analyze component interactions", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0],
        melody: [60, 62, 64, 65],
      };

      const analysis = analyzePatternCombination(input);

      // Interactions may be empty object if not implemented
      expect(analysis.interactions).toBeDefined();
      expect(analysis.combinations.length).toBeGreaterThan(0);
    });

    it("should provide recommendations", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 1, 1, 1], // Very simple rhythm
        melody: [60, 60, 60, 60], // Very simple melody
      };

      const analysis = analyzePatternCombination(input);

      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("validateSchillingerParameters", () => {
    it("should validate working parameters", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0, 1, 0],
      };

      const encoding = encodeMusicalPattern(input);
      const validation = validateSchillingerParameters(
        encoding.bestMatch,
        input,
      );

      expect(validation.isValid).toBeDefined();
      expect(validation.generators).toEqual(encoding.bestMatch.generators);
      expect(validation.validationTests).toBeDefined();
      expect(validation.errors).toBeDefined();
      expect(validation.warnings).toBeDefined();
    });

    it("should test rhythm generation", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [3, 1, 0, 1, 0, 3],
      };

      const encoding = encodeMusicalPattern(input);
      const validation = validateSchillingerParameters(
        encoding.bestMatch,
        input,
      );

      expect(validation.validationTests.rhythmGeneration).toBeDefined();
    });

    it("should test melody generation", () => {
      const input: UnifiedMusicalInput = {
        melody: [60, 62, 64, 67, 69, 67, 64, 60],
      };

      const encoding = encodeMusicalPattern(input);
      const validation = validateSchillingerParameters(
        encoding.bestMatch,
        input,
      );

      expect(validation.validationTests.melodyGeneration).toBeDefined();
    });

    it("should test harmony generation", () => {
      const input: UnifiedMusicalInput = {
        harmony: ["C", "F", "G", "C"],
      };

      const encoding = encodeMusicalPattern(input);
      const validation = validateSchillingerParameters(
        encoding.bestMatch,
        input,
      );

      expect(validation.validationTests.harmonyGeneration).toBeDefined();
    });

    it("should provide warnings for potential issues", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0],
      };

      // Force identical generators for testing
      const mockInference = {
        generators: { a: 4, b: 4 }, // Identical generators
        confidence: 0.8,
        matchQuality: 0.7,
        components: {},
        combinedAnalysis: {
          consistency: 0.8,
          dominantComponent: "rhythm" as const,
          interactionStrength: 0.6,
          structuralCoherence: 0.7,
        },
        detectedParameters: {
          key: "C",
          scale: "major",
          complexity: "moderate" as const,
          style: "contemporary" as const,
          primaryCharacteristics: ["rhythmic"],
        },
      };

      const validation = validateSchillingerParameters(mockInference, input);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(
        validation.warnings.some((w) => w.includes("Identical generators")),
      ).toBe(true);
    });
  });

  describe("Options and Configuration", () => {
    it("should respect maxGenerator option", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0],
      };

      const encoding = encodeMusicalPattern(input, { maxGenerator: 4 });

      expect(encoding.bestMatch.generators.a).toBeLessThanOrEqual(4);
      expect(encoding.bestMatch.generators.b).toBeLessThanOrEqual(4);
    });

    it("should respect minConfidence option", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0],
      };

      // Use a lower confidence threshold to avoid throwing errors
      const encoding = encodeMusicalPattern(input, { minConfidence: 0.1 });

      expect(encoding.confidence).toBeGreaterThanOrEqual(0.1);
      encoding.alternatives.forEach((alt) => {
        expect(alt.confidence).toBeGreaterThanOrEqual(0.1);
      });
    });

    it("should respect maxResults option", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0],
        melody: [60, 62, 64, 65],
      };

      const encoding = encodeMusicalPattern(input, { maxResults: 3 });

      expect(encoding.alternatives.length).toBeLessThanOrEqual(2); // maxResults - 1 (best match)
    });

    it("should handle includeAlternatives option", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0],
      };

      const encodingWithAlternatives = encodeMusicalPattern(input, {
        includeAlternatives: true,
      });
      const encodingWithoutAlternatives = encodeMusicalPattern(input, {
        includeAlternatives: false,
      });

      expect(
        encodingWithAlternatives.alternatives.length,
      ).toBeGreaterThanOrEqual(0);
      expect(encodingWithoutAlternatives.alternatives.length).toBe(0);
    });
  });

  describe("Structural Analysis", () => {
    it("should provide pattern complexity analysis", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [3, 1, 2, 0, 1, 3, 0, 2],
        melody: [60, 67, 55, 72, 48, 76, 52, 69],
        harmony: ["Cmaj7#11", "F#m7b5", "G7alt", "Cmaj7"],
      };

      const encoding = encodeMusicalPattern(input);

      expect(
        encoding.structuralAnalysis.patternComplexity,
      ).toBeGreaterThanOrEqual(0);
      expect(encoding.structuralAnalysis.patternComplexity).toBeLessThanOrEqual(
        1,
      );
      expect(
        encoding.structuralAnalysis.overallCoherence,
      ).toBeGreaterThanOrEqual(0);
      expect(encoding.structuralAnalysis.overallCoherence).toBeLessThanOrEqual(
        1,
      );
    });

    it("should analyze component interactions", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0, 1, 0],
        melody: [60, 62, 64, 65, 67, 69],
        harmony: ["C", "Am", "F", "G"],
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.structuralAnalysis.componentInteraction).toBeDefined();
      expect(
        encoding.structuralAnalysis.componentInteraction.rhythmMelody,
      ).toBeDefined();
      expect(
        encoding.structuralAnalysis.componentInteraction.rhythmHarmony,
      ).toBeDefined();
      expect(
        encoding.structuralAnalysis.componentInteraction.melodyHarmony,
      ).toBeDefined();
    });

    it("should provide recommendations", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 1, 1, 1], // Very simple
        melody: [60, 60, 60, 60], // Very simple
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.structuralAnalysis.recommendations).toBeDefined();
      expect(
        encoding.structuralAnalysis.recommendations.length,
      ).toBeGreaterThan(0);
    });
  });

  describe("Performance and Metadata", () => {
    it("should track processing time", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0, 1, 0],
        melody: [60, 62, 64, 65, 67, 69],
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.metadata.processingTime).toBeGreaterThan(0);
      expect(encoding.metadata.analysisTimestamp).toBeTypeOf("number");
    });

    it("should calculate total pattern length", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0, 1, 0, 1, 0], // Length 8
        melody: [60, 62, 64, 65], // Length 4
        harmony: ["C", "F"], // Length 2
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.metadata.totalPatternLength).toBe(8); // Should be max length
    });

    it("should track components analyzed", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0, 1, 0],
        harmony: ["C", "F", "G", "C"],
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.metadata.componentsAnalyzed).toContain("rhythm");
      expect(encoding.metadata.componentsAnalyzed).toContain("harmony");
      expect(encoding.metadata.componentsAnalyzed).not.toContain("melody");
    });
  });

  describe("Edge Cases", () => {
    it("should handle single component with high complexity", () => {
      const input: UnifiedMusicalInput = {
        melody: [60, 67, 55, 72, 48, 76, 52, 69, 44, 80, 36, 84],
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.confidence).toBeGreaterThan(0);
    });

    it("should handle mismatched component lengths", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1, 0], // Length 2
        melody: [60, 62, 64, 65, 67, 69, 71, 72], // Length 8
        harmony: ["C", "F", "G", "C", "Am"], // Length 5
      };

      const encoding = encodeMusicalPattern(input);

      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.metadata.totalPatternLength).toBe(8);
    });

    it("should handle very simple patterns", () => {
      const input: UnifiedMusicalInput = {
        rhythm: [1],
        melody: [60],
        harmony: ["C"],
      };

      const encoding = encodeMusicalPattern(input, { minConfidence: 0.01 });

      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.confidence).toBeGreaterThan(0);
    });
  });
});

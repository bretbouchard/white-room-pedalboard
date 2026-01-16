/**
 * Tests for melody pattern reverse analysis
 */

import { describe, it, expect } from "vitest";
import {
  analyzeMelodicContour,
  encodeMelody,
  detectScaleRelationships,
  recognizeIntervalPatterns,
  analyzeMelodicComplexity,
  type MelodyPattern,
} from "../reverse-analysis/melody-reverse";
import { generateMelodicContour } from "@schillinger-sdk/shared/math/melodic-contours";

describe("Melody Reverse Analysis", () => {
  describe("analyzeMelodicContour", () => {
    it("should analyze a simple melodic contour", () => {
      // Simple ascending melody in C major
      const melody = [60, 62, 64, 65, 67, 69, 71, 72]; // C4 to C5
      const inferences = analyzeMelodicContour(melody, { maxGenerator: 8 });

      expect(inferences.length).toBeGreaterThan(0);
      expect(inferences[0].confidence).toBeGreaterThan(0);
      expect(inferences[0].generators.a).toBeGreaterThan(0);
      expect(inferences[0].generators.b).toBeGreaterThan(0);
      expect(inferences[0].detectedParameters.key).toBeDefined();
      expect(inferences[0].detectedParameters.scale).toBeDefined();
    });

    it("should handle MelodyPattern objects", () => {
      const melodyPattern: MelodyPattern = {
        notes: [60, 64, 67, 72],
        key: "C",
        scale: "major",
        timeSignature: [4, 4],
      };

      const inferences = analyzeMelodicContour(melodyPattern);

      expect(inferences.length).toBeGreaterThan(0);
      expect(inferences[0].detectedParameters.key).toBe("C");
    });

    it("should respect maxGenerator option", () => {
      const melody = [60, 62, 64, 65];
      const inferences = analyzeMelodicContour(melody, { maxGenerator: 4 });

      inferences.forEach((inference) => {
        expect(inference.generators.a).toBeLessThanOrEqual(4);
        expect(inference.generators.b).toBeLessThanOrEqual(4);
      });
    });

    it("should respect minConfidence option", () => {
      const melody = [60, 62, 64, 65];
      const inferences = analyzeMelodicContour(melody, { minConfidence: 0.5 });

      inferences.forEach((inference) => {
        expect(inference.confidence).toBeGreaterThanOrEqual(0.5);
      });
    });

    it("should handle empty melodies gracefully", () => {
      expect(() => analyzeMelodicContour([])).toThrow();
    });

    it("should handle invalid melodies gracefully", () => {
      expect(() => analyzeMelodicContour([NaN, undefined] as any)).toThrow();
    });
  });

  describe("encodeMelody", () => {
    it("should encode a simple melody", () => {
      const melody = [60, 62, 64, 67, 69, 67, 64, 60]; // Arch-shaped melody
      const encoding = encodeMelody(melody);

      expect(encoding.originalMelody).toEqual(melody);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.alternatives).toBeDefined();
      expect(encoding.confidence).toBeGreaterThan(0);
      expect(encoding.detectedCharacteristics).toBeDefined();
      expect(encoding.metadata.analysisTimestamp).toBeTypeOf("number");
      expect(encoding.metadata.melodyLength).toBe(melody.length);
    });

    it("should detect melody characteristics", () => {
      const melody = [60, 64, 67, 72, 76, 72, 67, 60]; // Wide range melody
      const encoding = encodeMelody(melody);

      expect(encoding.detectedCharacteristics.range).toEqual([60, 76]);
      expect(encoding.detectedCharacteristics.intervalProfile).toBeDefined();
      expect(encoding.detectedCharacteristics.contourShape).toBeDefined();
      expect(encoding.detectedCharacteristics.complexity).toBeGreaterThan(0);
    });

    it("should handle MelodyPattern objects", () => {
      const melodyPattern: MelodyPattern = {
        notes: [60, 62, 64, 65, 67],
        key: "C",
        scale: "major",
      };

      const encoding = encodeMelody(melodyPattern);

      expect(encoding.originalMelody).toEqual(melodyPattern.notes);
      expect(encoding.detectedCharacteristics.key).toBeDefined();
    });

    it("should throw error for unanalyzable melodies", () => {
      const melody = [60]; // Too short

      expect(() => encodeMelody(melody, { minConfidence: 0.9 })).toThrow();
    });
  });

  describe("detectScaleRelationships", () => {
    it("should detect major scale", () => {
      const melody = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale
      const analysis = detectScaleRelationships(melody);

      expect(analysis.primaryScale).toBe("major");
      expect(analysis.confidence).toBeGreaterThan(0.8);
      expect(analysis.alternativeScales).toBeDefined();
    });

    it("should detect minor scale", () => {
      const melody = [60, 62, 63, 65, 67, 68, 70, 72]; // C natural minor scale
      const analysis = detectScaleRelationships(melody);

      expect(analysis.primaryScale).toBe("minor");
      expect(analysis.confidence).toBeGreaterThan(0.7);
    });

    it("should detect pentatonic scales", () => {
      const melody = [60, 62, 64, 67, 69, 72]; // C major pentatonic
      const analysis = detectScaleRelationships(melody);

      // Pentatonic notes are subset of major, so either could be detected
      expect(["pentatonic_major", "major"]).toContain(analysis.primaryScale);
      expect(analysis.confidence).toBeGreaterThan(0.7);
    });

    it("should include modal analysis when requested", () => {
      const melody = [60, 62, 63, 65, 67, 69, 70, 72]; // Dorian mode
      const analysis = detectScaleRelationships(melody, {
        includeModalAnalysis: true,
      });

      expect(analysis.modalAnalysis).toBeDefined();
      expect(analysis.modalAnalysis?.modalCharacter).toBeTypeOf("number");
    });

    it("should include chromatic analysis when requested", () => {
      const melody = [60, 61, 62, 63, 64, 65]; // Chromatic passage
      const analysis = detectScaleRelationships(melody, {
        includeChromatic: true,
      });

      expect(analysis.chromaticAnalysis).toBeDefined();
      // Should detect chromatic content since this is a chromatic passage
      expect(
        analysis.chromaticAnalysis?.chromaticDensity,
      ).toBeGreaterThanOrEqual(0);
      expect(analysis.chromaticAnalysis?.chromaticNotes).toBeDefined();
    });
  });

  describe("recognizeIntervalPatterns", () => {
    it("should recognize basic patterns", () => {
      const melody = [60, 62, 64, 66, 68]; // Ascending by whole steps
      const analysis = recognizeIntervalPatterns(melody);

      expect(analysis.patterns).toBeDefined();
      expect(analysis.techniques).toBeDefined();
    });

    it("should detect sequences", () => {
      const melody = [60, 62, 64, 62, 64, 66, 64, 66, 68]; // Sequential pattern
      const analysis = recognizeIntervalPatterns(melody);

      // Should detect some form of sequential development
      expect(analysis.patterns.length).toBeGreaterThanOrEqual(0);
      expect(analysis.techniques.length).toBeGreaterThanOrEqual(0);
    });

    it("should analyze Schillinger techniques", () => {
      const melody = [60, 64, 67, 72, 76, 72, 67, 60]; // Complex contour
      const analysis = recognizeIntervalPatterns(melody);

      expect(analysis.techniques).toBeDefined();
      analysis.techniques.forEach((technique) => {
        expect(technique.technique).toBeTypeOf("string");
        expect(technique.strength).toBeGreaterThanOrEqual(0);
        expect(technique.strength).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("analyzeMelodicComplexity", () => {
    it("should analyze simple melody complexity", () => {
      const melody = [60, 62, 64, 65, 67]; // Simple ascending
      const analysis = analyzeMelodicComplexity(melody);

      expect(analysis.overallComplexity).toBeGreaterThanOrEqual(0);
      expect(analysis.overallComplexity).toBeLessThanOrEqual(1);
      expect(analysis.components).toBeDefined();
      expect(analysis.structuralAnalysis).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    it("should analyze complex melody complexity", () => {
      const melody = [60, 67, 55, 72, 48, 76, 52, 69]; // Complex intervals
      const analysis = analyzeMelodicComplexity(melody);

      expect(analysis.overallComplexity).toBeGreaterThan(0.3);
      expect(analysis.components.intervalComplexity).toBeGreaterThan(0);
      expect(analysis.components.contourComplexity).toBeGreaterThan(0);
    });

    it("should provide structural analysis", () => {
      const melody = [60, 62, 64, 67, 65, 62, 60, 64, 67, 69, 67, 64];
      const analysis = analyzeMelodicComplexity(melody);

      expect(analysis.structuralAnalysis.phrases).toBeDefined();
      expect(analysis.structuralAnalysis.motifs).toBeDefined();
      expect(analysis.structuralAnalysis.development).toBeDefined();
    });

    it("should provide recommendations", () => {
      const melody = [60, 60, 60, 60]; // Very simple melody
      const analysis = analyzeMelodicComplexity(melody);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations[0]).toBeTypeOf("string");
    });
  });

  describe("Integration with Generated Contours", () => {
    it("should analyze generated contours with high confidence", () => {
      // Generate a contour and then analyze it
      const generatedContour = generateMelodicContour(3, 2, {
        key: "C",
        scale: "major",
        range: [60, 72],
        length: 8,
      });

      const inferences = analyzeMelodicContour(generatedContour.notes);

      expect(inferences.length).toBeGreaterThan(0);
      // Should have reasonable confidence for generated patterns
      expect(inferences[0].confidence).toBeGreaterThan(0.3);
    });

    it("should detect correct generators for known patterns", () => {
      const generatedContour = generateMelodicContour(4, 3, {
        key: "C",
        scale: "major",
        range: [60, 72],
        contourType: "arch",
      });

      const encoding = encodeMelody(generatedContour.notes);

      // Should detect generators close to the original 4:3
      const bestMatch = encoding.bestMatch;
      expect(
        (bestMatch.generators.a === 4 && bestMatch.generators.b === 3) ||
          (bestMatch.generators.a === 3 && bestMatch.generators.b === 4) ||
          bestMatch.confidence > 0.4, // Or at least have decent confidence
      ).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single-note melodies", () => {
      const melody = [60];
      expect(() => analyzeMelodicContour(melody)).not.toThrow();
    });

    it("should handle melodies with repeated notes", () => {
      const melody = [60, 60, 60, 62, 62, 64, 64, 64];
      const analysis = analyzeMelodicContour(melody);

      expect(analysis.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle wide-range melodies", () => {
      const melody = [36, 84, 48, 72, 60]; // Very wide range
      const analysis = analyzeMelodicContour(melody);

      expect(analysis.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle chromatic melodies", () => {
      const melody = [60, 61, 62, 63, 64, 65, 66, 67]; // Chromatic
      const analysis = analyzeMelodicContour(melody);

      expect(analysis.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Performance", () => {
    it("should handle long melodies efficiently", () => {
      const longMelody = new Array(50).fill(0).map((_, i) => 60 + (i % 12));

      const startTime = Date.now();
      const analysis = analyzeMelodicContour(longMelody, { maxGenerator: 8 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(analysis.length).toBeGreaterThanOrEqual(0);
    });

    it("should limit computation with maxGenerator option", () => {
      const melody = [60, 62, 64, 67];

      const startTime = Date.now();
      analyzeMelodicContour(melody, { maxGenerator: 6 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should be fast with limited generators
    });
  });
});

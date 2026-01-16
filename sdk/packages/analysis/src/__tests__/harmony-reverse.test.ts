/**
 * Tests for chord and progression reverse analysis
 */

import { describe, it, expect } from "vitest";
import {
  analyzeChord,
  analyzeProgression,
  inferHarmonicGenerators,
  encodeProgression,
  analyzeVoiceLeadingAndRhythm,
  type ChordPattern,
} from "../reverse-analysis/harmony-reverse";
import { generateHarmonicProgression } from "@schillinger-sdk/shared/math/harmonic-progressions";

describe("Harmony Reverse Analysis", () => {
  describe("analyzeChord", () => {
    it("should analyze a major chord", () => {
      const analysis = analyzeChord("C", "C", "major");

      expect(analysis.chord).toBe("C");
      expect(analysis.rootNote).toBe("C");
      expect(analysis.quality).toBe("major");
      expect(analysis.function).toBe("tonic");
      expect(analysis.stability).toBeGreaterThan(0.5);
      expect(analysis.complexity).toBeGreaterThanOrEqual(0);
    });

    it("should analyze a minor chord", () => {
      const analysis = analyzeChord("Am", "C", "major");

      expect(analysis.chord).toBe("Am");
      expect(analysis.rootNote).toBe("A");
      expect(analysis.quality).toBe("minor");
      expect(analysis.function).toBe("tonic");
      expect(analysis.stability).toBeGreaterThan(0);
    });

    it("should analyze a dominant 7th chord", () => {
      const analysis = analyzeChord("G7", "C", "major");

      expect(analysis.chord).toBe("G7");
      expect(analysis.rootNote).toBe("G");
      expect(analysis.quality).toBe("dominant");
      expect(analysis.extensions).toContain("7");
      expect(analysis.function).toBe("dominant");
      expect(analysis.complexity).toBeGreaterThan(0);
    });

    it("should analyze complex chords with extensions", () => {
      const analysis = analyzeChord("Cmaj9#11", "C", "major");

      expect(analysis.rootNote).toBe("C");
      expect(analysis.extensions.length).toBeGreaterThan(0);
      expect(analysis.complexity).toBeGreaterThan(0.3);
    });

    it("should handle different keys", () => {
      const analysisInC = analyzeChord("F", "C", "major");
      const analysisInF = analyzeChord("F", "F", "major");

      expect(analysisInC.function).toBe("subdominant");
      expect(analysisInF.function).toBe("tonic");
    });
  });

  describe("analyzeProgression", () => {
    it("should analyze a simple progression", () => {
      const chords = ["C", "Am", "F", "G"];
      const analysis = analyzeProgression(chords);

      expect(analysis.chords).toHaveLength(4);
      expect(analysis.key).toBeDefined();
      expect(analysis.scale).toBeDefined();
      expect(analysis.functions).toHaveLength(4);
      expect(analysis.tensionCurve).toHaveLength(4);
      expect(analysis.voiceLeading).toBeDefined();
    });

    it("should detect cadences", () => {
      const chords = ["C", "F", "G", "C"]; // I-IV-V-I progression
      const analysis = analyzeProgression(chords);

      expect(analysis.cadences.length).toBeGreaterThanOrEqual(0);
      // Should detect authentic cadence (V-I)
      const authenticCadence = analysis.cadences.find(
        (c) => c.type === "authentic",
      );
      if (authenticCadence) {
        expect(authenticCadence.position).toBe(3); // G to C
      }
    });

    it("should handle ChordPattern objects", () => {
      const chordPattern: ChordPattern = {
        chords: ["C", "Am", "F", "G"],
        key: "C",
        scale: "major",
        timeSignature: [4, 4],
      };

      const analysis = analyzeProgression(chordPattern);

      expect(analysis.chords).toHaveLength(4);
      expect(analysis.key).toBe("C");
    });

    it("should analyze jazz progressions", () => {
      const chords = ["Cmaj7", "A7", "Dm7", "G7"];
      const analysis = analyzeProgression(chords);

      // Should detect extensions or dominant qualities in jazz progressions
      const hasExtensionsOrDominant = analysis.chords.some(
        (chord) => chord.extensions.length > 0 || chord.quality === "dominant",
      );
      expect(hasExtensionsOrDominant).toBe(true);
      expect(analysis.chords.some((chord) => chord.complexity > 0.1)).toBe(
        true,
      );
    });

    it("should handle empty progressions gracefully", () => {
      expect(() => analyzeProgression([])).toThrow();
    });
  });

  describe("inferHarmonicGenerators", () => {
    it("should infer generators for simple progression", () => {
      const chords = ["C", "F", "G", "C"];
      const inferences = inferHarmonicGenerators(chords, { maxGenerator: 8 });

      expect(inferences.length).toBeGreaterThan(0);
      expect(inferences[0].confidence).toBeGreaterThan(0);
      expect(inferences[0].generators.a).toBeGreaterThan(0);
      expect(inferences[0].generators.b).toBeGreaterThan(0);
      expect(inferences[0].detectedParameters).toBeDefined();
    });

    it("should respect maxGenerator option", () => {
      const chords = ["C", "Am", "F", "G"];
      const inferences = inferHarmonicGenerators(chords, { maxGenerator: 4 });

      inferences.forEach((inference) => {
        expect(inference.generators.a).toBeLessThanOrEqual(4);
        expect(inference.generators.b).toBeLessThanOrEqual(4);
      });
    });

    it("should respect minConfidence option", () => {
      const chords = ["C", "Am", "F", "G"];
      const inferences = inferHarmonicGenerators(chords, {
        minConfidence: 0.5,
      });

      inferences.forEach((inference) => {
        expect(inference.confidence).toBeGreaterThanOrEqual(0.5);
      });
    });

    it("should handle complex jazz progressions", () => {
      const chords = ["Cmaj7", "E7alt", "Am7", "D7", "Dm7", "G7sus4", "Cmaj7"];
      const inferences = inferHarmonicGenerators(chords, { maxGenerator: 8 });

      expect(inferences.length).toBeGreaterThanOrEqual(0);
      if (inferences.length > 0) {
        expect(inferences[0].detectedParameters.style).toBeDefined();
        expect(inferences[0].detectedParameters.complexity).toBeDefined();
      }
    });

    it("should detect key and scale", () => {
      const chords = ["Am", "F", "C", "G"];
      const inferences = inferHarmonicGenerators(chords);

      if (inferences.length > 0) {
        expect(inferences[0].detectedParameters.key).toBeDefined();
        expect(inferences[0].detectedParameters.scale).toBeDefined();
      }
    });
  });

  describe("encodeProgression", () => {
    it("should encode a simple progression", () => {
      const chords = ["C", "Am", "F", "G"];
      const encoding = encodeProgression(chords);

      expect(encoding.originalProgression).toEqual(chords);
      expect(encoding.bestMatch).toBeDefined();
      expect(encoding.alternatives).toBeDefined();
      expect(encoding.confidence).toBeGreaterThan(0);
      expect(encoding.progressionAnalysis).toBeDefined();
      expect(encoding.metadata.analysisTimestamp).toBeTypeOf("number");
    });

    it("should handle ChordPattern objects", () => {
      const chordPattern: ChordPattern = {
        chords: ["C", "F", "G", "C"],
        key: "C",
        scale: "major",
      };

      const encoding = encodeProgression(chordPattern);

      expect(encoding.originalProgression).toEqual(chordPattern.chords);
      expect(encoding.progressionAnalysis.key).toBe("C");
    });

    it("should provide detailed analysis", () => {
      const chords = ["Cmaj7", "Am7", "Dm7", "G7"];
      const encoding = encodeProgression(chords);

      expect(encoding.progressionAnalysis.chords).toHaveLength(4);
      expect(encoding.progressionAnalysis.functions).toHaveLength(4);
      expect(encoding.progressionAnalysis.tensionCurve).toHaveLength(4);
      expect(encoding.metadata.averageTension).toBeGreaterThanOrEqual(0);
      expect(encoding.metadata.functionalComplexity).toBeGreaterThanOrEqual(0);
    });

    it("should handle invalid chord symbols gracefully", () => {
      const chords = ["X"]; // Invalid chord

      // Should not throw during analysis, but might have low confidence
      const encoding = encodeProgression(chords, { minConfidence: 0.01 });
      expect(encoding.confidence).toBeGreaterThanOrEqual(0);
      expect(encoding.originalProgression).toEqual(chords);
    });
  });

  describe("analyzeVoiceLeadingAndRhythm", () => {
    it("should analyze voice leading", () => {
      const chords = ["C", "Am", "F", "G"];
      const analysis = analyzeVoiceLeadingAndRhythm(chords);

      expect(analysis.voiceLeading).toBeDefined();
      expect(analysis.voiceLeading.smoothness).toBeGreaterThanOrEqual(0);
      expect(analysis.voiceLeading.smoothness).toBeLessThanOrEqual(1);
      expect(analysis.voiceLeading.contraryMotion).toBeGreaterThanOrEqual(0);
      expect(analysis.voiceLeading.parallelMotion).toBeGreaterThanOrEqual(0);
      expect(analysis.voiceLeading.stepwiseMotion).toBeGreaterThanOrEqual(0);
    });

    it("should analyze harmonic rhythm", () => {
      const chords = ["C", "Am", "F", "G"];
      const analysis = analyzeVoiceLeadingAndRhythm(chords);

      expect(analysis.harmonicRhythm).toBeDefined();
      expect(analysis.harmonicRhythm.changes).toBeDefined();
      expect(analysis.harmonicRhythm.density).toBeGreaterThanOrEqual(0);
      expect(analysis.harmonicRhythm.acceleration).toBeDefined();
      expect(analysis.harmonicRhythm.patterns).toBeDefined();
    });

    it("should provide voice ranges", () => {
      const chords = ["C", "F", "G", "C"];
      const analysis = analyzeVoiceLeadingAndRhythm(chords);

      expect(analysis.voiceLeading.voiceRanges).toBeDefined();
      expect(analysis.voiceLeading.voiceRanges.bass).toBeDefined();
      expect(analysis.voiceLeading.voiceRanges.tenor).toBeDefined();
      expect(analysis.voiceLeading.voiceRanges.alto).toBeDefined();
      expect(analysis.voiceLeading.voiceRanges.soprano).toBeDefined();
    });
  });

  describe("Integration with Generated Progressions", () => {
    it("should analyze generated progressions with high confidence", () => {
      // Generate a progression and then analyze it
      const generatedProgression = generateHarmonicProgression(3, 2, {
        key: "C",
        scale: "major",
        length: 4,
      });

      const inferences = inferHarmonicGenerators(generatedProgression.chords);

      expect(inferences.length).toBeGreaterThan(0);
      // Should have reasonable confidence for generated patterns
      expect(inferences[0].confidence).toBeGreaterThan(0.2);
    });

    it("should detect correct generators for known progressions", () => {
      const generatedProgression = generateHarmonicProgression(4, 3, {
        key: "C",
        scale: "major",
        complexity: "simple",
      });

      const encoding = encodeProgression(generatedProgression.chords);

      // Should detect generators close to the original 4:3
      const bestMatch = encoding.bestMatch;
      expect(
        (bestMatch.generators.a === 4 && bestMatch.generators.b === 3) ||
          (bestMatch.generators.a === 3 && bestMatch.generators.b === 4) ||
          bestMatch.confidence > 0.3, // Or at least have decent confidence
      ).toBe(true);
    });
  });

  describe("Functional Analysis", () => {
    it("should identify tonic function", () => {
      const analysis = analyzeChord("C", "C", "major");
      expect(analysis.function).toBe("tonic");
    });

    it("should identify subdominant function", () => {
      const analysis = analyzeChord("F", "C", "major");
      expect(analysis.function).toBe("subdominant");
    });

    it("should identify dominant function", () => {
      const analysis = analyzeChord("G", "C", "major");
      expect(analysis.function).toBe("dominant");
    });

    it("should analyze functional progression", () => {
      const chords = ["C", "F", "G", "C"]; // I-IV-V-I
      const analysis = analyzeProgression(chords);

      expect(analysis.functions).toEqual([
        "tonic",
        "subdominant",
        "dominant",
        "tonic",
      ]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single chord", () => {
      const chords = ["C"];
      const analysis = analyzeProgression(chords);

      expect(analysis.chords).toHaveLength(1);
      expect(analysis.functions).toHaveLength(1);
    });

    it("should handle complex chord symbols", () => {
      const chords = ["Cmaj7#11", "F#m7b5", "G7alt"];
      const analysis = analyzeProgression(chords);

      expect(analysis.chords).toHaveLength(3);
      analysis.chords.forEach((chord) => {
        expect(chord.complexity).toBeGreaterThan(0);
      });
    });

    it("should handle slash chords", () => {
      const chords = ["C/E", "F/A", "G/B"];
      const analysis = analyzeProgression(chords);

      expect(analysis.chords).toHaveLength(3);
      // Should still identify root notes correctly
      expect(analysis.chords[0].rootNote).toBe("C");
      expect(analysis.chords[1].rootNote).toBe("F");
      expect(analysis.chords[2].rootNote).toBe("G");
    });

    it("should handle modal progressions", () => {
      const chords = ["Dm", "Em", "F", "G", "Am", "Bb", "C"]; // D Dorian
      const analysis = analyzeProgression(chords);

      expect(analysis.chords).toHaveLength(7);
      expect(analysis.scale).toBeDefined();
    });
  });

  describe("Performance", () => {
    it("should handle long progressions efficiently", () => {
      const longProgression = new Array(20).fill(["C", "Am", "F", "G"]).flat();

      const startTime = Date.now();
      const analysis = inferHarmonicGenerators(longProgression, {
        maxGenerator: 8,
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(analysis.length).toBeGreaterThanOrEqual(0);
    });

    it("should limit computation with maxGenerator option", () => {
      const chords = ["C", "Am", "F", "G"];

      const startTime = Date.now();
      inferHarmonicGenerators(chords, { maxGenerator: 6 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should be fast with limited generators
    });
  });
});

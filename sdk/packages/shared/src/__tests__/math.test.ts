/**
 * Tests for Schillinger mathematical functions
 */

import { describe, it, expect } from "vitest";
import {
  validateGenerators,
  calculateGCD,
  calculateLCM,
  findGeneratorsForLength,
  generateRhythmicResultant,
  generateHarmonicProgression,
  generateMelodicContour,
  validateKey,
  validateScale,
  validateTempo,
  validateTimeSignature,
} from "../math";

describe("Generator utilities", () => {
  describe("validateGenerators", () => {
    it("should validate correct generator pairs", () => {
      const result = validateGenerators(3, 2);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject non-integer generators", () => {
      const result = validateGenerators(3.5, 2);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Generators must be integers");
    });

    it("should reject generators below minimum", () => {
      const result = validateGenerators(0, 2);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Generators must be at least 1");
    });

    it("should reject generators above maximum", () => {
      const result = validateGenerators(50, 2);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Generators should not exceed 32 for practical use",
      );
    });

    it("should warn about equal generators", () => {
      const result = validateGenerators(3, 3);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        "Equal generators will produce simple repetitive patterns",
      );
    });

    it("should warn about common factors", () => {
      const result = validateGenerators(6, 4);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("common factor"))).toBe(
        true,
      );
    });
  });

  describe("calculateGCD", () => {
    it("should calculate greatest common divisor correctly", () => {
      expect(calculateGCD(12, 8)).toBe(4);
      expect(calculateGCD(17, 13)).toBe(1);
      expect(calculateGCD(100, 25)).toBe(25);
      expect(calculateGCD(0, 5)).toBe(5);
    });
  });

  describe("calculateLCM", () => {
    it("should calculate least common multiple correctly", () => {
      expect(calculateLCM(4, 6)).toBe(12);
      expect(calculateLCM(3, 5)).toBe(15);
      expect(calculateLCM(12, 8)).toBe(24);
    });
  });

  describe("findGeneratorsForLength", () => {
    it("should find generators for target length", () => {
      const pairs = findGeneratorsForLength(12);
      expect(pairs.length).toBeGreaterThan(0);

      // Verify all pairs actually produce the target length
      pairs.forEach((pair) => {
        expect(calculateLCM(pair.a, pair.b)).toBe(12);
      });
    });

    it("should return empty array for impossible lengths", () => {
      const pairs = findGeneratorsForLength(1);
      expect(pairs).toHaveLength(0);
    });
  });
});

describe("Rhythmic resultants", () => {
  describe("generateRhythmicResultant", () => {
    it("should generate correct 3:2 resultant", () => {
      const result = generateRhythmicResultant(3, 2);

      expect(result.pattern).toHaveLength(6); // LCM of 3 and 2
      expect(result.generators).toEqual({ a: 3, b: 2 });
      expect(result.length).toBe(6);
      expect(result.pattern[0]).toBe(3); // Both generators hit at position 0
    });

    it("should generate correct 4:3 resultant", () => {
      const result = generateRhythmicResultant(4, 3);

      expect(result.pattern).toHaveLength(12); // LCM of 4 and 3
      expect(result.generators).toEqual({ a: 4, b: 3 });
      expect(result.length).toBe(12);
    });

    it("should include metadata when requested", () => {
      const result = generateRhythmicResultant(3, 2, { includeMetadata: true });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.accents).toBeDefined();
      expect(result.metadata.strongBeats).toBeDefined();
      expect(typeof result.metadata.syncopation).toBe("number");
      expect(typeof result.metadata.density).toBe("number");
    });

    it("should respect custom accent strengths", () => {
      const result = generateRhythmicResultant(3, 2, {
        accentStrength: 5,
        normalStrength: 2,
        restValue: 0,
      });

      expect(result.pattern[0]).toBe(5); // Accent at position 0
      expect(result.pattern.some((val) => val === 2)).toBe(true); // Normal beats present
      expect(result.pattern.some((val) => val === 0)).toBe(true); // Rests present
    });

    it("should throw error for invalid generators", () => {
      expect(() => generateRhythmicResultant(0, 2)).toThrow();
      expect(() => generateRhythmicResultant(3.5, 2)).toThrow();
    });
  });
});

describe("Harmonic progressions", () => {
  describe("generateHarmonicProgression", () => {
    it("should generate progression with valid generators", () => {
      const result = generateHarmonicProgression(4, 3, {
        key: "C",
        scale: "major",
      });

      expect(result.chords).toHaveLength(12); // LCM of 4 and 3
      expect(result.functions).toHaveLength(12);
      expect(result.tensions).toHaveLength(12);
      expect(result.key).toBe("C");
      expect(result.scale).toBe("major");
      expect(result.generators).toEqual({ a: 4, b: 3 });
    });

    it("should include metadata", () => {
      const result = generateHarmonicProgression(3, 2);

      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata.complexity).toBe("number");
      expect(typeof result.metadata.stability).toBe("number");
      expect(typeof result.metadata.movement).toBe("number");
      expect(result.metadata.voiceLeading).toBeDefined();
    });

    it("should respect complexity settings", () => {
      const simple = generateHarmonicProgression(3, 2, {
        complexity: "simple",
      });
      const complex = generateHarmonicProgression(3, 2, {
        complexity: "complex",
      });

      // Complex should generally have higher complexity score
      expect(complex.metadata.complexity).toBeGreaterThanOrEqual(
        simple.metadata.complexity,
      );
    });

    it("should throw error for invalid scale", () => {
      expect(() =>
        generateHarmonicProgression(3, 2, { scale: "invalid" }),
      ).toThrow();
    });
  });
});

describe("Melodic contours", () => {
  describe("generateMelodicContour", () => {
    it("should generate contour with valid generators", () => {
      const result = generateMelodicContour(4, 3, {
        key: "C",
        scale: "major",
        range: [60, 72],
      });

      expect(result.notes).toHaveLength(12); // LCM of 4 and 3
      expect(result.intervals).toHaveLength(11); // One less than notes
      expect(result.key).toBe("C");
      expect(result.scale).toBe("major");
      expect(result.generators).toEqual({ a: 4, b: 3 });

      // All notes should be within range
      result.notes.forEach((note) => {
        expect(note).toBeGreaterThanOrEqual(60);
        expect(note).toBeLessThanOrEqual(72);
      });
    });

    it("should include comprehensive metadata", () => {
      const result = generateMelodicContour(3, 2);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.range).toHaveLength(2);
      expect(typeof result.metadata.complexity).toBe("number");
      expect(["ascending", "descending", "mixed"]).toContain(
        result.metadata.direction,
      );
      expect(Array.isArray(result.metadata.phrases)).toBe(true);
      expect(Array.isArray(result.metadata.peaks)).toBe(true);
      expect(Array.isArray(result.metadata.valleys)).toBe(true);
    });

    it("should analyze contour shape", () => {
      const result = generateMelodicContour(3, 2, { contourType: "arch" });

      expect(result.contour).toBeDefined();
      expect(result.contour.type).toBe("arch");
      expect(typeof result.contour.strength).toBe("number");
      expect(result.contour.strength).toBeGreaterThanOrEqual(0);
      expect(result.contour.strength).toBeLessThanOrEqual(1);
    });

    it("should respect range constraints", () => {
      const result = generateMelodicContour(3, 2, {
        range: [48, 60],
      });

      result.notes.forEach((note) => {
        expect(note).toBeGreaterThanOrEqual(48);
        expect(note).toBeLessThanOrEqual(60);
      });
    });

    it("should throw error for invalid scale", () => {
      expect(() =>
        generateMelodicContour(3, 2, { scale: "invalid" }),
      ).toThrow();
    });
  });
});

describe("Validation functions", () => {
  describe("validateKey", () => {
    it("should validate correct keys", () => {
      const result = validateKey("C");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate sharp keys", () => {
      const result = validateKey("F#");
      expect(result.valid).toBe(true);
    });

    it("should validate flat keys", () => {
      const result = validateKey("Bb");
      expect(result.valid).toBe(true);
    });

    it("should reject invalid keys", () => {
      const result = validateKey("H");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject non-string input", () => {
      const result = validateKey(123);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Key must be a string");
    });

    it("should provide suggestions for invalid keys", () => {
      const result = validateKey("invalid");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("validateScale", () => {
    it("should validate major scale", () => {
      const result = validateScale("major");
      expect(result.valid).toBe(true);
    });

    it("should validate minor scale", () => {
      const result = validateScale("minor");
      expect(result.valid).toBe(true);
    });

    it("should validate modal scales", () => {
      const result = validateScale("dorian");
      expect(result.valid).toBe(true);
    });

    it("should reject invalid scales", () => {
      const result = validateScale("invalid");
      expect(result.valid).toBe(false);
    });

    it("should warn about complex scales", () => {
      const result = validateScale("locrian");
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("validateTempo", () => {
    it("should validate normal tempos", () => {
      const result = validateTempo(120);
      expect(result.valid).toBe(true);
    });

    it("should reject tempos too slow", () => {
      const result = validateTempo(30);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Tempo too slow: minimum 40 BPM");
    });

    it("should reject tempos too fast", () => {
      const result = validateTempo(400);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Tempo too fast: maximum 300 BPM");
    });

    it("should warn about extreme tempos", () => {
      const slow = validateTempo(50);
      expect(slow.warnings.length).toBeGreaterThan(0);

      const fast = validateTempo(250);
      expect(fast.warnings.length).toBeGreaterThan(0);
    });

    it("should reject non-numeric input", () => {
      const result = validateTempo("120");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Tempo must be a number");
    });
  });

  describe("validateTimeSignature", () => {
    it("should validate common time signatures", () => {
      expect(validateTimeSignature([4, 4]).valid).toBe(true);
      expect(validateTimeSignature([3, 4]).valid).toBe(true);
      expect(validateTimeSignature([6, 8]).valid).toBe(true);
    });

    it("should reject invalid format", () => {
      const result = validateTimeSignature("4/4");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Time signature must be an array");
    });

    it("should reject wrong array length", () => {
      const result = validateTimeSignature([4]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Time signature must have exactly 2 elements",
      );
    });

    it("should reject invalid denominators", () => {
      const result = validateTimeSignature([4, 3]);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("Invalid time signature denominator"),
        ),
      ).toBe(true);
    });

    it("should warn about unusual time signatures", () => {
      const result = validateTimeSignature([7, 8]);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

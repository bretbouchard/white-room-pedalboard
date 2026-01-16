/**
 * CI Tests: Long Cycle Memory
 *
 * These tests enforce that the system remembers previous tension peaks
 * and avoids repeating identical高潮 (climax) configurations.
 *
 * Schillinger Principle: Musical interest requires variety.
 * Repeating the same peak tension creates predictable, boring music.
 *
 * If any of these tests fail, the system will repeat itself unnecessarily.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LongCycleMemory,
  PeakContext,
  MemoryConfig,
} from "../../src/structure/LongCycleMemory";
import { TensionAccumulator } from "../../src/structure/TensionAccumulator";

describe("Long Cycle Memory", () => {
  let memory: LongCycleMemory;
  let accumulator: TensionAccumulator;

  beforeEach(() => {
    accumulator = new TensionAccumulator();
    memory = new LongCycleMemory(accumulator);
  });

  describe("peak recording", () => {
    it("records tension peaks above threshold", () => {
      const context: PeakContext = {
        bar: 16,
        beat: 4,
        section: "development",
        cause: "drill_fill",
        primaryDomain: "rhythmic",
      };

      memory.recordPeak(0.5, context);

      const peaks = memory.getPeakHistory();
      expect(peaks.length).toBe(1);
      expect(peaks[0].tension).toBe(0.5);
      expect(peaks[0].context.bar).toBe(16);
    });

    it("ignores peaks below threshold", () => {
      const context: PeakContext = {
        bar: 8,
        beat: 2,
        section: "introduction",
        cause: "minor_fluctuation",
        primaryDomain: "rhythmic",
      };

      memory.recordPeak(0.2, context); // Below default threshold of 0.3

      const peaks = memory.getPeakHistory();
      expect(peaks.length).toBe(0);
    });

    it("maintains memory depth limit", () => {
      const config: Partial<MemoryConfig> = {
        memoryDepth: 3,
        peakThreshold: 0.3,
      };

      const limitedMemory = new LongCycleMemory(accumulator, config);

      // Record 5 peaks
      for (let i = 1; i <= 5; i++) {
        limitedMemory.recordPeak(0.4 + i * 0.05, {
          bar: i * 8,
          beat: 4,
          section: "development",
          cause: `peak_${i}`,
          primaryDomain: "rhythmic",
        });
      }

      // Should only keep last 3
      const peaks = limitedMemory.getPeakHistory();
      expect(peaks.length).toBe(3);
      expect(peaks[0].context.bar).toBe(24); // First of the 3 kept
    });

    it("avoids duplicate recordings", () => {
      const context: PeakContext = {
        bar: 16,
        beat: 4,
        section: "development",
        cause: "drill",
        primaryDomain: "rhythmic",
      };

      // Record same peak twice
      memory.recordPeak(0.5, context);
      memory.recordPeak(0.5, context);

      const peaks = memory.getPeakHistory();
      expect(peaks.length).toBe(1); // Only recorded once
    });
  });

  describe("similarity detection", () => {
    it("detects repeating peaks within tolerance", () => {
      // First peak
      memory.recordPeak(0.5, {
        bar: 16,
        beat: 4,
        section: "development",
        cause: "first_climax",
        primaryDomain: "rhythmic",
      });

      // Similar peak (within 0.08 tolerance)
      const isRepeating = memory.isRepeatingPeak(0.52);

      expect(isRepeating).toBe(true);
    });

    it("does not flag peaks outside tolerance", () => {
      memory.recordPeak(0.5, {
        bar: 16,
        beat: 4,
        section: "development",
        cause: "first_climax",
        primaryDomain: "rhythmic",
      });

      // Different enough (0.5 vs 0.62, difference is 0.12 > 0.08)
      const isRepeating = memory.isRepeatingPeak(0.62);

      expect(isRepeating).toBe(false);
    });

    it("finds most recent similar peak", () => {
      memory.recordPeak(0.5, {
        bar: 16,
        beat: 4,
        section: "development",
        cause: "first_peak",
        primaryDomain: "rhythmic",
      });

      memory.recordPeak(0.7, {
        bar: 32,
        beat: 4,
        section: "climax",
        cause: "second_peak",
        primaryDomain: "harmonic",
      });

      memory.recordPeak(0.51, {
        bar: 48,
        beat: 3,
        section: "development",
        cause: "third_peak",
        primaryDomain: "rhythmic",
      });

      // Find similar to 0.52
      const similar = memory.findSimilarPeak(0.52);

      expect(similar).not.toBeNull();
      // Should find the most recent similar (0.51 at bar 48)
      expect(similar!.context.bar).toBe(48);
    });

    it("returns null when no similar peak exists", () => {
      const similar = memory.findSimilarPeak(0.8);

      expect(similar).toBeNull();
    });

    it("uses custom tolerance when provided", () => {
      memory.recordPeak(0.5, {
        bar: 16,
        beat: 4,
        section: "development",
        cause: "peak",
        primaryDomain: "rhythmic",
      });

      // With loose tolerance
      const isRepeatingLoose = memory.isRepeatingPeak(0.62, 0.15);
      expect(isRepeatingLoose).toBe(true);

      // With strict tolerance
      const isRepeatingStrict = memory.isRepeatingPeak(0.52, 0.01);
      expect(isRepeatingStrict).toBe(false);
    });
  });

  describe("alternative strategies", () => {
    it("suggests alternative when repeating detected", () => {
      memory.recordPeak(0.36, {
        // 0.9 * 0.4 (weighted)
        bar: 16,
        beat: 4,
        section: "development",
        cause: "drill_climax",
        primaryDomain: "rhythmic",
      });

      // Build similar tension
      accumulator.writeRhythmicTension(0.9, "approaching_repeat");

      const strategy = memory.getAlternativeStrategy();

      expect(strategy.avoidingPeak).not.toBeNull();
      expect(strategy.avoidingPeak!.context.bar).toBe(16);
      expect(strategy.expectedTotal).toBeLessThan(0.36);
    });

    it("suggests return_to_groove for previous harmonic peaks", () => {
      memory.recordPeak(0.36, {
        // 0.9 * 0.4 (weighted)
        bar: 32,
        beat: 3,
        section: "climax",
        cause: "harmonic_tension",
        primaryDomain: "harmonic",
      });

      accumulator.writeHarmonicTension(0.9, "repeating_harmonic");

      const strategy = memory.getAlternativeStrategy();

      expect(strategy.strategy).toBe("return_to_groove");
      expect(strategy.reason).toContain("harmonic");
    });

    it("suggests harmonic_resolution for previous rhythmic peaks", () => {
      memory.recordPeak(0.36, {
        // 0.9 * 0.4 (weighted)
        bar: 24,
        beat: 4,
        section: "development",
        cause: "drill_fill",
        primaryDomain: "rhythmic",
      });

      // Build similar tension with significant harmonic component
      accumulator.writeRhythmicTension(0.6, "rhythmic_peak");
      accumulator.writeHarmonicTension(0.4, "some_harmony");

      // Total: 0.6*0.4 + 0.4*0.4 = 0.24 + 0.16 = 0.40 (within tolerance of 0.36)
      const currentTotal = accumulator.getTotal();

      // Verify we're in similarity range
      expect(Math.abs(currentTotal - 0.36)).toBeLessThan(0.08);

      const strategy = memory.getAlternativeStrategy();

      expect(strategy.strategy).toBe("harmonic_resolution");
    });

    it("suggests hybrid_approach for previous formal peaks", () => {
      memory.recordPeak(0.36, {
        // Weighted formal (0.8 * 0.2 = 0.16) + some other tension
        bar: 32,
        beat: 4,
        section: "climax",
        cause: "phrase_boundary",
        primaryDomain: "formal",
      });

      accumulator.writeFormalTension(0.8, "formal_peak");
      accumulator.writeRhythmicTension(0.5, "some_rhythm"); // Add other tension to reach similar total

      const strategy = memory.getAlternativeStrategy();

      expect(strategy.strategy).toBe("hybrid_approach");
    });

    it("provides target tension values", () => {
      memory.recordPeak(0.5, {
        bar: 16,
        beat: 4,
        section: "development",
        cause: "peak",
        primaryDomain: "rhythmic",
      });

      accumulator.writeRhythmicTension(0.8, "current");
      accumulator.writeHarmonicTension(0.6, "current");
      accumulator.writeFormalTension(0.4, "current");

      const strategy = memory.getAlternativeStrategy();

      expect(strategy.targetTension.rhythmic).toBeLessThan(0.8);
      expect(strategy.targetTension.harmonic).toBeDefined();
      expect(strategy.targetTension.formal).toBeDefined();
    });
  });

  describe("auto-recording from accumulator", () => {
    it("records peak automatically when tension is high", () => {
      accumulator.updatePosition(16, 4, 0);
      accumulator.writeRhythmicTension(0.9, "peak");

      const wasRecorded = memory.recordCurrentPeak("development", "drill");

      expect(wasRecorded).toBe(true);
      expect(memory.getPeakHistory().length).toBe(1);
    });

    it("does not record when tension is low", () => {
      accumulator.updatePosition(8, 2, 0);
      accumulator.writeRhythmicTension(0.2, "low");

      const wasRecorded = memory.recordCurrentPeak("introduction", "groove");

      expect(wasRecorded).toBe(false);
      expect(memory.getPeakHistory().length).toBe(0);
    });

    it("identifies primary domain correctly", () => {
      accumulator.updatePosition(32, 4, 0);
      accumulator.writeRhythmicTension(0.9, "rhythmic_peak");
      accumulator.writeHarmonicTension(0.3, "minor_harmonic");
      accumulator.writeFormalTension(0.2, "formal");

      memory.recordCurrentPeak("climax", "multi_domain");

      const peaks = memory.getPeakHistory();
      expect(peaks[0].context.primaryDomain).toBe("rhythmic");
    });
  });

  describe("explainability", () => {
    it("explains why path is being avoided", () => {
      memory.recordPeak(0.38, {
        // 0.95 * 0.4 (weighted rhythmic)
        bar: 32,
        beat: 4,
        section: "climax",
        cause: "drill_gate",
        primaryDomain: "rhythmic",
      });

      accumulator.writeRhythmicTension(0.95, "repeating");

      const explanation = memory.explainAvoidance();

      expect(explanation).toContain("bar 32");
      expect(explanation).toContain("0.38");
      expect(explanation).toContain("drill_gate");
    });

    it("indicates when no avoidance needed", () => {
      accumulator.writeRhythmicTension(0.8, "unique_tension");

      const explanation = memory.explainAvoidance();

      expect(explanation).toContain("unique");
      expect(explanation).toContain("no avoidance needed");
    });

    it("includes strategy suggestion in explanation", () => {
      memory.recordPeak(0.36, {
        // 0.9 * 0.4 (weighted)
        bar: 16,
        beat: 4,
        section: "development",
        cause: "first_climax",
        primaryDomain: "rhythmic",
      });

      accumulator.writeRhythmicTension(0.9, "repeating");

      const explanation = memory.explainAvoidance();

      expect(explanation).toContain("Suggested:");
      expect(explanation).toContain("Expected tension:");
    });
  });

  describe("statistics and analysis", () => {
    it("provides peak statistics", () => {
      memory.recordPeak(0.4, {
        bar: 16,
        beat: 4,
        section: "dev",
        cause: "p1",
        primaryDomain: "rhythmic",
      });

      memory.recordPeak(0.6, {
        bar: 32,
        beat: 4,
        section: "climax",
        cause: "p2",
        primaryDomain: "harmonic",
      });

      memory.recordPeak(0.5, {
        bar: 48,
        beat: 3,
        section: "dev",
        cause: "p3",
        primaryDomain: "rhythmic",
      });

      // Trigger avoidance for one peak
      memory.getAlternativeStrategy(0.5);

      const stats = memory.getPeakStatistics();

      expect(stats.totalPeaks).toBe(3);
      expect(stats.averageTension).toBeCloseTo(0.5, 1);
      expect(stats.maxTension).toBe(0.6);
      expect(stats.minTension).toBe(0.4);
      expect(stats.peaksAvoided).toBe(1);
    });

    it("returns zero stats when no peaks recorded", () => {
      const stats = memory.getPeakStatistics();

      expect(stats.totalPeaks).toBe(0);
      expect(stats.averageTension).toBe(0);
    });

    it("filters significant peaks", () => {
      const config: Partial<MemoryConfig> = { peakThreshold: 0.5 };
      const strictMemory = new LongCycleMemory(accumulator, config);

      strictMemory.recordPeak(0.4, {
        bar: 8,
        beat: 2,
        section: "dev",
        cause: "minor",
        primaryDomain: "rhythmic",
      });

      strictMemory.recordPeak(0.6, {
        bar: 16,
        beat: 4,
        section: "climax",
        cause: "major",
        primaryDomain: "rhythmic",
      });

      strictMemory.recordPeak(0.3, {
        bar: 24,
        beat: 3,
        section: "dev",
        cause: "small",
        primaryDomain: "harmonic",
      });

      const significant = strictMemory.getSignificantPeaks();

      expect(significant.length).toBe(1);
      expect(significant[0].tension).toBe(0.6);
    });
  });

  describe("configuration", () => {
    it("respects custom peak threshold", () => {
      const config: Partial<MemoryConfig> = { peakThreshold: 0.6 };
      const strictMemory = new LongCycleMemory(accumulator, config);

      strictMemory.recordPeak(0.5, {
        bar: 16,
        beat: 4,
        section: "dev",
        cause: "below_threshold",
        primaryDomain: "rhythmic",
      });

      expect(strictMemory.getPeakHistory().length).toBe(0);

      strictMemory.recordPeak(0.7, {
        bar: 32,
        beat: 4,
        section: "climax",
        cause: "above_threshold",
        primaryDomain: "rhythmic",
      });

      expect(strictMemory.getPeakHistory().length).toBe(1);
    });

    it("updates configuration dynamically", () => {
      memory.recordPeak(0.4, {
        bar: 16,
        beat: 4,
        section: "dev",
        cause: "p1",
        primaryDomain: "rhythmic",
      });

      // Initially no repetition detected (0.4 vs 0.48, diff 0.08 = exactly default tolerance)
      expect(memory.isRepeatingPeak(0.48)).toBe(true);

      // Update to stricter tolerance
      memory.updateConfig({ similarityTolerance: 0.05 });

      // Now 0.48 is not considered repeating
      expect(memory.isRepeatingPeak(0.48)).toBe(false);
    });

    it("can disable suggestions", () => {
      const config: Partial<MemoryConfig> = { enableSuggestions: false };
      const quietMemory = new LongCycleMemory(accumulator, config);

      quietMemory.recordPeak(0.5, {
        bar: 16,
        beat: 4,
        section: "dev",
        cause: "peak",
        primaryDomain: "rhythmic",
      });

      const strategy = quietMemory.getAlternativeStrategy(0.5);

      // Should still provide strategy, but reason reflects no suggestions
      expect(strategy).toBeDefined();
    });
  });

  describe("reset behavior", () => {
    it("clears all peaks on reset", () => {
      memory.recordPeak(0.5, {
        bar: 16,
        beat: 4,
        section: "dev",
        cause: "p1",
        primaryDomain: "rhythmic",
      });

      memory.recordPeak(0.6, {
        bar: 32,
        beat: 4,
        section: "climax",
        cause: "p2",
        primaryDomain: "harmonic",
      });

      expect(memory.getPeakHistory().length).toBe(2);

      memory.reset();

      expect(memory.getPeakHistory().length).toBe(0);
    });

    it("resets peak counter", () => {
      memory.recordPeak(0.5, {
        bar: 16,
        beat: 4,
        section: "dev",
        cause: "p1",
        primaryDomain: "rhythmic",
      });

      memory.reset();

      memory.recordPeak(0.5, {
        bar: 32,
        beat: 4,
        section: "dev",
        cause: "p2",
        primaryDomain: "rhythmic",
      });

      // Timestamp should start fresh
      const peaks = memory.getPeakHistory();
      expect(peaks[0].timestamp).toBe(0);
    });
  });

  describe("Schillinger compliance", () => {
    it("prevents identical climax repetition", () => {
      // First climax
      memory.recordPeak(0.65, {
        bar: 32,
        beat: 4,
        section: "climax",
        cause: "drill_gate_combo",
        primaryDomain: "rhythmic",
      });

      // Approaching similar climax
      accumulator.writeRhythmicTension(0.9, "second_climax_building");

      const isRepeating = memory.isRepeatingPeak(0.67);
      const strategy = memory.getAlternativeStrategy();

      expect(isRepeating).toBe(true);
      expect(strategy.expectedTotal).toBeLessThan(0.67);
    });

    it("maintains variety across long pieces", () => {
      // Simulate 64-bar piece
      const climaxes = [0.5, 0.65, 0.45, 0.7, 0.55, 0.6];

      climaxes.forEach((tension, i) => {
        memory.recordPeak(tension, {
          bar: (i + 1) * 10,
          beat: 4,
          section: i % 2 === 0 ? "development" : "climax",
          cause: `climax_${i + 1}`,
          primaryDomain: "rhythmic",
        });
      });

      // All peaks recorded
      expect(memory.getPeakHistory().length).toBe(6);

      // Try to repeat middle tension
      const strategy = memory.getAlternativeStrategy(0.55);

      // Should provide alternative
      expect(strategy.avoidingPeak).not.toBeNull();
      expect(strategy.expectedTotal).toBeLessThan(0.55);
    });

    it("creates musical interest through variation", () => {
      // Record similar peaks
      memory.recordPeak(0.5, {
        bar: 16,
        beat: 4,
        section: "development",
        cause: "first_peak",
        primaryDomain: "rhythmic",
      });

      memory.recordPeak(0.52, {
        bar: 32,
        beat: 3,
        section: "climax",
        cause: "second_peak",
        primaryDomain: "rhythmic",
      });

      memory.recordPeak(0.48, {
        bar: 48,
        beat: 4,
        section: "development",
        cause: "third_peak",
        primaryDomain: "rhythmic",
      });

      // Statistics show variety
      const stats = memory.getPeakStatistics();

      expect(stats.totalPeaks).toBe(3);
      expect(stats.tensionRange[0]).toBeLessThan(0.5);
      expect(stats.tensionRange[1]).toBeGreaterThan(0.5);
    });

    it("explains avoidance musically", () => {
      memory.recordPeak(0.38, {
        // 0.95 * 0.4 (weighted)
        bar: 40,
        beat: 3,
        section: "climax",
        cause: "maximum_intensity",
        primaryDomain: "rhythmic",
      });

      accumulator.writeRhythmicTension(0.95, "building_to_similar_peak");

      const explanation = memory.explainAvoidance();

      // Explanation should be musical and actionable
      expect(explanation).toMatch(/Avoiding|repetition|bar/);
      expect(explanation).toMatch(/Suggested|strategy/);
      expect(explanation).toMatch(/\d+\.\d+/); // Contains tension values
    });
  });
});

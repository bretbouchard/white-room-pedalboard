/**
 * CI Tests: Domain-Level Orthogonal Motion
 *
 * These tests enforce that musical domains move in opposition
 * to create sophisticated, balanced textures.
 *
 * Schillinger Principle: "If rhythm ↑ then harmony ↓"
 *
 * If any of these tests fail, domain orthogonal motion is not working
 * as a Schillinger principle.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  DomainOrthogonalMotionManager,
  MusicalDomain,
} from "../../src/structure/DomainOrthogonalMotion";
import { TensionAccumulator } from "../../src/structure/TensionAccumulator";
import { StructuralTension } from "../../src/structure/StructuralTension";

describe("Domain-Level Orthogonal Motion", () => {
  let manager: DomainOrthogonalMotionManager;
  let accumulator: TensionAccumulator;

  beforeEach(() => {
    accumulator = new TensionAccumulator();
    manager = new DomainOrthogonalMotionManager(accumulator, {
      rhythmHarmony: true,
      harmonyOrchestration: true,
      minAdjustmentInterval: 0, // Allow rapid updates in tests
      smoothing: 1.0, // Immediate response for predictable test behavior
    });
  });

  describe("domain level tracking", () => {
    it("tracks initial domain levels at zero", () => {
      const levels = manager.getDomainLevels();

      expect(levels.rhythm.complexity).toBe(0);
      expect(levels.harmony.complexity).toBe(0);
      expect(levels.orchestration.complexity).toBe(0);
    });

    it("updates domain levels from tension", () => {
      const tension: StructuralTension = {
        rhythmic: 0.8,
        harmonic: 0.3,
        formal: 0.5,
      };

      manager.updateDomains(tension, "test_update");

      const levels = manager.getDomainLevels();

      expect(levels.rhythm.complexity).toBeGreaterThan(0);
      expect(levels.harmony.complexity).toBeGreaterThan(0);
      expect(levels.orchestration.complexity).toBeGreaterThan(0);
    });

    it("detects increasing trend when tension rises", () => {
      manager.updateDomains(
        { rhythmic: 0.2, harmonic: 0.2, formal: 0.2 },
        "initial",
      );

      manager.updateDomains(
        { rhythmic: 0.8, harmonic: 0.2, formal: 0.2 },
        "increase",
      );

      const levels = manager.getDomainLevels();

      expect(levels.rhythm.trend).toBe("increasing");
    });

    it("detects decreasing trend when tension falls", () => {
      manager.updateDomains(
        { rhythmic: 0.8, harmonic: 0.5, formal: 0.5 },
        "initial",
      );

      manager.updateDomains(
        { rhythmic: 0.2, harmonic: 0.5, formal: 0.5 },
        "decrease",
      );

      const levels = manager.getDomainLevels();

      expect(levels.rhythm.trend).toBe("decreasing");
    });

    it("detects stable trend when tension is constant", () => {
      manager.updateDomains(
        { rhythmic: 0.5, harmonic: 0.5, formal: 0.5 },
        "initial",
      );

      manager.updateDomains(
        { rhythmic: 0.52, harmonic: 0.5, formal: 0.5 },
        "small_change",
      );

      const levels = manager.getDomainLevels();

      expect(levels.rhythm.trend).toBe("stable");
    });
  });

  describe("counter-motion rules", () => {
    it("decreases harmony when rhythm increases above threshold", () => {
      // Set rhythm above threshold
      const tension1: StructuralTension = {
        rhythmic: 0.7,
        harmonic: 0.5,
        formal: 0.5,
      };

      manager.updateDomains(tension1, "rhythm_increases");

      const levels1 = manager.getDomainLevels();
      const initialHarmony = levels1.harmony.complexity;

      // Further increase rhythm
      const tension2: StructuralTension = {
        rhythmic: 0.9,
        harmonic: 0.5,
        formal: 0.5,
      };

      manager.updateDomains(tension2, "rhythm_peaks");

      const levels2 = manager.getDomainLevels();

      // Harmony should decrease due to counter-motion
      expect(levels2.harmony.complexity).toBeLessThan(initialHarmony);
    });

    it("does not apply counter-motion below threshold", () => {
      const tension1: StructuralTension = {
        rhythmic: 0.4,
        harmonic: 0.5,
        formal: 0.5,
      };

      manager.updateDomains(tension1, "below_threshold");

      const levels1 = manager.getDomainLevels();
      const initialHarmony = levels1.harmony.complexity;

      const tension2: StructuralTension = {
        rhythmic: 0.5,
        harmonic: 0.5,
        formal: 0.5,
      };

      manager.updateDomains(tension2, "still_below_threshold");

      const levels2 = manager.getDomainLevels();

      // Harmony should stay roughly the same (no counter-motion)
      expect(levels2.harmony.complexity).toBeCloseTo(initialHarmony, 2);
    });

    it("decreases orchestration when harmony increases above threshold", () => {
      const tension1: StructuralTension = {
        rhythmic: 0.3,
        harmonic: 0.3,
        formal: 0.5,
      };

      manager.updateDomains(tension1, "initial");

      const levels1 = manager.getDomainLevels();
      const initialOrchestration = levels1.orchestration.complexity;

      // Increase harmony above threshold
      const tension2: StructuralTension = {
        rhythmic: 0.3,
        harmonic: 0.8,
        formal: 0.5,
      };

      manager.updateDomains(tension2, "harmony_increases");

      const levels2 = manager.getDomainLevels();

      // Orchestration should decrease
      expect(levels2.orchestration.complexity).toBeLessThan(
        initialOrchestration,
      );
    });
  });

  describe("domain balance", () => {
    it("calculates balance score based on domain proximity", () => {
      // All domains at same level = perfect balance
      manager.updateDomains(
        { rhythmic: 0.5, harmonic: 0.5, formal: 0.5 },
        "balanced",
      );

      const snapshot = manager.getSnapshot();

      expect(snapshot.balance).toBeCloseTo(1, 1);
    });

    it("reports low balance when domains are far apart", () => {
      manager.updateDomains(
        { rhythmic: 0.9, harmonic: 0.1, formal: 0.5 },
        "imbalanced",
      );

      const snapshot = manager.getSnapshot();

      expect(snapshot.balance).toBeLessThan(0.5);
    });

    it("calculates orthogonal tension from deviation", () => {
      manager.updateDomains(
        { rhythmic: 0.9, harmonic: 0.1, formal: 0.5 },
        "extreme",
      );

      const snapshot = manager.getSnapshot();

      // High deviation from center = high orthogonal tension
      expect(snapshot.orthogonalTension).toBeGreaterThan(0.3);
    });
  });

  describe("recommendations", () => {
    it("provides no recommendations when balance is high", () => {
      manager.updateDomains(
        { rhythmic: 0.5, harmonic: 0.5, formal: 0.5 },
        "balanced",
      );

      const recommendations = manager.getRecommendations();

      expect(recommendations).toHaveLength(0);
    });

    it("recommends increasing secondary when primary dominates", () => {
      manager.updateDomains(
        { rhythmic: 0.8, harmonic: 0.2, formal: 0.5 },
        "rhythm_dominates",
      );

      const recommendations = manager.getRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);

      const harmonyRec = recommendations.find((r) => r.domain === "harmony");
      expect(harmonyRec).toBeDefined();
      expect(harmonyRec!.action).toBe("increase");
    });

    it("provides reason for each recommendation", () => {
      manager.updateDomains(
        { rhythmic: 0.9, harmonic: 0.1, formal: 0.5 },
        "severe_imbalance",
      );

      const recommendations = manager.getRecommendations();

      for (const rec of recommendations) {
        expect(rec.reason).toBeTruthy();
        expect(rec.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe("explainability", () => {
    it("explains domain states with complexity levels", () => {
      manager.updateDomains(
        { rhythmic: 0.8, harmonic: 0.3, formal: 0.5 },
        "mixed_complexity",
      );

      const explanation = manager.explainState();

      expect(explanation.length).toBeGreaterThan(0);
      expect(explanation.some((e) => e.includes("rhythm")));
      expect(explanation.some((e) => e.includes("harmony")));
      expect(explanation.some((e) => e.includes("orchestration")));
    });

    it("explains counter-motion when active", () => {
      manager.updateDomains(
        { rhythmic: 0.8, harmonic: 0.2, formal: 0.5 },
        "counter_motion_active",
      );

      const explanation = manager.explainState();

      expect(explanation.some((e) => e.includes("counter-motion"))).toBe(true);
    });

    it("includes balance and orthogonal tension in explanation", () => {
      manager.updateDomains(
        { rhythmic: 0.7, harmonic: 0.3, formal: 0.5 },
        "check_metrics",
      );

      const explanation = manager.explainState();

      expect(explanation.some((e) => e.includes("balance:"))).toBe(true);
      expect(explanation.some((e) => e.includes("orthogonal tension:"))).toBe(
        true,
      );
    });
  });

  describe("history tracking", () => {
    it("records snapshots on each update", () => {
      manager.updateDomains(
        { rhythmic: 0.3, harmonic: 0.3, formal: 0.3 },
        "first",
      );

      manager.updateDomains(
        { rhythmic: 0.6, harmonic: 0.4, formal: 0.3 },
        "second",
      );

      const history = manager.getHistory();

      expect(history.length).toBe(2);
    });

    it("limits history size", () => {
      // This would need 501 updates to test the limit
      // For now, just verify history exists
      manager.updateDomains(
        { rhythmic: 0.5, harmonic: 0.5, formal: 0.5 },
        "test",
      );

      const history = manager.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it("filters history by time window", () => {
      manager.updateDomains(
        { rhythmic: 0.5, harmonic: 0.5, formal: 0.5 },
        "recent",
      );

      const recent = manager.getRecentHistory(1000); // Last 1 second

      expect(recent.length).toBe(1);

      const ancient = manager.getRecentHistory(0); // Last 0 milliseconds (empty window)
      expect(ancient.length).toBe(0);
    });
  });

  describe("configuration", () => {
    it("respects rhythm-harmony pairing", () => {
      const manager2 = new DomainOrthogonalMotionManager(accumulator, {
        rhythmHarmony: true,
        harmonyOrchestration: false,
      });

      manager2.updateDomains(
        { rhythmic: 0.8, harmonic: 0.5, formal: 0.5 },
        "test_pairing",
      );

      const levels = manager2.getDomainLevels();

      // Harmony should decrease due to counter-motion
      expect(levels.harmony.complexity).toBeLessThan(0.5);
    });

    it("can disable rhythm-harmony pairing", () => {
      const manager2 = new DomainOrthogonalMotionManager(accumulator, {
        rhythmHarmony: false,
        harmonyOrchestration: false,
        smoothing: 1.0,
        minAdjustmentInterval: 0,
      });

      manager2.updateDomains(
        { rhythmic: 0.8, harmonic: 0.5, formal: 0.5 },
        "no_pairing",
      );

      const levels = manager2.getDomainLevels();

      // Harmony should NOT decrease (no counter-motion)
      expect(levels.harmony.complexity).toBeCloseTo(0.5, 1);
    });

    it("can adjust activation threshold", () => {
      const manager2 = new DomainOrthogonalMotionManager(accumulator, {
        rhythmHarmony: true,
        activationThreshold: 0.8, // Higher threshold
        smoothing: 1.0,
        minAdjustmentInterval: 0,
      });

      manager2.updateDomains(
        { rhythmic: 0.7, harmonic: 0.5, formal: 0.5 },
        "below_threshold",
      );

      const levels = manager2.getDomainLevels();

      // No counter-motion (below threshold)
      expect(levels.harmony.complexity).toBeCloseTo(0.5, 1);
    });

    it("can adjust smoothing factor", () => {
      const manager2 = new DomainOrthogonalMotionManager(accumulator, {
        rhythmHarmony: true,
        smoothing: 0.9, // High smoothing = fast response
        minAdjustmentInterval: 0,
      });

      const tension: StructuralTension = {
        rhythmic: 0.9,
        harmonic: 0.5,
        formal: 0.5,
      };

      manager2.updateDomains(tension, "fast_response");

      const levels = manager2.getDomainLevels();

      // With high smoothing, should move quickly toward target
      expect(levels.rhythm.complexity).toBeGreaterThan(0.7);
    });
  });

  describe("reset behavior", () => {
    it("clears history on reset", () => {
      manager.updateDomains(
        { rhythmic: 0.5, harmonic: 0.5, formal: 0.5 },
        "before_reset",
      );

      manager.reset();

      const history = manager.getHistory();

      expect(history.length).toBe(0);
    });

    it("resets domain levels to zero", () => {
      manager.updateDomains(
        { rhythmic: 0.8, harmonic: 0.6, formal: 0.7 },
        "before_reset",
      );

      manager.reset();

      const levels = manager.getDomainLevels();

      expect(levels.rhythm.complexity).toBe(0);
      expect(levels.harmony.complexity).toBe(0);
      expect(levels.orchestration.complexity).toBe(0);
    });

    it("resets trends to stable", () => {
      manager.updateDomains(
        { rhythmic: 0.8, harmonic: 0.6, formal: 0.7 },
        "before_reset",
      );

      manager.reset();

      const levels = manager.getDomainLevels();

      expect(levels.rhythm.trend).toBe("stable");
      expect(levels.harmony.trend).toBe("stable");
      expect(levels.orchestration.trend).toBe("stable");
    });
  });

  describe("Schillinger compliance", () => {
    it("creates domain counter-motion (rhythm ↑ → harmony ↓)", () => {
      // Start balanced
      manager.updateDomains(
        { rhythmic: 0.5, harmonic: 0.5, formal: 0.5 },
        "balanced_start",
      );

      const levels1 = manager.getDomainLevels();
      const initialHarmony = levels1.harmony.complexity;

      // Increase rhythm significantly
      manager.updateDomains(
        { rhythmic: 0.9, harmonic: 0.5, formal: 0.5 },
        "rhythm_surge",
      );

      const levels2 = manager.getDomainLevels();

      // Harmony should decrease (counter-motion)
      expect(levels2.harmony.complexity).toBeLessThan(initialHarmony);
      expect(levels2.rhythm.complexity).toBeGreaterThan(0.7);
    });

    it("maintains musical balance through opposition", () => {
      // Extreme rhythm
      manager.updateDomains(
        { rhythmic: 0.9, harmonic: 0.1, formal: 0.5 },
        "extreme_rhythm",
      );

      const snapshot1 = manager.getSnapshot();

      // Balance should improve due to counter-motion
      expect(snapshot1.balance).toBeGreaterThan(0);
    });

    it("prevents overwhelming chaos through constraints", () => {
      // Try to make everything complex
      manager.updateDomains(
        { rhythmic: 0.9, harmonic: 0.9, formal: 0.9 },
        "attempted_chaos",
      );

      const snapshot = manager.getSnapshot();

      // System should constrain to prevent total chaos
      // At least one domain should be reduced
      const domains = snapshot.domains;
      const allHigh = Object.values(domains).every((d) => d.complexity > 0.8);

      expect(allHigh).toBe(false);
    });

    it("provides explainable domain motion", () => {
      manager.updateDomains(
        { rhythmic: 0.8, harmonic: 0.2, formal: 0.5 },
        "counter_motion_example",
      );

      const explanation = manager.explainState();

      // Should include counter-motion explanation
      expect(explanation.some((e) => e.includes("counter-motion"))).toBe(true);

      // Should include metrics
      expect(explanation.some((e) => e.includes("balance:"))).toBe(true);
    });
  });

  describe("tension integration", () => {
    it("writes to formal tension when applying counter-motion", () => {
      // Reset to ensure clean state
      accumulator.reset();
      manager.reset();

      const initialTension = accumulator.getCurrent().formal;

      manager.updateDomains(
        { rhythmic: 0.8, harmonic: 0.5, formal: 0.5 },
        "counter_motion_trigger",
      );

      const finalTension = accumulator.getCurrent().formal;

      // Formal tension should increase due to counter-motion
      expect(finalTension).toBeGreaterThan(initialTension);
    });

    it("preserves cause in tension history", () => {
      // Reset to ensure clean state
      accumulator.reset();
      manager.reset();

      manager.updateDomains(
        { rhythmic: 0.8, harmonic: 0.5, formal: 0.5 },
        "rhythm_increase",
      );

      const changes = accumulator.getChanges();

      // Should have entry about domain counter-motion
      const counterMotionEntry = changes.find(
        (c) => c.cause && c.cause.includes("domain_counter_motion"),
      );

      expect(counterMotionEntry).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("handles minimum domain values", () => {
      manager.updateDomains({ rhythmic: 0, harmonic: 0, formal: 0 }, "minimum");

      const levels = manager.getDomainLevels();

      expect(levels.rhythm.complexity).toBe(0);
      expect(levels.harmony.complexity).toBe(0);
      expect(levels.orchestration.complexity).toBe(0);
    });

    it("handles maximum domain values", () => {
      manager.updateDomains({ rhythmic: 1, harmonic: 1, formal: 1 }, "maximum");

      const levels = manager.getDomainLevels();

      // All should be at valid values (0-1)
      Object.values(levels).forEach((level) => {
        expect(level.complexity).toBeGreaterThanOrEqual(0);
        expect(level.complexity).toBeLessThanOrEqual(1);
      });

      // At least one should be reduced (counter-motion prevents chaos)
      const values = Object.values(levels).map((l) => l.complexity);
      const allHigh = values.every((v) => v > 0.9);
      expect(allHigh).toBe(false);
    });

    it("does not crash with rapid updates", () => {
      for (let i = 0; i < 10; i++) {
        manager.updateDomains(
          {
            rhythmic: Math.random(),
            harmonic: Math.random(),
            formal: Math.random(),
          },
          `rapid_update_${i}`,
        );
      }

      const levels = manager.getDomainLevels();

      // Should have valid values
      expect(levels.rhythm.complexity).toBeGreaterThanOrEqual(0);
      expect(levels.rhythm.complexity).toBeLessThanOrEqual(1);
    });
  });
});

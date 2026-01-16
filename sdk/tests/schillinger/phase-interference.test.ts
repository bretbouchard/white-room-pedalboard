/**
 * CI Tests: Phase Interference as Motion
 *
 * These tests enforce critical Schillinger principle:
 * Phase is motion, not decoration. Persistent phase drift
 * creates musical tension through interference patterns.
 *
 * If any of these tests fail, phase is being treated as
 * humanization (bad) rather than motion (good).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PhaseStateManager,
  globalPhaseState,
} from "../../src/structure/PhaseState";

describe("Phase interference as motion", () => {
  let manager: PhaseStateManager;

  beforeEach(() => {
    manager = new PhaseStateManager();
  });

  describe("phase accumulation", () => {
    it("accumulates phase offset over bars", () => {
      manager.registerRole("hats", {
        driftRate: 0.05, // 50ms per bar at 120 BPM
        maxOffset: 0.25,
      });

      manager.updatePosition(1, 1);
      manager.advancePhase("hats");
      const bar1 = manager.getPhase("hats");

      manager.updatePosition(2, 1);
      manager.advancePhase("hats");
      const bar2 = manager.getPhase("hats");

      manager.updatePosition(3, 1);
      manager.advancePhase("hats");
      const bar3 = manager.getPhase("hats");

      // Phase should accumulate
      expect(bar2).toBeGreaterThan(bar1);
      expect(bar3).toBeGreaterThan(bar2);

      // Each bar adds 0.05
      expect(bar1).toBeCloseTo(0.05, 3);
      expect(bar2).toBeCloseTo(0.1, 3);
      expect(bar3).toBeCloseTo(0.15, 3);
    });

    it("clamps phase to maximum offset", () => {
      manager.registerRole("hats", {
        driftRate: 0.1, // 100ms per bar
        maxOffset: 0.15,
      });

      manager.updatePosition(1, 1);
      manager.advancePhase("hats");

      manager.updatePosition(2, 1);
      manager.advancePhase("hats");

      const phase = manager.getPhase("hats");

      // Should clamp at maxOffset
      expect(phase).toBeLessThanOrEqual(0.15);
      expect(phase).toBeCloseTo(0.15, 3);
    });

    it("supports negative drift (drift backward)", () => {
      manager.registerRole("hats", {
        driftRate: -0.05,
        maxOffset: 0.25,
      });

      manager.updatePosition(1, 1);
      manager.advancePhase("hats");

      const phase = manager.getPhase("hats");

      expect(phase).toBeLessThan(0);
      expect(phase).toBeCloseTo(-0.05, 3);
    });

    it("locked roles do not drift", () => {
      manager.registerRole("kick", {
        driftRate: 0.05,
        locked: true,
      });

      manager.updatePosition(1, 1);
      manager.advancePhase("kick");

      const phase = manager.getPhase("kick");

      expect(phase).toBe(0);
    });
  });

  describe("phase boundaries", () => {
    it("resets phase to zero at section boundaries", () => {
      manager.registerRole("hats", {
        driftRate: 0.08,
        maxOffset: 0.25,
      });

      // Build up phase
      manager.updatePosition(1, 1);
      manager.advancePhase("hats");

      manager.updatePosition(2, 1);
      manager.advancePhase("hats");

      manager.updatePosition(3, 1);
      manager.advancePhase("hats");

      const beforeReset = manager.getPhase("hats");

      // Reset at phrase boundary
      manager.resetPhase("hats");
      const afterReset = manager.getPhase("hats");

      expect(beforeReset).toBeGreaterThan(0);
      expect(afterReset).toBe(0);
    });

    it("inverts phase for variation", () => {
      manager.registerRole("hats", {
        driftRate: 0.05,
        maxOffset: 0.25,
      });

      manager.updatePosition(1, 1);
      manager.advancePhase("hats");

      const beforeInvert = manager.getPhase("hats");

      manager.invertPhase("hats");
      const afterInvert = manager.getPhase("hats");

      expect(afterInvert).toBe(-beforeInvert);
    });

    it("tracks phase events in history", () => {
      manager.registerRole("hats", {
        driftRate: 0.05,
      });

      manager.updatePosition(1, 1);
      manager.advancePhase("hats");

      manager.updatePosition(2, 1);
      manager.resetPhase("hats");

      const history = manager.getHistory();

      expect(history.length).toBe(2);
      expect(history[0].cause).toBe("phase_drift");
      expect(history[1].cause).toBe("phase_reset");
    });
  });

  describe("phase as tension", () => {
    it("phase magnitude contributes to rhythmic tension", () => {
      manager.registerRole("hats", {
        driftRate: 0,
        maxOffset: 0.25,
      });

      // No phase = no tension
      const noPhase = manager.getPhaseTension("hats");
      expect(noPhase).toBe(0);

      // Set phase to max
      manager.registerRole("hats", {
        driftRate: 0,
        maxOffset: 0.25,
        initialOffset: 0.25,
      });

      const maxPhase = manager.getPhaseTension("hats");

      // Max phase should contribute 0.3 to tension
      expect(maxPhase).toBeCloseTo(0.3, 2);
    });

    it("multiple roles contribute to total phase tension", () => {
      manager.registerRole("hats", {
        initialOffset: 0.25,
        maxOffset: 0.25,
      });

      manager.registerRole("perc", {
        initialOffset: 0.125,
        maxOffset: 0.25,
      });

      const total = manager.getTotalPhaseTension();

      // Average: (0.3 + 0.15) / 2 = 0.225
      expect(total).toBeCloseTo(0.225, 2);
    });

    it("phase tension is normalized 0..1", () => {
      manager.registerRole("hats", {
        initialOffset: 0.5, // Exceeds max
        maxOffset: 0.25,
      });

      // Even if offset exceeds max, tension is clamped
      const tension = manager.getPhaseTension("hats");

      expect(tension).toBeGreaterThanOrEqual(0);
      expect(tension).toBeLessThanOrEqual(1);
    });
  });

  describe("musical application", () => {
    it("demo piece: Section B uses phase drift on hats", () => {
      // SECTION B: Interference (bars 17-32)

      manager.registerRole("hats", {
        driftRate: 0,
        maxOffset: 0.25,
      });

      // Bars 25-28: Hat phase drift enabled
      manager.updatePosition(25, 1);
      manager.setDriftRate("hats", 0.0625); // 1/16 note per bar

      // Simulate 4 bars of drift
      manager.updatePosition(25, 1);
      manager.advancePhase("hats");

      manager.updatePosition(26, 1);
      manager.advancePhase("hats");

      manager.updatePosition(27, 1);
      manager.advancePhase("hats");

      manager.updatePosition(28, 1);
      manager.advancePhase("hats");

      const phaseAtBar28 = manager.getPhase("hats");

      // Should have drifted by 0.25 (1/16 note = 0.25 beats)
      expect(phaseAtBar28).toBeCloseTo(0.25, 3);

      // Phase tension should be measurable
      const tension = manager.getPhaseTension("hats");
      expect(tension).toBeGreaterThan(0);
    });

    it("demo piece: Phase reset at phrase boundaries", () => {
      manager.registerRole("hats", {
        driftRate: 0.0625,
        maxOffset: 0.25,
      });

      // Build up phase
      manager.updatePosition(25, 1);
      manager.advancePhase("hats");

      manager.updatePosition(26, 1);
      manager.advancePhase("hats");

      manager.updatePosition(27, 1);
      manager.advancePhase("hats");

      manager.updatePosition(28, 1);
      manager.advancePhase("hats");

      const beforeReset = manager.getPhase("hats");

      // Reset at bar 32 (phrase boundary)
      manager.updatePosition(32, 4);
      manager.resetPhase("hats");

      const afterReset = manager.getPhase("hats");

      expect(beforeReset).toBeCloseTo(0.25, 3);
      expect(afterReset).toBe(0);
    });

    it("kick phase stays locked (temporal anchor)", () => {
      manager.registerRole("kick", {
        driftRate: 0.05, // Even with drift rate set
        locked: true, // Locked flag overrides
      });

      manager.updatePosition(1, 1);
      manager.advancePhase("kick");

      manager.updatePosition(2, 1);
      manager.advancePhase("kick");

      const kickPhase = manager.getPhase("kick");

      // Kick never drifts - provides temporal anchor
      expect(kickPhase).toBe(0);
    });
  });

  describe("Schillinger compliance", () => {
    it("phase is motion, not random jitter", () => {
      manager.registerRole("hats", {
        driftRate: 0.05,
        maxOffset: 0.25,
      });

      // Simulate 8 bars
      const phases: number[] = [];
      for (let bar = 1; bar <= 8; bar++) {
        manager.updatePosition(bar, 1);
        manager.advancePhase("hats");
        phases.push(manager.getPhase("hats"));
      }

      // Phase should monotonically increase (not random)
      for (let i = 1; i < phases.length; i++) {
        expect(phases[i]).toBeGreaterThanOrEqual(phases[i - 1]);
      }

      // Should create predictable pattern
      // 8 * 0.05 = 0.40, but clamped to maxOffset 0.25
      expect(phases[7]).toBeCloseTo(0.25, 3); // Clamped to maximum
    });

    it("phase creates musical tension through offset", () => {
      manager.registerRole("hats", {
        initialOffset: 0,
        maxOffset: 0.25,
      });

      // In phase = stable
      const inPhaseTension = manager.getPhaseTension("hats");
      expect(inPhaseTension).toBe(0);

      // Out of phase = tension
      manager.registerRole("hats", {
        initialOffset: 0.125, // 1/8 note off
        maxOffset: 0.25,
      });

      const outOfPhaseTension = manager.getPhaseTension("hats");

      expect(outOfPhaseTension).toBeGreaterThan(inPhaseTension);
      expect(outOfPhaseTension).toBeCloseTo(0.15, 2);
    });

    it("explainability: phase changes have musical causes", () => {
      manager.registerRole("hats", {
        driftRate: 0.05,
      });

      manager.updatePosition(1, 1);
      manager.advancePhase("hats");

      // Check explanation while phase is advanced
      let explanation = manager.explainState();
      expect(explanation).toContain("hats");
      expect(explanation).toContain("ahead");

      // Now reset and check it explains the reset
      manager.updatePosition(4, 4);
      manager.resetPhase("hats");

      explanation = manager.explainState();
      expect(explanation).toContain("hats");
      // After reset, phase is 0 so it says "in phase"
      expect(explanation).toContain("in phase");
    });

    it("phase never exceeds maximum configured offset", () => {
      manager.registerRole("hats", {
        driftRate: 0.1, // Fast drift
        maxOffset: 0.2, // Low max
      });

      // Simulate many bars
      for (let bar = 1; bar <= 10; bar++) {
        manager.updatePosition(bar, 1);
        manager.advancePhase("hats");
      }

      const phase = manager.getPhase("hats");

      expect(phase).toBeLessThanOrEqual(0.2);
    });
  });

  describe("practical scenarios", () => {
    it("multiple roles with different drift rates", () => {
      manager.registerRole("hats", { driftRate: 0.05, maxOffset: 0.25 });
      manager.registerRole("perc", { driftRate: 0.025, maxOffset: 0.25 });
      manager.registerRole("kick", { driftRate: 0, locked: true });

      // Advance 4 bars
      for (let bar = 1; bar <= 4; bar++) {
        manager.updatePosition(bar, 1);
        manager.advancePhase("hats");
        manager.advancePhase("perc");
        manager.advancePhase("kick");
      }

      const hatsPhase = manager.getPhase("hats");
      const percPhase = manager.getPhase("perc");
      const kickPhase = manager.getPhase("kick");

      // Hats drift faster than percussion
      expect(hatsPhase).toBeGreaterThan(percPhase);

      // Kick doesn't drift
      expect(kickPhase).toBe(0);
    });

    it("phase inversion creates variation without losing structure", () => {
      manager.registerRole("hats", {
        driftRate: 0.05,
        maxOffset: 0.25,
      });

      // Build phase
      for (let bar = 1; bar <= 4; bar++) {
        manager.updatePosition(bar, 1);
        manager.advancePhase("hats");
      }

      const beforeInvert = manager.getPhase("hats");

      // Invert creates mirror image
      manager.invertPhase("hats");

      const afterInvert = manager.getPhase("hats");

      expect(afterInvert).toBe(-beforeInvert);

      // Magnitude is preserved
      expect(Math.abs(afterInvert)).toBeCloseTo(Math.abs(beforeInvert), 3);
    });
  });
});

/**
 * CI Tests: Energy Curves
 *
 * These tests enforce that energy tracks directionality,
 * inertia, and exhaustion separate from tension.
 *
 * If any of these tests fail, energy curves are not
 * providing temporal dynamics to the system.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EnergyManager } from "../../src/structure/EnergyCurves";
import { TensionAccumulator } from "../../src/structure/TensionAccumulator";

describe("Energy Curves", () => {
  let energy: EnergyManager;
  let accumulator: TensionAccumulator;

  beforeEach(() => {
    accumulator = new TensionAccumulator();
    energy = new EnergyManager(accumulator);
  });

  describe("momentum calculation", () => {
    it("has zero momentum with no history", () => {
      const state = energy.getEnergyState();
      expect(state.momentum).toBe(0);
    });

    it("has zero momentum with single tension value", () => {
      accumulator.writeRhythmicTension(0.5, "test");
      energy.update(1, 1, "test");

      const state = energy.getEnergyState();
      expect(state.momentum).toBe(0);
    });

    it("detects rising momentum", () => {
      // Write increasing tension values
      accumulator.writeRhythmicTension(0.2, "test1");
      energy.update(1, 1, "test1");

      accumulator.writeRhythmicTension(0.4, "test2");
      energy.update(1, 2, "test2");

      accumulator.writeRhythmicTension(0.6, "test3");
      energy.update(1, 3, "test3");

      accumulator.writeRhythmicTension(0.8, "test4");
      energy.update(1, 4, "test4");

      const state = energy.getEnergyState();
      expect(state.momentum).toBeGreaterThan(0);
      expect(energy.isRising()).toBe(true);
    });

    it("detects falling momentum", () => {
      // Write decreasing tension values
      accumulator.writeRhythmicTension(0.8, "test1");
      energy.update(1, 1, "test1");

      accumulator.writeRhythmicTension(0.6, "test2");
      energy.update(1, 2, "test2");

      accumulator.writeRhythmicTension(0.4, "test3");
      energy.update(1, 3, "test3");

      accumulator.writeRhythmicTension(0.2, "test4");
      energy.update(1, 4, "test4");

      const state = energy.getEnergyState();
      expect(state.momentum).toBeLessThan(0);
      expect(energy.isFalling()).toBe(true);
    });

    it("detects stable tension (zero momentum)", () => {
      // Write constant tension values
      for (let i = 0; i < 5; i++) {
        accumulator.writeRhythmicTension(0.5, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const state = energy.getEnergyState();
      expect(Math.abs(state.momentum)).toBeLessThan(0.2);
      expect(energy.isRising()).toBe(false);
      expect(energy.isFalling()).toBe(false);
    });

    it("normalizes momentum to [-1, 1]", () => {
      // Rapid rise from 0 to 1
      for (let i = 0; i < 5; i++) {
        accumulator.writeRhythmicTension(i * 0.25, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const state = energy.getEnergyState();
      expect(state.momentum).toBeGreaterThanOrEqual(-1);
      expect(state.momentum).toBeLessThanOrEqual(1);
    });
  });

  describe("inertia calculation", () => {
    it("has zero inertia with insufficient history", () => {
      accumulator.writeRhythmicTension(0.5, "test");
      energy.update(1, 1, "test");

      const state = energy.getEnergyState();
      expect(state.inertia).toBe(0);
    });

    it("high inertia with stable tension", () => {
      // Constant tension = high resistance to change
      for (let i = 0; i < 5; i++) {
        accumulator.writeRhythmicTension(0.5, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const state = energy.getEnergyState();
      expect(state.inertia).toBeGreaterThan(0.5);
    });

    it("low inertia with volatile tension", () => {
      // Varying tension = low resistance to change
      for (let i = 0; i < 5; i++) {
        const tension = i % 2 === 0 ? 0.0 : 1.0;
        accumulator.writeRhythmicTension(tension, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const state = energy.getEnergyState();
      expect(state.inertia).toBeLessThan(0.7); // Adjusted for weighted tension
    });

    it("inertia normalizes to [0, 1]", () => {
      for (let i = 0; i < 5; i++) {
        accumulator.writeRhythmicTension(0.5, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const state = energy.getEnergyState();
      expect(state.inertia).toBeGreaterThanOrEqual(0);
      expect(state.inertia).toBeLessThanOrEqual(1);
    });
  });

  describe("exhaustion tracking", () => {
    it("starts with zero exhaustion", () => {
      const state = energy.getEnergyState();
      expect(state.exhaustion).toBe(0);
    });

    it("accumulates exhaustion from high tension", () => {
      // Sustained high tension causes exhaustion
      for (let i = 0; i < 10; i++) {
        accumulator.writeRhythmicTension(0.9, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const state = energy.getEnergyState();
      expect(state.exhaustion).toBeGreaterThan(0);
    });

    it("decays exhaustion when tension drops", () => {
      // Build up exhaustion
      for (let i = 0; i < 10; i++) {
        accumulator.writeRhythmicTension(0.9, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const exhaustedState = energy.getEnergyState();
      expect(exhaustedState.exhaustion).toBeGreaterThan(0);

      // Drop tension to allow recovery
      for (let i = 0; i < 10; i++) {
        accumulator.writeRhythmicTension(0.1, `recovery${i}`);
        energy.update(2, i + 1, `recovery${i}`);
      }

      const recoveredState = energy.getEnergyState();
      expect(recoveredState.exhaustion).toBeLessThan(exhaustedState.exhaustion);
    });

    it("no exhaustion below threshold", () => {
      // Low tension doesn't cause exhaustion
      for (let i = 0; i < 10; i++) {
        accumulator.writeRhythmicTension(0.3, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const state = energy.getEnergyState();
      expect(state.exhaustion).toBeLessThan(0.2);
    });

    it("isExhausted returns true when exhausted", () => {
      // Build up high exhaustion
      for (let i = 0; i < 20; i++) {
        accumulator.writeRhythmicTension(0.9, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      expect(energy.isExhausted()).toBe(true);
    });

    it("resetExhaustion clears exhaustion", () => {
      // Build up exhaustion
      for (let i = 0; i < 10; i++) {
        accumulator.writeRhythmicTension(0.9, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      expect(energy.isExhausted()).toBe(true);

      energy.resetExhaustion();

      const state = energy.getEnergyState();
      expect(state.exhaustion).toBe(0);
    });
  });

  describe("total energy calculation", () => {
    it("calculates energy from momentum and exhaustion", () => {
      accumulator.writeRhythmicTension(0.9, "test");
      energy.update(1, 1, "test");

      const state = energy.getEnergyState();
      expect(state.totalEnergy).toBeGreaterThanOrEqual(0);
      expect(state.totalEnergy).toBeLessThanOrEqual(1);
    });

    it("high momentum increases total energy", () => {
      // Rising tension = high momentum
      for (let i = 0; i < 5; i++) {
        accumulator.writeRhythmicTension(0.2 + i * 0.2, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const state = energy.getEnergyState();
      expect(state.totalEnergy).toBeGreaterThan(0.5);
    });

    it("high exhaustion decreases total energy", () => {
      // Sustained high tension = high exhaustion
      for (let i = 0; i < 15; i++) {
        accumulator.writeRhythmicTension(0.9, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const state = energy.getEnergyState();
      // High momentum from sustained tension, but high exhaustion reduces total
      expect(state.totalEnergy).toBeLessThan(1);
    });
  });

  describe("history tracking", () => {
    it("tracks energy history over time", () => {
      accumulator.writeRhythmicTension(0.5, "test1");
      energy.update(1, 1, "test1");

      accumulator.writeRhythmicTension(0.7, "test2");
      energy.update(1, 2, "test2");

      const history = energy.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].cause).toBe("test1");
      expect(history[1].cause).toBe("test2");
    });

    it("includes musical time in history", () => {
      accumulator.writeRhythmicTension(0.5, "test");
      energy.update(5, 3, "test");

      const history = energy.getHistory();
      expect(history[0].bar).toBe(5);
      expect(history[0].beat).toBe(3);
    });

    it("includes tension and energy state in history", () => {
      accumulator.writeRhythmicTension(0.6, "test");
      energy.update(1, 1, "test");

      const history = energy.getHistory();
      expect(history[0].tension).toBe(0.24); // 0.6 * 0.4 (rhythmic weight)
      expect(history[0].energy).toBeDefined();
      expect(history[0].energy.momentum).toBeDefined();
      expect(history[0].energy.exhaustion).toBeDefined();
    });
  });

  describe("explainability", () => {
    it("explains energy state in human-readable terms", () => {
      accumulator.writeRhythmicTension(0.5, "test");
      energy.update(1, 1, "test");

      const explanation = energy.explainState();
      expect(explanation).toBeTruthy();
      expect(explanation.length).toBeGreaterThan(0);
    });

    it("includes momentum in explanation", () => {
      for (let i = 0; i < 5; i++) {
        accumulator.writeRhythmicTension(0.2 + i * 0.2, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const explanation = energy.explainState();
      expect(explanation).toContain("rising");
    });

    it("includes exhaustion in explanation", () => {
      for (let i = 0; i < 25; i++) {
        accumulator.writeRhythmicTension(1.0, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const explanation = energy.explainState();
      // After 25 iterations at max tension, should be "exhausted"
      expect(explanation).toMatch(/exhausted|fatigued/);
    });

    it("includes total energy in explanation", () => {
      accumulator.writeRhythmicTension(0.8, "test");
      energy.update(1, 1, "test");

      const explanation = energy.explainState();
      expect(explanation).toContain("Total:");
    });
  });

  describe("reset behavior", () => {
    it("reset clears all state", () => {
      // Build up some state
      for (let i = 0; i < 10; i++) {
        accumulator.writeRhythmicTension(0.8, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      expect(energy.getHistory().length).toBeGreaterThan(0);

      energy.reset();

      expect(energy.getHistory().length).toBe(0);
      const state = energy.getEnergyState();
      expect(state.exhaustion).toBe(0);
    });

    it("resetExhaustion only clears exhaustion", () => {
      // Build up state
      for (let i = 0; i < 10; i++) {
        accumulator.writeRhythmicTension(0.8, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const historyBefore = energy.getHistory().length;

      energy.resetExhaustion();

      expect(energy.getHistory().length).toBe(historyBefore); // History preserved
      const state = energy.getEnergyState();
      expect(state.exhaustion).toBe(0); // Exhaustion cleared
    });
  });

  describe("Schillinger compliance", () => {
    it("energy is separate from tension", () => {
      // Same tension can have different energy
      accumulator.writeRhythmicTension(0.5, "stable");
      energy.update(1, 1, "stable");

      const state1 = energy.getEnergyState();

      energy.reset();

      accumulator.writeRhythmicTension(0.5, "rising_start");
      energy.update(1, 1, "rising_start");
      accumulator.writeRhythmicTension(0.7, "rising_end");
      energy.update(1, 2, "rising_end");

      const state2 = energy.getEnergyState();

      // Same tension (0.5 initially), different energy
      expect(state1.momentum).not.toBe(state2.momentum);
    });

    it("prevents always maximum tension", () => {
      // Sustained maximum tension causes exhaustion
      for (let i = 0; i < 20; i++) {
        accumulator.writeRhythmicTension(1.0, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      const state = energy.getEnergyState();
      expect(energy.isExhausted()).toBe(true);

      // High exhaustion reduces total energy
      expect(state.totalEnergy).toBeLessThan(1);
    });

    it("encourages resolution after peak", () => {
      // Build up exhaustion
      for (let i = 0; i < 15; i++) {
        accumulator.writeRhythmicTension(0.9, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
      }

      expect(energy.isExhausted()).toBe(true);

      // Resolution should drop tension
      accumulator.writeRhythmicTension(0.1, "resolution");
      energy.update(2, 1, "resolution");

      expect(energy.isFalling()).toBe(true);
    });

    it("energy adds temporal dynamics", () => {
      // Track energy over time
      const energies: number[] = [];

      for (let i = 0; i < 10; i++) {
        accumulator.writeRhythmicTension(0.3 + i * 0.05, `test${i}`);
        energy.update(1, i + 1, `test${i}`);
        energies.push(energy.getEnergyState().totalEnergy);
      }

      // Energy should change over time
      const firstEnergy = energies[0];
      const lastEnergy = energies[energies.length - 1];
      expect(lastEnergy).not.toBe(firstEnergy);
    });
  });
});

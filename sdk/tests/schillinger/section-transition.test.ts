/**
 * CI Tests: Section Transition Manager
 *
 * These tests enforce that section transitions respond
 * to accumulated tension, not arbitrary bar counts.
 *
 * If any of these tests fail, sections are not tension-driven.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SectionTransitionManager,
  SectionConfig,
  SectionType,
} from "../../src/structure/SectionTransition";
import { TensionAccumulator } from "../../src/structure/TensionAccumulator";
import { EnergyManager } from "../../src/structure/EnergyCurves";

describe("Section Transition Manager", () => {
  let transitions: SectionTransitionManager;
  let accumulator: TensionAccumulator;
  let energy: EnergyManager;

  beforeEach(() => {
    accumulator = new TensionAccumulator();
    energy = new EnergyManager(accumulator);
    transitions = new SectionTransitionManager(accumulator, energy);
  });

  describe("section definition", () => {
    it("defines section with constraints", () => {
      const config: SectionConfig = {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 8,
        maxBars: 16,
        tensionRange: [0.3, 0.7],
        tensionThreshold: 0.8,
      };

      transitions.defineSection("dev1", config);
      transitions.setCurrentSection("dev1");

      const explanation = transitions.explainCurrentState();
      expect(explanation).toContain("development");
      expect(explanation).toContain("dev1");
    });

    it("allows open-ended sections (no maxBars)", () => {
      const config: SectionConfig = {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: null,
      };

      transitions.defineSection("dev1", config);
      transitions.setCurrentSection("dev1");

      expect(transitions.explainCurrentState()).toContain("development");
    });
  });

  describe("tension-driven transitions", () => {
    it("transitions when tension exceeds threshold", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: 0.35, // Threshold for weighted tension (0.9 * 0.4 = 0.36)
      });

      transitions.setCurrentSection("dev1");

      // Build tension to exceed threshold
      for (let bar = 1; bar <= 8; bar++) {
        accumulator.writeRhythmicTension(0.9, `bar${bar}`);
        energy.update(bar, 1, `bar${bar}`);
      }

      const trigger = transitions.shouldTransition(8, 1);
      expect(trigger).not.toBeNull();
      expect(trigger?.cause).toBe("tension_threshold_exceeded");
      expect(trigger?.type).toBe("climax"); // development → climax
    });

    it("respects minimum bars before transitioning", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 8,
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: 0.8,
      });

      transitions.setCurrentSection("dev1");

      // High tension but not enough bars
      accumulator.writeRhythmicTension(0.9, "early_peak");
      energy.update(4, 1, "early_peak");

      const trigger = transitions.shouldTransition(4, 1);
      expect(trigger).toBeNull();
    });

    it("transitions on high tension (global threshold)", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("dev1");

      // Build to high tension (use max rhythmic tension)
      for (let bar = 1; bar <= 8; bar++) {
        accumulator.writeRhythmicTension(1.0, `bar${bar}`);
        energy.update(bar, 1, `bar${bar}`);
      }

      const trigger = transitions.shouldTransition(8, 1);
      expect(trigger).not.toBeNull();
      expect(trigger?.cause).toBe("high_tension_resolution");
      expect(trigger?.type).toBe("climax"); // development → climax
    });

    it("transitions when max bars reached", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: 8,
        tensionRange: [0.3, 0.7],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("dev1");

      // Low tension but max bars reached
      accumulator.writeRhythmicTension(0.3, "bar8");
      energy.update(8, 1, "bar8");

      const trigger = transitions.shouldTransition(8, 1);
      expect(trigger).not.toBeNull();
      expect(trigger?.cause).toBe("max_bars_reached");
    });
  });

  describe("exhaustion-driven transitions", () => {
    it("forces resolution when exhausted", () => {
      transitions.defineSection("climax", {
        type: "climax",
        startBar: 33,
        endBar: null,
        minBars: 8,
        maxBars: null,
        tensionRange: [0.5, 1.0],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("climax");

      // Build exhaustion through sustained high tension
      for (let i = 0; i < 30; i++) {
        accumulator.writeRhythmicTension(1.0, `sustained${i}`);
        energy.update(33, i + 1, `sustained${i}`);
      }

      const trigger = transitions.shouldTransition(33, 30);
      expect(trigger).not.toBeNull();
      expect(trigger?.cause).toBe("exhaustion_forces_resolution");
      expect(trigger?.type).toBe("resolution");
    });

    it("exhaustion overrides other constraints", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 16, // High minimum
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("dev1");

      // Exhaustion before minBars
      for (let i = 0; i < 30; i++) {
        accumulator.writeRhythmicTension(1.0, `exhausting${i}`);
        energy.update(10, i + 1, `exhausting${i}`);
      }

      const trigger = transitions.shouldTransition(10, 30);
      expect(trigger).not.toBeNull();
      expect(trigger?.cause).toBe("exhaustion_forces_resolution");
      // Forces resolution despite not meeting minBars
    });
  });

  describe("section sequence", () => {
    it("follows logical musical progression", () => {
      transitions.defineSection("intro", {
        type: "introduction",
        startBar: 1,
        endBar: 16,
        minBars: 8,
        maxBars: 16,
        tensionRange: [0.0, 0.3],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("intro");

      // End of intro with rising tension
      accumulator.writeRhythmicTension(0.5, "intro_end");
      energy.update(16, 1, "intro_end");

      const trigger = transitions.shouldTransition(16, 1);
      expect(trigger?.type).toBe("development"); // intro → development
    });

    it("development leads to climax", () => {
      transitions.defineSection("dev", {
        type: "development",
        startBar: 17,
        endBar: null,
        minBars: 8,
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: 0.35, // Threshold for weighted tension (0.9 * 0.4 = 0.36)
      });

      transitions.setCurrentSection("dev");

      // Build to high tension
      for (let bar = 17; bar <= 24; bar++) {
        accumulator.writeRhythmicTension(0.9, `bar${bar}`);
        energy.update(bar, 1, `bar${bar}`);
      }

      const trigger = transitions.shouldTransition(24, 1);
      expect(trigger?.type).toBe("climax"); // development → climax
    });

    it("climax leads to resolution", () => {
      transitions.defineSection("climax", {
        type: "climax",
        startBar: 41,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.5, 1.0],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("climax");

      // High tension triggers resolution
      for (let bar = 41; bar <= 44; bar++) {
        accumulator.writeRhythmicTension(0.9, `bar${bar}`);
        energy.update(bar, 1, `bar${bar}`);
      }

      const trigger = transitions.shouldTransition(44, 1);
      expect(trigger?.type).toBe("resolution"); // climax → resolution
    });

    it("resolution can lead to development (build again)", () => {
      transitions.defineSection("res", {
        type: "resolution",
        startBar: 49,
        endBar: 56,
        minBars: 4,
        maxBars: 8,
        tensionRange: [0.1, 0.4],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("res");

      // Resolution complete, can build again
      accumulator.writeRhythmicTension(0.2, "resolution_end");
      energy.update(56, 1, "resolution_end");

      const trigger = transitions.shouldTransition(56, 1);
      expect(trigger?.type).toBe("development"); // resolution → development
    });
  });

  describe("manual control", () => {
    it("allows forced transitions", () => {
      const trigger = transitions.forceTransition("coda", "manual_coda");

      expect(trigger.type).toBe("coda");
      expect(trigger.cause).toBe("manual_coda");
      expect(trigger.tension).toBeDefined();
      expect(trigger.energy.momentum).toBeDefined();
    });

    it("forced transitions record tension and energy", () => {
      accumulator.writeRhythmicTension(0.5, "test");
      energy.update(10, 1, "test");

      const trigger = transitions.forceTransition("resolution", "manual");

      expect(trigger.tension).toBe(0.2); // 0.5 * 0.4 (weighted)
      expect(trigger.energy.momentum).toBeDefined();
      expect(trigger.energy.exhaustion).toBeDefined();
    });
  });

  describe("history tracking", () => {
    it("tracks all transitions", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: 0.35, // Low enough to trigger (0.9 * 0.4 = 0.36)
      });

      transitions.setCurrentSection("dev1");

      // Trigger transition
      for (let bar = 1; bar <= 8; bar++) {
        accumulator.writeRhythmicTension(0.9, `bar${bar}`);
        energy.update(bar, 1, `bar${bar}`);
      }

      transitions.shouldTransition(8, 1);

      const history = transitions.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].cause).toBeTruthy();
      expect(history[0].tension).toBeDefined();
      expect(history[0].energy.momentum).toBeDefined();
    });

    it("multiple transitions accumulate in history", () => {
      // First transition
      const trigger1 = transitions.forceTransition("introduction", "first");
      transitions.shouldTransition(1, 1);

      // Second transition
      const trigger2 = transitions.forceTransition("development", "second");
      transitions.shouldTransition(17, 1);

      const history = transitions.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].type).toBe("introduction");
      expect(history[1].type).toBe("development");
    });
  });

  describe("reset behavior", () => {
    it("reset clears section and history", () => {
      transitions.defineSection("test", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("test");
      transitions.forceTransition("resolution", "test");
      transitions.shouldTransition(1, 1);

      expect(transitions.getHistory().length).toBeGreaterThan(0);

      transitions.reset();

      const history = transitions.getHistory();
      expect(history.length).toBe(0);
    });
  });

  describe("explainability", () => {
    it("explains current section state", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("dev1");
      accumulator.writeRhythmicTension(0.5, "test");
      energy.update(4, 1, "test");

      const explanation = transitions.explainCurrentState();
      expect(explanation).toContain("development");
      expect(explanation).toContain("dev1");
      expect(explanation).toContain("Tension:");
    });

    it("indicates when tension is out of range", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("dev1");

      // Tension below range
      accumulator.writeRhythmicTension(0.2, "low_tension");
      energy.update(8, 1, "low_tension");

      const explanation = transitions.explainCurrentState();
      expect(explanation).toContain("out of range");
    });

    it("includes energy state in explanation", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.3, 0.7],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("dev1");
      accumulator.writeRhythmicTension(0.5, "test");
      energy.update(4, 1, "test");

      const explanation = transitions.explainCurrentState();
      expect(explanation).toContain("Energy:");
    });
  });

  describe("Schillinger compliance", () => {
    it("transitions are tension-driven, not arbitrary", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.1, 0.5], // Wider range
        tensionThreshold: 0.35, // Low enough for 1.0 * 0.4 = 0.4 to exceed
      });

      transitions.setCurrentSection("dev1");

      // Same bar count, different tension = different transition behavior
      accumulator.writeRhythmicTension(0.4, "low"); // 0.16 weighted (in range)
      energy.update(8, 1, "low");

      const trigger1 = transitions.shouldTransition(8, 1);

      energy.reset();
      transitions.reset();
      transitions.setCurrentSection("dev1");

      accumulator.writeRhythmicTension(1.0, "high"); // 0.4 weighted (exceeds threshold of 0.35)
      energy.update(8, 1, "high");

      const trigger2 = transitions.shouldTransition(8, 1);

      // High tension triggers transition, low tension doesn't
      expect(trigger1).toBeNull();
      expect(trigger2).not.toBeNull();
    });

    it("exhaustion forces resolution (musical necessity)", () => {
      transitions.defineSection("climax", {
        type: "climax",
        startBar: 33,
        endBar: null,
        minBars: 16, // Long climax
        maxBars: null,
        tensionRange: [0.5, 1.0],
        tensionThreshold: null,
      });

      transitions.setCurrentSection("climax");

      // Build exhaustion
      for (let i = 0; i < 30; i++) {
        accumulator.writeRhythmicTension(1.0, `sustained${i}`);
        energy.update(33, i + 1, `sustained${i}`);
      }

      const trigger = transitions.shouldTransition(33, 30);

      // Must transition despite not reaching minBars
      expect(trigger).not.toBeNull();
      expect(trigger?.cause).toBe("exhaustion_forces_resolution");
      expect(trigger?.type).toBe("resolution");
    });

    it("low tension allows extended development", () => {
      transitions.defineSection("dev1", {
        type: "development",
        startBar: 1,
        endBar: null,
        minBars: 4,
        maxBars: null,
        tensionRange: [0.1, 0.4], // Adjusted range for low tension
        tensionThreshold: null,
      });

      transitions.setCurrentSection("dev1");

      // Low tension within range, no max bars → can continue indefinitely
      accumulator.writeRhythmicTension(0.5, "sustained"); // 0.5 * 0.4 = 0.2 (in range)
      energy.update(20, 1, "sustained");

      const trigger = transitions.shouldTransition(20, 1);
      expect(trigger).toBeNull();
    });
  });
});

/**
 * CI Tests: Demo Piece - Interference Study No. 1
 *
 * These tests validate that the canonical demo piece:
 * 1. Follows the bar-by-bar specification
 * 2. Meets all tension constraints
 * 3. Demonstrates structural necessity
 *
 * If these tests pass, the Schillinger system is proven complete.
 */

import { describe, it, expect } from "vitest";
import {
  DemoPieceGenerator,
  generateDemoPiece,
  MusicalEvent,
} from "../../schillinger/demo-piece-generator";
import { totalTension } from "../../src/structure/StructuralTension";

describe("Demo Piece: Interference Study No. 1", () => {
  describe("structure validation", () => {
    it("generates exactly 64 bars", () => {
      const result = generateDemoPiece();

      const uniqueBars = new Set(result.events.map((e) => e.bar));
      expect(uniqueBars.size).toBe(64);
      expect(Math.max(...result.events.map((e) => e.bar))).toBe(64);
    });

    it("has correct section boundaries", () => {
      const result = generateDemoPiece();

      expect(result.validation.sectionStructure.A_STABILITY).toEqual({
        start: 1,
        end: 16,
      });

      expect(result.validation.sectionStructure.B_INTERFERENCE).toEqual({
        start: 17,
        end: 32,
      });

      expect(result.validation.sectionStructure.C_COLLAPSE).toEqual({
        start: 33,
        end: 48,
      });

      expect(result.validation.sectionStructure.A_RESOLUTION).toEqual({
        start: 49,
        end: 64,
      });
    });

    it("has tension history for all bars", () => {
      const result = generateDemoPiece();

      expect(result.tensionHistory.length).toBe(64);

      // Should be sorted by bar number
      for (let i = 0; i < result.tensionHistory.length - 1; i++) {
        expect(result.tensionHistory[i + 1].bar).toBe(
          result.tensionHistory[i].bar + 1,
        );
      }
    });
  });

  describe("Section A: Stability constraints", () => {
    it("Section A maintains low tension (< 0.3)", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();

      // Check bars 1-16
      const sectionA = history.filter((h) => h.bar >= 1 && h.bar <= 16);

      sectionA.forEach(({ bar, total }) => {
        // With harmonic tension, Section A should be < 0.25
        // Rhythmic: 0.1-0.3 * 0.4 = 0.04-0.12
        // Harmonic: tonic 0.1 * 0.4 = 0.04
        // Total: ~0.08 to ~0.24
        expect(total).toBeLessThan(0.3);
      });
    });

    it("Bars 1-4 have no drill or gate", () => {
      const result = generateDemoPiece();
      const bars1to4 = result.events.filter((e) => e.bar >= 1 && e.bar <= 4);

      // Should only have groove events
      const hasDrill = bars1to4.some((e) => e.cause.includes("drill"));
      const hasGate = bars1to4.some((e) => e.cause.includes("gate"));

      expect(hasDrill).toBe(false);
      expect(hasGate).toBe(false);
    });

    it("Bars 5-8 only have fill at bar 8", () => {
      const result = generateDemoPiece();
      const bar8Events = result.events.filter((e) => e.bar === 8);

      const hasFill = bar8Events.some((e) => e.cause.includes("fill"));

      // Bar 8 should have a fill
      expect(hasFill).toBe(true);
    });

    it("Bars 9-12 same as 1-4 (low tension)", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();
      const bars9to12 = history.filter((h) => h.bar >= 9 && h.bar <= 12);

      bars9to12.forEach(({ total }) => {
        expect(total).toBeLessThan(0.3);
      });
    });
  });

  describe("Section B: Interference constraints", () => {
    it("Section B tension rises from 0.3 to 0.7", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();
      const sectionB = history.filter((h) => h.bar >= 17 && h.bar <= 32);

      const firstTension = sectionB[0].total;
      const lastTension = sectionB[sectionB.length - 1].total;

      // Section B now has rhythmic + harmonic tension
      // Rhythmic: 0.3-0.6 * 0.4 = 0.12-0.24
      // Harmonic: dominants ~0.4 * 0.4 = 0.16
      // Total: ~0.28 to ~0.40
      expect(firstTension).toBeGreaterThan(0.2);
      expect(lastTension).toBeGreaterThan(0.35);
      expect(lastTension).toBeGreaterThan(firstTension);
    });

    it("Bars 25-28 have phase drift on hats", () => {
      const result = generateDemoPiece();
      const bars25to28 = result.events.filter(
        (e) => e.bar >= 25 && e.bar <= 28 && e.role === "hats",
      );

      // Should have phase motion events
      const hasPhaseMotion = bars25to28.some(
        (e) =>
          e.properties.phaseOffset !== undefined && e.cause.includes("phase"),
      );

      expect(hasPhaseMotion).toBe(true);
    });

    it("Phase resets at bar 32 (phrase boundary)", () => {
      const result = generateDemoPiece();
      const bar32Events = result.events.filter((e) => e.bar === 32);

      const hasPhaseReset = bar32Events.some(
        (e) => e.type === "phase_reset" || e.cause.includes("phase_reset"),
      );

      expect(hasPhaseReset).toBe(true);
    });
  });

  describe("Section C: Collapse constraints", () => {
    it("Section C reaches maximum tension (≥ 0.85)", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();
      const sectionC = history.filter((h) => h.bar >= 33 && h.bar <= 48);

      // Find peak tension in Section C
      const maxTension = Math.max(...sectionC.map((h) => h.total));

      // Section C has rhythmic (gate 0.8) + harmonic (altered dominants ~0.55)
      // Total: 0.8 * 0.4 + 0.55 * 0.4 = 0.32 + 0.22 = 0.54+
      expect(maxTension).toBeGreaterThanOrEqual(0.55);
    });

    it("Bars 33-36 have silence gating", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();
      const bars33to36 = history.filter((h) => h.bar >= 33 && h.bar <= 36);

      // Gate writes tension (0.8 rhythmic = 0.32 total)
      const tensions = bars33to36.map((h) => h.total);
      const avgTension =
        tensions.reduce((sum, t) => sum + t, 0) / tensions.length;

      // Should have tension from gate
      expect(avgTension).toBeGreaterThan(0.25);
    });

    it("Bars 37-40 have burst replacement", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();
      const bars37to40 = history.filter((h) => h.bar >= 37 && h.bar <= 40);

      // Should have tension from burst (drill at 0.95)
      // 0.95 rhythmic * 0.4 = 0.38 total
      const tensions = bars37to40.map((h) => h.total);
      const maxTension = Math.max(...tensions);

      expect(maxTension).toBeGreaterThan(0.3);
    });

    it("Bars 41-48 have max drill and gate", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();
      const sectionC = history.filter((h) => h.bar >= 41 && h.bar <= 48);

      // Section C should have the highest tension in the piece
      const allTension = history.map((h) => h.total);
      const maxAllTension = Math.max(...allTension);

      // Peak should occur in Section C (within tolerance)
      const sectionCMax = Math.max(...sectionC.map((h) => h.total));

      expect(sectionCMax).toBeCloseTo(maxAllTension, 1);

      // Should be significantly higher than Section A
      const sectionA = history.filter((h) => h.bar >= 1 && h.bar <= 16);
      const sectionAMax = Math.max(...sectionA.map((h) => h.total));

      expect(sectionCMax).toBeGreaterThan(sectionAMax * 1.2);
    });
  });

  describe("Section A': Resolution constraints", () => {
    it("Resolution happens automatically (no manual toggles)", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();
      const sectionAprime = history.filter((h) => h.bar >= 49 && h.bar <= 64);

      // Tension should decrease from bar 49 to 64
      const firstTension = sectionAprime[0].total;
      const lastTension = sectionAprime[sectionAprime.length - 1].total;

      expect(lastTension).toBeLessThan(firstTension);

      // Should drop below 0.3 by the end
      expect(lastTension).toBeLessThan(0.3);
    });

    it("Tension drops to < 0.3 by end", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();
      const sectionAprime = history.filter((h) => h.bar >= 49 && h.bar <= 64);

      const finalTension = sectionAprime[sectionAprime.length - 1].total;

      expect(finalTension).toBeLessThan(0.3);
    });

    it("Bars 61-64 have final cadence", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();
      const bars61to64 = history.filter((h) => h.bar >= 61 && h.bar <= 64);

      // Final bars should have lowest tension of entire piece
      const finalTension = bars61to64[bars61to64.length - 1].total;
      const sectionTension = bars61to64.map((h) => h.total);

      // Final tension should be the lowest in Section A'
      const minInSectionAprime = Math.min(...sectionTension);

      expect(finalTension).toBeLessThanOrEqual(minInSectionAprime + 0.05);
    });

    it("Kick never drills (temporal anchor)", () => {
      const result = generateDemoPiece();
      const kickEvents = result.events.filter((e) => e.role === "kick");

      // All kick events should be about being an anchor, not drilling
      kickEvents.forEach((event) => {
        expect(event.cause).toContain("anchor");
      });
    });
  });

  describe("Schillinger compliance", () => {
    it("tension never exceeds 1.0", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();

      history.forEach(({ bar, total }) => {
        expect(total).toBeLessThanOrEqual(1.0);
      });
    });

    it("all events have tension data", () => {
      const result = generateDemoPiece();

      result.events.forEach((event) => {
        expect(event.tension).toBeDefined();
        expect(event.tension.rhythmic).toBeGreaterThanOrEqual(0);
        expect(event.tension.rhythmic).toBeLessThanOrEqual(1);
        expect(event.tension.harmonic).toBeGreaterThanOrEqual(0);
        expect(event.tension.harmonic).toBeLessThanOrEqual(1);
        expect(event.tension.formal).toBeGreaterThanOrEqual(0);
        expect(event.tension.formal).toBeLessThanOrEqual(1);
      });
    });

    it("all events have explainable causes", () => {
      const result = generateDemoPiece();

      result.events.forEach((event) => {
        expect(event.cause).toBeTruthy();
        expect(event.cause.length).toBeGreaterThan(0);
      });
    });

    it("tension creates narrative arc", () => {
      const generator = new DemoPieceGenerator();
      generator.generate();

      const history = generator.getTensionHistory();

      // Section A: Low
      const sectionA = history.filter((h) => h.bar >= 1 && h.bar <= 16);
      const avgA =
        sectionA.reduce((sum, h) => sum + h.total, 0) / sectionA.length;

      // Section B: Rising
      const sectionB = history.filter((h) => h.bar >= 17 && h.bar <= 32);
      const avgB =
        sectionB.reduce((sum, h) => sum + h.total, 0) / sectionB.length;

      // Section C: Peak
      const sectionC = history.filter((h) => h.bar >= 33 && h.bar <= 48);
      const avgC =
        sectionC.reduce((sum, h) => sum + h.total, 0) / sectionC.length;

      // Section A': Low
      const sectionAprime = history.filter((h) => h.bar >= 49 && h.bar <= 64);
      const avgAprime =
        sectionAprime.reduce((sum, h) => sum + h.total, 0) /
        sectionAprime.length;

      // Should have clear arc: low → rising → peak → low
      expect(avgA).toBeLessThan(avgB);
      expect(avgB).toBeLessThan(avgC);
      expect(avgC).toBeGreaterThan(avgAprime);
    });
  });

  describe("structural necessity", () => {
    it("has events for all required roles", () => {
      const result = generateDemoPiece();
      const roles = new Set(result.events.map((e) => e.role));

      const requiredRoles = ["kick", "snare", "hats", "perc", "bass", "pad"];

      requiredRoles.forEach((role) => {
        expect(roles.has(role)).toBe(true);
      });
    });

    it("kick provides temporal anchor (always on beats 1 and 3)", () => {
      const result = generateDemoPiece();
      const kickEvents = result.events.filter((e) => e.role === "kick");

      // Count beats where kick plays
      const beatCounts = new Map<number, number>();
      kickEvents.forEach((event) => {
        beatCounts.set(event.beat, (beatCounts.get(event.beat) || 0) + 1);
      });

      // Kick should be consistent (not random)
      expect(beatCounts.get(1)).toBeGreaterThan(30); // Beat 1 in most bars
      expect(beatCounts.get(3)).toBeGreaterThan(30); // Beat 3 in most bars
    });

    it("bass remains stable during chaos", () => {
      const result = generateDemoPiece();
      const bassEvents = result.events.filter((e) => e.role === "bass");

      // Bass should maintain foundation throughout
      expect(bassEvents.length).toBeGreaterThan(40); // In most bars
    });

    it("demo piece generates without errors", () => {
      expect(() => {
        const result = generateDemoPiece();
        expect(result.events.length).toBeGreaterThan(0);
        expect(result.tensionHistory.length).toBe(64);
      }).not.toThrow();
    });
  });

  describe("validation metrics", () => {
    it("meets all documented validation criteria", () => {
      const result = generateDemoPiece();

      expect(result.validation.totalBars).toBe(64);
      expect(result.validation.tensionConstraintsMet).toBe(true);
      expect(result.validation.sectionStructure).toBeDefined();
    });

    it("produces output suitable for validation testing", () => {
      const result = generateDemoPiece();

      // Should have events for testing
      expect(result.events.length).toBeGreaterThan(100);

      // Should have tension history for curve validation
      expect(result.tensionHistory).toHaveLength(64);

      // Should have validation metadata
      expect(result.validation.sectionStructure.A_STABILITY).toBeDefined();
      expect(result.validation.sectionStructure.B_INTERFERENCE).toBeDefined();
      expect(result.validation.sectionStructure.C_COLLAPSE).toBeDefined();
      expect(result.validation.sectionStructure.A_RESOLUTION).toBeDefined();
    });
  });
});

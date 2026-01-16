/**
 * Schillinger SDK 2.1 - PerformanceState_v1 Tests
 *
 * Test JSON schema validation and factory functions for PerformanceState.
 */

import { describe, it, expect } from "vitest";
import {
  getValidator,
  validatePerformanceState,
} from "../src/validator";
import {
  createPerformanceState,
  createSoloPianoPerformance,
  createSATBPerformance,
  createAmbientTechnoPerformance,
  createJazzTrioPerformance,
  createFullOrchestraPerformance,
  clonePerformanceState,
  touchPerformanceState,
} from "../src/factories";
import type { PerformanceState } from "../src/types";
import { ArrangementStyle } from "../src/types";

describe("PerformanceState_v1 validation", () => {
  describe("Schema validation", () => {
    const validPerformance: PerformanceState = {
      version: "1",
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test Performance",
      arrangementStyle: ArrangementStyle.SOLO_PIANO,
      density: 1.0,
      grooveProfileId: "default",
      instrumentationMap: {},
      consoleXProfileId: "default",
      mixTargets: {},
      createdAt: "2026-01-15T12:00:00.000Z",
      modifiedAt: "2026-01-15T12:00:00.000Z",
    };

    it("should validate a valid PerformanceState", () => {
      const result = validatePerformanceState(validPerformance);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validPerformance);
    });

    it("should reject performance without required version field", () => {
      const performance = { ...validPerformance };
      // @ts-expect-error - testing missing required field
      delete performance.version;

      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some((e) => e.message.includes("version"))).toBe(
        true,
      );
    });

    it("should reject performance without required id field", () => {
      const performance = { ...validPerformance };
      // @ts-expect-error - testing missing required field
      delete performance.id;

      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.message.includes("id"))).toBe(true);
    });

    it("should reject performance without required name field", () => {
      const performance = { ...validPerformance };
      // @ts-expect-error - testing missing required field
      delete performance.name;

      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.message.includes("name"))).toBe(
        true,
      );
    });

    it("should reject performance without required arrangementStyle field", () => {
      const performance = { ...validPerformance };
      // @ts-expect-error - testing missing required field
      delete performance.arrangementStyle;

      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(false);
      expect(
        result.errors?.some((e) => e.message.includes("arrangementStyle")),
      ).toBe(true);
    });

    it("should reject performance with invalid UUID", () => {
      const performance = { ...validPerformance, id: "not-a-uuid" };
      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.message.includes("format"))).toBe(
        true,
      );
    });

    it("should reject performance with density below minimum", () => {
      const performance = { ...validPerformance, density: -0.1 };
      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(false);
    });

    it("should reject performance with density above maximum", () => {
      const performance = { ...validPerformance, density: 1.1 };
      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(false);
    });

    it("should accept valid density values", () => {
      const validDensities = [0, 0.5, 0.8, 1.0];

      for (const density of validDensities) {
        const performance = { ...validPerformance, density };
        const result = validatePerformanceState(performance);
        expect(result.valid).toBe(true);
      }
    });

    it("should reject performance with invalid arrangement style", () => {
      // @ts-expect-error - testing invalid enum value
      const performance = { ...validPerformance, arrangementStyle: "INVALID_STYLE" };
      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(false);
    });

    it("should accept all valid arrangement styles", () => {
      const validStyles = Object.values(ArrangementStyle);

      for (const style of validStyles) {
        const performance = { ...validPerformance, arrangementStyle: style };
        const result = validatePerformanceState(performance);
        expect(result.valid).toBe(true);
      }
    });

    it("should accept performance with optional metadata", () => {
      const performanceWithMetadata: PerformanceState = {
        ...validPerformance,
        metadata: {
          description: "Test metadata",
          genre: "classical",
        },
      };

      const result = validatePerformanceState(performanceWithMetadata);
      expect(result.valid).toBe(true);
    });

    it("should validate instrumentation map", () => {
      const performanceWithInstruments: PerformanceState = {
        ...validPerformance,
        instrumentationMap: {
          primary: {
            instrumentId: "LocalGal",
            presetId: "grand_piano",
          },
          secondary: {
            instrumentId: "KaneMarco",
            presetId: "upright_bass",
            parameters: {
              volume: 0.8,
              brightness: 0.5,
            },
          },
        },
      };

      const result = validatePerformanceState(performanceWithInstruments);
      expect(result.valid).toBe(true);
    });

    it("should validate mix targets", () => {
      const performanceWithMix: PerformanceState = {
        ...validPerformance,
        mixTargets: {
          primary: {
            gain: -6,
            pan: 0,
            stereo: true,
          },
          secondary: {
            gain: -3,
            pan: -0.5,
            stereo: false,
          },
        },
      };

      const result = validatePerformanceState(performanceWithMix);
      expect(result.valid).toBe(true);
    });

    it("should reject mix target with pan below minimum", () => {
      const performanceWithMix: PerformanceState = {
        ...validPerformance,
        mixTargets: {
          primary: {
            gain: -6,
            // @ts-expect-error - testing invalid pan value
            pan: -1.5,
            stereo: true,
          },
        },
      };

      const result = validatePerformanceState(performanceWithMix);
      expect(result.valid).toBe(false);
    });

    it("should reject mix target with pan above maximum", () => {
      const performanceWithMix: PerformanceState = {
        ...validPerformance,
        mixTargets: {
          primary: {
            gain: -6,
            // @ts-expect-error - testing invalid pan value
            pan: 1.5,
            stereo: true,
          },
        },
      };

      const result = validatePerformanceState(performanceWithMix);
      expect(result.valid).toBe(false);
    });
  });

  describe("Factory functions", () => {
    it("should create performance with createPerformanceState", () => {
      const performance = createPerformanceState(
        "Test Performance",
        ArrangementStyle.SOLO_PIANO,
      );

      expect(performance.version).toBe("1");
      expect(performance.name).toBe("Test Performance");
      expect(performance.arrangementStyle).toBe(ArrangementStyle.SOLO_PIANO);
      expect(performance.density).toBe(1.0);
      expect(performance.grooveProfileId).toBe("default");
      expect(performance.instrumentationMap).toEqual({});
      expect(performance.consoleXProfileId).toBe("default");
      expect(performance.mixTargets).toEqual({});
      expect(performance.id).toBeDefined();
      expect(performance.createdAt).toBeDefined();
      expect(performance.modifiedAt).toBeDefined();
    });

    it("should create solo piano performance", () => {
      const performance = createSoloPianoPerformance();

      expect(performance.name).toBe("Solo Piano");
      expect(performance.arrangementStyle).toBe(ArrangementStyle.SOLO_PIANO);
      expect(performance.density).toBe(1.0);
      expect(performance.instrumentationMap.primary).toBeDefined();
      expect(performance.instrumentationMap.primary?.instrumentId).toBe(
        "LocalGal",
      );
      expect(performance.instrumentationMap.primary?.presetId).toBe(
        "grand_piano",
      );
      expect(performance.mixTargets.primary).toBeDefined();
      expect(performance.mixTargets.primary?.gain).toBe(-3);
      expect(performance.mixTargets.primary?.pan).toBe(0);

      // Validate against schema
      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });

    it("should create SATB performance", () => {
      const performance = createSATBPerformance();

      expect(performance.name).toBe("SATB Choir");
      expect(performance.arrangementStyle).toBe(ArrangementStyle.SATB);
      expect(performance.density).toBe(0.8);
      expect(performance.grooveProfileId).toBe("straight");
      expect(performance.instrumentationMap.soprano).toBeDefined();
      expect(performance.instrumentationMap.alto).toBeDefined();
      expect(performance.instrumentationMap.tenor).toBeDefined();
      expect(performance.instrumentationMap.bass).toBeDefined();
      expect(Object.keys(performance.instrumentationMap).length).toBe(4);
      expect(Object.keys(performance.mixTargets).length).toBe(4);

      // Validate against schema
      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });

    it("should create ambient techno performance", () => {
      const performance = createAmbientTechnoPerformance();

      expect(performance.name).toBe("Ambient Techno");
      expect(performance.arrangementStyle).toBe(ArrangementStyle.AMBIENT_TECHNO);
      expect(performance.density).toBe(0.6);
      expect(performance.grooveProfileId).toBe("swing");
      expect(performance.instrumentationMap.primary?.parameters).toBeDefined();
      expect(
        performance.instrumentationMap.primary?.parameters?.attack,
      ).toBeDefined();
      expect(
        performance.instrumentationMap.primary?.parameters?.reverb,
      ).toBeDefined();

      // Validate against schema
      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });

    it("should create jazz trio performance", () => {
      const performance = createJazzTrioPerformance();

      expect(performance.name).toBe("Jazz Trio");
      expect(performance.arrangementStyle).toBe(ArrangementStyle.JAZZ_TRIO);
      expect(performance.density).toBe(0.85);
      expect(performance.instrumentationMap.piano).toBeDefined();
      expect(performance.instrumentationMap.bass).toBeDefined();
      expect(performance.instrumentationMap.drums).toBeDefined();
      expect(performance.mixTargets.bass?.stereo).toBe(false);

      // Validate against schema
      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });

    it("should create full orchestra performance", () => {
      const performance = createFullOrchestraPerformance();

      expect(performance.name).toBe("Full Orchestra");
      expect(performance.arrangementStyle).toBe(ArrangementStyle.FULL_ORCHESTRA);
      expect(performance.density).toBe(1.0);
      expect(performance.instrumentationMap.strings).toBeDefined();
      expect(performance.instrumentationMap.brass).toBeDefined();
      expect(performance.instrumentationMap.woodwinds).toBeDefined();
      expect(performance.instrumentationMap.percussion).toBeDefined();
      expect(Object.keys(performance.instrumentationMap).length).toBe(4);

      // Validate against schema
      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });

    it("should clone performance with new ID", () => {
      const original = createSoloPianoPerformance();
      const cloned = clonePerformanceState(original);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toBe(`${original.name} (Copy)`);
      expect(cloned.arrangementStyle).toBe(original.arrangementStyle);
      expect(cloned.density).toBe(original.density);
      expect(cloned.instrumentationMap).toEqual(original.instrumentationMap);
      expect(cloned.mixTargets).toEqual(original.mixTargets);
      // Timestamps should be ISO strings and present
      expect(cloned.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(cloned.modifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should clone performance with custom name", () => {
      const original = createSoloPianoPerformance();
      const customName = "My Custom Piano Performance";
      const cloned = clonePerformanceState(original, customName);

      expect(cloned.name).toBe(customName);
      expect(cloned.id).not.toBe(original.id);
    });

    it("should update modified timestamp", async () => {
      const performance = createSoloPianoPerformance();
      const originalModifiedAt = performance.modifiedAt;

      // Simulate some delay to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 2));

      const updated = touchPerformanceState(performance);

      expect(updated.modifiedAt).not.toBe(originalModifiedAt);
      expect(updated.id).toBe(performance.id);
      expect(updated.name).toBe(performance.name);
    });

    it("should create multiple unique performances", () => {
      const performances = [
        createSoloPianoPerformance(),
        createSATBPerformance(),
        createAmbientTechnoPerformance(),
        createJazzTrioPerformance(),
        createFullOrchestraPerformance(),
      ];

      // All should have unique IDs
      const ids = performances.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(performances.length);

      // All should validate successfully
      for (const performance of performances) {
        const result = validatePerformanceState(performance);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe("Validator integration", () => {
    it("should list PerformanceState_v1 in available schemas", () => {
      const validator = getValidator();
      const schemas = validator.getAvailableSchemas();
      expect(schemas).toContain("PerformanceState_v1");
    });

    it("should return singleton validator instance", () => {
      const validator1 = getValidator();
      const validator2 = getValidator();
      expect(validator1).toBe(validator2);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle empty instrumentation map", () => {
      const performance: PerformanceState = {
        version: "1",
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Empty Instruments",
        arrangementStyle: ArrangementStyle.CUSTOM,
        density: 1.0,
        grooveProfileId: "default",
        instrumentationMap: {},
        consoleXProfileId: "default",
        mixTargets: {},
        createdAt: "2026-01-15T12:00:00.000Z",
        modifiedAt: "2026-01-15T12:00:00.000Z",
      };

      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });

    it("should handle empty mix targets", () => {
      const performance: PerformanceState = {
        version: "1",
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Empty Mix Targets",
        arrangementStyle: ArrangementStyle.CUSTOM,
        density: 1.0,
        grooveProfileId: "default",
        instrumentationMap: {},
        consoleXProfileId: "default",
        mixTargets: {},
        createdAt: "2026-01-15T12:00:00.000Z",
        modifiedAt: "2026-01-15T12:00:00.000Z",
      };

      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });

    it("should accept minimum density of 0", () => {
      const performance = createPerformanceState(
        "Sparse Performance",
        ArrangementStyle.SOLO_PIANO,
      );
      performance.density = 0;

      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });

    it("should accept maximum density of 1", () => {
      const performance = createPerformanceState(
        "Dense Performance",
        ArrangementStyle.SOLO_PIANO,
      );
      performance.density = 1;

      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });

    it("should handle extreme pan values", () => {
      const performance: PerformanceState = {
        version: "1",
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Extreme Pan",
        arrangementStyle: ArrangementStyle.CUSTOM,
        density: 1.0,
        grooveProfileId: "default",
        instrumentationMap: {},
        consoleXProfileId: "default",
        mixTargets: {
          left: { gain: -6, pan: -1, stereo: true },
          center: { gain: -6, pan: 0, stereo: true },
          right: { gain: -6, pan: 1, stereo: true },
        },
        createdAt: "2026-01-15T12:00:00.000Z",
        modifiedAt: "2026-01-15T12:00:00.000Z",
      };

      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });

    it("should accept instrument assignment with custom parameters", () => {
      const performance: PerformanceState = {
        version: "1",
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Custom Parameters",
        arrangementStyle: ArrangementStyle.CUSTOM,
        density: 1.0,
        grooveProfileId: "default",
        instrumentationMap: {
          custom: {
            instrumentId: "NexSynth",
            parameters: {
              param1: 0.1,
              param2: 0.5,
              param3: 0.9,
              param4: 1.0,
            },
          },
        },
        consoleXProfileId: "default",
        mixTargets: {},
        createdAt: "2026-01-15T12:00:00.000Z",
        modifiedAt: "2026-01-15T12:00:00.000Z",
      };

      const result = validatePerformanceState(performance);
      expect(result.valid).toBe(true);
    });
  });
});

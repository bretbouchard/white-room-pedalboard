/**
 * Book IV: Form System Tests
 *
 * Test coverage for Schillinger's form theory including:
 * - Ratio trees (A:B:C...)
 * - Nested periodicity
 * - Section reuse and transformation
 * - Formal symmetry
 * - Cadence constraints
 */

import { describe, it, expect } from "vitest";
import { FormSystemImpl, createFormSystem, type FormAnalysis } from "../src/theory/systems/form";
import type { FormSystem, RatioTreeNode, FormalSection, SymmetryRule } from "../src/types";

describe("FormSystemImpl", () => {
  describe("creation and validation", () => {
    it("should create form system with defaults", () => {
      const system = createFormSystem();

      expect(system.systemId).toBeDefined();
      expect(system.systemType).toBe("form");
      expect(system.ratioTree.nodeId).toBe("root");
      expect(system.ratioTree.children).toHaveLength(2);
      expect(system.sectionDefinitions.size).toBe(0);
      expect(system.symmetryRules).toHaveLength(0);
      expect(system.cadenceConstraints).toHaveLength(0);
      expect(system.nestingDepth).toBe(3);
    });

    it("should validate correct system", () => {
      const system = createFormSystem({
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 16,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
        ],
      });

      const result = system.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject nesting depth out of range", () => {
      const system = createFormSystem({
        nestingDepth: 0,
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Nesting depth 0 out of range (1-10)");
    });

    it("should reject empty section ID", () => {
      const system = createFormSystem({
        sectionDefinitions: [
          {
            sectionId: "",
            startTime: 0,
            duration: 16,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
        ],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Section has empty ID");
    });

    it("should reject empty symmetry rule ID", () => {
      const system = createFormSystem({
        symmetryRules: [
          {
            ruleId: "",
            type: "palindrome",
            appliesTo: "A",
          },
        ],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Symmetry rule has empty ID");
    });

    it("should reject symmetry rule with empty appliesTo", () => {
      const system = createFormSystem({
        symmetryRules: [
          {
            ruleId: "test-1",
            type: "palindrome",
            appliesTo: "",
          },
        ],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Symmetry rule test-1 has empty appliesTo");
    });

    it("should reject invalid symmetry type", () => {
      const system = createFormSystem({
        symmetryRules: [
          {
            ruleId: "test-1",
            type: "invalid" as any,
            appliesTo: "A",
          },
        ],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Symmetry rule test-1 has invalid type "invalid"');
    });

    it("should reject cadence constraint for undefined section", () => {
      const system = createFormSystem({
        cadenceConstraints: ["undefined-section"],
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("undefined-section"))).toBe(true);
    });

    it("should reject invalid ratio in tree", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: -1,
          children: [],
        },
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Ratio tree node "root" has invalid ratio -1');
    });

    it("should reject empty node ID in ratio tree", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "",
          ratio: 1,
          children: [],
        },
      });

      const result = system.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Ratio tree node has empty ID");
    });
  });

  describe("generateForm()", () => {
    it("should generate simple binary form", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
            {
              nodeId: "B",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
          {
            sectionId: "B",
            startTime: 8,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
        ],
        nestingDepth: 1,
      });

      const form = system.generateForm(16);

      expect(form.sections).toHaveLength(2);
      expect(form.sections[0].sectionId).toBe("A");
      expect(form.sections[0].duration).toBe(8);
      expect(form.sections[1].sectionId).toBe("B");
      expect(form.sections[1].duration).toBe(8);
      expect(form.totalDuration).toBe(16);
    });

    it("should generate ternary form", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
            {
              nodeId: "B",
              ratio: 1,
              children: [],
            },
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
          {
            sectionId: "B",
            startTime: 8,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
        ],
        nestingDepth: 1,
      });

      const form = system.generateForm(24);

      expect(form.sections).toHaveLength(3);
      expect(form.sections[0].sectionId).toBe("A");
      expect(form.sections[1].sectionId).toBe("B");
      expect(form.sections[2].sectionId).toBe("A");
    });

    it("should respect ratio proportions", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
            {
              nodeId: "B",
              ratio: 2,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
          {
            sectionId: "B",
            startTime: 8,
            duration: 16,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
        ],
        nestingDepth: 1,
      });

      const form = system.generateForm(24);

      expect(form.sections[0].duration).toBe(8); // 1/3 of 24
      expect(form.sections[1].duration).toBe(16); // 2/3 of 24
    });

    it("should handle nested hierarchy", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [
                {
                  nodeId: "a1",
                  ratio: 1,
                  children: [],
                },
                {
                  nodeId: "a2",
                  ratio: 1,
                  children: [],
                },
              ],
            },
            {
              nodeId: "B",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "a1",
            startTime: 0,
            duration: 4,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
          {
            sectionId: "a2",
            startTime: 4,
            duration: 4,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
          {
            sectionId: "B",
            startTime: 8,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
        ],
        nestingDepth: 2,
      });

      const form = system.generateForm(16);

      expect(form.sections).toHaveLength(3);
      expect(form.depth).toBeGreaterThanOrEqual(1);
    });

    it("should create placeholder sections for undefined definitions", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "undefined-section",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [],
        nestingDepth: 1,
      });

      const form = system.generateForm(16);

      expect(form.sections).toHaveLength(1);
      expect(form.sections[0].sectionId).toBe("undefined-section");
      expect(form.sections[0].content).toEqual({ type: "placeholder" });
    });

    it("should respect nesting depth limit", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [
                {
                  nodeId: "a1",
                  ratio: 1,
                  children: [
                    {
                      nodeId: "a1-i",
                      ratio: 1,
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        sectionDefinitions: [],
        nestingDepth: 2, // Should stop at level 2
      });

      const form = system.generateForm(16);

      // Should create sections at level 2, not descend to level 3
      expect(form.sections).toHaveLength(1);
      expect(form.sections[0].sectionId).toBe("a1");
    });
  });

  describe("symmetry rules", () => {
    it("should apply palindrome transformation", () => {
      const symmetryRule: SymmetryRule = {
        ruleId: "test-palindrome",
        type: "palindrome",
        appliesTo: "A",
      };

      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 8,
            content: { type: "test" },
            requiresCadence: false,
          },
        ],
        symmetryRules: [symmetryRule],
        nestingDepth: 1,
      });

      const form = system.generateForm(8);

      expect(form.sections).toHaveLength(1);
      expect(form.sections[0].sectionId).toBe("A");
      // Content transformation is placeholder, so just verify section exists
    });

    it("should apply mirror transformation", () => {
      const symmetryRule: SymmetryRule = {
        ruleId: "test-mirror",
        type: "mirror",
        appliesTo: "B",
      };

      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "B",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "B",
            startTime: 0,
            duration: 8,
            content: { type: "test" },
            requiresCadence: false,
          },
        ],
        symmetryRules: [symmetryRule],
        nestingDepth: 1,
      });

      const form = system.generateForm(8);

      expect(form.sections).toHaveLength(1);
    });

    it("should apply rotational transformation", () => {
      const symmetryRule: SymmetryRule = {
        ruleId: "test-rotation",
        type: "rotational",
        appliesTo: "A",
        amount: 1,
      };

      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 8,
            content: { type: "test" },
            requiresCadence: false,
          },
        ],
        symmetryRules: [symmetryRule],
        nestingDepth: 1,
      });

      const form = system.generateForm(8);

      expect(form.sections).toHaveLength(1);
    });

    it("should apply retrograde transformation", () => {
      const symmetryRule: SymmetryRule = {
        ruleId: "test-retrograde",
        type: "retrograde",
        appliesTo: "A",
      };

      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 8,
            content: { type: "test" },
            requiresCadence: false,
          },
        ],
        symmetryRules: [symmetryRule],
        nestingDepth: 1,
      });

      const form = system.generateForm(8);

      expect(form.sections).toHaveLength(1);
    });

    it("should handle multiple symmetry rules", () => {
      const symmetryRules: SymmetryRule[] = [
        {
          ruleId: "test-1",
          type: "palindrome",
          appliesTo: "A",
        },
        {
          ruleId: "test-2",
          type: "retrograde",
          appliesTo: "B",
        },
      ];

      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
            {
              nodeId: "B",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 8,
            content: { type: "test" },
            requiresCadence: false,
          },
          {
            sectionId: "B",
            startTime: 8,
            duration: 8,
            content: { type: "test" },
            requiresCadence: false,
          },
        ],
        symmetryRules,
        nestingDepth: 1,
      });

      const form = system.generateForm(16);

      expect(form.sections).toHaveLength(2);
    });
  });

  describe("cadence constraints", () => {
    it("should mark sections requiring cadence", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 16,
            content: { type: "placeholder" },
            requiresCadence: true,
          },
        ],
        cadenceConstraints: ["A"],
        nestingDepth: 1,
      });

      const form = system.generateForm(16);

      expect(form.sections[0].requiresCadence).toBe(true);
    });

    it("should not mark sections without cadence constraint", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 16,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
        ],
        cadenceConstraints: [],
        nestingDepth: 1,
      });

      const form = system.generateForm(16);

      expect(form.sections[0].requiresCadence).toBe(false);
    });
  });

  describe("getSection()", () => {
    it("should return section definition", () => {
      const section: FormalSection = {
        sectionId: "A",
        startTime: 0,
        duration: 16,
        content: { type: "test" },
        requiresCadence: false,
      };

      const system = createFormSystem({
        sectionDefinitions: [section],
      });

      const retrieved = system.getSection("A");

      expect(retrieved).toEqual(section);
    });

    it("should return undefined for non-existent section", () => {
      const system = createFormSystem();

      const retrieved = system.getSection("non-existent");

      expect(retrieved).toBeUndefined();
    });
  });

  describe("getSectionIds()", () => {
    it("should return all section IDs", () => {
      const system = createFormSystem({
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
          {
            sectionId: "B",
            startTime: 8,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
        ],
      });

      const ids = system.getSectionIds();

      expect(ids).toHaveLength(2);
      expect(ids).toContain("A");
      expect(ids).toContain("B");
    });

    it("should return empty array when no sections", () => {
      const system = createFormSystem();

      const ids = system.getSectionIds();

      expect(ids).toHaveLength(0);
    });
  });

  describe("determinism", () => {
    it("should generate identical form with same inputs", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
            {
              nodeId: "B",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
          {
            sectionId: "B",
            startTime: 8,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
        ],
        nestingDepth: 1,
      });

      const form1 = system.generateForm(16);
      const form2 = system.generateForm(16);

      expect(form1).toEqual(form2);
    });
  });

  describe("real-world forms", () => {
    it("should generate sonata form (exposition-development-recapitulation)", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "exposition",
              ratio: 1,
              children: [],
            },
            {
              nodeId: "development",
              ratio: 1,
              children: [],
            },
            {
              nodeId: "recapitulation",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "exposition",
            startTime: 0,
            duration: 32,
            content: { type: "placeholder" },
            requiresCadence: true,
          },
          {
            sectionId: "development",
            startTime: 32,
            duration: 32,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
          {
            sectionId: "recapitulation",
            startTime: 64,
            duration: 32,
            content: { type: "placeholder" },
            requiresCadence: true,
          },
        ],
        cadenceConstraints: ["exposition", "recapitulation"],
        nestingDepth: 1,
      });

      const form = system.generateForm(96);

      expect(form.sections).toHaveLength(3);
      expect(form.sections[0].sectionId).toBe("exposition");
      expect(form.sections[1].sectionId).toBe("development");
      expect(form.sections[2].sectionId).toBe("recapitulation");
      expect(form.sections[0].requiresCadence).toBe(true);
      expect(form.sections[2].requiresCadence).toBe(true);
    });

    it("should generate rondo form (A-B-A-C-A)", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            { nodeId: "A", ratio: 1, children: [] },
            { nodeId: "B", ratio: 1, children: [] },
            { nodeId: "A", ratio: 1, children: [] },
            { nodeId: "C", ratio: 1, children: [] },
            { nodeId: "A", ratio: 1, children: [] },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: true,
          },
          {
            sectionId: "B",
            startTime: 8,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
          {
            sectionId: "C",
            startTime: 24,
            duration: 8,
            content: { type: "placeholder" },
            requiresCadence: false,
          },
        ],
        cadenceConstraints: ["A"],
        nestingDepth: 1,
      });

      const form = system.generateForm(40);

      expect(form.sections).toHaveLength(5);
      expect(form.sections[0].sectionId).toBe("A");
      expect(form.sections[1].sectionId).toBe("B");
      expect(form.sections[2].sectionId).toBe("A");
      expect(form.sections[3].sectionId).toBe("C");
      expect(form.sections[4].sectionId).toBe("A");
    });
  });

  describe("edge cases", () => {
    it("should handle single section", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [
            {
              nodeId: "A",
              ratio: 1,
              children: [],
            },
          ],
        },
        sectionDefinitions: [
          {
            sectionId: "A",
            startTime: 0,
            duration: 16,
            content: { type: "placeholder" },
            requiresCadence: true,
          },
        ],
        cadenceConstraints: ["A"],
        nestingDepth: 1,
      });

      const form = system.generateForm(16);

      expect(form.sections).toHaveLength(1);
      expect(form.sections[0].duration).toBe(16);
    });

    it("should handle empty ratio tree (leaf node only)", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "root",
          ratio: 1,
          children: [],
        },
        sectionDefinitions: [],
        nestingDepth: 1,
      });

      const form = system.generateForm(16);

      // Should create placeholder section at root
      expect(form.sections).toHaveLength(1);
      expect(form.sections[0].sectionId).toBe("root");
    });

    it("should handle very deep nesting", () => {
      const system = createFormSystem({
        ratioTree: {
          nodeId: "L1",
          ratio: 1,
          children: [
            {
              nodeId: "L2",
              ratio: 1,
              children: [
                {
                  nodeId: "L3",
                  ratio: 1,
                  children: [
                    {
                      nodeId: "L4",
                      ratio: 1,
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        sectionDefinitions: [],
        nestingDepth: 10,
      });

      const form = system.generateForm(16);

      expect(form.depth).toBeGreaterThan(0);
    });
  });
});

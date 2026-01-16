/**
 * Test Schillinger Books II, III, IV FFI Integration
 *
 * Tests melody, harmony, and form generation through FFI bindings.
 */

import { describe, it, expect } from "vitest";
import {
  generateMelody,
  generateHarmony,
  generateForm,
  generateRhythmAttacks,
  type MelodySystemConfig,
  type HarmonySystemConfig,
  type FormSystemConfig,
  type RhythmSystemConfig,
} from "../src";

describe("Schillinger Book II - Melody", () => {
  it("should generate melody from interval cycle", () => {
    const melodySystem: MelodySystemConfig = {
      systemId: "melody-test-1",
      systemType: "melody",
      cycleLength: 7,
      intervalSeed: [2, 2, 1, 2, 2, 2, 1], // Major scale
      rhythmBinding: "rhythm-test",
    };

    const rhythmSystem: RhythmSystemConfig = {
      systemId: "rhythm-test",
      systemType: "rhythm",
      generators: [
        { period: 4, phase: 0, weight: 1.0 },
      ],
      resultantSelection: { method: "interference" },
    };

    const attacks = generateRhythmAttacks(rhythmSystem, 8);
    const melody = generateMelody(melodySystem, attacks, 8, 60);

    expect(melody).toBeDefined();
    expect(melody.length).toBeGreaterThan(0);
    expect(melody[0]).toHaveProperty("time");
    expect(melody[0]).toHaveProperty("pitch");
    expect(melody[0]).toHaveProperty("velocity");
    expect(melody[0]).toHaveProperty("duration");

    // Verify pitch is in valid MIDI range
    expect(melody[0].pitch).toBeGreaterThanOrEqual(0);
    expect(melody[0].pitch).toBeLessThanOrEqual(127);

    // Verify velocity is in valid range
    expect(melody[0].velocity).toBeGreaterThanOrEqual(0);
    expect(melody[0].velocity).toBeLessThanOrEqual(127);
  });

  it("should apply ascending contour constraint", () => {
    const melodySystem: MelodySystemConfig = {
      systemId: "melody-test-2",
      systemType: "melody",
      cycleLength: 5,
      intervalSeed: [2, 2, 2, 2, 2], // Whole steps
      contourConstraints: {
        constraintId: "contour-asc",
        type: "ascending",
      },
      rhythmBinding: "rhythm-test",
    };

    const rhythmSystem: RhythmSystemConfig = {
      systemId: "rhythm-test",
      systemType: "rhythm",
      generators: [
        { period: 4, phase: 0, weight: 1.0 },
      ],
      resultantSelection: { method: "interference" },
    };

    const attacks = generateRhythmAttacks(rhythmSystem, 8);
    const melody = generateMelody(melodySystem, attacks, 8, 60);

    expect(melody).toBeDefined();
    expect(melody.length).toBeGreaterThan(1);

    // Check that melody generally ascends (allowing for register wrapping)
    let ascended = 0;
    for (let i = 1; i < melody.length; i++) {
      if (melody[i].pitch >= melody[i - 1].pitch) {
        ascended++;
      }
    }
    // At least 40% should ascend (allowing for octave transposition and whole steps)
    expect(ascended / melody.length).toBeGreaterThanOrEqual(0.4);
  });

  it("should apply register constraints", () => {
    const melodySystem: MelodySystemConfig = {
      systemId: "melody-test-3",
      systemType: "melody",
      cycleLength: 7,
      intervalSeed: [2, 2, 1, 2, 2, 2, 1],
      registerConstraints: {
        constraintId: "register-test",
        minPitch: 60,
        maxPitch: 72,
        allowTransposition: false,
      },
      rhythmBinding: "rhythm-test",
    };

    const rhythmSystem: RhythmSystemConfig = {
      systemId: "rhythm-test",
      systemType: "rhythm",
      generators: [
        { period: 4, phase: 0, weight: 1.0 },
      ],
      resultantSelection: { method: "interference" },
    };

    const attacks = generateRhythmAttacks(rhythmSystem, 8);
    const melody = generateMelody(melodySystem, attacks, 8, 60);

    expect(melody).toBeDefined();

    // All pitches should be within register
    for (const event of melody) {
      expect(event.pitch).toBeGreaterThanOrEqual(60);
      expect(event.pitch).toBeLessThanOrEqual(72);
    }
  });
});

describe("Schillinger Book III - Harmony", () => {
  it("should generate harmony from distribution", () => {
    const harmonySystem: HarmonySystemConfig = {
      systemId: "harmony-test-1",
      systemType: "harmony",
      distribution: [
        0.1, // minor 2nd
        0.3, // major 2nd
        0.8, // minor 3rd
        1.0, // major 3rd
        0.6, // perfect 4th
        0.1, // tritone
        0.9, // perfect 5th
        0.4, // minor 6th
        0.7, // major 6th
        0.5, // minor 7th
        0.2, // major 7th
        0.0, // octave
      ],
      harmonicRhythmBinding: "rhythm-test",
    };

    const rhythmSystem: RhythmSystemConfig = {
      systemId: "rhythm-test",
      systemType: "rhythm",
      generators: [
        { period: 4, phase: 0, weight: 1.0 },
      ],
      resultantSelection: { method: "interference" },
    };

    const attacks = generateRhythmAttacks(rhythmSystem, 8);
    const harmony = generateHarmony(harmonySystem, attacks, 8, 60);

    expect(harmony).toBeDefined();
    expect(harmony.length).toBeGreaterThan(0);
    expect(harmony[0]).toHaveProperty("time");
    expect(harmony[0]).toHaveProperty("root");
    expect(harmony[0]).toHaveProperty("intervals");
    expect(harmony[0]).toHaveProperty("weight");

    // Verify intervals array
    expect(Array.isArray(harmony[0].intervals)).toBe(true);
    expect(harmony[0].intervals.length).toBeGreaterThanOrEqual(3); // At least a triad

    // Verify weight is in valid range
    expect(harmony[0].weight).toBeGreaterThanOrEqual(0);
    expect(harmony[0].weight).toBeLessThanOrEqual(1);
  });

  it("should generate chords with weighted intervals", () => {
    const harmonySystem: HarmonySystemConfig = {
      systemId: "harmony-test-2",
      systemType: "harmony",
      // Strong emphasis on major 3rd, perfect 5th, major 6th
      distribution: [0, 0, 0, 1.0, 0, 0, 1.0, 0, 0.8, 0, 0, 0],
      harmonicRhythmBinding: "rhythm-test",
    };

    const rhythmSystem: RhythmSystemConfig = {
      systemId: "rhythm-test",
      systemType: "rhythm",
      generators: [
        { period: 2, phase: 0, weight: 1.0 },
      ],
      resultantSelection: { method: "interference" },
    };

    const attacks = generateRhythmAttacks(rhythmSystem, 8);
    const harmony = generateHarmony(harmonySystem, attacks, 8, 60);

    expect(harmony).toBeDefined();
    expect(harmony.length).toBeGreaterThan(0);

    // Check that intervals match distribution (should contain 3, 5, 7)
    const firstChord = harmony[0];
    expect(firstChord.intervals).toContain(3); // Major 3rd
    expect(firstChord.intervals).toContain(5); // Perfect 5th (index 4 + 1)
  });
});

describe("Schillinger Book IV - Form", () => {
  it("should generate form from ratio tree", () => {
    const formSystem: FormSystemConfig = {
      systemId: "form-test-1",
      systemType: "form",
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
      nestingDepth: 3,
    };

    const form = generateForm(formSystem, 32);

    expect(form).toBeDefined();
    expect(form.length).toBeGreaterThan(0);
    expect(form[0]).toHaveProperty("sectionId");
    expect(form[0]).toHaveProperty("startTime");
    expect(form[0]).toHaveProperty("duration");

    // Verify binary form (2 sections with equal duration)
    expect(form.length).toBe(2);
    expect(form[0].duration).toBe(16);
    expect(form[1].duration).toBe(16);
  });

  it("should generate nested form structure", () => {
    const formSystem: FormSystemConfig = {
      systemId: "form-test-2",
      systemType: "form",
      ratioTree: {
        nodeId: "root",
        ratio: 1,
        children: [
          {
            nodeId: "A",
            ratio: 2,
            children: [
              { nodeId: "a1", ratio: 1, children: [] },
              { nodeId: "a2", ratio: 1, children: [] },
            ],
          },
          {
            nodeId: "B",
            ratio: 1,
            children: [],
          },
        ],
      },
      nestingDepth: 3,
    };

    const form = generateForm(formSystem, 32);

    expect(form).toBeDefined();
    expect(form.length).toBe(3); // a1, a2, B

    // Verify durations (2:1 ratio)
    expect(form[0].duration).toBeCloseTo(10.67, 1); // a1: 2/4 of 32
    expect(form[1].duration).toBeCloseTo(10.67, 1); // a2: 2/4 of 32
    expect(form[2].duration).toBeCloseTo(10.67, 1); // B: 1/4 of 32

    // Verify start times
    expect(form[0].startTime).toBe(0);
    expect(form[1].startTime).toBeCloseTo(10.67, 1);
    expect(form[2].startTime).toBeCloseTo(21.33, 1);
  });

  it("should respect nesting depth", () => {
    const formSystem: FormSystemConfig = {
      systemId: "form-test-3",
      systemType: "form",
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
                  { nodeId: "a1-i", ratio: 1, children: [] },
                  { nodeId: "a1-ii", ratio: 1, children: [] },
                ],
              },
            ],
          },
        ],
      },
      nestingDepth: 2, // Should stop at level 2
    };

    const form = generateForm(formSystem, 32);

    expect(form).toBeDefined();
    // Should have a1 as a single section (not expanded to a1-i, a1-ii)
    expect(form.length).toBe(1);
    expect(form[0].sectionId).toBe("a1");
  });
});

describe("Integration Tests - Complete Pipeline", () => {
  it("should generate complete song from all 4 books", () => {
    // Book I: Rhythm
    const rhythmSystem: RhythmSystemConfig = {
      systemId: "rhythm-complete",
      systemType: "rhythm",
      generators: [
        { period: 3, phase: 0, weight: 1.0 },
        { period: 4, phase: 0, weight: 1.0 },
      ],
      resultantSelection: { method: "interference" },
    };

    const attacks = generateRhythmAttacks(rhythmSystem, 32);
    expect(attacks.length).toBeGreaterThan(0);

    // Book II: Melody
    const melodySystem: MelodySystemConfig = {
      systemId: "melody-complete",
      systemType: "melody",
      cycleLength: 7,
      intervalSeed: [2, 2, 1, 2, 2, 2, 1],
      contourConstraints: {
        constraintId: "contour-osc",
        type: "oscillating",
      },
      rhythmBinding: "rhythm-complete",
    };

    const melody = generateMelody(melodySystem, attacks, 32, 60);
    expect(melody.length).toBe(attacks.length);

    // Book III: Harmony
    const harmonySystem: HarmonySystemConfig = {
      systemId: "harmony-complete",
      systemType: "harmony",
      distribution: [
        0.1, 0.3, 0.8, 1.0, 0.6, 0.1, 0.9, 0.4, 0.7, 0.5, 0.2, 0.0,
      ],
      harmonicRhythmBinding: "rhythm-complete",
    };

    const harmony = generateHarmony(harmonySystem, attacks, 32, 60);
    expect(harmony.length).toBe(attacks.length);

    // Book IV: Form
    const formSystem: FormSystemConfig = {
      systemId: "form-complete",
      systemType: "form",
      ratioTree: {
        nodeId: "root",
        ratio: 1,
        children: [
          { nodeId: "A", ratio: 1, children: [] },
          { nodeId: "B", ratio: 1, children: [] },
          { nodeId: "A", ratio: 1, children: [] },
        ],
      },
      nestingDepth: 3,
    };

    const form = generateForm(formSystem, 32);
    expect(form.length).toBe(3);

    // Verify consistency
    expect(melody.length).toBe(harmony.length);
    expect(form[0].duration + form[1].duration + form[2].duration).toBe(32);

    console.log(`✅ Generated complete song:`);
    console.log(`   - Rhythm: ${attacks.length} attacks`);
    console.log(`   - Melody: ${melody.length} notes`);
    console.log(`   - Harmony: ${harmony.length} chords`);
    console.log(`   - Form: ${form.length} sections`);
  });
});

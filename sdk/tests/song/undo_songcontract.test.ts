/**
 * T056: Undo/Redo SongContract Test
 *
 * TDD Approach: Red -> Green -> Refactor
 * Tests undo/redo functionality for SongContract operations
 */

import { describe, it, expect, beforeEach } from "vitest";
import type {
  SongContractV1,
  RhythmSystem,
  MelodySystem,
  HarmonySystem,
  FormSystem,
  OrchestrationSystem,
  EnsembleModel,
  ConsoleModel,
  BindingModel,
  ConstraintModel,
  InstrumentAssignment,
  PresetAssignment,
} from "../../packages/sdk/src/song/song_contract";

// ============================================================================
// Test Fixtures
// ============================================================================

const createMinimalRhythmSystem = (): RhythmSystem => ({
  id: "rhythm-system-1",
  name: "Basic Rhythm",
  generators: [
    { period: 2, phaseOffset: 0 },
    { period: 3, phaseOffset: 0 },
  ],
  resultants: [
    {
      generatorIndex1: 0,
      generatorIndex2: 1,
      method: "interference",
    },
  ],
  permutations: [],
  density: {
    minDensity: 0.3,
    maxDensity: 0.8,
    gridResolution: 16,
  },
});

const createMinimalMelodySystem = (): MelodySystem => ({
  id: "melody-system-1",
  name: "Basic Melody",
  pitchCycle: {
    modulus: 12,
    rotation: 0,
  },
  intervalSeeds: [
    {
      intervals: [1, 2, 3, 4],
      ordered: true,
    },
  ],
  contour: {
    direction: "neutral",
    complexity: 0.5,
  },
  register: {
    minNote: 36,
    maxNote: 84,
  },
});

const createMinimalHarmonySystem = (): HarmonySystem => ({
  id: "harmony-system-1",
  name: "Basic Harmony",
  distribution: {
    intervals: [3, 4, 5, 6, 7],
    weights: [0.2, 0.2, 0.2, 0.2, 0.2],
  },
  chordClasses: [
    {
      intervals: [4, 7],
      inversions: [0, 1, 2],
    },
  ],
  voiceLeading: {
    maxMovement: 5,
    preferredMovement: 2,
  },
});

const createMinimalFormSystem = (): FormSystem => ({
  id: "form-system-1",
  name: "Binary Form",
  ratioTree: {
    ratios: [1, 1],
  },
  sections: [
    {
      id: "section-a",
      name: "Section A",
      ratioIndex: 0,
    },
    {
      id: "section-b",
      name: "Section B",
      ratioIndex: 1,
    },
  ],
  periodicity: [],
});

const createMinimalOrchestrationSystem = (): OrchestrationSystem => ({
  id: "orchestration-system-1",
  name: "Basic Orchestration",
  roleAssignments: [],
  spacing: {
    type: "close",
    parameters: {},
  },
  density: {
    weights: [1.0],
  },
});

const createMinimalEnsemble = (): EnsembleModel => ({
  version: "1.0",
  id: "ensemble-1",
  voices: [
    {
      id: "voice-1",
      name: "Voice 1",
      rolePools: [
        {
          role: "primary",
          functionalClass: "foundation",
          enabled: true,
        },
      ],
      groupIds: [],
    },
  ],
  voiceCount: 1,
  groups: [],
  balance: {
    priority: ["voice-1"],
    limits: {
      maxVoices: 1,
      maxPolyphony: 8,
    },
  },
});

const createMinimalConsole = (): ConsoleModel => ({
  version: "1.0",
  id: "console-1",
  voiceBusses: [],
  mixBusses: [],
  masterBus: {
    id: "master",
    name: "Master",
    type: "master",
    inserts: [],
    gain: 1.0,
    pan: 0,
    muted: false,
    solo: false,
  },
  sendEffects: [],
  routing: {
    routes: [],
  },
  metering: {
    enabled: true,
    refreshRate: 60,
    meterType: "peak",
    holdTime: 0.5,
  },
});

const createMinimalBindingModel = (): BindingModel => ({
  rhythmBindings: [],
  melodyBindings: [],
  harmonyBindings: [],
});

const createMinimalConstraintModel = (): ConstraintModel => ({
  constraints: [],
});

const createMinimalSongContract = (): SongContractV1 => ({
  version: "1.0",
  id: "song-contract-test-1",
  createdAt: Date.now(),
  modifiedAt: Date.now(),
  author: "test-author",
  name: "Test Song Contract",
  seed: 12345,
  ensemble: createMinimalEnsemble(),
  rhythmSystems: [createMinimalRhythmSystem()],
  melodySystems: [createMinimalMelodySystem()],
  harmonySystems: [createMinimalHarmonySystem()],
  formSystem: createMinimalFormSystem(),
  orchestrationSystems: [createMinimalOrchestrationSystem()],
  bindings: createMinimalBindingModel(),
  constraints: createMinimalConstraintModel(),
  instrumentAssignments: [],
  presetAssignments: [],
  console: createMinimalConsole(),
});

// ============================================================================
// Undo/Redo System Interface (TDD - to be implemented)
// ============================================================================

interface SongContractDiff {
  readonly version: "1.0";
  readonly diffId: string;
  readonly timestamp: number;
  readonly appliesTo: string;
  readonly beforeState: SongContractV1;
  readonly operations: DiffOperation[];
  readonly description?: string;
}

type DiffOperation =
  | { type: "addRhythmSystem"; system: RhythmSystem; index?: number }
  | { type: "removeRhythmSystem"; systemId: string }
  | { type: "updateRhythmSystem"; systemId: string; updates: Partial<RhythmSystem> }
  | { type: "addMelodySystem"; system: MelodySystem; index?: number }
  | { type: "removeMelodySystem"; systemId: string }
  | { type: "updateMelodySystem"; systemId: string; updates: Partial<MelodySystem> }
  | { type: "addHarmonySystem"; system: HarmonySystem; index?: number }
  | { type: "removeHarmonySystem"; systemId: string }
  | { type: "updateHarmonySystem"; systemId: string; updates: Partial<HarmonySystem> }
  | { type: "updateFormSystem"; updates: Partial<FormSystem> }
  | { type: "addOrchestrationSystem"; system: OrchestrationSystem; index?: number }
  | { type: "removeOrchestrationSystem"; systemId: string }
  | { type: "updateOrchestrationSystem"; systemId: string; updates: Partial<OrchestrationSystem> }
  | { type: "updateEnsemble"; updates: Partial<EnsembleModel> }
  | { type: "updateConsole"; updates: Partial<ConsoleModel> }
  | { type: "addInstrumentAssignment"; assignment: InstrumentAssignment }
  | { type: "removeInstrumentAssignment"; roleId: string }
  | { type: "addPresetAssignment"; assignment: PresetAssignment }
  | { type: "removePresetAssignment"; instrumentType: string };

interface SongContractUndoStack {
  readonly past: readonly SongContractDiff[];
  readonly present: SongContractV1;
  readonly future: readonly SongContractDiff[];
}

// Stub implementation - will fail tests until implemented
class SongContractUndoManager {
  private stack: SongContractUndoStack;

  constructor(initialState: SongContractV1) {
    this.stack = {
      past: [],
      present: initialState,
      future: [],
    };
  }

  // TDD: These methods will be implemented
  canUndo(): boolean {
    throw new Error("Not implemented: TDD test should fail");
  }

  canRedo(): boolean {
    throw new Error("Not implemented: TDD test should fail");
  }

  undo(): SongContractV1 {
    throw new Error("Not implemented: TDD test should fail");
  }

  redo(): SongContractV1 {
    throw new Error("Not implemented: TDD test should fail");
  }

  applyDiff(diff: SongContractDiff): SongContractV1 {
    throw new Error("Not implemented: TDD test should fail");
  }

  getCurrentState(): SongContractV1 {
    return this.stack.present;
  }

  getStack(): SongContractUndoStack {
    return this.stack;
  }
}

// ============================================================================
// Tests
// ============================================================================

describe.skip("Undo/Redo SongContract", () => {
  let contract: SongContractV1;
  let undoManager: SongContractUndoManager;

  beforeEach(() => {
    contract = createMinimalSongContract();
    undoManager = new SongContractUndoManager(contract);
  });

  describe("Initial State", () => {
    it("should have no undo history initially", () => {
      expect(undoManager.canUndo()).toBe(false);
    });

    it("should have no redo history initially", () => {
      expect(undoManager.canRedo()).toBe(false);
    });

    it("should have initial current state", () => {
      const current = undoManager.getCurrentState();
      expect(current.id).toBe(contract.id);
      expect(current.name).toBe(contract.name);
    });
  });

  describe("Undo Rhythm System Addition", () => {
    it("should undo rhythm system addition and restore exact JSON", () => {
      // Store original JSON
      const originalJson = JSON.stringify(contract);

      // Create diff for adding rhythm system
      const newRhythmSystem: RhythmSystem = {
        id: "rhythm-system-2",
        name: "Secondary Rhythm",
        generators: [
          { period: 5, phaseOffset: 0 },
          { period: 7, phaseOffset: 0 },
        ],
        resultants: [
          {
            generatorIndex1: 0,
            generatorIndex2: 1,
            method: "syncopation",
          },
        ],
        permutations: [
          {
            type: "rotation",
            amount: 1,
          },
        ],
        density: {
          minDensity: 0.4,
          maxDensity: 0.9,
          gridResolution: 8,
        },
      };

      const diff: SongContractDiff = {
        version: "1.0",
        diffId: "diff-add-rhythm-1",
        timestamp: Date.now(),
        appliesTo: contract.id,
        beforeState: contract,
        operations: [
          {
            type: "addRhythmSystem",
            system: newRhythmSystem,
          },
        ],
        description: "Add secondary rhythm system",
      };

      // Apply diff
      const updatedContract = undoManager.applyDiff(diff);

      // Verify rhythm system was added
      expect(updatedContract.rhythmSystems).toHaveLength(2);
      expect(updatedContract.rhythmSystems[1].id).toBe("rhythm-system-2");

      // Undo
      const restoredContract = undoManager.undo();

      // Verify exact JSON restoration
      expect(restoredContract.rhythmSystems).toHaveLength(1);
      expect(JSON.stringify(restoredContract)).toBe(originalJson);
    });

    it("should redo rhythm system addition", () => {
      const newRhythmSystem: RhythmSystem = {
        id: "rhythm-system-2",
        name: "Secondary Rhythm",
        generators: [
          { period: 5, phaseOffset: 0 },
        ],
        resultants: [],
        permutations: [],
        density: {
          minDensity: 0.4,
          maxDensity: 0.9,
          gridResolution: 8,
        },
      };

      const diff: SongContractDiff = {
        version: "1.0",
        diffId: "diff-add-rhythm-1",
        timestamp: Date.now(),
        appliesTo: contract.id,
        beforeState: contract,
        operations: [
          {
            type: "addRhythmSystem",
            system: newRhythmSystem,
          },
        ],
      };

      // Apply diff
      undoManager.applyDiff(diff);
      const stateAfterAdd = undoManager.getCurrentState();
      expect(stateAfterAdd.rhythmSystems).toHaveLength(2);

      // Undo
      undoManager.undo();
      expect(undoManager.getCurrentState().rhythmSystems).toHaveLength(1);

      // Redo
      const stateAfterRedo = undoManager.redo();

      // Verify rhythm system is back
      expect(stateAfterRedo.rhythmSystems).toHaveLength(2);
      expect(stateAfterRedo.rhythmSystems[1].id).toBe("rhythm-system-2");
    });
  });

  describe("Undo Melody System Addition", () => {
    it("should undo melody system addition and restore exact JSON", () => {
      const originalJson = JSON.stringify(contract);

      const newMelodySystem: MelodySystem = {
        id: "melody-system-2",
        name: "Secondary Melody",
        pitchCycle: {
          modulus: 7,
          rotation: 2,
        },
        intervalSeeds: [
          {
            intervals: [2, 3, 5],
            ordered: false,
          },
        ],
        contour: {
          direction: "ascending",
          complexity: 0.7,
        },
        register: {
          minNote: 48,
          maxNote: 72,
        },
      };

      const diff: SongContractDiff = {
        version: "1.0",
        diffId: "diff-add-melody-1",
        timestamp: Date.now(),
        appliesTo: contract.id,
        beforeState: contract,
        operations: [
          {
            type: "addMelodySystem",
            system: newMelodySystem,
          },
        ],
      };

      // Apply and undo
      undoManager.applyDiff(diff);
      const restored = undoManager.undo();

      // Verify exact restoration
      expect(JSON.stringify(restored)).toBe(originalJson);
      expect(restored.melodySystems).toHaveLength(1);
    });

    it("should redo melody system addition", () => {
      const newMelodySystem: MelodySystem = {
        id: "melody-system-2",
        name: "Secondary Melody",
        pitchCycle: { modulus: 7, rotation: 2 },
        intervalSeeds: [],
        contour: { direction: "neutral", complexity: 0.5 },
        register: { minNote: 48, maxNote: 72 },
      };

      const diff: SongContractDiff = {
        version: "1.0",
        diffId: "diff-add-melody-1",
        timestamp: Date.now(),
        appliesTo: contract.id,
        beforeState: contract,
        operations: [
          {
            type: "addMelodySystem",
            system: newMelodySystem,
          },
        ],
      };

      undoManager.applyDiff(diff);
      undoManager.undo();
      const stateAfterRedo = undoManager.redo();

      expect(stateAfterRedo.melodySystems).toHaveLength(2);
      expect(stateAfterRedo.melodySystems[1].id).toBe("melody-system-2");
    });
  });

  describe("Multiple Undo/Redo Cycles", () => {
    it("should handle multiple sequential undo operations", () => {
      const originalJson = JSON.stringify(contract);

      // Apply multiple diffs
      const diff1: SongContractDiff = {
        version: "1.0",
        diffId: "diff-1",
        timestamp: Date.now(),
        appliesTo: contract.id,
        beforeState: contract,
        operations: [
          {
            type: "addRhythmSystem",
            system: createMinimalRhythmSystem(),
          },
        ],
      };

      const diff2: SongContractDiff = {
        version: "1.0",
        diffId: "diff-2",
        timestamp: Date.now(),
        appliesTo: contract.id,
        beforeState: contract,
        operations: [
          {
            type: "addMelodySystem",
            system: createMinimalMelodySystem(),
          },
        ],
      };

      undoManager.applyDiff(diff1);
      undoManager.applyDiff(diff2);

      // Verify both applied
      expect(undoManager.getCurrentState().rhythmSystems).toHaveLength(2);
      expect(undoManager.getCurrentState().melodySystems).toHaveLength(2);

      // Undo both
      undoManager.undo();
      undoManager.undo();

      // Verify back to original
      expect(JSON.stringify(undoManager.getCurrentState())).toBe(originalJson);
    });

    it("should handle multiple sequential redo operations", () => {
      const diff1: SongContractDiff = {
        version: "1.0",
        diffId: "diff-1",
        timestamp: Date.now(),
        appliesTo: contract.id,
        beforeState: contract,
        operations: [
          {
            type: "addRhythmSystem",
            system: createMinimalRhythmSystem(),
          },
        ],
      };

      const diff2: SongContractDiff = {
        version: "1.0",
        diffId: "diff-2",
        timestamp: Date.now(),
        appliesTo: contract.id,
        beforeState: contract,
        operations: [
          {
            type: "addMelodySystem",
            system: createMinimalMelodySystem(),
          },
        ],
      };

      undoManager.applyDiff(diff1);
      undoManager.applyDiff(diff2);

      // Undo both
      undoManager.undo();
      undoManager.undo();

      // Redo both
      undoManager.redo();
      undoManager.redo();

      // Verify both restored
      expect(undoManager.getCurrentState().rhythmSystems).toHaveLength(2);
      expect(undoManager.getCurrentState().melodySystems).toHaveLength(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undo when no history available", () => {
      expect(undoManager.canUndo()).toBe(false);

      // Should throw or gracefully handle
      expect(() => {
        undoManager.undo();
      }).toThrow();
    });

    it("should handle redo when no future available", () => {
      expect(undoManager.canRedo()).toBe(false);

      // Should throw or gracefully handle
      expect(() => {
        undoManager.redo();
      }).toThrow();
    });

    it("should preserve immutability of original contract", () => {
      const diff: SongContractDiff = {
        version: "1.0",
        diffId: "diff-1",
        timestamp: Date.now(),
        appliesTo: contract.id,
        beforeState: contract,
        operations: [
          {
            type: "updateFormSystem",
            updates: {
              name: "Modified Form",
            },
          },
        ],
      };

      const updated = undoManager.applyDiff(diff);

      // Original should be unchanged
      expect(contract.formSystem.name).toBe("Binary Form");
      expect(updated.formSystem.name).toBe("Modified Form");
      expect(updated).not.toBe(contract);
    });
  });
});

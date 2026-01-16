/**
 * Undo System Comprehensive Tests
 *
 * Tests for:
 * - Diff Engine
 * - Undo Manager
 * - SongContract Undo Integration
 * - PerformanceState Undo Integration
 * - Coalescing
 * - Persistence
 * - Performance
 *
 * @module undo/__tests__/undo.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeDiff,
  applyDiffs,
  reverseDiffs,
  optimizeDiffs,
  compressDiffs,
  formatDiff,
  formatDiffSummary,
  analyzeDiffs,
  affectsPath,
  Diff
} from '../diff_engine.js';
import {
  UndoManager,
  createUndoManager,
  UndoResult
} from '../undo_manager.js';
import {
  createUndoManagerForSongContract
} from '../undo_songcontract.js';
import { SongContractV1 } from '../../song/song_contract.js';
import { PerformanceStateV1 } from '../../song/performance_state.js';

// ============================================================================
// Diff Engine Tests
// ============================================================================

describe('Diff Engine', () => {
  describe('Primitive Diff Computation', () => {
    it('should detect no changes in primitives', () => {
      const result = computeDiff(42, 42);

      expect(result.hasChanges).toBe(false);
      expect(result.diffs).toHaveLength(0);
    });

    it('should detect changes in primitives', () => {
      const result = computeDiff(42, 100);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0]).toMatchObject({
        path: '',
        op: 'update',
        oldValue: 42,
        newValue: 100
      });
    });

    it('should detect string changes', () => {
      const result = computeDiff('hello', 'world');

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0]).toMatchObject({
        op: 'update',
        oldValue: 'hello',
        newValue: 'world'
      });
    });

    it('should detect boolean changes', () => {
      const result = computeDiff(true, false);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0]).toMatchObject({
        oldValue: true,
        newValue: false
      });
    });
  });

  describe('Object Diff Computation', () => {
    it('should detect added properties', () => {
      const before = { a: 1 };
      const after = { a: 1, b: 2 };

      const result = computeDiff(before, after);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0]).toMatchObject({
        path: 'b',
        op: 'add',
        oldValue: undefined,
        newValue: 2
      });
    });

    it('should detect removed properties', () => {
      const before = { a: 1, b: 2 };
      const after = { a: 1 };

      const result = computeDiff(before, after);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0]).toMatchObject({
        path: 'b',
        op: 'remove',
        oldValue: 2,
        newValue: undefined
      });
    });

    it('should detect updated properties', () => {
      const before = { a: 1, b: 2 };
      const after = { a: 1, b: 3 };

      const result = computeDiff(before, after);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0]).toMatchObject({
        path: 'b',
        op: 'update',
        oldValue: 2,
        newValue: 3
      });
    });

    it('should detect nested object changes', () => {
      const before = { outer: { inner: 1 } };
      const after = { outer: { inner: 2 } };

      const result = computeDiff(before, after);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0]).toMatchObject({
        path: 'outer.inner',
        op: 'update',
        oldValue: 1,
        newValue: 2
      });
    });

    it('should handle multiple changes', () => {
      const before = { a: 1, b: 2, c: 3 };
      const after = { a: 1, b: 20, d: 4 };

      const result = computeDiff(before, after);

      expect(result.hasChanges).toBe(true);
      expect(result.changeCount).toBeGreaterThan(0);
      expect(result.diffs.some(d => d.path === 'b')).toBe(true);
      expect(result.diffs.some(d => d.path === 'c')).toBe(true);
      expect(result.diffs.some(d => d.path === 'd')).toBe(true);
    });
  });

  describe('Array Diff Computation', () => {
    it('should detect added array elements', () => {
      const before = [1, 2, 3];
      const after = [1, 2, 3, 4];

      const result = computeDiff(before, after);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs.some(d => d.op === 'add')).toBe(true);
    });

    it('should detect removed array elements', () => {
      const before = [1, 2, 3];
      const after = [1, 2];

      const result = computeDiff(before, after);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs.some(d => d.op === 'remove')).toBe(true);
    });

    it('should detect modified array elements', () => {
      const before = [1, 2, 3];
      const after = [1, 20, 3];

      const result = computeDiff(before, after);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0]).toMatchObject({
        path: '1',
        op: 'update',
        oldValue: 2,
        newValue: 20
      });
    });

    it('should handle array of objects', () => {
      const before = [{ id: 1, name: 'A' }];
      const after = [{ id: 1, name: 'B' }];

      const result = computeDiff(before, after);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0].path).toContain('0');
      expect(result.diffs[0].path).toContain('name');
    });
  });

  describe('Diff Application', () => {
    it('should apply single diff', () => {
      const base = { a: 1, b: 2 };
      const diffs: Diff[] = [
        { path: 'b', op: 'update', oldValue: 2, newValue: 3 }
      ];

      const result = applyDiffs(base, diffs);

      expect(result).toEqual({ a: 1, b: 3 });
    });

    it('should apply multiple diffs', () => {
      const base = { a: 1, b: 2, c: 3 };
      const diffs: Diff[] = [
        { path: 'b', op: 'update', oldValue: 2, newValue: 20 },
        { path: 'c', op: 'update', oldValue: 3, newValue: 30 }
      ];

      const result = applyDiffs(base, diffs);

      expect(result).toEqual({ a: 1, b: 20, c: 30 });
    });

    it('should apply nested diffs', () => {
      const base = { outer: { inner: 1 } };
      const diffs: Diff[] = [
        { path: 'outer.inner', op: 'update', oldValue: 1, newValue: 2 }
      ];

      const result = applyDiffs(base, diffs);

      expect(result).toEqual({ outer: { inner: 2 } });
    });

    it('should apply array element diffs', () => {
      const base = { arr: [1, 2, 3] };
      const diffs: Diff[] = [
        { path: 'arr.1', op: 'update', oldValue: 2, newValue: 20 }
      ];

      const result = applyDiffs(base, diffs);

      expect(result).toEqual({ arr: [1, 20, 3] });
    });

    it('should not mutate original object', () => {
      const base = { a: 1, b: 2 };
      const diffs: Diff[] = [
        { path: 'b', op: 'update', oldValue: 2, newValue: 3 }
      ];

      const result = applyDiffs(base, diffs);

      expect(base.b).toBe(2); // Original unchanged
      expect(result.b).toBe(3); // Result updated
      expect(result).not.toBe(base); // Different reference
    });
  });

  describe('Diff Reversal', () => {
    it('should reverse update diff', () => {
      const diffs: Diff[] = [
        { path: 'a', op: 'update', oldValue: 1, newValue: 2 }
      ];

      const reversed = reverseDiffs(diffs);

      expect(reversed[0]).toMatchObject({
        path: 'a',
        op: 'update',
        oldValue: 2,
        newValue: 1
      });
    });

    it('should reverse add diff', () => {
      const diffs: Diff[] = [
        { path: 'a', op: 'add', oldValue: undefined, newValue: 1 }
      ];

      const reversed = reverseDiffs(diffs);

      expect(reversed[0]).toMatchObject({
        path: 'a',
        op: 'remove',
        oldValue: 1,
        newValue: undefined
      });
    });

    it('should reverse remove diff', () => {
      const diffs: Diff[] = [
        { path: 'a', op: 'remove', oldValue: 1, newValue: undefined }
      ];

      const reversed = reverseDiffs(diffs);

      expect(reversed[0]).toMatchObject({
        path: 'a',
        op: 'add',
        oldValue: undefined,
        newValue: 1
      });
    });

    it('should reverse multiple diffs', () => {
      const diffs: Diff[] = [
        { path: 'a', op: 'update', oldValue: 1, newValue: 2 },
        { path: 'b', op: 'add', oldValue: undefined, newValue: 3 },
        { path: 'c', op: 'remove', oldValue: 4, newValue: undefined }
      ];

      const reversed = reverseDiffs(diffs);

      expect(reversed).toHaveLength(3);
      expect(reversed[0].oldValue).toBe(2);
      expect(reversed[1].op).toBe('remove');
      expect(reversed[2].op).toBe('add');
    });
  });

  describe('Diff Optimization', () => {
    it('should optimize multiple changes to same path', () => {
      const diffs: Diff[] = [
        { path: 'a', op: 'update', oldValue: 1, newValue: 2 },
        { path: 'a', op: 'update', oldValue: 2, newValue: 3 }
      ];

      const optimized = optimizeDiffs(diffs);

      expect(optimized).toHaveLength(1);
      expect(optimized[0].newValue).toBe(3);
    });

    it('should not optimize different paths', () => {
      const diffs: Diff[] = [
        { path: 'a', op: 'update', oldValue: 1, newValue: 2 },
        { path: 'b', op: 'update', oldValue: 3, newValue: 4 }
      ];

      const optimized = optimizeDiffs(diffs);

      expect(optimized).toHaveLength(2);
    });
  });

  describe('Diff Compression', () => {
    it('should remove add+remove pairs', () => {
      const diffs: Diff[] = [
        { path: 'a', op: 'add', oldValue: undefined, newValue: 1 },
        { path: 'a', op: 'remove', oldValue: 1, newValue: undefined }
      ];

      const compressed = compressDiffs(diffs);

      expect(compressed).toHaveLength(0);
    });

    it('should keep standalone operations', () => {
      const diffs: Diff[] = [
        { path: 'a', op: 'add', oldValue: undefined, newValue: 1 }
      ];

      const compressed = compressDiffs(diffs);

      expect(compressed).toHaveLength(1);
    });
  });

  describe('Diff Analysis', () => {
    it('should analyze empty diffs', () => {
      const analysis = analyzeDiffs([]);

      expect(analysis.total).toBe(0);
      expect(analysis.byOperation.add).toBe(0);
      expect(analysis.byOperation.remove).toBe(0);
      expect(analysis.byOperation.update).toBe(0);
      expect(analysis.byOperation.replace).toBe(0);
    });

    it('should analyze mixed diffs', () => {
      const diffs: Diff[] = [
        { path: 'a', op: 'add', oldValue: undefined, newValue: 1 },
        { path: 'b', op: 'remove', oldValue: 2, newValue: undefined },
        { path: 'c', op: 'update', oldValue: 3, newValue: 4 }
      ];

      const analysis = analyzeDiffs(diffs);

      expect(analysis.total).toBe(3);
      expect(analysis.byOperation.add).toBe(1);
      expect(analysis.byOperation.remove).toBe(1);
      expect(analysis.byOperation.update).toBe(1);
      expect(analysis.affectedPaths).toContain('a');
      expect(analysis.affectedPaths).toContain('b');
      expect(analysis.affectedPaths).toContain('c');
    });
  });

  describe('Diff Formatting', () => {
    it('should format add diff', () => {
      const diff: Diff = {
        path: 'a',
        op: 'add',
        oldValue: undefined,
        newValue: 1
      };

      const formatted = formatDiff(diff);

      expect(formatted).toContain('Added');
      expect(formatted).toContain('a');
      expect(formatted).toContain('1');
    });

    it('should format update diff', () => {
      const diff: Diff = {
        path: 'tempo',
        op: 'update',
        oldValue: 120,
        newValue: 140
      };

      const formatted = formatDiff(diff);

      expect(formatted).toContain('Changed');
      expect(formatted).toContain('tempo');
      expect(formatted).toContain('120');
      expect(formatted).toContain('140');
    });

    it('should format diff summary', () => {
      const diffs: Diff[] = [
        { path: 'a', op: 'add', oldValue: undefined, newValue: 1 },
        { path: 'b', op: 'update', oldValue: 2, newValue: 3 }
      ];

      const summary = formatDiffSummary(diffs);

      expect(summary).toContain('2');
      expect(summary).toContain('added');
      expect(summary).toContain('updated');
    });
  });

  describe('Path Matching', () => {
    it('should match exact path', () => {
      const diffs: Diff[] = [
        { path: 'rhythmSystems.0.period', op: 'update', oldValue: 4, newValue: 8 }
      ];

      const matches = affectsPath(diffs, 'rhythmSystems.0.period');

      expect(matches).toBe(true);
    });

    it('should match prefix path', () => {
      const diffs: Diff[] = [
        { path: 'rhythmSystems.0.period', op: 'update', oldValue: 4, newValue: 8 }
      ];

      const matches = affectsPath(diffs, 'rhythmSystems');

      expect(matches).toBe(true);
    });

    it('should not match different path', () => {
      const diffs: Diff[] = [
        { path: 'melodySystems.0.pitchCycle', op: 'update', oldValue: 12, newValue: 24 }
      ];

      const matches = affectsPath(diffs, 'rhythmSystems');

      expect(matches).toBe(false);
    });
  });
});

// ============================================================================
// Undo Manager Tests
// ============================================================================

describe('Undo Manager', () => {
  let manager: UndoManager<Record<string, unknown>>;
  let initialState: Record<string, unknown>;

  beforeEach(() => {
    initialState = {
      name: 'Test Song',
      tempo: 120,
      rhythmSystems: [{ id: 'rs1', period: 4 }]
    };
    manager = createUndoManager(initialState, { maxEntries: 100, enableCoalescing: false });
  });

  describe('State Management', () => {
    it('should get initial state', () => {
      const state = manager.getCurrentState();

      expect(state).toEqual(initialState);
    });

    it('should update state and record change', () => {
      const newState = { ...initialState, tempo: 140 };

      manager.setState(newState, 'Change tempo to 140');

      const currentState = manager.getCurrentState();
      expect(currentState.tempo).toBe(140);
    });

    it('should not record change if no differences', () => {
      const newState = { ...initialState };

      manager.setState(newState, 'No change');

      const history = manager.getHistory();
      // Should only have initial state entry
      expect(history.length).toBe(1);
    });
  });

  describe('Undo Operations', () => {
    it('should undo state change', () => {
      const newState = { ...initialState, tempo: 140 };
      manager.setState(newState, 'Change tempo');

      const result = manager.undo();

      expect(result.success).toBe(true);
      expect(manager.getCurrentState().tempo).toBe(120);
    });

    it('should fail to undo when at beginning', () => {
      const result = manager.undo();

      expect(result.success).toBe(false);
      expect(result.error).toContain('beginning');
    });

    it('should undo multiple changes', () => {
      manager.setState({ ...initialState, tempo: 130 }, 'Change 1');
      manager.setState({ ...initialState, tempo: 140 }, 'Change 2');
      manager.setState({ ...initialState, tempo: 150 }, 'Change 3');

      expect(manager.getCurrentState().tempo).toBe(150);

      manager.undo();
      expect(manager.getCurrentState().tempo).toBe(140);

      manager.undo();
      expect(manager.getCurrentState().tempo).toBe(130);

      manager.undo();
      expect(manager.getCurrentState().tempo).toBe(120);
    });
  });

  describe('Redo Operations', () => {
    it('should redo undone change', () => {
      const newState = { ...initialState, tempo: 140 };
      manager.setState(newState, 'Change tempo');

      manager.undo();
      expect(manager.getCurrentState().tempo).toBe(120);

      const result = manager.redo();
      expect(result.success).toBe(true);
      expect(manager.getCurrentState().tempo).toBe(140);
    });

    it('should fail to redo when at end', () => {
      const result = manager.redo();

      expect(result.success).toBe(false);
      expect(result.error).toContain('end');
    });

    it('should redo multiple changes', () => {
      manager.setState({ ...initialState, tempo: 130 }, 'Change 1');
      manager.setState({ ...initialState, tempo: 140 }, 'Change 2');
      manager.setState({ ...initialState, tempo: 150 }, 'Change 3');

      // Undo all
      manager.undo();
      manager.undo();
      manager.undo();

      expect(manager.getCurrentState().tempo).toBe(120);

      // Redo all
      manager.redo();
      expect(manager.getCurrentState().tempo).toBe(130);

      manager.redo();
      expect(manager.getCurrentState().tempo).toBe(140);

      manager.redo();
      expect(manager.getCurrentState().tempo).toBe(150);
    });
  });

  describe('History Navigation', () => {
    it('should jump to specific history entry', () => {
      manager.setState({ ...initialState, tempo: 130 }, 'Change 1');
      manager.setState({ ...initialState, tempo: 140 }, 'Change 2');
      manager.setState({ ...initialState, tempo: 150 }, 'Change 3');

      const result = manager.jumpTo(1); // Jump to second entry (index 1)

      expect(result.success).toBe(true);
    });

    it('should fail to jump to invalid index', () => {
      const result = manager.jumpTo(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('out of bounds');
    });
  });

  describe('Query Methods', () => {
    it('should report canUndo correctly', () => {
      expect(manager.canUndo()).toBe(false);

      manager.setState({ ...initialState, tempo: 140 }, 'Change');

      expect(manager.canUndo()).toBe(true);

      manager.undo();

      expect(manager.canUndo()).toBe(false);
    });

    it('should report canRedo correctly', () => {
      expect(manager.canRedo()).toBe(false);

      manager.setState({ ...initialState, tempo: 140 }, 'Change');
      manager.undo();

      expect(manager.canRedo()).toBe(true);

      manager.redo();

      expect(manager.canRedo()).toBe(false);
    });

    it('should get current index', () => {
      expect(manager.getCurrentIndex()).toBe(0); // At initial state

      manager.setState({ ...initialState, tempo: 140 }, 'Change');

      expect(manager.getCurrentIndex()).toBe(1); // Moved to new state
    });

    it('should get history', () => {
      manager.setState({ ...initialState, tempo: 130 }, 'Change 1');
      manager.setState({ ...initialState, tempo: 140 }, 'Change 2');

      const history = manager.getHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should search history', () => {
      manager.setState({ ...initialState, tempo: 140 }, 'Change tempo');

      const results = manager.searchHistory('tempo');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].description).toContain('tempo');
    });
  });

  describe('History Management', () => {
    it('should clear history', () => {
      manager.setState({ ...initialState, tempo: 140 }, 'Change');
      expect(manager.canUndo()).toBe(true);

      manager.clear();

      expect(manager.canUndo()).toBe(false);
      expect(manager.getHistory().length).toBe(0); // History is empty
    });

    it('should set max entries', () => {
      manager.setMaxEntries(5);

      // Add 10 changes
      for (let i = 0; i < 10; i++) {
        manager.setState({ ...initialState, tempo: 120 + i }, `Change ${i}`);
      }

      // Should only keep 5 entries
      expect(manager.getHistory().length).toBeLessThanOrEqual(5);
    });
  });

  describe('Persistence', () => {
    it('should serialize history', () => {
      manager.setState({ ...initialState, tempo: 140 }, 'Change');

      const serialized = manager.serialize();

      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('"version"');
    });

    it('should deserialize history', () => {
      manager.setState({ ...initialState, tempo: 140 }, 'Change');
      const serialized = manager.serialize();

      const newManager = createUndoManager(initialState);
      newManager.deserialize(serialized, initialState);

      expect(newManager.canUndo()).toBe(true);
    });
  });
});

// ============================================================================
// SongContract Undo Manager Tests
// ============================================================================

describe('SongContract Undo Manager', () => {
  let manager: SongContractUndoManager;
  let initialContract: SongContractV1;

  beforeEach(() => {
    // Create a minimal SongContract for testing
    initialContract = {
      version: '1.0',
      id: 'test-contract',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      author: 'test',
      name: 'Test Song',
      seed: 12345,
      ensemble: {
        version: '1.0',
        id: 'ensemble-1',
        voices: [],
        voiceCount: 0,
        groups: [],
        balance: { priority: [], limits: { maxVoices: 16, maxPolyphony: 32 } }
      },
      rhythmSystems: [{
        id: 'rs-1',
        name: 'Rhythm 1',
        generators: [{ period: 4, phaseOffset: 0 }],
        resultants: [],
        permutations: [],
        density: { minDensity: 0.3, maxDensity: 0.7, gridResolution: 16 }
      }],
      melodySystems: [{
        id: 'ms-1',
        name: 'Melody 1',
        pitchCycle: { modulus: 12, rotation: 0 },
        intervalSeeds: [{ intervals: [1, 2, 3] }],
        contour: { direction: 'ascending', complexity: 0.5 },
        register: { minNote: 36, maxNote: 84 }
      }],
      harmonySystems: [{
        id: 'hs-1',
        name: 'Harmony 1',
        distribution: { intervals: [1, 2], weights: [1, 1] },
        chordClasses: [{ intervals: [0, 4, 7], inversions: [0, 1, 2] }],
        voiceLeading: { maxMovement: 12, preferredMovement: 2 }
      }],
      formSystem: {
        id: 'fs-1',
        name: 'Form 1',
        ratioTree: { ratios: [1, 1] },
        sections: [],
        periodicity: []
      },
      orchestrationSystems: [{
        id: 'os-1',
        name: 'Orchestration 1',
        roleAssignments: [],
        spacing: { type: 'close', parameters: {} },
        density: { weights: [1] }
      }],
      bindings: {
        rhythmBindings: [],
        melodyBindings: [],
        harmonyBindings: []
      },
      constraints: { constraints: [] },
      instrumentAssignments: [],
      presetAssignments: [],
      console: {
        version: '1.0',
        id: 'console-1',
        voiceBusses: [],
        mixBusses: [],
        masterBus: {
          id: 'master',
          name: 'Master',
          type: 'master',
          inserts: [],
          gain: 1.0,
          pan: 0.0,
          muted: false,
          solo: false
        },
        sendEffects: [],
        routing: { routes: [] },
        metering: { enabled: true, refreshRate: 60, meterType: 'both', holdTime: 0.5 }
      }
    };

    manager = createUndoManagerForSongContract(initialContract);
  });

  describe('State Management', () => {
    it('should get initial contract', () => {
      const contract = manager.getCurrentContract();

      expect(contract).toEqual(initialContract);
    });

    it('should set contract and record change', () => {
      const newContract = { ...initialContract, name: 'Updated Song' };

      manager.setContract(newContract, 'Update song name');

      const current = manager.getCurrentContract();
      expect(current.name).toBe('Updated Song');
    });
  });

  describe('High-Level Operations', () => {
    it('should add rhythm system', () => {
      const newSystem = {
        id: 'rs-new',
        name: 'New Rhythm',
        generators: [{ period: 8, phaseOffset: 0 }],
        resultants: [],
        permutations: [],
        density: { minDensity: 0.3, maxDensity: 0.7, gridResolution: 16 }
      };

      const updated = manager.addRhythmSystem(newSystem);

      expect(updated.rhythmSystems.length).toBe(initialContract.rhythmSystems.length + 1);
      expect(manager.canUndo()).toBe(true);
    });

    it('should remove rhythm system', () => {
      const systemId = initialContract.rhythmSystems[0].id;

      const updated = manager.removeRhythmSystem(systemId);

      expect(updated).toBeDefined();
      expect(updated?.rhythmSystems.length).toBe(initialContract.rhythmSystems.length - 1);
    });

    it('should update rhythm system', () => {
      const systemId = initialContract.rhythmSystems[0].id;

      const updated = manager.updateRhythmSystem(systemId, { name: 'Updated Rhythm' });

      expect(updated).toBeDefined();
      expect(updated?.rhythmSystems[0].name).toBe('Updated Rhythm');
    });

    it('should add melody system', () => {
      const newSystem = {
        id: 'ms-new',
        name: 'New Melody',
        pitchCycle: { modulus: 12, rotation: 0 },
        intervalSeeds: [{ intervals: [1, 2, 3] }],
        contour: { direction: 'ascending' as const, complexity: 0.5 },
        register: { minNote: 36, maxNote: 84 }
      };

      const updated = manager.addMelodySystem(newSystem);

      expect(updated.melodySystems.length).toBe(initialContract.melodySystems.length + 1);
    });
  });

  describe('Undo/Redo', () => {
    it('should undo rhythm system addition', () => {
      const newSystem = {
        id: 'rs-new',
        name: 'New Rhythm',
        generators: [{ period: 8, phaseOffset: 0 }],
        resultants: [],
        permutations: [],
        density: { minDensity: 0.3, maxDensity: 0.7, gridResolution: 16 }
      };

      manager.addRhythmSystem(newSystem);
      expect(manager.getCurrentContract().rhythmSystems.length).toBe(2);

      const result = manager.undo();
      expect(result.success).toBe(true);
      expect(manager.getCurrentContract().rhythmSystems.length).toBe(1);
    });

    it('should redo rhythm system addition', () => {
      const newSystem = {
        id: 'rs-new',
        name: 'New Rhythm',
        generators: [{ period: 8, phaseOffset: 0 }],
        resultants: [],
        permutations: [],
        density: { minDensity: 0.3, maxDensity: 0.7, gridResolution: 16 }
      };

      manager.addRhythmSystem(newSystem);
      manager.undo();

      const result = manager.redo();
      expect(result.success).toBe(true);
      expect(manager.getCurrentContract().rhythmSystems.length).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should get statistics', () => {
      manager.addRhythmSystem({
        id: 'rs-new',
        name: 'New Rhythm',
        generators: [{ period: 8, phaseOffset: 0 }],
        resultants: [],
        permutations: [],
        density: { minDensity: 0.3, maxDensity: 0.7, gridResolution: 16 }
      });

      const stats = manager.getStats();

      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.canUndo).toBe(true);
    });
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Undo System Performance', () => {
  it('should complete undo in <16ms', () => {
    const initialState = { value: 0 };
    const manager = createUndoManager(initialState);

    // Make 100 changes
    for (let i = 0; i < 100; i++) {
      manager.setState({ value: i }, `Change ${i}`);
    }

    const start = performance.now();
    manager.undo();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(16);
  });

  it('should complete redo in <16ms', () => {
    const initialState = { value: 0 };
    const manager = createUndoManager(initialState);

    manager.setState({ value: 1 }, 'Change');
    manager.undo();

    const start = performance.now();
    manager.redo();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(16);
  });

  it('should handle large history efficiently', () => {
    const initialState = { value: 0 };
    const manager = createUndoManager(initialState, { maxEntries: 1000 });

    // Add 1000 entries
    for (let i = 0; i < 1000; i++) {
      manager.setState({ value: i }, `Change ${i}`);
    }

    const stats = manager.getStats();

    expect(stats.totalEntries).toBeLessThanOrEqual(1000);
    expect(manager.canUndo()).toBe(true);
  });
});

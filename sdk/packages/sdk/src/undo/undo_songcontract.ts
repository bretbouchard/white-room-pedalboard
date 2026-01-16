/**
 * SongContract Undo Integration
 *
 * Provides high-level undo/redo operations specifically for SongContract.
 * Wraps the generic UndoManager with SongContract-specific utilities.
 *
 * @module undo/undo_songcontract
 */

import { SongContractV1 } from '../song/song_contract.js';
import {
  UndoManager,
  createUndoManager as createGenericUndoManager,
  UndoResult,
  UndoManagerOptions,
  UndoStats
} from './undo_manager.js';
import { Diff, computeDiff, applyDiffs } from './diff_engine.js';
import { generateId } from '../song/ids.js';

// ============================================================================
// SongContract Undo Manager
// ============================================================================

/**
 * SongContract-specific undo manager
 *
 * Provides:
 * - Automatic SongContract change tracking
 * - Type-safe undo/redo operations
 * - SongContract-specific utilities
 * - Performance state integration
 */
export class SongContractUndoManager {
  private undoManager: UndoManager<SongContractV1>;

  constructor(initialContract: SongContractV1, options?: UndoManagerOptions) {
    this.undoManager = createGenericUndoManager(initialContract, {
      ...options,
      targetId: initialContract.id
    });
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Get current SongContract
   */
  getCurrentContract(): SongContractV1 {
    return this.undoManager.getCurrentState() as SongContractV1;
  }

  /**
   * Update SongContract and record change
   *
   * @param newContract - Modified contract
   * @param description - Change description
   * @param author - Optional author ID
   */
  setContract(
    newContract: SongContractV1,
    description: string,
    author?: string
  ): void {
    this.undoManager.setState(newContract, description, author);
  }

  /**
   * Record a specific change to the contract
   *
   * Use this when you want to manually record a change with specific diffs.
   *
   * @param description - Change description
   * @param diffs - Diffs to apply
   * @param before - State before change
   * @param after - State after change
   * @param author - Optional author ID
   */
  recordChange(
    description: string,
    diffs: Diff[],
    before: SongContractV1,
    after: SongContractV1,
    author?: string
  ): void {
    this.undoManager.recordChange(description, diffs, before, after, author);
  }

  // ==========================================================================
  // High-Level Operations
  // ==========================================================================

  /**
   * Add rhythm system to contract
   *
   * @param rhythmSystem - Rhythm system to add
   * @param author - Optional author ID
   * @returns Updated contract
   */
  addRhythmSystem(
    rhythmSystem: SongContractV1['rhythmSystems'][0],
    author?: string
  ): SongContractV1 {
    const before = this.getCurrentContract();
    const after: SongContractV1 = {
      ...before,
      modifiedAt: Date.now(),
      rhythmSystems: [...before.rhythmSystems, rhythmSystem]
    };

    const diffs = computeDiff(before, after).diffs;
    this.recordChange('Add rhythm system', diffs, before, after, author);

    return after;
  }

  /**
   * Remove rhythm system from contract
   *
   * @param systemId - ID of rhythm system to remove
   * @param author - Optional author ID
   * @returns Updated contract or undefined if not found
   */
  removeRhythmSystem(systemId: string, author?: string): SongContractV1 | undefined {
    const before = this.getCurrentContract();
    const index = before.rhythmSystems.findIndex(rs => rs.id === systemId);

    if (index === -1) {
      return undefined;
    }

    const after: SongContractV1 = {
      ...before,
      modifiedAt: Date.now(),
      rhythmSystems: before.rhythmSystems.filter(rs => rs.id !== systemId)
    };

    const diffs = computeDiff(before, after).diffs;
    this.recordChange('Remove rhythm system', diffs, before, after, author);

    return after;
  }

  /**
   * Update rhythm system in contract
   *
   * @param systemId - ID of rhythm system to update
   * @param updates - Partial updates to apply
   * @param author - Optional author ID
   * @returns Updated contract or undefined if not found
   */
  updateRhythmSystem(
    systemId: string,
    updates: Partial<SongContractV1['rhythmSystems'][0]>,
    author?: string
  ): SongContractV1 | undefined {
    const before = this.getCurrentContract();
    const index = before.rhythmSystems.findIndex(rs => rs.id === systemId);

    if (index === -1) {
      return undefined;
    }

    const updatedSystems = [...before.rhythmSystems];
    updatedSystems[index] = {
      ...updatedSystems[index],
      ...updates
    };

    const after: SongContractV1 = {
      ...before,
      modifiedAt: Date.now(),
      rhythmSystems: updatedSystems
    };

    const diffs = computeDiff(before, after).diffs;
    this.recordChange(`Update rhythm system: ${systemId}`, diffs, before, after, author);

    return after;
  }

  /**
   * Add melody system to contract
   *
   * @param melodySystem - Melody system to add
   * @param author - Optional author ID
   * @returns Updated contract
   */
  addMelodySystem(
    melodySystem: SongContractV1['melodySystems'][0],
    author?: string
  ): SongContractV1 {
    const before = this.getCurrentContract();
    const after: SongContractV1 = {
      ...before,
      modifiedAt: Date.now(),
      melodySystems: [...before.melodySystems, melodySystem]
    };

    const diffs = computeDiff(before, after).diffs;
    this.recordChange('Add melody system', diffs, before, after, author);

    return after;
  }

  /**
   * Update ensemble configuration
   *
   * @param updates - Partial ensemble updates
   * @param author - Optional author ID
   * @returns Updated contract
   */
  updateEnsemble(
    updates: Partial<SongContractV1['ensemble']>,
    author?: string
  ): SongContractV1 {
    const before = this.getCurrentContract();
    const after: SongContractV1 = {
      ...before,
      modifiedAt: Date.now(),
      ensemble: { ...before.ensemble, ...updates }
    };

    const diffs = computeDiff(before, after).diffs;
    this.recordChange('Update ensemble configuration', diffs, before, after, author);

    return after;
  }

  /**
   * Update form system
   *
   * @param updates - Partial form system updates
   * @param author - Optional author ID
   * @returns Updated contract
   */
  updateFormSystem(
    updates: Partial<SongContractV1['formSystem']>,
    author?: string
  ): SongContractV1 {
    const before = this.getCurrentContract();
    const after: SongContractV1 = {
      ...before,
      modifiedAt: Date.now(),
      formSystem: { ...before.formSystem, ...updates }
    };

    const diffs = computeDiff(before, after).diffs;
    this.recordChange('Update form system', diffs, before, after, author);

    return after;
  }

  /**
   * Update console configuration
   *
   * @param updates - Partial console updates
   * @param author - Optional author ID
   * @returns Updated contract
   */
  updateConsole(
    updates: Partial<SongContractV1['console']>,
    author?: string
  ): SongContractV1 {
    const before = this.getCurrentContract();
    const after: SongContractV1 = {
      ...before,
      modifiedAt: Date.now(),
      console: { ...before.console, ...updates }
    };

    const diffs = computeDiff(before, after).diffs;
    this.recordChange('Update console configuration', diffs, before, after, author);

    return after;
  }

  // ==========================================================================
  // Undo/Redo Operations
  // ==========================================================================

  /**
   * Undo last change
   *
   * @returns Undo result with previous contract
   */
  undo(): UndoResult {
    const result = this.undoManager.undo();

    if (result.success && result.state) {
      result.state = result.state as SongContractV1;
    }

    return result;
  }

  /**
   * Redo next change
   *
   * @returns Redo result with next contract
   */
  redo(): UndoResult {
    const result = this.undoManager.redo();

    if (result.success && result.state) {
      result.state = result.state as SongContractV1;
    }

    return result;
  }

  /**
   * Jump to specific history entry
   *
   * @param index - History index to jump to
   * @returns Navigation result
   */
  jumpTo(index: number): UndoResult {
    const result = this.undoManager.jumpTo(index);

    if (result.success && result.state) {
      result.state = result.state as SongContractV1;
    }

    return result;
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoManager.canUndo();
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.undoManager.canRedo();
  }

  /**
   * Get current history position
   */
  getCurrentIndex(): number {
    return this.undoManager.getCurrentIndex();
  }

  /**
   * Get full history
   */
  getHistory() {
    return this.undoManager.getHistory();
  }

  /**
   * Get statistics
   */
  getStats(): UndoStats {
    return this.undoManager.getStats();
  }

  /**
   * Search history
   *
   * @param query - Search query
   * @returns Matching entries
   */
  searchHistory(query: string) {
    return this.undoManager.searchHistory(query);
  }

  // ==========================================================================
  // History Management
  // ==========================================================================

  /**
   * Clear all history
   */
  clear(): void {
    this.undoManager.clear();
  }

  /**
   * Set maximum history size
   *
   * @param maxEntries - New maximum
   */
  setMaxEntries(maxEntries: number): void {
    this.undoManager.setMaxEntries(maxEntries);
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  /**
   * Serialize history to JSON
   */
  serialize(): string {
    return this.undoManager.serialize();
  }

  /**
   * Deserialize history from JSON
   *
   * @param data - Serialized history
   * @param currentContract - Current contract state
   */
  deserialize(data: string, currentContract: SongContractV1): void {
    this.undoManager.deserialize(data, currentContract);
  }

  // ==========================================================================
  // Coalescing
  // ==========================================================================

  /**
   * Begin coalescing rapid changes
   *
   * Call this before performing multiple rapid changes to the same property.
   */
  beginCoalescing(): void {
    // Coalescing is handled automatically by the undo manager
    // This method is provided for API compatibility
  }

  /**
   * End coalescing and flush pending changes
   */
  endCoalescing(): void {
    // Flush any pending coalesced changes
    this.undoManager['flushPendingChanges']();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create SongContract undo manager
 *
 * @param initialContract - Initial contract state
 * @param options - Configuration options
 * @returns Configured undo manager
 */
export function createUndoManagerForSongContract(
  initialContract: SongContractV1,
  options?: UndoManagerOptions
): SongContractUndoManager {
  return new SongContractUndoManager(initialContract, options);
}

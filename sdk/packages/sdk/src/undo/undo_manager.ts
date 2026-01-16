/**
 * Undo Manager - High-level undo/redo management for SongContract and PerformanceState
 *
 * Provides a complete undo/redo system with:
 * - Automatic change tracking
 * - History navigation
 * - State persistence
 * - Change coalescing for rapid edits
 * - Memory-efficient diff storage
 *
 * @module undo/undo_manager
 */

import {
  computeDiff,
  applyDiffs,
  reverseDiffs,
  optimizeDiffs,
  compressDiffs,
  formatDiffSummary,
  Diff,
  DiffResult
} from './diff_engine.js';
import { UndoHistory, HistoryEntry, createChange } from '../song/undo_history.js';
import { now, generateId } from '../song/ids.js';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Result of an undo/redo operation
 */
export interface UndoResult {
  /** Whether the operation succeeded */
  success: boolean;

  /** Current state after operation */
  state?: unknown;

  /** Error message if failed */
  error?: string;

  /** Description of what was undone/redone */
  description?: string;
}

/**
 * Options for undo manager configuration
 */
export interface UndoManagerOptions {
  /** Maximum number of history entries (default: 100) */
  maxEntries?: number;

  /** Target ID for this undo manager */
  targetId?: string;

  /** Enable change coalescing for rapid edits (default: true) */
  enableCoalescing?: boolean;

  /** Coalescing window in milliseconds (default: 1000ms) */
  coalescingWindow?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Statistics about undo history
 */
export interface UndoStats {
  totalEntries: number;
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  maxEntries: number;
  targetId: string;
  oldestEntry?: number;
  newestEntry?: number;
}

// ============================================================================
// Undo Manager
// ============================================================================

/**
 * Manages undo/redo state for SongContract or PerformanceState
 *
 * Features:
 * - Automatic diff computation
 * - Efficient history storage
 * - State navigation
 * - Change coalescing
 * - Persistence support
 */
export class UndoManager<T extends Record<string, unknown>> {
  private history: UndoHistory;
  private currentState: T;
  private enableCoalescing: boolean;
  private coalescingWindow: number;
  private debug: boolean;
  private lastChangeTime: number = 0;
  private pendingChanges: Diff[] = [];

  constructor(initialState: T, options: UndoManagerOptions = {}) {
    this.currentState = JSON.parse(JSON.stringify(initialState)) as T;
    this.enableCoalescing = options.enableCoalescing ?? true;
    this.coalescingWindow = options.coalescingWindow ?? 1000;
    this.debug = options.debug ?? false;

    // Create undo history
    const maxEntries = options.maxEntries ?? 100;
    if (options.targetId) {
      this.history = new UndoHistory(options.targetId, maxEntries);
    } else {
      this.history = new UndoHistory(maxEntries);
    }

    // Add initial state entry to establish the starting point
    // We use a dummy change to satisfy validation, but it represents no actual change
    const initialEntry: HistoryEntry = {
      id: generateId(),
      timestamp: now(),
      description: 'Initial state',
      changes: [{
        path: '',
        type: 'update',
        oldValue: initialState,
        newValue: initialState
      }],
      beforeState: initialState,
      afterState: initialState
    };
    this.history.addEntry(initialEntry);

    if (this.debug) {
      console.log('[UndoManager] Initialized with options:', options);
    }
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Get current state
   */
  getCurrentState(): T {
    return JSON.parse(JSON.stringify(this.currentState)) as T;
  }

  /**
   * Update current state and record change
   *
   * @param newState - New state to set
   * @param description - Description of the change
   * @param author - Optional author ID
   */
  setState(newState: T, description: string, author?: string): void {
    const before = this.currentState;
    const after = newState;

    // Compute diff
    const diffResult = computeDiff(before, after);

    if (!diffResult.hasChanges) {
      if (this.debug) {
        console.log('[UndoManager] No changes detected, skipping history entry');
      }
      return;
    }

    // Optimize and compress diffs
    let diffs = diffResult.diffs;
    diffs = optimizeDiffs(diffs);
    diffs = compressDiffs(diffs);

    // Handle coalescing
    if (this.enableCoalescing && this.shouldCoalesce()) {
      // Merge with pending changes
      this.pendingChanges.push(...diffs);
      this.lastChangeTime = now();

      if (this.debug) {
        console.log('[UndoManager] Coalescing changes, pending:', this.pendingChanges.length);
      }
      return;
    }

    // Flush pending changes if any
    if (this.pendingChanges.length > 0) {
      diffs = [...this.pendingChanges, ...diffs];
      this.pendingChanges = [];
    }

    // Add to history
    this.currentState = JSON.parse(JSON.stringify(after)) as T;
    this.addEntry(description, diffs, before, after, author);

    this.lastChangeTime = now();

    if (this.debug) {
      console.log('[UndoManager] State updated:', formatDiffSummary(diffs));
    }
  }

  /**
   * Record a specific change without updating the entire state
   *
   * @param description - Description of the change
   * @param diffs - Specific diffs to record
   * @param before - State before change
   * @param after - State after change
   * @param author - Optional author ID
   */
  recordChange(
    description: string,
    diffs: Diff[],
    before: T,
    after: T,
    author?: string
  ): void {
    // Optimize diffs
    diffs = optimizeDiffs(diffs);
    diffs = compressDiffs(diffs);

    // Add to history
    this.currentState = JSON.parse(JSON.stringify(after)) as T;
    this.addEntry(description, diffs, before, after, author);

    this.lastChangeTime = now();

    if (this.debug) {
      console.log('[UndoManager] Change recorded:', formatDiffSummary(diffs));
    }
  }

  /**
   * Force flush any pending coalesced changes
   */
  flushPendingChanges(): void {
    if (this.pendingChanges.length > 0) {
      if (this.debug) {
        console.log('[UndoManager] Flushing pending changes:', this.pendingChanges.length);
      }

      // Create entry from pending changes
      const before = this.currentState;
      const after = applyDiffs(before, this.pendingChanges);

      this.currentState = after;
      this.addEntry(
        'Coalesced changes',
        this.pendingChanges,
        before,
        after
      );

      this.pendingChanges = [];
      this.lastChangeTime = now();
    }
  }

  // ==========================================================================
  // Undo/Redo Operations
  // ==========================================================================

  /**
   * Undo to previous state
   *
   * @returns Undo result with new state
   */
  undo(): UndoResult {
    this.flushPendingChanges();

    if (!this.canUndo()) {
      return {
        success: false,
        error: 'Cannot undo: at beginning of history'
      };
    }

    // Get current entry before navigating
    const currentEntry = this.history.getCurrentEntry();
    if (!currentEntry || !currentEntry.beforeState) {
      return {
        success: false,
        error: 'No current entry found'
      };
    }

    // Navigate to previous position
    const navigationResult = this.history.undo();

    if (!navigationResult.success) {
      return {
        success: false,
        error: navigationResult.error
      };
    }

    // Restore the before state from the entry we just undid
    this.currentState = JSON.parse(JSON.stringify(currentEntry.beforeState)) as T;

    if (this.debug) {
      console.log('[UndoManager] Undid:', currentEntry.description);
    }

    return {
      success: true,
      state: this.getCurrentState(),
      description: `Undo: ${currentEntry.description}`
    };
  }

  /**
   * Redo to next state
   *
   * @returns Redo result with new state
   */
  redo(): UndoResult {
    this.flushPendingChanges();

    if (!this.canRedo()) {
      return {
        success: false,
        error: 'Cannot redo: at end of history'
      };
    }

    // Navigate to next position
    const navigationResult = this.history.redo();

    if (!navigationResult.success) {
      return {
        success: false,
        error: navigationResult.error
      };
    }

    // Get the entry we just redid
    const currentEntry = this.history.getCurrentEntry();
    if (!currentEntry || !currentEntry.afterState) {
      return {
        success: false,
        error: 'No current entry found'
      };
    }

    // Restore the after state from the entry we just redid
    this.currentState = JSON.parse(JSON.stringify(currentEntry.afterState)) as T;

    if (this.debug) {
      console.log('[UndoManager] Redid:', currentEntry.description);
    }

    return {
      success: true,
      state: this.getCurrentState(),
      description: `Redo: ${currentEntry.description}`
    };
  }

  /**
   * Jump to specific history entry
   *
   * @param index - Target history index
   * @returns Navigation result
   */
  jumpTo(index: number): UndoResult {
    this.flushPendingChanges();

    const navigationResult = this.history.navigateTo(index);

    if (!navigationResult.success) {
      return {
        success: false,
        error: navigationResult.error
      };
    }

    // Rebuild state by applying all diffs up to this point
    const history = this.history.getHistory();
    let state = history[0]?.beforeState as T || this.currentState;

    for (let i = 1; i <= index; i++) {
      const entry = history[i];
      if (entry && entry.afterState) {
        state = entry.afterState as T;
      }
    }

    this.currentState = state;

    if (this.debug) {
      console.log('[UndoManager] Jumped to entry:', index);
    }

    return {
      success: true,
      state: this.getCurrentState(),
      description: `Jumped to history entry ${index}`
    };
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.history.canUndo();
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.history.canRedo();
  }

  /**
   * Get current history position
   */
  getCurrentIndex(): number {
    return this.history.getCurrentIndex();
  }

  /**
   * Get full history
   */
  getHistory(): HistoryEntry[] {
    return this.history.getHistory();
  }

  /**
   * Get statistics about undo history
   */
  getStats(): UndoStats {
    return this.history.getStats() as UndoStats;
  }

  /**
   * Search history by description
   *
   * @param query - Search query
   * @returns Matching entries
   */
  searchHistory(query: string): HistoryEntry[] {
    return this.history.searchByDescription(query);
  }

  /**
   * Get entry by ID
   *
   * @param id - Entry ID
   * @returns Entry or undefined
   */
  getEntry(id: string): HistoryEntry | undefined {
    return this.history.getEntryById(id);
  }

  // ==========================================================================
  // History Management
  // ==========================================================================

  /**
   * Clear all history
   */
  clear(): void {
    this.history.clear();
    this.pendingChanges = [];
    this.lastChangeTime = 0;

    // Note: We don't re-add initial state
    // The first change after clear will be the new history start

    if (this.debug) {
      console.log('[UndoManager] History cleared');
    }
  }

  /**
   * Set maximum history size
   *
   * @param maxEntries - New maximum
   */
  setMaxEntries(maxEntries: number): void {
    this.history.setMaxEntries(maxEntries);

    if (this.debug) {
      console.log('[UndoManager] Max entries set to:', maxEntries);
    }
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  /**
   * Serialize history to JSON
   *
   * @returns Serialized history
   */
  serialize(): string {
    return JSON.stringify(this.history.serialize());
  }

  /**
   * Deserialize history from JSON
   *
   * @param data - Serialized history
   * @param currentState - Current state to restore
   */
  deserialize(data: string, currentState: T): void {
    const parsed = JSON.parse(data);
    this.history = UndoHistory.deserialize(parsed);

    this.currentState = JSON.parse(JSON.stringify(currentState)) as T;
    this.pendingChanges = [];

    if (this.debug) {
      console.log('[UndoManager] History deserialized');
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Add entry to history
   */
  private addEntry(
    description: string,
    diffs: Diff[],
    before: T,
    after?: T,
    author?: string
  ): void {
    const entry: HistoryEntry = {
      id: generateId(),
      timestamp: now(),
      description,
      changes: diffs.map(d => createChange(d.path, d.op as 'add' | 'remove' | 'update', d.oldValue, d.newValue)),
      author,
      diff: diffs,
      beforeState: before,
      afterState: after
    };

    this.history.addEntry(entry);
  }

  /**
   * Check if changes should be coalesced
   */
  private shouldCoalesce(): boolean {
    if (!this.enableCoalescing) {
      return false;
    }

    const timeSinceLastChange = now() - this.lastChangeTime;
    return timeSinceLastChange < this.coalescingWindow;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create undo manager (generic)
 *
 * @param initialState - Initial state
 * @param options - Configuration options
 * @returns Configured undo manager
 */
export function createUndoManager<T extends Record<string, unknown>>(
  initialState: T,
  options?: UndoManagerOptions
): UndoManager<T> {
  return new UndoManager(initialState, options);
}

/**
 * Create undo manager for SongContract
 *
 * @param initialState - Initial contract state
 * @param options - Configuration options
 * @returns Configured undo manager
 */
export function createSongContractUndoManager(
  initialState: Record<string, unknown>,
  options?: UndoManagerOptions
): UndoManager<Record<string, unknown>> {
  return new UndoManager(initialState, {
    ...options,
    targetId: options?.targetId || generateId()
  });
}

/**
 * Create undo manager for PerformanceState
 *
 * @param initialState - Initial performance state
 * @param options - Configuration options
 * @returns Configured undo manager
 */
export function createPerformanceStateUndoManager(
  initialState: Record<string, unknown>,
  options?: UndoManagerOptions
): UndoManager<Record<string, unknown>> {
  return new UndoManager(initialState, {
    ...options,
    targetId: options?.targetId || generateId()
  });
}

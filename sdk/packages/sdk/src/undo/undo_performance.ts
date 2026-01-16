/**
 * PerformanceState Undo Integration
 *
 * Provides high-level undo/redo operations specifically for PerformanceState.
 * Wraps the generic UndoManager with PerformanceState-specific utilities.
 *
 * @module undo/undo_performance
 */

import { PerformanceStateV1 } from '../song/performance_state.js';
import {
  UndoManager,
  createPerformanceStateUndoManager as createGenericPerformanceStateUndoManager,
  UndoResult,
  UndoManagerOptions,
  UndoStats
} from './undo_manager.js';
import { Diff, computeDiff } from './diff_engine.js';

// ============================================================================
// PerformanceState Undo Manager
// ============================================================================

/**
 * PerformanceState-specific undo manager
 *
 * Provides:
 * - Automatic PerformanceState change tracking
 * - Type-safe undo/redo operations
 * - PerformanceState-specific utilities
 */
export class PerformanceStateUndoManager {
  private undoManager: UndoManager<PerformanceStateV1>;

  constructor(initialState: PerformanceStateV1, options?: UndoManagerOptions) {
    this.undoManager = createGenericPerformanceStateUndoManager(initialState, {
      ...options,
      targetId: initialState.id
    });
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Get current PerformanceState
   */
  getCurrentState(): PerformanceStateV1 {
    return this.undoManager.getCurrentState() as PerformanceStateV1;
  }

  /**
   * Update PerformanceState and record change
   *
   * @param newState - New performance state
   * @param description - Change description
   * @param author - Optional author ID
   */
  setState(
    newState: PerformanceStateV1,
    description: string,
    author?: string
  ): void {
    this.undoManager.setState(newState, description, author);
  }

  /**
   * Record a specific change to the state
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
    before: PerformanceStateV1,
    after: PerformanceStateV1,
    author?: string
  ): void {
    this.undoManager.recordChange(description, diffs, before, after, author);
  }

  // ==========================================================================
  // High-Level Operations
  // ==========================================================================

  /**
   * Update transport state
   *
   * @param transportState - New transport state
   * @param author - Optional author ID
   * @returns Updated state
   */
  setTransportState(
    transportState: PerformanceStateV1['transport']['state'],
    author?: string
  ): PerformanceStateV1 {
    const before = this.getCurrentState();
    const after: PerformanceStateV1 = {
      ...before,
      transport: { ...before.transport, state: transportState }
    };

    const diffs = computeDiff(before, after).diffs;
    this.recordChange(
      `Set transport state to ${transportState}`,
      diffs,
      before,
      after,
      author
    );

    return after;
  }

  /**
   * Update density scale
   *
   * @param densityScale - New density scale (0-1)
   * @param author - Optional author ID
   * @returns Updated state
   */
  setDensityScale(densityScale: number, author?: string): PerformanceStateV1 {
    const before = this.getCurrentState();
    const after: PerformanceStateV1 = {
      ...before,
      densityScale: Math.max(0, Math.min(1, densityScale))
    };

    const diffs = computeDiff(before, after).diffs;
    this.recordChange(
      `Set density scale to ${densityScale}`,
      diffs,
      before,
      after,
      author
    );

    return after;
  }

  /**
   * Update CPU usage
   *
   * @param cpuUsage - New CPU usage (0-1)
   * @param author - Optional author ID
   * @returns Updated state
   */
  setCpuUsage(cpuUsage: number, author?: string): PerformanceStateV1 {
    const before = this.getCurrentState();
    const after: PerformanceStateV1 = {
      ...before,
      performance: { ...before.performance, cpuUsage: Math.max(0, Math.min(1, cpuUsage)) }
    };

    const diffs = computeDiff(before, after).diffs;
    this.recordChange(
      `Set CPU usage to ${cpuUsage}`,
      diffs,
      before,
      after,
      author
    );

    return after;
  }

  // ==========================================================================
  // Undo/Redo Operations
  // ==========================================================================

  /**
   * Undo last change
   *
   * @returns Undo result with previous state
   */
  undo(): UndoResult {
    const result = this.undoManager.undo();

    if (result.success && result.state) {
      result.state = result.state as PerformanceStateV1;
    }

    return result;
  }

  /**
   * Redo next change
   *
   * @returns Redo result with next state
   */
  redo(): UndoResult {
    const result = this.undoManager.redo();

    if (result.success && result.state) {
      result.state = result.state as PerformanceStateV1;
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
      result.state = result.state as PerformanceStateV1;
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
   * @param currentState - Current state
   */
  deserialize(data: string, currentState: PerformanceStateV1): void {
    this.undoManager.deserialize(data, currentState);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create PerformanceState undo manager
 *
 * @param initialState - Initial performance state
 * @param options - Configuration options
 * @returns Configured undo manager
 */
export function createUndoManagerForPerformanceState(
  initialState: PerformanceStateV1,
  options?: UndoManagerOptions
): PerformanceStateUndoManager {
  return new PerformanceStateUndoManager(initialState, options);
}

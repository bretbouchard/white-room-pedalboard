/**
 * Diff Engine - Advanced change detection for undo/redo system
 *
 * Provides sophisticated diff computation between two states with support for:
 * - Deep object comparison
 * - Array operations (add, remove, move)
 * - Path-based change tracking
 * - Efficient diff application and reversal
 *
 * @module undo/diff_engine
 */

import { SongContractV1 } from '../song/song_contract.js';
import { PerformanceStateV1 } from '../song/performance_state.js';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Diff operation types
 */
export type DiffOperation =
  | 'add'      // Property/array element added
  | 'remove'   // Property/array element removed
  | 'update'   // Property/array element changed
  | 'replace'; // Entire object replaced

/**
 * Represents a single change in the data structure
 */
export interface Diff {
  /** Path to the changed property using dot notation (e.g., "rhythmSystems.0.period") */
  path: string;

  /** Type of change operation */
  op: DiffOperation;

  /** Previous value (for undo) */
  oldValue: unknown;

  /** New value (for redo) */
  newValue: unknown;

  /** Array index if this is an array operation */
  index?: number;
}

/**
 * Result of a diff computation
 */
export interface DiffResult {
  /** Array of diffs describing changes */
  diffs: Diff[];

  /** Whether any changes were detected */
  hasChanges: boolean;

  /** Number of individual changes */
  changeCount: number;
}

// ============================================================================
// Diff Computation
// ============================================================================

/**
 * Compute differences between two values
 *
 * @param before - Original value
 * @param after - Modified value
 * @param path - Current path (for recursion)
 * @returns Diff result with all detected changes
 */
export function computeDiff(
  before: unknown,
  after: unknown,
  path: string = ''
): DiffResult {
  const diffs: Diff[] = [];

  // Handle null/undefined
  if (before === null || before === undefined) {
    if (after !== before) {
      diffs.push({
        path,
        op: 'replace',
        oldValue: before,
        newValue: after
      });
    }
    return { diffs, hasChanges: diffs.length > 0, changeCount: diffs.length };
  }

  if (after === null || after === undefined) {
    diffs.push({
      path,
      op: 'replace',
      oldValue: before,
      newValue: after
    });
    return { diffs, hasChanges: true, changeCount: 1 };
  }

  // Handle primitive types
  if (typeof before !== 'object' || typeof after !== 'object') {
    if (before !== after) {
      diffs.push({
        path,
        op: 'update',
        oldValue: before,
        newValue: after
      });
    }
    return { diffs, hasChanges: diffs.length > 0, changeCount: diffs.length };
  }

  // Handle arrays
  if (Array.isArray(before) && Array.isArray(after)) {
    return computeArrayDiff(before, after, path);
  }

  if (Array.isArray(before) !== Array.isArray(after)) {
    // Type changed from array to object or vice versa
    diffs.push({
      path,
      op: 'replace',
      oldValue: before,
      newValue: after
    });
    return { diffs, hasChanges: true, changeCount: 1 };
  }

  // Handle objects
  return computeObjectDiff(before as Record<string, unknown>, after as Record<string, unknown>, path);
}

/**
 * Compute differences between arrays
 *
 * Detects:
 * - Added elements
 * - Removed elements
 * - Modified elements
 * - Moved elements (by value matching)
 */
function computeArrayDiff(
  before: unknown[],
  after: unknown[],
  path: string
): DiffResult {
  const diffs: Diff[] = [];

  // Use Set to detect moved elements
  const beforeSet = new Set(before.map(JSON.stringify));
  const afterSet = new Set(after.map(JSON.stringify));

  // First, find modified elements at the same index (highest priority)
  const minLength = Math.min(before.length, after.length);
  for (let i = 0; i < minLength; i++) {
    const beforeStr = JSON.stringify(before[i]);
    const afterStr = JSON.stringify(after[i]);

    if (beforeStr !== afterStr) {
      // Check if it's a simple value change (not nested)
      const beforeType = typeof before[i];
      const afterType = typeof after[i];

      if (beforeType !== 'object' && before[i] !== after[i]) {
        // Simple primitive value change - use 'update' operation
        diffs.push({
          path: path ? `${path}.${i}` : `${i}`,
          op: 'update',
          oldValue: before[i],
          newValue: after[i],
          index: i
        });
      } else if (beforeType === 'object' && afterType === 'object' &&
                 before[i] !== null && after[i] !== null) {
        // Object/array change - recursively diff
        const elementDiffs = computeDiff(before[i], after[i], path ? `${path}.${i}` : `${i}`);
        diffs.push(...elementDiffs.diffs);
      } else {
        // Type changed or one is null - use replace
        diffs.push({
          path: path ? `${path}.${i}` : `${i}`,
          op: 'replace',
          oldValue: before[i],
          newValue: after[i],
          index: i
        });
      }
    }
  }

  // Then, find added elements (excluding already detected updates)
  for (let i = 0; i < after.length; i++) {
    // Skip if we already detected a change at this index
    if (diffs.some(d => d.path === (path ? `${path}.${i}` : `${i}`))) {
      continue;
    }

    const afterStr = JSON.stringify(after[i]);
    if (!beforeSet.has(afterStr)) {
      diffs.push({
        path: path ? `${path}.${i}` : `${i}`,
        op: 'add',
        oldValue: undefined,
        newValue: after[i],
        index: i
      });
    }
  }

  // Finally, find removed elements (excluding already detected updates)
  for (let i = 0; i < before.length; i++) {
    // Skip if we already detected a change at this index
    if (diffs.some(d => d.path === (path ? `${path}.${i}` : `${i}`))) {
      continue;
    }

    const beforeStr = JSON.stringify(before[i]);
    if (!afterSet.has(beforeStr)) {
      diffs.push({
        path: path ? `${path}.${i}` : `${i}`,
        op: 'remove',
        oldValue: before[i],
        newValue: undefined,
        index: i
      });
    }
  }

  return { diffs, hasChanges: diffs.length > 0, changeCount: diffs.length };
}

/**
 * Compute differences between objects
 */
function computeObjectDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  path: string
): DiffResult {
  const diffs: Diff[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;
    const hasBefore = key in before;
    const hasAfter = key in after;

    if (!hasBefore && hasAfter) {
      // Property added
      diffs.push({
        path: keyPath,
        op: 'add',
        oldValue: undefined,
        newValue: after[key]
      });
    } else if (hasBefore && !hasAfter) {
      // Property removed
      diffs.push({
        path: keyPath,
        op: 'remove',
        oldValue: before[key],
        newValue: undefined
      });
    } else if (hasBefore && hasAfter) {
      // Recursively diff the property values
      const propDiffs = computeDiff(before[key], after[key], keyPath);
      diffs.push(...propDiffs.diffs);
    }
  }

  return { diffs, hasChanges: diffs.length > 0, changeCount: diffs.length };
}

// ============================================================================
// Diff Application
// ============================================================================

/**
 * Apply diffs to a base state to create a new state
 *
 * @param base - Base state to apply diffs to
 * @param diffs - Array of diffs to apply
 * @returns New state with diffs applied
 */
export function applyDiffs<T extends Record<string, unknown>>(
  base: T,
  diffs: Diff[]
): T {
  // Deep clone base to avoid mutation
  const result = JSON.parse(JSON.stringify(base)) as T;

  for (const diff of diffs) {
    applySingleDiff(result, diff);
  }

  return result;
}

/**
 * Apply a single diff to a state
 */
function applySingleDiff(state: Record<string, unknown>, diff: Diff): void {
  const pathParts = diff.path.split('.');

  // Navigate to parent of target
  let current: unknown = state;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[part];
    }
  }

  // Apply the diff at the target location
  const lastPart = pathParts[pathParts.length - 1];
  if (typeof current === 'object' && current !== null) {
    const target = current as Record<string, unknown>;

    switch (diff.op) {
      case 'add':
      case 'update':
        target[lastPart] = diff.newValue;
        break;

      case 'remove':
        delete target[lastPart];
        break;

      case 'replace':
        if (Array.isArray(target)) {
          // Array element replacement
          const index = parseInt(lastPart, 10);
          if (!isNaN(index)) {
            target[index] = diff.newValue;
          }
        } else {
          // Object replacement
          target[lastPart] = diff.newValue;
        }
        break;
    }
  }
}

// ============================================================================
// Diff Reversal
// ============================================================================

/**
 * Reverse diffs (swap oldValue and newValue, invert operations)
 *
 * @param diffs - Diffs to reverse
 * @returns Reversed diffs suitable for undo
 */
export function reverseDiffs(diffs: Diff[]): Diff[] {
  return diffs.map(diff => {
    const reversedDiff: Diff = {
      path: diff.path,
      op: diff.op,
      oldValue: diff.newValue,
      newValue: diff.oldValue,
      index: diff.index
    };

    // Invert operation
    switch (diff.op) {
      case 'add':
        reversedDiff.op = 'remove';
        break;
      case 'remove':
        reversedDiff.op = 'add';
        break;
      case 'update':
      case 'replace':
        // Keep same operation for update/replace (values are swapped)
        break;
    }

    return reversedDiff;
  });
}

// ============================================================================
// Diff Optimization
// ============================================================================

/**
 * Optimize diffs by merging adjacent changes to the same path
 *
 * @param diffs - Diffs to optimize
 * @returns Optimized diffs with minimal count
 */
export function optimizeDiffs(diffs: Diff[]): Diff[] {
  if (diffs.length === 0) {
    return [];
  }

  // Group diffs by path
  const grouped = new Map<string, Diff[]>();
  for (const diff of diffs) {
    const existing = grouped.get(diff.path) || [];
    existing.push(diff);
    grouped.set(diff.path, existing);
  }

  // Optimize each group
  const optimized: Diff[] = [];
  for (const [path, pathDiffs] of grouped.entries()) {
    if (pathDiffs.length === 1) {
      optimized.push(pathDiffs[0]);
    } else {
      // Multiple changes to same path - keep only the last one
      // This is safe because diffs are applied in order
      optimized.push(pathDiffs[pathDiffs.length - 1]);
    }
  }

  return optimized;
}

/**
 * Compress diffs by removing redundant operations
 *
 * For example, if a property is added then removed, both operations can be removed.
 *
 * @param diffs - Diffs to compress
 * @returns Compressed diffs
 */
export function compressDiffs(diffs: Diff[]): Diff[] {
  const result = [...diffs];

  // Remove add+remove pairs for same path
  let i = 0;
  while (i < result.length - 1) {
    const current = result[i];
    const next = result[i + 1];

    if (
      current.path === next.path &&
      ((current.op === 'add' && next.op === 'remove') ||
       (current.op === 'remove' && next.op === 'add'))
    ) {
      // Remove both operations
      result.splice(i, 2);
      // Don't increment i - check next pair
    } else {
      i++;
    }
  }

  return result;
}

// ============================================================================
// Diff Analysis
// ============================================================================

/**
 * Analyze diffs to extract statistics
 *
 * @param diffs - Diffs to analyze
 * @returns Statistics about the diffs
 */
export function analyzeDiffs(diffs: Diff[]): {
  total: number;
  byOperation: Record<DiffOperation, number>;
  byPathDepth: Record<number, number>;
  affectedPaths: string[];
} {
  const byOperation: Record<DiffOperation, number> = {
    add: 0,
    remove: 0,
    update: 0,
    replace: 0
  };
  const byPathDepth: Record<number, number> = {};
  const affectedPaths = new Set<string>();

  for (const diff of diffs) {
    // Count by operation
    byOperation[diff.op]++;

    // Count by path depth
    const depth = diff.path.split('.').length;
    byPathDepth[depth] = (byPathDepth[depth] || 0) + 1;

    // Track affected paths
    affectedPaths.add(diff.path.split('.')[0]);
  }

  return {
    total: diffs.length,
    byOperation,
    byPathDepth,
    affectedPaths: Array.from(affectedPaths)
  };
}

/**
 * Check if diffs affect a specific path
 *
 * @param diffs - Diffs to check
 * @param path - Path to check (supports prefix matching)
 * @returns True if any diff affects the path
 */
export function affectsPath(diffs: Diff[], path: string): boolean {
  return diffs.some(diff => {
    // Check if diff path starts with the target path
    return diff.path === path || diff.path.startsWith(`${path}.`);
  });
}

// ============================================================================
// Human-Readable Diff Formatting
// ============================================================================

/**
 * Format a diff for human-readable display
 *
 * @param diff - Diff to format
 * @returns Human-readable string
 */
export function formatDiff(diff: Diff): string {
  const valueStr = (value: unknown): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  switch (diff.op) {
    case 'add':
      return `Added ${diff.path}: ${valueStr(diff.newValue)}`;
    case 'remove':
      return `Removed ${diff.path}: ${valueStr(diff.oldValue)}`;
    case 'update':
      return `Changed ${diff.path}: ${valueStr(diff.oldValue)} → ${valueStr(diff.newValue)}`;
    case 'replace':
      return `Replaced ${diff.path}: ${valueStr(diff.oldValue)} → ${valueStr(diff.newValue)}`;
  }
}

/**
 * Format multiple diffs as a summary
 *
 * @param diffs - Diffs to format
 * @returns Human-readable summary
 */
export function formatDiffSummary(diffs: Diff[]): string {
  if (diffs.length === 0) {
    return 'No changes';
  }

  const analysis = analyzeDiffs(diffs);
  const parts: string[] = [];

  parts.push(`${diffs.length} change(s)`);

  if (analysis.byOperation.add > 0) {
    parts.push(`${analysis.byOperation.add} added`);
  }
  if (analysis.byOperation.remove > 0) {
    parts.push(`${analysis.byOperation.remove} removed`);
  }
  if (analysis.byOperation.update > 0) {
    parts.push(`${analysis.byOperation.update} updated`);
  }
  if (analysis.byOperation.replace > 0) {
    parts.push(`${analysis.byOperation.replace} replaced`);
  }

  return parts.join(', ');
}

// ============================================================================
// Type-Specific Diff Helpers
// ============================================================================

/**
 * Compute diff for SongContract
 *
 * @param before - Original contract
 * @param after - Modified contract
 * @returns Diff result
 */
export function computeSongContractDiff(
  before: SongContractV1,
  after: SongContractV1
): DiffResult {
  return computeDiff(before, after, '');
}

/**
 * Compute diff for PerformanceState
 *
 * @param before - Original state
 * @param after - Modified state
 * @returns Diff result
 */
export function computePerformanceStateDiff(
  before: PerformanceStateV1,
  after: PerformanceStateV1
): DiffResult {
  return computeDiff(before, after, '');
}

/**
 * Apply diffs to SongContract
 *
 * @param base - Base contract
 * @param diffs - Diffs to apply
 * @returns Modified contract
 */
export function applySongContractDiffs(
  base: SongContractV1,
  diffs: Diff[]
): SongContractV1 {
  return applyDiffs(base, diffs);
}

/**
 * Apply diffs to PerformanceState
 *
 * @param base - Base state
 * @param diffs - Diffs to apply
 * @returns Modified state
 */
export function applyPerformanceStateDiffs(
  base: PerformanceStateV1,
  diffs: Diff[]
): PerformanceStateV1 {
  return applyDiffs(base, diffs);
}

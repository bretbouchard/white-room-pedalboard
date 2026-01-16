/**
 * PerformanceRegistry - CRUD operations for PerformanceState[]
 *
 * Manages collection of custom performances with validation and persistence.
 * Thread-safe operations for performance management.
 */

import { randomUUID } from 'crypto';
import type { PerformanceStateV1 } from '../song/performance_state.js';
import { validatePerformanceState } from '../song/performance_state.js';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceEntry {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly performance: PerformanceStateV1;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
}

export interface CreateOptions {
  readonly name: string;
  readonly description?: string;
  readonly performance: PerformanceStateV1;
}

export interface UpdateOptions {
  readonly name?: string;
  readonly description?: string;
  readonly performance?: Partial<PerformanceStateV1>;
}

export interface RegistryError {
  readonly code: 'NOT_FOUND' | 'ALREADY_EXISTS' | 'INVALID_DATA' | 'INTERNAL_ERROR';
  readonly message: string;
  readonly details?: unknown;
}

export interface RegistryResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: RegistryError;
}

// ============================================================================
// Registry Implementation
// ============================================================================

export class PerformanceRegistry {
  private performances: Map<string, PerformanceEntry>;
  private readonly lock: AsyncLock;

  constructor() {
    this.performances = new Map();
    this.lock = new AsyncLock();
  }

  /**
   * Create a new performance entry
   * @param options - Performance creation options
   * @returns Result with created entry ID or error
   */
  async create(options: CreateOptions): Promise<RegistryResult<string>> {
    return this.lock.runExclusive(async () => {
      try {
        // Validate performance data
        const validation = this.validate(options.performance);
        if (!validation.valid) {
          return {
            success: false,
            error: {
              code: 'INVALID_DATA',
              message: 'Performance validation failed',
              details: validation.errors
            }
          };
        }

        // Check for duplicate name
        const existing = this.findByNameInternal(options.name);
        if (existing) {
          return {
            success: false,
            error: {
              code: 'ALREADY_EXISTS',
              message: `Performance with name "${options.name}" already exists`,
              details: { existingId: existing.id }
            }
          };
        }

        // Create new entry
        const id = randomUUID();
        const now = Date.now();
        const entry: PerformanceEntry = {
          id,
          name: options.name,
          description: options.description,
          performance: options.performance,
          createdAt: now,
          updatedAt: now
        };

        this.performances.set(id, entry);

        return {
          success: true,
          data: id
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error
          }
        };
      }
    });
  }

  /**
   * Read a performance by ID
   * @param id - Performance ID
   * @returns Result with performance entry or error
   */
  async read(id: string): Promise<RegistryResult<PerformanceEntry>> {
    return this.lock.runExclusive(async () => {
      const entry = this.performances.get(id);

      if (!entry) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Performance with ID "${id}" not found`,
            details: { id }
          }
        };
      }

      // Return a deep copy to prevent external mutations
      return {
        success: true,
        data: this.cloneEntry(entry)
      };
    });
  }

  /**
   * Update an existing performance
   * @param id - Performance ID
   * @param updates - Fields to update
   * @returns Result indicating success or failure
   */
  async update(id: string, updates: UpdateOptions): Promise<RegistryResult<void>> {
    return this.lock.runExclusive(async () => {
      try {
        const entry = this.performances.get(id);

        if (!entry) {
          return {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Performance with ID "${id}" not found`,
              details: { id }
            }
          };
        }

        // Validate new performance data if provided
        if (updates.performance) {
          // Merge with existing performance for validation
          const mergedPerformance = this.mergePerformance(entry.performance, updates.performance);

          const validation = this.validate(mergedPerformance);
          if (!validation.valid) {
            return {
              success: false,
              error: {
                code: 'INVALID_DATA',
                message: 'Performance validation failed',
                details: validation.errors
              }
            };
          }
        }

        // Check for duplicate name if changing name
        if (updates.name && updates.name !== entry.name) {
          const existing = this.findByNameInternal(updates.name);
          if (existing && existing.id !== id) {
            return {
              success: false,
              error: {
                code: 'ALREADY_EXISTS',
                message: `Performance with name "${updates.name}" already exists`,
                details: { existingId: existing.id }
              }
            };
          }
        }

        // Update entry
        const updatedEntry: PerformanceEntry = {
          ...entry,
          name: updates.name ?? entry.name,
          description: updates.description ?? entry.description,
          performance: updates.performance
            ? this.mergePerformance(entry.performance, updates.performance)
            : entry.performance,
          updatedAt: Date.now()
        };

        this.performances.set(id, updatedEntry);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error
          }
        };
      }
    });
  }

  /**
   * Delete a performance by ID
   * @param id - Performance ID
   * @returns Result indicating success or failure
   */
  async delete(id: string): Promise<RegistryResult<void>> {
    return this.lock.runExclusive(async () => {
      const entry = this.performances.get(id);

      if (!entry) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Performance with ID "${id}" not found`,
            details: { id }
          }
        };
      }

      this.performances.delete(id);

      return { success: true };
    });
  }

  /**
   * List all performances
   * @returns Array of all performance entries
   */
  async list(): Promise<PerformanceEntry[]> {
    return this.lock.runExclusive(async () => {
      return Array.from(this.performances.values()).map((entry) =>
        this.cloneEntry(entry)
      );
    });
  }

  /**
   * Find performance by name
   * @param name - Performance name
   * @returns Performance entry or undefined
   */
  async findByName(name: string): Promise<PerformanceEntry | undefined> {
    return this.lock.runExclusive(async () => {
      const entry = this.findByNameInternal(name);
      return entry ? this.cloneEntry(entry) : undefined;
    });
  }

  /**
   * Validate a performance state
   * @param performance - Performance to validate
   * @returns Validation result
   */
  validate(performance: unknown): ValidationResult {
    const result = validatePerformanceState(performance);

    return {
      valid: result.valid,
      errors: result.errors.map((e) => `${e.path}: ${e.message}`)
    };
  }

  /**
   * Get registry statistics
   * @returns Statistics about the registry
   */
  async stats(): Promise<{
    readonly count: number;
    readonly names: ReadonlyArray<string>;
  }> {
    return this.lock.runExclusive(async () => {
      const entries = Array.from(this.performances.values());
      return {
        count: entries.length,
        names: entries.map((e) => e.name)
      };
    });
  }

  /**
   * Clear all performances from registry
   * Useful for testing or reset operations
   */
  async clear(): Promise<void> {
    return this.lock.runExclusive(async () => {
      this.performances.clear();
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private findByNameInternal(name: string): PerformanceEntry | undefined {
    return Array.from(this.performances.values()).find((e) => e.name === name);
  }

  private cloneEntry(entry: PerformanceEntry): PerformanceEntry {
    return {
      ...entry,
      performance: this.deepClonePerformance(entry.performance)
    };
  }

  private deepClonePerformance(performance: PerformanceStateV1): PerformanceStateV1 {
    // Custom deep clone that preserves -Infinity values
    return {
      version: performance.version,
      transport: { ...performance.transport },
      activeVoices: performance.activeVoices.map((voice) => ({ ...voice })),
      metering: {
        voiceBusses: performance.metering.voiceBusses.map((bus) => ({
          ...bus,
          peak: bus.peak === -Infinity ? -Infinity : bus.peak,
          rms: bus.rms === -Infinity ? -Infinity : bus.rms,
          peakHold: bus.peakHold === -Infinity ? -Infinity : bus.peakHold
        })),
        mixBusses: performance.metering.mixBusses.map((bus) => ({
          ...bus,
          peak: bus.peak === -Infinity ? -Infinity : bus.peak,
          rms: bus.rms === -Infinity ? -Infinity : bus.rms,
          peakHold: bus.peakHold === -Infinity ? -Infinity : bus.peakHold
        })),
        masterBus: {
          ...performance.metering.masterBus,
          peak: performance.metering.masterBus.peak === -Infinity ? -Infinity : performance.metering.masterBus.peak,
          rms: performance.metering.masterBus.rms === -Infinity ? -Infinity : performance.metering.masterBus.rms,
          peakHold: performance.metering.masterBus.peakHold === -Infinity ? -Infinity : performance.metering.masterBus.peakHold
        }
      },
      performance: { ...performance.performance }
    };
  }

  private mergePerformance(
    base: PerformanceStateV1,
    updates: Partial<PerformanceStateV1>
  ): PerformanceStateV1 {
    return {
      version: updates.version ?? base.version,
      transport: updates.transport ? { ...base.transport, ...updates.transport } : base.transport,
      activeVoices: updates.activeVoices ?? base.activeVoices,
      metering: updates.metering
        ? {
            voiceBusses: updates.metering.voiceBusses ?? base.metering.voiceBusses,
            mixBusses: updates.metering.mixBusses ?? base.metering.mixBusses,
            masterBus: updates.metering.masterBus ? { ...base.metering.masterBus, ...updates.metering.masterBus } : base.metering.masterBus
          }
        : base.metering,
      performance: updates.performance
        ? { ...base.performance, ...updates.performance }
        : base.performance
    };
  }
}

// ============================================================================
// Async Lock for Thread Safety
// ============================================================================

class AsyncLock {
  private queue: Array<() => void>;
  private locked: boolean;

  constructor() {
    this.queue = [];
    this.locked = false;
  }

  async runExclusive<T>(callback: () => T | Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const result = await callback();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.next();
        }
      };

      this.queue.push(task);

      if (!this.locked) {
        this.next();
      }
    });
  }

  private next(): void {
    if (this.queue.length === 0) {
      this.locked = false;
      return;
    }

    this.locked = true;
    const task = this.queue.shift();
    if (task) {
      task();
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new performance registry
 * @returns New PerformanceRegistry instance
 */
export function createPerformanceRegistry(): PerformanceRegistry {
  return new PerformanceRegistry();
}

/**
 * Create a performance registry with initial performances
 * @param performances - Initial performances to add
 * @returns New PerformanceRegistry instance with performances
 */
export async function createRegistryWithPerformances(
  performances: Array<{ name: string; description?: string; performance: PerformanceStateV1 }>
): Promise<PerformanceRegistry> {
  const registry = new PerformanceRegistry();

  for (const perf of performances) {
    await registry.create(perf);
  }

  return registry;
}

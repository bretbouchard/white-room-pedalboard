/**
 * PerformanceManager - Manage PerformanceRealizations for a SongModel
 *
 * Provides CRUD operations for managing multiple performances within a song.
 * Each performance represents a different "universe" for realizing the same song.
 *
 * Example: Same song can be rendered as:
 * - Solo Piano
 * - SATB Choir
 * - Ambient Techno
 * - Full Orchestra
 */

import type { SongModel_v1 } from '@whiteroom/schemas';
import type { PerformanceRealizationV1 } from './performance_realization.js';
import {
  validatePerformanceRealization,
  clonePerformanceRealization,
  createSoloPianoPerformance,
  createSATBPerformance,
  createAmbientTechnoPerformance
} from './performance_realization.js';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceManagerOptions {
  readonly songModel: SongModel_v1;
}

export interface CreatePerformanceOptions {
  readonly name: string;
  readonly description?: string;
  readonly performance: Omit<PerformanceRealizationV1, 'version' | 'id' | 'createdAt' | 'modifiedAt'>;
}

export interface UpdatePerformanceOptions {
  readonly performanceId: string;
  readonly updates: Partial<Omit<PerformanceRealizationV1, 'version' | 'id' | 'createdAt'>>;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface ManagerError {
  readonly code: 'NOT_FOUND' | 'ALREADY_EXISTS' | 'INVALID_DATA' | 'INTERNAL_ERROR';
  readonly message: string;
  readonly details?: unknown;
}

export interface ManagerResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ManagerError;
}

// ============================================================================
// PerformanceManager Implementation
// ============================================================================

export class PerformanceManager {
  private songModel: SongModel_v1;

  constructor(options: PerformanceManagerOptions) {
    this.songModel = options.songModel;
  }

  /**
   * Get all performances for this song
   */
  listPerformances(): PerformanceRealizationV1[] {
    return [...this.songModel.performances];
  }

  /**
   * Get a specific performance by ID
   */
  getPerformance(performanceId: string): PerformanceRealizationV1 | undefined {
    return this.songModel.performances.find(p => p.id === performanceId);
  }

  /**
   * Get the active performance
   */
  getActivePerformance(): PerformanceRealizationV1 | undefined {
    return this.getPerformance(this.songModel.activePerformanceId);
  }

  /**
   * Create a new performance for this song
   */
  createPerformance(options: CreatePerformanceOptions): ManagerResult<PerformanceRealizationV1> {
    try {
      // Validate performance data
      const now = Date.now();
      const newPerformance: PerformanceRealizationV1 = {
        version: '1.0',
        id: crypto.randomUUID(),
        name: options.name,
        description: options.description,
        arrangementStyle: options.performance.arrangementStyle,
        density: options.performance.density,
        grooveProfileId: options.performance.grooveProfileId,
        instrumentationMap: options.performance.instrumentationMap,
        consoleXProfileId: options.performance.consoleXProfileId,
        mixTargets: options.performance.mixTargets,
        registerMap: options.performance.registerMap,
        createdAt: now,
        modifiedAt: now
      };

      const validation = validatePerformanceRealization(newPerformance);
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
      const existing = this.songModel.performances.find(p => p.name === options.name);
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

      // Add to song model (returns new immutable SongModel)
      const updatedSongModel = {
        ...this.songModel,
        performances: [...this.songModel.performances, newPerformance]
      };

      this.songModel = updatedSongModel;

      return {
        success: true,
        data: newPerformance
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
  }

  /**
   * Update an existing performance
   */
  updatePerformance(options: UpdatePerformanceOptions): ManagerResult<PerformanceRealizationV1> {
    try {
      const existing = this.getPerformance(options.performanceId);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Performance with ID "${options.performanceId}" not found`,
            details: { performanceId: options.performanceId }
          }
        };
      }

      // Clone with updates
      const updatedPerformance = clonePerformanceRealization(existing, options.updates);

      // Validate updated performance
      const validation = validatePerformanceRealization(updatedPerformance);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'INVALID_DATA',
            message: 'Updated performance validation failed',
            details: validation.errors
          }
        };
      }

      // Update in array
      const updatedPerformances = this.songModel.performances.map(p =>
        p.id === options.performanceId ? updatedPerformance : p
      );

      const updatedSongModel = {
        ...this.songModel,
        performances: updatedPerformances
      };

      this.songModel = updatedSongModel;

      return {
        success: true,
        data: updatedPerformance
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
  }

  /**
   * Delete a performance
   *
   * Prevents deletion if it's the last performance or if it's the active performance
   */
  deletePerformance(performanceId: string): ManagerResult<void> {
    // Check if performance exists
    const existing = this.getPerformance(performanceId);
    if (!existing) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Performance with ID "${performanceId}" not found`,
          details: { performanceId }
        }
      };
    }

    // Prevent deleting last performance
    if (this.songModel.performances.length <= 1) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'Cannot delete the last performance',
          details: { performanceId }
        }
      };
    }

    // Prevent deleting active performance
    if (this.songModel.activePerformanceId === performanceId) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'Cannot delete the active performance',
          details: { performanceId }
        }
      };
    }

    // Remove from array
    const updatedPerformances = this.songModel.performances.filter(p => p.id !== performanceId);
    const updatedSongModel = {
      ...this.songModel,
      performances: updatedPerformances
    };

    this.songModel = updatedSongModel;

    return { success: true };
  }

  /**
   * Switch the active performance
   *
   * This is the core operation for "Parallel Performance Universes".
   * When user taps 'Techno', the whole song transforms at the next bar boundary.
   */
  switchPerformance(performanceId: string): ManagerResult<PerformanceRealizationV1> {
    // Check if performance exists
    const target = this.getPerformance(performanceId);
    if (!target) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Performance with ID "${performanceId}" not found`,
          details: { performanceId }
        }
      };
    }

    // Update active performance ID
    const updatedSongModel = {
      ...this.songModel,
      activePerformanceId: performanceId
    };

    this.songModel = updatedSongModel;

    return {
      success: true,
      data: target
    };
  }

  /**
   * Validate a performance
   */
  validatePerformance(performance: unknown): ValidationResult {
    const result = validatePerformanceRealization(performance);
    return {
      valid: result.valid,
      errors: result.errors.map(e => `${e.path}: ${e.message}`)
    };
  }

  /**
   * Get updated SongModel with performance changes
   *
   * Call this after making changes to get the updated SongModel for persistence.
   */
  getSongModel(): SongModel_v1 {
    return this.songModel;
  }

  /**
   * Add default performances to a song
   *
   * Creates Piano, SATB, and Techno performances if song has no performances.
   */
  initializeDefaultPerformances(): ManagerResult<PerformanceRealizationV1[]> {
    // Only add defaults if no performances exist
    if (this.songModel.performances.length > 0) {
      return {
        success: true,
        data: this.songModel.performances
      };
    }

    try {
      const piano = createSoloPianoPerformance();
      const satb = createSATBPerformance();
      const techno = createAmbientTechnoPerformance();

      const updatedSongModel = {
        ...this.songModel,
        performances: [piano, satb, techno],
        activePerformanceId: piano.id // Piano is default
      };

      this.songModel = updatedSongModel;

      return {
        success: true,
        data: [piano, satb, techno]
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
  }

  /**
   * Blend two performances (future feature for smooth transitions)
   *
   * Creates a transient blended performance between two performances.
   * t = 0.0: 100% performance A
   * t = 0.5: 50/50 blend
   * t = 1.0: 100% performance B
   *
   * NOTE: This is a placeholder for future implementation.
   * The actual blending happens in JUCE during rendering.
   */
  blendPerformances(
    performanceAId: string,
    performanceBId: string,
    t: number
  ): ManagerResult<{ blend: number; from: PerformanceRealizationV1; to: PerformanceRealizationV1 }> {
    // Validate t
    if (typeof t !== 'number' || t < 0 || t > 1) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'Blend value t must be 0.0 to 1.0',
          details: { t }
        }
      };
    }

    const perfA = this.getPerformance(performanceAId);
    const perfB = this.getPerformance(performanceBId);

    if (!perfA || !perfB) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'One or both performances not found',
          details: { performanceAId, performanceBId }
        }
      };
    }

    // Return blend metadata (actual blending happens in JUCE)
    return {
      success: true,
      data: {
        blend: t,
        from: perfA,
        to: perfB
      }
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a PerformanceManager for a SongModel
 */
export function createPerformanceManager(songModel: SongModel_v1): PerformanceManager {
  return new PerformanceManager({ songModel });
}

/**
 * Create PerformanceManager and initialize default performances
 */
export function createPerformanceManagerWithDefaults(
  songModel: SongModel_v1
): ManagerResult<{ manager: PerformanceManager; performances: PerformanceRealizationV1[] }> {
  const manager = createPerformanceManager(songModel);
  const result = manager.initializeDefaultPerformances();

  if (!result.success) {
    return {
      success: false,
      error: result.error
    };
  }

  return {
    success: true,
    data: {
      manager,
      performances: result.data || []
    }
  };
}

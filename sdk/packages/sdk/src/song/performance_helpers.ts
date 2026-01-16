/**
 * Performance Helper APIs - Simple functions for managing performances
 *
 * These helper functions provide a simple, functional API for managing
 * performances within a song model. They are designed to be lightweight
 * alternatives to the PerformanceManager class for simple use cases.
 *
 * Functions:
 * - addPerformance(): Add a new performance to the song
 * - setActivePerformance(): Set the active performance
 * - blendPerformance(): Create transient blend between two performances
 * - listPerformances(): Get all performances
 * - getActivePerformance(): Get the currently active performance
 */

import type { SongModel } from '@whiteroom/schemas';
import type { PerformanceRealizationV1 } from './performance_realization.js';
import {
  validatePerformanceRealization,
  clonePerformanceRealization
} from './performance_realization.js';

// =============================================================================
// Extended SongModel Type with Performances
// ============================================================================

/**
 * SongModelWithPerformances extends SongModel with performance management
 *
 * This type represents a SongModel that has been extended with support
 * for multiple parallel performance universes.
 */
export interface SongModelWithPerformances extends Omit<SongModel, 'presets'> {
  /**
   * Array of all performances for this song
   */
  performances: PerformanceRealizationV1[];

  /**
   * ID of the currently active performance
   */
  activePerformanceId: string;

  /**
   * Optional presets field (from original SongModel)
   */
  presets?: SongModel['presets'];

  /**
   * Optional field to track the SongState ID
   */
  songState?: string;
}

// =============================================================================
// Helper API Types
// ============================================================================

/**
 * Result type for helper functions that can fail
 */
export interface HelperResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: 'NOT_FOUND' | 'INVALID_DATA' | 'VALIDATION_FAILED';
    readonly message: string;
    readonly details?: unknown;
  };
}

/**
 * Options for blending performances
 */
export interface BlendOptions {
  readonly performanceAId: string;
  readonly performanceBId: string;
  readonly blendAmount: number; // 0.0 to 1.0
}

// =============================================================================
// 1. addPerformance()
// ============================================================================

/**
 * Add a new performance to the song's performances array
 *
 * Creates a new performance with the provided configuration and adds it
 * to the song's performances array. Returns an updated SongModel with the
 * new performance added.
 *
 * @param song - SongModel with performances array
 * @param performance - Performance configuration to add
 * @returns Result with updated SongModel or error
 *
 * @example
 * ```ts
 * const result = addPerformance(songModel, {
 *   name: 'Chamber Ensemble',
 *   arrangementStyle: 'CHAMBER_ENSEMBLE',
 *   density: 0.6,
 *   grooveProfileId: 'groove-classical',
 *   instrumentationMap: [...],
 *   mixTargets: [...],
 *   registerMap: [...]
 * });
 *
 * if (result.success) {
 *   const updatedSong = result.data;
 *   // Performance added successfully
 * }
 * ```
 */
export function addPerformance(
  song: SongModelWithPerformances,
  performance: Omit<PerformanceRealizationV1, 'version' | 'id' | 'createdAt' | 'modifiedAt'>
): HelperResult<SongModelWithPerformances> {
  try {
    // Create new performance with metadata
    const now = Date.now();
    const newPerformance: PerformanceRealizationV1 = {
      version: '1.0',
      id: crypto.randomUUID(),
      ...performance,
      createdAt: now,
      modifiedAt: now
    };

    // Validate performance
    const validation = validatePerformanceRealization(newPerformance);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Performance validation failed',
          details: validation.errors
        }
      };
    }

    // Check for duplicate name
    const existing = song.performances.find(p => p.name === performance.name);
    if (existing) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: `Performance with name "${performance.name}" already exists`,
          details: { existingId: existing.id }
        }
      };
    }

    // Add to performances array (immutable update)
    const updatedSong: SongModelWithPerformances = {
      ...song,
      performances: [...song.performances, newPerformance]
    };

    // If this is the first performance, make it active
    if (song.performances.length === 0 && !song.activePerformanceId) {
      updatedSong.activePerformanceId = newPerformance.id;
    }

    return {
      success: true,
      data: updatedSong
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }
    };
  }
}

// =============================================================================
// 2. setActivePerformance()
// ============================================================================

/**
 * Set the active performance for the song
 *
 * Updates the activePerformanceId to point to the specified performance.
 * Returns an updated SongModel with the new active performance set.
 *
 * @param song - SongModel with performances array
 * @param performanceId - ID of the performance to make active
 * @returns Result with updated SongModel or error
 *
 * @example
 * ```ts
 * const result = setActivePerformance(songModel, 'performance-uuid');
 *
 * if (result.success) {
 *   const updatedSong = result.data;
 *   // Performance is now active
 * }
 * ```
 */
export function setActivePerformance(
  song: SongModelWithPerformances,
  performanceId: string
): HelperResult<SongModelWithPerformances> {
  // Validate performance ID exists
  const targetPerformance = song.performances.find(p => p.id === performanceId);
  if (!targetPerformance) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Performance with ID "${performanceId}" not found`,
        details: { performanceId }
      }
    };
  }

  // Update active performance ID (immutable update)
  const updatedSong: SongModelWithPerformances = {
    ...song,
    activePerformanceId: performanceId
  };

  return {
    success: true,
    data: updatedSong
  };
}

// =============================================================================
// 3. blendPerformance()
// ============================================================================

/**
 * Create transient blend between two performances
 *
 * Creates a new performance that blends properties from two existing performances.
 * The blendAmount parameter controls the interpolation:
 * - 0.0: 100% performance A
 * - 0.5: 50/50 blend
 * - 1.0: 100% performance B
 *
 * This creates a transient performance that can be used for crossfading
 * between performances. The actual blending happens in the audio engine,
 * this function creates the configuration.
 *
 * @param song - SongModel with performances array
 * @param options - Blend options with performance IDs and blend amount
 * @returns Result with blended performance or error
 *
 * @example
 * ```ts
 * const result = blendPerformance(songModel, {
 *   performanceAId: 'piano-uuid',
 *   performanceBId: 'techno-uuid',
 *   blendAmount: 0.5  // 50/50 blend
 * });
 *
 * if (result.success) {
 *   const blended = result.data;
 *   // Use blended performance for crossfade
 * }
 * ```
 */
export function blendPerformance(
  song: SongModelWithPerformances,
  options: BlendOptions
): HelperResult<PerformanceRealizationV1> {
  const { performanceAId, performanceBId, blendAmount } = options;

  // Validate blend amount
  if (typeof blendAmount !== 'number' || blendAmount < 0 || blendAmount > 1) {
    return {
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'Blend amount must be between 0.0 and 1.0',
        details: { blendAmount }
      }
    };
  }

  // Get both performances
  const perfA = song.performances.find(p => p.id === performanceAId);
  const perfB = song.performances.find(p => p.id === performanceBId);

  if (!perfA) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Performance A with ID "${performanceAId}" not found`,
        details: { performanceAId }
      }
    };
  }

  if (!perfB) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Performance B with ID "${performanceBId}" not found`,
        details: { performanceBId }
      }
    };
  }

  try {
    // Interpolate instrumentation
    const blendedInstrumentationMap = interpolateInstrumentation(
      perfA.instrumentationMap,
      perfB.instrumentationMap,
      blendAmount
    );

    // Interpolate density (linear)
    const blendedDensity = perfA.density + (perfB.density - perfA.density) * blendAmount;

    // Use groove profile from performance A (or B based on blend)
    const blendedGrooveProfileId = blendAmount < 0.5 ? perfA.grooveProfileId : perfB.grooveProfileId;

    // Interpolate ConsoleX profile
    const blendedConsoleXProfileId = blendAmount < 0.5 ? perfA.consoleXProfileId : perfB.consoleXProfileId;

    // Interpolate mix targets
    const blendedMixTargets = interpolateMixTargets(
      perfA.mixTargets,
      perfB.mixTargets,
      blendAmount
    );

    // Interpolate register map
    const blendedRegisterMap = interpolateRegisterMap(
      perfA.registerMap,
      perfB.registerMap,
      blendAmount
    );

    // Create blended performance
    const now = Date.now();
    const blendedPerformance: PerformanceRealizationV1 = {
      version: '1.0',
      id: crypto.randomUUID(),
      name: `Blend: ${perfA.name} ↔ ${perfB.name} (${Math.round(blendAmount * 100)}%)`,
      description: `Transient blend between ${perfA.name} and ${perfB.name}`,
      arrangementStyle: blendAmount < 0.5 ? perfA.arrangementStyle : perfB.arrangementStyle,
      density: blendedDensity,
      grooveProfileId: blendedGrooveProfileId,
      instrumentationMap: blendedInstrumentationMap,
      consoleXProfileId: blendedConsoleXProfileId,
      mixTargets: blendedMixTargets,
      registerMap: blendedRegisterMap,
      createdAt: now,
      modifiedAt: now
    };

    return {
      success: true,
      data: blendedPerformance
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: error instanceof Error ? error.message : 'Failed to blend performances',
        details: error
      }
    };
  }
}

/**
 * Interpolate instrumentation maps between two performances
 */
function interpolateInstrumentation(
  mapA: readonly PerformanceRealizationV1['instrumentationMap'][number][],
  mapB: readonly PerformanceRealizationV1['instrumentationMap'][number][],
  t: number
): PerformanceRealizationV1['instrumentationMap'] {
  // For instrumentation, we switch based on blend threshold
  // This is because you can't really "blend" different instruments
  const sourceMap = t < 0.5 ? mapA : mapB;

  // Return a copy of the source map
  return sourceMap.map(entry => ({ ...entry }));
}

/**
 * Interpolate mix targets between two performances
 */
function interpolateMixTargets(
  targetsA: readonly PerformanceRealizationV1['mixTargets'][number][],
  targetsB: readonly PerformanceRealizationV1['mixTargets'][number][],
  t: number
): PerformanceRealizationV1['mixTargets'] {
  // Collect all unique role IDs
  const roleIds = new Set<string>();
  targetsA.forEach(target => roleIds.add(target.roleId));
  targetsB.forEach(target => roleIds.add(target.roleId));

  // Interpolate for each role
  const blendedTargets = Array.from(roleIds).map(roleId => {
    const targetA = targetsA.find(t => t.roleId === roleId);
    const targetB = targetsB.find(t => t.roleId === roleId);

    // If only one performance has this role, use that
    if (!targetA) return { ...targetB! };
    if (!targetB) return { ...targetA };

    // Interpolate gain (linear in dB)
    const blendedGain = targetA.gain + (targetB.gain - targetA.gain) * t;

    // Interpolate pan (linear)
    const blendedPan = targetA.pan + (targetB.pan - targetA.pan) * t;

    return {
      roleId,
      gain: blendedGain,
      pan: blendedPan
    };
  });

  return blendedTargets;
}

/**
 * Interpolate register maps between two performances
 */
function interpolateRegisterMap(
  mapA: readonly PerformanceRealizationV1['registerMap'][number][],
  mapB: readonly PerformanceRealizationV1['registerMap'][number][],
  t: number
): PerformanceRealizationV1['registerMap'] {
  // Collect all unique role IDs
  const roleIds = new Set<string>();
  mapA.forEach(entry => roleIds.add(entry.roleId));
  mapB.forEach(entry => roleIds.add(entry.roleId));

  // Interpolate for each role
  const blendedRegister = Array.from(roleIds).map(roleId => {
    const entryA = mapA.find(e => e.roleId === roleId);
    const entryB = mapB.find(e => e.roleId === roleId);

    // If only one performance has this role, use that
    if (!entryA) return { ...entryB! };
    if (!entryB) return { ...entryA };

    // Interpolate pitch ranges
    const blendedMinPitch = Math.round(
      entryA.minPitch + (entryB.minPitch - entryA.minPitch) * t
    );
    const blendedMaxPitch = Math.round(
      entryA.maxPitch + (entryB.maxPitch - entryA.maxPitch) * t
    );

    // Use transposition from A (or B based on blend)
    const blendedTransposition = t < 0.5 ? entryA.transposition : entryB.transposition;

    return {
      roleId,
      minPitch: blendedMinPitch,
      maxPitch: blendedMaxPitch,
      transposition: blendedTransposition
    };
  });

  return blendedRegister;
}

// =============================================================================
// 4. listPerformances()
// ============================================================================

/**
 * Get all performances for a song
 *
 * Returns a shallow copy of the performances array for inspection.
 * Modifications to the returned array won't affect the song model.
 *
 * @param song - SongModel with performances array
 * @returns Array of all performances
 *
 * @example
 * ```ts
 * const performances = listPerformances(songModel);
 *
 * performances.forEach(perf => {
 *   console.log(`${perf.name}: ${perf.arrangementStyle}`);
 * });
 * ```
 */
export function listPerformances(
  song: SongModelWithPerformances
): PerformanceRealizationV1[] {
  // Return shallow copy to prevent external modifications
  return [...song.performances];
}

// =============================================================================
// 5. getActivePerformance()
// ============================================================================

/**
 * Get the currently active performance
 *
 * Returns the performance that matches the activePerformanceId.
 * Returns null if no performance is active or if the active performance
 * ID doesn't match any performance.
 *
 * @param song - SongModel with performances array
 * @returns Active performance or null
 *
 * @example
 * ```ts
 * const active = getActivePerformance(songModel);
 *
 * if (active) {
 *   console.log(`Currently playing: ${active.name}`);
 *   console.log(`Density: ${active.density}`);
 *   console.log(`Instruments: ${active.instrumentationMap.length}`);
 * } else {
 *   console.log('No active performance');
 * }
 * ```
 */
export function getActivePerformance(
  song: SongModelWithPerformances
): PerformanceRealizationV1 | null {
  // Find active performance by ID
  const active = song.performances.find(
    p => p.id === song.activePerformanceId
  );

  return active || null;
}

// =============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a song has any performances
 *
 * @param song - SongModel with performances array
 * @returns true if the song has at least one performance
 */
export function hasPerformances(
  song: SongModelWithPerformances
): boolean {
  return song.performances.length > 0;
}

/**
 * Get the count of performances in a song
 *
 * @param song - SongModel with performances array
 * @returns Number of performances
 */
export function getPerformanceCount(
  song: SongModelWithPerformances
): number {
  return song.performances.length;
}

/**
 * Find a performance by name
 *
 * @param song - SongModel with performances array
 * @param name - Performance name to search for
 * @returns Performance or undefined
 */
export function findPerformanceByName(
  song: SongModelWithPerformances,
  name: string
): PerformanceRealizationV1 | undefined {
  return song.performances.find(p => p.name === name);
}

/**
 * Validate that a SongModel has the required performance fields
 *
 * @param song - Any SongModel object
 * @returns true if the song has performances array and activePerformanceId
 */
export function isSongModelWithPerformances(
  song: unknown
): song is SongModelWithPerformances {
  if (typeof song !== 'object' || song === null) {
    return false;
  }

  const s = song as Record<string, unknown>;

  return (
    Array.isArray(s.performances) &&
    typeof s.activePerformanceId === 'string' &&
    s.version === '1.0'
  );
}

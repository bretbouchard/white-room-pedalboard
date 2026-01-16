/**
 * Schillinger SDK 2.1 - Schema Migration Utilities
 *
 * Handle schema version migration and backward compatibility.
 */

import { MigrationResult } from "./types";

// =============================================================================
// VERSION REGISTRY
// =============================================================================

const CURRENT_VERSION = "1.0";

const VERSION_MIGRATIONS: Record<string, string> = {
  // Future migrations:
  // "1.0": "1.1",
  // "1.1": "2.0",
};

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

/**
 * Check if data needs migration
 */
export function needsMigration(version: string): boolean {
  return version !== CURRENT_VERSION;
}

/**
 * Get target version for data migration
 */
export function getTargetVersion(currentVersion: string): string {
  return VERSION_MIGRATIONS[currentVersion] || CURRENT_VERSION;
}

/**
 * Migrate data from one version to another
 *
 * @param data - Data to migrate
 * @param fromVersion - Current version of the data
 * @param toVersion - Target version (defaults to current)
 * @returns Migration result with migrated data or errors
 */
export function migrateData<T = unknown>(
  data: unknown,
  fromVersion: string,
  toVersion?: string,
): MigrationResult<T> {
  const targetVersion = toVersion || getTargetVersion(fromVersion);

  // If already at target version, return as-is
  if (fromVersion === targetVersion) {
    return {
      success: true,
      fromVersion,
      toVersion: targetVersion,
      warnings: [],
      migratedData: data as T,
    };
  }

  // Check if migration path exists
  if (!VERSION_MIGRATIONS[fromVersion]) {
    return {
      success: false,
      fromVersion,
      toVersion: targetVersion,
      warnings: [],
      migratedData: undefined,
    };
  }

  // Apply migrations (currently no migrations needed for 1.0)
  try {
    const migratedData = applyMigration(data, fromVersion, targetVersion);

    return {
      success: true,
      fromVersion,
      toVersion: targetVersion,
      warnings: [],
      migratedData: migratedData as T,
    };
  } catch (error) {
    return {
      success: false,
      fromVersion,
      toVersion: targetVersion,
      warnings: [`Migration failed: ${error}`],
      migratedData: undefined,
    };
  }
}

/**
 * Apply specific migration from one version to another
 */
function applyMigration(
  data: unknown,
  fromVersion: string,
  toVersion: string,
): unknown {
  // Currently no migrations needed for 1.0
  // Future migrations would go here, e.g.:
  //
  // if (fromVersion === "1.0" && toVersion === "1.1") {
  //   return migrate_1_0_to_1_1(data);
  // }
  //
  // if (fromVersion === "1.1" && toVersion === "2.0") {
  //   return migrate_1_1_to_2_0(data);
  // }

  // Apply performance migration if needed
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;

    // Migrate SongState without performances array
    if ("version" in obj && obj.version === "1.0") {
      // Check if this is a SongState (has notes array)
      if ("notes" in obj && Array.isArray(obj.notes)) {
        // Check if performances array is missing
        if (!("performances" in obj) || !Array.isArray(obj.performances)) {
          return migrateSongStateAddPerformances(obj);
        }
      }
    }
  }

  return data;
}

/**
 * Migrate SongState to add performances array
 *
 * This adds a default performance for existing songs that don't have
 * the performances array yet.
 *
 * @param oldState - SongState without performances
 * @returns SongState with performances array
 */
export function migrateSongStateAddPerformances(
  oldState: Record<string, unknown>
): Record<string, unknown> {
  // Create default performance
  const defaultPerformanceId = `perf-migrated-${Date.now()}`;
  const defaultPerformance = {
    version: "1",
    id: defaultPerformanceId,
    name: "Default Performance",
    arrangementStyle: "SOLO_PIANO",
    density: 1.0,
    grooveProfileId: "default",
    consoleXProfileId: "default",
    instrumentationMap: {},
    mixTargets: {},
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    metadata: {}
  };

  // Return new state with performances
  return {
    ...oldState,
    performances: [defaultPerformance],
    activePerformanceId: defaultPerformanceId
  };
}

// =============================================================================
// SCHEMA VERSION DETECTION
// =============================================================================

/**
 * Detect schema version from data object
 */
export function detectVersion(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw new Error("Cannot detect version: data is not an object");
  }

  const obj = data as Record<string, unknown>;

  // Check for version field
  if ("version" in obj && typeof obj.version === "string") {
    return obj.version;
  }

  // Legacy data without version field
  // Assume earliest version for compatibility
  return "1.0";
}

/**
 * Ensure data is at current version, migrating if necessary
 */
export function ensureCurrentVersion<T = unknown>(data: unknown): T {
  const version = detectVersion(data);

  if (!needsMigration(version)) {
    return data as T;
  }

  const result = migrateData<T>(data, version);

  if (!result.success) {
    throw new Error(
      `Failed to migrate data from ${version} to ${CURRENT_VERSION}`,
    );
  }

  return result.migratedData!;
}

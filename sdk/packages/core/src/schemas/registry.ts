/**
 * Schema Registration
 *
 * Registers all JSON schemas with the default validator.
 * Import this file to ensure all schemas are available for validation.
 */

import { getValidator } from "./validator";
import schillingerSongSchema from "./schillinger-song-v1.schema.json";
import songModelSchema from "./song-model-v1.schema.json";
import derivationRecordSchema from "./derivation-record-v1.schema.json";
import reconciliationReportSchema from "./reconciliation-report-v1.schema.json";

/**
 * Track initialization state
 */
let initialized = false;

/**
 * Initialize all schemas
 *
 * Call this function to register all JSON schemas with the default validator.
 * This is automatically called when this module is imported.
 * This function is idempotent - calling it multiple times is safe.
 */
export function initializeSchemas(): void {
  // Only initialize once
  if (initialized) {
    return;
  }

  const validator = getValidator();

  // Register SchillingerSong_v1 schema
  validator.addSchema(schillingerSongSchema as Record<string, unknown>, "schillinger-song-v1");

  // Register SongModel_v1 schema
  validator.addSchema(songModelSchema as Record<string, unknown>, "song-model-v1");

  // Register DerivationRecord_v1 schema
  validator.addSchema(derivationRecordSchema as Record<string, unknown>, "derivation-record-v1");

  // Register ReconciliationReport_v1 schema
  validator.addSchema(
    reconciliationReportSchema as Record<string, unknown>,
    "reconciliation-report-v1"
  );

  initialized = true;
}

// Auto-initialize on import
initializeSchemas();

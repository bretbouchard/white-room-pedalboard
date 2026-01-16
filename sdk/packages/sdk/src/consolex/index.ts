/**
 * ConsoleX Integration
 *
 * Complete ConsoleX performance integration for the White Room audio plugin.
 * Provides mixing profiles, registry management, and profile application.
 *
 * Example usage:
 * ```typescript
 * import { createConsoleXProfileApplierWithPresets } from '@whiteroom/sdk/consolex';
 *
 * // Create applier with preset profiles
 * const applier = createConsoleXProfileApplierWithPresets();
 *
 * // Apply a profile
 * await applier.applyProfile('consolex-solo-piano');
 *
 * // Get current profile
 * const current = await applier.getCurrentProfile();
 * console.log('Current profile:', current.profile?.name);
 * ```
 */

// Profile types and validation
export {
  validateConsoleXProfile,
  serializeConsoleXProfile,
  deserializeConsoleXProfile,
  cloneConsoleXProfile
} from './profile.js';

export type {
  ConsoleXProfile,
  BusSettings,
  InsertEffect,
  Send,
  PerformanceSettings
} from './profile.js';

// Profile registry and presets
export {
  ConsoleXProfileRegistry,
  createConsoleXProfileRegistryWithPresets,
  createSoloPianoConsoleXProfile,
  createSATBConsoleXProfile,
  createAmbientTechnoConsoleXProfile,
  getDefaultConsoleXProfileId
} from './registry.js';

export type {
  ProfileRegistryOptions,
  GetProfileResult,
  AddProfileResult
} from './registry.js';

// Profile applier
export {
  ConsoleXProfileApplier,
  createConsoleXProfileApplier,
  createConsoleXProfileApplierWithPresets
} from './applier.js';

export type {
  ConsoleXApplierOptions,
  ApplyProfileResult,
  GetCurrentProfileResult
} from './applier.js';

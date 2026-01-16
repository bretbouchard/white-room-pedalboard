/**
 * ConsoleX Profile Applier
 *
 * Applies ConsoleX profiles to the JUCE backend via FFI bridge.
 * Handles profile loading, parameter application, and validation.
 */

import type { ConsoleXProfile } from './profile.js';
import type { ConsoleXProfileRegistry } from './registry.js';
import { createConsoleXProfileRegistryWithPresets as createRegistryWithPresets } from './registry.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ConsoleXApplierOptions {
  readonly registry: ConsoleXProfileRegistry;
}

export interface ApplyProfileResult {
  readonly success: boolean;
  readonly appliedProfile?: ConsoleXProfile;
  readonly error?: {
    readonly code: 'NOT_FOUND' | 'FFI_ERROR' | 'VALIDATION_ERROR';
    readonly message: string;
    readonly details?: unknown;
  };
}

export interface GetCurrentProfileResult {
  readonly success: boolean;
  readonly profileId?: string;
  readonly profile?: ConsoleXProfile;
  readonly error?: {
    readonly code: 'NOT_FOUND' | 'FFI_ERROR';
    readonly message: string;
  };
}

// FFI bridge interface (mock for now, will be implemented in JUCE backend)
interface ConsoleXFFIBridge {
  loadConsoleXProfile(profileId: string): Promise<void>;
  applyConsoleXProfile(profileJson: string): Promise<void>;
  getCurrentConsoleXProfile(): Promise<string>;
}

// =============================================================================
// APPLIER IMPLEMENTATION
// =============================================================================

export class ConsoleXProfileApplier {
  private registry: ConsoleXProfileRegistry;
  private ffi: ConsoleXFFIBridge;
  private currentProfileId?: string;

  constructor(options: ConsoleXApplierOptions) {
    this.registry = options.registry;

    // Initialize FFI bridge (mock implementation for now)
    this.ffi = this.createFFIBridge();
  }

  /**
   * Apply a ConsoleX profile by ID
   *
   * This is the main entry point for performance switching.
   * When user switches performances, this method applies the corresponding
   * ConsoleX profile to the JUCE backend.
   */
  async applyProfile(profileId: string): Promise<ApplyProfileResult> {
    try {
      // 1. Get profile from registry
      const getResult = this.registry.getProfile(profileId);

      if (!getResult.success || !getResult.profile) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `ConsoleX profile "${profileId}" not found in registry`
          }
        };
      }

      const profile = getResult.profile;

      // 2. Validate profile before applying
      const validation = this.validateProfileForApplication(profile);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ConsoleX profile validation failed',
            details: validation.errors
          }
        };
      }

      // 3. Apply profile via FFI bridge
      await this.applyProfileToBackend(profile);

      // 4. Update current profile
      this.currentProfileId = profileId;

      return {
        success: true,
        appliedProfile: profile
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FFI_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error applying profile',
          details: error
        }
      };
    }
  }

  /**
   * Get the currently applied ConsoleX profile
   */
  async getCurrentProfile(): Promise<GetCurrentProfileResult> {
    try {
      // If no profile applied yet, return not found
      if (!this.currentProfileId) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No ConsoleX profile currently applied'
          }
        };
      }

      // Get profile from registry
      const getResult = this.registry.getProfile(this.currentProfileId);

      if (!getResult.success || !getResult.profile) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Current profile "${this.currentProfileId}" not found in registry`
          }
        };
      }

      return {
        success: true,
        profileId: this.currentProfileId,
        profile: getResult.profile
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FFI_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error getting current profile',
          details: error
        }
      };
    }
  }

  /**
   * Reset to default profile (solo piano)
   */
  async resetToDefault(): Promise<ApplyProfileResult> {
    return this.applyProfile('consolex-solo-piano');
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Validate profile before applying to backend
   */
  private validateProfileForApplication(profile: ConsoleXProfile): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check master bus
    if (!profile.masterBus) {
      errors.push('Master bus is required');
    }

    // Check voice buses
    if (!profile.voiceBusses || profile.voiceBusses.length === 0) {
      errors.push('At least one voice bus is required');
    }

    // Check performance settings
    if (!profile.performance) {
      errors.push('Performance settings are required');
    } else {
      if (profile.performance.targetCpuUsage < 0 || profile.performance.targetCpuUsage > 100) {
        errors.push('Target CPU usage must be between 0 and 100');
      }

      if (profile.performance.maxVoices < 1 || profile.performance.maxVoices > 256) {
        errors.push('Max voices must be between 1 and 256');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Apply profile to JUCE backend via FFI
   *
   * This method serializes the profile and sends it to the JUCE backend.
   * The backend then applies the settings to the audio engine.
   */
  private async applyProfileToBackend(profile: ConsoleXProfile): Promise<void> {
    // Serialize profile to JSON
    const profileJson = JSON.stringify(profile);

    // Load profile in backend
    await this.ffi.loadConsoleXProfile(profile.id);

    // Apply profile settings
    await this.ffi.applyConsoleXProfile(profileJson);

    // In a real implementation, we would:
    // 1. Wait for backend confirmation
    // 2. Validate that settings were applied correctly
    // 3. Check for any audio glitches
    // 4. Log the application for debugging
  }

  /**
   * Create FFI bridge (mock implementation)
   *
   * In production, this would be replaced with actual FFI calls to JUCE.
   * For now, we use a mock that simulates the API.
   */
  private createFFIBridge(): ConsoleXFFIBridge {
    return {
      loadConsoleXProfile: async (profileId: string): Promise<void> => {
        // Mock implementation - in production this would call JUCE
        console.log(`[ConsoleX FFI] Loading profile: ${profileId}`);
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
      },

      applyConsoleXProfile: async (profileJson: string): Promise<void> => {
        // Mock implementation - in production this would call JUCE
        const profile = JSON.parse(profileJson) as ConsoleXProfile;
        console.log(`[ConsoleX FFI] Applying profile: ${profile.name}`);
        console.log(`[ConsoleX FFI] - Master gain: ${profile.masterBus.gain}`);
        console.log(`[ConsoleX FFI] - Voice buses: ${profile.voiceBusses.length}`);
        console.log(`[ConsoleX FFI] - Mix buses: ${profile.mixBusses.length}`);
        console.log(`[ConsoleX FFI] - Target CPU: ${profile.performance.targetCpuUsage}%`);
        console.log(`[ConsoleX FFI] - Max voices: ${profile.performance.maxVoices}`);
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 20));
      },

      getCurrentConsoleXProfile: async (): Promise<string> => {
        // Mock implementation - return current profile ID
        return this.currentProfileId || '';
      }
    };
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a ConsoleXProfileApplier with a registry
 */
export function createConsoleXProfileApplier(
  registry: ConsoleXProfileRegistry
): ConsoleXProfileApplier {
  return new ConsoleXProfileApplier({ registry });
}

/**
 * Create a ConsoleXProfileApplier with default presets
 */
export function createConsoleXProfileApplierWithPresets(): ConsoleXProfileApplier {
  const registry = createRegistryWithPresets();
  return createConsoleXProfileApplier(registry);
}

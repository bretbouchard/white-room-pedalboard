/**
 * Public surface for the Core Theory SDK
 *
 * This file re-exports the major modules but does not duplicate type definitions
 * (types are declared in `./types`). This avoids duplicate-export conflicts.
 */

// Re-export types and runtime classes
export * from './types';
export * from './knowledge-base/scales';
export * from './knowledge-base/scales';
export * from './knowledge-base/scales';

// Re-export existing modules (implementations live in their own files)
export * from './knowledge-base/scales';
export * from './knowledge-base/scales';

export * from './theory-engine';

// Version and compatibility metadata
export const THEORY_ENGINE_VERSION = '1.0.0';
export const SUPPORTED_LANGUAGES = ['typescript', 'javascript', 'python', 'swift', 'cpp'] as const;
export const API_COMPATIBILITY_VERSION = '1.0';

export const THEORY_ENGINE_METADATA = {
  version: THEORY_ENGINE_VERSION,
  supportedLanguages: SUPPORTED_LANGUAGES,
  apiCompatibility: API_COMPATIBILITY_VERSION,
  features: [
    'harmonic_analysis',
    'key_detection',
    'chord_progression_analysis',
    'voice_leading_validation',
    'schillinger_system',
    'pattern_analysis',
    'style_validation',
    'multi_language_support',
  ],
};

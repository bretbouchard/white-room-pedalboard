/**
 * Schillinger SDK Components
 *
 * Export all Schillinger-related components and utilities for easy import.
 */

export { SchillingerProvider, useSchillinger, SchillingerContext } from './SchillingerProvider';
export { SchillingerPatternGenerator } from './SchillingerPatternGenerator';
export { SchillingerMusicAnalyzer } from './SchillingerMusicAnalyzer';

// Re-export hooks for convenience
export {
  useSchillingerSDK,
  useSchillingerGeneration,
  useSchillingerAnalysis,
  useSchillingerComplete,
  usePatternGeneration,
  useChordProgressionGeneration,
  useMelodyGeneration,
} from '@/hooks/useSchillingerSDK';

// Re-export service for advanced usage
export { schillingerService, default as SchillingerService } from '@/services/schillingerService';
export type {
  GenerationRequest,
  AnalysisRequest,
  ServiceResponse,
  SchillingerServiceConfig,
} from '@/services/schillingerService';
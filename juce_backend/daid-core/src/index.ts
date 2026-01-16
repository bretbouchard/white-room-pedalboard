// Core exports
export { DAIDGenerator } from './generator';
export { DAIDClient } from './client';
export { CacheManager } from './cache';
export { SystemDiscovery } from './discovery';

// DAID v2 Audio Integration
export { AudioFingerprint } from './audio-fingerprint';
export { AudioRenderRecorder } from './audio-render-recorder';

// Unified client API
export { UnifiedDAIDClient } from './unified-client';
export type {
  UnifiedDAIDConfig,
  DAIDOperationResult,
  DAIDQueryOptions
} from './unified-client';

// Enhanced validation and auto-generation
export { DAIDValidator, DAIDStandardizer } from './validation';
export {
  AutoDAIDGenerator,
  DAIDMiddleware,
  createAutoDAIDGenerator,
  OperationTypes,
  EntityTypes,
} from './auto-generation';

// Monitoring and recovery


// Comprehensive provenance tracking
export { ProvenanceChainBuilder } from './provenance-chain';
export { ProvenanceAPI } from './provenance-api';
export {
  ProvenanceProvider,
  ProvenanceChainViewer,
  ProvenanceSearch,
  ProvenanceVisualization,
  useProvenance,
  useProvenanceChain,
  useEntityProvenance,
} from './react-provenance';

// DAID monitoring and recovery
export { DAIDHealthMonitor, DAIDRecoveryManager, DAIDSynchronizationManager } from './monitoring';

// Type exports
export type {
  DAIDComponents,
  DAIDV2Components,
  AudioMetadata as CoreAudioMetadata,
  ProvenanceRecord,
  DAIDValidationResult,
  CacheInvalidationRule,
  SystemDAIDPatterns,
} from './types';
export type { DAIDClientConfig } from './client';

// DAID v2 Type exports from audio-fingerprint
export type {
  AudioFingerprintConfig,
  FingerprintResult,
  FingerprintComparison,
  AudioMetadata,
} from './audio-fingerprint';

// DAID v2 Type exports from audio-render-recorder
export type {
  AudioRenderConfig,
  RecordingSession,
  RecordingMetadata,
  AudioChunk,
  RecordingStats,
} from './audio-render-recorder';

// Utility exports
export { createDAIDMiddleware } from './middleware';

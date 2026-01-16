export interface DAIDComponents {
  version: string;
  timestamp: string;
  agentId: string;
  entityType: string;
  entityId: string;
  provenanceHash: string;
}

export interface DAIDV2Components extends DAIDComponents {
  fingerprint?: string;
  audioMetadata?: AudioMetadata;
  generationMethod?: string;
}

export interface AudioMetadata {
  duration?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  bitrate?: number;
}

// Define proper type for metadata to replace 'any'
export interface DAIDMetadata {
  [key: string]: string | number | boolean | null | undefined | DAIDMetadata | (string | number | boolean | null | undefined | DAIDMetadata)[];
}

export interface ProvenanceRecord {
  entityType: string;
  entityId: string;
  operation: string;
  agentId: string;
  parentDAIDs?: string[];
  metadata?: DAIDMetadata;
  timestamp?: string;
}

export interface DAIDValidationResult {
  valid: boolean;
  components?: DAIDComponents;
  errors?: string[];
}

export interface CacheInvalidationRule {
  entityType: string;
  dependsOn: string[];
  cascadeTo: string[];
}

export interface SystemDAIDPatterns {
  [systemName: string]: {
    entityTypes: string[];
    operations: string[];
    agentIds: string[];
  };
}

export interface DAIDConfig {
  agentId: string;
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

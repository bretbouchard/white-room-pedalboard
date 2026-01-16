import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { DAIDComponents, DAIDValidationResult } from './types';

// Define proper type for metadata to replace 'any'
export interface DAIDMetadata {
  [key: string]: string | number | boolean | null | undefined | DAIDMetadata | (string | number | boolean | null | undefined | DAIDMetadata)[];
}

export class DAIDGenerator {
  private static readonly VERSION_V1 = 'v1.0';
  private static readonly VERSION_V2 = 'v2.0';
  private static readonly DAID_REGEX = /^daid:v\d+\.\d+:[^:]+:[^:]+:[^:]+:[^:]+:[^:]+$/;

  /**
   * Generate a new DAID with proper provenance tracking
   */
  static generate(params: {
    agentId: string;
    entityType: string;
    entityId: string;
    operation?: string;
    parentDAIDs?: string[];
    metadata?: DAIDMetadata;
    version?: 'v1.0' | 'v2.0';
  }): string {
    const version = params.version || 'v1.0';
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const operation = params.operation || 'create';

    const provenanceHash = this.calculateProvenanceHash(
      params.parentDAIDs || [],
      operation,
      params.metadata || {},
      params.entityId,
      version
    );

    return `daid:${version}:${timestamp}:${params.agentId}:${params.entityType}:${params.entityId}:${provenanceHash}`;
  }

  /**
   * Generate a DAID v2.0 with enhanced features
   */
  static generateV2(params: {
    agentId: string;
    entityType: string;
    entityId: string;
    operation?: string;
    parentDAIDs?: string[];
    metadata?: DAIDMetadata;
    fingerprint?: string;
    audioMetadata?: {
      duration?: number;
      sampleRate?: number;
      channels?: number;
      format?: string;
    };
  }): string {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const operation = params.operation || 'create';

    // Enhanced metadata for v2
    const enhancedMetadata: DAIDMetadata = {
      ...params.metadata,
      ...(params.fingerprint && { fingerprint: params.fingerprint }),
      ...(params.audioMetadata && { audioMetadata: params.audioMetadata }),
      generationMethod: 'v2-enhanced',
    };

    const provenanceHash = this.calculateProvenanceHash(
      params.parentDAIDs || [],
      operation,
      enhancedMetadata,
      params.entityId,
      'v2.0'
    );

    return `daid:v2.0:${timestamp}:${params.agentId}:${params.entityType}:${params.entityId}:${provenanceHash}`;
  }

  /**
   * Parse a DAID string into its components
   */
  static parse(daid: string): DAIDComponents | null {
    if (!daid || typeof daid !== 'string') {
      return null;
    }

    if (!this.DAID_REGEX.test(daid)) {
      return null;
    }

    const parts = daid.split(':');
    if (parts.length !== 7) {
      return null;
    }

    return {
      version: parts[1]!,
      timestamp: parts[2]!,
      agentId: parts[3]!,
      entityType: parts[4]!,
      entityId: parts[5]!,
      provenanceHash: parts[6]!,
    };
  }

  /**
   * Validate DAID format
   */
  static validate(daid: string): DAIDValidationResult {
    if (!daid || typeof daid !== 'string') {
      return { valid: false, errors: ['DAID must be a non-empty string'] };
    }

    if (!this.DAID_REGEX.test(daid)) {
      return { valid: false, errors: ['DAID format is invalid'] };
    }

    // Parse manually to avoid circular dependency
    const parts = daid.split(':');
    if (parts.length !== 7) {
      return { valid: false, errors: ['Invalid DAID structure'] };
    }

    const components = {
      version: parts[1]!,
      timestamp: parts[2]!,
      agentId: parts[3]!,
      entityType: parts[4]!,
      entityId: parts[5]!,
      provenanceHash: parts[6]!,
    };

    const errors: string[] = [];

    // Validate timestamp (convert back from modified format)
    // Replace only the first two dashes (time part) back to colons
    const originalTimestamp = components.timestamp.replace(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2}\.\d{3}Z)$/,
      '$1-$2-$3T$4:$5:$6'
    );
    if (isNaN(Date.parse(originalTimestamp))) {
      errors.push('Invalid timestamp format');
    }

    // Validate hash length - v1 uses 16 chars, v2 uses 32 chars
    if (components.provenanceHash.length !== 16 && components.provenanceHash.length !== 32) {
      errors.push('Provenance hash must be 16 characters (v1) or 32 characters (v2)');
    }

    return {
      valid: errors.length === 0,
      components: errors.length === 0 ? components : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Check if DAID format is valid (simple check)
   */
  static isValid(daid: string): boolean {
    return this.validate(daid).valid;
  }

  /**
   * Calculate provenance hash from parents, operation, and metadata
   */
  private static calculateProvenanceHash(
    parentDAIDs: string[],
    operation: string,
    metadata: DAIDMetadata,
    entityId: string,
    version: string = 'v1.0'
  ): string {
    const provenanceData = {
      parents: parentDAIDs.sort(), // Sort for consistency
      operation,
      metadata: this.normalizeMetadata(metadata),
      entityId,
      version,
      salt: uuidv4(), // Ensure uniqueness even with identical inputs
    };

    const hash = createHash('sha256').update(JSON.stringify(provenanceData)).digest('hex');

    // Version-specific hash length
    if (version === 'v2.0') {
      // V2 uses longer hash for enhanced uniqueness
      return hash.substring(0, 32);
    } else {
      // V1 uses original 16-character hash
      return hash.substring(0, 16);
    }
  }

  /**
   * Normalize metadata for consistent hashing
   */
  private static normalizeMetadata(metadata: DAIDMetadata): DAIDMetadata {
    const normalized: DAIDMetadata = {};

    // Sort keys and handle nested objects
    Object.keys(metadata)
      .sort()
      .forEach(key => {
        const value = metadata[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          normalized[key] = this.normalizeMetadata(value as DAIDMetadata);
        } else {
          normalized[key] = value;
        }
      });

    return normalized;
  }
}

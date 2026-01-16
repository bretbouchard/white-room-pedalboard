/**
 * Enhanced DAID validation and integrity checking system
 */

import { DAIDComponents } from './types';
import { DAIDGenerator } from './generator';

export interface DAIDIntegrityCheck {
  daid: string;
  isValid: boolean;
  hasValidFormat: boolean;
  hasValidTimestamp: boolean;
  hasValidHash: boolean;
  hasValidComponents: boolean;
  errors: string[];
  warnings: string[];
}

export interface DAIDIntegrityReport {
  totalChecked: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
  checks: DAIDIntegrityCheck[];
  summary: {
    formatErrors: number;
    timestampErrors: number;
    hashErrors: number;
    componentErrors: number;
  };
}

export class DAIDValidator {
  private static readonly MAX_TIMESTAMP_DRIFT_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly VALID_ENTITY_TYPES = new Set([
    'composition',
    'pattern',
    'analysis',
    'user_action',
    'api_call',
    'file',
    'plugin_processing',
    'audio_analysis',
    'provenance_record',
    'user',
    'session',
    'configuration',
    'model',
    'training_data',
  ]);

  /**
   * Enhanced DAID validation with comprehensive checks
   */
  static validateEnhanced(daid: string): DAIDIntegrityCheck {
    const result: DAIDIntegrityCheck = {
      daid,
      isValid: false,
      hasValidFormat: false,
      hasValidTimestamp: false,
      hasValidHash: false,
      hasValidComponents: false,
      errors: [],
      warnings: [],
    };

    // Basic format validation
    const basicValidation = DAIDGenerator.validate(daid);
    if (!basicValidation.valid) {
      result.errors.push(...(basicValidation.errors || []));
      return result;
    }

    result.hasValidFormat = true;
    const components = basicValidation.components!;

    // Enhanced timestamp validation
    const timestampCheck = this.validateTimestamp(components.timestamp);
    result.hasValidTimestamp = timestampCheck.valid;
    if (!timestampCheck.valid) {
      result.errors.push(...timestampCheck.errors);
    }
    if (timestampCheck.warnings.length > 0) {
      result.warnings.push(...timestampCheck.warnings);
    }

    // Enhanced hash validation
    const hashCheck = this.validateProvenanceHash(components.provenanceHash);
    result.hasValidHash = hashCheck.valid;
    if (!hashCheck.valid) {
      result.errors.push(...hashCheck.errors);
    }

    // Component validation
    const componentCheck = this.validateComponents(components);
    result.hasValidComponents = componentCheck.valid;
    if (!componentCheck.valid) {
      result.errors.push(...componentCheck.errors);
    }
    if (componentCheck.warnings.length > 0) {
      result.warnings.push(...componentCheck.warnings);
    }

    result.isValid =
      result.hasValidFormat &&
      result.hasValidTimestamp &&
      result.hasValidHash &&
      result.hasValidComponents;

    return result;
  }

  /**
   * Validate timestamp with enhanced checks
   */
  public static validateTimestamp(timestamp: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Handle the modified timestamp format (colons replaced with dashes)
      const originalTimestamp = timestamp.replace(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2}\.\d{3}Z)$/,
        '$1-$2-$3T$4:$5:$6'
      );
      const date = new Date(originalTimestamp);

      if (isNaN(date.getTime())) {
        errors.push('Invalid timestamp format');
        return { valid: false, errors, warnings };
      }

      // Check if timestamp is in the future (with some tolerance)
      const now = new Date();
      const timeDiff = date.getTime() - now.getTime();

      if (timeDiff > this.MAX_TIMESTAMP_DRIFT_MS) {
        warnings.push('Timestamp is significantly in the future');
      }

      // Check if timestamp is too old (more than 1 year)
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      if (date < oneYearAgo) {
        warnings.push('Timestamp is more than 1 year old');
      }

      // Check timestamp precision
      if (!originalTimestamp.includes('.')) {
        warnings.push('Timestamp lacks millisecond precision');
      }
    } catch (error) {
      errors.push(`Timestamp parsing error: ${error}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate provenance hash
   */
  public static validateProvenanceHash(hash: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check length - v1 uses 16 chars, v2 uses 32 chars
    if (hash.length !== 16 && hash.length !== 32) {
      errors.push(`Provenance hash must be 16 characters (v1) or 32 characters (v2), got ${hash.length}`);
    }

    // Check format (hexadecimal)
    if (!/^[a-f0-9]{16}$/i.test(hash) && !/^[a-f0-9]{32}$/i.test(hash)) {
      errors.push('Provenance hash must be 16 or 32 hexadecimal characters');
    }

    // Check for obviously invalid hashes
    if (hash === '0000000000000000' || hash === 'ffffffffffffffff' ||
        hash === '00000000000000000000000000000000' || hash === 'ffffffffffffffffffffffffffffffff') {
      errors.push('Provenance hash appears to be a placeholder value');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate DAID components
   */
  public static validateComponents(components: DAIDComponents): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate version
    if (!components.version.match(/^v\d+\.\d+$/)) {
      errors.push('Version must be in format vX.Y');
    }

    // Validate agent ID
    if (!components.agentId || components.agentId.length < 3) {
      errors.push('Agent ID must be at least 3 characters');
    }

    if (components.agentId.includes(':')) {
      errors.push('Agent ID cannot contain colons');
    }

    // Validate entity type
    if (!components.entityType || components.entityType.length < 2) {
      errors.push('Entity type must be at least 2 characters');
    }

    if (!this.VALID_ENTITY_TYPES.has(components.entityType)) {
      warnings.push(`Entity type '${components.entityType}' is not in the standard set`);
    }

    // Validate entity ID
    if (!components.entityId || components.entityId.length < 1) {
      errors.push('Entity ID cannot be empty');
    }

    if (components.entityId.includes(':')) {
      errors.push('Entity ID cannot contain colons');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Batch validate multiple DAIDs
   */
  static validateBatch(daids: string[]): DAIDIntegrityReport {
    const checks: DAIDIntegrityCheck[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;
    let formatErrors = 0;
    let timestampErrors = 0;
    let hashErrors = 0;
    let componentErrors = 0;

    for (const daid of daids) {
      const check = this.validateEnhanced(daid);
      checks.push(check);

      if (check.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      if (check.warnings.length > 0) {
        warningCount++;
      }

      if (!check.hasValidFormat) formatErrors++;
      if (!check.hasValidTimestamp) timestampErrors++;
      if (!check.hasValidHash) hashErrors++;
      if (!check.hasValidComponents) componentErrors++;
    }

    return {
      totalChecked: daids.length,
      validCount,
      invalidCount,
      warningCount,
      checks,
      summary: {
        formatErrors,
        timestampErrors,
        hashErrors,
        componentErrors,
      },
    };
  }

  /**
   * Check DAID format compatibility across versions
   */
  static checkVersionCompatibility(
    daid1: string,
    daid2: string
  ): {
    compatible: boolean;
    version1: string;
    version2: string;
    issues: string[];
  } {
    const issues: string[] = [];

    const components1 = DAIDGenerator.parse(daid1);
    const components2 = DAIDGenerator.parse(daid2);

    if (!components1 || !components2) {
      issues.push('One or both DAIDs are invalid');
      return {
        compatible: false,
        version1: 'unknown',
        version2: 'unknown',
        issues,
      };
    }

    const version1 = components1.version;
    const version2 = components2.version;

    // Check version compatibility
    if (version1 !== version2) {
      const v1Parts = version1.replace('v', '').split('.').map(Number);
      const v2Parts = version2.replace('v', '').split('.').map(Number);

      // Major version differences are incompatible
      if (v1Parts[0] !== v2Parts[0]) {
        issues.push(`Major version mismatch: ${version1} vs ${version2}`);
      }
      // Minor version differences might have compatibility issues
      else if (
        v1Parts[1] !== undefined &&
        v2Parts[1] !== undefined &&
        Math.abs(v1Parts[1] - v2Parts[1]) > 1
      ) {
        issues.push(`Significant minor version difference: ${version1} vs ${version2}`);
      }
    }

    return {
      compatible: issues.length === 0,
      version1,
      version2,
      issues,
    };
  }

  /**
   * Suggest fixes for invalid DAIDs
   */
  static suggestFixes(check: DAIDIntegrityCheck): string[] {
    const suggestions: string[] = [];

    if (!check.hasValidFormat) {
      suggestions.push('Regenerate DAID using DAIDGenerator.generate()');
    }

    if (!check.hasValidTimestamp) {
      suggestions.push('Ensure timestamp is in ISO 8601 format with milliseconds');
    }

    if (!check.hasValidHash) {
      suggestions.push('Recalculate provenance hash using proper input data');
    }

    if (!check.hasValidComponents) {
      suggestions.push('Validate agent ID, entity type, and entity ID formats');
      suggestions.push('Ensure no component contains colon characters');
    }

    if (check.warnings.length > 0) {
      suggestions.push('Review warnings for potential data quality issues');
    }

    return suggestions;
  }
}

/**
 * DAID format standardization utilities
 */
export class DAIDStandardizer {
  /**
   * Standardize DAID format across components
   */
  static standardizeFormat(daid: string): string {
    // Parse and regenerate to ensure consistent format
    const components = DAIDGenerator.parse(daid);
    if (!components) {
      throw new Error('Cannot standardize invalid DAID');
    }

    // Reconstruct with standardized format
    return `daid:${components.version}:${components.timestamp}:${components.agentId}:${components.entityType}:${components.entityId}:${components.provenanceHash}`;
  }

  /**
   * Normalize agent ID format
   */
  static normalizeAgentId(agentId: string): string {
    return agentId
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Normalize entity type format
   */
  static normalizeEntityType(entityType: string): string {
    return entityType
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Normalize entity ID format
   */
  static normalizeEntityId(entityId: string): string {
    // Remove colons and other problematic characters
    return entityId
      .replace(/:/g, '_')
      .replace(/\s+/g, '_')
      .replace(/[^\w-_.]/g, '')
      .substring(0, 100); // Limit length
  }
}

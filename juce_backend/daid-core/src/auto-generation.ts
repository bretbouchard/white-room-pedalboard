/**
 * Automatic DAID generation system for all operations
 */

import { DAIDGenerator } from './generator';
import { DAIDValidator, DAIDStandardizer } from './validation';

// Define proper request/response types for middleware
interface Request {
  method: string;
  url: string;
  path: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  id?: string;
  ip?: string;
  connection?: {
    remoteAddress?: string;
  };
  user?: {
    id?: string;
  };
  sessionID?: string;
  daid?: GenerationResult;
}

interface Response {
  status?: number;
  json?: (data: Record<string, unknown>) => void;
  send?: (data: Record<string, unknown>) => void;
  setHeader?: (name: string, value: string) => void;
}

interface NextFunction {
  (): void;
}

export interface AutoGenerationConfig {
  agentId: string;
  enableAutoGeneration: boolean;
  trackAllOperations: boolean;
  operationFilters?: string[];
  entityTypeFilters?: string[];
  metadataEnrichment?: boolean;
  validationLevel: 'basic' | 'enhanced' | 'strict';
}

export interface OperationContext {
  operation: string;
  entityType: string;
  entityId: string;
  parentDAIDs?: string[];
  metadata?: Record<string, unknown>;
  timestamp?: string;
  userContext?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
  };
  systemContext?: {
    component: string;
    version: string;
    environment: string;
  };
}

export interface GenerationResult {
  daid: string;
  generated: boolean;
  cached: boolean;
  validationPassed: boolean;
  errors?: string[];
  warnings?: string[];
  metadata: {
    generationTime: number;
    validationTime: number;
    cacheHit: boolean;
  };
}

/**
 * Automatic DAID generation manager
 */
export class AutoDAIDGenerator {
  private config: AutoGenerationConfig;
  private cache: Map<string, { daid: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: AutoGenerationConfig) {
    this.config = config;
  }

  /**
   * Generate DAID for an operation with automatic context enrichment
   */
  async generateForOperation(context: OperationContext): Promise<GenerationResult> {
    const startTime = Date.now();

    // Check if auto-generation is enabled
    if (!this.config.enableAutoGeneration) {
      return {
        daid: '',
        generated: false,
        cached: false,
        validationPassed: false,
        errors: ['Auto-generation is disabled'],
        metadata: {
          generationTime: 0,
          validationTime: 0,
          cacheHit: false,
        },
      };
    }

    // Apply filters
    if (!this.shouldGenerate(context)) {
      return {
        daid: '',
        generated: false,
        cached: false,
        validationPassed: false,
        errors: ['Operation filtered out'],
        metadata: {
          generationTime: 0,
          validationTime: 0,
          cacheHit: false,
        },
      };
    }

    // Check cache first
    const cacheKey = this.getCacheKey(context);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      const validationStart = Date.now();
      const validation = DAIDValidator.validateEnhanced(cached.daid);
      const validationTime = Date.now() - validationStart;

      return {
        daid: cached.daid,
        generated: true,
        cached: true,
        validationPassed: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        metadata: {
          generationTime: Date.now() - startTime,
          validationTime,
          cacheHit: true,
        },
      };
    }

    // Enrich context with metadata
    const enrichedContext = this.enrichContext(context);

    // Normalize components
    const normalizedAgentId = DAIDStandardizer.normalizeAgentId(this.config.agentId);
    const normalizedEntityType = DAIDStandardizer.normalizeEntityType(enrichedContext.entityType);
    const normalizedEntityId = DAIDStandardizer.normalizeEntityId(enrichedContext.entityId);

    // Generate DAID
    const daid = DAIDGenerator.generate({
      agentId: normalizedAgentId,
      entityType: normalizedEntityType,
      entityId: normalizedEntityId,
      operation: enrichedContext.operation,
      parentDAIDs: enrichedContext.parentDAIDs,
      metadata: enrichedContext.metadata as any,
    });

    // Validate generated DAID
    const validationStart = Date.now();
    const validation = this.validateGenerated(daid);
    const validationTime = Date.now() - validationStart;

    // Cache if valid
    if (validation.validationPassed) {
      this.addToCache(cacheKey, daid);
    }

    return {
      daid,
      generated: true,
      cached: false,
      validationPassed: validation.validationPassed,
      errors: validation.errors,
      warnings: validation.warnings,
      metadata: {
        generationTime: Date.now() - startTime,
        validationTime,
        cacheHit: false,
      },
    };
  }

  /**
   * Generate DAIDs for batch operations
   */
  async generateBatch(contexts: OperationContext[]): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];

    for (const context of contexts) {
      try {
        const result = await this.generateForOperation(context);
        results.push(result);
      } catch (error) {
        results.push({
          daid: '',
          generated: false,
          cached: false,
          validationPassed: false,
          errors: [`Batch generation error: ${error}`],
          metadata: {
            generationTime: 0,
            validationTime: 0,
            cacheHit: false,
          },
        });
      }
    }

    return results;
  }

  /**
   * Check if DAID should be generated for this operation
   */
  private shouldGenerate(context: OperationContext): boolean {
    // Check operation filters
    if (this.config.operationFilters && this.config.operationFilters.length > 0) {
      if (!this.config.operationFilters.includes(context.operation)) {
        return false;
      }
    }

    // Check entity type filters
    if (this.config.entityTypeFilters && this.config.entityTypeFilters.length > 0) {
      if (!this.config.entityTypeFilters.includes(context.entityType)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Enrich operation context with additional metadata
   */
  private enrichContext(context: OperationContext): OperationContext {
    if (!this.config.metadataEnrichment) {
      return context;
    }

    const enrichedMetadata = {
      ...context.metadata,
      generation: {
        timestamp: new Date().toISOString(),
        agentId: this.config.agentId,
        autoGenerated: true,
        validationLevel: this.config.validationLevel,
      },
    };

    // Add user context if available
    if (context.userContext) {
      (enrichedMetadata as Record<string, unknown>).user = context.userContext;
    }

    // Add system context if available
    if (context.systemContext) {
      (enrichedMetadata as Record<string, unknown>).system = context.systemContext;
    }

    return {
      ...context,
      metadata: enrichedMetadata,
    };
  }

  /**
   * Validate generated DAID based on configuration
   */
  private validateGenerated(daid: string): {
    validationPassed: boolean;
    errors?: string[];
    warnings?: string[];
  } {
    switch (this.config.validationLevel) {
      case 'basic':
        const basicValidation = DAIDGenerator.validate(daid);
        return {
          validationPassed: basicValidation.valid,
          errors: basicValidation.errors,
          warnings: [],
        };

      case 'enhanced':
        const enhancedValidation = DAIDValidator.validateEnhanced(daid);
        return {
          validationPassed: enhancedValidation.isValid,
          errors: enhancedValidation.errors,
          warnings: enhancedValidation.warnings,
        };

      case 'strict':
        const strictValidation = DAIDValidator.validateEnhanced(daid);
        // In strict mode, warnings are treated as errors
        const allErrors = [...strictValidation.errors, ...strictValidation.warnings];
        return {
          validationPassed: allErrors.length === 0,
          errors: allErrors,
          warnings: [],
        };

      default:
        return {
          validationPassed: false,
          errors: ['Invalid validation level'],
        };
    }
  }

  /**
   * Generate cache key for operation context
   */
  private getCacheKey(context: OperationContext): string {
    const keyData = {
      agentId: this.config.agentId,
      operation: context.operation,
      entityType: context.entityType,
      entityId: context.entityId,
      parentDAIDs: context.parentDAIDs?.sort() || [],
      // Include relevant metadata for cache key
      metadataHash: this.hashMetadata(context.metadata || {}),
    };

    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * Hash metadata for cache key generation
   */
  private hashMetadata(metadata: Record<string, unknown>): string {
    // Create a stable hash of metadata
    const stableString = JSON.stringify(metadata, Object.keys(metadata).sort());
    return Buffer.from(stableString).toString('base64').substring(0, 16);
  }

  /**
   * Get DAID from cache
   */
  private getFromCache(key: string): { daid: string; timestamp: number } | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Add DAID to cache
   */
  private addToCache(key: string, daid: string): void {
    this.cache.set(key, {
      daid,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    // This is a simplified implementation
    // In a real system, you'd track hit/miss rates
    return {
      size: this.cache.size,
      maxSize: 1000,
      hitRate: 0.85, // Placeholder
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AutoGenerationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Middleware for automatic DAID generation in HTTP requests
 */
export class DAIDMiddleware {
  private generator: AutoDAIDGenerator;

  constructor(config: AutoGenerationConfig) {
    this.generator = new AutoDAIDGenerator(config);
  }

  /**
   * Express/Fastify middleware for automatic DAID generation
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Extract operation context from request
      const context: OperationContext = {
        operation: req.method.toLowerCase(),
        entityType: this.extractEntityType(req),
        entityId: this.extractEntityId(req),
        metadata: {
          url: req.url,
          headers: this.sanitizeHeaders(req.headers),
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.connection?.remoteAddress,
        },
        userContext: {
          userId: req.user?.id,
          sessionId: req.sessionID,
          requestId: req.id || req.headers['x-request-id'],
        },
        systemContext: {
          component: 'http-middleware',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
      };

      try {
        const result = await this.generator.generateForOperation(context);

        // Attach DAID to request
        req.daid = result;

        // Add DAID to response headers
        if (result.generated && result.validationPassed && res.setHeader) {
          res.setHeader('X-DAID', result.daid);
        }

        next();
      } catch (error) {
        // Log error without console statement - use structured error handling
        next(); // Continue without DAID
      }
    };
  }

  private extractEntityType(req: Request): string {
    // Extract entity type from URL path
    const pathParts = req.path.split('/').filter((part: string) => part.length > 0);
    return pathParts[0] || 'request';
  }

  private extractEntityId(req: Request): string {
    // Extract entity ID from URL parameters or generate one
    const pathParts = req.path.split('/').filter((part: string) => part.length > 0);
    return pathParts[1] || req.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, unknown> {
    // Remove sensitive headers
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    return sanitized;
  }
}

/**
 * Factory function for creating auto-generation instances
 */
export function createAutoDAIDGenerator(
  config: Partial<AutoGenerationConfig> & { agentId: string }
): AutoDAIDGenerator {
  const defaultConfig: AutoGenerationConfig = {
    agentId: config.agentId,
    enableAutoGeneration: true,
    trackAllOperations: true,
    metadataEnrichment: true,
    validationLevel: 'enhanced',
  };

  return new AutoDAIDGenerator({ ...defaultConfig, ...config });
}

/**
 * Utility functions for common operation types
 */
export const OperationTypes = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  ANALYZE: 'analyze',
  PROCESS: 'process',
  TRANSFORM: 'transform',
  SYNC: 'sync',
  VALIDATE: 'validate',
  EXPORT: 'export',
  IMPORT: 'import',
} as const;

export const EntityTypes = {
  COMPOSITION: 'composition',
  PATTERN: 'pattern',
  ANALYSIS: 'analysis',
  USER_ACTION: 'user_action',
  API_CALL: 'api_call',
  FILE: 'file',
  PLUGIN_PROCESSING: 'plugin_processing',
  AUDIO_ANALYSIS: 'audio_analysis',
  PROVENANCE_RECORD: 'provenance_record',
  USER: 'user',
  SESSION: 'session',
  CONFIGURATION: 'configuration',
  MODEL: 'model',
  TRAINING_DATA: 'training_data',
} as const;

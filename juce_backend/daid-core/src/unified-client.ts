/**
 * Unified DAID Client API
 * 
 * Provides a consistent interface for DAID operations across different environments
 * and integrations, with support for batching, caching, health monitoring, and recovery.
 */

import { DAIDGenerator, DAIDMetadata } from './generator';
import { DAIDClient } from './client';
import { CacheManager } from './cache';
import { DAIDHealthMonitor, DAIDRecoveryManager, DAIDSynchronizationManager } from './monitoring';
import { ProvenanceChainBuilder } from './provenance-chain';
import { ProvenanceRecord, DAIDConfig } from './types';

// Define proper type for chain data to replace 'any'
export interface ChainData {
  rootDAID: string;
  nodes: unknown[];
  edges: unknown[];
  metadata: {
    totalNodes: number;
    maxDepth: number;
    createdAt: string;
    lastUpdated: string;
  };
}

// Define proper type for health data to replace 'any'
export interface HealthData {
  totalDAIDs: number;
  healthyCount: number;
  warningCount: number;
  errorCount: number;
  missingCount: number;
  overallHealth: number;
  [key: string]: unknown;
}

// Define proper types for client with optional methods
interface ExtendedDAIDClient extends DAIDClient {
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  queryRecords?(options: DAIDQueryOptions): Promise<Array<{ daid?: string }>>;
  processBatch?(records: ProvenanceRecord[]): Promise<void>;
}

// Define proper type for cache manager with internal cache
interface CacheManagerWithInternalCache extends CacheManager {
  _cache?: Record<string, unknown>;
}

export interface UnifiedDAIDConfig extends DAIDConfig {
  // Core configuration
  agentId: string;
  baseUrl?: string;
  apiKey?: string;
  
  // Performance settings
  batchSize?: number;
  batchTimeout?: number;
  cacheTtl?: number;
  
  // Feature flags
  enableBatching?: boolean;
  enableCaching?: boolean;
  enableHealthMonitoring?: boolean;
  enableAutoRecovery?: boolean;
  enableSynchronization?: boolean;
  
  // Integration settings
  systemComponent?: string;
  defaultTags?: string[];
  privacyLevel?: string;
  
  // Advanced settings
  remoteEndpoints?: string[];
  healthCheckInterval?: number;
  recoveryOptions?: {
    maxRetries?: number;
    backoffFactor?: number;
    timeoutSeconds?: number;
  };
}

export interface DAIDOperationResult {
  success: boolean;
  daid?: string;
  error?: string;
  metadata?: {
    cached?: boolean;
    batched?: boolean;
    processingTime?: number;
    recovered?: boolean;
  };
}

export interface DAIDQueryOptions {
  entityType?: string;
  entityId?: string;
  operation?: string;
  userId?: string;
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  limit?: number;
  offset?: number;
}

/**
 * Unified DAID Client
 * 
 * Provides a high-level, feature-rich interface for all DAID operations
 * with automatic batching, caching, health monitoring, and recovery.
 */
export class UnifiedDAIDClient {
  private config: UnifiedDAIDConfig;
  private client: ExtendedDAIDClient;
  private cache?: CacheManagerWithInternalCache;
  private healthMonitor?: DAIDHealthMonitor;
  private recoveryManager?: DAIDRecoveryManager;
  private syncManager?: DAIDSynchronizationManager;
  private chainBuilder: ProvenanceChainBuilder;
  
  // Batching support
  private batchQueue: ProvenanceRecord[] = [];
  private batchTimer?: NodeJS.Timeout;
  
  // State tracking
  private initialized = false;
  private stats = {
    operationsCount: 0,
    batchedOperations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0
  };

  constructor(config: UnifiedDAIDConfig) {
    this.config = {
      batchSize: 100,
      batchTimeout: 1000,
      cacheTtl: 300000, // 5 minutes
      enableBatching: true,
      enableCaching: true,
      enableHealthMonitoring: false,
      enableAutoRecovery: false,
      enableSynchronization: false,
      systemComponent: 'unified-client',
      defaultTags: [],
      privacyLevel: 'private',
      healthCheckInterval: 60000, // 1 minute
      ...config
    };
    
    this.client = new DAIDClient(this.config) as ExtendedDAIDClient;
    this.chainBuilder = new ProvenanceChainBuilder();
    
    this.initializeFeatures();
  }

  /**
   * Initialize the client and all enabled features
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize core client (if method exists)
      if (typeof this.client.initialize === 'function') {
        await this.client.initialize();
      }
      
      // Start health monitoring if enabled
      if (this.config.enableHealthMonitoring && this.healthMonitor) {
        this.healthMonitor.startMonitoring();
      }
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize UnifiedDAIDClient: ${error}`);
    }
  }

  /**
   * Clean up resources and stop background processes
   */
  async cleanup(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      await this.flushBatch();
    }
    
    if (this.healthMonitor) {
      this.healthMonitor.stopMonitoring();
    }
    
    if (typeof this.client.cleanup === 'function') {
      await this.client.cleanup();
    }
    this.initialized = false;
  }

  /**
   * Create a new DAID with provenance tracking
   */
  async createDAID(
    entityType: string,
    entityId: string,
    operation: string = 'create',
    options: {
      metadata?: DAIDMetadata;
      parentDaids?: string[];
      userId?: string;
      tags?: string[];
      batch?: boolean;
      skipCache?: boolean;
    } = {}
  ): Promise<DAIDOperationResult> {
    const startTime = Date.now();
    this.stats.operationsCount++;
    
    try {
      // Check cache first (if enabled and not skipped)
      if (this.config.enableCaching && !options.skipCache && this.cache) {
        const cacheKey = this.generateCacheKey(entityType, entityId, operation, options.metadata);
        const cached = this.cache.get(cacheKey);
        if (cached && typeof cached === 'string') {
          this.stats.cacheHits++;
          return {
            success: true,
            daid: cached,
            metadata: {
              cached: true,
              processingTime: Date.now() - startTime
            }
          };
        }
        this.stats.cacheMisses++;
      }
      
      // Create provenance record
      const record: ProvenanceRecord = {
        entityType,
        entityId,
        operation,
        agentId: this.config.agentId,
        metadata: {
          ...options.metadata,
          systemComponent: this.config.systemComponent,
          userId: options.userId,
          tags: [...(this.config.defaultTags || []), ...(options.tags || [])],
          privacyLevel: this.config.privacyLevel,
          createdAt: new Date().toISOString()
        },
        parentDAIDs: options.parentDaids || []
      };
      
      let daid: string;
      
      // Handle batching
      if (this.config.enableBatching && options.batch !== false) {
        daid = await this.addToBatch(record);
        this.stats.batchedOperations++;
      } else {
        daid = await this.processSingleRecord(record);
      }
      
      // Cache the result
      if (this.config.enableCaching && this.cache) {
        const cacheKey = this.generateCacheKey(entityType, entityId, operation, options.metadata);
        this.cache.set(cacheKey, daid);
      }
      
      // Add to provenance chain
      this.chainBuilder.addRecord(daid, record);
      
      return {
        success: true,
        daid,
        metadata: {
          cached: false,
          batched: options.batch !== false && this.config.enableBatching,
          processingTime: Date.now() - startTime
        }
      };
      
    } catch (error) {
      this.stats.errors++;
      
      // Attempt recovery if enabled
      if (this.config.enableAutoRecovery && this.recoveryManager) {
        try {
          const recoveryResult = await this.recoveryManager.recoverDAID(
            `temp-${entityType}-${entityId}`,
            { strategy: 'regenerate' }
          );
          
          if (recoveryResult.success && recoveryResult.recoveredDAID) {
            return {
              success: true,
              daid: recoveryResult.recoveredDAID,
              metadata: {
                recovered: true,
                processingTime: Date.now() - startTime
              }
            };
          }
        } catch (recoveryError) {
          // Recovery failed, continue with original error
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Query DAIDs with flexible filtering
   */
  async queryDAIDs(options: DAIDQueryOptions): Promise<{
    success: boolean;
    daids?: string[];
    total?: number;
    error?: string;
  }> {
    try {
      // This would integrate with the backend query API
      const results = this.client.queryRecords ?
        await this.client.queryRecords(options) : [];
      
      return {
        success: true,
        daids: results.map(r => r.daid || '').filter(Boolean),
        total: results.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get provenance chain for a DAID
   */
  getProvenanceChain(daid: string): {
    success: boolean;
    chain?: ChainData | null;
    error?: string;
  } {
    try {
      const chain = this.chainBuilder.getChain(daid);
      return {
        success: true,
        chain: chain ? this.chainBuilder.exportChain(daid) : null
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Perform health check on the DAID system
   */
  async performHealthCheck(): Promise<{
    success: boolean;
    health?: HealthData;
    error?: string;
  }> {
    if (!this.healthMonitor) {
      return {
        success: false,
        error: 'Health monitoring not enabled'
      };
    }
    
    try {
      // Get all DAIDs for health check
      const allDAIDs: string[] = [];
      // Note: getAllDAIDs method needs to be implemented in ProvenanceChainBuilder
      const healthReport = await this.healthMonitor.checkMultipleDAIDs(allDAIDs);
      
      return {
        success: true,
        health: healthReport as unknown as HealthData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get client statistics
   */
  getStats(): typeof this.stats & {
    batchQueueSize: number;
    cacheSize: number;
    initialized: boolean;
  } {
    return {
      ...this.stats,
      batchQueueSize: this.batchQueue.length,
      cacheSize: this.cache ? Object.keys(this.cache._cache || {}).length : 0,
      initialized: this.initialized
    };
  }

  /**
   * Flush any pending batched operations
   */
  async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    try {
      if (this.client.processBatch) {
        await this.client.processBatch(batch);
      } else {
        // Process individually if no batch method
        for (const record of batch) {
          await this.client.createProvenanceRecord(record);
        }
      }
    } catch (error) {
      // TODO: Implement proper logging infrastructure
// console.error('Batch processing failed:', error);
      // Re-queue failed items for retry
      this.batchQueue.unshift(...batch);
    }
  }

  // Private helper methods
  private initializeFeatures(): void {
    if (this.config.enableCaching) {
      this.cache = new CacheManager() as CacheManagerWithInternalCache;
    }
    
    if (this.config.enableHealthMonitoring) {
      this.healthMonitor = new DAIDHealthMonitor(this.chainBuilder, {
        checkInterval: this.config.healthCheckInterval,
        enableAutoRecovery: this.config.enableAutoRecovery
      });
    }
    
    if (this.config.enableAutoRecovery) {
      this.recoveryManager = new DAIDRecoveryManager(this.chainBuilder);
    }
    
    if (this.config.enableSynchronization && this.config.remoteEndpoints?.length) {
      this.syncManager = new DAIDSynchronizationManager(
        this.chainBuilder,
        this.config.remoteEndpoints[0]
      );
    }
  }

  private async addToBatch(record: ProvenanceRecord): Promise<string> {
    // Generate DAID immediately for return
    const daid = DAIDGenerator.generate({
      agentId: record.agentId,
      entityType: record.entityType,
      entityId: record.entityId,
      operation: record.operation,
      metadata: record.metadata,
      parentDAIDs: record.parentDAIDs
    });
    
    // Add to batch queue
    this.batchQueue.push(record);
    
    // Set up batch timer if not already set
    if (!this.batchTimer && this.config.batchTimeout) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.config.batchTimeout);
    }
    
    // Flush if batch is full
    if (this.batchQueue.length >= (this.config.batchSize || 100)) {
      await this.flushBatch();
    }
    
    return daid;
  }

  private async processSingleRecord(record: ProvenanceRecord): Promise<string> {
    return await this.client.createProvenanceRecord(record);
  }

  private generateCacheKey(
    entityType: string,
    entityId: string,
    operation: string,
    metadata?: DAIDMetadata
  ): string {
    const metadataHash = metadata ?
      JSON.stringify(metadata).slice(0, 8) :
      'none';
    return `${entityType}:${entityId}:${operation}:${metadataHash}`;
  }
}

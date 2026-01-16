/**
 * Schillinger SDK Service
 *
 * This service provides a high-level interface to the Schillinger SDK
 * that integrates with the existing frontend architecture and state management.
 */

// Import the mock types and adapter from the hook file
import type {
  UnifiedGenerationRequest,
  UnifiedResponse,
  UnifiedAnalysisRequest,
  UnifiedAnalysisResponse
} from '@/hooks/useSchillingerSDK';
import { SchillingerAdapter } from '@/hooks/useSchillingerSDK';

export interface SchillingerServiceConfig {
  enableCaching?: boolean;
  cacheTimeout?: number;
  retryAttempts?: number;
  fallbackMode?: boolean;
}

export interface GenerationRequest {
  type: 'pattern' | 'chord_progression' | 'melody' | 'rhythm' | 'sequence' | 'accompaniment' | 'composition';
  parameters: Record<string, any>;
  metadata?: {
    userContext?: string;
    projectContext?: string;
    preferences?: Record<string, any>;
  };
}

export interface AnalysisRequest {
  type: 'harmony' | 'melody' | 'rhythm' | 'structure' | 'pattern' | 'style' | 'emotion' | 'comprehensive';
  input: {
    content?: any;
    reference?: string;
    file?: File;
  };
  options?: {
    depth?: string;
    include?: Record<string, boolean>;
  };
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    processingTime?: number;
    daid?: string;
    cacheHit?: boolean;
  };
}

class SchillingerService {
  private adapter: SchillingerAdapter | null = null;
  private config: SchillingerServiceConfig;
  private cache: Map<string, { data: any; timestamp: number; }> = new Map();
  private isInitialized = false;

  constructor(config: SchillingerServiceConfig = {}) {
    this.config = {
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      retryAttempts: 3,
      fallbackMode: false,
      ...config,
    };
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create adapter with default configuration
      this.adapter = new SchillingerAdapter({});

      await this.adapter.initialize();
      this.isInitialized = true;

      console.log('Schillinger Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Schillinger Service:', error);
      throw error;
    }
  }

  /**
   * Check if the service is healthy
   */
  async healthCheck(): Promise<ServiceResponse<{ status: string; uptime: number }>> {
    try {
      if (!this.adapter) {
        throw new Error('Service not initialized');
      }

      const health = await this.adapter.healthCheck();

      return {
        success: true,
        data: {
          status: health.status,
          uptime: (health as any).uptime || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get service capabilities
   */
  async getCapabilities(): Promise<ServiceResponse<any>> {
    try {
      if (!this.adapter) {
        throw new Error('Service not initialized');
      }

      const capabilities = await this.adapter.getCapabilities();

      return {
        success: true,
        data: capabilities,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CAPABILITIES_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Generate musical content
   */
  async generate(request: GenerationRequest): Promise<ServiceResponse<UnifiedResponse>> {
    const startTime = Date.now();

    try {
      if (!this.adapter) {
        throw new Error('Service not initialized');
      }

      // Check cache first
      const cacheKey = this.getCacheKey('generate', request);
      if (this.config.enableCaching) {
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            metadata: {
              processingTime: Date.now() - startTime,
              cacheHit: true,
            },
          };
        }
      }

      // Convert frontend request to SDK request
      const sdkRequest: UnifiedGenerationRequest = {
        type: this.mapGenerationType(request.type),
        parameters: request.parameters,
      };

      // Add metadata if provided
      if (request.metadata) {
        sdkRequest.parameters.userContext = request.metadata.userContext;
        sdkRequest.parameters.projectContext = request.metadata.projectContext;
      }

      const response = await this.executeWithRetry(
        () => this.adapter!.generate(sdkRequest),
        this.config.retryAttempts!
      );

      // Cache the result
      if (this.config.enableCaching && response.success) {
        this.setCachedResult(cacheKey, response);
      }

      return {
        success: true,
        data: response,
        metadata: {
          processingTime: Date.now() - startTime,
          daid: (response as any).data?.metadata?.daid,
          cacheHit: false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Generation failed',
          details: error,
        },
        metadata: {
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Analyze musical content
   */
  async analyze(request: AnalysisRequest): Promise<ServiceResponse<UnifiedAnalysisResponse>> {
    const startTime = Date.now();

    try {
      if (!this.adapter) {
        throw new Error('Service not initialized');
      }

      // Check cache first
      const cacheKey = this.getCacheKey('analyze', request);
      if (this.config.enableCaching) {
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            metadata: {
              processingTime: Date.now() - startTime,
              cacheHit: true,
            },
          };
        }
      }

      // Convert frontend request to SDK request
      const sdkRequest: UnifiedAnalysisRequest = {
        type: this.mapAnalysisType(request.type),
        input: request.input,
        options: request.options,
      };

      const response = await this.executeWithRetry(
        () => this.adapter!.analyze(sdkRequest),
        this.config.retryAttempts!
      );

      // Cache the result
      if (this.config.enableCaching && response.success) {
        this.setCachedResult(cacheKey, response);
      }

      return {
        success: true,
        data: response,
        metadata: {
          processingTime: Date.now() - startTime,
          daid: (response as any).data?.metadata?.daid,
          cacheHit: false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Analysis failed',
          details: error,
        },
        metadata: {
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Get specific generation type helpers
   */
  async generatePattern(params: {
    key?: string;
    scale?: string;
    timeSignature?: [number, number];
    tempo?: number;
    length?: number;
    complexity?: number;
  }): Promise<ServiceResponse<UnifiedResponse>> {
    return this.generate({
      type: 'pattern',
      parameters: {
        key: params.key || 'C',
        scale: params.scale || 'MAJOR',
        timeSignature: params.timeSignature || [4, 4],
        tempo: params.tempo || 120,
        length: params.length || 4,
        complexity: params.complexity || 5,
      },
    });
  }

  async generateChordProgression(params: {
    key?: string;
    scale?: string;
    length?: number;
    progressionType?: string;
    chordTypes?: string[];
  }): Promise<ServiceResponse<UnifiedResponse>> {
    return this.generate({
      type: 'chord_progression',
      parameters: {
        key: params.key || 'C',
        scale: params.scale || 'MAJOR',
        length: params.length || 4,
        harmony: {
          progressionType: params.progressionType || 'diatonic',
          chordTypes: params.chordTypes || ['major', 'minor'],
        },
      },
    });
  }

  async generateMelody(params: {
    key?: string;
    scale?: string;
    length?: number;
    contour?: string;
    range?: [number, number];
  }): Promise<ServiceResponse<UnifiedResponse>> {
    return this.generate({
      type: 'melody',
      parameters: {
        key: params.key || 'C',
        scale: params.scale || 'MAJOR',
        length: params.length || 8,
        melody: {
          contour: params.contour || 'arch',
          range: params.range || [60, 72],
        },
      },
    });
  }

  /**
   * Utility methods
   */
  private getCacheKey(operation: string, request: any): string {
    return `${operation}:${JSON.stringify(request)}`;
  }

  private getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout!) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCachedResult(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === maxAttempts) {
          throw lastError;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }

    throw lastError!;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Map frontend generation types to SDK types
   */
  private mapGenerationType(type: string): 'rhythm' | 'harmony' | 'melody' | 'composition' | 'pattern' | 'chord_progression' {
    const mapping: Record<string, 'rhythm' | 'harmony' | 'melody' | 'composition' | 'pattern' | 'chord_progression'> = {
      'rhythm': 'rhythm',
      'harmony': 'harmony',
      'melody': 'melody',
      'composition': 'composition',
      'pattern': 'pattern',
      'sequence': 'melody',
      'chord_progression': 'chord_progression',
      'accompaniment': 'harmony'
    };
    return mapping[type] || 'pattern';
  }

  /**
   * Map frontend analysis types to SDK types
   */
  private mapAnalysisType(type: string): 'rhythm' | 'harmony' | 'melody' | 'composition' | 'pattern' | 'chord_progression' {
    const mapping: Record<string, 'rhythm' | 'harmony' | 'melody' | 'composition' | 'pattern' | 'chord_progression'> = {
      'rhythm': 'rhythm',
      'harmony': 'harmony',
      'melody': 'melody',
      'composition': 'composition',
      'pattern': 'pattern',
      'structure': 'composition',
      'style': 'harmony',
      'emotion': 'melody',
      'comprehensive': 'composition'
    };
    return mapping[type] || 'pattern';
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.adapter) {
      await this.adapter.shutdown();
      this.adapter = null;
    }
    this.isInitialized = false;
    this.cache.clear();
  }
}

// Export singleton instance
export const schillingerService = new SchillingerService();

// Export types for external use
export default schillingerService;
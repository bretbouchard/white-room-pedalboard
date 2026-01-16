/**
 * React hooks for integrating with the Schillinger SDK
 * Provides convenient hooks for generation and analysis operations
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { SchillingerSDK, SchillingerSDKConfig } from '@schillinger-sdk/core';

// Mock types for missing SDK exports - replace with actual types when available
interface UnifiedGenerationRequest {
  type: 'rhythm' | 'harmony' | 'melody' | 'composition' | 'pattern' | 'chord_progression';
  parameters: Record<string, any>;
  options?: {
    complexity?: number;
    length?: number;
    style?: string;
  };
}

interface UnifiedResponse {
  success: boolean;
  data: any;
  error?: string;
  metadata?: {
    processingTime: number;
    modelUsed: string;
  };
}

interface UnifiedAnalysisRequest {
  type: 'rhythm' | 'harmony' | 'melody' | 'composition' | 'pattern' | 'chord_progression';
  input: any;
  options?: {
    detail?: 'basic' | 'detailed' | 'comprehensive';
    depth?: string;
    include?: {
      harmonicAnalysis?: boolean;
      melodicAnalysis?: boolean;
      rhythmicAnalysis?: boolean;
      structuralAnalysis?: boolean;
      styleAnalysis?: boolean;
      emotionAnalysis?: boolean;
    };
  };
}

interface UnifiedAnalysisResponse {
  success: boolean;
  data: any;
  error?: string;
  analysis?: {
    structure: any;
    patterns: any[];
    recommendations: any[];
  };
}

// Mock adapter class
class SchillingerAdapter {
  private sdk: SchillingerSDK;
  private _isInitialized: boolean = false;

  constructor(config: SchillingerSDKConfig) {
    this.sdk = new SchillingerSDK(config);
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<void> {
    // Mock initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    this._isInitialized = true;
  }

  async generate(request: UnifiedGenerationRequest): Promise<UnifiedResponse> {
    // Mock implementation
    return {
      success: true,
      data: { result: 'Mock generation result' },
      metadata: {
        processingTime: 100,
        modelUsed: 'mock-model'
      }
    };
  }

  async analyze(request: UnifiedAnalysisRequest): Promise<UnifiedAnalysisResponse> {
    // Mock implementation
    return {
      success: true,
      data: { result: 'Mock analysis result' },
      analysis: {
        structure: {},
        patterns: [],
        recommendations: []
      }
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; status: string; capabilities: string[] }> {
    // Mock health check
    return {
      healthy: true,
      status: 'Mock adapter is running',
      capabilities: ['rhythm', 'harmony', 'melody', 'composition']
    };
  }

  async getCapabilities(): Promise<{ generation: any; analysis: any }> {
    // Mock capabilities
    return {
      generation: {
        patternTypes: ['rhythm', 'harmony', 'melody', 'composition'],
        complexity: [1, 10],
        length: [1, 16]
      },
      analysis: {
        analysisTypes: ['harmony', 'melody', 'rhythm', 'structure'],
        detail: ['basic', 'detailed', 'comprehensive']
      }
    };
  }

  async shutdown(): Promise<void> {
    // Mock shutdown
    this._isInitialized = false;
  }
}

// Export the mock adapter and types for other files to use
export { SchillingerAdapter };
export type {
  UnifiedGenerationRequest,
  UnifiedResponse,
  UnifiedAnalysisRequest,
  UnifiedAnalysisResponse
};

export interface UseSchillingerSDKOptions {
  config?: Partial<SchillingerSDKConfig>;
  autoInitialize?: boolean;
}

export interface SDKState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  healthStatus: any | null;
  capabilities: any | null;
}

export interface GenerationState extends SDKState {
  isGenerating: boolean;
  lastResult: UnifiedResponse | null;
}

export interface AnalysisState extends SDKState {
  isAnalyzing: boolean;
  lastResult: UnifiedAnalysisResponse | null;
}

/**
 * Main hook for Schillinger SDK integration
 */
export function useSchillingerSDK(options: UseSchillingerSDKOptions = {}) {
  const { config, autoInitialize = true } = options;
  const adapterRef = useRef<SchillingerAdapter | null>(null);

  const [state, setState] = useState<SDKState>({
    isInitialized: false,
    isInitializing: false,
    error: null,
    healthStatus: null,
    capabilities: null,
  });

  const initialize = useCallback(async () => {
    if (adapterRef.current?.isInitialized) {
      return;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      const adapter = new SchillingerAdapter(config);
      await adapter.initialize();

      const [healthStatus, capabilities] = await Promise.all([
        adapter.healthCheck(),
        adapter.getCapabilities(),
      ]);

      adapterRef.current = adapter;
      setState({
        isInitialized: true,
        isInitializing: false,
        error: null,
        healthStatus,
        capabilities,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
      }));
    }
  }, [config]);

  const shutdown = useCallback(async () => {
    if (adapterRef.current) {
      try {
        await adapterRef.current.shutdown();
        adapterRef.current = null;
        setState(prev => ({
          ...prev,
          isInitialized: false,
          healthStatus: null,
          capabilities: null,
        }));
      } catch (error) {
        console.error('SDK shutdown error:', error);
      }
    }
  }, []);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }

    return () => {
      shutdown();
    };
  }, [autoInitialize, initialize, shutdown]);

  return {
    ...state,
    adapter: adapterRef.current,
    initialize,
    shutdown,
  };
}

/**
 * Hook for musical generation operations
 */
export function useSchillingerGeneration(options: UseSchillingerSDKOptions = {}) {
  const sdk = useSchillingerSDK(options);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<UnifiedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    request: UnifiedGenerationRequest
  ): Promise<UnifiedResponse> => {
    if (!sdk.adapter) {
      throw new Error('SDK not initialized');
    }

    setIsGenerating(true);
    setLastResult(null);
    setError(null);

    try {
      const result = await sdk.adapter.generate(request);
      setLastResult(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [sdk.adapter]);

  return {
    ...sdk,
    isGenerating,
    lastResult,
    error,
    generate,
  };
}

/**
 * Hook for musical analysis operations
 */
export function useSchillingerAnalysis(options: UseSchillingerSDKOptions = {}) {
  const sdk = useSchillingerSDK(options);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<UnifiedAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (
    request: UnifiedAnalysisRequest
  ): Promise<UnifiedAnalysisResponse> => {
    if (!sdk.adapter) {
      throw new Error('SDK not initialized');
    }

    setIsAnalyzing(true);
    setLastResult(null);
    setError(null);

    try {
      const result = await sdk.adapter.analyze(request);
      setLastResult(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [sdk.adapter]);

  return {
    ...sdk,
    isAnalyzing,
    lastResult,
    error,
    analyze,
  };
}

/**
 * Combined hook for both generation and analysis
 */
export function useSchillingerComplete(options: UseSchillingerSDKOptions = {}) {
  const generation = useSchillingerGeneration(options);
  const analysis = useSchillingerAnalysis(options);

  // Ensure we're using the same SDK instance
  const sdk = useSchillingerSDK(options);

  return {
    sdk,
    generation: {
      isGenerating: generation.isGenerating,
      lastGenerationResult: generation.lastResult,
      generate: generation.generate,
    },
    analysis: {
      isAnalyzing: analysis.isAnalyzing,
      lastAnalysisResult: analysis.lastResult,
      analyze: analysis.analyze,
    },
    isInitialized: sdk.isInitialized,
    isInitializing: sdk.isInitializing,
    error: sdk.error,
    healthStatus: sdk.healthStatus,
    capabilities: sdk.capabilities,
  };
}

/**
 * Hook for specific generation types with typed interfaces
 */
export function usePatternGeneration(options?: UseSchillingerSDKOptions) {
  const { generate, ...rest } = useSchillingerGeneration(options);

  const generatePattern = useCallback(async (params: {
    key?: string;
    scale?: string;
    timeSignature?: [number, number];
    tempo?: number;
    length?: number;
    complexity?: number;
  }) => {
    const request: UnifiedGenerationRequest = {
      type: 'pattern',
      parameters: {
        key: params.key || 'C',
        scale: params.scale || 'MAJOR',
        timeSignature: params.timeSignature || [4, 4],
        tempo: params.tempo || 120,
        length: params.length || 4,
        complexity: params.complexity || 5,
      },
    };

    return generate(request);
  }, [generate]);

  return {
    generatePattern,
    ...rest,
  };
}

export function useChordProgressionGeneration(options?: UseSchillingerSDKOptions) {
  const { generate, ...rest } = useSchillingerGeneration(options);

  const generateChordProgression = useCallback(async (params: {
    key?: string;
    scale?: string;
    length?: number;
    progressionType?: string;
    chordTypes?: string[];
  }) => {
    const request: UnifiedGenerationRequest = {
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
    };

    return generate(request);
  }, [generate]);

  return {
    generateChordProgression,
    ...rest,
  };
}

export function useMelodyGeneration(options?: UseSchillingerSDKOptions) {
  const { generate, ...rest } = useSchillingerGeneration(options);

  const generateMelody = useCallback(async (params: {
    key?: string;
    scale?: string;
    length?: number;
    contour?: string;
    range?: [number, number];
  }) => {
    const request: UnifiedGenerationRequest = {
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
    };

    return generate(request);
  }, [generate]);

  return {
    generateMelody,
    ...rest,
  };
}
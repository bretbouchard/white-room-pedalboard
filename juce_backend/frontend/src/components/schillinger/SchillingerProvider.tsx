/**
 * Schillinger SDK Provider
 *
 * A React context provider that makes the Schillinger SDK available
 * throughout the application with proper initialization and error handling.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SchillingerSDK, SchillingerSDKConfig } from '@schillinger-sdk/core';

// Import the mock types from the hook file
import type {
  UnifiedGenerationRequest,
  UnifiedResponse,
  UnifiedAnalysisRequest,
  UnifiedAnalysisResponse
} from '@/hooks/useSchillingerSDK';

// Reuse the mock adapter from hooks
class SchillingerAdapter {
  private sdk: SchillingerSDK;

  constructor(config: SchillingerSDKConfig) {
    this.sdk = new SchillingerSDK(config);
  }

  async generate(request: UnifiedGenerationRequest): Promise<UnifiedResponse> {
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
}

import { schillingerService } from '@/services/schillingerService';

interface SchillingerContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  healthStatus: any | null;
  capabilities: any | null;
  adapter: SchillingerAdapter | null;
  service: typeof schillingerService;
  reinitialize: () => Promise<void>;
}

const SchillingerContext = createContext<SchillingerContextType | undefined>(undefined);

interface SchillingerProviderProps {
  children: ReactNode;
  config?: Partial<SchillingerSDKConfig>;
  serviceConfig?: {
    enableCaching?: boolean;
    cacheTimeout?: number;
    retryAttempts?: number;
  };
  autoInitialize?: boolean;
}

export function SchillingerProvider({
  children,
  config,
  serviceConfig,
  autoInitialize = true,
}: SchillingerProviderProps) {
  const [state, setState] = useState({
    isInitialized: false,
    isInitializing: false,
    error: null as string | null,
    healthStatus: null as any | null,
    capabilities: null as any | null,
    adapter: null as SchillingerAdapter | null,
  });

  const initialize = async () => {
    if (state.isInitializing || state.isInitialized) {
      return;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      // Initialize the service
      await schillingerService.initialize();

      // Get health status and capabilities
      const [healthStatus, capabilities] = await Promise.all([
        schillingerService.healthCheck(),
        schillingerService.getCapabilities(),
      ]);

      setState({
        isInitialized: true,
        isInitializing: false,
        error: null,
        healthStatus: healthStatus.data,
        capabilities: capabilities.data,
        adapter: null as any, // Service manages the adapter internally
      });

      console.log('Schillinger SDK initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: errorMessage,
      }));
      console.error('Schillinger SDK initialization failed:', error);
    }
  };

  const reinitialize = async () => {
    setState(prev => ({
      ...prev,
      isInitialized: false,
      error: null,
      healthStatus: null,
      capabilities: null,
    }));
    await initialize();
  };

  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }

    return () => {
      // Cleanup on unmount
      schillingerService.shutdown().catch(console.error);
    };
  }, [autoInitialize]);

  const contextValue: SchillingerContextType = {
    ...state,
    service: schillingerService,
    reinitialize,
  };

  return (
    <SchillingerContext.Provider value={contextValue}>
      {children}
    </SchillingerContext.Provider>
  );
}

export function useSchillinger() {
  const context = useContext(SchillingerContext);
  if (context === undefined) {
    throw new Error('useSchillinger must be used within a SchillingerProvider');
  }
  return context;
}

export { SchillingerContext };
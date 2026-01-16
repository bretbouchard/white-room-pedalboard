// React integration for DAID Core
// Note: This module requires React to be installed in the consuming application

import { DAIDClient, DAIDClientConfig } from './client';
import { DAIDGenerator } from './generator';
import { ProvenanceRecord, DAIDComponents } from './types';

// Import proper metadata type
import { DAIDMetadata } from './generator';

// React types - these will be available when React is installed
interface ReactNode {
  [key: string]: unknown;
}

interface ComponentType<P = {}> {
  (props: P): ReactNode | null;
}

// Mock React functions for TypeScript - actual implementations come from React
declare const createContext: <T>(defaultValue: T) => ReactContext<T>;
declare const useContext: <T>(context: ReactContext<T>) => T;
declare const useEffect: (effect: () => void | (() => void), deps?: unknown[]) => void;
declare const useState: <T>(initialValue: T | (() => T)) => [T, (value: T | ((prev: T) => T)) => void];
declare const useCallback: <T extends (...args: any[]) => any>(callback: T, deps: unknown[]) => T;
declare const useRef: <T>(initialValue: T) => { current: T };
declare const React: {
  createElement: (type: unknown, props?: Record<string, unknown>, ...children: ReactNode[]) => ReactNode;
  ComponentType: ComponentType;
  ReactNode: ReactNode;
};

interface ReactContext<T> {
  Provider: ComponentType<{ value: T; children: ReactNode }>;
  Consumer: ComponentType<{ children: (value: T) => ReactNode }>;
}

export interface DAIDProviderProps {
  children: ReactNode;
  config: DAIDClientConfig;
  autoTrack?: boolean;
  trackPageViews?: boolean;
  trackUserActions?: boolean;
}

export interface DAIDContextValue {
  client: DAIDClient;
  currentDAID: string | null;
  parentDAIDs: string[];
  isTracking: boolean;
  generateDAID: (params: Omit<Parameters<typeof DAIDGenerator.generate>[0], 'agentId'>) => string;
  createProvenanceRecord: (record: Omit<ProvenanceRecord, 'agentId'>) => Promise<string>;
  setParentDAIDs: (daids: string[]) => void;
  addParentDAID: (daid: string) => void;
  clearParentDAIDs: () => void;
  startTracking: () => void;
  stopTracking: () => void;
}

export interface UseDAIDOptions {
  entityType: string;
  entityId?: string;
  operation?: string;
  autoGenerate?: boolean;
  trackOnMount?: boolean;
  metadata?: DAIDMetadata;
}

export interface UseDAIDResult {
  daid: string | null;
  isLoading: boolean;
  error: Error | null;
  generateDAID: () => Promise<string>;
  updateMetadata: (metadata: DAIDMetadata) => void;
  components: DAIDComponents | null;
}

// Create React Context
const DAIDContext = createContext<DAIDContextValue | null>(null);

/**
 * DAID Provider Component
 */
export function DAIDProvider({
  children,
  config,
  autoTrack = true,
  trackPageViews = true,
  trackUserActions = false,
}: DAIDProviderProps) {
  const [client] = useState(() => new DAIDClient(config));
  const [currentDAID, setCurrentDAID] = useState<string | null>(null);
  const [parentDAIDs, setParentDAIDsState] = useState<string[]>([]);
  const [isTracking, setIsTracking] = useState<boolean>(autoTrack);

  // Track page views
  useEffect(() => {
    if (!trackPageViews || !isTracking) return;

    const trackPageView = async () => {
      try {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          return;
        }

        const daid = await client.createProvenanceRecord({
          entityType: 'page',
          entityId: window.location.pathname,
          operation: 'view',
          parentDAIDs,
          metadata: {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
          },
        });
        setCurrentDAID(daid);
        setParentDAIDsState((prev: string[]) => [daid, ...prev.slice(0, 4)]); // Keep last 5 DAIDs
      } catch (error) {
        // TODO: Implement proper logging infrastructure
// console.warn('Failed to track page view:', error);
      }
    };

    trackPageView();

    // Track navigation changes
    const handlePopState = () => trackPageView();
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handlePopState);
      }
    };
  }, [client, parentDAIDs, isTracking, trackPageViews]);

  // Track user actions
  useEffect(() => {
    if (!trackUserActions || !isTracking) return;

    const trackUserAction = async (event: Event) => {
      const target = event.target as { tagName?: string; id?: string; className?: string; textContent?: string };
      if (!target) return;

      const actionType = event.type;
      const elementType = target.tagName?.toLowerCase() || 'unknown';
      const elementId = target.id || target.className || 'unknown';

      try {
        const daid = await client.createProvenanceRecord({
          entityType: 'user_action',
          entityId: `${actionType}_${elementType}_${elementId}`,
          operation: actionType,
          parentDAIDs: currentDAID ? [currentDAID] : parentDAIDs,
          metadata: {
            elementType,
            elementId,
            elementText: target.textContent?.slice(0, 100),
            timestamp: new Date().toISOString(),
          },
        });
        setParentDAIDsState((prev: string[]) => [daid, ...prev.slice(0, 4)]);
      } catch (error) {
        // TODO: Implement proper logging infrastructure
// console.warn('Failed to track user action:', error);
      }
    };

    const events = ['click', 'submit', 'change'];
    if (typeof document !== 'undefined') {
      events.forEach(event => {
        document.addEventListener(event, trackUserAction);
      });
    }

    return () => {
      if (typeof document !== 'undefined') {
        events.forEach(event => {
          document.removeEventListener(event, trackUserAction);
        });
      }
    };
  }, [client, currentDAID, parentDAIDs, isTracking, trackUserActions]);

  const generateDAID = useCallback(
    (params: Omit<Parameters<typeof DAIDGenerator.generate>[0], 'agentId'>) => {
      return client.generateDAID(params);
    },
    [client]
  );

  const createProvenanceRecord = useCallback(
    async (record: Omit<ProvenanceRecord, 'agentId'>) => {
      const daid = await client.createProvenanceRecord(record);
      setCurrentDAID(daid);
      return daid;
    },
    [client]
  );

  const setParentDAIDs = useCallback((daids: string[]) => {
    setParentDAIDsState(daids);
  }, []);

  const addParentDAID = useCallback((daid: string) => {
    setParentDAIDsState((prev: string[]) => [daid, ...prev.slice(0, 4)]);
  }, []);

  const clearParentDAIDs = useCallback(() => {
    setParentDAIDsState([]);
  }, []);

  const startTracking = useCallback(() => {
    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const contextValue: DAIDContextValue = {
    client,
    currentDAID,
    parentDAIDs,
    isTracking,
    generateDAID,
    createProvenanceRecord,
    setParentDAIDs,
    addParentDAID,
    clearParentDAIDs,
    startTracking,
    stopTracking,
  };

  return React.createElement(DAIDContext.Provider, { value: contextValue }, children);
}

/**
 * Hook to use DAID context
 */
export function useDAIDContext(): DAIDContextValue {
  const context = useContext(DAIDContext);
  if (!context) {
    throw new Error('useDAIDContext must be used within a DAIDProvider');
  }
  return context;
}

/**
 * Hook for component-level DAID tracking
 */
export function useDAID(options: UseDAIDOptions): UseDAIDResult {
  const context = useDAIDContext();
  const [daid, setDAID] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [components, setComponents] = useState<DAIDComponents | null>(null);
  const metadataRef = useRef(options.metadata || {});

  // Update metadata ref when options change
  useEffect(() => {
    metadataRef.current = options.metadata || {};
  }, [options.metadata]);

  const generateDAID = useCallback(async (): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const entityId =
        options.entityId ||
        `${options.entityType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newDAID = await context.createProvenanceRecord({
        entityType: options.entityType,
        entityId,
        operation: options.operation || 'create',
        parentDAIDs: context.parentDAIDs,
        metadata: metadataRef.current,
      });

      setDAID(newDAID);

      // Parse components
      const parsedComponents = DAIDGenerator.parse(newDAID);
      setComponents(parsedComponents);

      return newDAID;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [context, options.entityType, options.entityId, options.operation]);

  const updateMetadata = useCallback((metadata: DAIDMetadata) => {
    metadataRef.current = { ...metadataRef.current, ...metadata };
  }, []);

  // Auto-generate DAID on mount if requested
  useEffect(() => {
    if (options.autoGenerate && !daid) {
      generateDAID().catch(_error => {
        // TODO: Implement proper logging infrastructure
        // console.error('Auto-generate DAID failed:', _error);
      });
    }
  }, [options.autoGenerate, daid, generateDAID]);

  // Track on mount if requested
  useEffect(() => {
    if (options.trackOnMount && context.isTracking) {
      generateDAID().catch(_error => {
        // TODO: Implement proper logging infrastructure
        // console.error('Auto-generate DAID failed:', _error);
      });
    }
  }, [options.trackOnMount, context.isTracking, generateDAID]);

  return {
    daid,
    isLoading,
    error,
    generateDAID,
    updateMetadata,
    components,
  };
}

/**
 * Hook for tracking form submissions
 */
export function useDAIDForm(
  formId: string,
  options?: { trackFields?: boolean; metadata?: DAIDMetadata }
) {
  const context = useDAIDContext();
  const [formDAID, setFormDAID] = useState<string | null>(null);

  const trackFormSubmission = useCallback(
    async (formData: FormData | Record<string, unknown>) => {
      const metadata: DAIDMetadata = {
        formId,
        ...options?.metadata,
        timestamp: new Date().toISOString(),
      };

      if (options?.trackFields) {
        if (formData instanceof FormData) {
          const fields: Record<string, unknown> = {};
          formData.forEach((value, key) => {
            fields[key] = typeof value === 'string' ? value : '[File]';
          });
          metadata.fields = fields as DAIDMetadata;
        } else {
          metadata.fields = formData as DAIDMetadata;
        }
      }

      const daid = await context.createProvenanceRecord({
        entityType: 'form',
        entityId: formId,
        operation: 'submit',
        parentDAIDs: context.parentDAIDs,
        metadata,
      });

      setFormDAID(daid);
      return daid;
    },
    [context, formId, options]
  );

  const trackFormStart = useCallback(async () => {
    const daid = await context.createProvenanceRecord({
      entityType: 'form',
      entityId: formId,
      operation: 'start',
      parentDAIDs: context.parentDAIDs,
      metadata: {
        formId,
        ...options?.metadata,
        timestamp: new Date().toISOString(),
      },
    });

    setFormDAID(daid);
    return daid;
  }, [context, formId, options]);

  return {
    formDAID,
    trackFormSubmission,
    trackFormStart,
  };
}

/**
 * Hook for tracking API calls
 */
export function useDAIDAPI() {
  const context = useDAIDContext();

  const trackAPICall = useCallback(
    async (
      url: string,
      method: string,
      options?: {
        requestData?: unknown;
        responseData?: unknown;
        statusCode?: number;
        metadata?: DAIDMetadata;
      }
    ) => {
      const daid = await context.createProvenanceRecord({
        entityType: 'api_call',
        entityId: `${method.toUpperCase()}_${url}`,
        operation: 'call',
        parentDAIDs: context.parentDAIDs,
        metadata: {
          url,
          method: method.toUpperCase(),
          statusCode: options?.statusCode,
          hasRequestData: !!options?.requestData,
          hasResponseData: !!options?.responseData,
          ...options?.metadata,
          timestamp: new Date().toISOString(),
        },
      });

      return daid;
    },
    [context]
  );

  return { trackAPICall };
}

/**
 * Higher-order component for automatic DAID tracking
 */
export function withDAIDTracking<P extends object>(
  Component: ComponentType<P>,
  options: UseDAIDOptions
) {
  return function DAIDTrackedComponent(props: P) {
    const daidResult = useDAID(options);

    return React.createElement(Component, {
      ...props,
      daid: daidResult.daid,
      daidComponents: daidResult.components,
      generateDAID: daidResult.generateDAID,
    } as P & {
      daid: string | null;
      daidComponents: DAIDComponents | null;
      generateDAID: () => Promise<string>;
    });
  };
}

/**
 * Utility function to add DAID to fetch requests
 */
export function addDAIDToFetch(daid: string) {
  return {
    headers: {
      'X-DAID': daid,
      'X-Parent-DAIDs': daid,
    },
  };
}

/**
 * Enhanced fetch function with automatic DAID tracking
 */
export function createDAIDFetch(context: DAIDContextValue) {
  return async function daidFetch(url: string, options: RequestInit = {}) {
    const method = options.method || 'GET';

    // Add DAID headers
    const headers = new Headers(options.headers);
    if (context.currentDAID) {
      headers.set('X-DAID', context.currentDAID);
    }
    if (context.parentDAIDs.length > 0) {
      headers.set('X-Parent-DAIDs', context.parentDAIDs.join(','));
    }

    const enhancedOptions = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, enhancedOptions);

      // Track the API call
      await context.createProvenanceRecord({
        entityType: 'api_call',
        entityId: `${method}_${url}`,
        operation: 'call',
        parentDAIDs: context.parentDAIDs,
        metadata: {
          url,
          method,
          statusCode: response.status,
          timestamp: new Date().toISOString(),
        },
      });

      return response;
    } catch (error) {
      // Track failed API call
      await context.createProvenanceRecord({
        entityType: 'api_call',
        entityId: `${method}_${url}`,
        operation: 'error',
        parentDAIDs: context.parentDAIDs,
        metadata: {
          url,
          method,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        },
      });

      throw error;
    }
  };
}

/**
 * DAID (Digital Audio Identification and Documentation) store for provenance tracking
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  DAIDRecord,
  ProvenanceChain,
  DAIDQuery,
  DAIDValidationResult,
  ProvenanceVisualization,
  ProvenancePrivacySettings,
  DAIDSearchResult,
  ProvenanceInsight,
  DAIDIntegrationConfig,
} from '../types/daid';
import {
  EntityType,
  OperationType
} from '../types/daid';

interface DAIDState {
  // Configuration
  config: DAIDIntegrationConfig;
  
  // Provenance data
  records: Map<string, DAIDRecord>;
  chains: Map<string, ProvenanceChain>;
  
  // Search and filtering
  search_results: DAIDSearchResult | null;
  current_query: DAIDQuery | null;
  
  // Visualization
  current_visualization: ProvenanceVisualization | null;
  
  // Validation
  validation_results: Map<string, DAIDValidationResult>;
  
  // Insights and analytics
  insights: ProvenanceInsight[];
  
  // UI state
  selected_record: DAIDRecord | null;
  selected_entity: { type: EntityType; id: string } | null;
  privacy_settings: ProvenancePrivacySettings;
  
  // Loading states
  loading: {
    records: boolean;
    chains: boolean;
    search: boolean;
    validation: boolean;
    insights: boolean;
  };
  
  // Error states
  errors: {
    records: string | null;
    chains: string | null;
    search: string | null;
    validation: string | null;
    insights: string | null;
  };
  
  // Statistics
  stats: {
    total_records: number;
    records_created_today: number;
    validation_success_rate: number;
    average_chain_length: number;
    most_active_entity_type: EntityType | null;
  };
}

interface DAIDActions {
  // Configuration
  updateConfig: (config: Partial<DAIDIntegrationConfig>) => void;
  
  // Record management
  addRecord: (record: DAIDRecord) => void;
  updateRecord: (daid: string, updates: Partial<DAIDRecord>) => void;
  removeRecord: (daid: string) => void;
  getRecord: (daid: string) => DAIDRecord | null;
  
  // Chain management
  setProvenanceChain: (entity_type: EntityType, entity_id: string, chain: ProvenanceChain) => void;
  getProvenanceChain: (entity_type: EntityType, entity_id: string) => ProvenanceChain | null;
  refreshProvenanceChain: (entity_type: EntityType, entity_id: string) => Promise<void>;
  
  // Search functionality
  searchRecords: (query: DAIDQuery) => Promise<void>;
  clearSearchResults: () => void;
  
  // Validation
  validateRecord: (daid: string) => Promise<DAIDValidationResult>;
  validateChain: (entity_type: EntityType, entity_id: string) => Promise<DAIDValidationResult>;
  
  // Visualization
  generateVisualization: (chain: ProvenanceChain) => ProvenanceVisualization;
  updateVisualizationFilter: (filter: Partial<ProvenanceVisualization['filter_options']>) => void;
  
  // Privacy and settings
  updatePrivacySettings: (settings: Partial<ProvenancePrivacySettings>) => void;
  exportProvenance: (entity_type: EntityType, entity_id: string, options: any) => Promise<Blob>;
  
  // UI state management
  selectRecord: (record: DAIDRecord | null) => void;
  selectEntity: (entity_type: EntityType, entity_id: string) => void;
  clearSelection: () => void;
  
  // Insights and analytics
  generateInsights: (entity_type?: EntityType, time_range?: { start: string; end: string }) => Promise<void>;
  
  // Utility functions
  trackUserAction: (action_type: string, entity_type: EntityType, entity_id: string, metadata?: any) => Promise<void>;
  getEntityHistory: (entity_type: EntityType, entity_id: string) => DAIDRecord[];
  
  // Error handling
  setError: (category: keyof DAIDState['errors'], error: string | null) => void;
  clearErrors: () => void;
  
  // Loading states
  setLoading: (category: keyof DAIDState['loading'], loading: boolean) => void;
  
  // Statistics
  updateStats: () => void;
}

const defaultConfig: DAIDIntegrationConfig = {
  enabled: true,
  server_url: 'http://localhost:8002',
  batch_size: 100,
  batch_timeout_ms: 1000,
  auto_flush_enabled: true,
  privacy_settings: {
    default_privacy_level: 'private',
    allow_anonymization: true,
    retention_days: 365,
    auto_delete_enabled: false,
    track_user_actions: true,
    track_ai_decisions: true,
    track_parameter_changes: true,
    track_project_operations: true,
    allow_provenance_sharing: false,
    require_explicit_consent: true,
    anonymize_shared_data: true
  },
  cache_enabled: true,
  cache_ttl_minutes: 5,
  validation_enabled: true,
  show_provenance_indicators: true,
  enable_provenance_tooltips: true,
  visualization_theme: 'auto'
};

const defaultPrivacySettings: ProvenancePrivacySettings = {
  default_privacy_level: 'private',
  allow_anonymization: true,
  retention_days: 365,
  auto_delete_enabled: false,
  track_user_actions: true,
  track_ai_decisions: true,
  track_parameter_changes: true,
  track_project_operations: true,
  allow_provenance_sharing: false,
  require_explicit_consent: true,
  anonymize_shared_data: true
};

export const useDAIDStore = create<DAIDState & DAIDActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    config: defaultConfig,
    records: new Map(),
    chains: new Map(),
    search_results: null,
    current_query: null,
    current_visualization: null,
    validation_results: new Map(),
    insights: [],
    selected_record: null,
    selected_entity: null,
    privacy_settings: defaultPrivacySettings,
    
    loading: {
      records: false,
      chains: false,
      search: false,
      validation: false,
      insights: false
    },
    
    errors: {
      records: null,
      chains: null,
      search: null,
      validation: null,
      insights: null
    },
    
    stats: {
      total_records: 0,
      records_created_today: 0,
      validation_success_rate: 100,
      average_chain_length: 0,
      most_active_entity_type: null
    },
    
    // Actions
    updateConfig: (config) => {
      set((state) => ({
        config: { ...state.config, ...config }
      }));
    },
    
    addRecord: (record) => {
      set((state) => {
        const newRecords = new Map(state.records);
        newRecords.set(record.daid, record);
        return { records: newRecords };
      });
      get().updateStats();
    },
    
    updateRecord: (daid, updates) => {
      set((state) => {
        const newRecords = new Map(state.records);
        const existing = newRecords.get(daid);
        if (existing) {
          newRecords.set(daid, { ...existing, ...updates });
        }
        return { records: newRecords };
      });
    },
    
    removeRecord: (daid) => {
      set((state) => {
        const newRecords = new Map(state.records);
        newRecords.delete(daid);
        return { records: newRecords };
      });
    },
    
    getRecord: (daid) => {
      return get().records.get(daid) || null;
    },
    
    setProvenanceChain: (entity_type, entity_id, chain) => {
      set((state) => {
        const newChains = new Map(state.chains);
        const key = `${entity_type}:${entity_id}`;
        newChains.set(key, chain);
        
        // Also add individual records to the records map
        const newRecords = new Map(state.records);
        chain.provenance_chain.forEach(record => {
          newRecords.set(record.daid, record);
        });
        
        return { chains: newChains, records: newRecords };
      });
    },
    
    getProvenanceChain: (entity_type, entity_id) => {
      const key = `${entity_type}:${entity_id}`;
      return get().chains.get(key) || null;
    },
    
    refreshProvenanceChain: async (entity_type, entity_id) => {
      const { config, setLoading, setError } = get();
      
      if (!config.enabled) return;
      
      setLoading('chains', true);
      setError('chains', null);
      
      async function buildAuthHeaders() {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (config.api_key) {
          headers['Authorization'] = `Bearer ${config.api_key}`;
          return headers;
        }
        try {
          // Try Clerk browser global to get a JWT
          const anyWindow: any = window as any;
          const token = await anyWindow?.Clerk?.session?.getToken?.({ template: 'default' });
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {
          // ignore; unauthenticated fetch
        }
        return headers;
      }

      try {
        const headers = await buildAuthHeaders();
        const response = await fetch(
          `${config.server_url}/api/v1/daid/provenance/${entity_type}/${entity_id}`,
          {
            headers
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch provenance chain: ${response.statusText}`);
        }
        
        const chain: ProvenanceChain = await response.json();
        get().setProvenanceChain(entity_type, entity_id, chain);
        
      } catch (error) {
        setError('chains', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading('chains', false);
      }
    },
    
    searchRecords: async (query) => {
      const { config, setLoading, setError } = get();
      
      if (!config.enabled) return;
      
      setLoading('search', true);
      setError('search', null);
      
      try {
        const headers = await (async () => {
          const h: Record<string, string> = { 'Content-Type': 'application/json' };
          if (get().config.api_key) {
            h['Authorization'] = `Bearer ${get().config.api_key}`;
            return h;
          }
          try {
            const anyWindow: any = window as any;
            const token = await anyWindow?.Clerk?.session?.getToken?.({ template: 'default' });
            if (token) h['Authorization'] = `Bearer ${token}`;
          } catch (error) {
            console.warn('Failed to get auth token:', error);
          }
          return h;
        })();
        const response = await fetch(`${config.server_url}/api/v1/daid/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify(query)
        });
        
        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }
        
        const results: DAIDSearchResult = await response.json();
        
        set({
          search_results: results,
          current_query: query
        });
        
      } catch (error) {
        setError('search', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading('search', false);
      }
    },
    
    clearSearchResults: () => {
      set({
        search_results: null,
        current_query: null
      });
    },
    
    validateRecord: async (daid) => {
      const { config, setLoading, setError } = get();
      
      if (!config.enabled || !config.validation_enabled) {
        return {
          is_valid: true,
          validation_errors: [],
          integrity_check_passed: true,
          chain_consistency_passed: true,
          validation_time_ms: 0,
          records_validated: 0
        };
      }
      
      setLoading('validation', true);
      setError('validation', null);
      
      try {
        const headers = await (async () => {
          const h: Record<string, string> = { 'Content-Type': 'application/json' };
          if (get().config.api_key) {
            h['Authorization'] = `Bearer ${get().config.api_key}`;
            return h;
          }
          try {
            const anyWindow: any = window as any;
            const token = await anyWindow?.Clerk?.session?.getToken?.({ template: 'default' });
            if (token) h['Authorization'] = `Bearer ${token}`;
          } catch (error) {
            console.warn('Failed to get auth token:', error);
          }
          return h;
        })();
        const response = await fetch(`${config.server_url}/api/v1/daid/validate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ daids: [daid] })
        });
        
        if (!response.ok) {
          throw new Error(`Validation failed: ${response.statusText}`);
        }
        
        const result: DAIDValidationResult = await response.json();
        
        // Cache validation result
        set((state) => {
          const newValidationResults = new Map(state.validation_results);
          newValidationResults.set(daid, result);
          return { validation_results: newValidationResults };
        });
        
        return result;
        
      } catch (error) {
        const errorResult: DAIDValidationResult = {
          is_valid: false,
          validation_errors: [error instanceof Error ? error.message : 'Unknown error'],
          integrity_check_passed: false,
          chain_consistency_passed: false,
          validation_time_ms: 0,
          records_validated: 0
        };
        
        setError('validation', error instanceof Error ? error.message : 'Unknown error');
        return errorResult;
        
      } finally {
        setLoading('validation', false);
      }
    },
    
    validateChain: async (entity_type, entity_id) => {
      const chain = get().getProvenanceChain(entity_type, entity_id);
      if (!chain) {
        return {
          is_valid: false,
          validation_errors: ['No provenance chain found'],
          integrity_check_passed: false,
          chain_consistency_passed: false,
          validation_time_ms: 0,
          records_validated: 0
        };
      }
      
      const daids = chain.provenance_chain.map(record => record.daid);
      const { config, setLoading, setError } = get();
      
      setLoading('validation', true);
      setError('validation', null);
      
      try {
        const response = await fetch(`${config.server_url}/api/v1/daid/validate`, {
          method: 'POST',
          headers: {
            'Authorization': config.api_key ? `Bearer ${config.api_key}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ daids })
        });
        
        if (!response.ok) {
          throw new Error(`Chain validation failed: ${response.statusText}`);
        }
        
        const result: DAIDValidationResult = await response.json();
        return result;
        
      } catch (error) {
        setError('validation', error instanceof Error ? error.message : 'Unknown error');
        return {
          is_valid: false,
          validation_errors: [error instanceof Error ? error.message : 'Unknown error'],
          integrity_check_passed: false,
          chain_consistency_passed: false,
          validation_time_ms: 0,
          records_validated: daids.length
        };
      } finally {
        setLoading('validation', false);
      }
    },
    
    generateVisualization: (chain) => {
      // Generate visualization nodes and edges from provenance chain
      const nodes: any[] = [];
      const edges: any[] = [];
      
      chain.provenance_chain.forEach((record, index) => {
        nodes.push({
          id: record.daid,
          daid: record.daid,
          entity_type: record.entity_type,
          entity_id: record.entity_id,
          operation: record.operation,
          timestamp: record.created_at,
          user_id: record.user_id,
          depth: record.depth,
          x: index * 100,
          y: record.depth * 80,
          color: getNodeColor(record.operation),
          size: 20,
          title: `${record.operation} - ${record.entity_id}`,
          description: record.operation_metadata?.description || '',
          metadata: record.operation_metadata
        });
        
        // Create edges for parent relationships
        record.parent_daids.forEach(parentDaid => {
          edges.push({
            id: `${parentDaid}-${record.daid}`,
            source: parentDaid,
            target: record.daid,
            type: 'parent',
            color: '#666',
            width: 2,
            style: 'solid'
          });
        });
      });
      
      const visualization: ProvenanceVisualization = {
        nodes,
        edges,
        width: Math.max(800, nodes.length * 120),
        height: Math.max(600, Math.max(...nodes.map(n => n.y)) + 100),
        scale: 1,
        filter_options: {
          entity_types: Object.values(EntityType),
          operations: Object.values(OperationType),
          time_range: {
            start: chain.created_at,
            end: chain.last_updated
          },
          users: [...new Set(chain.provenance_chain.map(r => r.user_id).filter((id): id is string => Boolean(id)))]
        }
      };
      
      set({ current_visualization: visualization });
      return visualization;
    },
    
    updateVisualizationFilter: (filter) => {
      set((state) => {
        if (!state.current_visualization) return state;
        
        return {
          current_visualization: {
            ...state.current_visualization,
            filter_options: {
              ...state.current_visualization.filter_options,
              ...filter
            }
          }
        };
      });
    },
    
    updatePrivacySettings: (settings) => {
      set((state) => ({
        privacy_settings: { ...state.privacy_settings, ...settings }
      }));
    },
    
    exportProvenance: async (entity_type, entity_id, options) => {
      const { config } = get();
      
      const headers = await (async () => {
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (get().config.api_key) {
          h['Authorization'] = `Bearer ${get().config.api_key}`;
          return h;
        }
        try {
          const anyWindow: any = window as any;
          const token = await anyWindow?.Clerk?.session?.getToken?.({ template: 'default' });
          if (token) h['Authorization'] = `Bearer ${token}`;
        } catch {
          // Ignore errors when getting auth token
        }
        return h;
      })();
      const response = await fetch(
        `${config.server_url}/api/v1/daid/export/${entity_type}/${entity_id}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(options)
        }
      );
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      return response.blob();
    },
    
    selectRecord: (record) => {
      set({ selected_record: record });
    },
    
    selectEntity: (entity_type, entity_id) => {
      set({ selected_entity: { type: entity_type, id: entity_id } });
    },
    
    clearSelection: () => {
      set({ selected_record: null, selected_entity: null });
    },
    
    generateInsights: async (entity_type, time_range) => {
      const { config, setLoading, setError } = get();
      
      setLoading('insights', true);
      setError('insights', null);
      
      try {
        const headers = await (async () => {
          const h: Record<string, string> = { 'Content-Type': 'application/json' };
          if (get().config.api_key) {
            h['Authorization'] = `Bearer ${get().config.api_key}`;
            return h;
          }
          try {
            const anyWindow: any = window as any;
            const token = await anyWindow?.Clerk?.session?.getToken?.({ template: 'default' });
            if (token) h['Authorization'] = `Bearer ${token}`;
          } catch {}
          return h;
        })();
        const queryParams = new URLSearchParams();
        if (entity_type) queryParams.append('entity_type', entity_type);
        if (time_range) {
          queryParams.append('start_date', time_range.start);
          queryParams.append('end_date', time_range.end);
        }
        
        const response = await fetch(
          `${config.server_url}/api/v1/daid/insights?${queryParams}`,
          {
            headers
          }
        );
        
        if (!response.ok) {
          throw new Error(`Insights generation failed: ${response.statusText}`);
        }
        
        const insights: ProvenanceInsight[] = await response.json();
        set({ insights });
        
      } catch (error) {
        setError('insights', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading('insights', false);
      }
    },
    
    trackUserAction: async (action_type, entity_type, entity_id, metadata = {}) => {
      const { config } = get();
      
      if (!config.enabled || !config.privacy_settings.track_user_actions) {
        return;
      }
      
      try {
        const headers = await (async () => {
          const h: Record<string, string> = { 'Content-Type': 'application/json' };
          if (get().config.api_key) {
            h['Authorization'] = `Bearer ${get().config.api_key}`;
            return h;
          }
          try {
            const anyWindow: any = window as any;
            const token = await anyWindow?.Clerk?.session?.getToken?.({ template: 'default' });
            if (token) h['Authorization'] = `Bearer ${token}`;
          } catch {}
          return h;
        })();
        await fetch(`${config.server_url}/api/v1/daid/track/user-action`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action_type,
            entity_type,
            entity_id,
            metadata,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.warn('Failed to track user action:', error);
      }
    },
    
    getEntityHistory: (entity_type, entity_id) => {
      const records = Array.from(get().records.values());
      return records
        .filter(record => record.entity_type === entity_type && record.entity_id === entity_id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
    
    setError: (category, error) => {
      set((state) => ({
        errors: { ...state.errors, [category]: error }
      }));
    },
    
    clearErrors: () => {
      set({
        errors: {
          records: null,
          chains: null,
          search: null,
          validation: null,
          insights: null
        }
      });
    },
    
    setLoading: (category, loading) => {
      set((state) => ({
        loading: { ...state.loading, [category]: loading }
      }));
    },
    
    updateStats: () => {
      const { records } = get();
      const recordsArray = Array.from(records.values());
      const today = new Date().toDateString();
      
      const recordsCreatedToday = recordsArray.filter(
        record => new Date(record.created_at).toDateString() === today
      ).length;
      
      const entityTypeCounts = recordsArray.reduce((acc, record) => {
        acc[record.entity_type] = (acc[record.entity_type] || 0) + 1;
        return acc;
      }, {} as Record<EntityType, number>);
      
      const mostActiveEntityType = Object.entries(entityTypeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] as EntityType || null;
      
      set((state) => ({
        stats: {
          ...state.stats,
          total_records: recordsArray.length,
          records_created_today: recordsCreatedToday,
          most_active_entity_type: mostActiveEntityType
        }
      }));
    }
  }))
);

// Helper function to get node color based on operation type
function getNodeColor(operation: OperationType): string {
  const colorMap: Record<OperationType, string> = {
    [OperationType.CREATE]: '#4CAF50',
    [OperationType.UPDATE]: '#2196F3',
    [OperationType.DELETE]: '#F44336',
    [OperationType.TRANSFORM]: '#FF9800',
    [OperationType.ANALYZE]: '#9C27B0',
    [OperationType.PROCESS]: '#607D8B',
    [OperationType.EXPORT]: '#795548',
    [OperationType.IMPORT]: '#009688',
    [OperationType.AI_DECISION]: '#E91E63',
    [OperationType.USER_INTERACTION]: '#3F51B5'
  };
  
  return colorMap[operation] || '#666666';
}

// Subscribe to WebSocket messages for real-time DAID updates
if (typeof window !== 'undefined') {
  // This would be integrated with the existing WebSocket system
  // For now, it's a placeholder for the integration point
}

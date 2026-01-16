import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  PluginMetadata, 
  PluginInstance, 
  PluginChain, 
  PluginRecommendation,
  PluginSearchFilters,
  PluginPerformanceMetrics,
  PluginSessionState,
  PluginCategory,
  PluginFormat
} from '@/types/plugins';

interface PluginState {
  // Plugin browser state
  availablePlugins: PluginMetadata[];
  searchQuery: string;
  searchFilters: PluginSearchFilters;
  searchResults: PluginMetadata[];
  recommendations: PluginRecommendation[];
  selectedPlugin: PluginMetadata | null;
  isLoading: boolean;

  // Plugin instances and chains
  pluginInstances: Record<string, PluginInstance>; // instanceId -> instance
  pluginChains: Record<string, PluginChain>; // chainId -> chain
  trackPlugins: Record<string, string[]>; // trackId -> instanceIds

  // Performance monitoring
  performanceMetrics: Record<string, PluginPerformanceMetrics>; // instanceId -> metrics

  // Session state
  sessionState: PluginSessionState | null;

  // Plugin browser actions
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: PluginSearchFilters) => void;
  setAvailablePlugins: (plugins: PluginMetadata[]) => void;
  setSearchResults: (results: PluginMetadata[]) => void;
  setRecommendations: (recommendations: PluginRecommendation[]) => void;
  setSelectedPlugin: (plugin: PluginMetadata | null) => void;
  setLoading: (loading: boolean) => void;

  // Plugin instance management
  addPluginInstance: (trackId: string, instance: PluginInstance) => void;
  removePluginInstance: (trackId: string, instanceId: string) => void;
  updatePluginInstance: (instanceId: string, updates: Partial<PluginInstance>) => void;
  bypassPlugin: (instanceId: string, bypassed: boolean) => void;
  setPluginParameter: (instanceId: string, parameterId: string, value: number) => void;
  loadPluginPreset: (instanceId: string, presetName: string) => void;

  // Plugin chain management
  createPluginChain: (trackId: string, name: string, pluginIds: string[]) => string;
  updatePluginChain: (chainId: string, updates: Partial<PluginChain>) => void;
  deletePluginChain: (chainId: string) => void;
  reorderPluginsInChain: (chainId: string, pluginIds: string[]) => void;
  reorderTrackPlugins: (trackId: string, instanceIds: string[]) => void;

  // Performance monitoring
  updatePerformanceMetrics: (instanceId: string, metrics: PluginPerformanceMetrics) => void;
  getPluginPerformance: (instanceId: string) => PluginPerformanceMetrics | null;

  // Session state management
  setSessionState: (state: PluginSessionState) => void;
  createSnapshot: (description?: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  undo: () => boolean;
  redo: () => boolean;

  // Utility functions
  getTrackPlugins: (trackId: string) => PluginInstance[];
  getActivePlugins: () => PluginInstance[];
  getTotalCpuUsage: () => number;
  getPluginsByCategory: (category: PluginCategory) => PluginInstance[];
  getPluginsByFormat: (format: PluginFormat) => PluginInstance[];
  searchPlugins: (query: string, filters?: PluginSearchFilters) => PluginMetadata[];

  // Cleanup
  clearAll: () => void;
}

const initialState = {
  availablePlugins: [],
  searchQuery: '',
  searchFilters: {},
  searchResults: [],
  recommendations: [],
  selectedPlugin: null,
  isLoading: false,
  pluginInstances: {},
  pluginChains: {},
  trackPlugins: {},
  performanceMetrics: {},
  sessionState: null,
};

export const usePluginStore = create<PluginState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Plugin browser actions
        setSearchQuery: (query: string) => {
          set({ searchQuery: query }, false, 'plugin/setSearchQuery');
        },

        setSearchFilters: (filters: PluginSearchFilters) => {
          set({ searchFilters: filters }, false, 'plugin/setSearchFilters');
        },

        setAvailablePlugins: (plugins: PluginMetadata[]) => {
          set({ availablePlugins: plugins }, false, 'plugin/setAvailablePlugins');
        },

        setSearchResults: (results: PluginMetadata[]) => {
          set({ searchResults: results }, false, 'plugin/setSearchResults');
        },

        setRecommendations: (recommendations: PluginRecommendation[]) => {
          set({ recommendations }, false, 'plugin/setRecommendations');
        },

        setSelectedPlugin: (plugin: PluginMetadata | null) => {
          set({ selectedPlugin: plugin }, false, 'plugin/setSelectedPlugin');
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading }, false, 'plugin/setLoading');
        },

        // Plugin instance management
        addPluginInstance: (trackId: string, instance: PluginInstance) => {
          set(
            (state) => {
              const newInstances = {
                ...state.pluginInstances,
                [instance.instance_id]: instance,
              };

              const trackPluginIds = state.trackPlugins[trackId] || [];
              const newTrackPlugins = {
                ...state.trackPlugins,
                [trackId]: [...trackPluginIds, instance.instance_id],
              };

              return {
                pluginInstances: newInstances,
                trackPlugins: newTrackPlugins,
              };
            },
            false,
            'plugin/addPluginInstance'
          );
        },

        removePluginInstance: (trackId: string, instanceId: string) => {
          set(
            (state) => {
              // Remove from instances
              const { [instanceId]: removed, ...remainingInstances } = state.pluginInstances;

              // Remove from track plugins
              const trackPluginIds = state.trackPlugins[trackId] || [];
              const newTrackPlugins = {
                ...state.trackPlugins,
                [trackId]: trackPluginIds.filter(id => id !== instanceId),
              };

              // Remove from performance metrics
              const { [instanceId]: removedMetrics, ...remainingMetrics } = state.performanceMetrics;

              return {
                pluginInstances: remainingInstances,
                trackPlugins: newTrackPlugins,
                performanceMetrics: remainingMetrics,
              };
            },
            false,
            'plugin/removePluginInstance'
          );
        },

        updatePluginInstance: (instanceId: string, updates: Partial<PluginInstance>) => {
          set(
            (state) => {
              const instance = state.pluginInstances[instanceId];
              if (!instance) return state;

              return {
                pluginInstances: {
                  ...state.pluginInstances,
                  [instanceId]: { ...instance, ...updates },
                },
              };
            },
            false,
            'plugin/updatePluginInstance'
          );
        },

        bypassPlugin: (instanceId: string, bypassed: boolean) => {
          get().updatePluginInstance(instanceId, { is_bypassed: bypassed });
        },

        setPluginParameter: (instanceId: string, parameterId: string, value: number) => {
          set(
            (state) => {
              const instance = state.pluginInstances[instanceId];
              if (!instance || !instance.parameters[parameterId]) return state;

              const parameter = instance.parameters[parameterId];
              const updatedParameter = { ...parameter, value };

              return {
                pluginInstances: {
                  ...state.pluginInstances,
                  [instanceId]: {
                    ...instance,
                    parameters: {
                      ...instance.parameters,
                      [parameterId]: updatedParameter,
                    },
                    last_used: new Date().toISOString(),
                  },
                },
              };
            },
            false,
            'plugin/setPluginParameter'
          );
        },

        loadPluginPreset: (instanceId: string, presetName: string) => {
          set(
            (state) => {
              const instance = state.pluginInstances[instanceId];
              if (!instance) return state;

              const preset = instance.available_presets.find(p => p.name === presetName);
              if (!preset) return state;

              // Update parameters from preset
              const updatedParameters = { ...instance.parameters };
              Object.entries(preset.parameters).forEach(([paramName, paramValue]) => {
                if (updatedParameters[paramName]) {
                  updatedParameters[paramName] = {
                    ...updatedParameters[paramName],
                    value: paramValue,
                  };
                }
              });

              return {
                pluginInstances: {
                  ...state.pluginInstances,
                  [instanceId]: {
                    ...instance,
                    parameters: updatedParameters,
                    current_preset: presetName,
                    last_used: new Date().toISOString(),
                  },
                },
              };
            },
            false,
            'plugin/loadPluginPreset'
          );
        },

        // Plugin chain management
        createPluginChain: (_trackId: string, name: string, pluginIds: string[]) => {
          const chainId = `chain_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          
          set(
            (state) => {
              const plugins = pluginIds
                .map(id => state.pluginInstances[id])
                .filter((plugin): plugin is PluginInstance => Boolean(plugin));

              const chain: PluginChain = {
                chain_id: chainId,
                name,
                plugins,
                is_active: true,
                input_gain: 1.0,
                output_gain: 1.0,
                total_latency_samples: plugins.reduce((sum, p) => sum + p.plugin_metadata.latency_samples, 0),
                estimated_cpu_usage: Math.min(1.0, plugins.reduce((sum, p) => sum + p.cpu_usage, 0)),
              };

              return {
                pluginChains: {
                  ...state.pluginChains,
                  [chainId]: chain,
                },
              };
            },
            false,
            'plugin/createPluginChain'
          );

          return chainId;
        },

        updatePluginChain: (chainId: string, updates: Partial<PluginChain>) => {
          set(
            (state) => {
              const chain = state.pluginChains[chainId];
              if (!chain) return state;

              return {
                pluginChains: {
                  ...state.pluginChains,
                  [chainId]: { ...chain, ...updates },
                },
              };
            },
            false,
            'plugin/updatePluginChain'
          );
        },

        deletePluginChain: (chainId: string) => {
          set(
            (state) => {
              const { [chainId]: removed, ...remainingChains } = state.pluginChains;
              return { pluginChains: remainingChains };
            },
            false,
            'plugin/deletePluginChain'
          );
        },

        reorderPluginsInChain: (chainId: string, pluginIds: string[]) => {
          set(
            (state) => {
              const chain = state.pluginChains[chainId];
              if (!chain) return state;

              const reorderedPlugins = pluginIds
                .map(id => state.pluginInstances[id])
                .filter((plugin): plugin is PluginInstance => Boolean(plugin));

              return {
                ...state,
                pluginChains: {
                  ...state.pluginChains,
                  [chainId]: {
                    ...chain,
                    plugins: reorderedPlugins,
                  },
                },
              };
            },
            false,
            'plugin/reorderPluginsInChain'
          );
        },

        reorderTrackPlugins: (trackId: string, instanceIds: string[]) => {
          set(
            (state) => ({
              trackPlugins: {
                ...state.trackPlugins,
                [trackId]: instanceIds,
              },
            }),
            false,
            'plugin/reorderTrackPlugins'
          );
        },

        // Performance monitoring
        updatePerformanceMetrics: (instanceId: string, metrics: PluginPerformanceMetrics) => {
          set(
            (state) => ({
              performanceMetrics: {
                ...state.performanceMetrics,
                [instanceId]: metrics,
              },
            }),
            false,
            'plugin/updatePerformanceMetrics'
          );
        },

        getPluginPerformance: (instanceId: string) => {
          return get().performanceMetrics[instanceId] || null;
        },

        // Session state management
        setSessionState: (sessionState: PluginSessionState) => {
          set({ sessionState }, false, 'plugin/setSessionState');
        },

        createSnapshot: (description?: string) => {
          const state = get();
          if (!state.sessionState) return;

          // This would typically be handled by the backend
          console.log('Creating plugin state snapshot:', description);
        },

        restoreSnapshot: (snapshotId: string) => {
          const state = get();
          if (!state.sessionState) return;

          // This would typically be handled by the backend
          console.log('Restoring plugin state snapshot:', snapshotId);
        },

        undo: () => {
          const state = get();
          if (!state.sessionState?.can_undo) return false;

          // This would typically be handled by the backend
          console.log('Undoing plugin state');
          return true;
        },

        redo: () => {
          const state = get();
          if (!state.sessionState?.can_redo) return false;

          // This would typically be handled by the backend
          console.log('Redoing plugin state');
          return true;
        },

        // Utility functions
        getTrackPlugins: (trackId: string) => {
          const state = get();
          const pluginIds = state.trackPlugins[trackId] || [];
          return pluginIds
            .map(id => state.pluginInstances[id])
            .filter((plugin): plugin is PluginInstance => Boolean(plugin));
        },

        getActivePlugins: () => {
          const state = get();
          return Object.values(state.pluginInstances).filter(plugin => plugin.is_active);
        },

        getTotalCpuUsage: () => {
          const state = get();
          const activePlugins = Object.values(state.pluginInstances).filter(p => p.is_active);
          return Math.min(1.0, activePlugins.reduce((sum, plugin) => sum + plugin.cpu_usage, 0));
        },

        getPluginsByCategory: (category: PluginCategory) => {
          const state = get();
          return Object.values(state.pluginInstances).filter(
            plugin => plugin.plugin_metadata.category === category
          );
        },

        getPluginsByFormat: (format: PluginFormat) => {
          const state = get();
          return Object.values(state.pluginInstances).filter(
            plugin => plugin.plugin_metadata.format === format
          );
        },

        searchPlugins: (query: string, filters?: PluginSearchFilters) => {
          const state = get();
          let results = state.availablePlugins;

          // Apply text search
          if (query) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(plugin =>
              plugin.name.toLowerCase().includes(lowerQuery) ||
              plugin.manufacturer.toLowerCase().includes(lowerQuery) ||
              plugin.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
            );
          }

          // Apply filters
          if (filters) {
            if (filters.category) {
              results = results.filter(plugin => plugin.category === filters.category);
            }
            if (filters.format) {
              results = results.filter(plugin => plugin.format === filters.format);
            }
            if (filters.manufacturer) {
              results = results.filter(plugin =>
                plugin.manufacturer.toLowerCase().includes(filters.manufacturer!.toLowerCase())
              );
            }
            if (filters.minRating) {
              results = results.filter(plugin => plugin.quality_rating >= filters.minRating!);
            }
            if (filters.maxCpuUsage) {
              results = results.filter(plugin => plugin.cpu_usage_estimate <= filters.maxCpuUsage!);
            }
          }

          return results;
        },

        // Cleanup
        clearAll: () => {
          set(initialState, false, 'plugin/clearAll');
        },
      }),
      {
        name: 'daw-plugin-store',
        partialize: (state) => ({
          searchFilters: state.searchFilters,
          selectedPlugin: state.selectedPlugin,
          pluginInstances: state.pluginInstances,
          pluginChains: state.pluginChains,
          trackPlugins: state.trackPlugins,
        }),
      }
    ),
    { name: 'PluginStore' }
  )
);
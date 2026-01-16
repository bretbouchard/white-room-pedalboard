/**
 * Enhanced Plugin Store with Real Plugin Database Integration
 *
 * This store extends the basic plugin functionality with real plugin scanning,
 * intelligent search, personalized recommendations, and usage analytics.
 */

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

import {
  pluginDatabaseService,
  type PluginSearchRequest,
  type PluginScanRequest,
  type RecommendationRequest,
  type UsageTrackingRequest,
  type PluginDatabaseStats,
  type PluginAnalytics
} from '@/services/pluginDatabaseService';

interface EnhancedPluginState {
  // Real plugin database state
  isRealPluginDatabaseEnabled: boolean;
  lastScanTime: Date | null;
  scanProgress: {
    isScanning: boolean;
    scanned: number;
    total: number;
    currentStep: string;
  };
  databaseStats: PluginDatabaseStats | null;

  // Enhanced search capabilities
  advancedSearchFilters: {
    manufacturers: string[];
    minQuality: number;
    maxCpuUsage: number | null;
    minUserRating: number;
    supportedFormats: PluginFormat[];
    tags: string[];
  };

  // Quality metrics and analytics
  qualityMetrics: any | null;
  pluginAnalytics: Record<string, PluginAnalytics>;

  // Personalized recommendations
  recommendationContext: Record<string, any>;
  recommendationHistory: Array<{
    timestamp: Date;
    context: Record<string, any>;
    recommendations: any[];
  }>;

  // Real plugin database actions
  scanRealPlugins: (request?: PluginScanRequest) => Promise<void>;
  searchRealPlugins: (request: Partial<PluginSearchRequest>) => Promise<PluginMetadata[]>;
  getRealPluginCategories: () => Promise<any[]>;
  getRealPluginFormats: () => Promise<any[]>;
  getRealPluginManufacturers: () => Promise<any[]>;
  getPersonalizedRecommendations: (context?: Record<string, any>, limit?: number) => Promise<void>;
  trackPluginUsage: (pluginId: string, sessionDuration: number, rating?: number) => Promise<void>;
  getPluginAnalytics: (pluginId: string) => Promise<PluginAnalytics | null>;
  getDatabaseStats: () => Promise<void>;
  getQualityMetrics: () => Promise<void>;

  // Enhanced search actions
  setAdvancedSearchFilters: (filters: Partial<EnhancedPluginState['advancedSearchFilters']>) => void;
  searchWithAdvancedFilters: () => Promise<PluginMetadata[]>;
  clearAdvancedFilters: () => void;

  // Recommendation actions
  setRecommendationContext: (context: Record<string, any>) => void;
  refreshRecommendations: () => Promise<void>;
  dismissRecommendation: (pluginId: string) => void;

  // Utility actions
  enableRealPluginDatabase: () => void;
  disableRealPluginDatabase: () => void;
  refreshPluginDatabase: () => Promise<void>;

  // Inherited basic plugin state and actions
  availablePlugins: PluginMetadata[];
  searchQuery: string;
  searchFilters: PluginSearchFilters;
  searchResults: PluginMetadata[];
  recommendations: PluginRecommendation[];
  selectedPlugin: PluginMetadata | null;
  isLoading: boolean;
  pluginInstances: Record<string, PluginInstance>;
  pluginChains: Record<string, PluginChain>;
  trackPlugins: Record<string, string[]>;
  performanceMetrics: Record<string, PluginPerformanceMetrics>;
  sessionState: PluginSessionState | null;

  // Basic actions (simplified for brevity - these would include all the basic plugin store actions)
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: PluginSearchFilters) => void;
  setAvailablePlugins: (plugins: PluginMetadata[]) => void;
  setSearchResults: (results: PluginMetadata[]) => void;
  setRecommendations: (recommendations: PluginRecommendation[]) => void;
  setSelectedPlugin: (plugin: PluginMetadata | null) => void;
  setLoading: (loading: boolean) => void;
  addPluginInstance: (trackId: string, instance: PluginInstance) => void;
  removePluginInstance: (trackId: string, instanceId: string) => void;
  updatePluginInstance: (instanceId: string, updates: Partial<PluginInstance>) => void;
  bypassPlugin: (instanceId: string, bypassed: boolean) => void;
  setPluginParameter: (instanceId: string, parameterId: string, value: number) => void;
  clearAll: () => void;
}

const initialEnhancedState = {
  isRealPluginDatabaseEnabled: true,
  lastScanTime: null,
  scanProgress: {
    isScanning: false,
    scanned: 0,
    total: 0,
    currentStep: '',
  },
  databaseStats: null,
  advancedSearchFilters: {
    manufacturers: [],
    minQuality: 0,
    maxCpuUsage: null,
    minUserRating: 0,
    supportedFormats: [],
    tags: [],
  },
  qualityMetrics: null,
  pluginAnalytics: {},
  recommendationContext: {},
  recommendationHistory: [],
};

export const useEnhancedPluginStore = create<EnhancedPluginState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initialize with basic plugin state
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

        // Enhanced plugin database state
        ...initialEnhancedState,

        // Real plugin database actions
        scanRealPlugins: async (request: PluginScanRequest = {}) => {
          const state = get();
          if (!state.isRealPluginDatabaseEnabled) return;

          set({
            scanProgress: {
              isScanning: true,
              scanned: 0,
              total: 0,
              currentStep: 'Initializing scan...',
            },
            isLoading: true,
          });

          try {
            const result = await pluginDatabaseService.scanPlugins(request);

            if (result.success) {
              // Refresh available plugins after scan
              await get().refreshPluginDatabase();

              set({
                lastScanTime: new Date(),
                scanProgress: {
                  isScanning: false,
                  scanned: result.results.scanned,
                  total: result.results.scanned,
                  currentStep: 'Scan completed',
                },
                isLoading: false,
              });

              console.log(`Plugin scan completed: ${result.message}`);
            } else {
              throw new Error('Plugin scan failed');
            }
          } catch (error) {
            console.error('Plugin scan failed:', error);
            set({
              scanProgress: {
                isScanning: false,
                scanned: 0,
                total: 0,
                currentStep: 'Scan failed',
              },
              isLoading: false,
            });
          }
        },

        searchRealPlugins: async (request: Partial<PluginSearchRequest>) => {
          const state = get();
          if (!state.isRealPluginDatabaseEnabled) return [];

          set({ isLoading: true });

          try {
            const results = await pluginDatabaseService.searchPlugins(request);
            set({ searchResults: results, isLoading: false });
            return results;
          } catch (error) {
            console.error('Plugin search failed:', error);
            set({ searchResults: [], isLoading: false });
            return [];
          }
        },

        getRealPluginCategories: async () => {
          try {
            return await pluginDatabaseService.getCategories();
          } catch (error) {
            console.error('Failed to get categories:', error);
            return [];
          }
        },

        getRealPluginFormats: async () => {
          try {
            return await pluginDatabaseService.getFormats();
          } catch (error) {
            console.error('Failed to get formats:', error);
            return [];
          }
        },

        getRealPluginManufacturers: async () => {
          try {
            return await pluginDatabaseService.getManufacturers();
          } catch (error) {
            console.error('Failed to get manufacturers:', error);
            return [];
          }
        },

        getPersonalizedRecommendations: async (context?: Record<string, any>, limit: number = 10) => {
          const state = get();
          if (!state.isRealPluginDatabaseEnabled) return;

          set({ isLoading: true });

          try {
            const request: RecommendationRequest = {
              context: context || state.recommendationContext,
              limit,
            };

            const results = await pluginDatabaseService.getRecommendations(request);

            // Convert to recommendation format
            const recommendations: PluginRecommendation[] = results.map(rec => ({
              clerk_user_id: undefined,
              plugin_id: rec.plugin.id,
              plugin_name: rec.plugin.name,
              plugin_category: rec.plugin.category,
              plugin_format: rec.plugin.format,
              confidence: rec.score,
              relevance_score: rec.score,
              reasoning: rec.reason,
              style_context: 'general',
              alternative_plugins: [],
              recommended_at: new Date().toISOString(),
              recommender_agent: 'plugin-database-service',
              overall_score: rec.score,
            }));

            set({
              recommendations,
              recommendationHistory: [
                ...state.recommendationHistory,
                {
                  timestamp: new Date(),
                  context: request.context || {},
                  recommendations,
                },
              ].slice(-10), // Keep only last 10 recommendation sessions
              isLoading: false,
            });
          } catch (error) {
            console.error('Failed to get recommendations:', error);
            set({ recommendations: [], isLoading: false });
          }
        },

        trackPluginUsage: async (pluginId: string, sessionDuration: number, rating?: number) => {
          const state = get();
          if (!state.isRealPluginDatabaseEnabled) return;

          try {
            const request: UsageTrackingRequest = {
              plugin_id: pluginId,
              session_duration: sessionDuration,
              rating,
            };

            await pluginDatabaseService.trackUsage(request);

            // Update local analytics if available
            const existingAnalytics = state.pluginAnalytics[pluginId];
            if (existingAnalytics) {
              set({
                pluginAnalytics: {
                  ...state.pluginAnalytics,
                  [pluginId]: {
                    ...existingAnalytics,
                    total_usage: existingAnalytics.total_usage + 1,
                    avg_session_duration: (existingAnalytics.avg_session_duration + sessionDuration) / 2,
                    avg_user_rating: rating ? (existingAnalytics.avg_user_rating + rating) / 2 : existingAnalytics.avg_user_rating,
                  },
                },
              });
            }
          } catch (error) {
            console.error('Failed to track plugin usage:', error);
          }
        },

        getPluginAnalytics: async (pluginId: string) => {
          const state = get();
          if (!state.isRealPluginDatabaseEnabled) return null;

          try {
            const analytics = await pluginDatabaseService.getPluginAnalytics(pluginId);

            set({
              pluginAnalytics: {
                ...state.pluginAnalytics,
                [pluginId]: analytics,
              },
            });

            return analytics;
          } catch (error) {
            console.error('Failed to get plugin analytics:', error);
            return null;
          }
        },

        getDatabaseStats: async () => {
          const state = get();
          if (!state.isRealPluginDatabaseEnabled) return;

          try {
            const stats = await pluginDatabaseService.getDatabaseStats();
            set({ databaseStats: stats });
          } catch (error) {
            console.error('Failed to get database stats:', error);
          }
        },

        getQualityMetrics: async () => {
          const state = get();
          if (!state.isRealPluginDatabaseEnabled) return;

          try {
            const metrics = await pluginDatabaseService.getQualityMetrics();
            set({ qualityMetrics: metrics });
          } catch (error) {
            console.error('Failed to get quality metrics:', error);
          }
        },

        // Enhanced search actions
        setAdvancedSearchFilters: (filters: Partial<EnhancedPluginState['advancedSearchFilters']>) => {
          set(
            (state) => ({
              advancedSearchFilters: {
                ...state.advancedSearchFilters,
                ...filters,
              },
            }),
            false,
            'enhanced-plugin/setAdvancedSearchFilters'
          );
        },

        searchWithAdvancedFilters: async () => {
          const state = get();
          const filters = state.advancedSearchFilters;

          const searchRequest: Partial<PluginSearchRequest> = {
            query: state.searchQuery,
            manufacturers: filters.manufacturers.length > 0 ? filters.manufacturers : undefined,
            min_quality: filters.minQuality > 0 ? filters.minQuality : undefined,
            max_cpu_usage: filters.maxCpuUsage || undefined,
            min_user_rating: filters.minUserRating > 0 ? filters.minUserRating : undefined,
            formats: filters.supportedFormats.length > 0 ? filters.supportedFormats : undefined,
            tags: filters.tags.length > 0 ? filters.tags : undefined,
            sort_by: 'relevance',
            limit: 50,
          };

          return await get().searchRealPlugins(searchRequest);
        },

        clearAdvancedFilters: () => {
          set({
            advancedSearchFilters: initialEnhancedState.advancedSearchFilters,
          }, false, 'enhanced-plugin/clearAdvancedFilters');
        },

        // Recommendation actions
        setRecommendationContext: (context: Record<string, any>) => {
          set({ recommendationContext: context }, false, 'enhanced-plugin/setRecommendationContext');
        },

        refreshRecommendations: async () => {
          await get().getPersonalizedRecommendations();
        },

        dismissRecommendation: (pluginId: string) => {
          set(
            (state) => ({
              recommendations: state.recommendations.filter(rec => rec.plugin_id !== pluginId),
            }),
            false,
            'enhanced-plugin/dismissRecommendation'
          );
        },

        // Utility actions
        enableRealPluginDatabase: () => {
          set({ isRealPluginDatabaseEnabled: true }, false, 'enhanced-plugin/enableRealPluginDatabase');
        },

        disableRealPluginDatabase: () => {
          set({ isRealPluginDatabaseEnabled: false }, false, 'enhanced-plugin/disableRealPluginDatabase');
        },

        refreshPluginDatabase: async () => {
          const state = get();
          if (!state.isRealPluginDatabaseEnabled) return;

          // Refresh all plugin data
          await Promise.all([
            get().searchRealPlugins({ limit: 100 }), // Get first 100 plugins
            get().getDatabaseStats(),
            get().getQualityMetrics(),
          ]);

          // Update available plugins
          const searchResults = get().searchResults;
          set({ availablePlugins: searchResults });
        },

        // Basic plugin actions (simplified implementations)
        setSearchQuery: (query: string) => {
          set({ searchQuery: query }, false, 'enhanced-plugin/setSearchQuery');
        },

        setSearchFilters: (filters: PluginSearchFilters) => {
          set({ searchFilters: filters }, false, 'enhanced-plugin/setSearchFilters');
        },

        setAvailablePlugins: (plugins: PluginMetadata[]) => {
          set({ availablePlugins: plugins }, false, 'enhanced-plugin/setAvailablePlugins');
        },

        setSearchResults: (results: PluginMetadata[]) => {
          set({ searchResults: results }, false, 'enhanced-plugin/setSearchResults');
        },

        setRecommendations: (recommendations: PluginRecommendation[]) => {
          set({ recommendations }, false, 'enhanced-plugin/setRecommendations');
        },

        setSelectedPlugin: (plugin: PluginMetadata | null) => {
          set({ selectedPlugin: plugin }, false, 'enhanced-plugin/setSelectedPlugin');
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading }, false, 'enhanced-plugin/setLoading');
        },

        addPluginInstance: (trackId: string, instance: PluginInstance) => {
          set(
            (state) => ({
              pluginInstances: {
                ...state.pluginInstances,
                [instance.instance_id]: instance,
              },
              trackPlugins: {
                ...state.trackPlugins,
                [trackId]: [...(state.trackPlugins[trackId] || []), instance.instance_id],
              },
            }),
            false,
            'enhanced-plugin/addPluginInstance'
          );
        },

        removePluginInstance: (trackId: string, instanceId: string) => {
          set(
            (state) => {
              const { [instanceId]: removed, ...remainingInstances } = state.pluginInstances;
              const trackPluginIds = state.trackPlugins[trackId] || [];
              const newTrackPlugins = {
                ...state.trackPlugins,
                [trackId]: trackPluginIds.filter(id => id !== instanceId),
              };

              return {
                pluginInstances: remainingInstances,
                trackPlugins: newTrackPlugins,
              };
            },
            false,
            'enhanced-plugin/removePluginInstance'
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
            'enhanced-plugin/updatePluginInstance'
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
            'enhanced-plugin/setPluginParameter'
          );
        },

        clearAll: () => {
          set({
            ...initialEnhancedState,
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
          }, false, 'enhanced-plugin/clearAll');
        },
      }),
      {
        name: 'enhanced-daw-plugin-store',
        partialize: (state) => ({
          isRealPluginDatabaseEnabled: state.isRealPluginDatabaseEnabled,
          lastScanTime: state.lastScanTime,
          advancedSearchFilters: state.advancedSearchFilters,
          recommendationContext: state.recommendationContext,
          searchFilters: state.searchFilters,
          selectedPlugin: state.selectedPlugin,
          pluginInstances: state.pluginInstances,
          pluginChains: state.pluginChains,
          trackPlugins: state.trackPlugins,
        }),
      }
    ),
    { name: 'EnhancedPluginStore' }
  )
);
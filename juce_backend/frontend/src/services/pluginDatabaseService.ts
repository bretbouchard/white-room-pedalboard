/**
 * Plugin Database Service
 *
 * This service connects the frontend to the enhanced real plugin database API,
 * providing real plugin scanning, intelligent search, and personalized recommendations.
 */

import type {
  PluginMetadata,
  PluginRecommendation,
  PluginSearchFilters,
  PluginCategory,
  PluginFormat
} from '@/types/plugins';

// API request/response types
export interface PluginScanRequest {
  formats?: PluginFormat[];
  include_system_plugins?: boolean;
  replace_existing?: boolean;
}

export interface PluginScanResponse {
  success: boolean;
  results: {
    scanned: number;
    imported: number;
    updated: number;
    errors: number;
    error_details?: string[];
  };
  message: string;
}

export interface PluginSearchRequest {
  query: string;
  categories?: PluginCategory[];
  formats?: PluginFormat[];
  manufacturers?: string[];
  min_quality?: number;
  max_cpu_usage?: number;
  max_memory_usage?: number;
  supports_64bit?: boolean;
  min_user_rating?: number;
  tags?: string[];
  sort_by: string;
  limit: number;
}

export interface PluginAnalytics {
  total_users: number;
  total_usage: number;
  avg_session_duration: number;
  avg_user_rating: number;
  usage_frequency: string;
  reliability_score: number;
  performance_score: number;
}

export interface PluginDatabaseStats {
  total_plugins: number;
  formats: Record<string, number>;
  categories: Record<string, number>;
  manufacturers: Record<string, number>;
  quality_distribution: {
    excellent: number;
    good: number;
    fair: number;
    basic: number;
  };
  avg_quality: number;
  avg_user_rating: number;
}

export interface UsageTrackingRequest {
  plugin_id: string;
  session_duration: number;
  rating?: number;
}

export interface RecommendationRequest {
  context?: Record<string, any>;
  limit: number;
}

class PluginDatabaseService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Plugin database API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Plugin database service error for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Scan for real plugins on the system
   */
  async scanPlugins(request: PluginScanRequest = {}): Promise<PluginScanResponse> {
    return this.makeRequest<PluginScanResponse>('/plugin-database/scan', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Advanced plugin search with multiple criteria
   */
  async searchPlugins(request: Partial<PluginSearchRequest> = {}): Promise<PluginMetadata[]> {
    const searchRequest: PluginSearchRequest = {
      query: '',
      sort_by: 'relevance',
      limit: 50,
      ...request,
    };

    const results = await this.makeRequest<any[]>('/plugin-database/search', {
      method: 'POST',
      body: JSON.stringify(searchRequest),
    });

    // Convert API response to PluginMetadata format
    return results.map(plugin => ({
      ...plugin,
      latency_samples: 0, // Default value, could be enhanced later
      is_instrument: plugin.category === 'synthesizer',
      is_64_bit: plugin.supports_64bit,
      cpu_usage: plugin.cpu_usage_estimate,
      last_used: null,
      usage_count: 0,
      presets: [],
      available_presets: [],
      parameter_cache: {},
    }));
  }

  /**
   * Get all available plugin categories
   */
  async getCategories(): Promise<{ value: string; label: string; description: string }[]> {
    return this.makeRequest('/plugin-database/categories');
  }

  /**
   * Get all available plugin formats
   */
  async getFormats(): Promise<{ value: string; label: string; description: string }[]> {
    return this.makeRequest('/plugin-database/formats');
  }

  /**
   * Get all available plugin manufacturers
   */
  async getManufacturers(): Promise<{ name: string; plugin_count: number }[]> {
    return this.makeRequest('/plugin-database/manufacturers');
  }

  /**
   * Get personalized plugin recommendations
   */
  async getRecommendations(request: RecommendationRequest = { limit: 10 }): Promise<{
    plugin: PluginMetadata;
    reason: string;
    score: number;
  }[]> {
    const results = await this.makeRequest<any[]>('/plugin-database/recommendations', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    // Convert API response to recommendation format
    return results.map(rec => ({
      plugin: {
        ...rec.plugin,
        latency_samples: 0,
        is_instrument: rec.plugin.category === 'synthesizer',
        is_64_bit: rec.plugin.supports_64bit,
        cpu_usage: rec.plugin.cpu_usage_estimate,
        last_used: null,
        usage_count: 0,
        presets: [],
        available_presets: [],
        parameter_cache: {},
      },
      reason: rec.reason,
      score: rec.score,
    }));
  }

  /**
   * Track plugin usage for analytics and recommendations
   */
  async trackUsage(request: UsageTrackingRequest): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/plugin-database/track-usage', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get analytics data for a specific plugin
   */
  async getPluginAnalytics(pluginId: string): Promise<PluginAnalytics> {
    return this.makeRequest(`/plugin-database/analytics/${pluginId}`);
  }

  /**
   * Get overview statistics for the plugin database
   */
  async getDatabaseStats(): Promise<PluginDatabaseStats> {
    return this.makeRequest('/plugin-database/stats/overview');
  }

  /**
   * Get quality metrics and scoring criteria
   */
  async getQualityMetrics(): Promise<{
    scoring_criteria: Record<string, any>;
    quality_ranges: Record<string, any>;
    cpu_usage_estimates: Record<string, number>;
    memory_usage_estimates: Record<string, number>;
  }> {
    return this.makeRequest('/plugin-database/quality-metrics');
  }

  /**
   * Search plugins by category (convenience method)
   */
  async searchByCategory(category: PluginCategory, limit: number = 20): Promise<PluginMetadata[]> {
    return this.searchPlugins({
      categories: [category],
      sort_by: 'relevance',
      limit,
    });
  }

  /**
   * Search plugins by manufacturer (convenience method)
   */
  async searchByManufacturer(manufacturer: string, limit: number = 20): Promise<PluginMetadata[]> {
    return this.searchPlugins({
      manufacturers: [manufacturer],
      sort_by: 'relevance',
      limit,
    });
  }

  /**
   * Get high-quality plugins (convenience method)
   */
  async getHighQualityPlugins(minQuality: number = 0.8, limit: number = 20): Promise<PluginMetadata[]> {
    return this.searchPlugins({
      min_quality: minQuality,
      sort_by: 'quality',
      limit,
    });
  }

  /**
   * Get low CPU usage plugins (convenience method)
   */
  async getLowCpuPlugins(maxCpuUsage: number = 0.1, limit: number = 20): Promise<PluginMetadata[]> {
    return this.searchPlugins({
      max_cpu_usage: maxCpuUsage,
      sort_by: 'cpu_efficiency',
      limit,
    });
  }
}

// Export singleton instance
export const pluginDatabaseService = new PluginDatabaseService();
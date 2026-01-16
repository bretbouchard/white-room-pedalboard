import { useState, useEffect, useCallback } from 'react';
import type { PluginMetadata, PluginSearchFilters } from '@/types/plugins';

interface UsePluginsOptions {
  limit?: number;
  formatFilter?: string;
  categoryFilter?: string;
}

interface UsePluginsResult {
  plugins: PluginMetadata[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const usePlugins = (options: UsePluginsOptions = {}): UsePluginsResult => {
  const { limit = 100, formatFilter, categoryFilter } = options;
  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (formatFilter) params.append('format_filter', formatFilter);
      if (categoryFilter) params.append('category_filter', categoryFilter);

      const response = await fetch(`${API_BASE_URL}/plugins-simple?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Map backend response to frontend types
      const mappedPlugins: PluginMetadata[] = data.plugins.map((plugin: any) => ({
        name: plugin.name,
        manufacturer: plugin.manufacturer,
        version: plugin.version,
        unique_id: plugin.unique_id,
        id: plugin.id,
        category: plugin.category as any, // Cast to PluginCategory
        format: plugin.format as any, // Cast to PluginFormat
        tags: [], // Backend doesn't provide tags yet
        input_channels: 2, // Default stereo
        output_channels: 2, // Default stereo
        latency_samples: 128, // Default latency
        cpu_usage_estimate: 0.1, // Default CPU estimate
        memory_usage_mb: 50, // Default memory estimate
        quality_rating: 0.8, // Default quality rating
        user_rating: 0.7, // Default user rating
        supported_sample_rates: [44100, 48000, 96000], // Common sample rates
        supports_64bit: true, // Default to true
      }));

      setPlugins(mappedPlugins);
      setTotalCount(data.total_available || mappedPlugins.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plugins';
      setError(errorMessage);
      console.error('Error fetching plugins:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, formatFilter, categoryFilter]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  return {
    plugins,
    loading,
    error,
    totalCount,
    refetch: fetchPlugins,
  };
};
import { useState, useCallback } from 'react';

interface LoadPluginOptions {
  plugin_id: string;
  track_id?: string;
}

interface LoadPluginResult {
  success: boolean;
  instance_id?: string;
  plugin_name?: string;
  track_id?: string;
  message?: string;
  error?: string;
}

interface UsePluginLoaderResult {
  loadPlugin: (options: LoadPluginOptions) => Promise<LoadPluginResult>;
  loading: boolean;
  error: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const usePluginLoader = (): UsePluginLoaderResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlugin = useCallback(async (options: LoadPluginOptions): Promise<LoadPluginResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/plugins-simple/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load plugin';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loadPlugin,
    loading,
    error,
  };
};
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocketStore } from '@/stores/websocketStore';

// API client configuration
const API_BASE_URL = '/api';

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

interface ProjectData {
  id: string;
  name: string;
  tempo: number;
  timeSignature: [number, number];
  tracks: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface PluginData {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  parameters: Record<string, unknown>;
}

// Generic API client
class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new ApiClient();

// Query keys
export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  plugins: ['plugins'] as const,
  plugin: (id: string) => ['plugins', id] as const,
  audioAnalysis: ['audio-analysis'] as const,
} as const;

// Project queries
export const useProjects = () => {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => apiClient.get<ProjectData[]>('/projects'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProject = (projectId: string) => {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => apiClient.get<ProjectData>(`/projects/${projectId}`),
    enabled: !!projectId,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const sendMessage = useWebSocketStore(state => state.sendMessage);

  return useMutation({
    mutationFn: (projectData: Partial<ProjectData>) =>
      apiClient.post<ProjectData>('/projects', projectData),
    onSuccess: response => {
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });

      // Send WebSocket notification
      sendMessage('project_created', { projectId: response.data.id });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const sendMessage = useWebSocketStore(state => state.sendMessage);

  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ProjectData> & { id: string }) =>
      apiClient.put<ProjectData>(`/projects/${id}`, data),
    onSuccess: (response, variables) => {
      // Update cached project data
      queryClient.setQueryData(queryKeys.project(variables.id), response);

      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });

      // Send WebSocket notification
      sendMessage('project_updated', { projectId: variables.id });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const sendMessage = useWebSocketStore(state => state.sendMessage);

  return useMutation({
    mutationFn: (projectId: string) =>
      apiClient.delete(`/projects/${projectId}`),
    onSuccess: (_, projectId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.project(projectId) });

      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });

      // Send WebSocket notification
      sendMessage('project_deleted', { projectId });
    },
  });
};

// Plugin queries
export const usePlugins = () => {
  return useQuery({
    queryKey: queryKeys.plugins,
    queryFn: () => apiClient.get<PluginData[]>('/plugins'),
    staleTime: 10 * 60 * 1000, // 10 minutes (plugins don't change often)
  });
};

export const usePlugin = (pluginId: string) => {
  return useQuery({
    queryKey: queryKeys.plugin(pluginId),
    queryFn: () => apiClient.get<PluginData>(`/plugins/${pluginId}`),
    enabled: !!pluginId,
  });
};

// Real-time audio analysis query
export const useAudioAnalysis = () => {
  return useQuery({
    queryKey: queryKeys.audioAnalysis,
    queryFn: () => apiClient.get('/audio/analysis'),
    refetchInterval: 100, // Update every 100ms for real-time feel
    refetchIntervalInBackground: false,
    staleTime: 0, // Always consider stale for real-time data
  });
};

// Optimistic updates helper
export const useOptimisticUpdate = <T>(
  queryKey: readonly unknown[],
  updateFn: (oldData: T | undefined, newData: Partial<T>) => T
) => {
  const queryClient = useQueryClient();

  return (newData: Partial<T>) => {
    queryClient.setQueryData<T>(queryKey, oldData =>
      updateFn(oldData, newData)
    );
  };
};

// WebSocket integration for real-time updates
export const useWebSocketSync = () => {
  const queryClient = useQueryClient();
  const { status, connect, disconnect } = useWebSocketStore();

  // Auto-connect when component mounts
  React.useEffect(() => {
    if (status === 'disconnected') {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [status, connect, disconnect]);

  // Handle real-time updates via WebSocket
  React.useEffect(() => {
    // This would be implemented to listen to WebSocket messages
    // and update React Query cache accordingly
    // Example:
    // const handleWebSocketMessage = (message) => {
    //   switch (message.type) {
    //     case 'project_updated':
    //       queryClient.invalidateQueries({
    //         queryKey: queryKeys.project(message.data.projectId)
    //       });
    //       break;
    //     case 'audio_level_update':
    //       queryClient.setQueryData(
    //         queryKeys.audioAnalysis,
    //         message.data
    //       );
    //       break;
    //   }
    // };
  }, [queryClient]);
};

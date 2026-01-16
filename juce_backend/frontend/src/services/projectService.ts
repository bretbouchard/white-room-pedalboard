import { CompositionContext } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

export const saveProject = async (
  filePath: string,
  compositionContext: Partial<CompositionContext>
): Promise<{ status: string; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/project/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // TODO: Add authorization header
    },
    body: JSON.stringify({
      file_path: filePath,
      composition_context: compositionContext,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to save project');
  }

  return response.json();
};

export const loadProject = async (
  filePath: string
): Promise<CompositionContext> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/project/load`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // TODO: Add authorization header
    },
    body: JSON.stringify({
      file_path: filePath,
    }),
  });

  return response.json();
};

export const syncProjectToCloud = async (
  compositionContext: Partial<CompositionContext>
): Promise<{ status: string; message: string; projectId: string }> => {
  const CLOUD_API_URL = import.meta.env.VITE_CLOUD_API_URL || 'https://schillinger-backend.fly.io';

  try {
    const response = await fetch(`${CLOUD_API_URL}/api/v1/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      body: JSON.stringify({
        composition_context: compositionContext,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to sync project to cloud: ${response.status}`);
    }

    const result = await response.json();

    // Validate response structure
    if (!result.project_id) {
      throw new Error('Invalid response from cloud service: missing project_id');
    }

    console.log(`Project successfully synced to cloud with ID: ${result.project_id}`);
    return {
      status: "success",
      message: `Project synced to cloud with ID: ${result.project_id}`,
      projectId: result.project_id,
    };

  } catch (error) {
    // In development, provide fallback behavior for testing
    if (import.meta.env.DEV) {
      console.warn('Cloud sync failed, using development fallback:', error);
      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay for dev
      const fallbackProjectId = `dev_proj_${Date.now()}`;
      return {
        status: "fallback",
        message: `Project saved locally (dev fallback) with ID: ${fallbackProjectId}`,
        projectId: fallbackProjectId,
      };
    }

    // In production, always fail loudly
    throw new Error(`Cloud sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const loadProjectFromCloud = async (
  projectId: string
): Promise<CompositionContext> => {
  const CLOUD_API_URL = import.meta.env.VITE_CLOUD_API_URL || 'https://schillinger-backend.fly.io';

  try {
    const response = await fetch(`${CLOUD_API_URL}/api/v1/projects/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to load project from cloud: ${response.status}`);
    }

    const result = await response.json();

    // Validate response structure
    if (!result.composition_context) {
      throw new Error('Invalid response from cloud service: missing composition_context');
    }

    // Validate and normalize CompositionContext structure
    const compositionContext: CompositionContext = {
      composition_id: result.composition_context.composition_id || projectId,
      tempo: result.composition_context.tempo || 120,
      key_signature: result.composition_context.key_signature || 'C_MAJOR',
      time_signature: result.composition_context.time_signature || { numerator: 4, denominator: 4 },
      style: result.composition_context.style || 'CLASSICAL',
      instrumentation: Array.isArray(result.composition_context.instrumentation)
        ? result.composition_context.instrumentation
        : ['Piano'],
    };

    console.log(`Successfully loaded project from cloud: ${projectId}`);
    return compositionContext;

  } catch (error) {
    // In development, provide a fallback for testing
    if (import.meta.env.DEV) {
      console.warn('Cloud load failed, using development fallback:', error);
      await new Promise(resolve => setTimeout(resolve, 300)); // Reduced delay for dev

      // Return a development fallback context
      const fallbackContext: CompositionContext = {
        composition_id: projectId,
        tempo: 120,
        key_signature: 'C_MAJOR',
        time_signature: { numerator: 4, denominator: 4 },
        style: 'CLASSICAL',
        instrumentation: ['Piano'],
      };

      console.log("Loaded fallback context for development:", fallbackContext);
      return fallbackContext;
    }

    // In production, always fail loudly
    throw new Error(`Failed to load project from cloud: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

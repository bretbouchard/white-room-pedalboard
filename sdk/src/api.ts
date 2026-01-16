import { CompositionContext, AudioAnalysis, UserPreferences } from "./models";

const API_BASE_URL = "/api";

export interface TransformationRequest {
  transformation: string;
  composition_context?: CompositionContext;
  audio_analysis?: AudioAnalysis;
  user_preferences?: UserPreferences;
  tracks?: Record<string, any>[];
  processor_type?: string;
}

export async function transform<T>(request: TransformationRequest): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/transform`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Transformation failed");
  }

  return response.json();
}

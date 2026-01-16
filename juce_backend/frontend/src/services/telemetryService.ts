/**
 * Telemetry Service
 *
 * Handles API calls to the Python backend telemetry endpoints.
 */

interface TelemetrySession {
  session_id: string;
  time_to_first_sound_ms: number;
  focus_changes: number;
  control_switches_per_min: number;
  dead_interactions: number;
  created_at?: string;
}

interface TelemetryInteractionEvent {
  event_id: string;
  session_id: string;
  control_id: string;
  delta: number;
  duration_ms: number;
  reversed: boolean;
  abandoned: boolean;
  timestamp_ms: number;
  created_at?: string;
}

interface TelemetryControlMetrics {
  session_id: string;
  control_id: string;
  interaction_count: number;
  avg_adjust_time_ms: number;
  overshoot_rate: number;
  micro_adjust_count: number;
  undo_rate: number;
  abandon_rate: number;
  created_at?: string;
}

interface SessionsResponse {
  sessions: TelemetrySession[];
  total_count: number;
}

interface SessionDetailResponse {
  session: TelemetrySession;
  interaction_events: TelemetryInteractionEvent[];
  control_metrics: TelemetryControlMetrics[];
}

interface ControlMetricsSummary {
  control_id: string;
  total_interactions: number;
  avg_duration_ms: number;
  avg_delta: number;
  overshoot_rate: number;
  abandon_rate: number;
  micro_adjust_rate: number;
  sessions_count: number;
}

interface DashboardSummary {
  total_sessions: number;
  total_interactions: number;
  avg_session_duration_ms: number;
  avg_time_to_first_sound_ms: number;
  top_controls: ControlMetricsSummary[];
  recent_sessions: TelemetrySession[];
}

class TelemetryService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1/telemetry') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all telemetry sessions
   */
  async getSessions(limit: number = 50, offset: number = 0): Promise<SessionsResponse> {
    const response = await fetch(
      `${this.baseUrl}/sessions?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get sessions: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get details for a specific session
   */
  async getSessionDetail(sessionId: string): Promise<SessionDetailResponse> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get session detail: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get metrics aggregated by control
   */
  async getControlMetrics(limit: number = 20): Promise<TelemetryControlMetrics[]> {
    const response = await fetch(
      `${this.baseUrl}/metrics/control?limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get control metrics: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get dashboard summary with key metrics
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await fetch(`${this.baseUrl}/dashboard/summary`);

    if (!response.ok) {
      throw new Error(`Failed to get dashboard summary: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get interaction events for a session
   */
  async getSessionEvents(sessionId: string): Promise<TelemetryInteractionEvent[]> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/events`);

    if (!response.ok) {
      throw new Error(`Failed to get session events: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Singleton instance
export const telemetryService = new TelemetryService();
export default telemetryService;

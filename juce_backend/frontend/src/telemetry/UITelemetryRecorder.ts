/**
 * UI Telemetry Recorder
 *
 * Captures user interaction metrics for Console, EffectsBus, and ChannelStrip components.
 * Integrates with Python backend telemetry API.
 *
 * Data model: specs/ui-telemetry-constraints-testing/data-model.md
 * API: python_backend/src/schillinger/api/v1/telemetry/routes.py
 */

import { v4 as uuidv4 } from 'uuid';

//==============================================================================
// Types
//==============================================================================

export interface UIInteractionEvent {
  event_id: string;
  session_id: string;
  control_id: string;
  delta: number;
  duration_ms: number;
  reversed: boolean;
  abandoned: boolean;
  timestamp_ms: number;
}

export interface UIControlMetrics {
  session_id: string;
  control_id: string;
  interaction_count: number;
  avg_adjust_time_ms: number;
  overshoot_rate: number;
  micro_adjust_count: number;
  undo_rate: number;
  abandon_rate: number;
}

export interface UISession {
  session_id: string;
  time_to_first_sound_ms: number;
  focus_changes: number;
  control_switches_per_min: number;
  dead_interactions: number;
}

export interface TelemetryUploadResponse {
  success: boolean;
  message: string;
  stats?: {
    total_records: number;
    sessions_created: number;
    interaction_events_created: number;
    control_metrics_upserted: number;
    parameter_events_created: number;
  };
}

//==============================================================================
// Configuration
//==============================================================================

interface TelemetryConfig {
  apiBaseUrl: string;
  batchSize: number;
  flushIntervalMs: number;
  enabled: boolean;
  debug: boolean;
}

const DEFAULT_CONFIG: TelemetryConfig = {
  apiBaseUrl: '/api/v1/telemetry',
  batchSize: 50,
  flushIntervalMs: 30000, // 30 seconds
  enabled: true,
  debug: false,
};

//==============================================================================
// UI Telemetry Recorder
//==============================================================================

export class UITelemetryRecorder {
  private config: TelemetryConfig;
  private sessionID: string;
  private sessionStartTime: number;
  private interactionEvents: Map<string, UIInteractionEvent[]> = new Map();
  private controlMetrics: Map<string, UIControlMetrics> = new Map();
  private focusChangeCount: number = 0;
  private interactionStartTime: Map<string, number> = new Map();
  private lastValue: Map<string, number> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionID = uuidv4();
    this.sessionStartTime = Date.now();

    if (this.config.enabled) {
      this.startFlushTimer();
    }
  }

  //==============================================================================
  // Session Management
  //==============================================================================

  /**
   * Get the current session ID
   */
  getSessionID(): string {
    return this.sessionID;
  }

  /**
   * End the current session and upload final metrics
   */
  async endSession(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();
  }

  //==============================================================================
  // Focus Tracking
  //==============================================================================

  /**
   * Record a focus change event
   */
  recordFocusChange(fromControl: string, toControl: string): void {
    if (!this.config.enabled) return;

    this.focusChangeCount++;

    this.log('focus', `${fromControl} -> ${toControl}`);
  }

  //==============================================================================
  // Interaction Tracking
  //==============================================================================

  /**
   * Start tracking an interaction with a control
   *
   * Call this when user begins touching a knob, slider, or button
   */
  startInteraction(controlID: string, initialValue: number): void {
    if (!this.config.enabled) return;

    this.interactionStartTime.set(controlID, Date.now());
    this.lastValue.set(controlID, initialValue);

    this.log('start', `${controlID} @ ${initialValue}`);
  }

  /**
   * Record a value change during interaction
   *
   * Call this repeatedly as user drags/adjusts a control
   */
  recordValueChange(controlID: string, newValue: number): void {
    if (!this.config.enabled) return;

    const oldValue = this.lastValue.get(controlID) ?? 0;
    const delta = Math.abs(newValue - oldValue);

    // Track if user reversed direction (potential overshoot)
    const previousDelta = this.lastValue.get(`${controlID}_delta`) ?? 0;
    const reversed = this.detectReversal(oldValue, newValue, previousDelta);

    this.lastValue.set(controlID, newValue);
    this.lastValue.set(`${controlID}_delta`, delta);

    this.log('change', `${controlID}: ${oldValue} -> ${newValue} (Δ${delta}${reversed ? ' REVERSED' : ''})`);
  }

  /**
   * End tracking an interaction with a control
   *
   * Call this when user releases touch or focus moves away
   */
  endInteraction(controlID: string, finalValue: number, abandoned: boolean = false): void {
    if (!this.config.enabled) return;

    const startTime = this.interactionStartTime.get(controlID);
    if (!startTime) {
      // No start recorded, skip
      return;
    }

    const duration = Date.now() - startTime;
    const initialValue = this.lastValue.get(`${controlID}_initial`) ?? this.lastValue.get(controlID) ?? finalValue;
    const delta = Math.abs(finalValue - initialValue);

    // Detect if user reversed direction at any point
    const reversed = this.detectReversal(initialValue, finalValue, 0);

    // Create event
    const event: UIInteractionEvent = {
      event_id: uuidv4(),
      session_id: this.sessionID,
      control_id: controlID,
      delta,
      duration_ms: duration,
      reversed,
      abandoned,
      timestamp_ms: Date.now(),
    };

    // Store event
    if (!this.interactionEvents.has(controlID)) {
      this.interactionEvents.set(controlID, []);
    }
    this.interactionEvents.get(controlID)!.push(event);

    // Update metrics
    this.updateControlMetrics(controlID, event);

    // Cleanup
    this.interactionStartTime.delete(controlID);
    this.lastValue.delete(`${controlID}_initial`);
    this.lastValue.delete(`${controlID}_delta`);

    this.log('end', `${controlID} -> ${finalValue} (${duration}ms)${abandoned ? ' ABANDONED' : ''}`);

    // Auto-flush if we've reached batch size
    if (this.getEventCount() >= this.config.batchSize) {
      this.flush();
    }
  }

  //==============================================================================
  // Metrics Aggregation
  //==============================================================================

  private updateControlMetrics(controlID: string, event: UIInteractionEvent): void {
    let metrics = this.controlMetrics.get(controlID);

    if (!metrics) {
      metrics = {
        session_id: this.sessionID,
        control_id: controlID,
        interaction_count: 0,
        avg_adjust_time_ms: 0,
        overshoot_rate: 0,
        micro_adjust_count: 0,
        undo_rate: 0,
        abandon_rate: 0,
      };
      this.controlMetrics.set(controlID, metrics);
    }

    // Update interaction count
    metrics.interaction_count++;

    // Update average adjust time (running average)
    const totalTime = metrics.avg_adjust_time_ms * (metrics.interaction_count - 1) + event.duration_ms;
    metrics.avg_adjust_time_ms = totalTime / metrics.interaction_count;

    // Update overshoot rate
    const overshootCount = Math.round(metrics.overshoot_rate * (metrics.interaction_count - 1)) + (event.reversed ? 1 : 0);
    metrics.overshoot_rate = overshootCount / metrics.interaction_count;

    // Update micro-adjust count (adjustments < 100ms with small delta)
    if (event.duration_ms < 100 && event.delta < 0.05) {
      metrics.micro_adjust_count++;
    }

    // Update abandon rate
    const abandonCount = Math.round(metrics.abandon_rate * (metrics.interaction_count - 1)) + (event.abandoned ? 1 : 0);
    metrics.abandon_rate = abandonCount / metrics.interaction_count;
  }

  //==============================================================================
  // Upload to Backend
  //==============================================================================

  /**
   * Flush all pending telemetry to the backend
   */
  async flush(): Promise<TelemetryUploadResponse | null> {
    if (!this.config.enabled || this.getEventCount() === 0) {
      return null;
    }

    try {
      // Flatten events
      const allEvents: UIInteractionEvent[] = [];
      for (const events of this.interactionEvents.values()) {
        allEvents.push(...events);
      }

      // Convert metrics to array
      const allMetrics = Array.from(this.controlMetrics.values());

      // Prepare session data
      const sessionData: UISession = {
        session_id: this.sessionID,
        time_to_first_sound_ms: Date.now() - this.sessionStartTime,
        focus_changes: this.focusChangeCount,
        control_switches_per_min: (this.focusChangeCount / ((Date.now() - this.sessionStartTime) / 60000)),
        dead_interactions: allMetrics.reduce((sum, m) => sum + (m.abandon_rate * m.interaction_count), 0),
      };

      // Upload
      const response = await fetch(`${this.config.apiBaseUrl}/upload/ui`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: sessionData,
          interaction_events: allEvents,
          control_metrics: allMetrics,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: TelemetryUploadResponse = await response.json();

      // Clear uploaded events
      this.interactionEvents.clear();

      this.log('flush', `Uploaded ${allEvents.length} events`);

      return result;
    } catch (error) {
      this.log('error', `Failed to upload telemetry: ${error}`);
      return null;
    }
  }

  //==============================================================================
  // Utilities
  //==============================================================================

  private getEventCount(): number {
    let count = 0;
    for (const events of this.interactionEvents.values()) {
      count += events.length;
    }
    return count;
  }

  private detectReversal(initial: number, final: number, previousDelta: number): boolean {
    // Simple reversal detection: if previous movement was in one direction
    // and current movement is in the opposite direction
    const currentDelta = final - initial;
    if (previousDelta !== 0 && Math.sign(currentDelta) !== Math.sign(previousDelta)) {
      return true;
    }
    return false;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  private log(type: string, message: string): void {
    if (this.config.debug) {
      console.log(`[UITelemetry:${type.toUpperCase()}]`, message);
    }
  }
}

//==============================================================================
// Global Singleton
//==============================================================================

let globalRecorder: UITelemetryRecorder | null = null;

export function getTelemetryRecorder(): UITelemetryRecorder {
  if (!globalRecorder) {
    globalRecorder = new UITelemetryRecorder({
      enabled: process.env.NODE_ENV === 'production' || process.env.REACT_APP_TELEMETRY_ENABLED === 'true',
      debug: process.env.REACT_APP_TELEMETRY_DEBUG === 'true',
    });
  }
  return globalRecorder;
}

export function resetTelemetryRecorder(): void {
  if (globalRecorder) {
    globalRecorder.endSession();
    globalRecorder = null;
  }
}

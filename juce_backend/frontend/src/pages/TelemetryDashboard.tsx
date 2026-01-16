/**
 * Telemetry Dashboard
 *
 * Visualizes UI telemetry data including:
 * - Session overview metrics
 * - Control metrics and patterns
 * - Interaction analysis
 * - Usability insights
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/utils';
import telemetryService, { DashboardSummary } from '@/services/telemetryService';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  className,
}) => {
  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500';
  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';

  return (
    <div className={cn(
      'bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4',
      className
    )}>
      <div className="text-xs text-daw-text-tertiary uppercase tracking-wide mb-1">
        {title}
      </div>
      <div className="text-2xl font-bold text-daw-text-primary">
        {value}
      </div>
      {(subtitle || trend !== undefined) && (
        <div className="text-xs text-daw-text-secondary mt-1 flex items-center gap-1">
          {trend !== undefined && (
            <span className={trendColor}>
              {trendIcon} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

interface ControlMetricBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
}

const ControlMetricBar: React.FC<ControlMetricBarProps> = ({
  label,
  value,
  max,
  color = 'bg-daw-accent-primary',
}) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-daw-text-secondary">{label}</span>
        <span className="text-daw-text-tertiary font-mono">{value.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-daw-surface-tertiary rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const TelemetryDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const data = await telemetryService.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch telemetry data');
      console.error('Error fetching telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchSummary, 10000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, fetchSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-daw-text-tertiary">Loading telemetry data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-red-500">Error: {error}</div>
        <button
          onClick={fetchSummary}
          className="px-4 py-2 bg-daw-accent-primary text-white rounded hover:bg-opacity-80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getOvershootColor = (rate: number): string => {
    if (rate < 0.1) return 'bg-green-500';
    if (rate < 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getAbandonColor = (rate: number): string => {
    if (rate < 0.05) return 'bg-green-500';
    if (rate < 0.15) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-daw-bg-primary p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-daw-text-primary">
              UI Telemetry Dashboard
            </h1>
            <p className="text-sm text-daw-text-tertiary mt-1">
              User interaction metrics and usability insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-daw-text-secondary">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh (10s)
            </label>
            <button
              onClick={fetchSummary}
              className="px-4 py-2 bg-daw-surface-secondary border border-daw-surface-tertiary rounded hover:bg-daw-surface-tertiary transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Sessions"
          value={summary.total_sessions}
          subtitle="Recorded sessions"
        />
        <MetricCard
          title="Total Interactions"
          value={summary.total_interactions}
          subtitle="Control adjustments"
        />
        <MetricCard
          title="Avg Session Duration"
          value={formatDuration(summary.avg_session_duration_ms)}
        />
        <MetricCard
          title="Time to First Sound"
          value={formatDuration(summary.avg_time_to_first_sound_ms)}
          subtitle="Average across sessions"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Controls */}
        <div className="bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4">
          <h2 className="text-lg font-semibold text-daw-text-primary mb-4">
            Most Used Controls
          </h2>
          <div className="space-y-4">
            {summary.top_controls.slice(0, 8).map((control, index) => (
              <div key={control.control_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-daw-text-tertiary w-6">
                      #{index + 1}
                    </span>
                    <span className="text-sm text-daw-text-primary font-medium">
                      {control.control_id}
                    </span>
                  </div>
                  <span className="text-xs text-daw-text-tertiary">
                    {control.total_interactions} interactions
                  </span>
                </div>
                <ControlMetricBar
                  label="Avg Duration"
                  value={control.avg_duration_ms}
                  max={5000}
                  color="bg-daw-accent-primary"
                />
                <div className="grid grid-cols-2 gap-4">
                  <ControlMetricBar
                    label="Overshoot Rate"
                    value={control.overshoot_rate}
                    max={1}
                    color={getOvershootColor(control.overshoot_rate)}
                  />
                  <ControlMetricBar
                    label="Abandon Rate"
                    value={control.abandon_rate}
                    max={1}
                    color={getAbandonColor(control.abandon_rate)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4">
          <h2 className="text-lg font-semibold text-daw-text-primary mb-4">
            Recent Sessions
          </h2>
          <div className="space-y-2">
            {summary.recent_sessions.map((session) => (
              <div
                key={session.session_id}
                className="p-3 bg-daw-surface-primary border border-daw-surface-tertiary rounded hover:border-daw-accent-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-daw-text-tertiary font-mono">
                    {session.session_id.slice(0, 8)}
                  </span>
                  <span className="text-xs text-daw-text-secondary">
                    {session.created_at
                      ? new Date(session.created_at).toLocaleString()
                      : 'Recently'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-daw-text-tertiary">Focus: </span>
                    <span className="text-daw-text-primary">{session.focus_changes}</span>
                  </div>
                  <div>
                    <span className="text-daw-text-tertiary">Switches/min: </span>
                    <span className="text-daw-text-primary">
                      {session.control_switches_per_min.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-daw-text-tertiary">Dead: </span>
                    <span className="text-daw-text-primary">{session.dead_interactions}</span>
                  </div>
                  <div>
                    <span className="text-daw-text-tertiary">First Sound: </span>
                    <span className="text-daw-text-primary">
                      {formatDuration(session.time_to_first_sound_ms)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usability Insights */}
      <div className="mt-6 bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4">
        <h2 className="text-lg font-semibold text-daw-text-primary mb-4">
          Usability Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.top_controls
            .filter(c => c.overshoot_rate > 0.2 || c.abandon_rate > 0.1)
            .map((control) => (
              <div
                key={control.control_id}
                className={cn(
                  'p-3 rounded border',
                  (control.overshoot_rate > 0.3 || control.abandon_rate > 0.2)
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                )}
              >
                <div className="text-sm font-medium text-daw-text-primary mb-2">
                  {control.control_id}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-daw-text-secondary">Overshoot:</span>
                    <span className={cn(
                      'font-mono',
                      control.overshoot_rate > 0.3 ? 'text-red-500' : 'text-yellow-500'
                    )}>
                      {(control.overshoot_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-daw-text-secondary">Abandon:</span>
                    <span className={cn(
                      'font-mono',
                      control.abandon_rate > 0.2 ? 'text-red-500' : 'text-yellow-500'
                    )}>
                      {(control.abandon_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-daw-text-secondary">Micro-adjust:</span>
                    <span className="text-daw-text-tertiary font-mono">
                      {control.micro_adjust_rate > 0.5 ? 'High' : 'Normal'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-daw-text-tertiary">
                  {control.overshoot_rate > 0.3
                    ? 'Users overshoot target frequently - consider larger control area'
                    : control.abandon_rate > 0.2
                    ? 'Users abandon adjustments often - review control behavior'
                    : 'Monitor for patterns'}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default TelemetryDashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/utils';
import { usePluginStore } from '@/stores/pluginStore';
import type { PluginInstance, PluginPerformanceMetrics } from '@/types/plugins';

export interface PluginPerformanceMonitorProps {
  pluginInstance: PluginInstance;
  className?: string;
  showDetails?: boolean;
  updateInterval?: number;
}

/**
 * Plugin Performance Monitor component with CPU and latency metrics
 */
const PluginPerformanceMonitor: React.FC<PluginPerformanceMonitorProps> = ({
  pluginInstance,
  className,
  showDetails = false,
  updateInterval = 1000,
}) => {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [historicalData, setHistoricalData] = useState<number[]>([]);
  
  const { getPluginPerformance } = usePluginStore();
  const performanceMetrics = getPluginPerformance(pluginInstance.instance_id);

  // Update historical data for sparkline
  useEffect(() => {
    if (!performanceMetrics) return;

    const interval = setInterval(() => {
      setHistoricalData(prev => {
        const newData = [...prev, performanceMetrics.avg_cpu_usage * 100];
        // Keep only last 60 data points (1 minute at 1s intervals)
        return newData.slice(-60);
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [performanceMetrics, updateInterval]);

  const getPerformanceStatus = useCallback(() => {
    if (!performanceMetrics) return 'unknown';
    
    const cpuUsage = performanceMetrics.avg_cpu_usage * 100;
    const processingTime = performanceMetrics.avg_processing_time;
    
    if (cpuUsage > 80 || processingTime > 10) return 'critical';
    if (cpuUsage > 60 || processingTime > 5) return 'warning';
    if (cpuUsage > 40 || processingTime > 2) return 'moderate';
    return 'good';
  }, [performanceMetrics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'moderate': return 'text-orange-400';
      case 'good': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'moderate': return '🟠';
      case 'good': return '🟢';
      default: return '⚪';
    }
  };

  if (!performanceMetrics) {
    return (
      <div className={cn('plugin-performance-monitor p-2 bg-daw-surface-primary rounded', className)}>
        <div className="text-xs text-daw-text-tertiary">No performance data available</div>
      </div>
    );
  }

  const status = getPerformanceStatus();

  return (
    <div className={cn('plugin-performance-monitor bg-daw-surface-primary rounded', className)}>
      {/* Compact View */}
      <div 
        className="flex items-center justify-between p-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs">{getStatusIcon(status)}</span>
          <div className="text-xs">
            <span className={cn('font-medium', getStatusColor(status))}>
              {(performanceMetrics.avg_cpu_usage * 100).toFixed(1)}%
            </span>
            <span className="text-daw-text-tertiary ml-1">CPU</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {historicalData.length > 0 && (
            <Sparkline data={historicalData} width={40} height={16} />
          )}
          <span className="text-xs text-daw-text-tertiary">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Detailed View */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-3">
          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MetricItem
              label="CPU Usage"
              value={`${(performanceMetrics.avg_cpu_usage * 100).toFixed(1)}%`}
              max={`${(performanceMetrics.max_cpu_usage * 100).toFixed(1)}%`}
              status={performanceMetrics.avg_cpu_usage > 0.8 ? 'critical' : 
                     performanceMetrics.avg_cpu_usage > 0.6 ? 'warning' : 'good'}
            />
            
            <MetricItem
              label="Memory"
              value={`${performanceMetrics.avg_memory_usage.toFixed(1)}MB`}
              max={`${performanceMetrics.max_memory_usage.toFixed(1)}MB`}
              status={performanceMetrics.avg_memory_usage > 500 ? 'warning' : 'good'}
            />
            
            <MetricItem
              label="Processing Time"
              value={`${performanceMetrics.avg_processing_time.toFixed(2)}ms`}
              max={`${performanceMetrics.max_processing_time.toFixed(2)}ms`}
              status={performanceMetrics.avg_processing_time > 10 ? 'critical' :
                     performanceMetrics.avg_processing_time > 5 ? 'warning' : 'good'}
            />
            
            <MetricItem
              label="Latency"
              value={`${pluginInstance.latency_ms.toFixed(1)}ms`}
              status={pluginInstance.latency_ms > 20 ? 'warning' : 'good'}
            />
          </div>

          {/* Performance Chart */}
          {historicalData.length > 10 && (
            <div className="space-y-1">
              <div className="text-xs text-daw-text-secondary">CPU Usage History</div>
              <div className="bg-daw-surface-secondary rounded p-2">
                <Sparkline 
                  data={historicalData} 
                  width={200} 
                  height={40}
                  showGrid={true}
                  color={status === 'critical' ? '#ef4444' : 
                        status === 'warning' ? '#f59e0b' : '#10b981'}
                />
              </div>
            </div>
          )}

          {/* Performance Statistics */}
          <div className="text-xs text-daw-text-tertiary space-y-1">
            <div>Samples: {performanceMetrics.sample_count}</div>
            <div>Duration: {performanceMetrics.collection_duration_minutes.toFixed(1)} min</div>
            <div>Last Updated: {new Date(performanceMetrics.last_updated).toLocaleTimeString()}</div>
          </div>

          {/* Performance Recommendations */}
          {status === 'critical' || status === 'warning' && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-2">
              <div className="text-xs font-medium text-yellow-400 mb-1">Performance Tips</div>
              <div className="text-xs text-yellow-300 space-y-1">
                {performanceMetrics.avg_cpu_usage > 0.8 && (
                  <div>• Consider increasing audio buffer size</div>
                )}
                {performanceMetrics.avg_processing_time > 10 && (
                  <div>• Plugin may be overloading the audio thread</div>
                )}
                {performanceMetrics.avg_memory_usage > 500 && (
                  <div>• High memory usage detected</div>
                )}
                <div>• Try bypassing temporarily to test impact</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MetricItemProps {
  label: string;
  value: string;
  max?: string;
  status: 'good' | 'warning' | 'critical';
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, max, status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-daw-text-primary';
    }
  };

  return (
    <div className="space-y-1">
      <div className="text-daw-text-secondary">{label}</div>
      <div className={cn('font-medium', getStatusColor(status))}>
        {value}
        {max && (
          <span className="text-daw-text-tertiary ml-1 font-normal">
            (max: {max})
          </span>
        )}
      </div>
    </div>
  );
};

interface SparklineProps {
  data: number[];
  width: number;
  height: number;
  color?: string;
  showGrid?: boolean;
}

const Sparkline: React.FC<SparklineProps> = ({ 
  data, 
  width, 
  height, 
  color = '#10b981',
  showGrid = false 
}) => {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Generate SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="sparkline">
      {showGrid && (
        <g className="grid" stroke="#374151" strokeWidth="0.5" opacity="0.3">
          {/* Horizontal grid lines */}
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} />
        </g>
      )}
      
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Fill area under curve */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={color}
        opacity="0.1"
      />
    </svg>
  );
};

export default PluginPerformanceMonitor;
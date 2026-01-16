/**
 * Performance Dashboard Component
 * Real-time performance monitoring and optimization dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import performanceService, {
  SystemStatus,
  CacheStatistics
} from '../../services/performanceService';

interface PerformanceDashboardProps {
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ className = '' }) => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStatistics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch performance data
  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const status = await performanceService.getPerformanceStatus();
      setSystemStatus(status.monitoring?.system_status || null);
      setCacheStats(status.cache || null);
      setIsMonitoring(status.monitoring?.is_monitoring || false);
      setLastUpdate(new Date());

    } catch (err) {
      console.error('Failed to fetch performance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle monitoring
  const toggleMonitoring = useCallback(async () => {
    try {
      if (isMonitoring) {
        await performanceService.stopMonitoring();
        setIsMonitoring(false);
      } else {
        await performanceService.startMonitoring(1.0);
        setIsMonitoring(true);
      }
    } catch (err) {
      console.error('Failed to toggle monitoring:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle monitoring');
    }
  }, [isMonitoring]);

  // Auto-refresh
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(fetchPerformanceData, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, [isMonitoring, fetchPerformanceData]);

  // Initial load
  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Get status color
  const getStatusColor = (percentage: number): string => {
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`performance-dashboard p-6 bg-white rounded-lg shadow ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={toggleMonitoring}
            className={`px-4 py-2 rounded text-white font-medium ${
              isMonitoring
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button
            onClick={fetchPerformanceData}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* CPU Usage */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600 mb-2">CPU Usage</h3>
            <div className={`text-2xl font-bold ${getStatusColor(systemStatus.cpu_percent)}`}>
              {formatPercentage(systemStatus.cpu_percent)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {systemStatus.active_threads} active threads
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Memory Usage</h3>
            <div className={`text-2xl font-bold ${getStatusColor(systemStatus.memory_percent)}`}>
              {formatPercentage(systemStatus.memory_percent)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatBytes(systemStatus.memory_used_mb * 1024 * 1024)} used
            </div>
          </div>

          {/* Disk Usage */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Disk Usage</h3>
            <div className={`text-2xl font-bold ${getStatusColor(systemStatus.disk_usage_percent)}`}>
              {formatPercentage(systemStatus.disk_usage_percent)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Storage utilization
            </div>
          </div>

          {/* Active Operations */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Active Operations</h3>
            <div className="text-2xl font-bold text-blue-600">
              {systemStatus.active_operations}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {systemStatus.recent_alerts} recent alerts
            </div>
          </div>
        </div>
      )}

      {/* Cache Statistics */}
      {!loading && cacheStats && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Cache Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Memory Cache */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Memory Cache</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Size:</span>
                  <span className="text-sm font-medium">
                    {cacheStats.memory.size} / {cacheStats.memory.max_size}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Hit Rate:</span>
                  <span className={`text-sm font-medium ${getStatusColor(cacheStats.memory.hit_rate_percent)}`}>
                    {formatPercentage(cacheStats.memory.hit_rate_percent)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Memory:</span>
                  <span className="text-sm font-medium">
                    {formatBytes(cacheStats.memory.memory_usage_mb * 1024 * 1024)}
                  </span>
                </div>
              </div>
            </div>

            {/* Disk Cache */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Disk Cache</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Size:</span>
                  <span className="text-sm font-medium">{cacheStats.disk.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Hit Rate:</span>
                  <span className={`text-sm font-medium ${getStatusColor(cacheStats.disk.hit_rate_percent)}`}>
                    {formatPercentage(cacheStats.disk.hit_rate_percent)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Disk Usage:</span>
                  <span className="text-sm font-medium">
                    {formatBytes(cacheStats.disk.disk_usage_mb * 1024 * 1024)}
                  </span>
                </div>
              </div>
            </div>

            {/* Combined Stats */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Combined</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Hits:</span>
                  <span className="text-sm font-medium text-green-600">
                    {cacheStats.combined.total_hits}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Misses:</span>
                  <span className="text-sm font-medium text-red-600">
                    {cacheStats.combined.total_misses}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Size:</span>
                  <span className="text-sm font-medium">
                    {cacheStats.combined.total_size}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm text-gray-600">
              {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Performance Optimization System v1.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
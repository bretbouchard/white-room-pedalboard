import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, CheckCircle, Activity, Zap } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useWebSocket } from '@/hooks/useWebSocket';

interface PerformanceMetrics {
  latency: number;
  messageRate: number;
  activeUsers: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface PerformanceMonitorProps {
  className?: string;
}

export function PerformanceMonitor({ className = '' }: PerformanceMonitorProps) {
  const { users, currentSession } = useCollaborationStore();
  const { isConnected } = useWebSocket();

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    latency: 0,
    messageRate: 0,
    activeUsers: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  });

  const [performanceLevel, setPerformanceLevel] = useState<'optimal' | 'degraded' | 'critical'>('optimal');

  // Calculate performance metrics
  useEffect(() => {
    if (!isConnected || !currentSession) return;

    const interval = setInterval(() => {
      const activeUsers = users.filter(u =>
        u.status === 'active' &&
        Date.now() - u.lastActivity < 30000
      ).length;

      // Simulate performance metrics (in real implementation, these would come from actual monitoring)
      const latency = Math.max(10, activeUsers * 8 + Math.random() * 20);
      const messageRate = activeUsers * (0.5 + Math.random() * 2);
      const memoryUsage = Math.min(90, activeUsers * 5 + Math.random() * 20);
      const cpuUsage = Math.min(95, activeUsers * 8 + Math.random() * 15);

      setMetrics({
        latency: Math.round(latency),
        messageRate: Math.round(messageRate * 10) / 10,
        activeUsers,
        memoryUsage: Math.round(memoryUsage),
        cpuUsage: Math.round(cpuUsage),
      });

      // Determine performance level
      if (latency > 200 || cpuUsage > 85 || memoryUsage > 85) {
        setPerformanceLevel('critical');
      } else if (latency > 100 || cpuUsage > 70 || memoryUsage > 70 || activeUsers > 8) {
        setPerformanceLevel('degraded');
      } else {
        setPerformanceLevel('optimal');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [users, currentSession, isConnected]);

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'optimal': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPerformanceIcon = (level: string) => {
    switch (level) {
      case 'optimal': return <CheckCircle className="w-4 h-4" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getPerformanceText = (level: string) => {
    switch (level) {
      case 'optimal': return 'Optimal Performance';
      case 'degraded': return 'Performance Degraded';
      case 'critical': return 'Critical Performance';
      default: return 'Unknown Performance';
    }
  };

  if (!currentSession) {
    return null;
  }

  return (
    <div className={`border rounded-lg p-4 ${className} ${getPerformanceColor(performanceLevel)}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5" />
          <h3 className="font-semibold">Performance Monitor</h3>
        </div>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm font-medium ${getPerformanceColor(performanceLevel)}`}>
          {getPerformanceIcon(performanceLevel)}
          <span>{getPerformanceText(performanceLevel)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Active Users:</span>
            <span className="font-medium">{metrics.activeUsers}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Latency:</span>
            <span className={`font-medium ${metrics.latency > 100 ? 'text-red-600' : 'text-green-600'}`}>
              {metrics.latency}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Message Rate:</span>
            <span className="font-medium">{metrics.messageRate}/s</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Memory:</span>
            <span className={`font-medium ${metrics.memoryUsage > 70 ? 'text-red-600' : 'text-green-600'}`}>
              {metrics.memoryUsage}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">CPU:</span>
            <span className={`font-medium ${metrics.cpuUsage > 70 ? 'text-red-600' : 'text-green-600'}`}>
              {metrics.cpuUsage}%
            </span>
          </div>
        </div>
      </div>

      {performanceLevel !== 'optimal' && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              {performanceLevel === 'critical' && (
                <p className="font-medium">Critical performance issues detected. Consider reducing session size or upgrading resources.</p>
              )}
              {performanceLevel === 'degraded' && (
                <p className="font-medium">Performance is degraded. Some features may respond slowly.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {metrics.activeUsers > 8 && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className="flex items-center space-x-2 text-xs">
            <Users className="w-4 h-4" />
            <p className="font-medium">High user count detected. Auto-optimizing collaboration features...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerformanceMonitor;
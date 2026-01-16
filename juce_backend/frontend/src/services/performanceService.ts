/**
 * Performance Service
 * Frontend service for performance optimization and monitoring
 */

import { useAudioStore } from '../stores/audioStore';

export interface PerformanceMetrics {
  timestamp: number;
  operation_type: string;
  duration_ms: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  success: boolean;
  error_message?: string;
}

export interface SystemStatus {
  timestamp: number;
  cpu_percent: number;
  memory_percent: number;
  memory_used_mb: number;
  disk_usage_percent: number;
  active_threads: number;
  active_operations: number;
  recent_alerts: number;
}

export interface CacheStatistics {
  memory: {
    size: number;
    max_size: number;
    hit_rate_percent: number;
    memory_usage_mb: number;
  };
  disk: {
    size: number;
    hit_rate_percent: number;
    disk_usage_mb: number;
  };
  combined: {
    total_hits: number;
    total_misses: number;
    total_size: number;
  };
}

export interface WorkflowOptimizationRequest {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: any;
  }>;
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
  };
  edges?: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
  }>;
}

export interface WorkflowOptimizationResult {
  success: boolean;
  optimized_nodes: any[];
  optimized_edges: any[];
  render_plan: {
    high_detail: string[];
    medium_detail: string[];
    low_detail: string[];
    cached: Array<{
      node_id: string;
      cached_content: any;
      level_of_detail: string;
    }>;
  };
  recommendations: string[];
  performance_stats: any;
  optimization_time_ms: number;
  error?: string;
}

export interface BenchmarkResult {
  iterations: number;
  workflow_stats: {
    total_nodes: number;
    total_edges: number;
  };
  optimization_performance: {
    avg_time_ms: number;
    min_time_ms: number;
    max_time_ms: number;
    std_time_ms: number;
  };
  rendering_performance: {
    avg_visible_nodes: number;
    avg_culled_nodes: number;
  };
  detailed_results: Array<{
    iteration: number;
    optimization_time_ms: number;
    visible_nodes: number;
    culled_nodes: number;
  }>;
}

class PerformanceService {
  private baseUrl = '/api/performance';

  /**
   * Optimize a React Flow workflow for performance
   */
  async optimizeWorkflow(workflowData: WorkflowOptimizationRequest): Promise<WorkflowOptimizationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/optimize-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        throw new Error(`Performance optimization failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Workflow optimization error:', error);
      throw error;
    }
  }

  /**
   * Get performance dashboard data
   */
  async getPerformanceDashboard(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard`);

      if (!response.ok) {
        throw new Error(`Failed to get performance dashboard: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get performance dashboard error:', error);
      throw error;
    }
  }

  /**
   * Benchmark workflow performance
   */
  async benchmarkWorkflow(workflowData: WorkflowOptimizationRequest, iterations = 5): Promise<BenchmarkResult> {
    try {
      const response = await fetch(`${this.baseUrl}/benchmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...workflowData,
          iterations,
        }),
      });

      if (!response.ok) {
        throw new Error(`Workflow benchmarking failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Workflow benchmarking error:', error);
      throw error;
    }
  }

  /**
   * Cache workflow data for faster access
   */
  async cacheWorkflow(workflowId: string, workflowData: WorkflowOptimizationRequest, ttlSeconds?: number): Promise<{ success: boolean; workflow_id: string }> {
    try {
      const requestBody: any = {
        workflow_data: workflowData,
      };

      if (ttlSeconds !== undefined) {
        requestBody.ttl_seconds = ttlSeconds;
      }

      const response = await fetch(`${this.baseUrl}/cache-workflow/${workflowId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to cache workflow: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cache workflow error:', error);
      throw error;
    }
  }

  /**
   * Get cached workflow data
   */
  async getCachedWorkflow(workflowId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/cached-workflow/${workflowId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get cached workflow: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get cached workflow error:', error);
      throw error;
    }
  }

  /**
   * Get performance system status
   */
  async getPerformanceStatus(): Promise<{
    status: string;
    timestamp: number;
    monitoring: any;
    cache: CacheStatistics;
    profiler: any;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);

      if (!response.ok) {
        throw new Error(`Failed to get performance status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get performance status error:', error);
      throw error;
    }
  }

  /**
   * Start performance monitoring
   */
  async startMonitoring(intervalSeconds = 1.0): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/monitoring/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interval_seconds: intervalSeconds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start monitoring: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Start monitoring error:', error);
      throw error;
    }
  }

  /**
   * Stop performance monitoring
   */
  async stopMonitoring(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/monitoring/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to stop monitoring: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Stop monitoring error:', error);
      throw error;
    }
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(timeWindowSeconds = 3600, operationType?: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        time_window_seconds: timeWindowSeconds.toString(),
      });

      if (operationType) {
        params.append('operation_type', operationType);
      }

      const response = await fetch(`${this.baseUrl}/monitoring/stats?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to get monitoring stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get monitoring stats error:', error);
      throw error;
    }
  }

  /**
   * Auto-optimize React Flow instance
   */
  async optimizeReactFlowInstance(nodes: any[], edges: any[], viewport: any): Promise<WorkflowOptimizationResult> {
    const workflowData: WorkflowOptimizationRequest = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type || 'default',
        position: node.position,
        data: node.data,
      })),
      viewport: {
        x: viewport.x || 0,
        y: viewport.y || 0,
        width: viewport.width || window.innerWidth,
        height: viewport.height || window.innerHeight,
        zoom: viewport.zoom || 1,
      },
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type || 'default',
      })),
    };

    return this.optimizeWorkflow(workflowData);
  }

  /**
   * Performance-aware workflow loading
   */
  async loadWorkflowWithPerformance(workflowId: string): Promise<any> {
    try {
      // Try to get from cache first
      const cachedWorkflow = await this.getCachedWorkflow(workflowId);
      if (cachedWorkflow) {
        console.log(`Loaded workflow ${workflowId} from cache`);
        return {
          ...cachedWorkflow,
          source: 'cache',
        };
      }

      throw new Error(`Workflow ${workflowId} not found`);
    } catch (error) {
      console.error('Load workflow with performance error:', error);
      throw error;
    }
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations(workflowData: WorkflowOptimizationRequest): string[] {
    const recommendations: string[] = [];
    const nodeCount = workflowData.nodes.length;
    const edgeCount = workflowData.edges?.length || 0;

    // Node count recommendations
    if (nodeCount > 5000) {
      recommendations.push("Consider using virtual scrolling for workflows with >5000 nodes");
    } else if (nodeCount > 1000) {
      recommendations.push("Enable aggressive level-of-detail rendering for large node counts");
    }

    // Edge count recommendations
    if (edgeCount > 10000) {
      recommendations.push("Consider edge bundling or simplification for complex connections");
    }

    // Zoom level recommendations
    if (workflowData.viewport.zoom < 0.3) {
      recommendations.push("Current zoom level is very low - consider hiding node details for better performance");
    }

    return recommendations;
  }

  /**
   * Monitor performance in real-time
   */
  async startRealTimeMonitoring(callback: (data: any) => void, intervalMs = 5000): Promise<() => void> {
    let intervalId: NodeJS.Timeout;

    const poll = async () => {
      try {
        const status = await this.getPerformanceStatus();
        callback(status);
      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    };

    // Initial poll
    await poll();

    // Set up interval
    intervalId = setInterval(poll, intervalMs);

    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }
}

export const performanceService = new PerformanceService();
export default performanceService;
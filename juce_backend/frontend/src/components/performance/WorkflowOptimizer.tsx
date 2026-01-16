/**
 * Workflow Optimizer Component
 * Optimizes React Flow workflows for better performance
 */

import React, { useState, useCallback, useEffect } from 'react';
import performanceService, {
  WorkflowOptimizationRequest,
  WorkflowOptimizationResult,
  BenchmarkResult
} from '../../services/performanceService';

interface WorkflowOptimizerProps {
  nodes: any[];
  edges: any[];
  viewport: any;
  onOptimizationComplete?: (result: WorkflowOptimizationResult) => void;
  className?: string;
}

export const WorkflowOptimizer: React.FC<WorkflowOptimizerProps> = ({
  nodes,
  edges,
  viewport,
  onOptimizationComplete,
  className = ''
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [lastResult, setLastResult] = useState<WorkflowOptimizationResult | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoOptimize, setAutoOptimize] = useState(false);

  // Auto-optimize when workflow changes significantly
  useEffect(() => {
    if (!autoOptimize || nodes.length < 100) return; // Only auto-optimize for larger workflows

    const timer = setTimeout(() => {
      optimizeWorkflow();
    }, 1000); // Debounce optimization

    return () => clearTimeout(timer);
  }, [nodes.length, autoOptimize]);

  // Optimize workflow
  const optimizeWorkflow = useCallback(async () => {
    if (nodes.length === 0) return;

    try {
      setIsOptimizing(true);
      setError(null);

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

      const result = await performanceService.optimizeWorkflow(workflowData);
      setLastResult(result);

      if (onOptimizationComplete) {
        onOptimizationComplete(result);
      }

    } catch (err) {
      console.error('Workflow optimization failed:', err);
      setError(err instanceof Error ? err.message : 'Workflow optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  }, [nodes, edges, viewport, onOptimizationComplete]);

  // Benchmark workflow
  const benchmarkWorkflow = useCallback(async (iterations = 5) => {
    if (nodes.length === 0) return;

    try {
      setIsBenchmarking(true);
      setError(null);

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

      const result = await performanceService.benchmarkWorkflow(workflowData, iterations);
      setBenchmarkResult(result);

    } catch (err) {
      console.error('Workflow benchmarking failed:', err);
      setError(err instanceof Error ? err.message : 'Workflow benchmarking failed');
    } finally {
      setIsBenchmarking(false);
    }
  }, [nodes, edges, viewport]);

  // Format time
  const formatTime = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  
  return (
    <div className={`workflow-optimizer p-4 bg-white rounded-lg shadow ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Performance Optimizer</h3>
        <div className="flex items-center space-x-2">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={autoOptimize}
              onChange={(e) => setAutoOptimize(e.target.checked)}
              className="mr-2"
            />
            Auto-optimize
          </label>
        </div>
      </div>

      {/* Workflow Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Nodes</div>
          <div className="font-semibold">{nodes.length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Edges</div>
          <div className="font-semibold">{edges.length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Zoom</div>
          <div className="font-semibold">{(viewport.zoom || 1).toFixed(2)}x</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Complexity</div>
          <div className={`font-semibold ${
            nodes.length > 5000 ? 'text-red-600' :
            nodes.length > 1000 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {nodes.length > 5000 ? 'High' : nodes.length > 1000 ? 'Medium' : 'Low'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={optimizeWorkflow}
          disabled={isOptimizing || nodes.length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isOptimizing ? 'Optimizing...' : 'Optimize Now'}
        </button>
        <button
          onClick={() => benchmarkWorkflow(5)}
          disabled={isBenchmarking || nodes.length === 0}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {isBenchmarking ? 'Benchmarking...' : 'Benchmark (5x)'}
        </button>
        <button
          onClick={() => benchmarkWorkflow(10)}
          disabled={isBenchmarking || nodes.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {isBenchmarking ? 'Benchmarking...' : 'Benchmark (10x)'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Optimization Results */}
      {lastResult && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
          <h4 className="font-semibold text-green-800 mb-2">Optimization Results</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Optimization Time:</span>
              <span className="ml-2 font-medium">{formatTime(lastResult.optimization_time_ms)}</span>
            </div>
            <div>
              <span className="text-gray-600">Visible Nodes:</span>
              <span className="ml-2 font-medium">
                {lastResult.render_plan.high_detail.length +
                 lastResult.render_plan.medium_detail.length +
                 lastResult.render_plan.low_detail.length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Culled Nodes:</span>
              <span className="ml-2 font-medium">{lastResult.performance_stats?.rendering?.culled_nodes || 0}</span>
            </div>
          </div>

          {lastResult.recommendations.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium text-green-800 mb-1">Recommendations:</h5>
              <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                {lastResult.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Benchmark Results */}
      {benchmarkResult && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded">
          <h4 className="font-semibold text-purple-800 mb-2">Benchmark Results</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-purple-700 mb-2">Performance</h5>
              <div className="space-y-1">
                <div>
                  <span className="text-gray-600">Avg Time:</span>
                  <span className="ml-2 font-medium">{formatTime(benchmarkResult.optimization_performance.avg_time_ms)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Min Time:</span>
                  <span className="ml-2 font-medium">{formatTime(benchmarkResult.optimization_performance.min_time_ms)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Max Time:</span>
                  <span className="ml-2 font-medium">{formatTime(benchmarkResult.optimization_performance.max_time_ms)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Std Dev:</span>
                  <span className="ml-2 font-medium">{formatTime(benchmarkResult.optimization_performance.std_time_ms)}</span>
                </div>
              </div>
            </div>
            <div>
              <h5 className="font-medium text-purple-700 mb-2">Rendering</h5>
              <div className="space-y-1">
                <div>
                  <span className="text-gray-600">Avg Visible:</span>
                  <span className="ml-2 font-medium">{benchmarkResult.rendering_performance.avg_visible_nodes.toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Culled:</span>
                  <span className="ml-2 font-medium">{benchmarkResult.rendering_performance.avg_culled_nodes.toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Iterations:</span>
                  <span className="ml-2 font-medium">{benchmarkResult.iterations}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tips */}
      <div className="text-xs text-gray-500 border-t pt-3">
        <div className="font-medium mb-1">Performance Tips:</div>
        <ul className="space-y-1">
          <li>• Enable auto-optimization for workflows with 100+ nodes</li>
          <li>• Use virtual scrolling for workflows with 5000+ nodes</li>
          <li>• Consider simplifying complex connections for better performance</li>
          <li>• Cache frequently accessed workflows to reduce load times</li>
        </ul>
      </div>
    </div>
  );
};

export default WorkflowOptimizer;
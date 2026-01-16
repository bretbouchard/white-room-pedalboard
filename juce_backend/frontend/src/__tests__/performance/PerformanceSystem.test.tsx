/**
 * Performance System Tests
 * Comprehensive tests for performance optimization components
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PerformanceDashboard from '../../../components/performance/PerformanceDashboard';
import WorkflowOptimizer from '../../../components/performance/WorkflowOptimizer';
import PerformanceTester from '../../../components/performance/PerformanceTester';
import performanceService from '../../../services/performanceService';
import { useAudioStore } from '../../../stores/audioStore';
import {
  calculateNodeComplexity,
  determineOptimizationStrategy,
  applyLevelOfDetail,
  simplifyEdges,
  clusterNodes,
  PERFORMANCE_THRESHOLDS,
  NodeComplexity,
} from '../../../utils/reactFlowOptimization';

// Mock fetch API
global.fetch = jest.fn();

// Mock performance API
const mockPerformanceApi = {
  status: {
    status: 'healthy',
    timestamp: Date.now(),
    monitoring: {
      is_monitoring: true,
      active_operations: 5,
      system_status: {
        cpu_percent: 45.2,
        memory_percent: 62.8,
        memory_used_mb: 512.3,
        disk_usage_percent: 35.1,
        active_threads: 12,
        recent_alerts: 2,
      },
    },
    cache: {
      memory: {
        size: 150,
        max_size: 1000,
        hit_rate_percent: 78.5,
        memory_usage_mb: 45.2,
      },
      disk: {
        size: 250,
        hit_rate_percent: 82.1,
        disk_usage_mb: 125.7,
      },
      combined: {
        total_hits: 3420,
        total_misses: 980,
        total_size: 400,
      },
    },
    profiler: {
      is_profiling: true,
      active_profiles: 2,
      profiled_functions: 15,
      profiler_stats: {
        total_profiles: 45,
        active_profiles: 2,
      },
    },
  },

  optimizeWorkflow: {
    success: true,
    optimized_nodes: [],
    optimized_edges: [],
    render_plan: {
      high_detail: ['node_1', 'node_2'],
      medium_detail: ['node_3', 'node_4'],
      low_detail: ['node_5'],
      cached: [],
    },
    recommendations: [
      'Consider using virtual scrolling for workflows with >5000 nodes',
      'Enable aggressive level-of-detail rendering for large node counts',
    ],
    performance_stats: {
      rendering: {
        total_nodes: 1000,
        visible_nodes: 150,
        culled_nodes: 850,
      },
    },
    optimization_time_ms: 45.3,
  },

  benchmark: {
    iterations: 5,
    workflow_stats: {
      total_nodes: 1000,
      total_edges: 2000,
    },
    optimization_performance: {
      avg_time_ms: 42.5,
      min_time_ms: 38.2,
      max_time_ms: 48.7,
      std_time_ms: 3.8,
    },
    rendering_performance: {
      avg_visible_nodes: 125,
      avg_culled_nodes: 875,
    },
    detailed_results: [],
  },

  dashboard: {
    timestamp: Date.now(),
    system_status: mockPerformanceApi.status.monitoring.system_status,
    performance_report: {
      time_window_seconds: 3600,
      total_operations: 150,
      overall_success_rate_percent: 98.5,
      overall_avg_duration_ms: 25.4,
    },
    cache_statistics: mockPerformanceApi.status.cache,
    profiler_report: {
      profiled_functions: 15,
      total_time_seconds: 120.5,
    },
    service_status: {
      initialized: true,
      monitoring_active: true,
      profiling_active: true,
    },
  },
};

// Helper to create mock nodes
const createMockNodes = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `node_${i}`,
    type: 'default',
    position: { x: i * 100, y: Math.floor(i / 10) * 100 },
    data: {
      label: `Node ${i}`,
      width: 200,
      height: 100,
      audioData: new Array(1000).fill(i).map(j => j * 0.1),
      spectrumData: new Array(256).fill(i).map(j => Math.sin(j * 0.1)),
    },
  }));
};

// Helper to create mock edges
const createMockEdges = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `edge_${i}`,
    source: `node_${i}`,
    target: `node_${(i + 1) % Math.max(1, count - 1)}`,
    type: i % 3 === 0 ? 'smoothstep' : 'default',
  }));
};

describe('Performance System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default fetch mocks
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPerformanceApi.status),
        });
      }
      if (url.includes('/optimize-workflow')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPerformanceApi.optimizeWorkflow),
        });
      }
      if (url.includes('/benchmark')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPerformanceApi.benchmark),
        });
      }
      if (url.includes('/dashboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPerformanceApi.dashboard),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  describe('PerformanceDashboard', () => {
    test('renders performance dashboard with system status', async () => {
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
      });

      // Check for system status metrics
      await waitFor(() => {
        expect(screen.getByText('CPU Usage')).toBeInTheDocument();
        expect(screen.getByText('Memory Usage')).toBeInTheDocument();
        expect(screen.getByText('Disk Usage')).toBeInTheDocument();
        expect(screen.getByText('Active Operations')).toBeInTheDocument();
      });
    });

    test('displays cache statistics', async () => {
      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Cache Performance')).toBeInTheDocument();
        expect(screen.getByText('Memory Cache')).toBeInTheDocument();
        expect(screen.getByText('Disk Cache')).toBeInTheDocument();
      });
    });

    test('allows starting and stopping monitoring', async () => {
      render(<PerformanceDashboard />);

      const monitorButton = screen.getByText('Start Monitoring');
      fireEvent.click(monitorButton);

      await waitFor(() => {
        expect(screen.getByText('Stop Monitoring')).toBeInTheDocument();
      });
    });

    test('handles errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<PerformanceDashboard />);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to fetch performance data/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('WorkflowOptimizer', () => {
    const mockNodes = createMockNodes(100);
    const mockEdges = createMockEdges(150);
    const mockViewport = {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      zoom: 1.0,
    };

    test('renders workflow optimizer with stats', () => {
      render(
        <WorkflowOptimizer
          nodes={mockNodes}
          edges={mockEdges}
          viewport={mockViewport}
        />
      );

      expect(screen.getByText('Performance Optimizer')).toBeInTheDocument();
      expect(screen.getByText('Nodes')).toBeInTheDocument();
      expect(screen.getByText('Edges')).toBeInTheDocument();
      expect(screen.getByText('Zoom')).toBeInTheDocument();
    });

    test('optimizes workflow when button clicked', async () => {
      const onOptimizationComplete = jest.fn();

      render(
        <WorkflowOptimizer
          nodes={mockNodes}
          edges={mockEdges}
          viewport={mockViewport}
          onOptimizationComplete={onOptimizationComplete}
        />
      );

      const optimizeButton = screen.getByText('Optimize Now');
      fireEvent.click(optimizeButton);

      await waitFor(() => {
        expect(onOptimizationComplete).toHaveBeenCalledWith(
          mockPerformanceApi.optimizeWorkflow
        );
      });
    });

    test('runs benchmark successfully', async () => {
      render(
        <WorkflowOptimizer
          nodes={mockNodes}
          edges={mockEdges}
          viewport={mockViewport}
        />
      );

      const benchmarkButton = screen.getByText('Benchmark (5x)');
      fireEvent.click(benchmarkButton);

      await waitFor(() => {
        expect(screen.getByText('Benchmark Results')).toBeInTheDocument();
        expect(screen.getByText('Performance')).toBeInTheDocument();
        expect(screen.getByText('Rendering')).toBeInTheDocument();
      });
    });

    test('toggles auto-optimization', () => {
      render(
        <WorkflowOptimizer
          nodes={mockNodes}
          edges={mockEdges}
          viewport={mockViewport}
        />
      );

      const autoOptimizeCheckbox = screen.getByLabelText('Auto-optimize');
      expect(autoOptimizeCheckbox).not.toBeChecked();

      fireEvent.click(autoOptimizeCheckbox);
      expect(autoOptimizeCheckbox).toBeChecked();
    });
  });

  describe('PerformanceTester', () => {
    test('renders performance tester with configuration', () => {
      render(<PerformanceTester />);

      expect(screen.getByText('Performance Tester')).toBeInTheDocument();
      expect(screen.getByText('Test Configuration')).toBeInTheDocument();
      expect(screen.getByText('Nodes')).toBeInTheDocument();
      expect(screen.getByText('Edges')).toBeInTheDocument();
    });

    test('updates test configuration', () => {
      render(<PerformanceTester />);

      const nodesInput = screen.getByDisplayValue('1000');
      fireEvent.change(nodesInput, { target: { value: '2000' } });

      expect(nodesInput).toHaveValue(2000);
    });

    test('shows performance guidelines', () => {
      render(<PerformanceTester />);

      expect(screen.getByText('Performance Guidelines')).toBeInTheDocument();
      expect(
        screen.getByText('Good Performance Indicators')
      ).toBeInTheDocument();
      expect(screen.getByText('Performance Issues')).toBeInTheDocument();
    });
  });

  describe('React Flow Optimization Utilities', () => {
    describe('calculateNodeComplexity', () => {
      test('calculates simple node complexity', () => {
        const simpleNode = {
          id: 'simple',
          type: 'default',
          position: { x: 0, y: 0 },
          data: { label: 'Simple Node' },
        };

        const complexity = calculateNodeComplexity(simpleNode);
        expect(complexity).toBe(NodeComplexity.SIMPLE);
      });

      test('calculates complex node complexity', () => {
        const complexNode = {
          id: 'complex',
          type: 'default',
          position: { x: 0, y: 0 },
          data: {
            label: 'Complex Node',
            audioData: new Array(5000).fill(0),
            spectrumData: new Array(512).fill(0),
            metadata: new Array(100).fill(0),
          },
        };

        const complexity = calculateNodeComplexity(complexNode);
        expect([
          NodeComplexity.MEDIUM,
          NodeComplexity.COMPLEX,
          NodeComplexity.HEAVY,
        ]).toContain(complexity);
      });

      test('handles heavy node complexity', () => {
        const heavyNode = {
          id: 'heavy',
          type: 'default',
          position: { x: 0, y: 0 },
          data: {
            label: 'Heavy Node',
            audioData: new Array(20000).fill(0),
            spectrumData: new Array(2048).fill(0),
            metadata: new Array(1000).fill(0),
            complexObject: new Array(100).fill(0).map(() => ({
              nested: new Array(100).fill(0),
            })),
          },
        };

        const complexity = calculateNodeComplexity(heavyNode);
        expect(complexity).toBe(NodeComplexity.HEAVY);
      });
    });

    describe('determineOptimizationStrategy', () => {
      test('returns minimal strategy for small workflows', () => {
        const strategy = determineOptimizationStrategy(50, 100);

        expect(strategy.virtualScrolling).toBe(false);
        expect(strategy.levelOfDetail).toBe(false);
        expect(strategy.edgeSimplification).toBe(false);
        expect(strategy.nodeClustering).toBe(false);
        expect(strategy.lazyRendering).toBe(false);
      });

      test('returns moderate strategy for medium workflows', () => {
        const strategy = determineOptimizationStrategy(800, 1200);

        expect(strategy.levelOfDetail).toBe(true);
        expect(strategy.lazyRendering).toBe(true);
      });

      test('returns aggressive strategy for large workflows', () => {
        const strategy = determineOptimizationStrategy(5000, 10000);

        expect(strategy.virtualScrolling).toBe(true);
        expect(strategy.levelOfDetail).toBe(true);
        expect(strategy.edgeSimplification).toBe(true);
        expect(strategy.nodeClustering).toBe(true);
        expect(strategy.lazyRendering).toBe(true);
      });

      test('adjusts strategy based on performance metrics', () => {
        const poorPerformance = {
          fps: 25,
          memoryUsage: 600,
          renderTime: 50,
          visibleNodes: 100,
          totalNodes: 1000,
          optimizationLevel: 'moderate',
        };

        const strategy = determineOptimizationStrategy(
          1000,
          2000,
          poorPerformance
        );

        expect(strategy.virtualScrolling).toBe(true);
        expect(strategy.levelOfDetail).toBe(true);
        expect(strategy.edgeSimplification).toBe(true);
      });
    });

    describe('applyLevelOfDetail', () => {
      test('applies high detail for high zoom', () => {
        const nodes = createMockNodes(10);
        const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.5 };

        const result = applyLevelOfDetail(nodes, viewport, 100);

        expect(result).toHaveLength(10);
        expect(result[0].data).toHaveProperty('label');
      });

      test('applies medium detail for medium zoom', () => {
        const nodes = createMockNodes(10);
        const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 0.5 };

        const result = applyLevelOfDetail(nodes, viewport, 100);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].data).toHaveProperty('audioData');
        expect(result[0].data.audioData).toHaveProperty('_preview');
      });

      test('applies low detail for low zoom', () => {
        const nodes = createMockNodes(10);
        const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 0.1 };

        const result = applyLevelOfDetail(nodes, viewport, 100);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].data).toHaveProperty('_lod');
      });

      test('limits visible nodes', () => {
        const nodes = createMockNodes(100);
        const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.0 };

        const result = applyLevelOfDetail(nodes, viewport, 10);

        expect(result.length).toBeLessThanOrEqual(10);
      });
    });

    describe('simplifyEdges', () => {
      test('keeps edges within limit', () => {
        const edges = createMockEdges(100);
        const visibleNodes = new Set(['node_0', 'node_1', 'node_2']);

        const result = simplifyEdges(edges, visibleNodes, 50);

        expect(result.length).toBeLessThanOrEqual(50);
      });

      test('filters edges by visible nodes', () => {
        const edges = createMockEdges(10);
        const visibleNodes = new Set(['node_0', 'node_1']);

        const result = simplifyEdges(edges, visibleNodes, 100);

        expect(
          result.every(
            edge =>
              visibleNodes.has(edge.source) && visibleNodes.has(edge.target)
          )
        ).toBe(true);
      });

      test('simplifies edge types', () => {
        const edges = createMockEdges(3000); // Over limit
        const visibleNodes = new Set(['node_0', 'node_1']);

        const result = simplifyEdges(edges, visibleNodes, 100);

        expect(
          result.every(edge => edge.type === 'default' && !edge.animated)
        ).toBe(true);
      });
    });

    describe('clusterNodes', () => {
      test('returns original nodes for small sets', () => {
        const nodes = createMockNodes(10);

        const result = clusterNodes(nodes);

        expect(result.clusteredNodes).toHaveLength(10);
        expect(result.clusters.size).toBe(0);
      });

      test('creates clusters for large sets', () => {
        const nodes = createMockNodes(200);

        const result = clusterNodes(nodes, 10);

        expect(result.clusteredNodes.length).toBeLessThan(200);
        expect(result.clusters.size).toBeGreaterThan(0);
      });

      test('creates representative cluster nodes', () => {
        const nodes = createMockNodes(200);

        const result = clusterNodes(nodes, 5);

        const clusterNodes = result.clusteredNodes.filter(
          node => node.data.cluster
        );
        expect(clusterNodes.length).toBeGreaterThan(0);
        expect(clusterNodes[0].data).toHaveProperty('nodeCount');
        expect(clusterNodes[0].data).toHaveProperty('originalNodes');
      });
    });
  });

  describe('PerformanceService Integration', () => {
    test('optimizes workflow successfully', async () => {
      const workflowData = {
        nodes: createMockNodes(50),
        viewport: { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.0 },
        edges: createMockEdges(75),
      };

      const result = await performanceService.optimizeWorkflow(workflowData);

      expect(result.success).toBe(true);
      expect(result.render_plan).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('gets performance dashboard data', async () => {
      const result = await performanceService.getPerformanceDashboard();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('system_status');
      expect(result).toHaveProperty('performance_report');
    });

    test('handles service errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      await expect(performanceService.getPerformanceStatus()).rejects.toThrow();
    });
  });

  describe('AudioStore Integration', () => {
    test('has performance optimization methods', () => {
      const { result } = renderHook(() => useAudioStore());

      expect(typeof result.current.optimizeWorkflow).toBe('function');
      expect(typeof result.current.getPerformanceStatus).toBe('function');
      expect(typeof result.current.getPerformanceDashboard).toBe('function');
      expect(typeof result.current.cacheWorkflow).toBe('function');
      expect(typeof result.current.getCachedWorkflow).toBe('function');
    });

    test('optimizes workflow through store', async () => {
      const { result } = renderHook(() => useAudioStore());

      const workflowData = {
        nodes: createMockNodes(10),
        viewport: { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.0 },
        edges: createMockEdges(15),
      };

      const optimizationResult =
        await result.current.optimizeWorkflow(workflowData);

      expect(optimizationResult.success).toBe(true);
    });
  });

  describe('Performance Thresholds', () => {
    test('has correct threshold values', () => {
      expect(PERFORMANCE_THRESHOLDS.MAX_VISIBLE_NODES).toBe(1000);
      expect(PERFORMANCE_THRESHOLDS.VIRTUAL_SCROLLING_THRESHOLD).toBe(2000);
      expect(PERFORMANCE_THRESHOLDS.LOD_HIGH_ZOOM).toBe(0.7);
      expect(PERFORMANCE_THRESHOLDS.LOD_MEDIUM_ZOOM).toBe(0.3);
      expect(PERFORMANCE_THRESHOLDS.FRAME_BUDGET_MS).toBe(16.67);
      expect(PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB).toBe(500);
      expect(PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL_MB).toBe(1000);
    });
  });
});

describe('Performance Integration Tests', () => {
  test('complete workflow optimization pipeline', async () => {
    const nodes = createMockNodes(100);
    const edges = createMockEdges(150);
    const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 0.8 };

    // Test complexity calculation
    const complexities = nodes.map(node => calculateNodeComplexity(node));
    expect(complexities.length).toBe(100);

    // Test strategy determination
    const strategy = determineOptimizationStrategy(nodes.length, edges.length);
    expect(strategy.levelOfDetail).toBe(true);

    // Test LOD application
    const optimizedNodes = applyLevelOfDetail(nodes, viewport);
    expect(optimizedNodes.length).toBeLessThanOrEqual(nodes.length);

    // Test edge simplification
    const visibleNodes = new Set(optimizedNodes.map(n => n.id));
    const simplifiedEdges = simplifyEdges(edges, visibleNodes);
    expect(simplifiedEdges.length).toBeLessThanOrEqual(edges.length);

    // Test clustering if needed
    if (nodes.length > 1000) {
      const { clusteredNodes } = clusterNodes(optimizedNodes);
      expect(clusteredNodes.length).toBeLessThan(optimizedNodes.length);
    }
  });

  test('performance monitoring integration', async () => {
    render(<PerformanceDashboard />);

    // Start monitoring
    await waitFor(() => {
      const startButton = screen.getByText('Start Monitoring');
      fireEvent.click(startButton);
    });

    // Check that status updates
    await waitFor(() => {
      expect(screen.getByText('Stop Monitoring')).toBeInTheDocument();
    });

    // Stop monitoring
    const stopButton = screen.getByText('Stop Monitoring');
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText('Start Monitoring')).toBeInTheDocument();
    });
  });

  test('end-to-end optimization workflow', async () => {
    const { result } = renderHook(() => useAudioStore());

    // Cache workflow
    const workflowData = {
      nodes: createMockNodes(50),
      viewport: { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.0 },
      edges: createMockEdges(75),
    };

    const cacheResult = await result.current.cacheWorkflow(
      'test_workflow',
      workflowData
    );
    expect(cacheResult.success).toBe(true);

    // Retrieve cached workflow
    const cachedWorkflow =
      await result.current.getCachedWorkflow('test_workflow');
    expect(cachedWorkflow).not.toBeNull();

    // Optimize workflow
    const optimizationResult =
      await result.current.optimizeWorkflow(workflowData);
    expect(optimizationResult.success).toBe(true);

    // Get performance status
    const status = await result.current.getPerformanceStatus();
    expect(status).toHaveProperty('status');
  });
});

// Integration test helper
function renderHook<T>(hook: () => T): {
  result: { current: T };
  rerender: () => void;
} {
  let result: T;
  const Component = () => {
    result = hook();
    return null;
  };

  render(<Component />);

  return {
    get result() {
      return { current: result };
    },
    rerender: () => render(<Component />),
  };
}

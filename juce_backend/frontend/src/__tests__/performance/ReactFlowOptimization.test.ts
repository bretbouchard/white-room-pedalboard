/**
 * React Flow Performance Optimization Tests
 * Unit tests for React Flow performance optimization utilities
 */

import {
  calculateNodeComplexity,
  determineOptimizationStrategy,
  applyLevelOfDetail,
  simplifyEdges,
  clusterNodes,
  PerformanceMonitor,
  createDebouncedOptimizer,
  createOptimizedFlowConfig,
  usePerformanceOptimizedFlow,
  PERFORMANCE_THRESHOLDS,
  NodeComplexity,
} from '../../../utils/reactFlowOptimization';

// Mock React for hooks
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
  useMemo: jest.fn(),
  useRef: jest.fn(),
}));

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    ...global.performance,
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 512 * 1024 * 1024, // 512MB
    },
  },
  writable: true,
});

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1920,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 1080,
});

describe('React Flow Performance Optimization Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateNodeComplexity', () => {
    test('returns SIMPLE for minimal data', () => {
      const node = {
        id: 'simple',
        type: 'default',
        position: { x: 0, y: 0 },
        data: { label: 'Simple' },
      };

      expect(calculateNodeComplexity(node)).toBe(NodeComplexity.SIMPLE);
    });

    test('returns MEDIUM for moderate data', () => {
      const node = {
        id: 'medium',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          label: 'Medium',
          value: 42,
          description: 'A medium complexity node with several properties',
        },
      };

      expect(calculateNodeComplexity(node)).toBe(NodeComplexity.MEDIUM);
    });

    test('returns COMPLEX for data with audio arrays', () => {
      const node = {
        id: 'complex',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          label: 'Complex',
          audioData: new Array(5000).fill(0),
          metadata: new Array(50).fill('data'),
        },
      };

      expect(calculateNodeComplexity(node)).toBe(NodeComplexity.COMPLEX);
    });

    test('returns HEAVY for large complex data', () => {
      const node = {
        id: 'heavy',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          label: 'Heavy',
          audioData: new Array(20000).fill(0),
          spectrumData: new Array(2048).fill(0),
          nested: new Array(100).fill(0).map(() => ({
            data: new Array(100).fill('complex'),
          })),
        },
      };

      expect(calculateNodeComplexity(node)).toBe(NodeComplexity.HEAVY);
    });

    test('handles circular references gracefully', () => {
      const node: any = {
        id: 'circular',
        type: 'default',
        position: { x: 0, y: 0 },
        data: { label: 'Circular' },
      };
      node.data.self = node.data; // Create circular reference

      // Should not throw and should handle gracefully
      expect(() => calculateNodeComplexity(node)).not.toThrow();
      expect([NodeComplexity.HEAVY, NodeComplexity.COMPLEX]).toContain(
        calculateNodeComplexity(node)
      );
    });
  });

  describe('determineOptimizationStrategy', () => {
    test('returns minimal strategy for small workflows', () => {
      const strategy = determineOptimizationStrategy(50, 75);

      expect(strategy.virtualScrolling).toBe(false);
      expect(strategy.levelOfDetail).toBe(false);
      expect(strategy.edgeSimplification).toBe(false);
      expect(strategy.nodeClustering).toBe(false);
      expect(strategy.lazyRendering).toBe(false);
    });

    test('enables LOD for medium workflows', () => {
      const strategy = determineOptimizationStrategy(800, 1200);

      expect(strategy.virtualScrolling).toBe(false);
      expect(strategy.levelOfDetail).toBe(true);
      expect(strategy.edgeSimplification).toBe(false);
      expect(strategy.nodeClustering).toBe(false);
      expect(strategy.lazyRendering).toBe(true);
    });

    test('enables all optimizations for large workflows', () => {
      const strategy = determineOptimizationStrategy(5000, 10000);

      expect(strategy.virtualScrolling).toBe(true);
      expect(strategy.levelOfDetail).toBe(true);
      expect(strategy.edgeSimplification).toBe(true);
      expect(strategy.nodeClustering).toBe(true);
      expect(strategy.lazyRendering).toBe(true);
    });

    test('enables edge simplification for high edge count', () => {
      const strategy = determineOptimizationStrategy(500, 2000);

      expect(strategy.edgeSimplification).toBe(true);
    });

    test('adjusts strategy based on poor performance', () => {
      const poorPerformance = {
        fps: 25,
        memoryUsage: 600,
        renderTime: 50,
        visibleNodes: 100,
        totalNodes: 500,
        optimizationLevel: 'moderate',
      };

      const strategy = determineOptimizationStrategy(500, 750, poorPerformance);

      expect(strategy.virtualScrolling).toBe(true);
      expect(strategy.levelOfDetail).toBe(true);
      expect(strategy.edgeSimplification).toBe(true);
      expect(strategy.nodeClustering).toBe(true);
      expect(strategy.lazyRendering).toBe(true);
    });

    test('enables memory optimizations for high memory usage', () => {
      const highMemoryPerformance = {
        fps: 55,
        memoryUsage: 1200, // > MEMORY_CRITICAL_MB
        renderTime: 20,
        visibleNodes: 200,
        totalNodes: 800,
        optimizationLevel: 'light',
      };

      const strategy = determineOptimizationStrategy(
        800,
        1200,
        highMemoryPerformance
      );

      expect(strategy.virtualScrolling).toBe(true);
      expect(strategy.nodeClustering).toBe(true);
      expect(strategy.lazyRendering).toBe(true);
    });
  });

  describe('applyLevelOfDetail', () => {
    const createTestNodes = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `node_${i}`,
        type: 'default',
        position: { x: i * 200, y: i * 100 },
        data: {
          label: `Node ${i}`,
          width: 150,
          height: 80,
          audioData: new Array(1000).fill(i),
          spectrumData: new Array(256).fill(i),
        },
      }));
    };

    test('applies no LOD at high zoom', () => {
      const nodes = createTestNodes(10);
      const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.5 };

      const result = applyLevelOfDetail(nodes, viewport, 100);

      expect(result).toHaveLength(10);
      expect(result[0].data).toHaveProperty('label');
      expect(result[0].data).toHaveProperty('audioData');
      expect(result[0].data).not.toHaveProperty('_lod');
    });

    test('applies medium LOD at medium zoom', () => {
      const nodes = createTestNodes(10);
      const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 0.5 };

      const result = applyLevelOfDetail(nodes, viewport, 100);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].data).toHaveProperty('audioData');
      expect(result[0].data.audioData).toHaveProperty('_preview');
      expect(result[0].data.audioData).toHaveProperty('_length');
    });

    test('applies low LOD at low zoom', () => {
      const nodes = createTestNodes(10);
      const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 0.1 };

      const result = applyLevelOfDetail(nodes, viewport, 100);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].data).toHaveProperty('_lod');
      expect(result[0].data._lod).toBe('low');
    });

    test('applies minimal LOD at very low zoom', () => {
      const nodes = createTestNodes(10);
      const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 0.05 };

      const result = applyLevelOfDetail(nodes, viewport, 100);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].data._lod).toBe('minimal');
    });

    test('respects max visible nodes limit', () => {
      const nodes = createTestNodes(100);
      const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.0 };

      const result = applyLevelOfDetail(nodes, viewport, 10);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    test('filters nodes outside viewport', () => {
      const nodes = [
        {
          id: 'visible',
          type: 'default',
          position: { x: 100, y: 100 },
          data: { width: 100, height: 50 },
        },
        {
          id: 'invisible',
          type: 'default',
          position: { x: 5000, y: 5000 },
          data: { width: 100, height: 50 },
        },
      ];
      const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.0 };

      const result = applyLevelOfDetail(nodes, viewport, 100);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('visible');
    });
  });

  describe('simplifyEdges', () => {
    const createTestEdges = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `edge_${i}`,
        source: `node_${i}`,
        target: `node_${(i + 1) % Math.max(1, count - 1)}`,
        type: i % 3 === 0 ? 'smoothstep' : 'default',
        animated: i % 5 === 0,
        style: { strokeWidth: (i % 3) + 1 },
      }));
    };

    test('keeps all edges when under limit', () => {
      const edges = createTestEdges(10);
      const visibleNodes = new Set([
        'node_0',
        'node_1',
        'node_2',
        'node_3',
        'node_4',
      ]);

      const result = simplifyEdges(edges, visibleNodes, 100);

      expect(result).toHaveLength(3); // Only edges between visible nodes
    });

    test('filters edges by visible nodes', () => {
      const edges = createTestEdges(10);
      const visibleNodes = new Set(['node_0', 'node_2', 'node_4']);

      const result = simplifyEdges(edges, visibleNodes, 100);

      expect(
        result.every(
          edge => visibleNodes.has(edge.source) && visibleNodes.has(edge.target)
        )
      ).toBe(true);
    });

    test('limits edge count when over limit', () => {
      const edges = createTestEdges(100);
      const visibleNodes = new Set(edges.slice(0, 50).map(e => e.source));

      const result = simplifyEdges(edges, visibleNodes, 25);

      expect(result.length).toBeLessThanOrEqual(25);
    });

    test('simplifies edge types when over limit', () => {
      const edges = createTestEdges(100);
      const visibleNodes = new Set(edges.slice(0, 50).map(e => e.source));

      const result = simplifyEdges(edges, visibleNodes, 25);

      expect(
        result.every(
          edge => edge.type === 'default' || edge.type === 'straight'
        )
      ).toBe(true);
    });

    test('removes animations when over limit', () => {
      const edges = createTestEdges(100);
      const visibleNodes = new Set(edges.slice(0, 50).map(e => e.source));

      const result = simplifyEdges(edges, visibleNodes, 25);

      expect(result.every(edge => !edge.animated)).toBe(true);
    });

    test('simplifies stroke widths when over limit', () => {
      const edges = createTestEdges(100);
      const visibleNodes = new Set(edges.slice(0, 50).map(e => e.source));

      const result = simplifyEdges(edges, visibleNodes, 25);

      expect(
        result.every(
          edge =>
            !edge.style ||
            (edge.style.strokeWidth && edge.style.strokeWidth <= 2)
        )
      ).toBe(true);
    });
  });

  describe('clusterNodes', () => {
    const createTestNodes = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `node_${i}`,
        type: 'default',
        position: {
          x: (i % 10) * 100,
          y: Math.floor(i / 10) * 100,
        },
        data: { label: `Node ${i}` },
      }));
    };

    test('returns original nodes for small sets', () => {
      const nodes = createTestNodes(20);

      const result = clusterNodes(nodes, 30);

      expect(result.clusteredNodes).toHaveLength(20);
      expect(result.clusters.size).toBe(0);
    });

    test('creates clusters for large sets', () => {
      const nodes = createTestNodes(100);

      const result = clusterNodes(nodes, 5);

      expect(result.clusteredNodes.length).toBeLessThan(100);
      expect(result.clusters.size).toBeGreaterThan(0);
    });

    test('creates cluster representatives correctly', () => {
      const nodes = createTestNodes(100);

      const result = clusterNodes(nodes, 5);

      const clusterNodes = result.clusteredNodes.filter(
        node => node.data.cluster
      );
      expect(clusterNodes.length).toBeGreaterThan(0);

      const cluster = clusterNodes[0];
      expect(cluster.data).toHaveProperty('nodeCount');
      expect(cluster.data).toHaveProperty('originalNodes');
      expect(cluster.data.nodeCount).toBeGreaterThan(1);
      expect(cluster.type).toBe('cluster');
    });

    test('calculates cluster center correctly', () => {
      const nodes = [
        {
          id: 'node_0',
          type: 'default',
          position: { x: 0, y: 0 },
          data: { label: 'Node 0' },
        },
        {
          id: 'node_1',
          type: 'default',
          position: { x: 200, y: 0 },
          data: { label: 'Node 1' },
        },
        {
          id: 'node_2',
          type: 'default',
          position: { x: 100, y: 200 },
          data: { label: 'Node 2' },
        },
      ];

      const result = clusterNodes(nodes, 2);

      const cluster = result.clusteredNodes.find(node => node.data.cluster);
      expect(cluster).toBeDefined();
      expect(cluster!.position.x).toBe(100); // Average of 0, 200, 100
      expect(cluster!.position.y).toBeCloseTo(66.67, 1); // Average of 0, 0, 200
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
      (performance.now as jest.Mock).mockReturnValue(Date.now());
    });

    test('initializes with default metrics', () => {
      const metrics = monitor.updateMetrics();

      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
      expect(metrics.visibleNodes).toBe(0);
      expect(metrics.totalNodes).toBe(0);
      expect(metrics.optimizationLevel).toBe('none');
    });

    test('calculates FPS correctly', () => {
      // Simulate multiple frames
      for (let i = 0; i < 30; i++) {
        monitor.updateMetrics();
      }

      const metrics = monitor.updateMetrics();

      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.fps).toBeLessThan(200); // Should be reasonable
    });

    test('updates memory usage', () => {
      (performance.memory as any).usedJSHeapSize = 1024 * 1024 * 1024; // 1GB

      const metrics = monitor.updateMetrics();

      expect(metrics.memoryUsage).toBe(1024);
    });

    test('detects performance issues', () => {
      // Simulate poor performance
      for (let i = 0; i < 30; i++) {
        (performance.now as jest.Mock).mockReturnValue(Date.now() + 50); // 50ms per frame
        monitor.updateMetrics();
      }

      const metrics = monitor.updateMetrics();

      expect(metrics.optimizationLevel).toBe('aggressive');
    });

    test('provides appropriate recommendations', () => {
      // Simulate poor FPS
      (performance.now as jest.Mock).mockReturnValue(Date.now() + 50);
      for (let i = 0; i < 30; i++) {
        monitor.updateMetrics();
      }

      const recommendations = monitor.getRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.includes('FPS'))).toBe(true);
    });

    test('detects high memory usage', () => {
      (performance.memory as any).usedJSHeapSize = 1.5 * 1024 * 1024 * 1024; // 1.5GB

      monitor.updateMetrics();
      const recommendations = monitor.getRecommendations();

      expect(recommendations.some(rec => rec.includes('memory'))).toBe(true);
    });
  });

  describe('createDebouncedOptimizer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('delays optimization function', () => {
      const mockOptimize = jest.fn();
      const debouncedOptimize = createDebouncedOptimizer(mockOptimize, 100);

      debouncedOptimize();
      expect(mockOptimize).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockOptimize).toHaveBeenCalledTimes(1);
    });

    test('cancels previous call', () => {
      const mockOptimize = jest.fn();
      const debouncedOptimize = createDebouncedOptimizer(mockOptimize, 100);

      debouncedOptimize();
      debouncedOptimize(); // Second call should cancel first

      jest.advanceTimersByTime(100);
      expect(mockOptimize).toHaveBeenCalledTimes(1);
    });

    test('executes immediately for delay of 0', () => {
      const mockOptimize = jest.fn();
      const debouncedOptimize = createDebouncedOptimizer(mockOptimize, 0);

      debouncedOptimize();
      expect(mockOptimize).toHaveBeenCalledTimes(1);
    });
  });

  describe('createOptimizedFlowConfig', () => {
    const createTestNodes = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `node_${i}`,
        type: 'default',
        position: { x: i * 100, y: 0 },
        data: { label: `Node ${i}`, width: 150, height: 80 },
      }));
    };

    const createTestEdges = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `edge_${i}`,
        source: `node_${i}`,
        target: `node_${(i + 1) % Math.max(1, count - 1)}`,
        type: 'default',
      }));
    };

    test('returns original config for small workflows', () => {
      const nodes = createTestNodes(10);
      const edges = createTestEdges(15);
      const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.0 };

      const result = createOptimizedFlowConfig({
        nodes,
        edges,
        viewport,
        performanceMode: false,
      });

      expect(result.nodes).toHaveLength(10);
      expect(result.edges).toHaveLength(15);
      expect(result.strategy.virtualScrolling).toBe(false);
      expect(result.strategy.levelOfDetail).toBe(false);
    });

    test('applies optimizations for large workflows', () => {
      const nodes = createTestNodes(5000);
      const edges = createTestEdges(8000);
      const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.0 };

      const result = createOptimizedFlowConfig({
        nodes,
        edges,
        viewport,
        performanceMode: true,
      });

      expect(result.strategy.virtualScrolling).toBe(true);
      expect(result.strategy.levelOfDetail).toBe(true);
      expect(result.strategy.edgeSimplification).toBe(true);
      expect(result.strategy.nodeClustering).toBe(true);
      expect(result.strategy.lazyRendering).toBe(true);
    });

    test('includes correct React Flow configuration', () => {
      const nodes = createTestNodes(100);
      const edges = createTestEdges(150);
      const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.0 };

      const result = createOptimizedFlowConfig({
        nodes,
        edges,
        viewport,
        performanceMode: true,
      });

      expect(result.config).toHaveProperty('nodes');
      expect(result.config).toHaveProperty('edges');
      expect(result.config).toHaveProperty('fitView', false);
      expect(result.config).toHaveProperty('proOptions');
      expect(result.config.proOptions.hideAttribution).toBe(true);
    });

    test('adjusts configuration based on optimization strategy', () => {
      const nodes = createTestNodes(3000);
      const edges = createTestEdges(5000);
      const viewport = { x: 0, y: 0, width: 1920, height: 1080, zoom: 1.0 };

      const result = createOptimizedFlowConfig({
        nodes,
        edges,
        viewport,
        performanceMode: true,
      });

      expect(result.config.minZoom).toBe(0.1); // Lower for virtual scrolling
      expect(result.config.edgesUpdatable).toBe(false); // Disabled for performance
      expect(result.config.selectNodesOnDrag).toBe(false); // Disabled for performance
    });
  });
});

describe('Performance Thresholds Constants', () => {
  test('has correct threshold values', () => {
    expect(PERFORMANCE_THRESHOLDS.MAX_VISIBLE_NODES).toBe(1000);
    expect(PERFORMANCE_THRESHOLDS.VIRTUAL_SCROLLING_THRESHOLD).toBe(2000);
    expect(PERFORMANCE_THRESHOLDS.LOD_HIGH_ZOOM).toBe(0.7);
    expect(PERFORMANCE_THRESHOLDS.LOD_MEDIUM_ZOOM).toBe(0.3);
    expect(PERFORMANCE_THRESHOLDS.FRAME_BUDGET_MS).toBe(16.67);
    expect(PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB).toBe(500);
    expect(PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL_MB).toBe(1000);
  });

  test('thresholds are in proper ranges', () => {
    expect(PERFORMANCE_THRESHOLDS.LOD_HIGH_ZOOM).toBeGreaterThan(
      PERFORMANCE_THRESHOLDS.LOD_MEDIUM_ZOOM
    );
    expect(PERFORMANCE_THRESHOLDS.VIRTUAL_SCROLLING_THRESHOLD).toBeGreaterThan(
      PERFORMANCE_THRESHOLDS.MAX_VISIBLE_NODES
    );
    expect(PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL_MB).toBeGreaterThan(
      PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB
    );
  });
});

/**
 * React Flow Performance Optimization Utilities
 * Performance optimization helpers for React Flow applications
 */

import React from 'react';
import { Node, Edge, Viewport } from 'reactflow';
import performanceService from '@/services/performanceService';

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  MAX_VISIBLE_NODES: 1000,
  VIRTUAL_SCROLLING_THRESHOLD: 2000,
  LOD_HIGH_ZOOM: 0.7,
  LOD_MEDIUM_ZOOM: 0.3,
  FRAME_BUDGET_MS: 16.67, // 60 FPS
  MEMORY_WARNING_MB: 500,
  MEMORY_CRITICAL_MB: 1000,
} as const;

// Node complexity levels
export enum NodeComplexity {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex',
  HEAVY = 'heavy'
}

// Performance optimization strategies
export interface OptimizationStrategy {
  virtualScrolling: boolean;
  levelOfDetail: boolean;
  edgeSimplification: boolean;
  nodeClustering: boolean;
  lazyRendering: boolean;
}

// Performance metrics
export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  visibleNodes: number;
  totalNodes: number;
  optimizationLevel: string;
}

/**
 * Calculate node complexity based on data properties
 */
export function calculateNodeComplexity(node: Node): NodeComplexity {
  const data = node.data || {};

  // Count complex properties
  let complexityScore = 0;

  // Base data size
  if (typeof data === 'object') {
    complexityScore += Object.keys(data).length;
  }

  // Check for large data arrays
  if (data.audioData && Array.isArray(data.audioData)) {
    complexityScore += data.audioData.length / 1000;
  }

  if (data.spectrumData && Array.isArray(data.spectrumData)) {
    complexityScore += data.spectrumData.length / 100;
  }

  // Check for complex nested objects
  try {
    const serializedSize = JSON.stringify(data).length;
    complexityScore += serializedSize / 1000;
  } catch {
    complexityScore += 10; // Serialization failed, likely complex
  }

  // Determine complexity level
  if (complexityScore < 5) return NodeComplexity.SIMPLE;
  if (complexityScore < 15) return NodeComplexity.MEDIUM;
  if (complexityScore < 50) return NodeComplexity.COMPLEX;
  return NodeComplexity.HEAVY;
}

/**
 * Determine optimal optimization strategy based on workflow size
 */
export function determineOptimizationStrategy(
  nodeCount: number,
  edgeCount: number,
  currentPerformance?: PerformanceMetrics
): OptimizationStrategy {
  const strategy: OptimizationStrategy = {
    virtualScrolling: false,
    levelOfDetail: false,
    edgeSimplification: false,
    nodeClustering: false,
    lazyRendering: false,
  };

  // Base decisions on node count
  if (nodeCount > PERFORMANCE_THRESHOLDS.VIRTUAL_SCROLLING_THRESHOLD) {
    strategy.virtualScrolling = true;
    strategy.levelOfDetail = true;
    strategy.edgeSimplification = true;
    strategy.nodeClustering = true;
    strategy.lazyRendering = true;
  } else if (nodeCount > PERFORMANCE_THRESHOLDS.MAX_VISIBLE_NODES) {
    strategy.levelOfDetail = true;
    strategy.edgeSimplification = true;
    strategy.lazyRendering = true;
  } else if (nodeCount > 500) {
    strategy.levelOfDetail = true;
    strategy.lazyRendering = true;
  }

  // Adjust based on current performance
  if (currentPerformance) {
    if (currentPerformance.fps < 30) {
      // Poor performance - enable all optimizations
      strategy.virtualScrolling = true;
      strategy.levelOfDetail = true;
      strategy.edgeSimplification = true;
      strategy.nodeClustering = true;
      strategy.lazyRendering = true;
    } else if (currentPerformance.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL_MB) {
      // High memory usage - enable memory-intensive optimizations
      strategy.virtualScrolling = true;
      strategy.nodeClustering = true;
      strategy.lazyRendering = true;
    }
  }

  // Consider edge complexity
  if (edgeCount > nodeCount * 3) {
    strategy.edgeSimplification = true;
  }

  return strategy;
}

/**
 * Apply level-of-detail rendering to nodes
 */
export function applyLevelOfDetail(
  nodes: Node[],
  viewport: Viewport,
  maxVisibleNodes: number = PERFORMANCE_THRESHOLDS.MAX_VISIBLE_NODES
): Node[] {
  const zoom = viewport.zoom || 1;
  const result: Node[] = [];
  let processedNodes = 0;

  for (const node of nodes) {
    // Stop if we've reached the limit
    if (processedNodes >= maxVisibleNodes) {
      break;
    }

    // Check if node is in viewport
    const isInViewport = isNodeInViewport(node, viewport);

    if (!isInViewport) {
      continue; // Skip nodes outside viewport
    }

    // Apply LOD based on zoom and distance
    const lodNode = applyNodeLOD(node, zoom, viewport);
    result.push(lodNode);
    processedNodes++;
  }

  return result;
}

/**
 * Check if a node is within the current viewport
 */
function isNodeInViewport(node: Node, viewport: Viewport): boolean {
  const nodeX = node.position.x;
  const nodeY = node.position.y;
  const nodeWidth = (node.data?.width || 200) * (node.data?.scale || 1);
  const nodeHeight = (node.data?.height || 100) * (node.data?.scale || 1);

  const vpX = viewport.x || 0;
  const vpY = viewport.y || 0;
  const vpWidth = viewport.width || window.innerWidth;
  const vpHeight = viewport.height || window.innerHeight;

  // Add some padding for smoother transitions
  const padding = 100;

  return (
    nodeX < vpX + vpWidth + padding &&
    nodeX + nodeWidth > vpX - padding &&
    nodeY < vpY + vpHeight + padding &&
    nodeY + nodeHeight > vpY - padding
  );
}

/**
 * Apply level-of-detail to individual node
 */
function applyNodeLOD(node: Node, zoom: number, viewport: Viewport): Node {
  const complexity = calculateNodeComplexity(node);
  const lodNode = { ...node };

  // High detail - no changes
  if (zoom >= PERFORMANCE_THRESHOLDS.LOD_HIGH_ZOOM) {
    return lodNode;
  }

  // Medium detail - simplify some properties
  if (zoom >= PERFORMANCE_THRESHOLDS.LOD_MEDIUM_ZOOM) {
    lodNode.data = {
      ...node.data,
      // Simplify complex data
      ...(node.data.audioData && {
        audioData: {
          _preview: true,
          _length: Array.isArray(node.data.audioData) ? node.data.audioData.length : 0,
          _sampleRate: node.data.audioData?.sampleRate || 44100
        }
      }),
      ...(node.data.spectrumData && {
        spectrumData: {
          _preview: true,
          _length: Array.isArray(node.data.spectrumData) ? node.data.spectrumData.length : 0
        }
      })
    };
    return lodNode;
  }

  // Low detail - minimal rendering
  lodNode.data = {
    label: node.data?.label || node.id,
    width: node.data?.width || 200,
    height: node.data?.height || 100,
    color: node.data?.color || '#3b82f6',
    _lod: 'low'
  };

  // For very small nodes at low zoom, further simplify
  if (zoom < 0.1) {
    lodNode.data = {
      _lod: 'minimal',
      color: node.data?.color || '#3b82f6'
    };
  }

  return lodNode;
}

/**
 * Simplify edges for better performance
 */
export function simplifyEdges(
  edges: Edge[],
  visibleNodes: Set<string>,
  maxEdges: number = 2000
): Edge[] {
  if (edges.length <= maxEdges) {
    return edges.filter(edge =>
      visibleNodes.has(edge.source) && visibleNodes.has(edge.target)
    );
  }

  // Prioritize edges between visible nodes
  const visibleEdges = edges.filter(edge =>
    visibleNodes.has(edge.source) && visibleNodes.has(edge.target)
  );

  if (visibleEdges.length <= maxEdges) {
    return visibleEdges;
  }

  // If still too many, apply further simplification
  return visibleEdges.slice(0, maxEdges).map(edge => ({
    ...edge,
    type: edge.type === 'smoothstep' || edge.type === 'bezier' ? 'default' : edge.type,
    animated: false, // Disable animations for performance
    style: {
      ...edge.style,
      strokeWidth: Math.min((edge.style?.strokeWidth || 1) * 0.7, 2)
    }
  }));
}

/**
 * Cluster nodes for better performance
 */
export function clusterNodes(nodes: Node[], maxClusters: number = 50): {
  clusteredNodes: Node[];
  clusters: Map<string, Node[]>;
} {
  if (nodes.length <= maxClusters) {
    return {
      clusteredNodes: nodes,
      clusters: new Map()
    };
  }

  const clusters = new Map<string, Node[]>();
  const gridSize = Math.ceil(Math.sqrt(nodes.length / maxClusters));
  const clusterSize = 200 * gridSize;

  // Simple grid-based clustering
  nodes.forEach(node => {
    const clusterX = Math.floor(node.position.x / clusterSize);
    const clusterY = Math.floor(node.position.y / clusterSize);
    const clusterKey = `${clusterX}_${clusterY}`;

    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, []);
    }
    clusters.get(clusterKey)!.push(node);
  });

  // Create cluster representative nodes
  const clusteredNodes: Node[] = [];
  clusters.forEach((clusterNodes, clusterKey) => {
    if (clusterNodes.length === 1) {
      clusteredNodes.push(clusterNodes[0]);
    } else {
      // Create a cluster node
      const centerX = clusterNodes.reduce((sum, node) => sum + node.position.x, 0) / clusterNodes.length;
      const centerY = clusterNodes.reduce((sum, node) => sum + node.position.y, 0) / clusterNodes.length;

      clusteredNodes.push({
        id: `cluster_${clusterKey}`,
        type: 'cluster',
        position: { x: centerX, y: centerY },
        data: {
          label: `${clusterNodes.length} nodes`,
          cluster: true,
          nodeCount: clusterNodes.length,
          originalNodes: clusterNodes.map(n => n.id)
        }
      });
    }
  });

  return { clusteredNodes, clusters };
}

/**
 * Monitor performance metrics
 */
export class PerformanceMonitor {
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private fps = 60;
  private memoryUsage = 0;
  private renderTime = 0;

  /**
   * Update performance metrics
   */
  updateMetrics(): PerformanceMetrics {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;

    this.frameCount++;

    // Calculate FPS every 30 frames
    if (this.frameCount % 30 === 0) {
      this.fps = 30000 / (now - this.lastFrameTime + 1); // +1 to avoid division by zero
      this.lastFrameTime = now;

      // Update memory usage
      if ((performance as any).memory) {
        this.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
      }
    }

    this.renderTime = deltaTime;

    return {
      fps: this.fps,
      memoryUsage: this.memoryUsage,
      renderTime: this.renderTime,
      visibleNodes: 0, // To be set by caller
      totalNodes: 0, // To be set by caller
      optimizationLevel: this.getOptimizationLevel()
    };
  }

  /**
   * Get current optimization level based on metrics
   */
  private getOptimizationLevel(): string {
    if (this.fps < 20 || this.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL_MB) {
      return 'aggressive';
    } else if (this.fps < 30 || this.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB) {
      return 'moderate';
    } else if (this.fps < 50) {
      return 'light';
    }
    return 'none';
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.fps < 30) {
      recommendations.push('Low FPS detected - enable virtual scrolling and reduce visible nodes');
    }

    if (this.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB) {
      recommendations.push('High memory usage - enable node clustering and clear unused cache');
    }

    if (this.renderTime > PERFORMANCE_THRESHOLDS.FRAME_BUDGET_MS * 2) {
      recommendations.push('Slow rendering detected - enable level-of-detail and edge simplification');
    }

    if (this.fps < 20) {
      recommendations.push('Critical performance issue - reduce workflow complexity or enable all optimizations');
    }

    return recommendations;
  }
}

/**
 * Debounced optimization function
 */
export function createDebouncedOptimizer(
  optimizeFn: () => void,
  delay: number = 100
): () => void {
  let timeoutId: NodeJS.Timeout;

  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(optimizeFn, delay);
  };
}

/**
 * Optimized React Flow props
 */
export interface OptimizedReactFlowProps {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  performanceMode?: boolean;
  maxVisibleNodes?: number;
}

/**
 * Create optimized React Flow configuration
 */
export function createOptimizedFlowConfig(
  props: OptimizedReactFlowProps
): {
  nodes: Node[];
  edges: Edge[];
  config: any;
  strategy: OptimizationStrategy;
  metrics: PerformanceMetrics;
} {
  const monitor = new PerformanceMonitor();
  const metrics = monitor.updateMetrics();

  // Update metrics with actual node counts
  metrics.totalNodes = props.nodes.length;
  metrics.visibleNodes = props.nodes.filter(node =>
    isNodeInViewport(node, props.viewport)
  ).length;

  // Determine optimization strategy
  const strategy = determineOptimizationStrategy(
    props.nodes.length,
    props.edges.length,
    metrics
  );

  let optimizedNodes = props.nodes;
  let optimizedEdges = props.edges;

  // Apply optimizations based on strategy
  if (strategy.virtualScrolling || strategy.levelOfDetail) {
    const visibleNodeIds = new Set(
      props.nodes
        .filter(node => isNodeInViewport(node, props.viewport))
        .slice(0, props.maxVisibleNodes || PERFORMANCE_THRESHOLDS.MAX_VISIBLE_NODES)
        .map(node => node.id)
    );

    optimizedNodes = applyLevelOfDetail(
      props.nodes.filter(node => visibleNodeIds.has(node.id)),
      props.viewport,
      props.maxVisibleNodes
    );

    if (strategy.edgeSimplification) {
      optimizedEdges = simplifyEdges(optimizedEdges, visibleNodeIds);
    }
  }

  if (strategy.nodeClustering) {
    const { clusteredNodes } = clusterNodes(optimizedNodes);
    optimizedNodes = clusteredNodes;
  }

  // Create React Flow config
  const config = {
    nodes: optimizedNodes,
    edges: optimizedEdges,
    fitView: false,
    snapToGrid: false,
    snapGrid: [20, 20],
    defaultViewport: props.viewport,
    minZoom: strategy.virtualScrolling ? 0.1 : 0.2,
    maxZoom: 2,
    panOnDrag: true,
    panOnScroll: false,
    zoomOnScroll: true,
    zoomOnPinch: true,
    zoomOnDoubleClick: true,
    preventScrolling: true,
    nodeDragThreshold: 1,
    edgesUpdatable: !strategy.edgeSimplification,
    nodesConnectable: !strategy.nodeClustering,
    elementsSelectable: !strategy.virtualScrolling,
    selectNodesOnDrag: false,
    keyboardShortcuts: {
      // Disable some shortcuts for performance
      delete: !strategy.virtualScrolling,
      backspace: !strategy.virtualScrolling,
    },
    ... (props.performanceMode && {
      proOptions: {
        hideAttribution: true,
      },
      style: {
        background: '#f8fafc',
      },
    })
  };

  return {
    nodes: optimizedNodes,
    edges: optimizedEdges,
    config,
    strategy,
    metrics
  };
}

/**
 * Performance-aware hook for React Flow
 */
export function usePerformanceOptimizedFlow(
  nodes: Node[],
  edges: Edge[],
  viewport: Viewport,
  options: {
    enableOptimization?: boolean;
    maxVisibleNodes?: number;
    performanceMode?: boolean;
  } = {}
) {
  const [optimizationEnabled, setOptimizationEnabled] = React.useState(
    options.enableOptimization !== false
  );

  const [performanceMetrics, setPerformanceMetrics] = React.useState<PerformanceMetrics | null>(null);
  const monitor = React.useRef(new PerformanceMonitor());

  // Update performance metrics
  React.useEffect(() => {
    if (!optimizationEnabled) return;

    const interval = setInterval(() => {
      const metrics = monitor.current.updateMetrics();
      metrics.totalNodes = nodes.length;
      metrics.visibleNodes = nodes.filter(node =>
        isNodeInViewport(node, viewport)
      ).length;

      setPerformanceMetrics(metrics);

      // Auto-enable optimizations if performance is poor
      if (metrics.fps < 30 || metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB) {
        setOptimizationEnabled(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nodes, viewport, optimizationEnabled]);

  // Create optimized configuration
  const optimizedConfig = React.useMemo(() => {
    if (!optimizationEnabled) {
      return {
        nodes,
        edges,
        config: { nodes, edges },
        strategy: determineOptimizationStrategy(nodes.length, edges.length),
        metrics: performanceMetrics || monitor.current.updateMetrics()
      };
    }

    return createOptimizedFlowConfig({
      nodes,
      edges,
      viewport,
      performanceMode: options.performanceMode || false,
      maxVisibleNodes: options.maxVisibleNodes,
    });
  }, [nodes, edges, viewport, optimizationEnabled, options.performanceMode, options.maxVisibleNodes]);

  return {
    ...optimizedConfig,
    performanceMetrics: optimizedConfig.metrics,
    recommendations: performanceMetrics ? monitor.current.getRecommendations() : [],
    toggleOptimization: () => setOptimizationEnabled(!optimizationEnabled),
    isOptimizationEnabled: optimizationEnabled
  };
}

// Re-export performance service for convenience
export { performanceService };
export default performanceService;
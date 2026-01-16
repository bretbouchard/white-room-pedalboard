/**
 * Provenance Graph Component
 * 
 * Interactive graph visualization of provenance chains showing relationships
 * between entities and their transformations.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ProvenanceChain,
  ProvenanceVisualizationNode,
  ProvenanceVisualizationEdge,
  ProvenanceGraphProps,
  OperationType
} from '../../types/daid';

interface GraphLayout {
  nodes: ProvenanceVisualizationNode[];
  edges: ProvenanceVisualizationEdge[];
}

export const ProvenanceGraph: React.FC<ProvenanceGraphProps> = ({
  provenance_chain,
  layout = 'hierarchical',
  show_metadata = true,
  interactive = true,
  width = 800,
  height = 600,
  onNodeClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Generate graph layout from provenance chain
  const graphLayout = useMemo(() => {
    return generateGraphLayout(provenance_chain, layout, width, height);
  }, [provenance_chain, layout, width, height]);

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw edges first (so they appear behind nodes)
    drawEdges(ctx, graphLayout.edges, selectedNode, hoveredNode);

    // Draw nodes
    drawNodes(ctx, graphLayout.nodes, selectedNode, hoveredNode);

    ctx.restore();
  }, [graphLayout, selectedNode, hoveredNode, zoom, pan, width, height]);

  // Handle mouse events
  const handleMouseDown = (event: React.MouseEvent) => {
    if (!interactive) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;

    // Check if clicking on a node
    const clickedNode = findNodeAt(graphLayout.nodes, x, y);
    if (clickedNode) {
      setSelectedNode(clickedNode.id);
      onNodeClick?.(clickedNode);
      return;
    }

    // Start panning
    setIsDragging(true);
    setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!interactive) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isDragging) {
      // Update pan
      setPan({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      });
    } else {
      // Update hover state
      const x = (event.clientX - rect.left - pan.x) / zoom;
      const y = (event.clientY - rect.top - pan.y) / zoom;
      
      const hoveredNode = findNodeAt(graphLayout.nodes, x, y);
      setHoveredNode(hoveredNode?.id || null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (event: React.WheelEvent) => {
    if (!interactive) return;

    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const fitToView = () => {
    if (graphLayout.nodes.length === 0) return;

    const bounds = calculateBounds(graphLayout.nodes);
    const padding = 50;
    
    const scaleX = (width - padding * 2) / (bounds.maxX - bounds.minX);
    const scaleY = (height - padding * 2) / (bounds.maxY - bounds.minY);
    const scale = Math.min(scaleX, scaleY, 1);
    
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    setZoom(scale);
    setPan({
      x: width / 2 - centerX * scale,
      y: height / 2 - centerY * scale
    });
  };

  // Auto-fit on layout change
  useEffect(() => {
    let timeoutId: number | undefined;
    if (graphLayout.nodes.length > 0) {
      // schedule fitToView but keep the id so it can be cleared on cleanup
      timeoutId = window.setTimeout(fitToView, 100);
    }
    return () => {
      if (typeof timeoutId !== 'undefined') {
        clearTimeout(timeoutId);
      }
    };
  }, [graphLayout]);

  return (
    <div className="provenance-graph relative" ref={containerRef}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <button
          onClick={fitToView}
          className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm"
          title="Fit to view"
        >
          Fit
        </button>
        <button
          onClick={resetView}
          className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm"
          title="Reset view"
        >
          Reset
        </button>
        <div className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm text-xs text-gray-600">
          Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Graph Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Node Details Panel */}
      {selectedNode && show_metadata && (
        <NodeDetailsPanel
          node={graphLayout.nodes.find(n => n.id === selectedNode)}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Legend */}
      <GraphLegend />
    </div>
  );
};

// Node Details Panel Component
interface NodeDetailsPanelProps {
  node?: ProvenanceVisualizationNode;
  onClose: () => void;
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div className="absolute top-4 left-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-20">
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Node Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-3 space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">DAID</label>
          <p className="text-sm text-gray-900 font-mono break-all">{node.daid}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">Entity</label>
          <p className="text-sm text-gray-900">{node.entity_type}: {node.entity_id}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">Operation</label>
          <p className="text-sm text-gray-900">{node.operation}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">Timestamp</label>
          <p className="text-sm text-gray-900">{new Date(node.timestamp).toLocaleString()}</p>
        </div>
        
        {node.user_id && (
          <div>
            <label className="text-sm font-medium text-gray-700">User</label>
            <p className="text-sm text-gray-900">{node.user_id}</p>
          </div>
        )}
        
        <div>
          <label className="text-sm font-medium text-gray-700">Depth</label>
          <p className="text-sm text-gray-900">{node.depth}</p>
        </div>
        
        {Object.keys(node.metadata).length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700">Metadata</label>
            <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono max-h-32 overflow-y-auto">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(node.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Graph Legend Component
const GraphLegend: React.FC = () => {
  const operationColors = [
    { operation: OperationType.CREATE, color: '#10B981', label: 'Create' },
    { operation: OperationType.UPDATE, color: '#3B82F6', label: 'Update' },
    { operation: OperationType.DELETE, color: '#EF4444', label: 'Delete' },
    { operation: OperationType.AI_DECISION, color: '#EC4899', label: 'AI Decision' },
    { operation: OperationType.USER_INTERACTION, color: '#6366F1', label: 'User Action' },
  ];

  return (
    <div className="absolute bottom-4 left-4 bg-white border border-gray-300 rounded-lg shadow-sm p-3">
      <h4 className="text-sm font-medium text-gray-900 mb-2">Legend</h4>
      <div className="space-y-1">
        {operationColors.map(({ operation, color, label }) => (
          <div key={operation} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-700">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper functions
function generateGraphLayout(
  chain: ProvenanceChain,
  layout: 'hierarchical' | 'force' | 'circular',
  width: number,
  height: number
): GraphLayout {
  const nodes: ProvenanceVisualizationNode[] = [];
  const edges: ProvenanceVisualizationEdge[] = [];

  // Create nodes
  chain.provenance_chain.forEach((record, _index) => {
    void _index; // Mark as intentionally unused
    const node: ProvenanceVisualizationNode = {
      id: record.daid,
      daid: record.daid,
      entity_type: record.entity_type,
      entity_id: record.entity_id,
      operation: record.operation,
      timestamp: record.created_at,
      user_id: record.user_id,
      depth: record.depth,
      x: 0,
      y: 0,
      color: getNodeColor(record.operation),
      size: 20,
      title: `${record.operation} - ${record.entity_id}`,
      description: record.operation_metadata?.description || '',
      metadata: record.operation_metadata
    };

    nodes.push(node);

    // Create edges for parent relationships
    record.parent_daids.forEach(parentDaid => {
      edges.push({
        id: `${parentDaid}-${record.daid}`,
        source: parentDaid,
        target: record.daid,
        type: 'parent',
        color: '#666',
        width: 2,
        style: 'solid'
      });
    });
  });

  // Apply layout algorithm
  switch (layout) {
    case 'hierarchical':
      applyHierarchicalLayout(nodes, width, height);
      break;
    case 'force':
      applyForceLayout(nodes, edges, width, height);
      break;
    case 'circular':
      applyCircularLayout(nodes, width, height);
      break;
  }

  return { nodes, edges };
}

function applyHierarchicalLayout(nodes: ProvenanceVisualizationNode[], width: number, height: number) {
  // Group nodes by depth
  const depthGroups: { [depth: number]: ProvenanceVisualizationNode[] } = {};
  nodes.forEach(node => {
    if (!depthGroups[node.depth]) {
      depthGroups[node.depth] = [];
    }
    depthGroups[node.depth].push(node);
  });

  const depths = Object.keys(depthGroups).map(Number).sort((a, b) => a - b);
  const maxDepth = Math.max(...depths);
  
  depths.forEach((depth, _depthIndex) => {
    void _depthIndex; // Mark as intentionally unused
    const nodesAtDepth = depthGroups[depth];
    const y = (height / (maxDepth + 1)) * (depth + 1);
    
    nodesAtDepth.forEach((node, nodeIndex) => {
      const x = (width / (nodesAtDepth.length + 1)) * (nodeIndex + 1);
      node.x = x;
      node.y = y;
    });
  });
}

function applyForceLayout(
  nodes: ProvenanceVisualizationNode[], 
  edges: ProvenanceVisualizationEdge[], 
  width: number, 
  height: number
) {
  // Simple force-directed layout simulation
  // Initialize random positions
  nodes.forEach(node => {
    node.x = Math.random() * width;
    node.y = Math.random() * height;
  });

  // Run simulation iterations
  for (let i = 0; i < 100; i++) {
    // Repulsion between all nodes
    for (let j = 0; j < nodes.length; j++) {
      for (let k = j + 1; k < nodes.length; k++) {
        const node1 = nodes[j];
        const node2 = nodes[k];
        
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = 1000 / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        node1.x -= fx;
        node1.y -= fy;
        node2.x += fx;
        node2.y += fy;
      }
    }

    // Attraction along edges
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      
      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = distance * 0.01;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        source.x += fx;
        source.y += fy;
        target.x -= fx;
        target.y -= fy;
      }
    });

    // Keep nodes within bounds
    nodes.forEach(node => {
      node.x = Math.max(50, Math.min(width - 50, node.x));
      node.y = Math.max(50, Math.min(height - 50, node.y));
    });
  }
}

function applyCircularLayout(nodes: ProvenanceVisualizationNode[], width: number, height: number) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;
  
  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    node.x = centerX + radius * Math.cos(angle);
    node.y = centerY + radius * Math.sin(angle);
  });
}

function drawNodes(
  ctx: CanvasRenderingContext2D, 
  nodes: ProvenanceVisualizationNode[], 
  selectedNode: string | null,
  hoveredNode: string | null
) {
  nodes.forEach(node => {
    const isSelected = node.id === selectedNode;
    const isHovered = node.id === hoveredNode;
    
    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();
    
    // Draw border
    if (isSelected || isHovered) {
      ctx.strokeStyle = isSelected ? '#000' : '#666';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
    }
    
    // Draw label
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(node.entity_id, node.x, node.y + node.size + 15);
  });
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  edges: ProvenanceVisualizationEdge[]
) {
  edges.forEach(edge => {
    // This is a simplified version - in a real implementation,
    // we'd need to find the actual node positions
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = edge.width;
    ctx.beginPath();
    // Draw line between source and target nodes
    ctx.stroke();
  });
}

function findNodeAt(nodes: ProvenanceVisualizationNode[], x: number, y: number): ProvenanceVisualizationNode | null {
  for (const node of nodes) {
    const dx = x - node.x;
    const dy = y - node.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= node.size) {
      return node;
    }
  }
  return null;
}

function calculateBounds(nodes: ProvenanceVisualizationNode[]) {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  
  let minX = nodes[0].x;
  let maxX = nodes[0].x;
  let minY = nodes[0].y;
  let maxY = nodes[0].y;
  
  nodes.forEach(node => {
    minX = Math.min(minX, node.x - node.size);
    maxX = Math.max(maxX, node.x + node.size);
    minY = Math.min(minY, node.y - node.size);
    maxY = Math.max(maxY, node.y + node.size);
  });
  
  return { minX, maxX, minY, maxY };
}

function getNodeColor(operation: OperationType): string {
  const colorMap: Record<OperationType, string> = {
    [OperationType.CREATE]: '#10B981',
    [OperationType.UPDATE]: '#3B82F6',
    [OperationType.DELETE]: '#EF4444',
    [OperationType.TRANSFORM]: '#F59E0B',
    [OperationType.ANALYZE]: '#8B5CF6',
    [OperationType.PROCESS]: '#6B7280',
    [OperationType.EXPORT]: '#8B4513',
    [OperationType.IMPORT]: '#059669',
    [OperationType.AI_DECISION]: '#EC4899',
    [OperationType.USER_INTERACTION]: '#6366F1'
  };
  
  return colorMap[operation] || '#6B7280';
}
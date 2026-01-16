import React, { useMemo } from 'react';
import { useActiveSelections } from '@/stores/collaborationStore';
import type { Node, Edge } from '@xyflow/react';

interface UserSelectionsProps {
  view: 'daw' | 'theory';
  nodes: Node[];
  edges: Edge[];
  transform: [number, number, number];
}

interface UserSelectionOverlayProps {
  userId: string;
  userName: string;
  userColor: string;
  nodeIds: string[];
  edgeIds: string[];
  nodes: Node[];
  edges: Edge[];
  transform: [number, number, number];
}

const UserSelectionOverlay: React.FC<UserSelectionOverlayProps> = ({
  userId,
  userName,
  userColor,
  nodeIds,
  edgeIds,
  nodes,
  edges,
  transform,
}) => {
  const selectedNodes = useMemo(() =>
    nodes.filter(node => nodeIds.includes(node.id)),
    [nodes, nodeIds]
  );

  const selectedEdges = useMemo(() =>
    edges.filter(edge => edgeIds.includes(edge.id)),
    [edges, edgeIds]
  );

  if (selectedNodes.length === 0 && selectedEdges.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Node selection overlays */}
      {selectedNodes.map(node => {
        const bounds = getNodeBounds(node, transform);
        return (
          <div
            key={`${userId}-node-${node.id}`}
            className="absolute border-2"
            style={{
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
              height: bounds.height,
              borderColor: userColor,
              backgroundColor: `${userColor}20`,
              borderRadius: '8px',
            }}
          >
            {/* User indicator */}
            <div
              className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded"
              style={{ backgroundColor: userColor }}
            >
              {userName}
            </div>
          </div>
        );
      })}

      {/* Edge selection highlights */}
      {selectedEdges.map(edge => {
        return (
          <div
            key={`${userId}-edge-${edge.id}`}
            className="absolute"
            style={{
              border: `2px solid ${userColor}`,
              borderRadius: '2px',
            }}
          >
            <div
              className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded"
              style={{ backgroundColor: userColor }}
            >
              {userName}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Helper function to get node bounds including transform
function getNodeBounds(node: Node, transform: [number, number, number]) {
  const width = node.width || 150; // Default width
  const height = node.height || 100; // Default height

  // Apply transform to get screen coordinates
  const screenX = node.position.x * transform[2] + transform[0];
  const screenY = node.position.y * transform[2] + transform[1];

  return {
    left: screenX,
    top: screenY,
    width: width * transform[0],
    height: height * transform[0],
  };
}

export function UserSelections({ view, nodes, edges, transform }: UserSelectionsProps) {
  const activeSelections = useActiveSelections();

  const filteredSelections = useMemo(() => {
    return (activeSelections as any[]).filter((selection: any) =>
      selection.view === view &&
      selection.user &&
      selection.user.status !== 'away'
    );
  }, [activeSelections, view]);

  if (filteredSelections.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {filteredSelections.map(selection => (
        <UserSelectionOverlay
          key={selection.userId}
          userId={selection.userId}
          userName={selection.user?.name || 'Unknown'}
          userColor={selection.user?.color || '#6b7280'}
          nodeIds={selection.nodeIds}
          edgeIds={selection.edgeIds}
          nodes={nodes}
          edges={edges}
          transform={transform}
        />
      ))}
    </div>
  );
}
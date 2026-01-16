import React from 'react';
import type { FlowHierarchyNode } from '@/types/flow';

interface HierarchyViewProps {
  tree: FlowHierarchyNode[];
  selectedId?: string;
  onSelect: (nodeId: string) => void;
}

export default function HierarchyView({ tree, onSelect, selectedId }: HierarchyViewProps) {
  const renderNode = (node: FlowHierarchyNode) => (
    <li key={node.node.id}>
      <button
        onClick={() => onSelect(node.node.id)}
        className={`w-full text-left px-2 py-1 text-sm rounded ${
          selectedId === node.node.id ? 'bg-daw-accent-primary/20 text-daw-accent-primary' : 'text-daw-text-secondary hover:bg-daw-surface'
        }`}
      >
        {node.node.data.label}
        <span className="ml-2 text-xs uppercase text-daw-text-tertiary">{node.node.type}</span>
      </button>
      {node.children.length > 0 && (
        <ul className="ml-3 border-l border-daw-border pl-2 space-y-1">
          {node.children.map(child => renderNode(child))}
        </ul>
      )}
    </li>
  );

  if (tree.length === 0) {
    return <p className="text-sm text-daw-text-tertiary">No nodes yet.</p>;
  }

  return <ul className="space-y-1">{tree.map(node => renderNode(node))}</ul>;
}

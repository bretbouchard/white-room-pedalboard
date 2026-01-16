import React from 'react';
import { useFlowStore } from '@/stores/flowStore';
import NodeSpecificFields from './NodeSpecificFields';
import type { FlowNodeType } from '@/types/flow';

interface NodeInspectorProps {
  nodeId: string;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

export default function NodeInspector({ nodeId, onUpdate }: NodeInspectorProps) {
  const node = useFlowStore(state => {
    const view = state.activeView;
    return state[view].nodes.find(n => n.id === nodeId);
  });
  if (!node) {
    return <></>;
  }

  const baseFields = (
    <div className="space-y-2">
      <label className="block text-xs text-daw-text-secondary">
        Label
        <input
          className="mt-1 w-full rounded border border-daw-border bg-daw-surface px-2 py-1 text-sm"
          value={node.data.label}
          onChange={event => onUpdate(nodeId, { label: event.target.value })}
        />
      </label>
      <label className="block text-xs text-daw-text-secondary">
        Color
        <input
          type="color"
          className="mt-1 h-8 w-full rounded border border-daw-border"
          value={node.data.color as string | undefined ?? '#ffffff'}
          onChange={event => onUpdate(nodeId, { color: event.target.value })}
        />
      </label>
    </div>
  );

  return (
    <div className="rounded border border-daw-border bg-daw-surface p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-daw-text-primary">{node.data.label}</h3>
        <p className="text-xs text-daw-text-tertiary uppercase">{node.type}</p>
      </div>
      {baseFields}
      <NodeSpecificFields nodeType={node.type as FlowNodeType} data={node.data} onUpdate={data => onUpdate(nodeId, data)} />
    </div>
  );
}

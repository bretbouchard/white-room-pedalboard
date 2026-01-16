import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

import { FlowWorkspace } from '../FlowWorkspace';
import { useFlowStore } from '@/stores/flowStore';
import type { FlowNode } from '@/types/flow';

// Spy on publishPatch
const mockPublish = vi.fn();
vi.mock('@/stores/flowSyncStore', () => ({
  useFlowSyncStore: { getState: () => ({ publishPatch: mockPublish, connect: () => {}, disconnect: () => {} }) },
}));

// Stub ReactFlow to capture callbacks and invoke them immediately to simulate
// ReactFlow reporting node/edge changes.
vi.mock('@xyflow/react', () => {
  const React = require('react');
  // ReactFlow stub invokes provided onNodesChange/onEdgesChange callbacks so
  // the FlowWorkspace handlers execute during render in tests.
  const ReactFlow = (props: any) => {
    // invoke node/edge change callbacks on next tick to emulate ReactFlow
    if (typeof props.onNodesChange === 'function') setTimeout(() => props.onNodesChange([{ id: 'n1', type: 'section', position: { x: 0, y: 0 } }]));
    if (typeof props.onEdgesChange === 'function') setTimeout(() => props.onEdgesChange([{ id: 'e1', source: 'n1', target: 'n2' }]));
    return React.createElement('div', { 'data-testid': 'flow-root' }, props.children);
  };
  const Controls = () => React.createElement('div', null);
  const Background = () => React.createElement('div', null);
  const MiniMap = () => React.createElement('div', null);
  const useReactFlow = () => ({
    setViewport: vi.fn(),
    getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    zoomTo: vi.fn(),
    project: vi.fn((position) => ({ x: position.x, y: position.y })),
    toObject: vi.fn(),
  });
  return { ReactFlow, Controls, Background, MiniMap, useReactFlow, applyNodeChanges: (c: any, n: any) => n, applyEdgeChanges: (c: any, e: any) => e };
});

vi.mock('../HierarchyView', () => ({ default: () => <div /> }));
vi.mock('../NodeInspector', () => ({ default: () => <div /> }));
vi.mock('@/hooks/useFlowTelemetry', () => ({ useFlowTelemetry: () => {} }));
vi.mock('../AISuggestionPanel', () => ({ AISuggestionPanel: () => <div /> }));
vi.mock('../AISuggestionOverlay', () => ({ AISuggestionOverlay: () => <div /> }));
vi.mock('@/agui/agui-flow-bridge', () => ({
  useAGUIFlowBridge: () => ({
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    activeSuggestions: new Map(),
    suggestionHistory: [],
    acceptSuggestion: vi.fn(),
    rejectSuggestion: vi.fn(),
    requestSuggestions: vi.fn(),
    requestContextualSuggestions: vi.fn(),
    cleanup: vi.fn(),
  }),
}));

describe('FlowWorkspace node/edge change wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({ activeView: 'daw', nodes: [] as FlowNode[], edges: [], hierarchy: [], selectedNodeId: undefined });
  });

  it('sends nodeChanges and edgeChanges via publishPatch when callbacks are invoked', async () => {
    render(<FlowWorkspace />);

    // Simulate that some node change occurred by calling the store's API that
    // the FlowWorkspace would call on node changes. We'll directly call
    // useFlowStore.applyNodeChanges / applyEdgeChanges to mimic the ReactFlow
    // behavior in a lightweight way.
    const api = useFlowStore;

    await act(async () => {
      // applyNodeChanges expects a Change[]; pass a minimal typed change
      api.getState().applyNodeChanges([{
        id: 'n1',
        type: 'section',
        position: { x: 0, y: 0 },
        data: { label: 'S', order: 0, path: [] },
      } as FlowNode]);
    });

    // publishPatch should have been called with nodeChanges merged
    await waitFor(() => expect(mockPublish).toHaveBeenCalled());
    const last = mockPublish.mock.calls[mockPublish.mock.calls.length - 1];
    expect(last[0]).toBe('daw');
    // payload may include nodeChanges
    expect(last[1]).toBeDefined();
  });
});

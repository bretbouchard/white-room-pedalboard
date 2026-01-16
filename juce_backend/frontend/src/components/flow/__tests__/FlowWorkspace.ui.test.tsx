import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

// Render helper and store hooks
import { FlowWorkspace } from '../FlowWorkspace';
import { useFlowStore } from '@/stores/flowStore';
import type { FlowNode } from '../../../types/flow';

// Mock the flow sync store to spy on publishPatch calls.
const mockPublish = vi.fn();
vi.mock('@/stores/flowSyncStore', () => ({
  useFlowSyncStore: {
    getState: () => ({ publishPatch: mockPublish, connect: () => {}, disconnect: () => {} }),
  },
}));

// Mock ReactFlow and related UI subcomponents to keep the test lightweight.
vi.mock('@xyflow/react', () => {
  const React = require('react');
  const StubFlow: React.FC<any> = ({ children }) => React.createElement('div', null, children);
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
  return {
    ReactFlow: StubFlow,
    Controls: () => React.createElement('div', null),
    Background: () => React.createElement('div', null),
    MiniMap: () => React.createElement('div', null),
    useReactFlow,
    applyNodeChanges: (changes: any, nodes: any[]) => nodes,
    applyEdgeChanges: (changes: any, edges: any[]) => edges,
  };
});

// Mock internal child components
vi.mock('../HierarchyView', () => ({ default: ({ tree, onSelect }: any) => <div data-testid="hierarchy" /> }));
vi.mock('../NodeInspector', () => ({ default: ({ nodeId }: any) => <div data-testid="inspector">{nodeId}</div> }));
vi.mock('@/hooks/useFlowTelemetry', () => ({ useFlowTelemetry: () => {} }));

describe('FlowWorkspace UI integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({
      activeView: 'daw',
      daw: { nodes: [], edges: [] },
      theory: { nodes: [], edges: [] },
      hierarchy: [],
      selectedNodeId: undefined,
    });
  });

  it('calls publishPatch when quick actions are used', async () => {
    render(<FlowWorkspace />);

    // Add Section
    const addSection = screen.getByText('Add Section');
    await act(async () => {
      fireEvent.click(addSection);
    });
    expect(mockPublish).toHaveBeenCalled();
    let lastCall = mockPublish.mock.calls[mockPublish.mock.calls.length - 1];
    expect(lastCall[0]).toBe('daw');
    expect(lastCall[1]).toHaveProperty('addedNodes');
    expect(lastCall[1].addedNodes[0].type).toBe('section');

    // Add Track
    const addTrack = screen.getByText('Add Track');
    await act(async () => fireEvent.click(addTrack));
    lastCall = mockPublish.mock.calls[mockPublish.mock.calls.length - 1];
    expect(lastCall[0]).toBe('daw');
    expect(lastCall[1]).toHaveProperty('addedNodes');
    expect(lastCall[1].addedNodes[0].type).toBe('track');

    // Delete (disabled initially)
    const deleteBtn = screen.getAllByText('Delete Selected')[0] as HTMLButtonElement;
    expect(deleteBtn.disabled).toBe(true);

    // Select a node and delete
    await act(async () => {
      const node: FlowNode = { id: 'n1', type: 'section', position: { x: 0, y: 0 }, data: { type: 'section', label: 'S', order: 0, path: [], sectionType: 'verse', startBar: 0, lengthBars: 8 } };
      useFlowStore.setState(state => ({ daw: { ...state.daw, nodes: [node] }, selectedNodeId: 'n1' }));
    });

    const deleteBtn2 = screen.getAllByText('Delete Selected').find(b => !(b as HTMLButtonElement).disabled) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(deleteBtn2);
    });
    lastCall = mockPublish.mock.calls[mockPublish.mock.calls.length - 1];
    expect(lastCall[0]).toBe('daw');
    expect(lastCall[1]).toEqual({ removedNodes: ['n1'] });
  });
});
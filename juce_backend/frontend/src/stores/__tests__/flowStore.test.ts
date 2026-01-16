import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { useFlowStore } from '../flowStore';
import type { NewFlowNodeInput, FlowNode } from '../../types/flow';

describe('flowStore dual-view operations', () => {
  beforeEach(() => {
    act(() => {
      useFlowStore.setState({
        daw: { nodes: [], edges: [] },
        theory: { nodes: [], edges: [] },
        activeView: 'daw',
        hierarchy: [],
        selectedNodeId: undefined,
        snapshot: { version: 0, generatedAt: '', nodes: [], edges: [], hierarchy: [] },
        version: 0,
      });
    });
  });

  it('adds and removes nodes in daw view', () => {
    const s = useFlowStore.getState();
    act(() => {
      s.setActiveView('daw');
    });

    let node: FlowNode | undefined;
    act(() => {
      node = s.addNode({ type: 'track', data: { label: 'Track 1' } } as NewFlowNodeInput<'track'>);
    });

    let nodes = useFlowStore.getState().daw.nodes;
    expect(nodes.length).toBe(1);
    expect(nodes[0].id).toBe(node?.id);

    act(() => {
      s.removeNode(node!.id);
    });

    nodes = useFlowStore.getState().daw.nodes;
    expect(nodes.length).toBe(0);
  });

  it('adds and removes nodes in theory view', () => {
    const s = useFlowStore.getState();
    act(() => {
      s.setActiveView('theory');
    });

    let node: FlowNode | undefined;
    act(() => {
      node = s.addNode({ type: 'chord', data: { label: 'Chord C' } } as NewFlowNodeInput<'chord'>);
    });

    const nodes = useFlowStore.getState().theory.nodes;
    expect(nodes.length).toBe(1);
    expect(nodes[0].id).toBe(node?.id);

    act(() => {
      useFlowStore.getState().removeNode(node!.id);
    });

    expect(useFlowStore.getState().theory.nodes.length).toBe(0);
  });

  it('adds edges to correct view', () => {
    const s = useFlowStore.getState();
    act(() => {
      s.setActiveView('daw');
    });

    let t1: FlowNode | undefined;
    let t2: FlowNode | undefined;
    act(() => {
      t1 = s.addNode({ type: 'track', data: { label: 'A' } } as NewFlowNodeInput<'track'>);
      t2 = s.addNode({ type: 'track', data: { label: 'B' } } as NewFlowNodeInput<'track'>);
      s.addEdge({ source: t1!.id, target: t2!.id, data: { type: 'signal' } });
    });

    let edges = useFlowStore.getState().daw.edges;
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe(t1!.id);

    act(() => {
      s.setActiveView('theory');
      s.addEdge({ source: 'x', target: 'y', data: { type: 'analysis' } });
    });

    edges = useFlowStore.getState().theory.edges;
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe('x');
  });
});

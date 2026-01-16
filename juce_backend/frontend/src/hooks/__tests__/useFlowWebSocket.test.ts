import { describe, it, expect, beforeEach } from 'vitest';
import { useFlowStore } from '@/stores/flowStore';
import createFlowWebSocket from '../useFlowWebSocket';
import type { FlowSnapshot } from '@/types/flow';

describe('useFlowWebSocket handler', () => {
  beforeEach(() => {
    useFlowStore.getState().clear();
  });

  it('applies full sync payload to daw store', () => {
    const api = createFlowWebSocket('test');
    const snapshot = {
      version: 1,
      generatedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'n1',
          type: 'track',
          position: { x: 0, y: 0 },
          data: { label: 'T1', order: 0, path: ['n1'] },
        },
      ],
      edges: [],
      hierarchy: [],
  } as FlowSnapshot;

    api.handleMessage({ id: 'm1', type: 'flow_full_sync', view: 'daw', payload: snapshot });

    const state = useFlowStore.getState();
    expect(state.daw.nodes.length).toBe(1);
    expect(state.daw.nodes[0].id).toBe('n1');
  });
});

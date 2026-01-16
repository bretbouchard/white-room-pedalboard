import { useWebSocketStore } from '@/stores/websocketStore';
import { useFlowStore } from '@/stores/flowStore';
import type { FlowSnapshot, FlowNode, FlowEdge } from '@/types/flow';
import type { NodeChange, EdgeChange } from '@xyflow/react';

export type FlowWSMessage = {
  id: string;
  type: 'flow_patch' | 'flow_full_sync' | 'heartbeat' | string;
  timestamp: string;
  view: 'daw' | 'theory';
  payload: unknown;
};

/**
 * Factory that wires the WebSocket store to the Flow store.
 * Returns a small API to connect/disconnect and publish local patches.
 */
export function createFlowWebSocket(flowId = 'default-flow') {
  const ws = useWebSocketStore.getState();

  let unsub: (() => void) | null = null;

  function handleMessage(message: unknown) {
    if (!message || typeof message !== 'object') return;
    const m = message as Partial<FlowWSMessage>;
    if (!m.type) return;

    if (m.type === 'flow_full_sync' && m.payload) {
      const snap = m.payload as FlowSnapshot;
      if (m.view === 'daw') {
        useFlowStore.getState().setDAWNodes(snap.nodes || []);
        useFlowStore.getState().setDAWEdges(snap.edges || []);
      } else {
        useFlowStore.getState().setTheoryNodes(snap.nodes || []);
        useFlowStore.getState().setTheoryEdges(snap.edges || []);
      }
      return;
    }

    if (m.type === 'flow_patch' && m.payload && typeof m.payload === 'object') {
      const payload = m.payload as Record<string, unknown>;
      const nodeChanges = payload.nodeChanges as unknown | undefined;
      const edgeChanges = payload.edgeChanges as unknown | undefined;
      const nodes = payload.nodes as unknown[] | undefined;
      const edges = payload.edges as unknown[] | undefined;

      if (nodeChanges) {
        try {
          useFlowStore.getState().applyNodeChanges(nodeChanges as unknown as NodeChange[]);
        } catch (e) {
          console.warn('Failed applying nodeChanges', e);
        }
      }
      if (edgeChanges) {
        try {
          useFlowStore.getState().applyEdgeChanges(edgeChanges as unknown as EdgeChange[]);
        } catch (e) {
          console.warn('Failed applying edgeChanges', e);
        }
      }

      if (nodes) {
        const nodeArr = nodes as unknown as FlowNode[];
        if (m.view === 'daw') useFlowStore.getState().setDAWNodes(nodeArr);
        else useFlowStore.getState().setTheoryNodes(nodeArr);
      }
      if (edges) {
        const edgeArr = edges as unknown as FlowEdge[];
        if (m.view === 'daw') useFlowStore.getState().setDAWEdges(edgeArr);
        else useFlowStore.getState().setTheoryEdges(edgeArr);
      }
    }
  }

  function connect(url?: string) {
    ws.connect(url);
    unsub = ws.subscribe((message) => {
      handleMessage(message);
    });
  }

  function disconnect() {
    if (unsub) {
      unsub();
      unsub = null;
    }
    ws.disconnect();
  }

  function sendLocalPatch(view: 'daw' | 'theory', payload: unknown) {
    const message: FlowWSMessage = {
      id: `flow_${flowId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: 'flow_patch',
      timestamp: new Date().toISOString(),
      view,
      payload,
    };
    ws.sendMessage('flow', message);
  }

  return {
    connect,
    disconnect,
    sendLocalPatch,
    handleMessage, // exported for testing
  };
}

export default createFlowWebSocket;

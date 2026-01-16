import { useEffect } from 'react';
import { useFlowStore } from '@/stores/flowStore';
import { AGUIEventsClient } from '@/agui/agui-events-client';
import { isCopilotEnabled } from '@/config/copilot';
import { useCopilotReadable as realUseCopilotReadable } from '@copilotkit/react-core';
import { shallow } from 'zustand/shallow';

let client: AGUIEventsClient | null = null;

const noopReadable: typeof realUseCopilotReadable = () => undefined;
const useCopilotReadable = isCopilotEnabled ? realUseCopilotReadable : noopReadable;

function ensureClient(): AGUIEventsClient | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!client) {
    // Temporarily disabled due to missing backend endpoint
    client = {
      sendAuditEvent: async (event: any) => {
        console.warn('AGUI events disabled - endpoint not implemented');
      },
      eventsUrl: '',
      customPiiPatterns: [],
      eventQueue: [],
      isOnline: true,
      isProcessingQueue: false,
      goOnline: () => {},
      goOffline: () => {}
    } as unknown as AGUIEventsClient;
  }
  return client;
}

export function useFlowTelemetry(): void {
  const flowData = useFlowStore(
    state => ({
      activeView: state.activeView,
      nodes: (state as any)[state.activeView].nodes,
      edges: (state as any)[state.activeView].edges,
      version: state.version
    })
  ) as {
    activeView: string;
    nodes: any[];
    edges: any[];
    version: number;
  };

  useEffect(() => {
    const eventsClient = ensureClient();
    if (!eventsClient) {
      return;
    }
    eventsClient
      .sendAuditEvent({
        type: 'flow:snapshot',
        payload: { nodes: flowData.nodes, edges: flowData.edges, version: flowData.version },
        metadata: {
          version: flowData.version,
        },
      })
      .catch(error => {
        console.warn('Failed to send flow snapshot', error);
      });
  }, [flowData.nodes, flowData.edges, flowData.version]);

  useCopilotReadable({
    description: 'Current audio-agent flow graph snapshot',
    value: { nodes: flowData.nodes, edges: flowData.edges, version: flowData.version }
  });
}

import { useCallback, useRef, useState, useEffect } from 'react';
import { useAGUIBridge, type AGUIEvent } from './agui-bridge';
import { useFlowStore } from '@/stores/flowStore';
import { useFlowSyncStore } from '@/stores/flowSyncStore';
import type { FlowNode, FlowNodeType, XYPosition } from '@/types/flow';

//================================================================================================
// Flow-Specific AGUI Event Types
//================================================================================================

export interface FlowSuggestionEvent extends AGUIEvent {
  type: 'node-suggestion' | 'connection-recommendation' | 'flow-optimization' | 'parameter-suggestion' | 'workflow-improvement';
  payload: {
    confidence: number; // 0-1
    reasoning: string;
    suggestion: NodeSuggestion | ConnectionSuggestion | FlowOptimization | ParameterSuggestion | WorkflowImprovement;
    context?: Record<string, any>;
  };
}

export interface NodeSuggestion {
  nodeType: FlowNodeType;
  position: XYPosition;
  data: Partial<FlowNode['data']>;
  parentId?: string;
  reason: string;
}

export interface ConnectionSuggestion {
  sourceId: string;
  targetId: string;
  connectionType: 'signal' | 'control' | 'arrangement' | 'analysis';
  reason: string;
}

export interface FlowOptimization {
  type: 'layout' | 'performance' | 'organization';
  changes: {
    nodePositions?: Record<string, XYPosition>;
    nodeRemovals?: string[];
    edgeRemovals?: string[];
    edgeOptimizations?: Array<{ id: string; type: string; }>;
  };
  reason: string;
}

export interface ParameterSuggestion {
  nodeId: string;
  parameters: Record<string, any>;
  reason: string;
}

export interface WorkflowImprovement {
  suggestions: Array<{
    type: 'add_nodes' | 'remove_nodes' | 'reorganize' | 'optimize_connections';
    description: string;
    impact: 'high' | 'medium' | 'low';
    changes: any;
  }>;
  reasoning: string;
}

export interface UserFeedback {
  suggestionId: string;
  action: 'accept' | 'reject' | 'modify';
  feedback?: string;
  timestamp: number;
}

//================================================================================================
// AGUI Flow Bridge Hook
//================================================================================================

interface AGUIFlowBridgeOptions {
  onSuggestion?: (suggestion: FlowSuggestionEvent) => void;
  onUserFeedback?: (feedback: UserFeedback) => void;
  enableAutoLayout?: boolean;
  enableSmartSuggestions?: boolean;
  suggestionTimeout?: number;
}

const DEFAULT_SUGGESTION_TIMEOUT = 30000; // 30 seconds

export const useAGUIFlowBridge = ({
  onSuggestion,
  onUserFeedback,
  enableAutoLayout = true,
  enableSmartSuggestions = true,
  suggestionTimeout = DEFAULT_SUGGESTION_TIMEOUT,
}: AGUIFlowBridgeOptions = {}) => {
  // Temporarily disabled AGUI Bridge due to missing backend endpoint
  const AGUI_BRIDGE_DISABLED = true;

  // Mock AGUI Bridge state when disabled
  const mockIsConnected = false;
  const mockConnect = () => console.log('AGUI Bridge disabled - /api/agui/stream endpoint not implemented');
  const mockDisconnect = () => console.log('AGUI Bridge disabled');

  const aguiBridge = useAGUIBridge({
    streamUrl: '/api/agui/stream',
    onEvent: handleAGUIEvent,
  });

  const { isConnected, connect, disconnect } = AGUI_BRIDGE_DISABLED
    ? { isConnected: mockIsConnected, connect: mockConnect, disconnect: mockDisconnect }
    : aguiBridge;

  const [activeSuggestions, setActiveSuggestions] = useState<Map<string, FlowSuggestionEvent>>(new Map());
  const [suggestionHistory, setSuggestionHistory] = useState<FlowSuggestionEvent[]>([]);
  const suggestionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const flowStore = useFlowStore();
  const flowSyncStore = useFlowSyncStore();

  // Clear suggestion timeout
  const clearSuggestionTimeout = useCallback((suggestionId: string) => {
    const timeout = suggestionTimeouts.current.get(suggestionId);
    if (timeout) {
      clearTimeout(timeout);
      suggestionTimeouts.current.delete(suggestionId);
    }
  }, []);

  // Set suggestion timeout
  const setSuggestionTimeout = useCallback((suggestionId: string) => {
    clearSuggestionTimeout(suggestionId);

    const timeout = setTimeout(() => {
      setActiveSuggestions(prev => {
        const newMap = new Map(prev);
        const suggestion = newMap.get(suggestionId);
        if (suggestion) {
          newMap.delete(suggestionId);
          setSuggestionHistory(history => [...history, suggestion]);
        }
        return newMap;
      });
      suggestionTimeouts.current.delete(suggestionId);
    }, suggestionTimeout);

    suggestionTimeouts.current.set(suggestionId, timeout);
  }, [clearSuggestionTimeout, suggestionTimeout]);

  // Handle incoming AGUI events
  function handleAGUIEvent(event: AGUIEvent | Error) {
    if (event instanceof Error) {
      console.error('AGUI Flow Bridge: Error received', event);
      return;
    }

    const flowEvent = event as FlowSuggestionEvent;

    // Handle flow-specific suggestions
    if (isFlowSuggestionEvent(flowEvent)) {
      handleFlowSuggestion(flowEvent);
    }
  }

  // Check if event is a flow suggestion
  function isFlowSuggestionEvent(event: AGUIEvent): event is FlowSuggestionEvent {
    return [
      'node-suggestion',
      'connection-recommendation',
      'flow-optimization',
      'parameter-suggestion',
      'workflow-improvement'
    ].includes(event.type);
  }

  // Handle flow suggestions
  const handleFlowSuggestion = useCallback((suggestion: FlowSuggestionEvent) => {
    const suggestionId = `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const enrichedSuggestion: FlowSuggestionEvent = {
      ...suggestion,
      id: suggestionId,
      timestamp: Date.now(),
    };

    // Add to active suggestions
    setActiveSuggestions(prev => new Map(prev).set(suggestionId, enrichedSuggestion));
    setSuggestionTimeout(suggestionId);

    // Notify callback
    onSuggestion?.(enrichedSuggestion);

    console.log('AGUI Flow Bridge: Received flow suggestion', enrichedSuggestion);
  }, [onSuggestion, setSuggestionTimeout]);

  // Accept a suggestion
  const acceptSuggestion = useCallback((suggestionId: string) => {
    const suggestion = activeSuggestions.get(suggestionId);
    if (!suggestion) return;

    clearSuggestionTimeout(suggestionId);

    try {
      switch (suggestion.type) {
        case 'node-suggestion':
          acceptNodeSuggestion(suggestion);
          break;
        case 'connection-recommendation':
          acceptConnectionSuggestion(suggestion);
          break;
        case 'flow-optimization':
          acceptFlowOptimization(suggestion);
          break;
        case 'parameter-suggestion':
          acceptParameterSuggestion(suggestion);
          break;
        case 'workflow-improvement':
          acceptWorkflowImprovement(suggestion);
          break;
      }

      // Record user feedback
      recordUserFeedback({
        suggestionId,
        action: 'accept',
        timestamp: Date.now(),
      });

      // Remove from active suggestions and add to history
      setActiveSuggestions(prev => {
        const newMap = new Map(prev);
        newMap.delete(suggestionId);
        return newMap;
      });

      setSuggestionHistory(prev => [...prev, suggestion]);

    } catch (error) {
      console.error('AGUI Flow Bridge: Error accepting suggestion', error);
    }
  }, [activeSuggestions, clearSuggestionTimeout]);

  // Reject a suggestion
  const rejectSuggestion = useCallback((suggestionId: string, feedback?: string) => {
    clearSuggestionTimeout(suggestionId);

    const suggestion = activeSuggestions.get(suggestionId);
    if (suggestion) {
      // Record user feedback
      recordUserFeedback({
        suggestionId,
        action: 'reject',
        feedback,
        timestamp: Date.now(),
      });

      // Remove from active suggestions and add to history
      setActiveSuggestions(prev => {
        const newMap = new Map(prev);
        newMap.delete(suggestionId);
        return newMap;
      });

      setSuggestionHistory(prev => [...prev, suggestion]);
    }
  }, [activeSuggestions, clearSuggestionTimeout]);

  // Record user feedback
  const recordUserFeedback = useCallback((feedback: UserFeedback) => {
    // Send feedback to backend for learning
    fetch('/api/agui/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    }).catch(error => {
      console.error('AGUI Flow Bridge: Failed to send feedback', error);
    });

    onUserFeedback?.(feedback);
  }, [onUserFeedback]);

  // Implement different suggestion acceptance handlers
  const acceptNodeSuggestion = useCallback((suggestion: FlowSuggestionEvent) => {
    const nodeSuggestion = suggestion.payload.suggestion as NodeSuggestion;
    const data = nodeSuggestion.data as Record<string, any>; // Cast to record for safety
    const newNode = flowStore.addNode({
      type: nodeSuggestion.nodeType,
      position: nodeSuggestion.position,
      data: (() => {
        const baseData = {
          label: data.label || `AI: ${nodeSuggestion.nodeType}`,
          order: 0,
          path: [],
          type: nodeSuggestion.nodeType as any, // Cast to any to bypass type checking for now
        };

        switch (nodeSuggestion.nodeType) {
          case 'song':
            return {
              ...baseData,
              tempo: (data.tempo as number) || 120,
              key: (data.key as string) || 'C',
              timeSignature: (data.timeSignature as string) || '4/4',
              lengthBars: (data.lengthBars as number) || 32,
            };
          case 'track':
            return {
              ...baseData,
              trackType: (data.trackType as string) || 'audio',
              channel: (data.channel as number) || 1,
              instrument: (data.instrument as string),
              busId: (data.busId as string),
            };
          case 'section':
            return {
              ...baseData,
              sectionType: (data.sectionType as string) || 'verse',
              startBar: (data.startBar as number) || 1,
              lengthBars: (data.lengthBars as number) || 8,
            };
          case 'clip':
            return {
              ...baseData,
              sourceType: (data.sourceType as string) || 'audio',
              startBeat: (data.startBeat as number) || 1,
              lengthBeats: (data.lengthBeats as number) || 4,
              fileName: (data.fileName as string),
            };
          case 'bus':
            return {
              ...baseData,
              busType: (data.busType as string) || 'group',
            };
          case 'effect':
            return {
              ...baseData,
              pluginName: (data.pluginName as string) || 'Unknown',
              bypassed: (data.bypassed as boolean) ?? false,
              mix: (data.mix as number) ?? 100,
              targetTrackId: (data.targetTrackId as string) || '',
            };
          case 'analyzer':
            return {
              ...baseData,
              metric: (data.metric as string) || 'lufs',
              windowMs: (data.windowMs as number) || 1000,
              targetTrackId: (data.targetTrackId as string) || '',
            };
          case 'automation':
            return {
              ...baseData,
              parameterId: (data.parameterId as string) || 'volume',
              targetId: (data.targetId as string) || '',
              range: (data.range as [number, number]) || [0, 1],
            };
          case 'theory_concept':
            return {
              ...baseData,
              conceptName: (data.conceptName as string) || 'Concept',
            };
          case 'chord':
            return {
              ...baseData,
              chordName: (data.chordName as string) || 'C',
              notes: (data.notes as string[]) || ['C', 'E', 'G'],
            };
          case 'scale':
            return {
              ...baseData,
              scaleName: (data.scaleName as string) || 'Major',
              notes: (data.notes as string[]) || ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
            };
          case 'motif':
            return {
              ...baseData,
              motifPattern: (data.motifPattern as string) || 'pattern',
            };
          case 'progression':
            return {
              ...baseData,
              progression: (data.progression as string[]) || ['I', 'IV', 'V'],
            };
          default:
            return baseData;
        }
      })(),
    });

    // Sync with other users
    try {
      flowSyncStore.publishPatch(flowStore.activeView, {
        addedNodes: [newNode]
      });
    } catch (err) {
      console.debug('Failed to sync AI suggestion', err);
    }
  }, [flowStore, flowSyncStore]);

  const acceptConnectionSuggestion = useCallback((suggestion: FlowSuggestionEvent) => {
    const connSuggestion = suggestion.payload.suggestion as ConnectionSuggestion;
    const newEdge = flowStore.addEdge({
      source: connSuggestion.sourceId,
      target: connSuggestion.targetId,
      data: { type: connSuggestion.connectionType },
    });

    // Sync with other users
    try {
      flowSyncStore.publishPatch(flowStore.activeView, {
        addedEdges: [newEdge]
      });
    } catch (err) {
      console.debug('Failed to sync AI connection suggestion', err);
    }
  }, [flowStore, flowSyncStore]);

  const acceptFlowOptimization = useCallback((suggestion: FlowSuggestionEvent) => {
    const optimization = suggestion.payload.suggestion as FlowOptimization;

    // Apply optimization changes
    if (enableAutoLayout && optimization.changes.nodePositions) {
      Object.entries(optimization.changes.nodePositions).forEach(([nodeId, position]) => {
        flowStore.updateNodeData(nodeId, { position } as any);
      });
    }

    // Sync changes
    flowSyncStore.flush(flowStore.activeView);
  }, [flowStore, flowSyncStore, enableAutoLayout]);

  const acceptParameterSuggestion = useCallback((suggestion: FlowSuggestionEvent) => {
    const paramSuggestion = suggestion.payload.suggestion as ParameterSuggestion;
    flowStore.updateNodeData(paramSuggestion.nodeId, paramSuggestion.parameters);

    // Sync changes
    flowSyncStore.flush(flowStore.activeView);
  }, [flowStore, flowSyncStore]);

  const acceptWorkflowImprovement = useCallback((suggestion: FlowSuggestionEvent) => {
    const improvement = suggestion.payload.suggestion as WorkflowImprovement;

    // Apply improvement suggestions (complex implementation)
    improvement.suggestions.forEach(s => {
      switch (s.type) {
        case 'add_nodes':
          // Add multiple nodes based on suggestion
          break;
        case 'remove_nodes':
          // Remove nodes
          break;
        case 'reorganize':
          // Reorganize flow structure
          break;
        case 'optimize_connections':
          // Optimize connections
          break;
      }
    });

    // Sync all changes
    flowSyncStore.flush(flowStore.activeView);
  }, [flowStore, flowSyncStore]);

  // Request AI suggestions for current flow context
  const requestSuggestions = useCallback((type?: FlowSuggestionEvent['type']) => {
    const context = {
      activeView: flowStore.activeView,
      nodes: flowStore[flowStore.activeView].nodes,
      edges: flowStore[flowStore.activeView].edges,
      selectedNodeId: flowStore.selectedNodeId,
      hierarchy: flowStore.hierarchy,
    };

    fetch('/api/agui/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, type }),
    }).catch(error => {
      console.error('AGUI Flow Bridge: Failed to request suggestions', error);
    });
  }, [flowStore]);

  // Auto-request suggestions based on context changes
  const requestContextualSuggestions = useCallback(() => {
    if (!enableSmartSuggestions) return;

    const context = {
      activeView: flowStore.activeView,
      nodes: flowStore[flowStore.activeView].nodes,
      edges: flowStore[flowStore.activeView].edges,
      selectedNodeId: flowStore.selectedNodeId,
      hierarchy: flowStore.hierarchy,
    };

    // Determine what type of suggestions would be most helpful
    let suggestionType: FlowSuggestionEvent['type'] | undefined;

    // If no nodes, suggest basic workflow elements
    if (context.nodes.length === 0) {
      suggestionType = 'node-suggestion';
    }
    // If user selected a node, suggest parameter or connection improvements
    else if (context.selectedNodeId) {
      const selectedNode = context.nodes.find(n => n.id === context.selectedNodeId);
      if (selectedNode) {
        // For tracks, suggest clips or connections
        if (selectedNode.type === 'track') {
          const hasClips = context.nodes.some(n => n.data.parentId === selectedNode.id);
          if (!hasClips) {
            suggestionType = 'node-suggestion';
          } else {
            suggestionType = 'connection-recommendation';
          }
        }
        // For songs, suggest structure improvements
        else if (selectedNode.type === 'song') {
          suggestionType = 'workflow-improvement';
        }
        // For selected nodes, always consider parameter suggestions
        else {
          suggestionType = 'parameter-suggestion';
        }
      }
    }
    // If no connections, suggest relationships
    else if (context.edges.length === 0 && context.nodes.length > 1) {
      suggestionType = 'connection-recommendation';
    }
    // If nodes are disorganized, suggest layout optimization
    else {
      suggestionType = 'flow-optimization';
    }

    requestSuggestions(suggestionType);
  }, [flowStore, enableSmartSuggestions, requestSuggestions]);

  // Auto-trigger contextual suggestions on significant state changes
  useEffect(() => {
    if (!enableSmartSuggestions || !isConnected) return;

    const debounceTimer = setTimeout(() => {
      requestContextualSuggestions();
    }, 1000); // Debounce to avoid excessive API calls

    return () => clearTimeout(debounceTimer);
  }, [
    flowStore.activeView,
    flowStore.selectedNodeId,
    flowStore[flowStore.activeView].nodes.length,
    flowStore[flowStore.activeView].edges.length,
    enableSmartSuggestions,
    isConnected,
    requestContextualSuggestions
  ]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    suggestionTimeouts.current.forEach(timeout => clearTimeout(timeout));
    suggestionTimeouts.current.clear();
  }, []);

  return {
    // Connection state
    isConnected,
    connect,
    disconnect,

    // Suggestions
    activeSuggestions,
    suggestionHistory,
    acceptSuggestion,
    rejectSuggestion,
    requestSuggestions,
    requestContextualSuggestions,

    // Cleanup
    cleanup,
  };
};

//================================================================================================
// Utility Functions
//================================================================================================

export function createNodeSuggestion(
  nodeType: FlowNodeType,
  position: XYPosition,
  data: Partial<FlowNode['data']>,
  confidence: number,
  reasoning: string
): FlowSuggestionEvent {
  return {
    type: 'node-suggestion',
    timestamp: Date.now(),
    payload: {
      confidence,
      reasoning,
      suggestion: {
        nodeType,
        position,
        data,
        reason: reasoning,
      },
    },
  };
}

export function createConnectionSuggestion(
  sourceId: string,
  targetId: string,
  connectionType: 'signal' | 'control' | 'arrangement' | 'analysis',
  confidence: number,
  reasoning: string
): FlowSuggestionEvent {
  return {
    type: 'connection-recommendation',
    timestamp: Date.now(),
    payload: {
      confidence,
      reasoning,
      suggestion: {
        sourceId,
        targetId,
        connectionType,
        reason: reasoning,
      },
    },
  };
}

export function createFlowOptimizationSuggestion(
  optimization: FlowOptimization,
  confidence: number,
  reasoning: string
): FlowSuggestionEvent {
  return {
    type: 'flow-optimization',
    timestamp: Date.now(),
    payload: {
      confidence,
      reasoning,
      suggestion: optimization,
    },
  };
}
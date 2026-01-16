import { useEffect, useRef, useCallback } from 'react';
import { useFlowStore } from '@/stores/flowStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  createNodeAddOperation,
  createNodeRemoveOperation,
  createNodeUpdateOperation,
  createEdgeAddOperation,
  createEdgeRemoveOperation,
  createEdgeUpdateOperation,
  OperationEngine,
  operationsConflict,
} from '@/lib/collaboration/operational-transforms';
import type { Operation as CollaborationOperation } from '@/stores/collaborationStore';
import type { Operation } from '@/lib/collaboration/operational-transforms';
import type { NodeChange, EdgeChange } from '@xyflow/react';

/**
 * Hook for managing real-time collaboration in the flow system
 */
export function useCollaboration() {
  const {
    currentSession,
    currentUser,
    isHost,
    users,
    cursors,
    selections,
    updateCursor,
    updateSelection,
    sendOperation,
    applyOperation,
    addActivity,
  } = useCollaborationStore();

  const activeView = useFlowStore(state => state.activeView);
  const nodes = useFlowStore(state => state[activeView]);
  const edges = useFlowStore(state => state[activeView]);
  const { sendMessage } = useWebSocket();

  const operationEngineRef = useRef(new OperationEngine());
  const lastSyncRef = useRef<number>(0);

  // Transform and send flow changes
  const transformAndSendChange = useCallback((
    type: 'node' | 'edge',
    change: NodeChange | EdgeChange,
    data?: any
  ) => {
    if (!currentUser || !currentSession) return;

    let operation: Operation | null = null;

    if (type === 'node') {
      const nodeChange = change as NodeChange;
      switch (nodeChange.type) {
        case 'add':
          operation = createNodeAddOperation(
            currentUser.id,
            nodeChange.item,
            activeView,
            operationEngineRef.current.getRevision()
          );
          break;

        case 'remove':
          operation = createNodeRemoveOperation(
            currentUser.id,
            nodeChange.id,
            activeView,
            operationEngineRef.current.getRevision()
          );
          break;

        case 'position':
        case 'dimensions':
        case 'replace':
          operation = createNodeUpdateOperation(
            currentUser.id,
            nodeChange.id,
            { ...nodeChange, ...(data || {}) },
            activeView,
            operationEngineRef.current.getRevision()
          );
          break;

        default:
          console.debug('Unhandled node change type:', nodeChange.type);
      }
    } else if (type === 'edge') {
      const edgeChange = change as EdgeChange;
      switch (edgeChange.type) {
        case 'add':
          operation = createEdgeAddOperation(
            currentUser.id,
            edgeChange.item,
            activeView,
            operationEngineRef.current.getRevision()
          );
          break;

        case 'remove':
          operation = createEdgeRemoveOperation(
            currentUser.id,
            edgeChange.id,
            activeView,
            operationEngineRef.current.getRevision()
          );
          break;

        case 'replace':
          operation = createEdgeUpdateOperation(
            currentUser.id,
            edgeChange.id,
            { ...edgeChange, ...(data || {}) },
            activeView,
            operationEngineRef.current.getRevision()
          );
          break;

        default:
          console.debug('Unhandled edge change type:', edgeChange.type);
      }
    }

    if (operation) {
      const { id, timestamp, ...operationWithoutId } = operation;
      sendOperation(operationWithoutId as Omit<CollaborationOperation, 'id' | 'timestamp'>);
      addActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userColor: currentUser.color,
        type: 'edit',
        data: { operationType: operation.type, targetId: operation.data.id || operation.data.nodeId || operation.data.edgeId },
      });
    }
  }, [currentUser, currentSession, activeView, sendOperation, addActivity]);

  // Track cursor position
  const trackCursor = useCallback((position: { x: number; y: number }) => {
    if (!currentUser) return;

    updateCursor({
      x: position.x,
      y: position.y,
      view: activeView,
    });
  }, [currentUser, activeView, updateCursor]);

  // Track selection
  const trackSelection = useCallback((selectedNodeIds: string[], selectedEdgeIds: string[]) => {
    if (!currentUser) return;

    updateSelection({
      nodeIds: selectedNodeIds,
      edgeIds: selectedEdgeIds,
      view: activeView,
    });
  }, [currentUser, activeView, updateSelection]);

  // Apply received operations to local state
  const applyReceivedOperation = useCallback((operation: Operation) => {
    const currentState = {
      nodes: nodes[activeView],
      edges: edges[activeView],
    };

    // Check for conflicts
    const hasConflict = operationsConflict(operation, {
      id: 'local',
      type: 'noop',
      userId: currentUser?.id || 'unknown',
      timestamp: Date.now(),
      revision: operationEngineRef.current.getRevision(),
      view: activeView,
      data: {},
    });

    if (hasConflict) {
      console.warn('Operation conflict detected:', operation);
      addActivity({
        userId: operation.userId,
        userName: 'Remote User',
        userColor: '#6b7280',
        type: 'edit',
        data: { conflict: true, operationType: operation.type },
      });
    }

    const newState = operationEngineRef.current.applyOperation(operation, currentState);

    // Update local state with transformed results
    if (activeView === 'daw') {
      useFlowStore.getState().setDAWNodes(newState.nodes);
      useFlowStore.getState().setDAWEdges(newState.edges);
    } else {
      useFlowStore.getState().setTheoryNodes(newState.nodes);
      useFlowStore.getState().setTheoryEdges(newState.edges);
    }
  }, [nodes, edges, activeView, currentUser, addActivity]);

  // Sync state periodically
  const syncState = useCallback(() => {
    if (!currentUser || !currentSession) return;

    const now = Date.now();
    if (now - lastSyncRef.current < 5000) return; // Sync at most every 5 seconds

    const currentState = {
      nodes: nodes[activeView],
      edges: edges[activeView],
      revision: operationEngineRef.current.getRevision(),
      view: activeView,
    };

    sendMessage('state_sync', {
      sessionId: currentSession.id,
      userId: currentUser.id,
      state: currentState,
    });

    lastSyncRef.current = now;
  }, [currentUser, currentSession, activeView, nodes, edges, sendMessage]);

  // Track viewport changes
  const updateViewport = useCallback((viewport: any) => {
    if (!currentUser) return;
    // Store viewport info for collaboration components
    // This can be used for cursor position transformations
  }, [currentUser]);

  return {
    // Session info
    currentSession,
    currentUser,
    isHost,
    users,
    isConnected: currentSession?.isActive || false,

    // Presence
    cursors,
    selections,

    // Actions
    trackCursor,
    trackSelection,
    updateCursor,
    updateSelection,
    updateViewport,
    transformAndSendChange,
    applyReceivedOperation,
    syncState,

    // Activity
    addActivity,
  };
}

/**
 * Hook for managing collaboration sessions
 */
export function useCollaborationSession() {
  const {
    currentSession,
    isHost,
    isJoining,
    joinError,
    createSession,
    joinSession,
    leaveSession,
    clearSession,
  } = useCollaborationStore();

  const { sendMessage } = useWebSocket();

  const createSessionAndConnect = useCallback(async (name: string) => {
    try {
      const sessionId = await createSession(name);

      // Initialize WebSocket connection for collaboration
      if (sessionId) {
        // The WebSocket integration is handled by the collaboration store
        console.log('Collaboration session created:', sessionId);
      }

      return sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, [createSession]);

  const joinSessionAndConnect = useCallback(async (sessionId: string, userName: string) => {
    try {
      await joinSession(sessionId, userName);

      // Initialize WebSocket connection for collaboration
      console.log('Joined collaboration session:', sessionId);
    } catch (error) {
      console.error('Failed to join session:', error);
      throw error;
    }
  }, [joinSession]);

  const disconnect = useCallback(() => {
    leaveSession();
    clearSession();
  }, [leaveSession, clearSession]);

  return {
    // Session state
    currentSession,
    isHost,
    isJoining,
    joinError,

    // Actions
    createSession: createSessionAndConnect,
    joinSession: joinSessionAndConnect,
    disconnect,
  };
}

/**
 * Hook for managing user presence
 */
export function useUserPresence() {
  const { currentUser, users, cursors, selections } = useCollaborationStore();
  const { isConnected } = useWebSocket();

  const isUserActive = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return false;

    const now = Date.now();
    const lastActivity = user.lastActivity;
    const isRecent = now - lastActivity < 30000; // Active within last 30 seconds

    return isRecent && user.status === 'active';
  }, [users]);

  const getUserCursor = useCallback((userId: string) => {
    return cursors.get(userId);
  }, [cursors]);

  const getUserSelection = useCallback((userId: string) => {
    return selections.get(userId);
  }, [selections]);

  const getActiveUsers = useCallback(() => {
    return users.filter(user => isUserActive(user.id));
  }, [users, isUserActive]);

  return {
    currentUser,
    users,
    cursors,
    selections,
    isConnected,
    isUserActive,
    getUserCursor,
    getUserSelection,
    getActiveUsers,
  };
}
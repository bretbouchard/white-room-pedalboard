import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useWebSocketStore } from './websocketStore';

//================================================================================================
// Types
//================================================================================================

export interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string; // Unique color for UI indicators
  cursor?: CursorPosition;
  selection?: UserSelection;
  status: 'active' | 'idle' | 'away';
  joinedAt: number;
  lastActivity: number;
  permissions: UserPermissions;
}

export interface UserPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canExport: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  view: 'daw' | 'theory';
}

export interface UserSelection {
  nodeIds: string[];
  edgeIds: string[];
  view: 'daw' | 'theory';
}

export interface CollaborationSession {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
  isActive: boolean;
  users: User[];
  settings: SessionSettings;
}

export interface SessionSettings {
  maxUsers: number;
  requireApproval: boolean;
  allowAnonymous: boolean;
  autoSave: boolean;
  chatEnabled: boolean;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  type: 'join' | 'leave' | 'edit' | 'select' | 'chat' | 'create' | 'delete';
  data: any;
  timestamp: number;
  userName: string;
  userColor: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  message: string;
  timestamp: number;
  type: 'text' | 'system';
}

export interface Operation {
  id: string;
  userId: string;
  userName?: string;
  userColor?: string;
  type: 'node_add' | 'node_remove' | 'node_update' | 'edge_add' | 'edge_remove' | 'edge_update';
  data: any;
  timestamp: number;
  view: 'daw' | 'theory';
  revision: number;
}

export interface Conflict {
  id: string;
  operation1: Operation;
  operation2: Operation;
  timestamp: number;
  resolution?: 'pending' | 'resolved' | 'ignored';
  resolvedBy?: string;
  resolutionAction?: string;
}

export interface CollaborationState {
  // Session
  currentSession: CollaborationSession | null;
  isHost: boolean;
  isJoining: boolean;
  joinError: string | null;

  // Users
  users: User[];
  currentUser: User | null;

  // Presence
  cursors: Map<string, CursorPosition>;
  selections: Map<string, UserSelection>;

  // Activity
  activityFeed: ActivityEvent[];
  chatMessages: ChatMessage[];

  // Operational Transform
  localRevision: number;
  pendingOperations: Operation[];
  operationQueue: Operation[];
  conflicts: Conflict[];

  // Settings
  showUsers: boolean;
  showChat: boolean;
  showActivity: boolean;

  // Actions
  createSession: (name: string) => Promise<string>;
  joinSession: (sessionId: string, userName: string) => Promise<void>;
  leaveSession: () => void;

  // User Management
  updateUser: (userId: string, updates: Partial<User>) => void;
  removeUser: (userId: string) => void;

  // Presence
  updateCursor: (position: CursorPosition) => void;
  updateSelection: (selection: UserSelection) => void;

  // Activity
  addActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
  sendChatMessage: (message: string) => void;

  // Operations
  applyOperation: (operation: Operation) => void;
  sendOperation: (operation: Omit<Operation, 'id' | 'timestamp'>) => void;

  // Conflict Resolution
  addConflict: (conflict: Conflict) => void;
  resolveConflict: (conflictId: string, resolution: 'merge' | 'override' | 'ignore') => void;

  // UI Settings
  toggleUsers: () => void;
  toggleChat: () => void;
  toggleActivity: () => void;

  // Cleanup
  clearSession: () => void;
}

//================================================================================================
// Store Implementation
//================================================================================================

const USER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

const generateUserId = () => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateOperationId = () => `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useCollaborationStore = create<CollaborationState>()(
  subscribeWithSelector((set, get) => {
    const websocketStore = useWebSocketStore.getState();

    return {
      // Session
      currentSession: null,
      isHost: false,
      isJoining: false,
      joinError: null,

      // Users
      users: [],
      currentUser: null,

      // Presence
      cursors: new Map(),
      selections: new Map(),

      // Activity
      activityFeed: [],
      chatMessages: [],

      // Operational Transform
      localRevision: 0,
      pendingOperations: [],
      operationQueue: [],
      conflicts: [],

      // Settings
      showUsers: true,
      showChat: false,
      showActivity: true,

      createSession: async (name: string) => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userId = generateUserId();

        const currentUser: User = {
          id: userId,
          name: 'Host',
          color: USER_COLORS[0],
          status: 'active',
          joinedAt: Date.now(),
          lastActivity: Date.now(),
          permissions: {
            canEdit: true,
            canDelete: true,
            canManageUsers: true,
            canExport: true,
          },
        };

        const session: CollaborationSession = {
          id: sessionId,
          name,
          ownerId: userId,
          createdAt: Date.now(),
          isActive: true,
          users: [currentUser],
          settings: {
            maxUsers: 10,
            requireApproval: false,
            allowAnonymous: false,
            autoSave: true,
            chatEnabled: true,
          },
        };

        // Send session creation to server
        websocketStore.sendMessage('session_create', {
          sessionId,
          name,
          userId,
          settings: session.settings,
        });

        set({
          currentSession: session,
          currentUser,
          isHost: true,
          users: [currentUser],
        });

        return sessionId;
      },

      joinSession: async (sessionId: string, userName: string) => {
        set({ isJoining: true, joinError: null });

        const userId = generateUserId();
        const availableColors = USER_COLORS.filter(color =>
          !get().users.some(user => user.color === color)
        );
        const userColor = availableColors[0] || USER_COLORS[0];

        const currentUser: User = {
          id: userId,
          name: userName,
          color: userColor,
          status: 'active',
          joinedAt: Date.now(),
          lastActivity: Date.now(),
          permissions: {
            canEdit: true,
            canDelete: false,
            canManageUsers: false,
            canExport: true,
          },
        };

        // Send join request to server
        websocketStore.sendMessage('session_join', {
          sessionId,
          userId,
          userName,
          userColor,
        });

        set({
          currentUser,
          isJoining: false,
        });
      },

      leaveSession: () => {
        const { currentSession, currentUser } = get();
        if (!currentSession || !currentUser) return;

        websocketStore.sendMessage('session_leave', {
          sessionId: currentSession.id,
          userId: currentUser.id,
        });

        get().clearSession();
      },

      updateUser: (userId: string, updates: Partial<User>) => {
        const { users } = get();
        const updatedUsers = users.map(user =>
          user.id === userId ? { ...user, ...updates, lastActivity: Date.now() } : user
        );

        set({ users: updatedUsers });

        // Broadcast user update
        websocketStore.sendMessage('user_update', {
          userId,
          updates,
          sessionId: get().currentSession?.id,
        });
      },

      removeUser: (userId: string) => {
        const { users } = get();
        const updatedUsers = users.filter(user => user.id !== userId);

        set({ users: updatedUsers });

        // Broadcast user removal
        websocketStore.sendMessage('user_remove', {
          userId,
          sessionId: get().currentSession?.id,
        });
      },

      updateCursor: (position: CursorPosition) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const cursors = new Map(get().cursors);
        cursors.set(currentUser.id, position);

        set({ cursors });

        // Broadcast cursor position
        websocketStore.sendMessage('cursor_update', {
          userId: currentUser.id,
          position,
          sessionId: get().currentSession?.id,
        });

        // Update own last activity
        get().updateUser(currentUser.id, { status: 'active' });
      },

      updateSelection: (selection: UserSelection) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const selections = new Map(get().selections);
        selections.set(currentUser.id, selection);

        set({ selections });

        // Broadcast selection
        websocketStore.sendMessage('selection_update', {
          userId: currentUser.id,
          selection,
          sessionId: get().currentSession?.id,
        });

        // Update own last activity
        get().updateUser(currentUser.id, { status: 'active' });
      },

      addActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
        const activityEvent: ActivityEvent = {
          id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          ...event,
        };

        set(state => ({
          activityFeed: [activityEvent, ...state.activityFeed].slice(0, 100) // Keep last 100
        }));
      },

      sendChatMessage: (message: string) => {
        const { currentUser, currentSession } = get();
        if (!currentUser || !currentSession || !message.trim()) return;

        const chatMessage: ChatMessage = {
          id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUser.id,
          userName: currentUser.name,
          userColor: currentUser.color,
          message: message.trim(),
          timestamp: Date.now(),
          type: 'text',
        };

        // Broadcast chat message
        websocketStore.sendMessage('chat_message', {
          ...chatMessage,
          sessionId: currentSession.id,
        });

        // Add to local chat
        set(state => ({
          chatMessages: [...state.chatMessages, chatMessage],
        }));

        // Add activity
        get().addActivity({
          userId: currentUser.id,
          userName: currentUser.name,
          userColor: currentUser.color,
          type: 'chat',
          data: { message: message.trim() },
        });
      },

      applyOperation: (operation: Operation) => {
        const { localRevision } = get();

        // Only apply operations that are newer than our current revision
        if (operation.revision <= localRevision) return;

        set(state => ({
          localRevision: operation.revision,
          operationQueue: [...state.operationQueue, operation].sort((a, b) => a.revision - b.revision),
        }));
      },

      sendOperation: (operation: Omit<Operation, 'id' | 'timestamp'>) => {
        const { currentUser, currentSession } = get();
        if (!currentUser || !currentSession) return;

        const fullOperation: Operation = {
          id: generateOperationId(),
          timestamp: Date.now(),
          ...operation,
          userId: currentUser.id,
          userName: currentUser.name,
          userColor: currentUser.color,
        };

        // Add to pending operations
        set(state => ({
          pendingOperations: [...state.pendingOperations, fullOperation],
        }));

        // Send to server
        websocketStore.sendMessage('operation', {
          ...fullOperation,
          sessionId: currentSession.id,
        });
      },

      addConflict: (conflict: Conflict) => {
        set(state => ({
          conflicts: [...state.conflicts, conflict],
        }));
      },

      resolveConflict: (conflictId: string, resolution: 'merge' | 'override' | 'ignore') => {
        const { currentUser } = get();
        if (!currentUser) return;

        set(state => ({
          conflicts: state.conflicts.map(conflict =>
            conflict.id === conflictId
              ? {
                  ...conflict,
                  resolution: 'resolved',
                  resolvedBy: currentUser.name,
                  resolutionAction: resolution,
                }
              : conflict
          ),
        }));

        // Add activity
        get().addActivity({
          userId: currentUser.id,
          userName: currentUser.name,
          userColor: currentUser.color,
          type: 'edit',
          data: { action: 'resolved_conflict', conflictId, resolution },
        });
      },

      toggleUsers: () => set(state => ({ showUsers: !state.showUsers })),
      toggleChat: () => set(state => ({ showChat: !state.showChat })),
      toggleActivity: () => set(state => ({ showActivity: !state.showActivity })),

      clearSession: () => set({
        currentSession: null,
        isHost: false,
        isJoining: false,
        joinError: null,
        users: [],
        currentUser: null,
        cursors: new Map(),
        selections: new Map(),
        activityFeed: [],
        chatMessages: [],
        localRevision: 0,
        pendingOperations: [],
        operationQueue: [],
        conflicts: [],
      }),
    };
  })
);

//================================================================================================
// Selectors
//================================================================================================

export const useSessionUsers = () => useCollaborationStore(state => state.users);
export const useCurrentUser = () => useCollaborationStore(state => state.currentUser);
export const useActiveCursors = () => useCollaborationStore(
  state => Array.from(state.cursors.entries()).map(([userId, position]) => ({
    userId,
    ...position,
    user: state.users.find(u => u.id === userId),
  }))
);
export const useActiveSelections = () => useCollaborationStore(
  state => Array.from(state.selections.entries()).map(([userId, selection]) => ({
    userId,
    ...selection,
    user: state.users.find(u => u.id === userId),
  }))
);
export const useChatMessages = () => useCollaborationStore(state => state.chatMessages);
export const useActivityFeed = () => useCollaborationStore(state => state.activityFeed);

//================================================================================================
// WebSocket Integration
//================================================================================================

export const initializeCollaborationIntegration = () => {
  const { subscribe } = useWebSocketStore.getState();

  subscribe((message) => {
    const store = useCollaborationStore.getState();

    switch (message.type) {
      case 'session_created': {
        store.addActivity({
          userId: store.currentUser?.id || 'system',
          userName: 'System',
          userColor: '#6b7280',
          type: 'create',
          data: { sessionName: (message.data as any).name },
        });
        break;
      }

      case 'session_joined': {
        const joinData = message.data as any;
        store.updateUser(joinData.userId, {
          name: joinData.userName,
          color: joinData.userColor,
          status: 'active',
        });
        store.addActivity({
          userId: joinData.userId,
          userName: joinData.userName,
          userColor: joinData.userColor,
          type: 'join',
          data: {},
        });
        break;
      }

      case 'session_left': {
        const leaveData = message.data as any;
        store.addActivity({
          userId: leaveData.userId,
          userName: leaveData.userName,
          userColor: leaveData.userColor,
          type: 'leave',
          data: {},
        });
        break;
      }

      case 'user_update': {
        const userData = message.data as any;
        if (store.currentUser?.id !== userData.userId) {
          store.updateUser(userData.userId, userData.updates);
        }
        break;
      }

      case 'cursor_update': {
        const cursorData = message.data as any;
        if (store.currentUser?.id !== cursorData.userId) {
          const cursors = new Map(store.cursors);
          cursors.set(cursorData.userId, cursorData.position);
          useCollaborationStore.setState({ cursors });
        }
        break;
      }

      case 'selection_update': {
        const selectionData = message.data as any;
        if (store.currentUser?.id !== selectionData.userId) {
          const selections = new Map(store.selections);
          selections.set(selectionData.userId, selectionData.selection);
          useCollaborationStore.setState({ selections });
        }
        break;
      }

      case 'chat_message': {
        const chatData = message.data as ChatMessage;
        if (store.currentUser?.id !== chatData.userId) {
          useCollaborationStore.setState(state => ({
            chatMessages: [...state.chatMessages, chatData],
          }));
        }
        break;
      }

      case 'operation': {
        const operationData = message.data as Operation;
        if (store.currentUser?.id !== operationData.userId) {
          store.applyOperation(operationData);
        }
        break;
      }

      default:
        console.debug('Collaboration: Unknown message type', message.type);
    }
  });
};

export default useCollaborationStore;
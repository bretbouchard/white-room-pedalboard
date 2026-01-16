/**
 * Examples demonstrating real-time capabilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchillingerSDK } from '../client';
import { CollaborationManager } from '../collaboration';

// Mock fetch for authentication
global.fetch = vi.fn();

describe('Real-time SDK Examples', () => {
  let sdk: SchillingerSDK;

  beforeEach(() => {
    // Mock successful authentication
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        token: 'test-token',
        permissions: ['read', 'write'],
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }),
    });

    sdk = new SchillingerSDK({
      apiUrl: 'http://localhost:3000/api/v1',
      realtime: {
        url: 'ws://localhost:3000/ws/v1',
        reconnectInterval: 1000,
        maxReconnectAttempts: 5,
      },
      enableCollaboration: true,
      debug: false,
    });
  });

  it('should demonstrate SDK configuration with real-time options', () => {
    const config = sdk.getConfig();

    expect(config.realtime).toBeDefined();
    expect(config.enableCollaboration).toBe(true);
  });

  it('should demonstrate collaboration manager usage', () => {
    const collaborationManager = sdk.getCollaborationManager();

    expect(collaborationManager).toBeInstanceOf(CollaborationManager);
  });

  it('should demonstrate real-time event subscription patterns', () => {
    // Mock the real-time manager to avoid WebSocket issues
    const mockRealtimeManager = {
      subscribe: vi.fn().mockReturnValue('subscription-id'),
      unsubscribe: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
    };

    (sdk as any).realtimeManager = mockRealtimeManager;

    // Example: Subscribe to pattern generation events
    const patternCallback = vi.fn();
    const subscriptionId = sdk.subscribe('pattern_generated', patternCallback);

    expect(mockRealtimeManager.subscribe).toHaveBeenCalledWith(
      'pattern_generated',
      patternCallback
    );
    expect(subscriptionId).toBe('subscription-id');

    // Example: Unsubscribe
    sdk.unsubscribe(subscriptionId!);
    expect(mockRealtimeManager.unsubscribe).toHaveBeenCalledWith(
      subscriptionId
    );
  });

  it('should demonstrate streaming API usage patterns', () => {
    // Mock the real-time manager
    const mockRealtimeManager = {
      startStreaming: vi.fn().mockReturnValue('stream-id'),
      stopStreaming: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
    };

    (sdk as any).realtimeManager = mockRealtimeManager;

    // Example: Start streaming rhythm generation
    const chunkCallback = vi.fn();
    const streamId = sdk.startStreaming(
      'rhythm',
      { generators: [3, 2] },
      chunkCallback
    );

    expect(mockRealtimeManager.startStreaming).toHaveBeenCalledWith({
      type: 'rhythm',
      parameters: { generators: [3, 2] },
      callback: chunkCallback,
    });
    expect(streamId).toBe('stream-id');

    // Example: Stop streaming
    sdk.stopStreaming(streamId);
    expect(mockRealtimeManager.stopStreaming).toHaveBeenCalledWith(streamId);
  });

  it('should demonstrate collaboration workflow', async () => {
    const collaborationManager = sdk.getCollaborationManager();

    if (collaborationManager) {
      // Create a collaborative session
      const document = {
        id: 'doc-1',
        type: 'composition' as const,
        content: {
          id: 'comp-1',
          name: 'Collaborative Composition',
          sections: [],
          key: 'C',
          scale: 'major',
          tempo: 120,
          timeSignature: [4, 4] as [number, number],
        },
        version: 1,
        operations: [],
      };

      const session = await collaborationManager.createSession(
        'Music Session',
        document
      );

      // Add participants
      await collaborationManager.joinSession(session.id, {
        id: 'user-1',
        name: 'Alice',
        role: 'editor',
      });

      await collaborationManager.joinSession(session.id, {
        id: 'user-2',
        name: 'Bob',
        role: 'editor',
      });

      // Apply an operation
      const operation = {
        type: 'update' as const,
        path: 'tempo',
        value: 140,
        oldValue: 120,
        userId: 'user-1',
        version: 1,
      };

      const result = await collaborationManager.applyOperation(
        session.id,
        operation
      );

      expect(result.success).toBe(true);
      expect(session.participants).toHaveLength(2);
    }
  });

  it('should demonstrate conflict resolution workflow', async () => {
    const collaborationManager = sdk.getCollaborationManager();

    if (collaborationManager) {
      const document = {
        id: 'doc-1',
        type: 'composition' as const,
        content: {
          id: 'comp-1',
          name: 'Test Composition',
          sections: [],
          key: 'C',
          scale: 'major',
          tempo: 120,
          timeSignature: [4, 4] as [number, number],
        },
        version: 1,
        operations: [],
      };

      const session = await collaborationManager.createSession(
        'Conflict Demo',
        document
      );

      // Create a conflict scenario
      const op1 = {
        type: 'update' as const,
        path: 'name',
        value: 'Alice Version',
        userId: 'user-1',
        version: 1,
      };

      await collaborationManager.applyOperation(session.id, op1);

      const op2 = {
        type: 'update' as const,
        path: 'name',
        value: 'Bob Version',
        userId: 'user-2',
        version: 1, // Same version - creates conflict
      };

      const conflictResult = await collaborationManager.applyOperation(
        session.id,
        op2
      );

      expect(conflictResult.success).toBe(false);
      expect(conflictResult.conflicts).toHaveLength(1);

      // Resolve the conflict
      const conflict = conflictResult.conflicts![0];
      const resolution = {
        strategy: 'manual' as const,
        resolvedData: {
          ...document.content,
          name: 'Merged Version',
        },
        timestamp: new Date(),
        resolvedBy: 'user-1',
        reasoning: 'Manual merge of both versions',
      };

      const resolutionResult = await collaborationManager.resolveConflict(
        conflict.id,
        resolution
      );

      expect(resolutionResult.success).toBe(true);
    }
  });

  it('should demonstrate event handling patterns', () => {
    const events: any[] = [];

    // Listen for various SDK events
    sdk.on('realtimeEvent', event => {
      events.push({ type: 'realtime', data: event });
    });

    sdk.on('collaborationConflict', event => {
      events.push({ type: 'conflict', data: event });
    });

    sdk.on('error', event => {
      events.push({ type: 'error', data: event });
    });

    // Simulate events
    const mockEvent = {
      type: 'realtimeEvent',
      data: { pattern: [1, 2, 3] },
      timestamp: new Date(),
    };

    (sdk as any).emit('realtimeEvent', mockEvent);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('realtime');
    expect(events[0].data).toEqual(mockEvent);
  });

  it('should demonstrate real-time configuration options', () => {
    const customSDK = new SchillingerSDK({
      apiUrl: 'https://api.example.com/v1',
      realtime: {
        url: 'wss://ws.example.com/v1',
        reconnectInterval: 2000,
        maxReconnectAttempts: 10,
        heartbeatInterval: 30000,
        timeout: 5000,
        protocols: ['schillinger-v2'],
      },
      enableCollaboration: true,
    });

    const config = customSDK.getConfig();

    expect(config.realtime?.url).toBe('wss://ws.example.com/v1');
    expect(config.realtime?.reconnectInterval).toBe(2000);
    expect(config.realtime?.maxReconnectAttempts).toBe(10);
    expect(config.enableCollaboration).toBe(true);
  });

  it('should demonstrate cursor tracking in collaboration', async () => {
    const collaborationManager = sdk.getCollaborationManager();

    if (collaborationManager) {
      const document = {
        id: 'doc-1',
        type: 'composition' as const,
        content: {
          id: 'comp-1',
          name: 'Cursor Demo',
          sections: [],
          key: 'C',
          scale: 'major',
          tempo: 120,
          timeSignature: [4, 4] as [number, number],
        },
        version: 1,
        operations: [],
      };

      const session = await collaborationManager.createSession(
        'Cursor Demo',
        document
      );

      // Add participant
      await collaborationManager.joinSession(session.id, {
        id: 'user-1',
        name: 'Alice',
        role: 'editor',
      });

      // Update cursor position
      const cursor = {
        section: 'section-1',
        element: 'rhythm',
        position: 10,
      };

      collaborationManager.updateCursor(session.id, 'user-1', cursor);

      const updatedSession = collaborationManager.getSession(session.id);
      const participant = updatedSession?.participants.find(
        p => p.id === 'user-1'
      );

      expect(participant?.cursor).toEqual(cursor);
    }
  });
});

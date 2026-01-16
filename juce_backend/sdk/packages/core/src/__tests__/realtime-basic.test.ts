/**
 * Basic tests for real-time capabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RealtimeManager } from '../realtime';

describe('RealtimeManager Basic Functionality', () => {
  let realtimeManager: RealtimeManager;

  beforeEach(() => {
    realtimeManager = new RealtimeManager({
      url: 'ws://localhost:3000/ws/v1',
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
      heartbeatInterval: 1000,
      timeout: 1000,
    });
  });

  it('should create RealtimeManager instance', () => {
    expect(realtimeManager).toBeDefined();
    expect(realtimeManager.isConnected()).toBe(false);
  });

  it('should have correct initial connection state', () => {
    const state = realtimeManager.getConnectionState();
    expect(state.status).toBe('disconnected');
    expect(state.reconnectAttempts).toBe(0);
    expect(state.lastConnected).toBeUndefined();
    expect(state.error).toBeUndefined();
  });

  it('should generate unique subscription IDs', () => {
    const callback = () => {};

    // Mock the sendMessage method to avoid WebSocket issues
    const originalSendMessage = (realtimeManager as any).sendMessage;
    (realtimeManager as any).sendMessage = () => {};

    const id1 = realtimeManager.subscribe('event1', callback);
    const id2 = realtimeManager.subscribe('event2', callback);

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);

    // Restore original method
    (realtimeManager as any).sendMessage = originalSendMessage;
  });

  it('should generate unique streaming request IDs', () => {
    const callback = () => {};

    // Mock the sendMessage method to avoid WebSocket issues
    const originalSendMessage = (realtimeManager as any).sendMessage;
    (realtimeManager as any).sendMessage = () => {};

    const id1 = realtimeManager.startStreaming({
      type: 'rhythm',
      parameters: { generators: [3, 2] },
      callback,
    });

    const id2 = realtimeManager.startStreaming({
      type: 'harmony',
      parameters: { key: 'C' },
      callback,
    });

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);

    // Restore original method
    (realtimeManager as any).sendMessage = originalSendMessage;
  });

  it('should handle event listeners', () => {
    const events: any[] = [];
    const listener = (data: any) => events.push(data);

    realtimeManager.on('test', listener);

    // Emit an event using the private emit method
    (realtimeManager as any).emit('test', { message: 'hello' });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ message: 'hello' });

    // Remove listener
    realtimeManager.off('test', listener);

    // Emit another event
    (realtimeManager as any).emit('test', { message: 'world' });

    // Should still be 1 since listener was removed
    expect(events).toHaveLength(1);
  });

  it('should generate default WebSocket URL correctly', () => {
    const manager = new RealtimeManager();
    const defaultUrl = (manager as any).getDefaultWebSocketUrl();

    expect(defaultUrl).toBe('ws://localhost:3000/ws/v1');
  });

  it('should handle conflict resolution data structure', () => {
    const conflictId = 'test-conflict';
    const resolution = {
      strategy: 'merge' as const,
      resolvedData: { test: 'data' },
      timestamp: new Date(),
      resolvedBy: 'user-1',
    };

    // Mock the sendMessage method
    const messages: any[] = [];
    (realtimeManager as any).sendMessage = (message: any) => {
      messages.push(message);
    };

    realtimeManager.resolveConflict(conflictId, resolution);

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('resolve_conflict');
    expect(messages[0].conflictId).toBe(conflictId);
    expect(messages[0].resolution).toEqual(resolution);
  });

  it('should handle broadcast update data structure', () => {
    const event = 'composition_updated';
    const data = { composition: 'test' };

    // Mock the sendMessage method
    const messages: any[] = [];
    (realtimeManager as any).sendMessage = (message: any) => {
      messages.push(message);
    };

    realtimeManager.broadcastUpdate(event, data);

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('broadcast');
    expect(messages[0].event).toBe(event);
    expect(messages[0].data).toEqual(data);
    expect(messages[0].timestamp).toBeDefined();
  });

  it('should queue messages when not connected', () => {
    const callback = () => {};

    // Ensure not connected
    expect(realtimeManager.isConnected()).toBe(false);

    // Subscribe to an event (should be queued)
    realtimeManager.subscribe('test_event', callback);

    // Check that message was queued
    const messageQueue = (realtimeManager as any).messageQueue;
    expect(messageQueue).toHaveLength(1);
    expect(messageQueue[0].type).toBe('subscribe');
    expect(messageQueue[0].event).toBe('test_event');
  });

  it('should handle subscription management', () => {
    const callback = () => {};

    // Mock the sendMessage method
    (realtimeManager as any).sendMessage = () => {};

    const subscriptionId = realtimeManager.subscribe('test_event', callback);

    // Check that subscription was stored
    const subscriptions = (realtimeManager as any).subscriptions;
    expect(subscriptions.has(subscriptionId)).toBe(true);
    expect(subscriptions.get(subscriptionId).event).toBe('test_event');
    expect(subscriptions.get(subscriptionId).callback).toBe(callback);

    // Unsubscribe
    realtimeManager.unsubscribe(subscriptionId);

    // Check that subscription was removed
    expect(subscriptions.has(subscriptionId)).toBe(false);
  });

  it('should handle streaming request management', () => {
    const callback = () => {};

    // Mock the sendMessage method
    (realtimeManager as any).sendMessage = () => {};

    const requestId = realtimeManager.startStreaming({
      type: 'rhythm',
      parameters: { generators: [3, 2] },
      callback,
    });

    // Check that streaming request was stored
    const streamingRequests = (realtimeManager as any).streamingRequests;
    expect(streamingRequests.has(requestId)).toBe(true);
    expect(streamingRequests.get(requestId).type).toBe('rhythm');
    expect(streamingRequests.get(requestId).callback).toBe(callback);

    // Stop streaming
    realtimeManager.stopStreaming(requestId);

    // Check that streaming request was removed
    expect(streamingRequests.has(requestId)).toBe(false);
  });
});

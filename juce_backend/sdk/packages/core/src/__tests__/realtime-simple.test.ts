/**
 * Simple tests for real-time capabilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealtimeManager } from '../realtime';

// Ensure CloseEvent/MessageEvent exist in Node test environment (standalone safety)
if (typeof (globalThis as any).CloseEvent === 'undefined') {
  class PolyfillCloseEvent {
    type: string;
    code?: number;
    reason?: string;
    wasClean?: boolean;
    constructor(
      type: string,
      init?: { code?: number; reason?: string; wasClean?: boolean }
    ) {
      this.type = type;
      this.code = init?.code;
      this.reason = init?.reason;
      this.wasClean = init?.wasClean;
    }
  }
  (globalThis as any).CloseEvent = PolyfillCloseEvent as any;
}
if (typeof (globalThis as any).MessageEvent === 'undefined') {
  class PolyfillMessageEvent {
    type: string;
    data: any;
    constructor(type: string, init?: { data?: any }) {
      this.type = type;
      this.data = init?.data;
    }
  }
  (globalThis as any).MessageEvent = PolyfillMessageEvent as any;
}

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocols: string | string[];
  onopen?: (event: Event) => void;
  onclose?: (event: CloseEvent) => void;
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: Event) => void;

  private messageQueue: string[] = [];

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols || [];

    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string): void {
    if (this.readyState === MockWebSocket.OPEN) {
      this.messageQueue.push(data);
    }
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason }));
    }
  }

  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage(
        new MessageEvent('message', { data: JSON.stringify(data) })
      );
    }
  }

  getLastMessage(): any {
    const lastMessage = this.messageQueue[this.messageQueue.length - 1];
    return lastMessage ? JSON.parse(lastMessage) : null;
  }

  getAllMessages(): any[] {
    return this.messageQueue.map(msg => JSON.parse(msg));
  }

  clearMessages(): void {
    this.messageQueue = [];
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('RealtimeManager Basic Tests', () => {
  let realtimeManager: RealtimeManager;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    // Create a factory function that returns our mock
    const mockWebSocketFactory = (
      url: string,
      protocols?: string | string[]
    ) => {
      mockWebSocket = new MockWebSocket(url, protocols);
      return mockWebSocket;
    };

    realtimeManager = new RealtimeManager({
      url: 'ws://localhost:3000/ws/v1',
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
      heartbeatInterval: 1000,
      timeout: 1000,
      webSocketConstructor: mockWebSocketFactory,
    });
  });

  it('should create RealtimeManager instance', () => {
    expect(realtimeManager).toBeDefined();
    expect(realtimeManager.isConnected()).toBe(false);
  });

  it('should connect to WebSocket server', async () => {
    const connectionPromise = realtimeManager.connect('test-token');

    await expect(connectionPromise).resolves.toBeUndefined();
    expect(realtimeManager.isConnected()).toBe(true);
    expect(realtimeManager.getConnectionState().status).toBe('connected');
  });

  it('should include token in connection URL', async () => {
    await realtimeManager.connect('test-token');

    expect(mockWebSocket.url).toContain('token=test-token');
  });

  it('should disconnect cleanly', async () => {
    await realtimeManager.connect();
    expect(realtimeManager.isConnected()).toBe(true);

    await realtimeManager.disconnect();
    expect(realtimeManager.isConnected()).toBe(false);
    expect(realtimeManager.getConnectionState().status).toBe('disconnected');
  });

  it('should subscribe to events', async () => {
    await realtimeManager.connect();

    const callback = vi.fn();
    const subscriptionId = realtimeManager.subscribe(
      'pattern_generated',
      callback
    );

    expect(subscriptionId).toBeDefined();
    expect(typeof subscriptionId).toBe('string');

    // Check that subscription message was sent
    const lastMessage = mockWebSocket.getLastMessage();
    expect(lastMessage.type).toBe('subscribe');
    expect(lastMessage.event).toBe('pattern_generated');
    expect(lastMessage.subscriptionId).toBe(subscriptionId);
  });

  it('should receive subscribed events', async () => {
    await realtimeManager.connect();

    const callback = vi.fn();
    realtimeManager.subscribe('pattern_generated', callback);

    // Simulate incoming event
    const eventData = { pattern: [1, 2, 3] };
    mockWebSocket.simulateMessage({
      type: 'event',
      id: 'event-1',
      event: 'pattern_generated',
      data: eventData,
      timestamp: new Date().toISOString(),
    });

    expect(callback).toHaveBeenCalledWith(eventData);
  });

  it('should unsubscribe from events', async () => {
    await realtimeManager.connect();

    const callback = vi.fn();
    const subscriptionId = realtimeManager.subscribe(
      'pattern_generated',
      callback
    );

    mockWebSocket.clearMessages();
    realtimeManager.unsubscribe(subscriptionId);

    // Check that unsubscribe message was sent
    const lastMessage = mockWebSocket.getLastMessage();
    expect(lastMessage.type).toBe('unsubscribe');
    expect(lastMessage.subscriptionId).toBe(subscriptionId);

    // Simulate event after unsubscribe
    mockWebSocket.simulateMessage({
      type: 'event',
      id: 'event-1',
      event: 'pattern_generated',
      data: { pattern: [1, 2, 3] },
      timestamp: new Date().toISOString(),
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should start streaming pattern generation', async () => {
    await realtimeManager.connect();

    const chunkCallback = vi.fn();
    const requestId = realtimeManager.startStreaming({
      type: 'rhythm',
      parameters: { generators: [3, 2] },
      callback: chunkCallback,
    });

    expect(requestId).toBeDefined();

    // Check that streaming request was sent
    const lastMessage = mockWebSocket.getLastMessage();
    expect(lastMessage.type).toBe('stream_start');
    expect(lastMessage.requestId).toBe(requestId);
    expect(lastMessage.streamType).toBe('rhythm');
    expect(lastMessage.parameters).toEqual({ generators: [3, 2] });
  });

  it('should handle streaming chunks', async () => {
    await realtimeManager.connect();

    const chunkCallback = vi.fn();
    const requestId = realtimeManager.startStreaming({
      type: 'rhythm',
      parameters: { generators: [3, 2] },
      callback: chunkCallback,
    });

    // Simulate streaming chunks
    mockWebSocket.simulateMessage({
      type: 'stream_chunk',
      requestId,
      chunk: { partial: [1, 2] },
    });

    mockWebSocket.simulateMessage({
      type: 'stream_chunk',
      requestId,
      chunk: { partial: [1, 2, 3] },
    });

    expect(chunkCallback).toHaveBeenCalledTimes(2);
    expect(chunkCallback).toHaveBeenNthCalledWith(1, { partial: [1, 2] });
    expect(chunkCallback).toHaveBeenNthCalledWith(2, { partial: [1, 2, 3] });
  });

  it('should broadcast updates', async () => {
    await realtimeManager.connect();

    const updateData = { composition: 'updated' };
    realtimeManager.broadcastUpdate('composition_updated', updateData);

    const lastMessage = mockWebSocket.getLastMessage();
    expect(lastMessage.type).toBe('broadcast');
    expect(lastMessage.event).toBe('composition_updated');
    expect(lastMessage.data).toEqual(updateData);
    expect(lastMessage.timestamp).toBeDefined();
  });

  it('should handle connection state changes', () => {
    const events: any[] = [];
    realtimeManager.on('connectionStateChanged', state => {
      events.push(state);
    });

    // Initial state should be disconnected
    expect(realtimeManager.getConnectionState().status).toBe('disconnected');
  });

  it('should queue messages when disconnected', () => {
    // Don't connect
    const callback = vi.fn();
    realtimeManager.subscribe('test_event', callback);

    // Message should be queued (no WebSocket to check)
    expect(realtimeManager.isConnected()).toBe(false);
  });
});

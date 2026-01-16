/**
 * Tests for WebSocketClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketClient, WebSocketStatus } from '../WebSocketClient';

// Ensure CloseEvent/MessageEvent exist in Node/jsdom test environments
if (typeof (globalThis as any).CloseEvent === 'undefined') {
  class PolyfillCloseEvent {
    type: string; code?: number; reason?: string; wasClean?: boolean;
    constructor(type: string, init?: { code?: number; reason?: string; wasClean?: boolean }) {
      this.type = type; this.code = init?.code; this.reason = init?.reason; this.wasClean = init?.wasClean;
    }
  }
  ;(globalThis as any).CloseEvent = PolyfillCloseEvent as any;
}
if (typeof (globalThis as any).MessageEvent === 'undefined') {
  class PolyfillMessageEvent { type: string; data: any; constructor(type: string, init?: { data?: any }) { this.type = type; this.data = init?.data; } }
  ;(globalThis as any).MessageEvent = PolyfillMessageEvent as any;
}

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Simulate message echo for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }));
      }
    }, 5);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
    }
  }
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as any;

describe('WebSocketClient', () => {
  let client: WebSocketClient;
  let statusChanges: WebSocketStatus[] = [];
  let messages: any[] = [];
  let errors: string[] = [];

  beforeEach(() => {
    statusChanges = [];
    messages = [];
    errors = [];
    
    client = new WebSocketClient({
      url: 'ws://localhost:8000/test',
      maxReconnectAttempts: 3,
      reconnectDelay: 50,
      heartbeatInterval: 200,
      enableLogging: false,
    });

    client.on('statusChange', (status) => statusChanges.push(status));
    client.on('message', (message) => messages.push(message));
    client.on('error', (error) => errors.push(error));
  });

  afterEach(() => {
    try { client.disconnect(); } catch {}
    // Ensure global WebSocket is restored to the base mock between tests
    global.WebSocket = MockWebSocket as any;
    vi.clearAllTimers();
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      expect(client.getStatus()).toBe(WebSocketStatus.DISCONNECTED);
      
      await client.connect();
      
      expect(client.getStatus()).toBe(WebSocketStatus.CONNECTED);
      expect(statusChanges).toContain(WebSocketStatus.CONNECTING);
      expect(statusChanges).toContain(WebSocketStatus.CONNECTED);
    });

    it('should disconnect cleanly', async () => {
      await client.connect();
      expect(client.getStatus()).toBe(WebSocketStatus.CONNECTED);
      
      client.disconnect();
      
      expect(client.getStatus()).toBe(WebSocketStatus.DISCONNECTED);
    });

    it('should not connect if already connected', async () => {
      await client.connect();
      const initialStatusChanges = statusChanges.length;
      
      await client.connect(); // Should not trigger new connection
      
      expect(statusChanges.length).toBe(initialStatusChanges);
      expect(client.getStatus()).toBe(WebSocketStatus.CONNECTED);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should send messages when connected', async () => {
      const testData = { test: 'data' };
      
      await client.sendMessage('test_message', testData);
      
      // Wait for message to be processed
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(messages.length).toBeGreaterThan(0);
      const sentMessage = JSON.parse(messages[0]);
      expect(sentMessage.type).toBe('test_message');
      expect(sentMessage.data).toEqual(testData);
    });

    it('should queue messages when disconnected', async () => {
      client.disconnect();
      
      await client.sendMessage('queued_message', { test: 'queued' });
      
      expect(client.getQueueLength()).toBe(1);
    });

    it('should process queued messages on reconnection', async () => {
      client.disconnect();
      
      await client.sendMessage('queued_message', { test: 'queued' });
      expect(client.getQueueLength()).toBe(1);
      
      await client.connect();
      
      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(client.getQueueLength()).toBe(0);
    });

    it('should handle message retries', async () => {
      // Mock a failing send
      const originalSend = MockWebSocket.prototype.send;
      let sendAttempts = 0;
      
      MockWebSocket.prototype.send = function(data: string) {
        sendAttempts++;
        if (sendAttempts < 3) {
          throw new Error('Send failed');
        }
        return originalSend.call(this, data);
      };

      await client.sendMessage('retry_message', { test: 'retry' }, { maxRetries: 3 });
      
      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(sendAttempts).toBe(3);
      
      // Restore original send
      MockWebSocket.prototype.send = originalSend;
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on unexpected disconnect', async () => {
      await client.connect();
      
      // Simulate unexpected disconnect
      const mockSocket = (client as any).socket;
      mockSocket.close(1006, 'Connection lost'); // Abnormal closure
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(statusChanges).toContain(WebSocketStatus.RECONNECTING);
    });

    it('should not reconnect on manual disconnect', async () => {
      await client.connect();
      
      client.disconnect();
      
      // Wait to ensure no reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(statusChanges.filter(s => s === WebSocketStatus.RECONNECTING)).toHaveLength(0);
    });

    it('should give up after max reconnect attempts', async () => {
      // Use a fresh client with a single reconnect attempt for determinism
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            if (this.onerror) this.onerror(new Event('error'));
            if (this.onclose) this.onclose(new CloseEvent('close', { code: 1006, reason: 'Connection failed' }));
          }, 10);
        }
      } as any;

      const localClient = new WebSocketClient({
        url: 'ws://localhost:8000/test',
        maxReconnectAttempts: 1,
        reconnectDelay: 50,
        heartbeatInterval: 200,
        enableLogging: false,
      });

      try {
        // Trigger a connection attempt but do not await the promise to avoid race conditions
        // with overlapping open/error events in this mock.
        // Instead, wait for the client to enter ERROR state deterministically.
        void localClient.connect().catch(() => {});
        // Poll for ERROR state with an upper bound
        const start = Date.now();
        let reached = false;
        while (Date.now() - start < 1200) {
          if (localClient.getStatus() === WebSocketStatus.ERROR) { reached = true; break; }
          await new Promise((r) => setTimeout(r, 20));
        }
        expect(reached).toBe(true);
      } finally {
        try { localClient.disconnect(); } catch {}
        global.WebSocket = originalWebSocket;
      }
    });
  });

  describe('Heartbeat', () => {
    it('should send heartbeat messages', async () => {
      await client.connect();
      // Wait for a heartbeat via the message stream (with a safety timeout)
      const sawHeartbeat = await new Promise<boolean>((resolve) => {
        const to = setTimeout(() => resolve(false), 1000);
        client.on('message', (msg) => {
          try {
            const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
            if (parsed?.type === 'heartbeat') {
              clearTimeout(to);
              resolve(true);
            }
          } catch {}
        });
      });
      expect(sawHeartbeat).toBe(true);
    });
  });

  describe('Message Acknowledgment', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should handle acknowledgment messages', async () => {
      // Mock acknowledgment response
      const mockSocket = (client as any).socket;
      const originalSend = mockSocket.send;
      
      mockSocket.send = function(data: string) {
        const message = JSON.parse(data);
        
        // Send acknowledgment
        setTimeout(() => {
          if (mockSocket.onmessage) {
            mockSocket.onmessage(new MessageEvent('message', {
              data: JSON.stringify({
                id: 'ack_' + Date.now(),
                type: 'ack',
                timestamp: Date.now(),
                data: {
                  original_message_id: message.id,
                  success: true,
                  message: 'Message received'
                }
              })
            }));
          }
        }, 10);
        
        return originalSend.call(this, data);
      };

      const result = await client.sendMessage('test_ack', { test: 'ack' }, { requireAck: true });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should timeout on missing acknowledgment', async () => {
      const promise = client.sendMessage('test_timeout', { test: 'timeout' }, { 
        requireAck: true, 
        timeout: 100 
      });
      
      await expect(promise).rejects.toThrow('Message timeout');
    });
  });

  describe('Queue Management', () => {
    it('should clear message queue', async () => {
      client.disconnect();
      
      await client.sendMessage('msg1', {});
      await client.sendMessage('msg2', {});
      
      expect(client.getQueueLength()).toBe(2);
      
      client.clearQueue();
      
      expect(client.getQueueLength()).toBe(0);
    });
  });
});

'use strict';
/**
 * Global test setup for Vitest
 */
Object.defineProperty(exports, '__esModule', { value: true });
const vitest_1 = require('vitest');
// Global test setup
(0, vitest_1.beforeAll)(() => {
  // Setup that runs once before all tests
  console.log('Starting Schillinger SDK test suite');
});
(0, vitest_1.afterAll)(() => {
  // Cleanup that runs once after all tests
  console.log('Finished Schillinger SDK test suite');
});
(0, vitest_1.beforeEach)(() => {
  // Setup that runs before each test
  // Clear any global state, reset mocks, etc.
});
(0, vitest_1.afterEach)(() => {
  // Cleanup that runs after each test
  // Clear timers, restore mocks, etc.
});
// Mock global objects if needed
global.fetch =
  global.fetch ||
  (() => Promise.reject(new Error('Fetch not available in test environment')));
// Mock localStorage for browser-like environment
const localStorageMock = {
  getItem: key => null,
  setItem: (key, value) => {},
  removeItem: key => {},
  clear: () => {},
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
// Provide a minimal MockWebSocket for Node test environment if not present
if (typeof global.WebSocket === 'undefined') {
  class MockWebSocket {
    constructor(url, protocols) {
      this.readyState = MockWebSocket.CONNECTING;
      this.messageQueue = [];
      this.url = url;
      this.protocols = protocols || [];
      setTimeout(() => {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) this.onopen(new Event('open'));
      }, 0);
    }
    send(data) {
      if (this.readyState === MockWebSocket.OPEN) this.messageQueue.push(data);
    }
    close(code, reason) {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose)
        this.onclose(new CloseEvent('close', { code: code || 1000, reason }));
    }
    // helpers
    simulateMessage(data) {
      if (this.onmessage)
        this.onmessage(
          new MessageEvent('message', { data: JSON.stringify(data) })
        );
    }
    simulateError() {
      if (this.onerror) this.onerror(new Event('error'));
    }
    getLastMessage() {
      const last = this.messageQueue[this.messageQueue.length - 1];
      return last ? JSON.parse(last) : null;
    }
    getAllMessages() {
      return this.messageQueue.map(m => JSON.parse(m));
    }
    clearMessages() {
      this.messageQueue = [];
    }
  }
  MockWebSocket.CONNECTING = 0;
  MockWebSocket.OPEN = 1;
  MockWebSocket.CLOSING = 2;
  MockWebSocket.CLOSED = 3;
  global.WebSocket = MockWebSocket;
}
// Polyfills for MessageEvent and CloseEvent in Node test environment
if (typeof global.MessageEvent === 'undefined') {
  class MessageEvent {
    constructor(type, init) {
      this.type = type;
      this.data = init?.data;
    }
  }
  global.MessageEvent = MessageEvent;
}
if (typeof global.CloseEvent === 'undefined') {
  class CloseEvent {
    constructor(type, init) {
      this.type = type;
      this.code = init?.code || 1000;
      this.reason = init?.reason;
    }
  }
  global.CloseEvent = CloseEvent;
}
// Mock console methods for cleaner test output
const originalConsole = { ...console };
(0, vitest_1.beforeEach)(() => {
  // Optionally suppress console output during tests
  // console.log = vi.fn();
  // console.warn = vi.fn();
  // console.error = vi.fn();
});
(0, vitest_1.afterEach)(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

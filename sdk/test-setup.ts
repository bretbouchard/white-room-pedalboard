/**
 * Global test setup for Vitest
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { config } from "dotenv";
import { join } from "path";
import {
  setupIntegrationTests,
  cleanupIntegrationTests,
} from "./tests/integration/setup";
import { setupFetchMock, createMockSDK } from "./tests/__mocks__/mock-sdk";

// Load test environment variables
config({ path: join(__dirname, "tests/integration/.env.test") });

// Global test setup
beforeAll(async () => {
  // Setup that runs once before all tests
  console.log("Starting Schillinger SDK test suite");
  console.log("USE_MOCK_API:", process.env.USE_MOCK_API);
  console.log("MOCK_API_PORT:", process.env.MOCK_API_PORT);

  // Start mock server for integration tests
  if (process.env.USE_MOCK_API === "true") {
    console.log("🚀 Starting mock server setup...");
    try {
      await setupIntegrationTests();
      console.log("✅ Mock server setup completed");
    } catch (error) {
      console.error("❌ Mock server setup failed:", error);
      throw error;
    }
  }
}, 30000); // Increase timeout to 30 seconds

afterAll(async () => {
  // Cleanup that runs once after all tests
  console.log("Finished Schillinger SDK test suite");

  // Stop mock server
  if (process.env.USE_MOCK_API === "true") {
    try {
      await cleanupIntegrationTests();
    } catch (error) {
      console.warn("Warning: Cleanup failed:", error);
    }
  }
}, 10000); // Increase timeout to 10 seconds

beforeEach(() => {
  // Setup that runs before each test
  // Clear any global state, reset mocks, etc.
});

afterEach(() => {
  // Cleanup that runs after each test
  // Clear timers, restore mocks, etc.
});

// Mock global objects if needed
global.fetch =
  global.fetch ||
  (() => Promise.reject(new Error("Fetch not available in test environment")));

// Mock localStorage for browser-like environment
const localStorageMock = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {},
};

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Provide a minimal MockWebSocket for Node test environment if not present
if (typeof (global as any).WebSocket === "undefined") {
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
      setTimeout(() => {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) this.onopen(new Event("open"));
      }, 0);
    }

    send(data: string) {
      if (this.readyState === MockWebSocket.OPEN) this.messageQueue.push(data);
    }

    close(code?: number, reason?: string) {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose)
        this.onclose(new CloseEvent("close", { code: code || 1000, reason }));
    }

    // helpers
    simulateMessage(data: any) {
      if (this.onmessage)
        this.onmessage(
          new MessageEvent("message", { data: JSON.stringify(data) }),
        );
    }

    simulateError() {
      if (this.onerror) this.onerror(new Event("error"));
    }

    getLastMessage() {
      const last = this.messageQueue[this.messageQueue.length - 1];
      return last ? JSON.parse(last) : null;
    }

    getAllMessages() {
      return this.messageQueue.map((m) => JSON.parse(m));
    }

    clearMessages() {
      this.messageQueue = [];
    }
  }

  (global as any).WebSocket = MockWebSocket;
}

// Polyfills for MessageEvent and CloseEvent in Node test environment
if (typeof (global as any).MessageEvent === "undefined") {
  class MessageEvent {
    type: string;
    data: any;
    constructor(type: string, init?: { data?: any }) {
      this.type = type;
      this.data = init?.data;
    }
  }
  (global as any).MessageEvent = MessageEvent;
}

if (typeof (global as any).CloseEvent === "undefined") {
  class CloseEvent {
    type: string;
    code: number;
    reason?: string;
    constructor(type: string, init?: { code?: number; reason?: string }) {
      this.type = type;
      this.code = init?.code || 1000;
      this.reason = init?.reason;
    }
  }
  (global as any).CloseEvent = CloseEvent;
}

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeEach(() => {
  // Optionally suppress console output during tests
  // console.log = vi.fn();
  // console.warn = vi.fn();
  // console.error = vi.fn();
  // expose createMockSDK globally for tests that need the full mock
  try {
    (global as any).__createMockSDK = createMockSDK;
  } catch (err) {
    // ignore
  }
});

afterEach(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

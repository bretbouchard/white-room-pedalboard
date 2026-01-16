// Global test setup file
// This file can be used for global test setup, mocking, or environment configuration

console.log('Running global test setup...');

// Minimal polyfills for WebSocket-related events in Node environment
if (typeof (globalThis as any).CloseEvent === 'undefined') {
  class PolyfillCloseEvent {
    type: string;
    code?: number;
    reason?: string;
    wasClean?: boolean;
    constructor(type: string, init?: { code?: number; reason?: string; wasClean?: boolean }) {
      this.type = type;
      this.code = init?.code;
      this.reason = init?.reason;
      this.wasClean = init?.wasClean;
    }
  }
  ;(globalThis as any).CloseEvent = PolyfillCloseEvent as any;
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
  ;(globalThis as any).MessageEvent = PolyfillMessageEvent as any;
}

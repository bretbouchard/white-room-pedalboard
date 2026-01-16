// Root setup file for tests
// This file can be used for global test setup, mocking, or environment configuration

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Canvas API for tests that use canvas
if (typeof HTMLCanvasElement !== 'undefined') {
  (HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  }));
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Robust Mock WebSocket for tests
// Provides: readyState transitions, addEventListener/removeEventListener,
// legacy onopen/onmessage/onerror/onclose properties, dispatchEvent that
// wraps message payloads as `{ data }` (MessageEvent-like), and deterministic
// echo semantics for send(). This mock is intentionally self-contained so
// integration tests using the global WebSocket behave consistently.
function createTestMockWebSocket(): any {
  const listeners = new Map<string, Set<(ev?: any) => void>>();

  const addEventListener = vi.fn((type: string, handler: (ev?: any) => void) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(handler);
    // If event already occurred (open), schedule a late async invocation
    try {
      if (type === 'open' && (ws as any).readyState === 1) setTimeout(() => handler({}), 0);
      if (type === 'error' && (ws as any).__lastError) setTimeout(() => handler((ws as any).__lastError), 0);
      if (type === 'close' && (ws as any).__lastClose) setTimeout(() => handler((ws as any).__lastClose), 0);
    } catch (e) {
      // ignore
    }
  });

  const removeEventListener = vi.fn((type: string, handler: (ev?: any) => void) => {
    listeners.get(type)?.delete(handler);
  });

  const dispatchEvent = vi.fn((type: string, data?: any) => {
    const ev = type === 'message' ? { data } : data;
    try {
      if (type === 'error') (ws as any).__lastError = data;
      if (type === 'close') (ws as any).__lastClose = data;
      if (type === 'open') (ws as any).__lastOpen = true;
    } catch (e) {
      // ignore
    }
    listeners.get(type)?.forEach(h => {
      try { h(ev); } catch (_) { /* swallow */ }
    });
    // legacy handlers
    try {
      if (type === 'open' && typeof (ws as any).onopen === 'function') (ws as any).onopen(ev);
      if (type === 'message' && typeof (ws as any).onmessage === 'function') (ws as any).onmessage(ev);
      if (type === 'error' && typeof (ws as any).onerror === 'function') (ws as any).onerror(ev);
      if (type === 'close' && typeof (ws as any).onclose === 'function') (ws as any).onclose(ev);
    } catch (e) {
      // swallow
    }
  });

  const ws: any = {
    // READY STATE constants and initial state
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    readyState: 0,
    // legacy properties
    onopen: undefined,
    onmessage: undefined,
    onerror: undefined,
    onclose: undefined,
    addEventListener,
    removeEventListener,
    dispatchEvent,
    // aliases used in some test helpers
    on: addEventListener,
    off: removeEventListener,
    emit: dispatchEvent,
    send: vi.fn((payload?: any) => {
      // publish a message event asynchronously to emulate network
      setTimeout(() => {
        try {
          const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
          dispatchEvent('message', data);
        } catch (e) { dispatchEvent('error', e); }
      }, 0);
    }),
    close: vi.fn((code?: number, reason?: string) => {
      ws.readyState = 3;
      dispatchEvent('close', { code: code ?? 1000, reason: reason ?? '' });
    }),
  } as any;

  // simulate async open
  setTimeout(() => {
    try { (ws as any).readyState = 1; (ws as any).dispatchEvent('open'); } catch (e) { (ws as any).dispatchEvent('error', e); }
  }, 0);

  return ws as WebSocket;
}

// Global constructor that returns the mock socket. Some code expects to call
// WebSocket as a constructor (new WebSocket(url)) while other shims may call
// it as a function — support both by making the global a class.
  global.WebSocket = class {
  constructor(url?: string) {
    const socket: any = createTestMockWebSocket();
    try {
      (globalThis as any).__lastMockWebSocket = socket;
      const lastSDK = (globalThis as any).__lastTestSDK;
      if (lastSDK && !(lastSDK as any)._realtimeSocket) {
        try { (lastSDK as any)._realtimeSocket = socket; } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }

    // simulate immediate failure for obviously bad URLs
    if (typeof url === 'string' && (url.includes(':0') || url.includes('invalid') || url.includes('fail'))) {
      setTimeout(() => {
        (socket as any).readyState = 3;
        (socket as any).dispatchEvent('error', new Error('WebSocket connection failed'));
        (socket as any).dispatchEvent('close', { code: 1006 });
      }, 0);
    }

    return socket;
  }
} as any;

console.log('Running root setup...');

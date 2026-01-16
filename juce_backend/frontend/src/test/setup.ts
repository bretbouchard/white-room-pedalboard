import '@testing-library/jest-dom';
import { vi, describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure DOM globals are available
if (typeof global !== 'undefined') {
  // Make sure DOM globals are available in Node environment
  Object.assign(global, {
    document: globalThis.document,
    window: globalThis.window,
    navigator: globalThis.navigator,
    location: globalThis.location,
  });
}

// Make vitest globals available
Object.assign(globalThis, {
  vi,
  describe,
  it,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
});

// Mock IndexedDB for cache tests
const mockIndexedDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      createObjectStore: vi.fn(() => ({
        createIndex: vi.fn(),
        add: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getAll: vi.fn(),
        count: vi.fn(),
      })),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          getAll: vi.fn(),
          count: vi.fn(),
          put: vi.fn(),
        })),
        oncomplete: null,
        onerror: null,
        onabort: null,
      })),
      close: vi.fn(),
    },
  })),
  deleteDatabase: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
  })),
};

// Mock indexedDB global
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock WebSocket globally for tests
global.WebSocket = class MockWebSocket {
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
  }

  send(_data: string) {
    // Mock implementation
  }

  close(_code?: number, _reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
  }
} as any;

// Mock Canvas API for tests that use canvas
const mockCanvas = {
  getContext: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    fillText: vi.fn(),
    strokeText: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,'),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  width: 300,
  height: 150,
  style: {},
};

// Mock HTMLCanvasElement
Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class HTMLCanvasElement {
    getContext = mockCanvas.getContext;
    toDataURL = mockCanvas.toDataURL;
    addEventListener = mockCanvas.addEventListener;
    removeEventListener = mockCanvas.removeEventListener;
    width = mockCanvas.width;
    height = mockCanvas.height;
    style = mockCanvas.style;
  },
  writable: true,
});

// Mock SVG elements with simpler approach
class MockSVGElement {
  setAttribute = vi.fn();
  getAttribute = vi.fn();
  removeAttribute = vi.fn();
  appendChild = vi.fn();
  removeChild = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  getBoundingClientRect = vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }));
  style = {};
  classList = {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(() => false),
    toggle: vi.fn(),
  };
  nodeType = 1; // Element node
  nodeName = 'svg';
  parentNode = null;
  childNodes = [];
  children = [];
  textContent = '';
  innerHTML = '';
  constructor() {
    // No constructor issues
  }
}

// Enhanced DOM element mock with complete method implementation
class MockDOMElement {
  setAttribute = vi.fn();
  getAttribute = vi.fn(() => null);
  removeAttribute = vi.fn();
  hasAttribute = vi.fn(() => false);
  setAttributeNS = vi.fn();
  getAttributeNS = vi.fn(() => null);
  appendChild = vi.fn();
  removeChild = vi.fn();
  insertBefore = vi.fn();
  replaceChild = vi.fn();
  cloneNode = vi.fn(() => new MockDOMElement());
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);
  getBoundingClientRect = vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }));
  querySelector = vi.fn(() => null);
  querySelectorAll = vi.fn(() => []);
  closest = vi.fn(() => null);
  matches = vi.fn(() => false);
  focus = vi.fn();
  blur = vi.fn();
  click = vi.fn();
  style = {};
  classList = {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(() => false),
    toggle: vi.fn(),
    length: 0,
    item: vi.fn(() => null),
  };
  dataset = {};
  nodeType = 1; // Element node
  nodeName = 'div';
  tagName = 'DIV';
  parentNode = null;
  parentElement = null;
  childNodes = [];
  children = [];
  firstChild = null;
  lastChild = null;
  nextSibling = null;
  previousSibling = null;
  textContent = '';
  innerHTML = '';
  innerText = '';
  id = '';
  className = '';
  scrollTop = 0;
  scrollLeft = 0;
  offsetWidth = 100;
  offsetHeight = 100;
  clientWidth = 100;
  clientHeight = 100;

  constructor(tagName: string = 'div') {
    this.nodeName = tagName.toUpperCase();
    this.tagName = tagName.toUpperCase();
  }
}

// Mock document.createElement for canvas, SVG, and all other elements
const originalCreateElement = global.document?.createElement;
if (global.document) {
  global.document.createElement = vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas as any;
    }
    // Return enhanced mock for all other elements
    return new MockDOMElement(tagName) as any;
  });
}

// Mock document.createElementNS for SVG and other namespaces
if (global.document) {
  global.document.createElementNS = vi.fn((namespace: string, tagName: string) => {
    // Return enhanced mock for all namespace elements
    const element = new MockDOMElement(tagName) as any;
    element.namespaceURI = namespace;
    return element;
  });
}

// Global cleanup after each test to ensure proper isolation
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
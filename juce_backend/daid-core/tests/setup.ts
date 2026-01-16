// Vitest setup file for DAID Core tests
import { beforeEach, afterEach, expect, vi } from 'vitest';

// Mock console methods to reduce noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Reset console mocks before each test
  console.warn = vi.fn() as unknown as typeof console.warn;
  console.error = vi.fn() as unknown as typeof console.error;
});

afterEach(() => {
  // Restore original console methods after each test
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test utilities
// @ts-expect-error define global in test env
globalThis.testUtils = {
  createMockDAID: (overrides = {}) => {
    const defaults = {
      agentId: 'test-agent',
      entityType: 'test-entity',
      entityId: 'test-id',
      operation: 'create',
    };
    return { ...defaults, ...overrides };
  },

  createMockProvenanceRecord: (overrides = {}) => {
    const defaults = {
      entityType: 'test-entity',
      entityId: 'test-id',
      operation: 'create',
      metadata: { test: true },
    };
    return { ...defaults, ...overrides };
  },

  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Custom matcher for DAID validation
expect.extend({
  toBeValidDAID(received: string) {
    const daidRegex = /^daid:v\d+\.\d+:[^:]+:[^:]+:[^:]+:[^:]+:[a-f0-9]{16}$/;
    const pass = typeof received === 'string' && daidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid DAID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid DAID`,
        pass: false,
      };
    }
  },
});

export {}; // ensure this file is treated as a module

// Global vitest setup file to ensure globals are available in all test environments
import { vi, describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Make vitest globals available globally
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

export {};

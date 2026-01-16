/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    include: [
      'packages/core/src/__tests__/expansion-simple.test.ts',
      'packages/core/src/__tests__/integration-performance.test.ts',
    ],
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
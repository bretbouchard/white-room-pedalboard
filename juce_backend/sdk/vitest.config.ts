/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000, // 10 second timeout for individual tests
    hookTimeout: 30000, // 30 second timeout for hooks
    teardownTimeout: 10000, // 10 second timeout for teardown
    // Only run SDK TypeScript test files within the packages directory
    include: [
      'packages/**/__tests__/**/*.test.ts',
      'packages/**/__tests__/**/*.spec.ts',
    ],
    isolate: true, // Each test file gets a fresh VM
    restoreMocks: true,
    clearMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    // Run tests sequentially to avoid port conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],
    },
    setupFiles: ['./test-setup.ts'],
  },
  resolve: {
    alias: {
      'shared': resolve(__dirname, './packages/shared/src'),
      'core': resolve(__dirname, './packages/core/src'),
      'gateway': resolve(__dirname, './packages/gateway/src'),
      'analysis': resolve(__dirname, './packages/analysis/src'),
      'audio': resolve(__dirname, './packages/audio/src'),
      'admin': resolve(__dirname, './packages/admin/src'),
      'generation': resolve(__dirname, './packages/generation/src'),
    },
  },
});

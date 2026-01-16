'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
/// <reference types="vitest" />
const config_1 = require('vitest/config');
const path_1 = require('path');
exports.default = (0, config_1.defineConfig)({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 5000, // 5 second timeout for individual tests
    hookTimeout: 5000, // 5 second timeout for hooks
    teardownTimeout: 2000, // 2 second timeout for teardown
    bail: 1, // Stop after first timeout to identify the culprit
    // Only run TypeScript test files to avoid executing compiled .js artifacts
    include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.spec.ts'],
    isolate: true, // Each test file gets a fresh VM
    restoreMocks: true,
    clearMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
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
      '@schillinger-sdk/shared': (0, path_1.resolve)(
        __dirname,
        './packages/shared/src'
      ),
      '@schillinger-sdk/core': (0, path_1.resolve)(
        __dirname,
        './packages/core/src'
      ),
      '@schillinger-sdk/gateway': (0, path_1.resolve)(
        __dirname,
        './packages/gateway/src'
      ),
      '@schillinger-sdk/analysis': (0, path_1.resolve)(
        __dirname,
        './packages/analysis/src'
      ),
      '@schillinger-sdk/audio': (0, path_1.resolve)(
        __dirname,
        './packages/audio/src'
      ),
      '@schillinger-sdk/admin': (0, path_1.resolve)(
        __dirname,
        './packages/admin/src'
      ),
      '@schillinger-sdk/generation': (0, path_1.resolve)(
        __dirname,
        './packages/generation/src'
      ),
    },
  },
});

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
/// <reference types="vitest" />
const config_1 = require('vitest/config');
const path_1 = require('path');
exports.default = (0, config_1.defineConfig)({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60 seconds for performance tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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
    include: ['tests/performance/**/*.test.ts'],
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/performance-results.json',
    },
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

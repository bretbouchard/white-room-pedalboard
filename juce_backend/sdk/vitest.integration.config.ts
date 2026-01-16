/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60 seconds for integration tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
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
        'tests/integration/setup.ts',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    setupFiles: ['./tests/integration/setup.ts'],
    // Run integration tests sequentially to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Retry failed tests once
    retry: 1,
    // Include only integration test files
    include: ['tests/integration/**/*.test.ts'],
    // Exclude unit tests
    exclude: [
      'packages/**/tests/**/*.test.ts',
      'packages/**/__tests__/**/*.test.ts',
    ],
    // Custom reporters for integration tests
    reporters: [
      'default',
      'json',
      'html',
      ['junit', { outputFile: 'test-reports/integration-junit.xml' }],
    ],
    // Environment variables for integration tests
    env: {
      NODE_ENV: 'test',
      VITEST_INTEGRATION: 'true',
    },
  },
  resolve: {
    alias: {
      '@schillinger-sdk/shared': resolve(__dirname, './packages/shared/src'),
      '@schillinger-sdk/core': resolve(__dirname, './packages/core/src'),
      '@schillinger-sdk/gateway': resolve(__dirname, './packages/gateway/src'),
      '@schillinger-sdk/analysis': resolve(__dirname, './packages/analysis/src'),
      '@schillinger-sdk/audio': resolve(__dirname, './packages/audio/src'),
      '@schillinger-sdk/admin': resolve(__dirname, './packages/admin/src'),
      '@schillinger-sdk/generation': resolve(
        __dirname,
        './packages/generation/src'
      ),
    },
  },
  // Define test sequences for different scenarios
  define: {
    __INTEGRATION_TEST_SUITES__: JSON.stringify({
      api: ['api-integration.test.ts', 'auth-integration.test.ts'],
      realtime: ['websocket.test.ts'],
      crossPlatform: ['cross-platform.test.ts'],
      environment: ['environment.test.ts'],
      full: [
        'api-integration.test.ts',
        'auth-integration.test.ts',
        'websocket.test.ts',
        'cross-platform.test.ts',
        'environment.test.ts',
      ],
    }),
  },
});

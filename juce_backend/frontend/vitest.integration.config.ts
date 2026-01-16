/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./sdk/tests/integration/setup.ts'],
    include: [
      'sdk/tests/integration/**/*.test.ts',
    ],
    exclude: [
      'sdk/node_modules/**',
    ],
    env: {
      USE_MOCK_API: 'true',
      // Let the mock choose an open port; tests read MOCK_API_PORT after boot
      // MOCK_API_PORT: '0'
    },
  },
  resolve: {
    alias: {
      '@schillinger-sdk/shared': resolve(__dirname, './sdk/packages/shared/src'),
      '@schillinger-sdk/core': resolve(__dirname, './sdk/packages/core/src'),
      '@schillinger-sdk/gateway': resolve(__dirname, './sdk/packages/gateway/src'),
      '@schillinger-sdk/analysis': resolve(__dirname, './sdk/packages/analysis/src'),
      '@schillinger-sdk/audio': resolve(__dirname, './sdk/packages/audio/src'),
      '@schillinger-sdk/admin': resolve(__dirname, './sdk/packages/admin/src'),
      '@schillinger-sdk/generation': resolve(__dirname, './sdk/packages/generation/src'),
    },
  },
})

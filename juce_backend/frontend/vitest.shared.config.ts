/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [resolve(__dirname, './sdk/packages/shared/src/__tests__/setup.ts')],
    include: [
      'sdk/packages/shared/src/**/*.test.ts',
      'sdk/packages/shared/src/**/*.spec.ts',
    ],
    exclude: [
      'sdk/node_modules/**',
    ],
  },
  resolve: {
    alias: {
      '@schillinger-sdk/shared': resolve(__dirname, './sdk/packages/shared/src'),
    },
  },
})

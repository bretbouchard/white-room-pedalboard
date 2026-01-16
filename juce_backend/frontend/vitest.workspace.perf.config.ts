/// <reference types="vitest" />
import { resolve } from 'path'

export default [
  {
    test: {
      name: 'frontend',
      environment: 'jsdom',
      globals: true,
      include: [
        'frontend/src/**/*.test.ts',
        'frontend/src/**/*.test.tsx',
        'frontend/src/**/*.spec.ts',
        'frontend/src/**/*.spec.tsx',
      ],
      setupFiles: ['./src/__tests__/setup.ts'],
      css: true,
    },
    resolve: { alias: { '@': resolve(__dirname, './frontend/src') } },
  },
  {
    extends: './sdk/vitest.config.ts',
    test: {
      name: 'sdk-unit',
      environment: 'node',
      include: [
        'sdk/**/__tests__/**/*.test.ts',
        'sdk/**/__tests__/**/*.spec.ts',
      ],
      exclude: [ 'sdk/packages/shared/**', 'sdk/tests/**' ],
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
  },
  {
    extends: './sdk/vitest.integration.config.ts',
    test: {
      name: 'sdk-integration',
      environment: 'node',
      include: [ 'sdk/tests/integration/**/*.test.ts' ],
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
  },
  {
    extends: './sdk/vitest.performance.config.ts',
    test: {
      name: 'sdk-performance',
      environment: 'node',
      include: [ 'sdk/tests/performance/**/*.test.ts' ],
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
  },
  {
    extends: './sdk/packages/shared/vitest.config.ts',
    test: {
      name: 'sdk-shared',
      environment: 'jsdom',
      include: [
        'sdk/packages/shared/src/**/*.test.ts',
        'sdk/packages/shared/src/**/*.spec.ts',
      ],
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './sdk/packages/shared/src'),
        '@schillinger-sdk/shared': resolve(__dirname, './sdk/packages/shared/src'),
      },
    },
  },
]


/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Prevent root-level test discovery; use only the declared projects below
    include: [],
    exclude: ['**/*'],
    projects: [
      // Frontend project (React + jsdom)
      {
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
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          exclude: [
            'node_modules/',
            'src/test/',
            '**/*.d.ts',
            '**/*.config.*',
            '**/coverage/**',
          ],
        },
        resolve: {
          alias: {
            '@': resolve(__dirname, './frontend/src'),
          },
        },
      },

      // SDK unit tests
      {
        name: 'sdk-unit',
        environment: 'node',
        globals: true,
        include: [
          'sdk/**/__tests__/**/*.test.ts',
          'sdk/**/__tests__/**/*.spec.ts',
        ],
        exclude: [
          'sdk/packages/shared/**',
          'sdk/tests/**',
        ],
        setupFiles: ['./sdk/test-setup.ts'],
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

      // SDK integration tests
      {
        name: 'sdk-integration',
        environment: 'node',
        globals: true,
        include: ['sdk/tests/integration/**/*.test.ts'],
        setupFiles: ['./sdk/tests/integration/setup.ts'],
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

      // Note: performance suite is run via vitest.workspace.perf.config.ts

      // SDK shared package tests
      {
        name: 'sdk-shared',
        environment: 'jsdom',
        globals: true,
        include: [
          'sdk/packages/shared/src/**/*.test.ts',
          'sdk/packages/shared/src/**/*.spec.ts',
        ],
        setupFiles: ['./sdk/packages/shared/src/__tests__/setup.ts'],
        resolve: {
          alias: {
            '@': resolve(__dirname, './sdk/packages/shared/src'),
            '@schillinger-sdk/shared': resolve(__dirname, './sdk/packages/shared/src'),
          },
        },
      },

      // DAID core tests
      {
        name: 'daid-core',
        environment: 'node',
        globals: true,
        include: [
          'daid-core/tests/**/*.test.ts',
          'daid-core/tests/**/*.spec.ts'
        ],
        setupFiles: ['./daid-core/tests/setup.ts'],
        resolve: {
          alias: {
            '@daid-core': resolve(__dirname, './daid-core/src')
          }
        }
      },

      // Removed duplicate alt integration project to avoid double-running tests
    ],
  },
})

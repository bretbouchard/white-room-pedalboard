/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // Increase hook timeout temporarily while debugging long-running hook behavior
    hookTimeout: 60000,
    include: [
      'frontend/src/**/*.test.ts',
      'frontend/src/**/*.test.tsx',
      'frontend/src/**/*.spec.ts',
      'frontend/src/**/*.spec.tsx',
    ],
    deps: {
      optimizer: {
        web: {
          include: ['react', 'react-dom', '@ver0/react-hooks-testing'],
        },
      },
    },
  },
    resolve: {
    // Use regex-based aliases so subpath imports like 'react/jsx-runtime' are rewritten
    alias: [
      { find: '@', replacement: resolve(__dirname, './frontend/src') },
      {
        // Map any import starting with "react" to the frontend package's react folder
        find: /^react(\/.*)?$/,
        replacement: resolve(__dirname, 'frontend', 'node_modules', 'react') + '$1',
      },
      {
        // Map any import starting with "react-dom" to the frontend package's react-dom folder
        find: /^react-dom(\/.*)?$/,
        replacement: resolve(__dirname, 'frontend', 'node_modules', 'react-dom') + '$1',
      },
    ],
  },
})
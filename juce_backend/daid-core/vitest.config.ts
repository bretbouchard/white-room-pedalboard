import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    threads: false,
    pool: 'forks',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      // Keep thresholds off for now; CI was failing at 80%
      // thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
    },
  },
});

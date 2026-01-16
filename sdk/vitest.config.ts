/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { resolve } from "path";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10000, // 10 second timeout for individual tests
    hookTimeout: 30000, // 30 second timeout for hooks
    teardownTimeout: 10000, // 10 second timeout for teardown
    // Run SDK TypeScript test files from /core (authoritative location)
    include: [
      "core/**/__tests__/**/*.test.ts",
      "core/**/__tests__/**/*.spec.ts",
      "core/**/*.test.ts",
      "core/**/*.spec.ts",
      "packages/shared/**/__tests__/**/*.test.ts",
      "packages/shared/**/__tests__/**/*.spec.ts",
      "packages/analysis/**/__tests__/**/*.test.ts",
      "packages/generation/**/__tests__/**/*.test.ts",
      "packages/sdk/**/__tests__/**/*.test.ts",
      "packages/sdk/**/__tests__/**/*.spec.ts",
      "tests/**/**/*.test.ts",
      "tests/**/**/*.spec.ts",
    ],
    isolate: true, // Each test file gets a fresh VM
    restoreMocks: true,
    clearMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    // Run tests in parallel with better isolation to prevent memory buildup
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 4, // Limit concurrent forks to prevent memory exhaustion
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        "**/__tests__/**",
        "**/*.test.*",
        "**/*.spec.*",
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
    setupFiles: ["./test-setup.ts"],
  },
  resolve: {
    alias: {
      shared: resolve(__dirname, "./packages/shared/src"),
      core: resolve(__dirname, "./core"), // New authoritative location
      gateway: resolve(__dirname, "./packages/gateway/src"),
      analysis: resolve(__dirname, "./packages/analysis/src"),
      audio: resolve(__dirname, "./packages/audio/src"),
      admin: resolve(__dirname, "./packages/admin/src"),
      generation: resolve(__dirname, "./packages/generation/src"),
      structure: resolve(__dirname, "./src/structure"),
    },
  },
});

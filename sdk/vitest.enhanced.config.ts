/**
 * Enhanced Vitest Configuration for Schillinger SDK
 *
 * Features:
 * - Property-based testing with fast-check
 * - Performance benchmarking
 * - Comprehensive coverage
 * - Hardware simulation support
 * - Multi-environment testing
 */

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  // Use tsconfig paths for monorepo support
  plugins: [tsconfigPaths()],

  // Test configuration
  test: {
    // Enable expensive operations for thorough testing
    allowOnly: process.env.CI !== "true",
    isolate: true,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 2,
        maxThreads: 8,
        useAtomics: true,
      },
    },

    // Global test setup
    globals: true,
    setupFiles: ["./tests/utilities/global-setup.ts"],

    // Environment configuration
    environment: "node",
    environmentMatchGlobs: [
      ["**/hardware/**", "jsdom"],
      ["**/integration/**", "node"],
      ["**/end-to-end/**", "jsdom"],
    ],

    // Test timeout and retry
    testTimeout: 30000,
    hookTimeout: 10000,
    retry: process.env.CI ? 2 : 0,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./test-reports/coverage",
      include: [
        "packages/*/src/**/*.ts",
        "!packages/*/src/**/*.d.ts",
        "!packages/*/src/**/*.test.ts",
        "!packages/*/src/**/*.spec.ts",
      ],
      exclude: [
        "packages/*/src/**/*.test.ts",
        "packages/*/src/**/*.spec.ts",
        "packages/*/src/index.ts",
        "node_modules/**",
        "tests/**",
        "dist/**",
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        // Critical modules have higher thresholds
        "packages/shared/src/**": {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        "packages/core/src/**": {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },

    // Reporter configuration
    reporters: [
      "verbose",
      "json",
      "html",
      ["junit", { outputFile: "./test-reports/junit.xml" }],
      "@vitest/coverage-v8",
    ],

    // Output file
    outputFile: {
      html: "./test-reports/index.html",
      json: "./test-reports/results.json",
      junit: "./test-reports/junit.xml",
    },

    // Watch configuration
    watch: !process.env.CI,
    watchExclude: ["node_modules/**", "dist/**", "test-reports/**", ".git/**"],

    // Include and exclude patterns
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.spec.ts",
      "packages/*/src/**/*.test.ts",
      "packages/*/src/**/*.spec.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.git/**",
      "**/test-reports/**",
    ],

    // Test sequencing
    sequence: {
      concurrent: true,
      shuffle: !process.env.CI,
      seed: process.env.VITEST_SEED ? parseInt(process.env.VITEST_SEED) : 42,
    },

    // Performance configuration
    benchmark: {
      include: ["**/performance/**/*.bench.ts"],
      exclude: ["node_modules/**"],
      outputJson: "./test-reports/benchmark-results.json",
      includeSamples: true,
    },

    // Global variables
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "test"),
      "process.env.CI": JSON.stringify(process.env.CI || "false"),
      __SCHILLINGER_VERSION__: JSON.stringify("1.0.0"),
      __TEST_ENVIRONMENT__: JSON.stringify("vitest"),
    },

    // Thread options for property-based testing
    threads: true,
    maxThreads: 8,
    minThreads: 2,

    // File parallelism
    fileParallelism: true,
  },

  // Path aliases for easier imports
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@shared": path.resolve(__dirname, "packages/shared/src"),
      "@core": path.resolve(__dirname, "packages/core/src"),
      "@analysis": path.resolve(__dirname, "packages/analysis/src"),
      "@gateway": path.resolve(__dirname, "packages/gateway/src"),
      "@generation": path.resolve(__dirname, "packages/generation/src"),
      "@admin": path.resolve(__dirname, "packages/admin/src"),
      "@audio": path.resolve(__dirname, "packages/audio/src"),
      "@tests": path.resolve(__dirname, "tests"),
      "@fixtures": path.resolve(__dirname, "tests/fixtures"),
      "@utilities": path.resolve(__dirname, "tests/utilities"),
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ["fast-check", "benchmark", "stats-lite"],
    exclude: ["@schillinger-sdk/*"],
  },
});

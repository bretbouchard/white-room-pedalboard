/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 60000, // 60 seconds for performance tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
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
    },
    setupFiles: ["./test-setup.ts"],
    include: ["tests/performance/**/*.test.ts"],
    reporters: ["verbose", "json"],
    outputFile: {
      json: "./test-results/performance-results.json",
    },
  },
  resolve: {
    alias: {
      "@schillinger-sdk/shared": resolve(__dirname, "./packages/shared/src"),
      "@schillinger-sdk/core": resolve(__dirname, "./packages/core/src"),
      "@schillinger-sdk/gateway": resolve(__dirname, "./packages/gateway/src"),
      "@schillinger-sdk/analysis": resolve(
        __dirname,
        "./packages/analysis/src",
      ),
      "@schillinger-sdk/audio": resolve(__dirname, "./packages/audio/src"),
      "@schillinger-sdk/admin": resolve(__dirname, "./packages/admin/src"),
      "@schillinger-sdk/generation": resolve(
        __dirname,
        "./packages/generation/src",
      ),
    },
  },
});

/**
 * Vitest configuration for @white-room/ffi
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "build/",
        "test/**/*.test.ts",
        "**/*.d.ts",
      ],
    },
  },
});

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "__tests__/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/types/**",
        "dist/",
      ],
    },
    include: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.spec.ts"],
    exclude: ["node_modules/", "dist/"],
  },
});

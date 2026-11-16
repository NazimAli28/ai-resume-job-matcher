import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirrors the one path alias in tsconfig.json.
  resolve: { alias: { "@": resolve("src") } },
  test: {
    include: ["src/**/*.test.ts", "evals/**/*.test.ts"],
    environment: "node",
    // The end-to-end tests talk to the real database and storage in Singapore.
    testTimeout: 30_000,
  },
});

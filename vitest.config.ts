import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/**/*.test.ts", "evals/**/*.test.ts"],
    environment: "node",
    // The end-to-end tests talk to the real database and storage in Singapore.
    testTimeout: 30_000,
  },
});

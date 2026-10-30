import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Local dev reads .env.local; CI and Vercel provide real environment variables.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations use the direct (session-mode) connection; the app uses the pooled one at runtime.
  datasource: { url: env("DIRECT_URL") },
});

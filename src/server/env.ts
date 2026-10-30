import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once on first use. Secrets live only in Vercel / .env.local,
 * never in the repo. Later phases add their keys here (marked optional until that phase ships).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  // Phase 0/1: Supabase (Postgres + Auth + Storage)
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_").optional(),
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_").optional(),
  // Phase 1: email (Resend)
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  // Phase 4: AI (Anthropic)
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-").optional(),
  // Background task tick (pg_cron → /api/tasks/tick)
  CRON_SECRET: z.string().min(32).optional(),
  // Keyed hash for identifiers in logs, rate-limit keys and the deletion ledger
  HASH_PEPPER: z.string().min(32).optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  // An empty line in .env ("KEY=") means "not set yet", not an invalid value.
  const present = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""));
  const parsed = schema.safeParse(present);
  if (!parsed.success) {
    // Names only: never print values.
    const bad = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${bad}`);
  }
  cached = parsed.data;
  return cached;
}

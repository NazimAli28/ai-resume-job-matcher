import "server-only";
import { db } from "./db";

/**
 * Fixed-window counter in Postgres (RateLimitBucket). One atomic upsert per call.
 * Returns ok=false once `limit` hits within `windowSec`.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfterSec: number }> {
  const now = Date.now();
  const start = new Date(Math.floor(now / (windowSec * 1000)) * windowSec * 1000);
  const expiresAt = new Date(start.getTime() + windowSec * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "expiresAt")
    VALUES (${key}, ${start}, 1, ${expiresAt})
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 1);
  return { ok: count <= limit, retryAfterSec: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)) };
}

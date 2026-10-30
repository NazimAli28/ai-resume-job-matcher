import "server-only";
import { createHash } from "node:crypto";
import type { ErrorSource } from "@/generated/prisma/client";
import { db } from "../db";
import { pepperHash } from "../http/request";

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const DIGITS = /\b\d[\d\s-]{6,}\d\b/g; // phone, CNIC and similar runs

/** Strip things that look like personal data before an error is stored. */
export function scrub(text: string, max = 500): string {
  return text.replace(EMAIL, "[email]").replace(DIGITS, "[number]").slice(0, max);
}

/**
 * Record an error grouped by fingerprint (count + last seen). Never throws: logging must
 * not break the request that failed.
 */
export async function captureError(err: unknown, ctx: { source: ErrorSource; route?: string; userId?: string; requestId?: string }) {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    const frame = e.stack?.split("\n").find((l) => l.includes("/src/")) ?? "";
    const fingerprint = createHash("sha256").update(`${e.name}|${ctx.route ?? ""}|${frame.trim()}`).digest("hex");
    const stack = e.stack
      ?.split("\n")
      .slice(1, 11)
      .map((l) => l.replace(/\(.*[\/](src[\/][^)]*)\)/, "($1)").trim())
      .join("\n");
    await db.errorEvent.upsert({
      where: { fingerprint },
      create: {
        fingerprint,
        source: ctx.source,
        route: ctx.route,
        errorClass: e.name,
        message: scrub(e.message),
        stack,
        requestId: ctx.requestId,
        userIdHash: ctx.userId ? pepperHash(ctx.userId) : null,
        release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
      },
      update: { count: { increment: 1 }, lastSeenAt: new Date(), requestId: ctx.requestId, resolvedAt: null },
    });
  } catch {
    console.error("captureError failed");
  }
}

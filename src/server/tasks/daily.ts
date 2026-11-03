import "server-only";
import { db } from "../db";
import { captureError } from "../observability/errors";
import { finalizeDueDeletions } from "../privacy/deletion";
import { supabaseAdmin } from "../supabase/admin";

const DAY = 86_400_000;
const ago = (days: number, now: Date) => new Date(now.getTime() - days * DAY);

/** Uploads that were started but never finished. */
async function sweepAbandonedUploads(now: Date) {
  const stale = await db.resumeUpload.findMany({ where: { status: { in: ["PENDING", "UPLOADED"] }, createdAt: { lt: ago(1, now) } }, select: { id: true, storageKey: true }, take: 200 });
  if (!stale.length) return 0;
  const { error } = await supabaseAdmin().storage.from("resumes").remove(stale.map((u) => u.storageKey));
  // Keep the rows on failure, so tomorrow's run tries these files again.
  if (error) throw new Error("storage remove failed");
  const { count } = await db.resumeUpload.deleteMany({ where: { id: { in: stale.map((u) => u.id) } } });
  return count;
}

/** Retention periods stated in the Privacy Policy. */
async function pruneLogs(now: Date) {
  const [buckets, errors, audits, events] = await Promise.all([
    db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.errorEvent.deleteMany({ where: { lastSeenAt: { lt: ago(90, now) } } }),
    db.auditLog.deleteMany({ where: { createdAt: { lt: ago(365, now) } } }),
    db.productEvent.deleteMany({ where: { createdAt: { lt: ago(400, now) } } }),
  ]);
  return { buckets: buckets.count, errors: errors.count, audits: audits.count, events: events.count };
}

/** One failing job must not stop the others. */
async function step<T>(name: string, run: () => Promise<T>): Promise<T | "failed"> {
  try {
    return await run();
  } catch (e) {
    await captureError(e, { source: "TASK", route: `daily:${name}` });
    return "failed";
  }
}

/** Runs once a day from Vercel Cron. Its database use also keeps the free Supabase project from pausing. */
export async function runDaily(now = new Date()) {
  return {
    deletions: await step("deletions", () => finalizeDueDeletions(now)),
    uploads: await step("uploads", () => sweepAbandonedUploads(now)),
    logs: await step("logs", () => pruneLogs(now)),
  };
}

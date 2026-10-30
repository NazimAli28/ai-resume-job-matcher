import "server-only";
import { db } from "./db";

/** Security-relevant events (sign-in, password change, export, deletion). IDs only, never content. */
export async function audit(action: string, opts: { actorId?: string | null; subjectUserId?: string | null; ipPrefix?: string; metadata?: Record<string, string | number | boolean> } = {}) {
  try {
    await db.auditLog.create({
      data: { action, actorId: opts.actorId ?? null, subjectUserId: opts.subjectUserId ?? null, ipPrefix: opts.ipPrefix, metadata: opts.metadata },
    });
  } catch {
    console.error("audit write failed");
  }
}

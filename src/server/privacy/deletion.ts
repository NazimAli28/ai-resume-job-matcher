import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { audit } from "../audit";
import { db } from "../db";
import { pepperHash } from "../http/request";
import { captureError } from "../observability/errors";
import { supabaseAdmin } from "../supabase/admin";

const BUCKET = "resumes";
export const UNDO_DAYS = 7;

/** Access stops now; the data stays for the undo window. */
export async function requestDeletion(userId: string, ipPrefix?: string) {
  await db.user.updateMany({ where: { id: userId, deletedAt: null }, data: { deletedAt: new Date() } });
  await audit("ACCOUNT_DELETE_REQUESTED", { subjectUserId: userId, ipPrefix });
}

export async function cancelDeletion(userId: string, ipPrefix?: string) {
  const { count } = await db.user.updateMany({ where: { id: userId, deletedAt: { not: null } }, data: { deletedAt: null } });
  if (count) await audit("ACCOUNT_DELETE_CANCELED", { subjectUserId: userId, ipPrefix });
  return count > 0;
}

/**
 * Removes one account for good. Each step can safely run again, so a failure part-way is finished on the
 * next daily run. Sign-in goes before the database row: otherwise a failure could leave a login that
 * recreates an empty account.
 */
export async function purgeAccount(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return;

  const storage = supabaseAdmin().storage.from(BUCKET);
  const prefix = `u/${userId}/uploads`;
  for (;;) {
    const { data, error } = await storage.list(prefix, { limit: 100 });
    if (error) throw new Error("storage list failed");
    if (!data?.length) break;
    const { error: removeError } = await storage.remove(data.map((f) => `${prefix}/${f.name}`));
    if (removeError) throw new Error("storage remove failed");
  }

  const { error } = await supabaseAdmin().auth.admin.deleteUser(userId);
  if (error && error.status !== 404) throw new Error("auth delete failed");

  const userIdHash = pepperHash(userId);
  await db.$transaction([
    db.deletionLedger.create({ data: { emailHash: pepperHash(user.email), userIdHash } }),
    db.productEvent.deleteMany({ where: { userIdHash } }),
    // AI cost totals and security events stay, with nothing pointing back at the person.
    db.aiRequest.updateMany({ where: { userId }, data: { userId: null } }),
    db.auditLog.updateMany({ where: { subjectUserId: userId }, data: { subjectUserId: null, ipPrefix: null, metadata: Prisma.DbNull } }),
    db.auditLog.updateMany({ where: { actorId: userId }, data: { actorId: null } }),
    db.errorEvent.updateMany({ where: { userIdHash }, data: { userIdHash: null } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  await audit("ACCOUNT_DELETED", { metadata: { userIdHash } });
}

export async function finalizeDueDeletions(now = new Date()) {
  const due = await db.user.findMany({ where: { deletedAt: { lte: new Date(now.getTime() - UNDO_DAYS * 86_400_000) } }, select: { id: true }, take: 50 });
  let done = 0;
  for (const { id } of due) {
    try {
      await purgeAccount(id);
      done += 1;
    } catch (e) {
      await captureError(e, { source: "TASK", route: "daily:deletion", userId: id });
    }
  }
  return { due: due.length, done };
}

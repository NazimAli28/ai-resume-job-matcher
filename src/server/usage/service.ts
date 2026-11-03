import "server-only";
import { db } from "../db";
import { limitFor, USAGE_KINDS, type UsageKindName } from "./limits";

export class QuotaError extends Error {}

const monthStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

export const usedThisMonth = (userId: string, kind: UsageKindName) => db.usageLedger.count({ where: { userId, kind, createdAt: { gte: monthStart() } } });

export async function usageFor(userId: string, kind: UsageKindName) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true, isBetaUser: true } });
  return { used: await usedThisMonth(userId, kind), limit: limitFor(user, kind) };
}

export async function usageSummary(user: { id: string; plan: "FREE" | "PRO" | "SPRINT"; isBetaUser: boolean }) {
  const rows = await db.usageLedger.groupBy({ by: ["kind"], where: { userId: user.id, createdAt: { gte: monthStart() } }, _count: true });
  return USAGE_KINDS.map((kind) => ({ kind, used: rows.find((r) => r.kind === kind)?._count ?? 0, limit: limitFor(user, kind) }));
}

export async function assertQuota(userId: string, kind: UsageKindName, reserved = 0) {
  const { used, limit } = await usageFor(userId, kind);
  if (used + reserved >= limit) throw new QuotaError();
}

/** Call only after the work succeeded, so a failure never costs the user anything (X-009). */
export const recordUsage = (userId: string, kind: UsageKindName) => db.usageLedger.create({ data: { userId, kind } });

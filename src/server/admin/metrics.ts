import "server-only";
import { db } from "../db";
import { FUNNEL } from "../events";

const DAY = 86_400_000;

/** Counts and costs only. Nothing here reads resume, job, letter or answer text. */
export async function adminOverview(now = new Date()) {
  const since = (days: number) => new Date(now.getTime() - days * DAY);
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [users, new7, active7, blocked, deleting, versions, jobs, applications, openErrors, unreadFeedback, costDay, costMonth, byTask, latency, killed] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since(7) } } }),
    db.user.count({ where: { lastSeenAt: { gte: since(7) } } }),
    db.user.count({ where: { blockedAt: { not: null } } }),
    db.user.count({ where: { deletedAt: { not: null } } }),
    db.resumeVersion.count({ where: { deletedAt: null } }),
    db.job.count(),
    db.application.count(),
    db.errorEvent.count({ where: { resolvedAt: null } }),
    db.feedback.count({ where: { readAt: null } }),
    db.aiRequest.aggregate({ _sum: { costUsd: true }, where: { createdAt: { gte: dayStart } } }),
    db.aiRequest.aggregate({ _sum: { costUsd: true }, _count: true, where: { createdAt: { gte: monthStart } } }),
    db.aiRequest.groupBy({ by: ["task", "model", "status"], where: { createdAt: { gte: monthStart } }, _count: true, _sum: { costUsd: true, inTok: true, outTok: true, cachedTok: true } }),
    db.$queryRaw<{ p95: number | null }[]>`SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") AS p95 FROM "AiRequest" WHERE "createdAt" >= ${monthStart} AND "status" = 'OK'`,
    db.appSetting.findUnique({ where: { key: "ai_disabled" } }),
  ]);

  const funnel = await Promise.all(
    FUNNEL.map(async (name) => ({ name, people: (await db.productEvent.groupBy({ by: ["userIdHash"], where: { name } })).length })),
  );

  return {
    users: { total: users, new7, active7, blocked, deleting },
    content: { versions, jobs, applications },
    openErrors,
    unreadFeedback,
    ai: {
      costDay: costDay._sum.costUsd ?? 0,
      costMonth: costMonth._sum.costUsd ?? 0,
      requestsMonth: costMonth._count,
      p95Ms: latency[0]?.p95 ?? null,
      byTask,
      killed: killed?.value === true,
    },
    funnel,
  };
}

export async function adminUsers(page: number, size = 50) {
  const rows = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    skip: page * size,
    take: size + 1,
    select: {
      id: true,
      email: true,
      role: true,
      plan: true,
      emailVerified: true,
      blockedAt: true,
      deletedAt: true,
      lastSeenAt: true,
      createdAt: true,
      _count: { select: { versions: true, jobs: true, applications: true } },
    },
  });
  return { rows: rows.slice(0, size), more: rows.length > size };
}

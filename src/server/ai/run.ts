import "server-only";
import { db } from "../db";
import { env } from "../env";
import { captureError } from "../observability/errors";
import { collect } from "../training/service";
import { createAnthropicProvider } from "./provider/anthropic";
import { devFakeProvider } from "./provider/dev-fake";
import { blockedBy, parseLimits, windowStarts, type Period, type Spent, type SpendLimits } from "./limits";
import { AiInvalidOutputError, AiRefusedError, type AiProvider, type StructuredRequest, type StructuredResult } from "./provider/types";

export class AiUnavailableError extends Error {
  constructor(
    public reason: "NOT_CONFIGURED" | "KILL_SWITCH" | "USER_BUDGET" | "GLOBAL_BUDGET" | "FAILED" | "PROVIDER",
    public period?: Period,
  ) {
    super(`ai_unavailable:${reason}`);
  }
}

/** Current limits: the admin's saved values, or the defaults. */
export async function spendLimits(): Promise<SpendLimits> {
  const row = await db.appSetting.findUnique({ where: { key: "ai_limits" } });
  return parseLimits(row?.value);
}

/** Everyone's and one person's spend in each window, in one query. */
export async function spentSoFar(userId: string, now = new Date()): Promise<Spent> {
  const w = windowStarts(now);
  const from = w.week < w.month ? w.week : w.month;
  const [r] = await db.$queryRaw<Spent[]>`
    SELECT
      COALESCE(SUM("costUsd") FILTER (WHERE "createdAt" >= ${w.day}), 0)::float8 AS "globalDay",
      COALESCE(SUM("costUsd") FILTER (WHERE "createdAt" >= ${w.month}), 0)::float8 AS "globalMonth",
      COALESCE(SUM("costUsd") FILTER (WHERE "userId" = ${userId} AND "createdAt" >= ${w.day}), 0)::float8 AS "userDay",
      COALESCE(SUM("costUsd") FILTER (WHERE "userId" = ${userId} AND "createdAt" >= ${w.week}), 0)::float8 AS "userWeek",
      COALESCE(SUM("costUsd") FILTER (WHERE "userId" = ${userId} AND "createdAt" >= ${w.month}), 0)::float8 AS "userMonth"
    FROM "AiRequest"
    WHERE "createdAt" >= ${from}`;
  return r;
}

export async function assertBudget(userId: string) {
  const killed = await db.appSetting.findUnique({ where: { key: "ai_disabled" } });
  if (killed?.value === true) throw new AiUnavailableError("KILL_SWITCH");
  const [spent, limits] = await Promise.all([spentSoFar(userId), spendLimits()]);
  const hit = blockedBy(spent, limits);
  if (hit) throw new AiUnavailableError(hit.scope === "GLOBAL" ? "GLOBAL_BUDGET" : "USER_BUDGET", hit.period);
}

function defaultProvider(): AiProvider {
  const key = env().ANTHROPIC_API_KEY;
  if (key) return createAnthropicProvider(key);
  if (process.env.NODE_ENV === "development") return devFakeProvider;
  throw new AiUnavailableError("NOT_CONFIGURED");
}

/**
 * Every AI call goes through here: budget check, one retry on unusable output (05 §6), and a
 * metadata-only AiRequest row. Callers pass `provider` only in tests.
 */
export async function runAiTask<T>(userId: string, req: StructuredRequest<T>, provider?: AiProvider): Promise<StructuredResult<T> & { exampleId: string | null }> {
  const p = provider ?? defaultProvider();
  await assertBudget(userId);

  const log = (data: { model?: string; usage?: { inTok: number; outTok: number; cachedTok: number }; costUsd?: number; latencyMs?: number; status: "OK" | "INVALID_OUTPUT" | "REFUSED" | "ERROR" }) =>
    db.aiRequest.create({
      data: {
        userId,
        task: req.task,
        promptVersion: req.promptVersion,
        model: data.model ?? req.model,
        inTok: data.usage?.inTok ?? 0,
        outTok: data.usage?.outTok ?? 0,
        cachedTok: data.usage?.cachedTok ?? 0,
        costUsd: data.costUsd ?? 0,
        latencyMs: data.latencyMs ?? 0,
        status: data.status,
      },
    });

  for (let attempt = 1; ; attempt++) {
    try {
      const out = await p.generateStructured(req);
      await log({ model: out.model, usage: out.usage, costUsd: out.costUsd, latencyMs: out.latencyMs, status: "OK" });
      // De-identified copy for AI improvement, only for people who said Yes (never fails the task).
      const exampleId = await collect(userId, { task: req.task, promptVersion: req.promptVersion, model: out.model, input: req.input, output: out.data });
      return { ...out, exampleId };
    } catch (e) {
      if (e instanceof AiRefusedError) {
        await log({ usage: e.usage, costUsd: e.costUsd, status: "REFUSED" });
        throw new AiUnavailableError("FAILED");
      }
      const invalid = e instanceof AiInvalidOutputError;
      await log({ ...(invalid ? { usage: e.usage, costUsd: e.costUsd } : {}), status: invalid ? "INVALID_OUTPUT" : "ERROR" });
      if (invalid && attempt < 2) continue;
      if (invalid) throw new AiUnavailableError("FAILED");
      // Out of credit, a bad key, an outage: the log gets the reason, the user gets a plain message.
      await captureError(e, { source: "ACTION", route: `ai:${req.task}`, userId });
      throw new AiUnavailableError("PROVIDER");
    }
  }
}

/** A person's share used in each window, 0–100, for the settings page. No dollar amounts are shown to users. */
export async function allowanceFor(userId: string) {
  const [s, l] = await Promise.all([spentSoFar(userId), spendLimits()]);
  const pct = (used: number, limit: number) => (limit <= 0 ? 100 : Math.min(100, Math.round((used / limit) * 100)));
  return [
    { period: "day" as const, label: "Today", used: pct(s.userDay, l.userDaily) },
    { period: "week" as const, label: "This week", used: pct(s.userWeek, l.userWeekly) },
    { period: "month" as const, label: "This month", used: pct(s.userMonth, l.userMonthly) },
  ];
}

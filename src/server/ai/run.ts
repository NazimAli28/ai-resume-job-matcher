import "server-only";
import { db } from "../db";
import { env } from "../env";
import { createAnthropicProvider } from "./provider/anthropic";
import { devFakeProvider } from "./provider/dev-fake";
import { AiInvalidOutputError, AiRefusedError, type AiProvider, type StructuredRequest, type StructuredResult } from "./provider/types";

/** PRD §5b. App-level guards in USD; the Anthropic console spend limit sits behind these. */
export const SPEND = { userDaily: 0.5, userMonthly: 1.5, globalDaily: 10 } as const;

export class AiUnavailableError extends Error {
  constructor(public reason: "NOT_CONFIGURED" | "KILL_SWITCH" | "USER_BUDGET" | "GLOBAL_BUDGET" | "FAILED") {
    super(`ai_unavailable:${reason}`);
  }
}

const dayStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

async function spent(where: { userId?: string; since: Date }) {
  const r = await db.aiRequest.aggregate({
    _sum: { costUsd: true },
    where: { createdAt: { gte: where.since }, ...(where.userId ? { userId: where.userId } : {}) },
  });
  return r._sum.costUsd ?? 0;
}

export async function assertBudget(userId: string) {
  const killed = await db.appSetting.findUnique({ where: { key: "ai_disabled" } });
  if (killed?.value === true) throw new AiUnavailableError("KILL_SWITCH");
  if ((await spent({ since: dayStart() })) >= SPEND.globalDaily) throw new AiUnavailableError("GLOBAL_BUDGET");
  if ((await spent({ userId, since: dayStart() })) >= SPEND.userDaily) throw new AiUnavailableError("USER_BUDGET");
  if ((await spent({ userId, since: monthStart() })) >= SPEND.userMonthly) throw new AiUnavailableError("USER_BUDGET");
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
export async function runAiTask<T>(userId: string, req: StructuredRequest<T>, provider?: AiProvider): Promise<StructuredResult<T>> {
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
      return out;
    } catch (e) {
      if (e instanceof AiRefusedError) {
        await log({ usage: e.usage, costUsd: e.costUsd, status: "REFUSED" });
        throw new AiUnavailableError("FAILED");
      }
      const invalid = e instanceof AiInvalidOutputError;
      await log({ ...(invalid ? { usage: e.usage, costUsd: e.costUsd } : {}), status: invalid ? "INVALID_OUTPUT" : "ERROR" });
      if (invalid && attempt < 2) continue;
      throw invalid ? new AiUnavailableError("FAILED") : e;
    }
  }
}

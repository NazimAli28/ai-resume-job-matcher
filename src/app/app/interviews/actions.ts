"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AiUnavailableError } from "@/server/ai/run";
import { requireUser } from "@/server/auth/user";
import * as iv from "@/server/interview/service";
import { captureError } from "@/server/observability/errors";
import { rateLimit } from "@/server/ratelimit";
import { QuotaError } from "@/server/usage/service";

type Fail = { ok: false; error: string };

const AI_MESSAGE: Record<AiUnavailableError["reason"], string> = {
  NOT_CONFIGURED: "Mock interviews aren't switched on yet. Please try again soon.",
  KILL_SWITCH: "AI features are paused for a moment. Please try again later.",
  USER_BUDGET: "You've reached today's limit for AI features. It resets tomorrow.",
  GLOBAL_BUDGET: "We've reached today's limit for AI features. Please try again tomorrow.",
  FAILED: "That didn't work this time. Please try again.",
  PROVIDER: "The AI service is unavailable right now. Your answers are saved: come back and continue when it's ready.",
};

async function guard<T>(route: string, fn: (userId: string) => Promise<T>, limit = 120): Promise<{ ok: true; data: T } | Fail> {
  const user = await requireUser();
  if (!(await rateLimit(`interview:${route}:${user.id}`, limit, 3600)).ok) return { ok: false, error: "Too many requests in a short time. Please wait a little." };
  try {
    return { ok: true, data: await fn(user.id) };
  } catch (e) {
    if (e instanceof QuotaError) return { ok: false, error: "You've used this month's mock interviews. They reset on the 1st." };
    if (e instanceof AiUnavailableError) return { ok: false, error: AI_MESSAGE[e.reason] };
    if (e instanceof iv.NotFoundError) return { ok: false, error: "That interview no longer exists." };
    if (e instanceof iv.StateError) return { ok: false, error: e.message === "too_many_attempts" ? "You've tried this question five times. Try another one." : "That question was already answered. Refresh the page." };
    await captureError(e, { source: "ACTION", route: `app/interviews:${route}`, userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

const configSchema = z.object({
  jobId: z.string().uuid().nullable(),
  resumeVersionId: z.string().uuid().nullable(),
  targetRole: z.string().trim().max(80).nullable(),
  type: z.enum(["BEHAVIORAL", "TECHNICAL", "MIXED", "HR"]),
  count: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  difficulty: z.enum(["EASY", "STANDARD", "HARD"]),
  persona: z.enum(["FRIENDLY_RECRUITER", "HIRING_MANAGER", "TECHNICAL_PANEL", "TOUGH_BUT_FAIR"]),
  timerSec: z.number().int().min(30).max(600),
});

export async function createSessionAction(input: unknown): Promise<{ ok: true; id: string } | Fail> {
  const user = await requireUser();
  const p = configSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Please check the settings." };
  if (!p.data.jobId && !p.data.targetRole) return { ok: false, error: "Choose a job, or type the role you're practicing for." };
  if (p.data.count === 15 && user.plan === "FREE") return { ok: false, error: "15-question sessions come with a paid plan. Choose 5 or 10." };
  const r = await guard("create", (u) => iv.createSession(u, p.data), 10);
  if (!r.ok) return r;
  revalidatePath("/app/interviews");
  return { ok: true, id: r.data.id };
}

const ids = z.object({ s: z.string().uuid(), q: z.string().uuid() });

export async function answerAction(sessionId: unknown, questionId: unknown, text: unknown, durationSec: unknown, hintUsed: unknown) {
  const p = ids.extend({ t: z.string().trim().min(1, "Type your answer first.").max(3000, "Keep answers under 3,000 characters."), d: z.number().int().min(0).max(36000), h: z.boolean() }).safeParse({ s: sessionId, q: questionId, t: text, d: durationSec, h: hintUsed });
  if (!p.success) return { ok: false as const, error: p.error.issues[0]?.message ?? "Please check your answer." };
  const r = await guard("answer", (u) => iv.submitAnswer(u, p.data.s, p.data.q, { text: p.data.t, durationSec: p.data.d, hintUsed: p.data.h }), 200);
  if (r.ok) revalidatePath(`/app/interviews/${p.data.s}`);
  return r;
}

export async function skipAction(sessionId: unknown, questionId: unknown) {
  const p = ids.safeParse({ s: sessionId, q: questionId });
  if (!p.success) return { ok: false as const, error: "That didn't work. Refresh the page." };
  const r = await guard("skip", (u) => iv.skipQuestion(u, p.data.s, p.data.q), 200);
  if (r.ok) revalidatePath(`/app/interviews/${p.data.s}`);
  return r;
}

export async function finishAction(sessionId: unknown) {
  const p = z.string().uuid().safeParse(sessionId);
  if (!p.success) return { ok: false as const, error: "That didn't work. Refresh the page." };
  const r = await guard("finish", (u) => iv.finish(u, p.data), 20);
  if (r.ok) {
    revalidatePath(`/app/interviews/${p.data}`);
    revalidatePath("/app/interviews");
  }
  return r.ok ? { ok: true as const } : r;
}

export async function retryAction(sessionId: unknown, questionId: unknown, text: unknown) {
  const p = ids.extend({ t: z.string().trim().min(1, "Type your answer first.").max(3000, "Keep answers under 3,000 characters.") }).safeParse({ s: sessionId, q: questionId, t: text });
  if (!p.success) return { ok: false as const, error: p.error.issues[0]?.message ?? "Please check your answer." };
  const r = await guard("retry", (u) => iv.retry(u, p.data.s, p.data.q, p.data.t), 30);
  if (r.ok) revalidatePath(`/app/interviews/${p.data.s}/report`);
  return r.ok ? { ok: true as const } : r;
}

export async function modelAnswerAction(sessionId: unknown, questionId: unknown) {
  const p = ids.safeParse({ s: sessionId, q: questionId });
  if (!p.success) return { ok: false as const, error: "That didn't work. Refresh the page." };
  return guard("model", (u) => iv.modelAnswer(u, p.data.s, p.data.q), 60);
}

export async function deleteSessionAction(sessionId: unknown) {
  const p = z.string().uuid().safeParse(sessionId);
  if (!p.success) return { ok: false as const, error: "That didn't work. Refresh the page." };
  const r = await guard("delete", (u) => iv.deleteSession(u, p.data), 60);
  if (r.ok) revalidatePath("/app/interviews");
  return r.ok ? { ok: true as const } : r;
}

export async function prepAction(jobId: unknown, versionId: unknown) {
  const p = z.object({ j: z.string().uuid(), v: z.string().uuid().nullable() }).safeParse({ j: jobId, v: versionId });
  if (!p.success) return { ok: false as const, error: "That didn't work. Refresh the page." };
  const r = await guard("prep", (u) => iv.generatePrep(u, p.data.j, p.data.v), 6);
  if (r.ok) revalidatePath(`/app/jobs/${p.data.j}/interview-prep`);
  return r.ok ? { ok: true as const } : r;
}

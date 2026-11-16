"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AiUnavailableError } from "@/server/ai/run";
import { requireUser } from "@/server/auth/user";
import { captureError } from "@/server/observability/errors";
import { rateLimit } from "@/server/ratelimit";
import * as tailor from "@/server/tailor/service";
import { QuotaError } from "@/server/usage/service";

type Done = { ok: true } | { ok: false; error: string };

const AI_MESSAGE: Record<AiUnavailableError["reason"], string> = {
  NOT_CONFIGURED: "AI suggestions aren't switched on yet. Please try again soon.",
  KILL_SWITCH: "AI features are paused for a moment. Please try again later.",
  USER_BUDGET: "You've reached today's limit for AI features. It resets tomorrow.",
  GLOBAL_BUDGET: "We've reached today's limit for AI features. Please try again tomorrow.",
  FAILED: "We couldn't produce suggestions this time. Please try again.",
  PROVIDER: "AI suggestions are unavailable right now. Please try again later.",
};

const uuid = z.string().uuid();
const sid = z.string().min(2).max(40);

async function run(route: string, path: string, fn: (userId: string) => Promise<unknown>, limit = 300): Promise<Done> {
  const user = await requireUser();
  if (!(await rateLimit(`tailor:edit:${user.id}`, limit, 3600)).ok) return { ok: false, error: "Too many changes in a short time. Please wait a little." };
  try {
    await fn(user.id);
    revalidatePath(path);
    return { ok: true };
  } catch (e) {
    if (e instanceof tailor.NotFoundError) return { ok: false, error: "That suggestion no longer exists. Refresh the page." };
    if (e instanceof tailor.AnswerError) {
      const msg: Record<string, string> = {
        needs_answer: "Answer the question first.",
        bad_value: "Enter just the figure, like 25, 1,200 or 3 weeks.",
        too_short: "Say a little more about where you used it.",
        no_changes: "Accept at least one change first.",
      };
      return { ok: false, error: msg[e.message] ?? "Please check your answer." };
    }
    await captureError(e, { source: "ACTION", route: `app/tailor:${route}`, userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

export async function generateAction(jobId: unknown, versionId: unknown, force: unknown): Promise<Done> {
  const user = await requireUser();
  const j = uuid.safeParse(jobId);
  const v = uuid.safeParse(versionId);
  if (!j.success || !v.success) return { ok: false, error: "That didn't work. Refresh the page." };
  if (!(await rateLimit(`tailor:gen:${user.id}`, 10, 3600)).ok) return { ok: false, error: "You've asked for suggestions several times in a short while. Please wait a little." };
  try {
    await tailor.generate(user.id, j.data, v.data, { force: force === true });
    revalidatePath(`/app/jobs/${j.data}/tailor`);
    return { ok: true };
  } catch (e) {
    if (e instanceof QuotaError) return { ok: false, error: "You've used this month's tailored resumes. They reset on the 1st." };
    if (e instanceof AiUnavailableError) return { ok: false, error: AI_MESSAGE[e.reason] };
    if (e instanceof tailor.NotFoundError) return { ok: false, error: "That job or resume no longer exists." };
    await captureError(e, { source: "ACTION", route: "app/tailor:generate", userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

export async function statusAction(jobId: unknown, sessionId: unknown, suggestionId: unknown, status: unknown): Promise<Done> {
  const p = z.object({ j: uuid, s: uuid, id: sid, st: z.enum(["PENDING", "APPLIED", "DISMISSED"]) }).safeParse({ j: jobId, s: sessionId, id: suggestionId, st: status });
  if (!p.success) return { ok: false, error: "That didn't work. Refresh the page." };
  return run("status", `/app/jobs/${p.data.j}/tailor`, (u) => tailor.setStatus(u, p.data.s, p.data.id, p.data.st));
}

export async function allAction(jobId: unknown, sessionId: unknown, mode: unknown): Promise<Done> {
  const p = z.object({ j: uuid, s: uuid, m: z.enum(["accept", "reset"]) }).safeParse({ j: jobId, s: sessionId, m: mode });
  if (!p.success) return { ok: false, error: "That didn't work. Refresh the page." };
  return run("all", `/app/jobs/${p.data.j}/tailor`, (u) => tailor.setAll(u, p.data.s, p.data.m));
}

export async function editAction(jobId: unknown, sessionId: unknown, suggestionId: unknown, text: unknown): Promise<Done> {
  const p = z.object({ j: uuid, s: uuid, id: sid, t: z.string().trim().min(3, "Write at least a few words.").max(400, "Keep it under 400 characters.") }).safeParse({ j: jobId, s: sessionId, id: suggestionId, t: text });
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check the text." };
  return run("edit", `/app/jobs/${p.data.j}/tailor`, (u) => tailor.editSuggestion(u, p.data.s, p.data.id, p.data.t));
}

export async function answerAction(jobId: unknown, sessionId: unknown, suggestionId: unknown, value: unknown): Promise<Done> {
  const p = z.object({ j: uuid, s: uuid, id: sid, v: z.string().trim().min(1, "Type an answer first.").max(400) }).safeParse({ j: jobId, s: sessionId, id: suggestionId, v: value });
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check your answer." };
  return run("answer", `/app/jobs/${p.data.j}/tailor`, (u) => tailor.answer(u, p.data.s, p.data.id, p.data.v), 120);
}

type FinalizeResult = { ok: true; versionId: string } | { ok: false; error: string };

export async function finalizeAction(jobId: unknown, sessionId: unknown): Promise<FinalizeResult> {
  const user = await requireUser();
  const p = z.object({ j: uuid, s: uuid }).safeParse({ j: jobId, s: sessionId });
  if (!p.success) return { ok: false, error: "That didn't work. Refresh the page." };
  if (!(await rateLimit(`tailor:save:${user.id}`, 30, 3600)).ok) return { ok: false, error: "Too many saves in a short time. Please wait a little." };
  try {
    const v = await tailor.finalize(user.id, p.data.s);
    revalidatePath("/app/resumes");
    return { ok: true, versionId: v.id };
  } catch (e) {
    if (e instanceof tailor.AnswerError) return { ok: false, error: "Accept at least one change first." };
    if (e instanceof tailor.NotFoundError) return { ok: false, error: "That job or resume no longer exists." };
    await captureError(e, { source: "ACTION", route: "app/tailor:finalize", userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

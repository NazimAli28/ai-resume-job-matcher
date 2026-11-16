"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { budgetMessage } from "@/server/ai/limits";
import { AiUnavailableError } from "@/server/ai/run";
import { requireUser } from "@/server/auth/user";
import * as letters from "@/server/cover-letter/service";
import { captureError } from "@/server/observability/errors";
import { rateLimit } from "@/server/ratelimit";
import { QuotaError } from "@/server/usage/service";

type Done = { ok: true } | { ok: false; error: string };

const AI_MESSAGE: Record<AiUnavailableError["reason"], string> = {
  NOT_CONFIGURED: "Cover letters aren't switched on yet. Please try again soon.",
  KILL_SWITCH: "AI features are paused for a moment. Please try again later.",
  USER_BUDGET: "You've reached today's limit for AI features. It resets tomorrow.",
  GLOBAL_BUDGET: "We've reached today's limit for AI features. Please try again tomorrow.",
  FAILED: "We couldn't write a draft this time. Please try again.",
  PROVIDER: "Cover letters are unavailable right now. Please try again later.",
};

const optional = (max: number) => z.string().trim().max(max).transform((s) => s || null).nullable().optional().transform((s) => s ?? null);
const optionsSchema = z.object({
  resumeVersionId: z.string().uuid(),
  length: z.enum(["SHORT", "MEDIUM", "LONG"]),
  tone: z.enum(["PROFESSIONAL", "FRIENDLY", "CONFIDENT"]),
  recipient: optional(80),
  notes: optional(1000),
});

export async function generateLetterAction(jobId: unknown, input: unknown): Promise<Done> {
  const user = await requireUser();
  const j = z.string().uuid().safeParse(jobId);
  const p = optionsSchema.safeParse(input);
  if (!j.success) return { ok: false, error: "That didn't work. Refresh the page." };
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check the options." };
  if (!(await rateLimit(`letter:gen:${user.id}`, 10, 3600)).ok) return { ok: false, error: "You've asked for several drafts in a short while. Please wait a little." };
  try {
    await letters.generate(user.id, j.data, p.data);
    revalidatePath(`/app/jobs/${j.data}/cover-letter`);
    return { ok: true };
  } catch (e) {
    if (e instanceof QuotaError) return { ok: false, error: "You've used this month's cover letters. They reset on the 1st." };
    if (e instanceof AiUnavailableError) return { ok: false, error: budgetMessage(e, AI_MESSAGE[e.reason]) };
    if (e instanceof letters.LockedError) return { ok: false, error: "This letter was sent with an application, so it's kept as it was." };
    if (e instanceof letters.NotFoundError) return { ok: false, error: "That job or resume no longer exists." };
    await captureError(e, { source: "ACTION", route: "app/letter:generate", userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

async function change(route: string, jobId: string, fn: (userId: string) => Promise<unknown>): Promise<Done> {
  const user = await requireUser();
  if (!(await rateLimit(`letter:edit:${user.id}`, 600, 3600)).ok) return { ok: false, error: "Too many saves in a short time. Please wait a little." };
  try {
    await fn(user.id);
    revalidatePath(`/app/jobs/${jobId}/cover-letter`);
    return { ok: true };
  } catch (e) {
    if (e instanceof letters.LockedError) return { ok: false, error: "This letter was sent with an application, so it's kept as it was." };
    if (e instanceof letters.NotFoundError) return { ok: false, error: "That letter no longer exists. Refresh the page." };
    await captureError(e, { source: "ACTION", route: `app/letter:${route}`, userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

export async function saveLetterAction(jobId: unknown, letterId: unknown, text: unknown, recipient: unknown): Promise<Done> {
  const p = z.object({ j: z.string().uuid(), l: z.string().uuid(), t: z.string().max(5000, "Keep the letter under 5,000 characters."), r: optional(80) }).safeParse({ j: jobId, l: letterId, t: text, r: recipient });
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Please check the text." };
  return change("save", p.data.j, (u) => letters.saveText(u, p.data.l, p.data.t, p.data.r));
}

export async function restoreLetterAction(jobId: unknown, letterId: unknown, index: unknown): Promise<Done> {
  const p = z.object({ j: z.string().uuid(), l: z.string().uuid(), i: z.number().int().min(0).max(4) }).safeParse({ j: jobId, l: letterId, i: index });
  if (!p.success) return { ok: false, error: "That didn't work. Refresh the page." };
  return change("restore", p.data.j, (u) => letters.restore(u, p.data.l, p.data.i));
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AiUnavailableError } from "@/server/ai/run";
import { requireUser } from "@/server/auth/user";
import { evidenceSchema, newJobSchema, requirementSchema } from "@/server/match/schemas";
import * as jobs from "@/server/match/service";
import { captureError } from "@/server/observability/errors";
import { rateLimit } from "@/server/ratelimit";

type Fail = { ok: false; error: string; field?: string };
type Done = { ok: true } | Fail;

const AI_MESSAGE: Record<AiUnavailableError["reason"], string> = {
  NOT_CONFIGURED: "Reading job posts isn't switched on yet. Please try again soon.",
  KILL_SWITCH: "Reading job posts is paused for a moment. Please try again later.",
  USER_BUDGET: "You've reached this period's limit for AI features. It resets soon.",
  GLOBAL_BUDGET: "We've reached today's limit for AI features. Please try again tomorrow.",
  FAILED: "We couldn't read that job post. Please try again.",
};

export type CreateJobResult = { ok: true; jobId: string } | { ok: false; duplicate: { id: string; title: string; createdAt: string } } | Fail;

export async function createJobAction(input: unknown): Promise<CreateJobResult> {
  const user = await requireUser();
  const parsed = newJobSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i?.message ?? "Please check the form.", field: i?.path[0]?.toString() };
  }
  if (!parsed.data.allowDuplicate) {
    const dup = await jobs.findDuplicate(user.id, parsed.data.rawText);
    if (dup) return { ok: false, duplicate: { id: dup.id, title: dup.title, createdAt: dup.createdAt.toISOString() } };
  }
  if (!(await rateLimit(`job:extract:${user.id}`, 20, 3600)).ok) return { ok: false, error: "You've added several jobs in a short time. Please wait a little and try again." };
  if (!(await rateLimit(`job:extract:day:${user.id}`, 50, 86400)).ok) return { ok: false, error: "You've reached today's limit of 50 jobs." };
  try {
    const job = await jobs.createJob(user.id, parsed.data);
    revalidatePath("/app/jobs");
    return { ok: true, jobId: job.id };
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      if (e.reason === "FAILED") await captureError(e, { source: "ACTION", route: "app/jobs:create", userId: user.id });
      return { ok: false, error: AI_MESSAGE[e.reason] };
    }
    if (e instanceof jobs.NotAJobError) return { ok: false, error: "This doesn't look like a job description. Paste the full post and try again.", field: "rawText" };
    if (e instanceof jobs.NotFoundError) return { ok: false, error: "That resume wasn't found. Please choose another.", field: "resumeVersionId" };
    await captureError(e, { source: "ACTION", route: "app/jobs:create", userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

/** Runs a change, then refreshes the job page, whose load recomputes the score. */
async function change(route: string, run: (userId: string) => Promise<string | void>, input?: { jobId?: string }): Promise<Done> {
  const user = await requireUser();
  if (!(await rateLimit(`job:edit:${user.id}`, 120, 3600)).ok) return { ok: false, error: "Too many changes in a short time. Please wait a little." };
  try {
    const jobId = (await run(user.id)) || input?.jobId;
    if (jobId) revalidatePath(`/app/jobs/${jobId}`);
    revalidatePath("/app/jobs");
    return { ok: true };
  } catch (e) {
    if (e instanceof jobs.NotFoundError) return { ok: false, error: "That item no longer exists. Refresh the page." };
    await captureError(e, { source: "ACTION", route: `app/jobs:${route}`, userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

const uuid = z.string().uuid();
const overrideValue = z.enum(["CONFIRM", "REJECT", "LEARNING"]).nullable();

export async function setOverrideAction(requirementId: unknown, override: unknown): Promise<Done> {
  const id = uuid.safeParse(requirementId);
  const value = overrideValue.safeParse(override);
  if (!id.success || !value.success) return { ok: false, error: "That didn't work. Refresh the page." };
  return change("override", (u) => jobs.setOverride(u, id.data, value.data));
}

export async function addEvidenceAction(requirementId: unknown, statement: unknown): Promise<Done> {
  const id = uuid.safeParse(requirementId);
  const parsed = evidenceSchema.safeParse({ statement });
  if (!id.success) return { ok: false, error: "That didn't work. Refresh the page." };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check what you wrote." };
  const statementText = parsed.data.statement;
  return change("evidence", (u) => jobs.addEvidence(u, id.data, statementText));
}

export async function updateRequirementAction(requirementId: unknown, input: unknown): Promise<Done> {
  const id = uuid.safeParse(requirementId);
  const parsed = requirementSchema.safeParse(input);
  if (!id.success) return { ok: false, error: "That didn't work. Refresh the page." };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the requirement." };
  const data = parsed.data;
  return change("update-req", (u) => jobs.updateRequirement(u, id.data, data));
}

export async function addRequirementAction(jobId: unknown, input: unknown): Promise<Done> {
  const id = uuid.safeParse(jobId);
  const parsed = requirementSchema.safeParse(input);
  if (!id.success) return { ok: false, error: "That didn't work. Refresh the page." };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the requirement." };
  const data = parsed.data;
  return change("add-req", (u) => jobs.addRequirement(u, id.data, data));
}

export async function deleteRequirementAction(requirementId: unknown): Promise<Done> {
  const id = uuid.safeParse(requirementId);
  if (!id.success) return { ok: false, error: "That didn't work. Refresh the page." };
  return change("delete-req", (u) => jobs.deleteRequirement(u, id.data));
}

export async function deleteJobAction(jobId: unknown): Promise<Done> {
  const id = uuid.safeParse(jobId);
  if (!id.success) return { ok: false, error: "That didn't work. Refresh the page." };
  return change("delete", (u) => jobs.deleteJob(u, id.data));
}

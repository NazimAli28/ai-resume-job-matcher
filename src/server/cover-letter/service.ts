import "server-only";
import type { CoverLetterLength, CoverLetterTone, Prisma } from "@/generated/prisma/client";
import type { AiProvider } from "../ai/provider/types";
import { runAiTask } from "../ai/run";
import { coverLetterRequest } from "../ai/tasks/cover-letter";
import { db } from "../db";
import type { ResumeDoc } from "../resume/types";
import { buildEvidence } from "../tailor/core";
import { assertQuota, recordUsage } from "../usage/service";
import { checkLetter, letterText } from "./core";

export class NotFoundError extends Error {}
export class LockedError extends Error {}

const KEEP_DRAFTS = 5;
const FREE_REGEN_MS = 24 * 3600 * 1000;

type Draft = { text: string; savedAt: string };

export async function getLetter(userId: string, jobId: string) {
  return db.coverLetter.findFirst({ where: { userId, jobId }, orderBy: { updatedAt: "desc" } });
}

export interface LetterOptions {
  resumeVersionId: string;
  length: CoverLetterLength;
  tone: CoverLetterTone;
  recipient: string | null;
  notes: string | null;
}

/**
 * Write a draft (CVL-001..004). Regenerating keeps the earlier text in the history (CVL-005); a
 * regeneration within 24 hours of the first draft for this job isn't charged again.
 */
export async function generate(userId: string, jobId: string, opts: LetterOptions, provider?: AiProvider) {
  const [job, version, profile, existing] = await Promise.all([
    db.job.findFirst({ where: { id: jobId, userId }, include: { requirements: { orderBy: { sortOrder: "asc" }, select: { text: true } } } }),
    db.resumeVersion.findFirst({ where: { id: opts.resumeVersionId, userId, deletedAt: null } }),
    db.profile.findUnique({ where: { userId }, include: { skills: true, facts: { where: { source: { not: "RESUME" } }, orderBy: { createdAt: "desc" }, take: 60 } } }),
    getLetter(userId, jobId),
  ]);
  if (!job || !version) throw new NotFoundError();
  if (existing?.lockedAt) throw new LockedError();

  const chargeable = !existing || Date.now() - existing.createdAt.getTime() > FREE_REGEN_MS;
  if (chargeable) await assertQuota(userId, "COVER_LETTER");

  const doc = version.content as unknown as ResumeDoc;
  const evidence = buildEvidence(doc, { facts: (profile?.facts ?? []).map((f) => ({ id: f.id, statement: f.statement, skillName: f.skillName })), profileSkills: (profile?.skills ?? []).map((s) => s.name) });
  const out = await runAiTask(
    userId,
    coverLetterRequest({ evidence, jobTitle: job.title, company: job.company, requirements: job.requirements.map((r) => r.text), postText: job.rawText, notes: opts.notes, length: opts.length, tone: opts.tone }),
    provider,
  );
  const checked = checkLetter(out.data.paragraphs, { evidence, post: job.rawText, notes: opts.notes, jobTitle: job.title, company: job.company });
  const text = letterText(checked.paragraphs);

  const fields = { resumeVersionId: version.id, length: opts.length, tone: opts.tone, recipient: opts.recipient, notes: opts.notes, text, droppedCount: checked.dropped };
  let letter;
  if (existing) {
    const history = [{ text: existing.text, savedAt: existing.updatedAt.toISOString() }, ...((existing.history as Draft[] | null) ?? [])].filter((d) => d.text.trim()).slice(0, KEEP_DRAFTS);
    letter = await db.coverLetter.update({ where: { id: existing.id }, data: { ...fields, history: history as unknown as Prisma.InputJsonValue, ...(chargeable ? { createdAt: new Date() } : {}) } });
  } else {
    letter = await db.coverLetter.create({ data: { userId, jobId, ...fields } });
  }
  if (chargeable) await recordUsage(userId, "COVER_LETTER");
  return letter;
}

async function owned(userId: string, id: string) {
  const l = await db.coverLetter.findFirst({ where: { id, userId } });
  if (!l) throw new NotFoundError();
  if (l.lockedAt) throw new LockedError();
  return l;
}

/** Autosave of the user's own edits. Their words are theirs; only the length is limited. */
export async function saveText(userId: string, id: string, text: string, recipient: string | null) {
  const l = await owned(userId, id);
  return db.coverLetter.update({ where: { id: l.id }, data: { text, recipient } });
}

/** Bring back an earlier draft; the current text goes into the history in its place. */
export async function restore(userId: string, id: string, index: number) {
  const l = await owned(userId, id);
  const history = (l.history as Draft[] | null) ?? [];
  const pick = history[index];
  if (!pick) throw new NotFoundError();
  const next = [{ text: l.text, savedAt: l.updatedAt.toISOString() }, ...history.filter((_, i) => i !== index)].slice(0, KEEP_DRAFTS);
  return db.coverLetter.update({ where: { id: l.id }, data: { text: pick.text, history: next as unknown as Prisma.InputJsonValue } });
}

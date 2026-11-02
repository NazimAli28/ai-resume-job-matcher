import "server-only";
import { createHash } from "node:crypto";
import type { z } from "zod";
import type { MatchOverride, Prisma } from "@/generated/prisma/client";
import type { AiProvider } from "../ai/provider/types";
import { runAiTask } from "../ai/run";
import { scanInjection } from "../ai/sanitize";
import { extractJobRequest, verifyExtraction } from "../ai/tasks/extract-job";
import { db } from "../db";
import { ensureProfile, getFullProfile } from "../profile/service";
import type { ResumeDoc } from "../resume/types";
import { buildMatchProfile, computeMatch, ENGINE_VERSION, type MatchRequirement } from "./engine";
import type { newJobSchema, requirementSchema } from "./schemas";

const KEEP_RESULTS = 5;
const MAX_REQUIREMENTS = 40;

export class NotFoundError extends Error {}
export class NotAJobError extends Error {}

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export const textHash = (s: string) => createHash("sha256").update(normalize(s)).digest("hex");

/** Runs before extraction so a duplicate costs nothing (JOB-009). */
export async function findDuplicate(userId: string, rawText: string) {
  return db.job.findFirst({ where: { userId, textHash: textHash(rawText) }, select: { id: true, title: true, createdAt: true } });
}

export async function createJob(userId: string, input: z.output<typeof newJobSchema>, provider?: AiProvider) {
  const version = await db.resumeVersion.findFirst({ where: { id: input.resumeVersionId, userId, deletedAt: null }, select: { id: true } });
  if (!version) throw new NotFoundError();

  const out = await runAiTask(userId, extractJobRequest(input.rawText), provider);
  if (!out.data.isJobPost) throw new NotAJobError();
  const { requirements } = verifyExtraction(out.data, input.rawText);

  const job = await db.job.create({
    data: {
      userId,
      title: input.title || out.data.title.trim().slice(0, 120) || "Untitled job",
      company: input.company || out.data.company?.trim().slice(0, 120) || null,
      location: out.data.location?.trim().slice(0, 120) ?? null,
      workMode: out.data.workMode,
      seniorityHint: out.data.seniorityHint?.slice(0, 60) ?? null,
      url: input.url,
      source: input.source,
      sourceDetail: input.sourceDetail,
      rawText: input.rawText,
      textHash: textHash(input.rawText),
      responsibilities: out.data.responsibilities.slice(0, 10).map((r) => r.slice(0, 240)),
      injectionSuspect: out.data.suspiciousInstructions || scanInjection(input.rawText),
      requirements: {
        create: requirements.map((r, i) => ({
          userId,
          text: r.text.trim().slice(0, 200),
          quote: r.quote.slice(0, 300),
          kind: r.kind,
          priority: r.priority,
          hard: r.hard,
          skillTerm: r.skillTerm?.trim().slice(0, 60) || null,
          years: r.years === null ? null : Math.max(0, Math.min(50, Math.round(r.years))),
          degreeLevel: r.degreeLevel,
          sortOrder: i,
        })),
      },
    },
  });
  await recompute(userId, job.id, version.id);
  return job;
}

export async function listJobs(userId: string) {
  return db.job.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      source: true,
      createdAt: true,
      matches: { orderBy: { createdAt: "desc" }, take: 1, select: { score: true } },
    },
  });
}

/** Compute and store a result. Unchanged inputs store nothing, so the history shows real changes only. */
export async function recompute(userId: string, jobId: string, resumeVersionId: string) {
  const [job, version, profile] = await Promise.all([
    db.job.findFirst({ where: { id: jobId, userId }, include: { requirements: { orderBy: { sortOrder: "asc" } } } }),
    db.resumeVersion.findFirst({ where: { id: resumeVersionId, userId, deletedAt: null } }),
    getFullProfile(userId),
  ]);
  if (!job || !version) throw new NotFoundError();

  const matchProfile = buildMatchProfile(version.content as unknown as ResumeDoc, {
    targetTitles: profile?.targetTitles ?? [],
    city: profile?.city,
    skills: profile?.skills ?? [],
    facts: (profile?.facts ?? []).filter((f) => f.source !== "RESUME").map((f) => ({ skillName: f.skillName, statement: f.statement })),
    experiences: profile?.experiences ?? [],
    projects: profile?.projects ?? [],
    certifications: profile?.certifications ?? [],
  });
  const reqs: MatchRequirement[] = job.requirements.map((r) => ({
    id: r.id,
    text: r.text,
    kind: r.kind,
    priority: r.priority,
    hard: r.hard,
    skillTerm: r.skillTerm,
    years: r.years,
    degreeLevel: r.degreeLevel,
    override: r.override,
  }));
  const result = computeMatch(job.title, reqs, matchProfile);
  const inputsHash = createHash("sha256")
    .update(JSON.stringify({ reqs, version: version.contentHash, facts: matchProfile.facts, ratings: matchProfile.ratings, sources: matchProfile.sources.length, engine: ENGINE_VERSION }))
    .digest("hex");

  const latest = await db.jobMatch.findFirst({ where: { userId, jobId, resumeVersionId }, orderBy: { createdAt: "desc" } });
  if (latest?.inputsHash === inputsHash) return latest;

  const row = await db.jobMatch.create({
    data: {
      userId,
      jobId,
      resumeVersionId,
      score: result.score,
      factors: result.factors as unknown as Prisma.InputJsonValue,
      items: result.items as unknown as Prisma.InputJsonValue,
      cap: result.cap ?? null,
      lowConfidence: result.lowConfidence,
      engineVersion: result.engineVersion,
      inputsHash,
    },
  });
  const old = await db.jobMatch.findMany({ where: { userId, jobId, resumeVersionId }, orderBy: { createdAt: "desc" }, skip: KEEP_RESULTS, select: { id: true } });
  if (old.length) await db.jobMatch.deleteMany({ where: { userId, id: { in: old.map((o) => o.id) } } });
  return row;
}

/** The page's view of a job. The match is refreshed on every load, so new evidence or profile edits always count. */
export async function getJobView(userId: string, jobId: string, resumeVersionId?: string) {
  const job = await db.job.findFirst({ where: { id: jobId, userId }, include: { requirements: { orderBy: { sortOrder: "asc" } } } });
  if (!job) return null;
  const versions = await db.resumeVersion.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, label: true, name: true } });
  const lastUsed = await db.jobMatch.findFirst({ where: { userId, jobId }, orderBy: { createdAt: "desc" }, select: { resumeVersionId: true } });
  const pick = [resumeVersionId, lastUsed?.resumeVersionId, versions[0]?.id].find((id) => id && versions.some((v) => v.id === id));
  if (!pick) return { job, versions, resumeVersionId: null, match: null, previous: null };

  const match = await recompute(userId, jobId, pick);
  const previous = await db.jobMatch.findFirst({ where: { userId, jobId, resumeVersionId: pick, id: { not: match.id }, createdAt: { lte: match.createdAt } }, orderBy: { createdAt: "desc" }, select: { score: true } });
  return { job, versions, resumeVersionId: pick, match, previous };
}

async function ownedRequirement(userId: string, id: string) {
  const r = await db.jobRequirement.findFirst({ where: { id, userId } });
  if (!r) throw new NotFoundError();
  return r;
}

export async function setOverride(userId: string, requirementId: string, override: MatchOverride | null) {
  const r = await ownedRequirement(userId, requirementId);
  await db.jobRequirement.update({ where: { id: r.id }, data: { override, overrideAt: override ? new Date() : null } });
  return r.jobId;
}

/**
 * "Yes, I have this": the user's own words become a confirmed fact, tied to the skill, so it also counts on
 * other jobs. Nothing is written to any resume. This is the only way a missing skill can become STRONG.
 */
export async function addEvidence(userId: string, requirementId: string, statement: string) {
  const r = await ownedRequirement(userId, requirementId);
  const profile = await ensureProfile(userId);
  await db.$transaction([
    db.factBankItem.create({
      data: {
        userId,
        profileId: profile.id,
        statement,
        skillName: (r.skillTerm ?? r.text).slice(0, 60),
        source: "MATCH_QUESTION",
        sourceRef: { jobId: r.jobId, requirementId: r.id },
      },
    }),
    db.jobRequirement.update({ where: { id: r.id }, data: { override: "ADD_EVIDENCE", overrideAt: new Date() } }),
  ]);
  return r.jobId;
}

export async function updateRequirement(userId: string, requirementId: string, data: z.output<typeof requirementSchema>) {
  const r = await ownedRequirement(userId, requirementId);
  const textChanged = data.text !== r.text;
  await db.jobRequirement.update({
    where: { id: r.id },
    data: { text: data.text, priority: data.priority, userEdited: true, ...(textChanged && r.skillTerm ? { skillTerm: data.text.slice(0, 60) } : {}) },
  });
  return r.jobId;
}

export async function addRequirement(userId: string, jobId: string, data: z.output<typeof requirementSchema>) {
  const job = await db.job.findFirst({ where: { id: jobId, userId }, select: { id: true, _count: { select: { requirements: true } } } });
  if (!job) throw new NotFoundError();
  if (job._count.requirements >= MAX_REQUIREMENTS) return job.id;
  await db.jobRequirement.create({
    data: { userId, jobId, text: data.text, priority: data.priority, kind: "SKILL", skillTerm: data.text.slice(0, 60), userEdited: true, sortOrder: job._count.requirements },
  });
  return job.id;
}

export async function deleteRequirement(userId: string, requirementId: string) {
  const r = await ownedRequirement(userId, requirementId);
  await db.jobRequirement.delete({ where: { id: r.id } });
  return r.jobId;
}

export async function deleteJob(userId: string, jobId: string) {
  const { count } = await db.job.deleteMany({ where: { id: jobId, userId } });
  if (!count) throw new NotFoundError();
}

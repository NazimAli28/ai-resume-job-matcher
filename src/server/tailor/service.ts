import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { checkClaim } from "../ai/guard/facts";
import type { AiProvider } from "../ai/provider/types";
import { AiUnavailableError, runAiTask } from "../ai/run";
import { PROMPT_VERSION, suggestEditsRequest } from "../ai/tasks/suggest-edits";
import { db } from "../db";
import { resumeBlocks } from "../export/blocks";
import { renderPdf } from "../export/pdf";
import type { MatchItem } from "../match/engine";
import { addEvidence, recompute } from "../match/service";
import { ensureProfile } from "../profile/service";
import { extract } from "../resume/extract";
import { analyze } from "../resume/rules";
import { buildResumeDoc } from "../resume/structure";
import type { ResumeDoc } from "../resume/types";
import { assertQuota, recordUsage } from "../usage/service";
import { applySuggestions, buildEvidence, deterministicSuggestions, fillTemplate, validateSuggestions, type GuardStats, type Suggestion } from "./core";

export class NotFoundError extends Error {}
export class AnswerError extends Error {}

const FREE_REGEN_MS = 24 * 3600 * 1000;

async function load(userId: string, jobId: string, versionId: string) {
  const [job, version, profile] = await Promise.all([
    db.job.findFirst({ where: { id: jobId, userId }, include: { requirements: { orderBy: { sortOrder: "asc" } } } }),
    db.resumeVersion.findFirst({ where: { id: versionId, userId, deletedAt: null } }),
    db.profile.findUnique({ where: { userId }, include: { skills: true, facts: { where: { source: { not: "RESUME" } }, orderBy: { createdAt: "desc" }, take: 60 } } }),
  ]);
  if (!job || !version) throw new NotFoundError();
  return { job, version, doc: version.content as unknown as ResumeDoc, profile };
}

export interface TailorStats extends GuardStats {
  aiFailed?: boolean;
}

/** The current session for (job, version), or null if none has been generated yet. */
export async function getSession(userId: string, jobId: string, versionId: string) {
  return db.tailorSession.findUnique({ where: { userId_jobId_resumeVersionId: { userId, jobId, resumeVersionId: versionId } } });
}

/**
 * Generate suggestions (TLR-001..008). Identical inputs reuse the stored result for free, and a
 * regeneration within 24 hours isn't charged again (TLR-007). If the AI fails, the user still gets
 * the suggestions code can make, with no quota used.
 */
export async function generate(userId: string, jobId: string, versionId: string, opts: { force?: boolean; provider?: AiProvider } = {}) {
  const { job, version, doc, profile } = await load(userId, jobId, versionId);
  const match = await recompute(userId, jobId, versionId);
  const items = match.items as unknown as MatchItem[];
  const facts = (profile?.facts ?? []).map((f) => ({ id: f.id, statement: f.statement, skillName: f.skillName }));
  const evidence = buildEvidence(doc, { facts, profileSkills: (profile?.skills ?? []).map((s) => s.name) });
  const reqs = job.requirements.map((r) => ({ id: r.id, text: r.text, skillTerm: r.skillTerm, kind: r.kind }));

  const inputsHash = createHash("sha256").update(JSON.stringify({ v: version.contentHash, reqs, facts, p: PROMPT_VERSION })).digest("hex");
  const existing = await getSession(userId, jobId, versionId);
  if (existing && existing.inputsHash === inputsHash && !opts.force) return existing;

  const chargeable = !existing || Date.now() - existing.createdAt.getTime() > FREE_REGEN_MS;
  if (chargeable) await assertQuota(userId, "TAILORED_VERSION");

  const deterministic = deterministicSuggestions({ doc, evidence, items, reqs });
  let ai: Suggestion[] = [];
  let stats: TailorStats = { proposed: 0, kept: 0, asked: 0, blocked: {} };
  try {
    const out = await runAiTask(
      userId,
      suggestEditsRequest({
        evidence,
        jobTitle: job.title,
        requirements: items.map((i) => ({ id: i.requirementId, text: i.text, priority: i.priority, cls: i.cls })),
      }),
      opts.provider,
    );
    const validated = validateSuggestions(out.data.suggestions, { doc, evidence, reqs });
    ai = validated.suggestions;
    stats = validated.stats;
  } catch (e) {
    if (!(e instanceof AiUnavailableError)) throw e;
    stats = { ...stats, aiFailed: true };
  }

  // Keep the user's earlier decisions on lines that are suggested again.
  const previous = (existing?.suggestions as unknown as Suggestion[] | undefined) ?? [];
  const merged = [...ai, ...deterministic].map((s) => {
    const prior = previous.find((p) => p.kind === s.kind && p.targetId === s.targetId && (p.after ?? p.template) === (s.after ?? s.template));
    return prior ? { ...s, status: prior.status } : s;
  });

  const data = { inputsHash, promptVersion: PROMPT_VERSION, suggestions: merged as unknown as Prisma.InputJsonValue, stats: stats as unknown as Prisma.InputJsonValue };
  const session = existing
    ? await db.tailorSession.update({ where: { id: existing.id }, data: chargeable ? { ...data, createdAt: new Date() } : data })
    : await db.tailorSession.create({ data: { userId, jobId, resumeVersionId: versionId, ...data } });
  if (chargeable && !stats.aiFailed) await recordUsage(userId, "TAILORED_VERSION");
  return session;
}

async function ownedSession(userId: string, sessionId: string) {
  const s = await db.tailorSession.findFirst({ where: { id: sessionId, userId } });
  if (!s) throw new NotFoundError();
  return { session: s, suggestions: s.suggestions as unknown as Suggestion[] };
}

const save = (id: string, suggestions: Suggestion[]) => db.tailorSession.update({ where: { id }, data: { suggestions: suggestions as unknown as Prisma.InputJsonValue } });

export async function setStatus(userId: string, sessionId: string, suggestionId: string, status: Suggestion["status"]) {
  const { session, suggestions } = await ownedSession(userId, sessionId);
  const s = suggestions.find((x) => x.id === suggestionId);
  if (!s) throw new NotFoundError();
  // Questions are applied by answering them, not by a click.
  if (status === "APPLIED" && !s.after) throw new AnswerError("needs_answer");
  s.status = status;
  await save(session.id, suggestions);
  return session;
}

/** Accept every pending change that is ready, or put everything back to pending (TLR-012). */
export async function setAll(userId: string, sessionId: string, mode: "accept" | "reset") {
  const { session, suggestions } = await ownedSession(userId, sessionId);
  for (const s of suggestions) {
    if (mode === "accept" && s.status === "PENDING" && s.after && s.kind !== "GAP_QUESTION") s.status = "APPLIED";
    if (mode === "reset" && s.status === "APPLIED" && s.kind !== "GAP_QUESTION") s.status = "PENDING";
  }
  await save(session.id, suggestions);
  return session;
}

/** The user rewrites a suggestion in their own words (TLR-013). Their words are kept; anything new is flagged, not blocked. */
export async function editSuggestion(userId: string, sessionId: string, suggestionId: string, text: string) {
  const { session, suggestions } = await ownedSession(userId, sessionId);
  const s = suggestions.find((x) => x.id === suggestionId);
  if (!s || !s.before || s.kind === "SKILL_ORDER" || s.kind === "SKILL_ADD" || s.kind === "GAP_QUESTION") throw new NotFoundError();
  const verdict = checkClaim({ text, evidence: s.basedOn.map((b) => b.text), original: s.before });
  s.after = text;
  s.kind = "REWRITE";
  s.editedByUser = true;
  s.warning = verdict.action === "PASS" ? undefined : `This says something your resume doesn't (${verdict.action === "BLOCK" ? verdict.detail.join(", ") : verdict.reason === "NEW_NUMBER" ? `the figure ${verdict.detail.join(", ")}` : "a stronger claim"}). Keep it only if it's true.`;
  await save(session.id, suggestions);
  return session;
}

/**
 * Answer a question. A figure fills the template and becomes a confirmed fact; "yes" confirms the
 * wording; a gap answer is saved as evidence for that skill (TLR-003, TLR-033). Nothing is sent to the AI.
 */
export async function answer(userId: string, sessionId: string, suggestionId: string, value: string) {
  const { session, suggestions } = await ownedSession(userId, sessionId);
  const s = suggestions.find((x) => x.id === suggestionId);
  if (!s) throw new NotFoundError();
  const profile = await ensureProfile(userId);
  const reqId = s.reqIds[0];

  if (s.kind === "GAP_QUESTION") {
    if (!reqId) throw new NotFoundError();
    const statement = value.trim();
    if (statement.length < 3 || statement.length > 400) throw new AnswerError("too_short");
    await addEvidence(userId, reqId, statement);
    s.status = "APPLIED";
    s.after = undefined;
    await save(session.id, suggestions);
    return session;
  }
  if (s.kind !== "QUESTION" || !s.template) throw new NotFoundError();

  if (s.answerType === "YES_NO") {
    if (value !== "yes") {
      s.status = "DISMISSED";
      await save(session.id, suggestions);
      return session;
    }
    s.after = s.template;
  } else {
    const filled = fillTemplate(s.template, value);
    if (!filled) throw new AnswerError("bad_value");
    s.after = filled;
  }
  await db.factBankItem.create({
    data: { userId, profileId: profile.id, statement: s.after.slice(0, 400), source: "USER", sourceRef: { tailorSessionId: session.id, suggestionId: s.id } },
  });
  s.kind = "REWRITE";
  s.status = "PENDING";
  s.basedOn = [...s.basedOn, { id: "answer", label: "Your answer", text: s.after }];
  await save(session.id, suggestions);
  return session;
}

/** Run a document through our own export and parser, the way an applicant tracking system would see it. */
export async function roundTrip(doc: ResumeDoc, targetMarket: "PK_LOCAL" | "INTERNATIONAL", title: string) {
  const pdf = renderPdf(resumeBlocks(doc), { title, author: doc.basics.name });
  const ex = await extract(pdf);
  return analyze(ex, buildResumeDoc(ex), { targetMarket, fileBytes: pdf.length });
}

/** Save the tailored resume as a new version (TLR-010, TLR-014) and score it against the job. */
export async function finalize(userId: string, sessionId: string) {
  const { session, suggestions } = await ownedSession(userId, sessionId);
  const { job, version, doc } = await load(userId, session.jobId, session.resumeVersionId);
  const { doc: tailored, changes } = applySuggestions(doc, suggestions);
  if (!changes.length) throw new AnswerError("no_changes");

  const analysis = await roundTrip(tailored, version.targetMarket, `${tailored.basics.name ?? "Resume"} - ${job.title}`);
  const count = await db.resumeVersion.count({ where: { userId } });
  const created = await db.$transaction(async (tx) => {
    const v = await tx.resumeVersion.create({
      data: {
        userId,
        parentId: version.id,
        jobId: job.id,
        label: `v${count + 1}`,
        name: `${version.name} – ${job.title}`.slice(0, 80),
        source: "TAILORED",
        targetMarket: version.targetMarket,
        content: tailored as unknown as Prisma.InputJsonValue,
        contentHash: createHash("sha256").update(JSON.stringify(tailored)).digest("hex"),
      },
    });
    await tx.resumeAnalysis.create({
      data: {
        userId,
        resumeVersionId: v.id,
        parseHealth: analysis.parseHealth,
        readability: analysis.readability,
        parts: analysis.readabilityParts as Prisma.InputJsonValue,
        findings: analysis.findings as unknown as Prisma.InputJsonValue,
        engineVersion: analysis.engineVersion,
      },
    });
    await tx.tailorSession.update({ where: { id: session.id }, data: { resultVersionId: v.id } });
    return v;
  });
  await recompute(userId, job.id, created.id);
  return created;
}

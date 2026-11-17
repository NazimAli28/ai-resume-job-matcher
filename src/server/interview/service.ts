import "server-only";
import type { InterviewDifficulty, InterviewPersona, InterviewType, Prisma } from "@/generated/prisma/client";
import { checkClaim, checkTopicSentence } from "../ai/guard/facts";
import type { AiProvider } from "../ai/provider/types";
import { AiUnavailableError, runAiTask } from "../ai/run";
import { verifyQuote, withoutInjection } from "../ai/sanitize";
import { blueprintRequest, checkRequest, evaluateRequest, modelAnswerRequest, prepRequest } from "../ai/tasks/interview";
import { db } from "../db";
import type { MatchItem } from "../match/engine";
import { recompute } from "../match/service";
import type { ResumeDoc } from "../resume/types";
import { buildEvidence, type Evidence } from "../tailor/core";
import { attach, recordOutcome } from "../training/service";
import { assertQuota, recordUsage } from "../usage/service";
import {
  coverage,
  dimensionAverages,
  DIM_LABEL,
  FOLLOW_UP_CAP,
  followUpFor,
  planSlots,
  questionScore,
  rubricFor,
  sessionScore,
  verifyDims,
  wordCount,
  type AnswerCheck,
  type DimResult,
  type QKind,
} from "./core";

export class NotFoundError extends Error {}
export class StateError extends Error {}

export interface SessionConfig {
  jobId: string | null;
  resumeVersionId: string | null;
  targetRole: string | null;
  type: InterviewType;
  count: 5 | 10 | 15;
  difficulty: InterviewDifficulty;
  persona: InterviewPersona;
  timerSec: number;
}

// Used only if the AI can't write questions, so practice is never blocked.
const FALLBACK: Record<QKind, string> = {
  RESUME_PROBE: "Tell me about this part of your experience: what was the situation, what did you do, and what was the outcome?",
  JD_TECHNICAL: "Pick a technical problem you solved recently. How did you approach it, and what trade-offs did you consider?",
  BEHAVIORAL: "Tell me about a time you had to deliver under a tight deadline. What did you do, and what was the result?",
  SITUATIONAL: "What would you do if you disagreed with your manager about how to approach a task?",
  MOTIVATION: "Why are you interested in this role?",
  GAP: "This role needs something you haven't done much of yet. How would you get up to speed?",
};

async function context(userId: string, versionId: string | null) {
  const [version, profile] = await Promise.all([
    versionId ? db.resumeVersion.findFirst({ where: { id: versionId, userId, deletedAt: null } }) : null,
    db.profile.findUnique({ where: { userId }, include: { skills: true, facts: { where: { source: { not: "RESUME" } }, orderBy: { createdAt: "desc" }, take: 60 } } }),
  ]);
  const doc = version?.content as unknown as ResumeDoc | undefined;
  const evidence: Evidence[] = doc
    ? buildEvidence(doc, { facts: (profile?.facts ?? []).map((f) => ({ id: f.id, statement: f.statement, skillName: f.skillName })), profileSkills: (profile?.skills ?? []).map((s) => s.name) })
    : (profile?.facts ?? []).map((f) => ({ id: `fact:${f.id}`, label: "Your confirmed facts", text: f.statement }));
  return { version, doc, evidence, targetTitles: profile?.targetTitles ?? [] };
}

/** Plan and write the questions (05 §9.2). Nothing is charged until the first answer is scored (INT-018). */
export async function createSession(userId: string, cfg: SessionConfig, provider?: AiProvider) {
  const job = cfg.jobId ? await db.job.findFirst({ where: { id: cfg.jobId, userId }, include: { requirements: { orderBy: { sortOrder: "asc" } } } }) : null;
  if (cfg.jobId && !job) throw new NotFoundError();
  const { version, doc, evidence } = await context(userId, cfg.resumeVersionId);
  if (cfg.resumeVersionId && !version) throw new NotFoundError();

  let reqs: { id: string; text: string; priority: "MUST_HAVE" | "NICE_TO_HAVE"; cls: string; kind: string }[] = [];
  if (job && version) {
    const match = await recompute(userId, job.id, version.id);
    const items = match.items as unknown as MatchItem[];
    reqs = job.requirements.map((r) => ({ id: r.id, text: r.text, priority: r.priority, kind: r.kind, cls: items.find((i) => i.requirementId === r.id)?.cls ?? "UNKNOWN" }));
  } else if (job) {
    reqs = job.requirements.map((r) => ({ id: r.id, text: r.text, priority: r.priority, kind: r.kind, cls: "UNKNOWN" }));
  }
  const bullets = doc ? [...doc.work.flatMap((w) => w.bullets), ...doc.projects.flatMap((p) => p.bullets)].filter((b) => b.text.length > 25).map((b) => b.id) : [];
  const slots = planSlots({ type: cfg.type, count: cfg.count, reqs, bullets });
  const reqText = new Map(reqs.map((r) => [r.id, r.text]));
  const evText = new Map(evidence.map((e) => [e.id, e.text]));

  let written: { slot: number; question: string; competency: string; keyPoints: string[]; whyAsked: string }[] = [];
  let exampleId: string | null = null;
  try {
    const out = await runAiTask(
      userId,
      blueprintRequest({
        slots: slots.map((s) => ({ kind: s.kind, reqTexts: s.reqIds.map((id) => reqText.get(id) ?? ""), nodeTexts: s.nodeIds.map((id) => evText.get(id) ?? "") })),
        jobTitle: job?.title ?? cfg.targetRole ?? "the role",
        company: job?.company ?? null,
        post: job?.rawText ?? null,
        difficulty: cfg.difficulty,
        persona: cfg.persona,
      }),
      provider,
    );
    written = out.data.questions;
    exampleId = out.exampleId;
  } catch (e) {
    if (!(e instanceof AiUnavailableError)) throw e;
    if (e.reason === "USER_BUDGET" || e.reason === "GLOBAL_BUDGET" || e.reason === "KILL_SWITCH" || e.reason === "NOT_CONFIGURED") throw e;
  }

  const cov = coverage(slots, reqs);
  const created = await db.interviewSession.create({
    data: {
      userId,
      jobId: job?.id ?? null,
      resumeVersionId: version?.id ?? null,
      targetRole: job ? null : cfg.targetRole,
      type: cfg.type,
      questionCount: cfg.count,
      difficulty: cfg.difficulty,
      persona: cfg.persona,
      timerSec: cfg.timerSec,
      blueprint: { coverage: cov, aiWritten: written.length > 0 } as Prisma.InputJsonValue,
      questions: {
        create: slots.map((s, i) => {
          const w = written.find((q) => q.slot === i + 1);
          return {
            userId,
            order: i * 10,
            kind: s.kind,
            competency: (w?.competency.trim() || s.kind.replace("_", " ").toLowerCase()).slice(0, 60),
            text: (w?.question.trim() || FALLBACK[s.kind]).slice(0, 400),
            keyPoints: (w?.keyPoints ?? []).slice(0, 6).map((k) => k.slice(0, 160)) as Prisma.InputJsonValue,
            whyAsked: w?.whyAsked.slice(0, 240) ?? null,
            reqIds: s.reqIds,
          };
        }),
      },
    },
  });
  await attach(exampleId, "interview", created.id);
  return created;
}

export async function getSession(userId: string, id: string) {
  return db.interviewSession.findFirst({
    where: { id, userId },
    include: { job: { select: { id: true, title: true, company: true } }, questions: { orderBy: { order: "asc" }, include: { answers: { orderBy: { attempt: "asc" } } } } },
  });
}

type FullSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;
type FullQuestion = FullSession["questions"][number];

export function currentQuestion(s: FullSession): FullQuestion | null {
  return s.questions.find((q) => q.answers.length === 0) ?? null;
}

const chainOf = (s: FullSession, main: FullQuestion) => [main, ...s.questions.filter((q) => q.parentId === main.id)];
const chainText = (s: FullSession, main: FullQuestion) =>
  chainOf(s, main)
    .map((q) => q.answers[0])
    .filter((a) => a && !a.skipped && a.text)
    .map((a) => a!.text)
    .join("\n\n");

function toCheck(raw: { situation: { present: boolean; quote: string }; task: { present: boolean; quote: string }; action: { present: boolean; quote: string }; result: { present: boolean; quote: string }; metrics: string[]; keyPointsCovered: number[]; offTopic: boolean }, answer: string, totalKeyPoints: number): AnswerCheck {
  // A STAR element counts only if its quote is really in the answer (§7.3).
  const ok = (q: { present: boolean; quote: string }) => q.present && !!q.quote && verifyQuote(q.quote, answer);
  return {
    star: { situation: ok(raw.situation), task: ok(raw.task), action: ok(raw.action), result: ok(raw.result) },
    metrics: raw.metrics.filter((m) => verifyQuote(m, answer)).slice(0, 10),
    keyPointsCovered: new Set(raw.keyPointsCovered.filter((n) => n >= 1 && n <= totalKeyPoints)).size,
    keyPointsTotal: totalKeyPoints,
    offTopic: raw.offTopic,
  };
}

async function runCheck(userId: string, q: FullQuestion, answer: string, provider?: AiProvider): Promise<AnswerCheck | null> {
  const keyPoints = (q.keyPoints as string[]) ?? [];
  try {
    const out = await runAiTask(userId, checkRequest(q.text, keyPoints, answer), provider);
    return toCheck(out.data, answer, keyPoints.length);
  } catch (e) {
    if (e instanceof AiUnavailableError) return null; // no follow-up this time; scoring re-checks later
    throw e;
  }
}

/** Save an answer, then decide on a follow-up for exactly one missing element (INT-012, INT-014). */
export async function submitAnswer(userId: string, sessionId: string, questionId: string, input: { text: string; durationSec: number; hintUsed: boolean }, provider?: AiProvider) {
  const s = await getSession(userId, sessionId);
  if (!s) throw new NotFoundError();
  if (s.status !== "ACTIVE") throw new StateError("not_active");
  const q = s.questions.find((x) => x.id === questionId);
  if (!q || q.answers.length) throw new StateError("already_answered");

  await db.interviewAnswer.create({ data: { questionId: q.id, userId, text: input.text, durationSec: input.durationSec, hintUsed: input.hintUsed } });
  const main = q.parentId ? s.questions.find((x) => x.id === q.parentId)! : q;
  const fresh = (await getSession(userId, sessionId))!;
  const mainFresh = fresh.questions.find((x) => x.id === main.id)!;
  const combined = chainText(fresh, mainFresh);
  const check = await runCheck(userId, mainFresh, combined, provider);
  const latest = fresh.questions.find((x) => x.id === q.id)!.answers[0];
  if (check) await db.interviewAnswer.update({ where: { id: latest.id }, data: { check: check as unknown as Prisma.InputJsonValue } });

  const asked = fresh.questions.filter((x) => x.parentId === main.id).length;
  const next = followUpFor({ kind: main.kind as QKind, difficulty: s.difficulty, answer: combined, check, askedForThis: asked, sessionUsed: s.followUpsUsed, sessionCap: FOLLOW_UP_CAP[s.questionCount as 5 | 10 | 15] ?? 6 });
  if (next) {
    await db.$transaction([
      db.interviewQuestion.create({ data: { sessionId: s.id, userId, order: main.order + asked + 1, parentId: main.id, kind: main.kind, competency: main.competency, text: next.text, keyPoints: main.keyPoints as Prisma.InputJsonValue, reqIds: main.reqIds, whyAsked: `Follow-up: ${next.key}` } }),
      db.interviewSession.update({ where: { id: s.id }, data: { followUpsUsed: { increment: 1 } } }),
    ]);
  }
  return { followUp: !!next };
}

export async function skipQuestion(userId: string, sessionId: string, questionId: string) {
  const s = await getSession(userId, sessionId);
  if (!s) throw new NotFoundError();
  if (s.status !== "ACTIVE") throw new StateError("not_active");
  const q = s.questions.find((x) => x.id === questionId);
  if (!q || q.answers.length) throw new StateError("already_answered");
  await db.interviewAnswer.create({ data: { questionId: q.id, userId, skipped: true } });
}

export interface Evaluation {
  dims: DimResult[];
  labels: string[];
  whatWentWrong: string;
  oneLineFix: string;
  followUps: number;
  error?: boolean;
}

async function evaluate(userId: string, s: FullSession, main: FullQuestion, answer: string, provider?: AiProvider): Promise<{ evaluation: Evaluation; score: number | null; check: AnswerCheck | null; exampleId?: string | null }> {
  const kind = main.kind as QKind;
  const keyPoints = (main.keyPoints as string[]) ?? [];
  const followUps = s.questions.filter((x) => x.parentId === main.id).length;
  const check = (await runCheck(userId, main, answer, provider)) ?? { star: { situation: false, task: false, action: false, result: false }, metrics: [], keyPointsCovered: 0, keyPointsTotal: keyPoints.length, offTopic: false };
  try {
    const out = await runAiTask(userId, evaluateRequest({ question: main.text, kind, keyPoints, dims: rubricFor(kind).filter((d) => d.byAi).map((d) => d.dim), answer: withoutInjection(answer) }), provider);
    const dims = verifyDims(out.data.dims.map((d) => ({ dim: d.dim, score: d.score, quote: d.quote.trim() || null })), answer, kind, check);
    return { evaluation: { dims, labels: [...new Set(out.data.labels)].slice(0, 5), whatWentWrong: out.data.whatWentWrong.slice(0, 600), oneLineFix: out.data.oneLineFix.slice(0, 240), followUps }, score: questionScore(kind, dims), check, exampleId: out.exampleId };
  } catch (e) {
    if (!(e instanceof AiUnavailableError)) throw e;
    // Without the AI, only the code-scored dimensions remain; the report says so.
    const dims = verifyDims([], answer, kind, check);
    return { evaluation: { dims, labels: [], whatWentWrong: "", oneLineFix: "", followUps, error: true }, score: null, check };
  }
}

/** Score every answered question and build the report (INT-030..036). Counts against the quota once (INT-018). */
export async function finish(userId: string, sessionId: string, provider?: AiProvider) {
  const s = await getSession(userId, sessionId);
  if (!s) throw new NotFoundError();
  if (s.status === "COMPLETED") return s;
  const mains = s.questions.filter((q) => !q.parentId);
  const toScore = mains.filter((q) => q.answers[0] && !q.answers[0].skipped && !q.answers[0].evaluation);
  if (toScore.length && !s.counted) await assertQuota(userId, "MOCK_INTERVIEW");

  const results: { q: FullQuestion; r: Awaited<ReturnType<typeof evaluate>> }[] = [];
  for (let i = 0; i < toScore.length; i += 4) {
    const batch = toScore.slice(i, i + 4);
    results.push(...(await Promise.all(batch.map(async (q) => ({ q, r: await evaluate(userId, s, q, chainText(s, q), provider) })))));
  }
  for (const { q, r } of results) {
    await db.interviewAnswer.update({ where: { id: q.answers[0].id }, data: { evaluation: r.evaluation as unknown as Prisma.InputJsonValue, score: r.score, check: r.check as unknown as Prisma.InputJsonValue } });
    await attach(r.exampleId, "iv-question", q.id);
  }
  const anyScored = results.some((x) => x.r.score !== null);
  if (anyScored && !s.counted) {
    await recordUsage(userId, "MOCK_INTERVIEW");
    await db.interviewSession.update({ where: { id: s.id }, data: { counted: true } });
  }
  const done = await buildReport(userId, sessionId);
  const report = done.report as { answered?: number; skipped?: number } | null;
  await recordOutcome(userId, "interview", s.id, { signals: { answered: report?.answered ?? 0, skipped: report?.skipped ?? 0 } });
  return done;
}

export async function buildReport(userId: string, sessionId: string) {
  const s = (await getSession(userId, sessionId))!;
  const mains = s.questions.filter((q) => !q.parentId);
  const first = mains.map((q) => q.answers[0]).filter((a) => a && !a.skipped);
  const evals = first.map((a) => a!.evaluation as unknown as Evaluation | null).filter((e): e is Evaluation => !!e);
  const overall = sessionScore(first.map((a) => a!.score));
  const avgs = dimensionAverages(evals.map((e) => e.dims));
  const report = {
    answered: first.length,
    skipped: mains.length - first.length,
    hintsUsed: s.questions.flatMap((q) => q.answers).filter((a) => a.hintUsed).length,
    followUps: s.followUpsUsed,
    totalSec: s.questions.flatMap((q) => q.answers).reduce((t, a) => t + (a.durationSec ?? 0), 0),
    dims: avgs.map((d) => ({ ...d, label: DIM_LABEL[d.dim] })),
    priorities: avgs.filter((d) => d.avg < 4).slice(0, 3).map((d) => DIM_LABEL[d.dim]),
    strengths: [...avgs].reverse().filter((d) => d.avg >= 4).slice(0, 3).map((d) => DIM_LABEL[d.dim]),
    coverage: (s.blueprint as { coverage?: unknown })?.coverage ?? null,
    unscored: evals.filter((e) => e.error).length,
  };
  return db.interviewSession.update({ where: { id: s.id }, data: { status: "COMPLETED", completedAt: s.completedAt ?? new Date(), overall, report: report as Prisma.InputJsonValue } });
}

/** Re-answer one question; both attempts are kept and the new one is scored right away (INT-035). */
export async function retry(userId: string, sessionId: string, questionId: string, text: string, provider?: AiProvider) {
  const s = await getSession(userId, sessionId);
  if (!s) throw new NotFoundError();
  if (s.status !== "COMPLETED") throw new StateError("not_completed");
  const q = s.questions.find((x) => x.id === questionId && !x.parentId);
  if (!q) throw new NotFoundError();
  if (q.answers.length >= 5) throw new StateError("too_many_attempts");
  const r = await evaluate(userId, s, q, text, provider);
  // A retry is a strong signal: the person thought they could answer better.
  await attach(r.exampleId, "iv-question", q.id);
  await recordOutcome(userId, "iv-question", q.id, { signals: { retry: true, previousScore: q.answers.at(-1)?.score ?? null, newScore: r.score } });
  return db.interviewAnswer.create({
    data: { questionId: q.id, userId, attempt: Math.max(...q.answers.map((a) => a.attempt), 0) + 1, text, evaluation: r.evaluation as unknown as Prisma.InputJsonValue, score: r.score, check: r.check as unknown as Prisma.InputJsonValue },
  });
}

export interface ModelAnswer {
  sentences: { text: string; isPlaceholder: boolean; basedOn: string[] }[];
  groundedness: "GROUNDED" | "PARTIAL_TEMPLATE" | "TEMPLATE_ONLY";
}

/** A model answer from the user's own facts only (INT-034), made on first open and kept. */
export async function modelAnswer(userId: string, sessionId: string, questionId: string, provider?: AiProvider): Promise<ModelAnswer> {
  const s = await getSession(userId, sessionId);
  if (!s) throw new NotFoundError();
  const q = s.questions.find((x) => x.id === questionId && !x.parentId);
  const first = q?.answers[0];
  if (!q || !first) throw new NotFoundError();
  if (first.modelAnswer) return first.modelAnswer as unknown as ModelAnswer;

  const { evidence } = await context(userId, s.resumeVersionId);
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const out = await runAiTask(userId, modelAnswerRequest({ question: q.text, kind: q.kind, keyPoints: (q.keyPoints as string[]) ?? [], evidence: evidence.slice(0, 80) }), provider);
  await attach(out.exampleId, "iv-model", q.id);
  const sentences = out.data.sentences.slice(0, 14).map((x) => {
    const text = x.text.replace(/\s+/g, " ").trim();
    if (x.isPlaceholder || /\[[^\]]+\]/.test(text)) return { text, isPlaceholder: true, basedOn: [] };
    const cited = x.citeIds.map((id) => byId.get(id)).filter((e): e is Evidence => !!e);
    // General statements with no candidate facts pass; any claim must match what's cited.
    // Skills the question is about may be discussed ("I'd start with..."), never claimed.
    const verdict = checkTopicSentence({ text, evidence: cited.length ? cited.map((c) => c.text) : evidence.map((e) => e.text), topic: [q.text, ...((q.keyPoints as string[]) ?? [])] });
    if (verdict.action !== "PASS") return { text: "[Describe a real example of your own here.]", isPlaceholder: true, basedOn: [] };
    return { text, isPlaceholder: false, basedOn: cited.map((c) => c.text).slice(0, 2) };
  });
  const placeholders = sentences.filter((x) => x.isPlaceholder).length;
  const result: ModelAnswer = { sentences, groundedness: placeholders === 0 ? "GROUNDED" : placeholders === sentences.length ? "TEMPLATE_ONLY" : "PARTIAL_TEMPLATE" };
  await db.interviewAnswer.update({ where: { id: first.id }, data: { modelAnswer: result as unknown as Prisma.InputJsonValue } });
  return result;
}

export async function listSessions(userId: string) {
  return db.interviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, status: true, type: true, questionCount: true, overall: true, targetRole: true, createdAt: true, completedAt: true, job: { select: { title: true, company: true } } },
  });
}

export async function deleteSession(userId: string, id: string) {
  const { count } = await db.interviewSession.deleteMany({ where: { id, userId } });
  if (!count) throw new NotFoundError();
}

// ─── Prep bank (INT-001..003) ───

export interface PrepQuestion {
  group: "TECHNICAL" | "BEHAVIORAL" | "HR_SITUATIONAL" | "CANDIDATE_SPECIFIC";
  question: string;
  whyAsked: string;
  structure: string;
  hint: string;
  hintFromYou: boolean;
  gap: string | null;
}

export async function getPrep(userId: string, jobId: string) {
  return db.interviewPrep.findUnique({ where: { userId_jobId: { userId, jobId } } });
}

export async function generatePrep(userId: string, jobId: string, versionId: string | null, provider?: AiProvider) {
  const job = await db.job.findFirst({ where: { id: jobId, userId }, include: { requirements: { orderBy: { sortOrder: "asc" } } } });
  if (!job) throw new NotFoundError();
  const { version, evidence } = await context(userId, versionId);
  const items = version ? ((await recompute(userId, job.id, version.id)).items as unknown as MatchItem[]) : [];
  const reqs = job.requirements.map((r) => ({ id: r.id, text: r.text, cls: items.find((i) => i.requirementId === r.id)?.cls ?? "UNKNOWN" }));
  const out = await runAiTask(userId, prepRequest({ jobTitle: job.title, company: job.company, post: job.rawText, reqs, evidence: evidence.slice(0, 80) }), provider);
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const reqById = new Map(reqs.map((r) => [r.id, r]));
  const questions: PrepQuestion[] = out.data.questions.slice(0, 25).map((q) => {
    const cited = q.hintCiteIds.map((id) => byId.get(id)).filter((e): e is Evidence => !!e);
    const verdict = cited.length ? checkClaim({ text: q.hint, evidence: cited.map((c) => c.text) }) : null;
    const fromYou = verdict?.action === "PASS";
    const gap = reqById.get(q.probesGapReqId);
    return {
      group: q.group,
      question: q.question.slice(0, 300),
      whyAsked: q.whyAsked.slice(0, 240),
      structure: q.structure.slice(0, 300),
      hint: fromYou ? q.hint.slice(0, 300) : "Think of a real time you did something like this. If you haven't, say so honestly and explain how you'd approach it.",
      hintFromYou: fromYou,
      gap: gap && gap.cls === "MISSING" ? gap.text : null,
    };
  });
  const prep = await db.interviewPrep.upsert({
    where: { userId_jobId: { userId, jobId } },
    create: { userId, jobId, resumeVersionId: version?.id ?? null, questions: questions as unknown as Prisma.InputJsonValue },
    update: { resumeVersionId: version?.id ?? null, questions: questions as unknown as Prisma.InputJsonValue },
  });
  await attach(out.exampleId, "prep", prep.id);
  return prep;
}

export const isAnswerTooShort = (t: string) => wordCount(t) < 8;

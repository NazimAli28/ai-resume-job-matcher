import { verifyQuote, withoutInjection } from "../ai/sanitize";

/**
 * Mock interview rules that live in code (05 §9): the question mix, when to ask a follow-up, the
 * anchored rubric, and how scores add up. The AI writes questions and reads answers; it never sets the totals.
 */

export type QKind = "RESUME_PROBE" | "JD_TECHNICAL" | "BEHAVIORAL" | "SITUATIONAL" | "MOTIVATION" | "GAP";
export type SessionType = "BEHAVIORAL" | "TECHNICAL" | "MIXED" | "HR";

const MIX: Record<SessionType, Record<5 | 10 | 15, Partial<Record<QKind, number>>>> = {
  MIXED: { 5: { RESUME_PROBE: 1, JD_TECHNICAL: 1, BEHAVIORAL: 1, MOTIVATION: 1, GAP: 1 }, 10: { RESUME_PROBE: 2, JD_TECHNICAL: 3, BEHAVIORAL: 2, SITUATIONAL: 1, MOTIVATION: 1, GAP: 1 }, 15: { RESUME_PROBE: 3, JD_TECHNICAL: 5, BEHAVIORAL: 3, SITUATIONAL: 2, MOTIVATION: 1, GAP: 1 } },
  TECHNICAL: { 5: { RESUME_PROBE: 1, JD_TECHNICAL: 3, GAP: 1 }, 10: { RESUME_PROBE: 2, JD_TECHNICAL: 6, SITUATIONAL: 1, GAP: 1 }, 15: { RESUME_PROBE: 3, JD_TECHNICAL: 9, SITUATIONAL: 2, GAP: 1 } },
  BEHAVIORAL: { 5: { RESUME_PROBE: 1, BEHAVIORAL: 3, GAP: 1 }, 10: { RESUME_PROBE: 2, BEHAVIORAL: 6, MOTIVATION: 1, GAP: 1 }, 15: { RESUME_PROBE: 3, BEHAVIORAL: 9, SITUATIONAL: 1, MOTIVATION: 1, GAP: 1 } },
  HR: { 5: { MOTIVATION: 1, BEHAVIORAL: 2, SITUATIONAL: 1, GAP: 1 }, 10: { RESUME_PROBE: 1, MOTIVATION: 2, BEHAVIORAL: 4, SITUATIONAL: 2, GAP: 1 }, 15: { RESUME_PROBE: 2, MOTIVATION: 2, BEHAVIORAL: 7, SITUATIONAL: 3, GAP: 1 } },
};

export interface Slot {
  kind: QKind;
  reqIds: string[];
  nodeIds: string[];
}

export interface PlanInput {
  type: SessionType;
  count: 5 | 10 | 15;
  /** Job requirements with their match class; empty for general practice. */
  reqs: { id: string; text: string; priority: "MUST_HAVE" | "NICE_TO_HAVE"; cls: string; kind: string }[];
  /** Resume bullets that can anchor a probe, most relevant first. */
  bullets: string[];
}

/** The question plan: how many of each kind, and which requirement or resume line each one is about (05 §9.2). */
export function planSlots(p: PlanInput): Slot[] {
  const mix = { ...MIX[p.type][p.count] };
  const gaps = p.reqs.filter((r) => r.priority === "MUST_HAVE" && (r.cls === "MISSING" || r.cls === "PARTIAL"));
  // No gap to ask about (or no job): ask another behavioral question instead.
  if (mix.GAP && !gaps.length) {
    mix.BEHAVIORAL = (mix.BEHAVIORAL ?? 0) + mix.GAP;
    delete mix.GAP;
  }
  if (mix.RESUME_PROBE && !p.bullets.length) {
    mix.BEHAVIORAL = (mix.BEHAVIORAL ?? 0) + mix.RESUME_PROBE;
    delete mix.RESUME_PROBE;
  }
  const technical = p.reqs.filter((r) => r.kind === "SKILL" || r.kind === "TOOL");
  const techOrder = [...technical.filter((r) => r.priority === "MUST_HAVE"), ...technical.filter((r) => r.priority !== "MUST_HAVE")];
  const softOrder = p.reqs.filter((r) => r.kind !== "SKILL" && r.kind !== "TOOL" && r.kind !== "LOCATION" && r.kind !== "WORK_AUTH");
  const slots: Slot[] = [];
  const order: QKind[] = ["MOTIVATION", "RESUME_PROBE", "JD_TECHNICAL", "BEHAVIORAL", "SITUATIONAL", "GAP"];
  let t = 0;
  let s = 0;
  let b = 0;
  for (const kind of order) {
    for (let i = 0; i < (mix[kind] ?? 0); i++) {
      if (kind === "JD_TECHNICAL") slots.push({ kind, reqIds: techOrder.length ? [techOrder[t++ % techOrder.length].id] : [], nodeIds: [] });
      else if (kind === "GAP") slots.push({ kind, reqIds: [gaps[i % gaps.length].id], nodeIds: [] });
      else if (kind === "RESUME_PROBE") slots.push({ kind, reqIds: [], nodeIds: [p.bullets[b++ % p.bullets.length]] });
      else if ((kind === "BEHAVIORAL" || kind === "SITUATIONAL") && softOrder.length) slots.push({ kind, reqIds: [softOrder[s++ % softOrder.length].id], nodeIds: [] });
      else slots.push({ kind, reqIds: [], nodeIds: [] });
    }
  }
  return slots.slice(0, p.count);
}

/** Share of must-have requirements at least one question touches. */
export function coverage(slots: Slot[], reqs: PlanInput["reqs"]): { covered: string[]; total: number } {
  const must = reqs.filter((r) => r.priority === "MUST_HAVE");
  const touched = new Set(slots.flatMap((s) => s.reqIds));
  return { covered: must.filter((r) => touched.has(r.id)).map((r) => r.text), total: must.length };
}

export const FOLLOW_UP_CAP: Record<5 | 10 | 15, number> = { 5: 3, 10: 6, 15: 8 };

export interface AnswerCheck {
  star: { situation: boolean; task: boolean; action: boolean; result: boolean };
  metrics: string[];
  keyPointsCovered: number;
  keyPointsTotal: number;
  offTopic: boolean;
}

export const wordCount = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** Share of first-person ownership: I/my/me against we/our/us (05 §9.4). */
export function iRatio(text: string): number {
  const i = (text.match(/\b(?:I|my|me|myself)\b/g) ?? []).length;
  const we = (text.match(/\b(?:we|our|us|ourselves)\b/gi) ?? []).length;
  return i + we === 0 ? 1 : i / (i + we);
}

const FOLLOW_UP: Record<string, string> = {
  result: "What was the outcome? If you can, give a number.",
  action: "What did you do yourself, step by step?",
  ownership: "Which part of that was yours, specifically?",
  detail: "Could you go a bit deeper? Walk me through how you'd actually do it.",
  example: "Can you give a specific example from your own work?",
  short: "Could you add a little more detail to that?",
};

/**
 * Whether to ask a follow-up, and which one: exactly one missing element at a time, within the caps.
 * EASY sessions only ask about a missing result (05 §9.3).
 */
export function followUpFor(input: {
  kind: QKind;
  difficulty: "EASY" | "STANDARD" | "HARD";
  answer: string;
  check: AnswerCheck | null;
  askedForThis: number;
  sessionUsed: number;
  sessionCap: number;
}): { key: string; text: string } | null {
  if (input.askedForThis >= 2 || input.sessionUsed >= input.sessionCap) return null;
  const words = wordCount(input.answer);
  const c = input.check;
  const pick = (key: keyof typeof FOLLOW_UP) => ({ key, text: FOLLOW_UP[key] });
  if (input.difficulty === "EASY") return c && !c.star.result && words >= 25 && input.kind !== "JD_TECHNICAL" && input.kind !== "MOTIVATION" ? pick("result") : null;
  if (words < 25) return pick("short");
  if (!c || c.offTopic) return null;
  if (input.kind === "JD_TECHNICAL") {
    if (c.keyPointsTotal && c.keyPointsCovered / c.keyPointsTotal < 0.5) return pick("detail");
    if (words < 40) return pick("example");
    return null;
  }
  if (input.kind === "MOTIVATION" || input.kind === "GAP") return null;
  if (!c.star.action) return pick("action");
  if (!c.star.result) return pick("result");
  if (iRatio(input.answer) < 0.3) return pick("ownership");
  if (input.difficulty === "HARD" && !c.metrics.length) return pick("result");
  return null;
}

// ─── Rubric (05 §9.5) ───

export type Dim = "STAR" | "SPECIFICITY" | "RELEVANCE" | "CLARITY" | "CONCISENESS" | "ACCURACY" | "DEPTH" | "REASONING" | "COMMUNICATION";

export const DIM_LABEL: Record<Dim, string> = {
  STAR: "Structure (STAR)",
  SPECIFICITY: "Specific and your own",
  RELEVANCE: "Answers the question",
  CLARITY: "Clarity",
  CONCISENESS: "Length",
  ACCURACY: "Accuracy",
  DEPTH: "Depth",
  REASONING: "Reasoning",
  COMMUNICATION: "Communication",
};

/** Weights per question kind. Motivation and gap questions drop STAR and renormalize. */
export function rubricFor(kind: QKind): { dim: Dim; weight: number; byAi: boolean }[] {
  if (kind === "JD_TECHNICAL") return [
    { dim: "ACCURACY", weight: 40, byAi: true },
    { dim: "DEPTH", weight: 25, byAi: true },
    { dim: "REASONING", weight: 20, byAi: true },
    { dim: "COMMUNICATION", weight: 15, byAi: true },
  ];
  const base = [
    { dim: "STAR" as Dim, weight: 25, byAi: false },
    { dim: "SPECIFICITY" as Dim, weight: 25, byAi: true },
    { dim: "RELEVANCE" as Dim, weight: 25, byAi: true },
    { dim: "CLARITY" as Dim, weight: 15, byAi: true },
    { dim: "CONCISENESS" as Dim, weight: 10, byAi: false },
  ];
  return kind === "MOTIVATION" || kind === "GAP" ? base.filter((d) => d.dim !== "STAR") : base;
}

export function starScore(star: AnswerCheck["star"], hasMetric: boolean): number {
  const n = [star.situation, star.task, star.action, star.result].filter(Boolean).length;
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return hasMetric ? 5 : 4;
}

export function concisenessScore(words: number): number {
  if (words < 40 || words > 450) return 1;
  if (words <= 80 || words >= 350) return 3;
  if (words < 120 || words > 300) return 4;
  return 5;
}

export interface DimResult {
  dim: Dim;
  score: number | null;
  quote: string | null;
  note?: string;
}

/**
 * Turn the AI's dimension scores into ones we stand behind (INT-031): a quote must really be in the
 * answer; a score with no quote can't be above 2; an unverifiable quote leaves the dimension unscored.
 */
export function verifyDims(raw: { dim: string; score: number; quote: string | null }[], rawAnswer: string, kind: QKind, check: AnswerCheck): DimResult[] {
  const answer = withoutInjection(rawAnswer);
  const out: DimResult[] = [];
  for (const r of rubricFor(kind)) {
    if (!r.byAi) {
      out.push({ dim: r.dim, score: r.dim === "STAR" ? starScore(check.star, check.metrics.length > 0) : concisenessScore(wordCount(answer)), quote: null });
      continue;
    }
    const got = raw.find((d) => d.dim.toUpperCase() === r.dim);
    if (!got || !Number.isFinite(got.score)) {
      out.push({ dim: r.dim, score: null, quote: null, note: "Not enough information" });
      continue;
    }
    let score = Math.max(1, Math.min(5, Math.round(got.score)));
    if (!got.quote) score = Math.min(score, 2);
    else if (!verifyQuote(got.quote, answer)) {
      out.push({ dim: r.dim, score: null, quote: null, note: "Not enough information" });
      continue;
    }
    if (r.dim === "SPECIFICITY" && !check.metrics.length && iRatio(answer) < 0.3) score = Math.min(score, 3);
    out.push({ dim: r.dim, score, quote: got.quote });
  }
  return out;
}

/** 0–100 for one question: weighted, over scored dimensions only (05 §9.6). */
export function questionScore(kind: QKind, dims: DimResult[]): number | null {
  let num = 0;
  let den = 0;
  for (const r of rubricFor(kind)) {
    const d = dims.find((x) => x.dim === r.dim);
    if (d?.score == null) continue;
    num += (r.weight * (d.score - 1)) / 4;
    den += r.weight;
  }
  return den ? Math.round((100 * num) / den) : null;
}

export function sessionScore(scores: (number | null)[]): number | null {
  const s = scores.filter((x): x is number => x !== null);
  return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null;
}

/** Average score per dimension across questions, weakest first: the report's priorities (INT-036). */
export function dimensionAverages(all: DimResult[][]): { dim: Dim; avg: number; n: number }[] {
  const acc = new Map<Dim, { sum: number; n: number }>();
  for (const dims of all) for (const d of dims) {
    if (d.score == null) continue;
    const a = acc.get(d.dim) ?? { sum: 0, n: 0 };
    acc.set(d.dim, { sum: a.sum + d.score, n: a.n + 1 });
  }
  return [...acc.entries()].map(([dim, a]) => ({ dim, avg: Math.round((a.sum / a.n) * 10) / 10, n: a.n })).sort((x, y) => x.avg - y.avg);
}

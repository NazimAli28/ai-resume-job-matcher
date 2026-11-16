import { blankNumbers, checkClaim, placeholdersIn } from "../ai/guard/facts";
import { skillsIn, textShows } from "../match/taxonomy";
import type { MatchItem } from "../match/engine";
import type { ResumeDoc } from "../resume/types";

/**
 * Tailoring (TLR), the parts that don't touch the database: evidence, validating what the AI
 * proposes, the suggestions code makes on its own, and applying accepted changes to a resume.
 */

export interface Evidence {
  id: string;
  label: string;
  text: string;
}

export type SuggestionKind = "REWRITE" | "QUESTION" | "SKILL_ADD" | "SKILL_ORDER" | "GAP_QUESTION";
export type SuggestionStatus = "PENDING" | "APPLIED" | "DISMISSED";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  status: SuggestionStatus;
  /** Where it goes: a bullet id, "summary" or "skills". */
  targetId: string;
  targetLabel: string;
  before?: string;
  after?: string;
  /** QUESTION: text with [X] to fill. GAP_QUESTION: the skill asked about. */
  template?: string;
  question?: string;
  answerType?: "NUMBER" | "YES_NO" | "TEXT";
  rationale: string;
  reqIds: string[];
  reqTexts: string[];
  basedOn: Evidence[];
  skill?: string;
  order?: string[];
  editedByUser?: boolean;
  /** Set when the user's own edit says something the evidence doesn't; shown, never blocked. */
  warning?: string;
}

export interface GuardStats {
  proposed: number;
  kept: number;
  asked: number;
  blocked: Record<string, number>;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Everything the candidate can be quoted on, each with an id the AI must cite. */
export function buildEvidence(
  doc: ResumeDoc,
  extra: { facts: { id: string; statement: string; skillName: string | null }[]; profileSkills: string[] },
): Evidence[] {
  const out: Evidence[] = [];
  if (doc.basics.summary) out.push({ id: "summary", label: "Summary", text: clean(doc.basics.summary) });
  for (const w of doc.work) {
    const label = [w.title, w.employer].filter(Boolean).join(", ") || "Experience";
    out.push({ id: `role:${w.id}`, label, text: label });
    for (const b of w.bullets) out.push({ id: b.id, label, text: clean(b.text) });
  }
  for (const p of doc.projects) for (const b of p.bullets) out.push({ id: b.id, label: `Project: ${p.name}`, text: clean(b.text) });
  for (const e of doc.education) out.push({ id: `edu:${e.id}`, label: "Education", text: clean([e.degreeRaw, e.institution].filter(Boolean).join(", ")) });
  if (doc.skills.length) out.push({ id: "skills", label: "Skills", text: doc.skills.join(", ") });
  doc.certifications.forEach((c, i) => out.push({ id: `cert:${i}`, label: "Certifications", text: c }));
  if (extra.profileSkills.length) out.push({ id: "profile-skills", label: "Your profile skills", text: extra.profileSkills.join(", ") });
  for (const f of extra.facts) out.push({ id: `fact:${f.id}`, label: "Your confirmed facts", text: clean(f.statement) });
  return out;
}

/** Targets a suggestion may change: bullets and the summary. */
export function targetsOf(doc: ResumeDoc): Map<string, { text: string; label: string }> {
  const m = new Map<string, { text: string; label: string }>();
  if (doc.basics.summary) m.set("summary", { text: clean(doc.basics.summary), label: "Summary" });
  for (const w of doc.work) for (const b of w.bullets) m.set(b.id, { text: clean(b.text), label: [w.title, w.employer].filter(Boolean).join(", ") || "Experience" });
  for (const p of doc.projects) for (const b of p.bullets) m.set(b.id, { text: clean(b.text), label: `Project: ${p.name}` });
  return m;
}

export interface RawSuggestion {
  kind: "REWRITE" | "QUESTION";
  targetId: string;
  newText: string;
  question: string;
  citeIds: string[];
  reqIds: string[];
  rationale: string;
}

const MAX_AI = 16;

const STOP = new Set("with from into that this their there about after before while which where when using used than then have been were also more most over under across within for and the our your".split(" "));
const tokens = (s: string) => (s.toLowerCase().match(/[a-z][a-z0-9+#.-]{3,}/g) ?? []).map((w) => w.replace(/[.-]+$/, "")).filter((w) => !STOP.has(w));

/**
 * Words a rewrite carries over from a different line of the resume ("billing module" moved onto a
 * bug-fixing bullet). No name or number changes, so the fact checker can't see it; this can.
 */
export function borrowedWords(text: string, cited: Evidence[], all: Evidence[], reqs: { text: string }[]): string[] {
  const own = new Set(cited.flatMap((c) => tokens(c.text)));
  const job = new Set(reqs.flatMap((r) => tokens(r.text)));
  const citedIds = new Set(cited.map((c) => c.id));
  const elsewhere = new Set(all.filter((e) => !citedIds.has(e.id) && e.id !== "skills" && e.id !== "profile-skills").flatMap((e) => tokens(e.text)));
  const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");
  const ownStems = new Set([...own].map(stem));
  return [...new Set(tokens(text))].filter((w) => !own.has(w) && !ownStems.has(stem(w)) && !job.has(w) && elsewhere.has(w));
}
let seq = 0;
const newId = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * The fact checker's verdict on each AI proposal (05 §7.4): keep it, turn it into a question for the
 * user, or drop it. Nothing the AI writes reaches the user without passing here.
 */
export function validateSuggestions(
  raw: RawSuggestion[],
  ctx: { doc: ResumeDoc; evidence: Evidence[]; reqs: { id: string; text: string }[] },
): { suggestions: Suggestion[]; stats: GuardStats } {
  const targets = targetsOf(ctx.doc);
  const byId = new Map(ctx.evidence.map((e) => [e.id, e]));
  const reqById = new Map(ctx.reqs.map((r) => [r.id, r.text]));
  const stats: GuardStats = { proposed: raw.length, kept: 0, asked: 0, blocked: {} };
  const block = (reason: string) => (stats.blocked[reason] = (stats.blocked[reason] ?? 0) + 1);
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  const jobSkillName = new Map<string, string>();
  for (const r of ctx.reqs) for (const id of skillsIn(r.text)) if (!jobSkillName.has(id)) jobSkillName.set(id, r.text);
  const jobSkills = new Set(jobSkillName.keys());

  for (const r of raw.slice(0, MAX_AI * 2)) {
    const target = targets.get(r.targetId);
    if (!target) {
      block("UNKNOWN_TARGET");
      continue;
    }
    if (seen.has(r.targetId)) continue; // one change per line keeps the diff readable
    const cited = [...new Set(r.citeIds)].map((id) => byId.get(id)).filter((e): e is Evidence => !!e);
    const basedOn = [{ id: r.targetId, label: target.label, text: target.text }, ...cited.filter((c) => c.id !== r.targetId)];
    const reqIds = r.reqIds.filter((id) => reqById.has(id));
    const base = { id: newId(), status: "PENDING" as const, targetId: r.targetId, targetLabel: target.label, before: target.text, rationale: clean(r.rationale).slice(0, 240), reqIds, reqTexts: reqIds.map((id) => reqById.get(id)!), basedOn };
    const text = clean(r.newText).slice(0, 400);

    if (r.kind === "QUESTION") {
      // The template may hold [X] for the user's figure; everything else in it must already be true.
      const verdict = checkClaim({ text: text.replace(/\[[^\]]*\]/g, ""), evidence: basedOn.map((b) => b.text), original: target.text });
      if (verdict.action === "BLOCK" || !placeholdersIn(text).length) {
        block(verdict.action === "BLOCK" ? verdict.reason : "NO_PLACEHOLDER");
        continue;
      }
      if (borrowedWords(text, basedOn, ctx.evidence, ctx.reqs).length) {
        block("BORROWED");
        continue;
      }
      out.push({ ...base, kind: "QUESTION", template: text, question: clean(r.question).slice(0, 200) || "What figure belongs here? Only add it if it's true.", answerType: "NUMBER" });
      stats.asked++;
      seen.add(r.targetId);
    } else {
      if (!text || text.toLowerCase() === target.text.toLowerCase()) continue;
      let verdict = checkClaim({ text, evidence: basedOn.map((b) => b.text), original: target.text });
      // A skill the job asks for but the evidence doesn't show: never applied as is, but worth asking
      // about, because the user may simply not have written it down (the founder's "ask, then save" rule).
      let askedSkill: string[] = [];
      if (verdict.action === "BLOCK" && verdict.reason === "NEW_SKILL" && verdict.detail.every((id) => jobSkills.has(id))) {
        const names = verdict.detail.map((id) => jobSkillName.get(id)!);
        const retry = checkClaim({ text, evidence: [...basedOn.map((b) => b.text), ...names], original: target.text });
        if (retry.action === "PASS") {
          askedSkill = names;
          verdict = retry;
        }
      }
      if (verdict.action === "BLOCK") {
        block(verdict.reason);
        continue;
      }
      const borrowed = askedSkill.length ? [] : borrowedWords(text, basedOn, ctx.evidence, ctx.reqs);
      if (askedSkill.length || borrowed.length) {
        const what = askedSkill.length ? `${askedSkill.join(", ")}, which your resume doesn't mention` : `"${borrowed.join(" ")}" from another part of your resume`;
        out.push({ ...base, kind: "QUESTION", template: text, question: `Is this accurate? It adds ${what}. Say yes only if it's true.`, answerType: "YES_NO" });
        stats.asked++;
        seen.add(r.targetId);
        if (out.length >= MAX_AI) break;
        continue;
      }
      if (verdict.action === "ASK" && verdict.reason === "NEW_NUMBER") {
        out.push({ ...base, kind: "QUESTION", template: blankNumbers(text, verdict.numbers), question: "Do you have a real number for this? Only add it if it's true.", answerType: "NUMBER" });
        stats.asked++;
      } else if (verdict.action === "ASK") {
        const q = verdict.reason === "STRONGER_CLAIM" ? "Is this accurate? It describes your role more strongly than your resume does." : `Is this accurate? It adds "${verdict.detail.join(", ")}", which your resume doesn't say.`;
        out.push({ ...base, kind: "QUESTION", template: text, question: q, answerType: "YES_NO" });
        stats.asked++;
      } else {
        out.push({ ...base, kind: "REWRITE", after: text });
        stats.kept++;
      }
      seen.add(r.targetId);
    }
    if (out.length >= MAX_AI) break;
  }
  return { suggestions: out, stats };
}

/**
 * Suggestions code can make without AI: a skill the candidate has shown but doesn't list, the job's
 * skills moved to the front, and an honest question for each missing must-have.
 */
export function deterministicSuggestions(ctx: { doc: ResumeDoc; evidence: Evidence[]; items: MatchItem[]; reqs: { id: string; text: string; skillTerm: string | null; kind: string }[] }): Suggestion[] {
  const out: Suggestion[] = [];
  const skills = ctx.doc.skills;
  const listed = (term: string) => skills.some((s) => textShows(s, term) || s.toLowerCase() === term.toLowerCase());
  const skillReqs = ctx.reqs.filter((r) => (r.kind === "SKILL" || r.kind === "TOOL") && r.skillTerm);
  const itemFor = (id: string) => ctx.items.find((i) => i.requirementId === id);

  for (const r of skillReqs) {
    const term = r.skillTerm!;
    const item = itemFor(r.id);
    const shown = ctx.evidence.filter((e) => e.id !== "skills" && textShows(e.text, term));
    if (shown.length && !listed(term)) {
      const label = term; // the job's own spelling, which is what its keyword search looks for
      out.push({ id: newId(), kind: "SKILL_ADD", status: "PENDING", targetId: "skills", targetLabel: "Skills", skill: label, after: label, rationale: `The job asks for ${label}, and you show it here, but your Skills section doesn't list it.`, reqIds: [r.id], reqTexts: [r.text], basedOn: shown.slice(0, 2) });
    } else if (!shown.length && item?.cls === "MISSING" && item.priority === "MUST_HAVE") {
      out.push({ id: newId(), kind: "GAP_QUESTION", status: "PENDING", targetId: "skills", targetLabel: "Missing requirement", skill: term, question: `The job requires ${term}, and nothing you've given us mentions it. Have you used it? If yes, say where.`, answerType: "TEXT", rationale: "We never add a skill you haven't shown. If you have it, your answer becomes a confirmed fact we can use.", reqIds: [r.id], reqTexts: [r.text], basedOn: [] });
    }
  }

  // Put the job's skills first (SKILL_ORDER), keeping the rest in their order.
  const wanted = skills.filter((s) => skillReqs.some((r) => textShows(s, r.skillTerm!) || s.toLowerCase() === r.skillTerm!.toLowerCase()));
  const order = [...wanted, ...skills.filter((s) => !wanted.includes(s))];
  if (wanted.length && order.some((s, i) => s !== skills[i])) {
    out.push({ id: newId(), kind: "SKILL_ORDER", status: "PENDING", targetId: "skills", targetLabel: "Skills", order, before: skills.join(", "), after: order.join(", "), rationale: "Recruiters skim the first few skills. These lead with what this job asks for.", reqIds: [], reqTexts: [], basedOn: [{ id: "skills", label: "Skills", text: skills.join(", ") }] });
  }
  return out;
}

export interface Change {
  suggestionId: string;
  kind: SuggestionKind;
  targetId: string;
  targetLabel: string;
  before?: string;
  after: string;
}

/** The tailored resume: the parent with every applied suggestion, in a fixed order so the result is stable. */
export function applySuggestions(doc: ResumeDoc, suggestions: Suggestion[]): { doc: ResumeDoc; changes: Change[] } {
  const next: ResumeDoc = structuredClone(doc);
  const changes: Change[] = [];
  const applied = suggestions.filter((s) => s.status === "APPLIED" && s.after);
  const setBullet = (id: string, text: string) => {
    for (const w of next.work) for (const b of w.bullets) if (b.id === id) b.text = text;
    for (const p of next.projects) for (const b of p.bullets) if (b.id === id) b.text = text;
  };
  for (const s of applied.filter((s) => s.kind === "REWRITE" || s.kind === "QUESTION")) {
    if (s.targetId === "summary") next.basics.summary = s.after!;
    else setBullet(s.targetId, s.after!);
    changes.push({ suggestionId: s.id, kind: s.kind, targetId: s.targetId, targetLabel: s.targetLabel, before: s.before, after: s.after! });
  }
  for (const s of applied.filter((s) => s.kind === "SKILL_ADD")) {
    if (!next.skills.some((k) => k.toLowerCase() === s.after!.toLowerCase())) {
      next.skills.push(s.after!);
      changes.push({ suggestionId: s.id, kind: s.kind, targetId: "skills", targetLabel: "Skills", after: s.after! });
    }
  }
  const order = applied.find((s) => s.kind === "SKILL_ORDER")?.order;
  if (order) {
    const rest = next.skills.filter((k) => !order.includes(k));
    const reordered = [...order.filter((k) => next.skills.includes(k)), ...rest];
    if (reordered.some((k, i) => k !== next.skills[i])) {
      changes.push({ suggestionId: applied.find((s) => s.kind === "SKILL_ORDER")!.id, kind: "SKILL_ORDER", targetId: "skills", targetLabel: "Skills", before: next.skills.join(", "), after: reordered.join(", ") });
      next.skills = reordered;
    }
  }
  return { doc: next, changes };
}

/** Fill a question's [X] placeholders with the user's answer. Only short, plain values are accepted. */
export function fillTemplate(template: string, answer: string): string | null {
  const value = answer.trim();
  if (!value || value.length > 40 || /[<>{}[\]]/.test(value)) return null;
  return template.replace(/\[X\](%?)/g, (_, pct) => (pct && value.endsWith("%") ? value : `${value}${pct}`)).replace(/\[[^\]]*\]/g, value);
}

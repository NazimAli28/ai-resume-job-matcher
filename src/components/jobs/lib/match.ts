// JobMatch scoring in code (PRD 05 §5, PRD §5b). Deterministic: same inputs, same score.
// The LLM never computes this; in the real app it only explains the table below.

import type { DemoState, Job, JobMatch, JobRequirement, MatchClass, Profile, ResumeVersion, SourceSpan } from "@/demo/types";
import { TODAY } from "@/lib/dates";
import { DEGREE, mentions, UNVERIFIABLE, YEARS } from "./skills";

export const WEIGHTS = { must: 45, nice: 15, title: 15, evidence: 15, thresholds: 10 } as const;
export const CAP_ONE_GAP = 60;
export const CAP_TWO_GAPS = 45;

const CREDIT: Record<Exclude<MatchClass, "UNKNOWN">, number> = { STRONG: 1, PARTIAL: 0.5, MISSING: 0 };

/** A requirement after user overrides are applied. */
export interface EffectiveRequirement extends JobRequirement {
  base: MatchClass;
  cls: MatchClass;
  learning: boolean;
  userNote?: string;
}

export const FACT_BANK_SECTION = "Fact bank";

/** The most recent user fact that mentions this requirement's skill (used for "Add evidence"). */
export function userFactFor(profile: Profile, req: JobRequirement) {
  const facts = profile.factBank.filter((f) => f.source === "USER");
  for (let i = facts.length - 1; i >= 0; i--) {
    if (mentions(facts[i].fact, req.skill)) return facts[i];
  }
  return undefined;
}

export function effectiveRequirement(req: JobRequirement, profile: Profile): EffectiveRequirement {
  const base = req.matchClass;
  const out: EffectiveRequirement = { ...req, base, cls: base, learning: false };
  switch (req.override) {
    case "CONFIRM":
      // PRD 05 §5.2: confirm without new evidence counts as PARTIAL at most.
      if (base !== "STRONG") {
        out.cls = "PARTIAL";
        out.userNote = "You confirmed you have this. Add evidence so it counts fully.";
      } else out.userNote = "You confirmed this.";
      break;
    case "REJECT":
      out.cls = "MISSING";
      out.evidence = undefined;
      out.userNote = "You said you don't have this.";
      break;
    case "LEARNING":
      out.cls = "MISSING";
      out.learning = true;
      out.evidence = undefined;
      out.userNote = "You're learning this. It counts once you can show it in your work.";
      break;
    case "ADD_EVIDENCE": {
      const fact = userFactFor(profile, req);
      if (fact) {
        out.cls = "STRONG";
        out.evidence = { section: FACT_BANK_SECTION, text: fact.fact };
        out.userNote = "From evidence you added.";
      }
      break;
    }
  }
  return out;
}

/** Strip dates and years so "Feb 2023 – Present" isn't mistaken for a metric. */
function hasMetric(text: string) {
  const t = text
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi, "");
  return /\d|%/.test(t);
}

/** PRD 05 §5.3: 1.0 bullet with metric, 0.6 bullet without, 0.3 skills list / summary / self-report. */
export function evidenceQuality(r: EffectiveRequirement): number {
  if (!r.evidence) return 0.3; // confirmed by the user without evidence
  const s = r.evidence.section.toLowerCase();
  if (s === "skills" || s === "summary") return 0.3;
  if (s === "education") return 0.6;
  return hasMetric(r.evidence.text) ? 1 : 0.6;
}

function coverage(reqs: EffectiveRequirement[]): number | null {
  const r = reqs.filter((q) => q.cls !== "UNKNOWN");
  if (!r.length) return null;
  return r.reduce((sum, q) => sum + CREDIT[q.cls as keyof typeof CREDIT], 0) / r.length;
}

export interface FactorRow {
  key: string;
  label: string;
  weight: number;
  value: number; // 0–100, rounded; the contribution uses this rounded value so the table adds up
  explanation: string;
}

export interface MatchResult {
  score: number;
  raw: number;
  factors: FactorRow[];
  cap?: number;
  hardGaps: EffectiveRequirement[];
  reqs: EffectiveRequirement[];
  must: { total: number; strong: number; partial: number; missing: number; unknown: number };
  nice: { total: number; strong: number; partial: number; missing: number; unknown: number };
  lowConfidence: boolean;
}

function counts(reqs: EffectiveRequirement[]) {
  return {
    total: reqs.length,
    strong: reqs.filter((r) => r.cls === "STRONG").length,
    partial: reqs.filter((r) => r.cls === "PARTIAL").length,
    missing: reqs.filter((r) => r.cls === "MISSING").length,
    unknown: reqs.filter((r) => r.cls === "UNKNOWN").length,
  };
}

const pct = (v: number) => Math.round(v * 100);

/**
 * Compute the JobMatch. `stored` supplies title/seniority and thresholds, which this demo
 * doesn't re-derive after extraction; must-haves, nice-to-haves and evidence are always
 * recomputed from the (overridden) requirements so the table on screen adds up.
 */
export function scoreJob(job: Job, profile: Profile, stored: { title: number; thresholds: number }, ignoreOverrides = false): MatchResult {
  const reqs = job.requirements.map((r) => effectiveRequirement(ignoreOverrides ? { ...r, override: undefined } : r, profile));
  const must = reqs.filter((r) => r.type === "MUST_HAVE");
  const nice = reqs.filter((r) => r.type === "NICE_TO_HAVE");
  const M = coverage(must) ?? 0;
  const N = coverage(nice) ?? M;
  const matched = must.filter((r) => r.cls === "STRONG" || r.cls === "PARTIAL");
  const E = matched.length ? matched.reduce((s, r) => s + evidenceQuality(r), 0) / matched.length : 0;

  const factors: FactorRow[] = [
    { key: "must", label: "Must-have requirements", weight: WEIGHTS.must, value: pct(M), explanation: "Share of must-haves you meet. Partial counts half; unclear ones are left out." },
    { key: "nice", label: "Nice-to-haves", weight: WEIGHTS.nice, value: pct(N), explanation: nice.length ? "Share of nice-to-haves you meet, counted the same way." : "No nice-to-haves listed, so this repeats the must-have share." },
    { key: "title", label: "Title and seniority", weight: WEIGHTS.title, value: stored.title, explanation: "How closely your recent titles match the role and level." },
    { key: "evidence", label: "Evidence quality", weight: WEIGHTS.evidence, value: pct(E), explanation: "Work bullet with a number counts 1, a bullet without a number 0.6, a skills-list mention 0.3." },
    { key: "thresholds", label: "Years, education, location", weight: WEIGHTS.thresholds, value: stored.thresholds, explanation: "Hard thresholds like years of experience and degree." },
  ];
  const raw = factors.reduce((s, f) => s + (f.weight * f.value) / 100, 0);
  const hardGaps = must.filter((r) => r.cls === "MISSING");
  const cap = hardGaps.length >= 2 ? CAP_TWO_GAPS : hardGaps.length === 1 ? CAP_ONE_GAP : undefined;
  const score = Math.round(cap !== undefined ? Math.min(raw, cap) : raw);
  const mc = counts(must);
  return {
    score,
    raw: Math.round(raw * 10) / 10,
    factors,
    cap: cap !== undefined && raw > cap ? cap : undefined,
    hardGaps,
    reqs,
    must: mc,
    nice: counts(nice),
    lowConfidence: mc.total === 0 || mc.unknown / mc.total > 0.4,
  };
}

function storedFactor(match: JobMatch | undefined, key: string, fallback: number) {
  return match?.factors.find((f) => f.key === key)?.value ?? fallback;
}

/** Live score for a job (with overrides) and its baseline (without), for "was 78". */
export function liveMatch(state: DemoState, job: Job) {
  const stored = state.matches.find((m) => m.jobId === job.id);
  const s = { title: storedFactor(stored, "title", 70), thresholds: storedFactor(stored, "thresholds", 100) };
  const now = scoreJob(job, state.profile, s);
  const before = scoreJob(job, state.profile, s, true);
  return { now, before, stored };
}

/** "3 of 5 must-haves covered, 2 partly" — reproducible from the matrix on screen. */
export function basisLine(r: MatchResult): string {
  const m = r.must;
  if (!m.total) return "No must-haves found. Edit the requirements to get a useful estimate.";
  const parts = [`${m.strong} of ${m.total} must-haves covered`];
  if (m.partial) parts.push(`${m.partial} partly`);
  if (m.missing) parts.push(`${m.missing} missing`);
  if (m.unknown) parts.push(`${m.unknown} unclear (not counted)`);
  return parts.join(", ");
}

export function summaryLine(r: MatchResult): string {
  const gaps = r.hardGaps.map((g) => g.skill);
  if (gaps.length) return `${gaps.join(" and ")} ${gaps.length > 1 ? "are" : "is a"} must-have${gaps.length > 1 ? "s" : ""} you don't show yet, so this estimate is capped.`;
  const partial = r.reqs.filter((q) => q.type === "MUST_HAVE" && q.cls === "PARTIAL").map((q) => q.skill);
  if (partial.length) return `${basisLine(r)}. ${partial.join(" and ")} need stronger evidence.`;
  return `${basisLine(r)}.`;
}

// ---------------------------------------------------------------- classification

export function professionalMonths(profile: Profile): number {
  const monthsOf = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
  const today = monthsOf(TODAY.slice(0, 7));
  return profile.experiences
    .filter((e) => !/intern/i.test(e.title))
    .reduce((s, e) => s + Math.max(0, (e.end ? monthsOf(e.end) : today) - monthsOf(e.start) + 1), 0);
}

function yearsText(months: number) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} year${y === 1 ? "" : "s"}${m ? ` ${m} month${m === 1 ? "" : "s"}` : ""}`;
}

function resumeSpan(resume: ResumeVersion | undefined, skill: string, headings: RegExp): SourceSpan | undefined {
  if (!resume) return undefined;
  for (const sec of resume.sections) {
    if (!headings.test(sec.heading)) continue;
    const line = sec.lines.find((l) => mentions(l, skill));
    if (line) return { section: sec.heading, text: line };
  }
  return undefined;
}

/**
 * Classify one requirement against the profile with simple local matching:
 * experience bullet → STRONG (that bullet is the evidence); project or skills list only → PARTIAL;
 * nothing → MISSING. Soft skills a resume can't prove → UNKNOWN.
 */
export function classify(
  text: string,
  skill: string,
  profile: Profile,
  resume?: ResumeVersion,
): Pick<JobRequirement, "matchClass" | "evidence" | "note"> {
  const years = text.match(YEARS);
  if (years) {
    const need = Number(years[1]) * 12;
    const have = professionalMonths(profile);
    const current = profile.experiences.find((e) => !/intern/i.test(e.title));
    const ev = current ? { section: "Experience", text: `${current.title}, ${current.employer} (${current.start} to ${current.end ?? "present"})` } : undefined;
    if (have >= need) return { matchClass: "STRONG", evidence: ev, note: `About ${yearsText(have)} of full-time experience.` };
    if (have >= need * 0.75) return { matchClass: "PARTIAL", evidence: ev, note: `About ${yearsText(have)}, a little under ${years[1]} years.` };
    return { matchClass: "MISSING", note: `About ${yearsText(have)} found; the job asks for ${years[1]}+ years.` };
  }
  if (DEGREE.test(text) && !/experience/i.test(text)) {
    const ed = profile.education[0];
    if (ed) return { matchClass: "STRONG", evidence: { section: "Education", text: `${ed.degree}, ${ed.school}` }, note: "Your degree matches." };
    return { matchClass: "MISSING", note: "No degree found in your profile." };
  }
  if (UNVERIFIABLE.test(text)) {
    return { matchClass: "UNKNOWN", note: "A resume can't show this either way. Be ready to talk about it." };
  }
  for (const e of profile.experiences) {
    const b = e.bullets.find((x) => mentions(x, skill));
    if (b) return { matchClass: "STRONG", evidence: { section: `Experience, ${e.employer}`, text: b }, note: `Shown in your work at ${e.employer}.` };
  }
  const fact = [...profile.factBank].reverse().find((f) => f.source === "USER" && mentions(f.fact, skill));
  if (fact) return { matchClass: "STRONG", evidence: { section: FACT_BANK_SECTION, text: fact.fact }, note: "From a fact you confirmed." };
  const proj = profile.projects.find((p) => mentions(`${p.summary} ${p.tech.join(", ")}`, skill));
  if (proj) {
    const span = resumeSpan(resume, skill, /project/i);
    return {
      matchClass: "PARTIAL",
      evidence: span ?? { section: "Projects", text: `${proj.name}: ${proj.summary} (${proj.tech.join(", ")})` },
      note: "Only in a personal project, not in work experience.",
    };
  }
  const sk = profile.skills.find((s) => mentions(s.name, skill) || mentions(skill, s.name));
  if (sk) {
    const span = resumeSpan(resume, skill, /skill/i);
    return {
      matchClass: "PARTIAL",
      evidence: span ?? { section: "Skills", text: profile.skills.map((s) => s.name).join(", ") },
      note: "Listed as a skill, but no work bullet shows you using it.",
    };
  }
  return { matchClass: "MISSING", note: "Not found in your resume or profile." };
}

// ---------------------------------------------------------------- title fit for new jobs

const FAMILY = /front.?end|react|ui|web|javascript|typescript/i;

/** Title and seniority (PRD 05 §5.3): T = 0.6 × family + 0.4 × seniority fit. */
export function titleFit(jobTitle: string, profile: Profile, targetRoles: string[]): number {
  const mine = [...profile.experiences.map((e) => e.title), ...targetRoles].join(" ");
  const family = FAMILY.test(jobTitle) && FAMILY.test(mine) ? 1 : /developer|engineer|programmer/i.test(jobTitle) ? 0.6 : 0.2;
  const level = (t: string) => (/senior|lead|principal|staff|manager/i.test(t) ? 3 : /junior|intern|trainee|\bi\b|associate|graduate/i.test(t) ? 1 : 2);
  const months = professionalMonths(profile);
  const mineLevel = months < 12 ? 1 : months < 60 ? 2 : 3;
  const diff = Math.abs(level(jobTitle) - mineLevel);
  const seniority = diff === 0 ? 1 : diff === 1 ? 0.7 : 0.3;
  return Math.round((0.6 * family + 0.4 * seniority) * 100);
}

/** Thresholds (years, education): mean credit of threshold requirements; none → 100. */
export function thresholdsFit(reqs: JobRequirement[]): number {
  const t = reqs.filter((r) => (YEARS.test(r.text) || DEGREE.test(r.text)) && r.matchClass !== "UNKNOWN");
  if (!t.length) return 100;
  return Math.round((t.reduce((s, r) => s + CREDIT[r.matchClass as keyof typeof CREDIT], 0) / t.length) * 100);
}

/** Build the JobMatch stored with ADD_JOB. */
export function buildJobMatch(job: Job, profile: Profile, targetRoles: string[], resumeVersionId: string): JobMatch {
  const stored = { title: titleFit(job.title, profile, targetRoles), thresholds: thresholdsFit(job.requirements) };
  const r = scoreJob(job, profile, stored);
  return {
    jobId: job.id,
    resumeVersionId,
    score: r.score,
    factors: r.factors.map((f) => ({ key: f.key, label: f.label, weight: f.weight, value: f.value, explanation: f.explanation })),
    hardGapCap: r.cap,
    summary: summaryLine(r),
  };
}

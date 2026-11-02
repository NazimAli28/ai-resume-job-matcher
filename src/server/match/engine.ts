import { educationLevel, type EducationLevel } from "../resume/lexicon";
import { hasMetric, PK_CITY_RE } from "../resume/patterns";
import type { ResumeDoc } from "../resume/types";
import { textNames, textShows, TAXONOMY_VERSION } from "./taxonomy";

/**
 * JobMatch, computed in code (05 §5). Pure: same inputs, same score. No model ever sets or changes a number.
 *
 * Founder decisions (2026-10-30): UNKNOWN is left out of the score and listed separately. "Learning" is
 * PARTIAL, weighted by the user's own skill rating. Absence of a skill is MISSING, never assumed.
 */
export const ENGINE_VERSION = `match@1.0.0+${TAXONOMY_VERSION}`;

export const WEIGHTS = { must: 45, nice: 15, title: 15, evidence: 15, thresholds: 10 } as const;
export const CAP_ONE_GAP = 60;
export const CAP_TWO_GAPS = 45;

export type MatchClass = "STRONG" | "PARTIAL" | "MISSING" | "UNKNOWN";
export type Override = "CONFIRM" | "REJECT" | "LEARNING" | "ADD_EVIDENCE";
export type ReqKind = "SKILL" | "TOOL" | "TITLE" | "YEARS" | "EDUCATION" | "CERT" | "LOCATION" | "WORK_AUTH" | "LANGUAGE" | "SOFT" | "OTHER";

export interface MatchRequirement {
  id: string;
  text: string;
  kind: ReqKind;
  priority: "MUST_HAVE" | "NICE_TO_HAVE";
  hard: boolean;
  skillTerm?: string | null;
  years?: number | null;
  degreeLevel?: string | null;
  override?: Override | null;
}

/** A place something can be shown from. `strength` is what a hit there is worth (05 §5.2–5.3). */
export interface EvidenceSource {
  section: string;
  text: string;
  kind: "BULLET" | "FACT" | "LIST" | "CERT";
  /** Bullets only: the role ended over 7 years ago. */
  stale?: boolean;
}

export interface MatchProfile {
  sources: EvidenceSource[];
  /** Merged months of work, from the resume. */
  months: number;
  educationLevels: EducationLevel[];
  location?: string;
  languages: string[];
  titles: string[];
  targetTitles: string[];
  /** Self-ratings 1–5 by skill name. */
  ratings: { name: string; level: number | null }[];
  /** User-confirmed facts with the skill they prove. */
  facts: { skillName: string | null; statement: string }[];
}

export interface MatchItem {
  requirementId: string;
  text: string;
  priority: "MUST_HAVE" | "NICE_TO_HAVE";
  kind: ReqKind;
  hard: boolean;
  cls: MatchClass;
  /** STRONG 1, PARTIAL usually 0.5, MISSING 0. Lower for PARTIAL when the user rates themselves as learning. */
  credit: number;
  reason: string;
  evidence?: { section: string; text: string };
  evidenceQuality: number;
  override?: Override | null;
  learning: boolean;
}

export interface Factor {
  key: "must" | "nice" | "title" | "evidence" | "thresholds";
  label: string;
  weight: number;
  value: number;
  explanation: string;
}

export interface MatchResult {
  score: number;
  raw: number;
  cap?: number;
  factors: Factor[];
  items: MatchItem[];
  lowConfidence: boolean;
  engineVersion: string;
}

export function band(score: number): "Low" | "Fair" | "Good" | "Strong" {
  return score >= 80 ? "Strong" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Low";
}

const LEVEL_ORDER: EducationLevel[] = ["SECONDARY", "HIGHER_SECONDARY", "DIPLOMA", "BACHELOR", "MASTER", "MPHIL", "DOCTORATE"];
const levelIdx = (l: string | null | undefined) => LEVEL_ORDER.indexOf(l as EducationLevel);

const yearsText = (months: number) => {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} year${y === 1 ? "" : "s"}${m ? ` ${m} month${m === 1 ? "" : "s"}` : ""}`;
};

/** A low self-rating lowers what a PARTIAL is worth; it can never raise it. */
function learningCredit(term: string | null | undefined, ratings: MatchProfile["ratings"]): number {
  const r = term ? ratings.find((x) => x.level !== null && (textShows(x.name, term) || textShows(term, x.name))) : undefined;
  if (r?.level === 1) return 0.25;
  return 0.5;
}

function classifySkill(req: MatchRequirement, p: MatchProfile): Omit<MatchItem, "requirementId" | "text" | "priority" | "kind" | "hard" | "override" | "learning"> {
  const term = req.skillTerm?.trim() || req.text;
  const fact = p.facts.find((f) => (f.skillName && (textShows(f.skillName, term) || textShows(term, f.skillName))) || textShows(f.statement, term));
  // A line that names the skill is better evidence to show than one that only implies it.
  const inKind = (k: EvidenceSource["kind"], fresh?: boolean) => {
    const found = p.sources.filter((s) => s.kind === k && (fresh === undefined || !s.stale === fresh) && textShows(s.text, term));
    return found.find((s) => textNames(s.text, term)) ?? found[0];
  };

  const certHit = req.kind === "CERT" ? inKind("CERT") : undefined;
  const bullet = inKind("BULLET", true);
  const hit = bullet ?? certHit;
  if (hit) {
    return {
      cls: "STRONG",
      credit: 1,
      reason: hit.kind === "CERT" ? "Listed in your certifications." : `Shown in your work: ${hit.section}.`,
      evidence: { section: hit.section, text: hit.text },
      evidenceQuality: hit.kind === "BULLET" && hasMetric(hit.text) ? 1 : 0.6,
    };
  }
  if (fact) {
    return {
      cls: "STRONG",
      credit: 1,
      reason: "From evidence you confirmed.",
      evidence: { section: "Your evidence", text: fact.statement },
      evidenceQuality: hasMetric(fact.statement) ? 1 : 0.6,
    };
  }
  const old = inKind("BULLET", false);
  if (old) {
    return { cls: "PARTIAL", credit: 0.5, reason: "Shown in a role that ended over 7 years ago.", evidence: { section: old.section, text: old.text }, evidenceQuality: 0.6 };
  }
  const list = inKind("LIST");
  if (list) {
    const credit = learningCredit(term, p.ratings);
    return {
      cls: "PARTIAL",
      credit,
      reason: credit < 0.5 ? "Listed, and you rate yourself as just starting with it." : "Mentioned, but no work bullet shows you using it.",
      evidence: { section: list.section, text: list.text },
      evidenceQuality: 0.3,
    };
  }
  return { cls: "MISSING", credit: 0, reason: "No evidence found in your resume or evidence bank.", evidenceQuality: 0 };
}

function classifyBase(req: MatchRequirement, p: MatchProfile): ReturnType<typeof classifySkill> {
  const none = { evidenceQuality: 0 };
  switch (req.kind) {
    case "SOFT":
    case "OTHER":
    case "WORK_AUTH":
      if (req.kind === "OTHER" && req.skillTerm) return classifySkill(req, p);
      return { cls: "UNKNOWN", credit: 0, reason: "A resume can't show this either way, so it isn't counted. Be ready to talk about it.", ...none };
    case "LANGUAGE": {
      if (!p.languages.length) return { cls: "UNKNOWN", credit: 0, reason: "Your resume has no languages section, so this isn't counted.", ...none };
      const lang = p.languages.find((l) => l.toLowerCase().split(/[^a-z]+/).some((w) => w.length > 2 && req.text.toLowerCase().includes(w)));
      return lang
        ? { cls: "STRONG", credit: 1, reason: "Listed in your languages.", evidence: { section: "Languages", text: lang }, evidenceQuality: 0.6 }
        : { cls: "MISSING", credit: 0, reason: "Not in the languages on your resume.", ...none };
    }
    case "YEARS": {
      const need = req.years ? req.years * 12 : 0;
      if (!need) return { cls: "UNKNOWN", credit: 0, reason: "The post doesn't state how many years, so this isn't counted.", ...none };
      const base: ReturnType<typeof classifySkill> =
        p.months >= need
          ? { cls: "STRONG", credit: 1, reason: `About ${yearsText(p.months)} of work on your resume.`, evidenceQuality: 0.6 }
          : p.months >= need * 0.75
            ? { cls: "PARTIAL", credit: 0.5, reason: `About ${yearsText(p.months)} found, a little under ${req.years} years.`, evidenceQuality: 0.6 }
            : { cls: "MISSING", credit: 0, reason: `About ${yearsText(p.months)} found; the post asks for ${req.years}+ years.`, evidenceQuality: 0 };
      // "3+ years of Node.js": total time alone doesn't prove the skill.
      if (req.skillTerm && base.cls !== "MISSING" && classifySkill(req, p).cls === "MISSING") {
        return { cls: "MISSING", credit: 0, reason: `No evidence of ${req.skillTerm} in your resume, though you have ${yearsText(p.months)} of work overall.`, evidenceQuality: 0 };
      }
      return base;
    }
    case "EDUCATION": {
      const need = levelIdx(req.degreeLevel ?? educationLevel(req.text));
      const best = Math.max(-1, ...p.educationLevels.map(levelIdx));
      if (need < 0) return { cls: "UNKNOWN", credit: 0, reason: "The post doesn't state a clear degree level, so this isn't counted.", ...none };
      if (best < 0) return { cls: "MISSING", credit: 0, reason: "No degree found on your resume.", ...none };
      if (best >= need) return { cls: "STRONG", credit: 1, reason: "Your degree meets this level.", evidenceQuality: 0.6 };
      return best === need - 1
        ? { cls: "PARTIAL", credit: 0.5, reason: "Your degree is one level below what's asked.", evidenceQuality: 0.3 }
        : { cls: "MISSING", credit: 0, reason: "Your degree is below what's asked.", ...none };
    }
    case "LOCATION": {
      if (!p.location) return { cls: "UNKNOWN", credit: 0, reason: "No location on your resume, so this isn't counted.", ...none };
      const city = PK_CITY_RE.exec(req.text)?.[0];
      const same = city ? new RegExp(`\\b${city}\\b`, "i").test(p.location) : p.location.toLowerCase().split(/[^a-z]+/).some((w) => w.length > 3 && req.text.toLowerCase().includes(w));
      return same
        ? { cls: "STRONG", credit: 1, reason: `Your resume says ${p.location}.`, evidenceQuality: 0.6 }
        : { cls: "MISSING", credit: 0, reason: `Your resume says ${p.location}.`, ...none };
    }
    default:
      return classifySkill(req, p);
  }
}

function classify(req: MatchRequirement, p: MatchProfile): MatchItem {
  const base = classifyBase(req, p);
  const common = { requirementId: req.id, text: req.text, priority: req.priority, kind: req.kind, hard: req.hard, override: req.override ?? null };
  switch (req.override) {
    case "REJECT":
      return { ...common, cls: "MISSING", credit: 0, reason: "You said you don't have this.", evidenceQuality: 0, learning: false };
    case "LEARNING":
      return { ...common, cls: "PARTIAL", credit: learningCredit(req.skillTerm ?? req.text, p.ratings), reason: "You're learning this. It counts fully once you can show it in your work.", evidenceQuality: 0.3, learning: true };
    case "CONFIRM":
      if (base.cls === "STRONG") return { ...common, ...base, reason: "You confirmed this.", learning: false };
      return { ...common, cls: "PARTIAL", credit: 0.5, reason: "You said you have this. Add evidence so it counts fully.", evidence: base.evidence, evidenceQuality: 0.3, learning: false };
    default:
      // ADD_EVIDENCE works through the saved fact, which classifySkill finds on its own.
      return { ...common, ...base, learning: false };
  }
}

function coverage(items: MatchItem[]): number | null {
  const r = items.filter((i) => i.cls !== "UNKNOWN");
  return r.length ? r.reduce((s, i) => s + i.credit, 0) / r.length : null;
}

/** Keyword ladder (05 §4.4), simplified: level of a title, or undefined when it doesn't say. */
export function seniorityLevel(title: string): number | undefined {
  const t = title.toLowerCase();
  if (/\b(intern|internee|trainee|apprentice)\b/.test(t)) return 0;
  if (/\b(junior|jr\.?|associate|graduate|entry)\b/.test(t)) return 1;
  if (/\b(chief|cto|ceo|cfo|svp|evp|country head|partner)\b/.test(t)) return 6;
  if (/\b(head|director|vp|general manager|senior manager)\b/.test(t)) return 5;
  if (/\b(lead|principal|staff|manager|avp)\b/.test(t)) return 4;
  if (/\b(senior|sr\.?)\b/.test(t)) return 3;
  return undefined;
}

const STOP = new Set(["senior", "junior", "lead", "the", "and", "for", "of", "with", "ii", "iii", "sr", "jr", "intern", "trainee", "associate", "principal", "staff"]);
const titleWords = (t: string) => t.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1 && !STOP.has(w));

/** Occupation families (a small stand-in for the ESCO/O*NET map in 05 §5.3). "Developer" and "Engineer" alone don't decide it. */
const FAMILIES: RegExp[] = [
  /\b(software|developer|programmer|front.?end|back.?end|full.?stack|web|devops|sde|mobile|android|ios)\b/i,
  /\b(data|machine learning|ml|ai|bi|analytics|scientist)\b/i,
  /\b(marketing|seo|sem|digital|content|social media|growth|brand)\b/i,
  /\b(accountant|accounts|accounting|finance|financial|audit|auditor|banking|treasury|tax)\b/i,
  /\b(sales|business development|account executive|bde)\b/i,
  /\b(hr|human resources?|recruiter|recruitment|talent|people)\b/i,
  /\b(support|customer|helpdesk|help desk|service desk|call cent(?:er|re))\b/i,
  /\b(designer|ux|ui|graphic|creative)\b/i,
];

/** T = 0.6 × title family + 0.4 × seniority fit. Same family 1, some shared words 0.6, unrelated 0.2. */
export function titleFit(jobTitle: string, titles: string[], targets: string[]): number {
  const want = titleWords(jobTitle);
  const overlap = (other: string) => {
    const words = new Set(titleWords(other));
    return want.length ? want.filter((w) => words.has(w)).length / want.length : 0;
  };
  const others = [...titles, ...targets];
  const best = Math.max(0, ...others.map(overlap));
  const sameFamily = FAMILIES.some((f) => f.test(jobTitle) && others.some((o) => f.test(o)));
  const family = sameFamily || best >= 0.6 ? 1 : best > 0 ? 0.6 : 0.2;

  const jobLevel = seniorityLevel(jobTitle);
  const mine = titles.map((t) => seniorityLevel(t) ?? 2);
  const myLevel = mine.length ? Math.max(...mine) : undefined;
  const diff = jobLevel === undefined || myLevel === undefined ? 0 : Math.abs(jobLevel - myLevel);
  const seniority = diff === 0 ? 1 : diff === 1 ? 0.7 : 0.3;
  return 0.6 * family + 0.4 * seniority;
}

const THRESHOLD_KINDS: ReqKind[] = ["YEARS", "EDUCATION", "LOCATION", "WORK_AUTH", "LANGUAGE"];
const pct = (v: number) => Math.round(v * 100);

export function computeMatch(jobTitle: string, reqs: MatchRequirement[], profile: MatchProfile): MatchResult {
  const items = reqs.map((r) => classify(r, profile));
  const isThreshold = (i: MatchItem) => THRESHOLD_KINDS.includes(i.kind) || (i.kind === "CERT" && i.hard);
  const skillItems = items.filter((i) => !isThreshold(i));
  const must = skillItems.filter((i) => i.priority === "MUST_HAVE");
  const nice = skillItems.filter((i) => i.priority === "NICE_TO_HAVE");
  const thresholds = items.filter((i) => isThreshold(i) && i.cls !== "UNKNOWN");

  const M = coverage(must) ?? 0;
  const N = coverage(nice) ?? M;
  const T = titleFit(jobTitle, profile.titles, profile.targetTitles);
  const matched = must.filter((i) => i.cls === "STRONG" || i.cls === "PARTIAL");
  const E = matched.length ? matched.reduce((s, i) => s + i.evidenceQuality, 0) / matched.length : 0;
  const H = thresholds.length ? thresholds.reduce((s, i) => s + i.credit, 0) / thresholds.length : 1;

  const factors: Factor[] = [
    { key: "must", label: "Must-have skills", weight: WEIGHTS.must, value: pct(M), explanation: "Share of must-have skills you show. Partial counts about half; unclear ones are left out." },
    { key: "nice", label: "Nice-to-haves", weight: WEIGHTS.nice, value: pct(N), explanation: nice.length ? "Same count for the nice-to-haves." : "None listed, so this repeats the must-have share." },
    { key: "title", label: "Title and seniority", weight: WEIGHTS.title, value: pct(T), explanation: "How closely your past and target titles match this role and level." },
    { key: "evidence", label: "Evidence quality", weight: WEIGHTS.evidence, value: pct(E), explanation: "A work bullet with a number counts 1, without a number 0.6, a skills-list mention 0.3." },
    { key: "thresholds", label: "Years, education, location", weight: WEIGHTS.thresholds, value: pct(H), explanation: thresholds.length ? "Stated minimums you meet." : "None stated, so this counts in full." },
  ];
  const raw = factors.reduce((s, f) => s + (f.weight * f.value) / 100, 0);
  const hardGaps = items.filter((i) => i.hard && i.cls === "MISSING").length;
  const cap = hardGaps >= 2 ? CAP_TWO_GAPS : hardGaps === 1 ? CAP_ONE_GAP : undefined;
  const mustAll = items.filter((i) => i.priority === "MUST_HAVE");
  const unknownShare = mustAll.length ? mustAll.filter((i) => i.cls === "UNKNOWN").length / mustAll.length : 1;
  return {
    score: Math.round(cap !== undefined ? Math.min(raw, cap) : raw),
    raw: Math.round(raw * 10) / 10,
    ...(cap !== undefined && raw > cap ? { cap } : {}),
    factors,
    items,
    lowConfidence: mustAll.length < 2 || unknownShare > 0.4,
    engineVersion: ENGINE_VERSION,
  };
}

/** What the resume and evidence bank can show. Bullets are the strongest source. */
export function buildMatchProfile(
  doc: ResumeDoc,
  extra: {
    now?: Date;
    targetTitles?: string[];
    city?: string | null;
    skills?: { name: string; level: number | null }[];
    facts?: { skillName: string | null; statement: string }[];
    experiences?: { title: string; employer: string; bullets: string[]; endDate: Date | null }[];
    projects?: { name: string; bullets: string[]; skills: string[]; description: string | null }[];
    certifications?: { name: string }[];
  } = {},
): MatchProfile {
  const now = extra.now ?? new Date();
  const nowIdx = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const sevenYearsAgo = nowIdx - 84;
  const sources: EvidenceSource[] = [];

  const ranges: [number, number][] = [];
  for (const w of doc.work) {
    const s = w.dates?.start ? w.dates.start.year * 12 + (w.dates.start.month ?? 6) - 1 : undefined;
    const e = w.dates?.isCurrent ? nowIdx : w.dates?.end ? w.dates.end.year * 12 + (w.dates.end.month ?? 6) - 1 : s;
    if (s !== undefined && e !== undefined) ranges.push([s, Math.max(s, e)]);
    const label = [w.title, w.employer].filter(Boolean).join(", ") || "Experience";
    const stale = e !== undefined && e < sevenYearsAgo;
    for (const b of w.bullets) sources.push({ section: label, text: b.text, kind: "BULLET", stale });
  }
  for (const p of doc.projects) for (const b of p.bullets) sources.push({ section: `Project: ${p.name}`, text: b.text, kind: "BULLET" });
  for (const e of extra.experiences ?? []) {
    const stale = e.endDate ? e.endDate.getUTCFullYear() * 12 + e.endDate.getUTCMonth() < sevenYearsAgo : false;
    for (const b of e.bullets) sources.push({ section: `${e.title}, ${e.employer}`, text: b, kind: "BULLET", stale });
  }
  for (const p of extra.projects ?? []) {
    for (const b of p.bullets) sources.push({ section: `Project: ${p.name}`, text: b, kind: "BULLET" });
    const list = [p.description, p.skills.join(", ")].filter(Boolean).join(" · ");
    if (list) sources.push({ section: `Project: ${p.name}`, text: list, kind: "LIST" });
  }
  if (doc.skills.length) sources.push({ section: "Skills", text: doc.skills.join(", "), kind: "LIST" });
  if (doc.basics.summary) sources.push({ section: "Summary", text: doc.basics.summary, kind: "LIST" });
  if (extra.skills?.length) sources.push({ section: "Profile skills", text: extra.skills.map((s) => s.name).join(", "), kind: "LIST" });
  for (const c of [...doc.certifications, ...(extra.certifications ?? []).map((c) => c.name)]) sources.push({ section: "Certifications", text: c, kind: "CERT" });

  ranges.sort((a, b) => a[0] - b[0]);
  let months = 0;
  let curEnd = -Infinity;
  for (const [s, e] of ranges) {
    months += Math.max(0, e + 1 - Math.max(s, curEnd));
    curEnd = Math.max(curEnd, e + 1);
  }

  return {
    sources,
    months,
    educationLevels: doc.education.map((e) => educationLevel(e.degreeRaw)).filter((l): l is EducationLevel => !!l),
    location: doc.basics.location ?? extra.city ?? undefined,
    languages: doc.languages,
    titles: [...doc.work.map((w) => w.title), ...(extra.experiences ?? []).map((e) => e.title)].filter(Boolean),
    targetTitles: extra.targetTitles ?? [],
    ratings: extra.skills ?? [],
    facts: extra.facts ?? [],
  };
}

/** One-line reading of the result, reproducible from the table on screen. */
export function summaryLine(r: MatchResult): string {
  const must = r.items.filter((i) => i.priority === "MUST_HAVE");
  if (!must.length) return "No must-haves found. Add or edit the requirements to get a useful estimate.";
  const count = (c: MatchClass) => must.filter((i) => i.cls === c).length;
  const parts = [`${count("STRONG")} of ${must.length} must-haves shown`];
  if (count("PARTIAL")) parts.push(`${count("PARTIAL")} partly`);
  if (count("MISSING")) parts.push(`${count("MISSING")} missing`);
  if (count("UNKNOWN")) parts.push(`${count("UNKNOWN")} unclear (not counted)`);
  return `${parts.join(", ")}.`;
}

/** Up to 3 honest next steps (K1, K2, MAT-032). Never "add this keyword". */
export function nextSteps(r: MatchResult): string[] {
  const out: string[] = [];
  for (const i of r.items.filter((x) => x.hard && x.cls === "MISSING")) {
    out.push(`This post lists "${i.text}" as required. If you have it, tell us below. If not, expect to be screened on it.`);
  }
  for (const i of r.items.filter((x) => x.priority === "MUST_HAVE" && x.cls === "PARTIAL" && !x.learning && x.evidenceQuality <= 0.3)) {
    out.push(`"${i.text}" is only listed, not shown. If it's true, add a line about where you used it.`);
  }
  for (const i of r.items.filter((x) => x.priority === "MUST_HAVE" && !x.hard && x.cls === "MISSING")) {
    out.push(`"${i.text}" isn't on your resume. If you've used it, add evidence. If not, decide whether to learn it first or apply anyway.`);
  }
  return out.slice(0, 3);
}

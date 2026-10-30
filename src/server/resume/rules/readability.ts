import { detectDateStyle, monthIndex } from "../dates";
import {
  ACRONYM_PAIRS,
  BUZZWORDS,
  FIRST_PERSON_RE,
  OBJECTIVE_CLICHES,
  SPELLING_PAIRS,
  verbForm,
} from "../lexicon";
import { BULLET_PREFIX_RE } from "../patterns";
import type { Extraction, Finding, ResumeDoc, WorkItem } from "../types";
import { finding, quote, type AnalyzeOpts } from "./shared";

const R = "readability" as const;
const W = { R1: 0.15, R2: 0.2, R3: 0.2, R4: 0.1, R5: 0.15, R6: 0.1, R7: 0.05, R8: 0.05 } as const;

export interface ReadabilityResult {
  score: number;
  parts: Record<string, number>;
  findings: Finding[];
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const allBullets = (doc: ResumeDoc) => [...doc.work.flatMap((w) => w.bullets), ...doc.projects.flatMap((p) => p.bullets)];

function mostRecent(work: WorkItem[]): WorkItem | undefined {
  const rank = (w: WorkItem) => (w.dates?.isCurrent ? Number.MAX_SAFE_INTEGER : (monthIndex(w.dates?.end, 12) ?? monthIndex(w.dates?.start) ?? -1));
  return [...work].sort((a, b) => rank(b) - rank(a))[0];
}

function r1(x: Extraction, doc: ResumeDoc): { sub: number; findings: Finding[] } {
  const p1 = x.lines.filter((l) => l.page === 1 && l.band !== "footer");
  const topHalf = p1.every((l) => l.top !== undefined)
    ? p1.filter((l) => (l.top ?? 0) <= 0.5)
    : p1.slice(0, Math.ceil(p1.length / 2));
  const text = topHalf.map((l) => l.text).join("\n").toLowerCase();
  const has = (s?: string) => !!s && text.includes(s.toLowerCase());
  const recent = mostRecent(doc.work);
  const checks: [string, boolean][] = [
    ["your name", has(doc.basics.name)],
    ["a headline or target title", has(doc.basics.headline)],
  ];
  if (recent) {
    checks.push(["your latest title and employer", has(recent.title) && has(recent.employer)]);
    checks.push(["your latest dates", has(recent.dates?.raw)]);
  }
  const missing = checks.filter(([, ok]) => !ok).map(([n]) => n);
  const sub = (checks.length - missing.length) / checks.length;
  return {
    sub,
    findings: missing.length
      ? [finding(R, "R1", "TIP", "Key facts are not near the top",
          "Put your current title, employer and dates near the top. Recruiters look there first.", [`Not found in the top half of page 1: ${missing.join(", ")}`])]
      : [],
  };
}

function r2r3(doc: ResumeDoc): { r2: number; r3: number; findings: Finding[] } {
  const bullets = allBullets(doc);
  if (bullets.length === 0) return { r2: 0, r3: 0, findings: [] };
  const failing = bullets.filter((b) => !(verbForm(b.text.split(/\s+/)[0] ?? "") !== "none" && b.text.length <= 220));
  const r2 = (bullets.length - failing.length) / bullets.length;
  const share = bullets.filter((b) => b.hasMetric).length / bullets.length;
  const findings: Finding[] = [];
  if (r2 < 0.8) {
    findings.push(finding(R, "R2", "TIP", "Bullets could start stronger",
      "Start bullets with a strong verb and keep them to two lines.", failing.slice(0, 3).map((b) => quote(b.text))));
  }
  if (share < 0.4) {
    findings.push(finding(R, "R3", "TIP", "Few bullets include numbers",
      "Add numbers where you have them (volume, %, time saved). We will ask you; we never invent them.",
      [`${Math.round(share * 100)}% of bullets include a number`]));
  }
  return { r2, r3: Math.min(1, share / 0.4), findings };
}

function experienceYears(doc: ResumeDoc, now: Date): number {
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const spans = doc.work
    .map((w) => {
      const s = monthIndex(w.dates?.start);
      if (s === undefined) return undefined;
      const e = w.dates?.isCurrent ? nowIdx : (monthIndex(w.dates?.end, 12) ?? s);
      return [s, Math.max(s, e)] as const;
    })
    .filter((x): x is readonly [number, number] => x !== undefined)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curEnd = -Infinity;
  for (const [s, e] of spans) {
    total += Math.max(0, e - Math.max(s, curEnd));
    curEnd = Math.max(curEnd, e);
  }
  return total / 12;
}

function r4(x: Extraction, doc: ResumeDoc, opts: AnalyzeOpts): { sub: number; findings: Finding[] } {
  const years = experienceYears(doc, opts.now ?? new Date());
  const limit = opts.targetMarket === "PK_LOCAL" || years >= 10 ? 2 : 1;
  const over = x.pageCount - limit;
  const sub = over <= 0 ? 1 : over === 1 ? 0.5 : 0;
  return {
    sub,
    findings: over > 0
      ? [finding(R, "R4", "TIP", "Longer than usual",
          `Aim for ${limit} page${limit === 1 ? "" : "s"} for your experience level.`, [`${x.pageCount} pages`])]
      : [],
  };
}

function longParagraphs(x: Extraction): number {
  let runs = 0;
  let run = 0;
  const flush = () => { if (run > 5) runs++; run = 0; };
  for (const l of x.lines) {
    const plain = !l.listItem && !BULLET_PREFIX_RE.test(l.text) && l.text.length >= 30 && !l.bold;
    if (plain) run++;
    else flush();
  }
  flush();
  return runs;
}

const DYNAMIC_TECH = /^dynamic\s+(?:programming|routing|pricing|content|memory|allocation|web|dns|dashboards?|forms|analysis|range|systems?)/;

function buzzwordsIn(text: string): string[] {
  const lower = text.toLowerCase();
  return BUZZWORDS.filter((w) => {
    const m = new RegExp(`(?<![\\w-])${esc(w)}(?![\\w-])`).exec(lower);
    return !!m && !(w === "dynamic" && DYNAMIC_TECH.test(lower.slice(m.index)));
  });
}

function r5(x: Extraction, doc: ResumeDoc): { sub: number; findings: Finding[] } {
  const bullets = allBullets(doc);
  const pronounHits = bullets.filter((b) => FIRST_PERSON_RE.test(b.text));
  const summary = doc.basics.summary ?? "";
  const summaryPronoun = FIRST_PERSON_RE.test(summary);
  const text = [summary, ...bullets.map((b) => b.text)].join("\n");
  const buzz = [...new Set(buzzwordsIn(text))];
  const paras = longParagraphs(x);
  const fp = pronounHits.length + (summaryPronoun ? 1 : 0);
  const sub = 1 - Math.min(1, paras * 0.2 + fp * 0.05 + buzz.length * 0.1);

  const findings: Finding[] = [];
  for (const w of buzz.slice(0, 3)) {
    const src = [summary, ...bullets.map((b) => b.text)].find((t) => t.toLowerCase().includes(w));
    findings.push(finding(R, "R5", "TIP", `Vague phrase: ${w}`, `Replace '${w}' with a specific example.`, src ? [quote(src)] : undefined));
  }
  if (fp > 0) {
    findings.push(finding(R, "R5", "TIP", "First-person wording",
      "Drop 'I' and 'my': start each bullet with what you did and the result.",
      [...pronounHits.map((b) => b.text), ...(summaryPronoun ? [summary] : [])].slice(0, 3).map((t) => quote(t))));
  }
  if (paras > 0) {
    findings.push(finding(R, "R5", "TIP", "Dense paragraph",
      "Break long paragraphs into short bullets: each one starts with a verb and states a result."));
  }
  return { sub, findings };
}

function r6(doc: ResumeDoc): { sub: number; findings: Finding[] } {
  const notes: string[] = [];
  const pastRoles = doc.work.filter((w) => !w.dates?.isCurrent);
  const badTense = pastRoles.some((w) => {
    const forms = w.bullets.map((b) => verbForm(b.text.split(/\s+/)[0] ?? "")).filter((f) => f !== "none");
    const present = forms.filter((f) => f === "present").length;
    return present >= 1 && present / forms.length >= 0.3;
  });
  if (badTense) notes.push("Past roles use present-tense verbs");

  const text = [doc.basics.summary ?? "", ...allBullets(doc).map((b) => b.text), ...doc.skills, ...doc.certifications].join("\n");
  const us = SPELLING_PAIRS.map((p) => p.usRe.exec(text)?.[0]).filter((s): s is string => !!s);
  const uk = SPELLING_PAIRS.map((p) => p.ukRe.exec(text)?.[0]).filter((s): s is string => !!s);
  const badSpelling = us.length > 0 && uk.length > 0;
  if (badSpelling) notes.push(`Mixed US and UK spelling: '${us[0]}' and '${uk[0]}'`);

  const styles = new Set(doc.work.flatMap((w) => (w.dates ? [detectDateStyle(w.dates)] : [])));
  const badDates = styles.size > 1;
  if (badDates) notes.push("More than one date style");

  const count = [badTense, badSpelling, badDates].filter(Boolean).length;
  return {
    sub: Math.max(0, 1 - 0.34 * count),
    findings: count
      ? [finding(R, "R6", "TIP", "Inconsistent style", "Use past tense for past roles and one spelling style (UK or US).", notes)]
      : [],
  };
}

function r7(x: Extraction): { sub: number; findings: Finding[] } {
  const text = x.lines.map((l) => l.text).join("\n").replace(/(\w)isation/gi, "$1ization");
  let detected = 0;
  let both = 0;
  const findings: Finding[] = [];
  for (const { acronym, full } of ACRONYM_PAIRS) {
    const hasAcr = new RegExp(`\\b${acronym}s?\\b`).test(text);
    const hasFull = new RegExp(esc(full).replace(/[\s]+/g, "\\s+"), "i").test(text);
    if (!hasAcr && !hasFull) continue;
    detected++;
    if (hasAcr && hasFull) both++;
    else if (findings.length < 3) {
      findings.push(finding(R, "R7", "TIP", `Spell out ${acronym} once`,
        `Write '${full} (${acronym})' once so both forms are searchable.`));
    }
  }
  return { sub: detected === 0 ? 1 : both / detected, findings };
}

function r8(doc: ResumeDoc): { sub: number; findings: Finding[] } {
  const fix = "A short 2–3 line summary with your target title works best.";
  const summary = doc.basics.summary;
  if (!summary) return { sub: 0.3, findings: [finding(R, "R8", "TIP", "No summary", fix)] };
  const lines = doc.sections.find((s) => s.kind === "summary")?.lineCount ?? 1;
  const cliche = OBJECTIVE_CLICHES.some((re) => re.test(summary));
  const long = lines > 4;
  if (!cliche && !long) return { sub: 1, findings: [] };
  return {
    sub: 0.5,
    findings: [finding(R, "R8", "TIP", cliche ? "Objective-style summary" : "Summary is long", fix, cliche ? [quote(summary)] : undefined)],
  };
}

export function readability(x: Extraction, doc: ResumeDoc, opts: AnalyzeOpts): ReadabilityResult {
  const a1 = r1(x, doc);
  const a23 = r2r3(doc);
  const a4 = r4(x, doc, opts);
  const a5 = r5(x, doc);
  const a6 = r6(doc);
  const a7 = r7(x);
  const a8 = r8(doc);
  const subs = { R1: a1.sub, R2: a23.r2, R3: a23.r3, R4: a4.sub, R5: a5.sub, R6: a6.sub, R7: a7.sub, R8: a8.sub };
  const score = Math.round(100 * (Object.keys(W) as (keyof typeof W)[]).reduce((a, k) => a + W[k] * subs[k], 0));
  const parts = Object.fromEntries(Object.entries(subs).map(([k, v]) => [k, Math.round(v * 100) / 100]));
  return { score, parts, findings: [...a1.findings, ...a23.findings, ...a4.findings, ...a5.findings, ...a6.findings, ...a7.findings, ...a8.findings] };
}

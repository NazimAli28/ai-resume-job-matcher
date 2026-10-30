import { findDateRange, type FoundRange } from "./dates";
import { COMPANY_RE, INSTITUTION_RE, JOB_TITLE_RE, educationLevel } from "./lexicon";
import { isLocationSegment } from "./contact";
import { stableId } from "./ids";
import { BULLET_PREFIX_RE, hasMetric, squash } from "./patterns";
import type { Bullet, EducationItem, Line, ResumeDoc, WorkItem } from "./types";

export interface Entry {
  text: string;
  bullet: boolean;
}

/** Lines -> entries: strip bullet glyphs and join wrapped continuation lines onto the previous entry. */
export function toEntries(lines: Line[]): Entry[] {
  const out: Entry[] = [];
  for (const l of lines) {
    const raw = l.text.trim();
    if (!raw) continue;
    const glyph = BULLET_PREFIX_RE.test(raw);
    const text = squash(raw.replace(BULLET_PREFIX_RE, ""));
    if (!text) continue;
    const bullet = glyph || l.listItem === true;
    const prev = out[out.length - 1];
    if (!bullet && prev && /^[a-z(]/.test(text) && (prev.bullet || prev.text.length > 60) && !findDateRange(text)) {
      prev.text = `${prev.text} ${text}`;
      continue;
    }
    out.push({ text, bullet });
  }
  return out;
}

const makeBullet = (scope: string, i: number, text: string): Bullet => ({
  id: stableId("b", `${scope}:${i}:${text}`),
  text,
  hasMetric: hasMetric(text),
});

const headerLike = (t: string) => t.length <= 90 && t.split(" ").length <= 12 && !/[.!?]$/.test(t) && !findDateRange(t);

function removeRange(text: string, f: FoundRange): string {
  return squash(`${text.slice(0, f.index)} ${text.slice(f.index + f.length)}`)
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .replace(/^[\s|,;:–—-]+|[\s|,;:–—(-]+$/g, "")
    .trim();
}

const STRONG_SEP = /\s+[|—–]\s+|\s+-\s+|\s+(?:at|@)\s+|\s*\|\s*|\s{2,}|\t/i;

function splitSegments(text: string): string[] {
  let parts = text.split(STRONG_SEP).map(squash).filter(Boolean);
  if (parts.length === 1 && parts[0]?.includes(",")) parts = parts[0].split(/\s*,\s*/).filter(Boolean);
  return parts;
}

function parseHeader(texts: string[]): { title: string; employer: string; location?: string } {
  const segs: string[] = [];
  const locs: string[] = [];
  for (const t of texts) {
    for (let s of splitSegments(t)) {
      const paren = /\(([^)]+)\)\s*$/.exec(s);
      if (paren?.[1] && isLocationSegment(paren[1])) {
        locs.push(paren[1].trim());
        s = s.slice(0, paren.index).trim();
      }
      s = s.replace(/^\(|\)$/g, "").trim();
      if (!s) continue;
      (isLocationSegment(s) ? locs : segs).push(s);
    }
  }
  let title = "";
  let employer = "";
  if (segs.length === 1 && segs[0]) {
    if (JOB_TITLE_RE.test(segs[0]) || !COMPANY_RE.test(segs[0])) title = segs[0];
    else employer = segs[0];
  } else if (segs.length > 1) {
    let ti = segs.findIndex((s) => JOB_TITLE_RE.test(s));
    if (ti < 0) ti = COMPANY_RE.test(segs[0] ?? "") && !COMPANY_RE.test(segs[1] ?? "") ? 1 : 0;
    title = segs[ti] ?? "";
    employer = segs.find((_, i) => i !== ti) ?? "";
  }
  const location = [...new Set(locs)].join(", ");
  return { title, employer, ...(location ? { location } : {}) };
}

export function parseWork(lines: Line[]): WorkItem[] {
  const entries = toEntries(lines);
  const dated: { i: number; found: FoundRange }[] = [];
  entries.forEach((e, i) => {
    const found = e.bullet ? undefined : findDateRange(e.text);
    if (found) dated.push({ i, found });
  });

  interface Span { start: number; end: number; header: string[]; found: FoundRange }
  const spans: Span[] = [];
  let usedUntil = -1;
  for (const { i, found } of dated) {
    const entry = entries[i];
    if (!entry) continue;
    const rem = removeRange(entry.text, found);
    const multi = splitSegments(rem).length >= 2;
    const before: string[] = [];
    for (let j = i - 1; j > usedUntil && !multi && before.length < 2; j--) {
      const e = entries[j];
      if (!e || e.bullet || !headerLike(e.text)) break;
      before.unshift(e.text);
    }
    const after: string[] = [];
    if (before.length === 0 && !multi) {
      const limit = rem ? 1 : 2;
      for (let j = i + 1; j < entries.length && after.length < limit; j++) {
        const e = entries[j];
        if (!e || e.bullet || !headerLike(e.text)) break;
        if (rem && !JOB_TITLE_RE.test(e.text) && !COMPANY_RE.test(e.text)) break;
        after.push(e.text);
      }
    }
    spans.push({ start: i - before.length, end: i + after.length, header: [...before, ...(rem ? [rem] : []), ...after], found });
    usedUntil = i + after.length;
  }

  return spans.map((sp, k) => {
    const next = spans[k + 1];
    const body = entries.slice(sp.end + 1, next ? next.start : entries.length);
    const h = parseHeader(sp.header);
    const key = `${k}:${h.title}|${h.employer}`;
    return {
      id: stableId("w", key),
      title: h.title,
      employer: h.employer,
      ...(h.location ? { location: h.location } : {}),
      dates: sp.found.range,
      bullets: body.map((b, bi) => makeBullet(key, bi, b.text)),
    };
  });
}

const GRADE_RES = [
  /\b(?:cgpa|gpa|percentage|aggregate|marks)\s*[:\-]?\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?|\s*%)?/i,
  /\b\d{2,3}(?:\.\d+)?\s*%/,
  /\b[0-4]\.\d{1,2}\s*\/\s*4(?:\.0+)?\b/,
  /\b(?:1st|first|2nd|second|3rd|third)\s+division\b/i,
  /\bgrade\s*:?\s*[A-D][+-]?(?![a-z])/i,
];

function extractGrade(text: string): { grade?: string; rest: string } {
  for (const re of GRADE_RES) {
    const m = re.exec(text);
    if (m) return { grade: squash(m[0]), rest: squash(`${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`) };
  }
  return { rest: text };
}

export function parseEducation(lines: Line[]): EducationItem[] {
  interface Draft { degreeRaw: string; institution: string; dates?: EducationItem["dates"]; grade?: string }
  const items: EducationItem[] = [];
  let cur: Draft | undefined;
  const flush = () => {
    if (cur && (cur.degreeRaw || cur.institution)) {
      const idx = items.length;
      items.push({
        id: stableId("e", `${idx}:${cur.degreeRaw}|${cur.institution}`),
        institution: cur.institution,
        degreeRaw: cur.degreeRaw,
        ...(cur.dates ? { dates: cur.dates } : {}),
        ...(cur.grade ? { grade: cur.grade } : {}),
      });
    }
    cur = undefined;
  };

  for (const e of toEntries(lines)) {
    const g = extractGrade(e.text);
    const dr = findDateRange(g.rest, { allowSingle: true });
    const rest = dr ? removeRange(g.rest, dr) : g.rest;
    const parts = rest
      ? rest.split(/\s+[|—–]\s+|\s+-\s+|\s*\|\s*|\s{2,}|\s+(?:from|at)\s+|\s*,\s*/i).map(squash).filter(Boolean)
      : [];
    const hasDegree = parts.some((p) => educationLevel(p));
    const hasInst = parts.some((p) => !educationLevel(p) && INSTITUTION_RE.test(p));
    if (
      cur &&
      ((hasDegree && cur.degreeRaw) || (hasInst && cur.institution && cur.degreeRaw) || (dr && cur.dates && !hasDegree && !hasInst && cur.degreeRaw && cur.institution))
    ) {
      flush();
    }
    cur ??= { degreeRaw: "", institution: "" };
    for (const p of parts) {
      if (isLocationSegment(p)) continue;
      if (educationLevel(p) && !cur.degreeRaw) cur.degreeRaw = p;
      else if (INSTITUTION_RE.test(p) && !cur.institution) cur.institution = p;
      else if (!cur.degreeRaw && !educationLevel(p) && !cur.institution && parts.length === 1) cur.degreeRaw = p;
      else if (!cur.institution && cur.degreeRaw && !educationLevel(p)) cur.institution = p;
    }
    if (dr && !cur.dates) cur.dates = dr.range;
    if (g.grade && !cur.grade) cur.grade = g.grade;
  }
  flush();
  return items;
}

/** Split on , | • ; and " / " outside parentheses so "AWS (EC2, S3)" and "CI/CD" stay whole. */
export function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i] as string;
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth = Math.max(0, depth - 1);
    const slash = depth === 0 && text.startsWith(" / ", i);
    if (depth === 0 && (/[,|•;·●▪◦\n]/.test(c) || slash)) {
      out.push(buf);
      buf = "";
      if (slash) i += 2;
      continue;
    }
    buf += c;
  }
  out.push(buf);
  return out.map((s) => squash(s.replace(BULLET_PREFIX_RE, "")).replace(/\.$/, "")).filter(Boolean);
}

function dedupe(list: string[], maxLen: number, maxWords: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    const key = s.toLowerCase();
    if (seen.has(key) || s.length > maxLen || s.split(" ").length > maxWords) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

const LABEL_RE = /^[A-Za-z][A-Za-z &/+#.]{1,30}?\s*:\s*(?=\S)/;

export function parseSkills(lines: Line[]): string[] {
  const parts = lines.flatMap((l) => {
    const t = l.text.replace(BULLET_PREFIX_RE, "");
    const m = LABEL_RE.exec(t);
    return splitTopLevel(m && m[0].split(" ").length <= 5 ? t.slice(m[0].length) : t);
  });
  return dedupe(parts, 50, 8);
}

export function parseLanguages(lines: Line[]): string[] {
  const parts = lines.flatMap((l) => {
    const t = l.text.replace(BULLET_PREFIX_RE, "").replace(/^languages?\s*:\s*/i, "");
    return splitTopLevel(t);
  });
  return dedupe(parts, 60, 8);
}

export function parseCertifications(lines: Line[]): string[] {
  return dedupe(
    toEntries(lines).map((e) => e.text),
    200,
    30,
  );
}

export function parseProjects(lines: Line[]): ResumeDoc["projects"] {
  const projects: { name: string; texts: string[] }[] = [];
  for (const e of toEntries(lines)) {
    const cur = projects[projects.length - 1];
    const nameLike = !e.bullet && e.text.split(" ").length <= 12 && !/[.!?]$/.test(e.text);
    if (nameLike) {
      const name = squash(e.text.split(/\s+[|—–]\s+|\s+-\s+|\s*\|\s*|:\s/)[0] ?? e.text);
      projects.push({ name, texts: [] });
    } else if (cur) {
      cur.texts.push(e.text);
    }
  }
  return projects.map((p, i) => ({
    id: stableId("p", `${i}:${p.name}`),
    name: p.name,
    bullets: p.texts.map((t, bi) => makeBullet(`p${i}`, bi, t)),
  }));
}

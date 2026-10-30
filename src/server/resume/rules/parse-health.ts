import { detectName, findEmails, findPhones } from "../contact";
import { detectDateStyle, findDateRange, monthIndex } from "../dates";
import { lookupHeading } from "../lexicon";
import { BULLET_PREFIX_RE } from "../patterns";
import type { Extraction, Finding, Line, ResumeDoc, SectionKind } from "../types";
import { finding, quote, type AnalyzeOpts } from "./shared";

const P = "parse" as const;
const MB = 1024 * 1024;
const STD_NAME: Partial<Record<SectionKind, string>> = {
  experience: "Experience", education: "Education", skills: "Skills", summary: "Summary", projects: "Projects",
  certifications: "Certifications", languages: "Languages", references: "References",
};

function checkImageOnly(x: Extraction): Finding[] {
  const first = x.charsPerPage[0];
  const mean = x.charsPerPage.length ? x.charsPerPage.reduce((a, b) => a + b, 0) / x.charsPerPage.length : 0;
  // A short last page is normal; image-only means page 1 or the whole file has almost no text.
  if (first !== undefined && first >= 200 && mean >= 200) return [];
  return [
    finding(P, "P1", "ERR", "Your file looks like an image",
      "Your file is an image, so most systems read no text. Export it as a text PDF or DOCX from Word/Google Docs, or download our version."),
  ];
}

function checkContactInBody(x: Extraction): Finding[] {
  const text = (ls: Line[]) => ls.map((l) => l.text);
  const body = x.lines.filter((l) => l.band === "body");
  const edge = x.lines.filter((l) => l.band !== "body");
  const bodyText = text(body).join("\n");
  const edgeText = `${text(edge).join("\n")}\n${x.features.headerFooterText}`;
  const inBody = {
    name: detectName(text(body.filter((l) => l.page === 1).slice(0, 8))) !== undefined,
    email: findEmails(bodyText).length > 0,
    phone: findPhones(bodyText).length > 0,
  };
  const inEdge = {
    name: detectName(text(edge)) !== undefined,
    email: findEmails(edgeText).length > 0,
    phone: findPhones(edgeText).length > 0,
  };
  const missing = (["name", "email", "phone"] as const).filter((k) => !inBody[k]);
  const stranded = missing.filter((k) => inEdge[k]);
  if (stranded.length === 0 && (inBody.email || inBody.phone)) return [];
  return [
    finding(P, "P2", "ERR", "Contact details outside the main body",
      "Move your name, email and phone into the main body at the top. Some systems skip headers and footers.",
      [`Not found in the main body: ${missing.join(", ")}`]),
  ];
}

function checkTables(x: Extraction): Finding[] {
  const bodyChars = x.lines.reduce((a, l) => a + l.text.length, 0) || 1;
  const share = (pick: (l: Line) => boolean | undefined) =>
    x.lines.filter(pick).reduce((a, l) => a + l.text.length, 0) / bodyChars;
  const tables = Math.max(x.features.tableTextShare, share((l) => l.inTable));
  const boxes = Math.max(x.features.textboxTextShare, share((l) => l.inTextbox));
  const holdsContent = x.lines.some(
    (l) =>
      (l.inTable || l.inTextbox) &&
      (findDateRange(l.text) !== undefined || BULLET_PREFIX_RE.test(l.text) || ["experience", "skills"].includes(lookupHeading(l.text) ?? "")),
  );
  if (tables <= 0.2 && boxes <= 0.2 && !holdsContent) return [];
  return [
    finding(P, "P3", "WARN", "Text inside tables or text boxes",
      "Content inside tables or text boxes can be dropped or detached. Use plain paragraphs and bullets."),
  ];
}

/** Two clusters of line start positions with a wide gap and overlapping vertical ranges. */
function hasColumns(lines: Line[]): boolean {
  const pages = new Set(lines.map((l) => l.page));
  for (const page of pages) {
    const pl = lines.filter((l) => l.page === page && l.left !== undefined && l.top !== undefined && l.text.length > 3);
    if (pl.length < 6) continue;
    const sorted = [...pl].sort((a, b) => (a.left ?? 0) - (b.left ?? 0));
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (!a || !b || (b.left ?? 0) - (a.left ?? 0) <= 0.15) continue;
      const left = sorted.slice(0, i + 1);
      const right = sorted.slice(i + 1);
      if (left.length < pl.length * 0.2 || right.length < pl.length * 0.2) continue;
      const range = (ls: Line[]) => [Math.min(...ls.map((l) => l.top ?? 0)), Math.max(...ls.map((l) => l.top ?? 0))] as const;
      const [l0, l1] = range(left);
      const [r0, r1] = range(right);
      if (Math.max(l0, r0) < Math.min(l1, r1)) return true;
    }
  }
  return false;
}

function checkColumns(x: Extraction): Finding[] {
  if (x.features.columnPages.length === 0 && !hasColumns(x.lines)) return [];
  return [
    finding(P, "P4", "WARN", "Two-column layout",
      "Two-column layouts can be read in the wrong order. A single column is safest."),
  ];
}

function checkHeadings(doc: ResumeDoc): Finding[] {
  const out: Finding[] = [];
  for (const s of doc.sections) {
    if (s.standardHeading || s.kind === "other" || s.kind === "contact") continue;
    const std = STD_NAME[s.kind] ?? "Experience";
    out.push(
      finding(P, "P5", "WARN", `Non-standard heading: ${s.heading}`,
        `Rename '${s.heading}' to a standard heading like '${std}' so systems recognize the section.`, [s.heading]),
    );
  }
  const has = (k: SectionKind) => doc.sections.some((s) => s.kind === k);
  const student = doc.work.length === 0 && doc.education.length > 0;
  const required: [SectionKind, boolean][] = [["experience", !student], ["education", true], ["skills", true]];
  for (const [kind, needed] of required) {
    if (needed && !has(kind)) {
      const std = STD_NAME[kind] ?? kind;
      out.push(finding(P, "P5", "WARN", `No '${std}' section found`,
        `Add a standard '${std}' heading so systems recognize the section.`));
    }
  }
  return out;
}

function checkTextQuality(x: Extraction): Finding[] {
  const all = x.lines.map((l) => l.text).join("\n");
  const bad =
    x.features.garbledCount > 0 ||
    /�/.test(all) ||
    /[-]/.test(all) ||
    /(?:\b\w\s){5,}/.test(all) ||
    /[ﬁﬂ]/.test(all);
  return bad
    ? [finding(P, "P6", "WARN", "Some text looks garbled", "Some text extracts as garbled characters. Use a common font and re-export.")]
    : [];
}

function checkFile(x: Extraction, opts: AnalyzeOpts): Finding[] {
  const hard = opts.fileBytes > 5 * MB || x.pageCount > 6;
  const soft = opts.fileBytes > 2.5 * MB;
  if (!hard && !soft) return [];
  return [
    finding(P, "P7", hard ? "ERR" : "WARN", hard ? "File is over the limits" : "Large file",
      "Upload a text PDF or DOCX without a password. Files over 2.5 MB may be slow to read; the limit is 5 MB and 6 pages."),
  ];
}

function checkWork(doc: ResumeDoc): Finding[] {
  const out: Finding[] = [];
  const msg = (title: string, what: string) =>
    `Role '${title}' is missing ${what}. Use one date style, e.g. 'Mar 2022 – Present'.`;
  for (const w of doc.work) {
    const missing = [!w.title && "a title", !w.employer && "an employer", !w.dates?.start && "a start date"].filter(Boolean) as string[];
    if (missing.length) {
      out.push(finding(P, "P8", "WARN", "Role is missing details", msg(w.title || w.employer || "Untitled role", missing.join(" and ")),
        [quote(`${w.title} ${w.employer}`.trim() || "(blank)")]));
    }
    const s = monthIndex(w.dates?.start);
    const e = w.dates?.isCurrent ? undefined : monthIndex(w.dates?.end, 12);
    if (s !== undefined && e !== undefined && e < s) {
      out.push(finding(P, "P8", "WARN", "End date is before start date",
        `Role '${w.title || w.employer}' ends before it starts. Check the dates. Use one date style, e.g. 'Mar 2022 – Present'.`,
        [w.dates?.raw ?? ""]));
    }
  }
  const styles = new Set(doc.work.flatMap((w) => (w.dates ? [detectDateStyle(w.dates)] : [])));
  if (styles.size > 1) {
    out.push(finding(P, "P8", "WARN", "Mixed date styles",
      "Your roles use different date formats. Use one date style, e.g. 'Mar 2022 – Present'.", [...styles]));
  }
  return out;
}

function checkIcons(x: Extraction): Finding[] {
  const bars = x.lines.filter((l) => /[●○◉◯★☆■□▰▱]{3,}/.test(l.text));
  if (x.features.images === 0 && bars.length === 0) return [];
  return [
    finding(P, "P9", "WARN", "Icons, images or rating bars",
      "Information shown as icons or rating bars is invisible to parsers. Write it as text, e.g. 'Python (advanced)'.",
      bars.slice(0, 3).map((l) => quote(l.text))),
  ];
}

function checkBulletGlyphs(x: Extraction): Finding[] {
  const odd = x.lines.filter((l) => /^\s*[*●■□·▸►➢➤✓✔❖◆◇★☆→»✦❯>]\s?\S/.test(l.text) && !/^\s*[●○◉◯★☆■□▰▱]{3,}/.test(l.text));
  if (odd.length === 0) return [];
  return [finding(P, "P10", "TIP", "Unusual bullet symbols", "Use standard round bullets or hyphens.", odd.slice(0, 2).map((l) => quote(l.text, 50)))];
}

function checkHidden(x: Extraction): Finding[] {
  if (x.features.hiddenText.length === 0) return [];
  return [
    finding(P, "P12", "WARN", "Hidden text found",
      "We found hidden text. Recruiters see it when the file is opened, and it can look like keyword stuffing. Remove it.",
      x.features.hiddenText.slice(0, 3).map((t) => quote(t, 60))),
  ];
}

// P11 (layout divergence) needs the AI pass and the skill-bar geometry part of P9 needs PDF shapes: both skipped.
export function parseHealthFindings(x: Extraction, doc: ResumeDoc, opts: AnalyzeOpts): Finding[] {
  return [
    ...checkImageOnly(x),
    ...checkContactInBody(x),
    ...checkTables(x),
    ...checkColumns(x),
    ...checkHeadings(doc),
    ...checkTextQuality(x),
    ...checkFile(x, opts),
    ...checkWork(doc),
    ...checkIcons(x),
    ...checkBulletGlyphs(x),
    ...checkHidden(x),
  ];
}

const DEDUCT = { ERR: 30, WARN: 10, TIP: 2 } as const;

/** One deduction per rule; P8 counts per role, capped at 2. P1 caps at 10; an ERR on P7 means "could not open". */
export function computeParseHealth(findings: Finding[]): number {
  const byRule = new Map<string, Finding[]>();
  for (const f of findings.filter((f) => f.category === "parse")) byRule.set(f.ruleId, [...(byRule.get(f.ruleId) ?? []), f]);
  let s = 100;
  for (const [rule, fs] of byRule) {
    const worst = fs.reduce((a, b) => (DEDUCT[b.severity] > DEDUCT[a.severity] ? b : a));
    s -= DEDUCT[worst.severity] * (rule === "P8" ? Math.min(2, fs.length) : 1);
  }
  if (byRule.has("P1")) s = Math.min(s, 10);
  if (byRule.get("P7")?.some((f) => f.severity === "ERR")) s = 0;
  return Math.max(0, Math.min(100, Math.round(s)));
}

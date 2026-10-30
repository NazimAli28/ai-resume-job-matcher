import { looksLikeName, parseContact } from "./contact";
import { findDateRange } from "./dates";
import { educationLevel, lookupHeading } from "./lexicon";
import { parseCertifications, parseEducation, parseLanguages, parseProjects, parseSkills, parseWork } from "./items";
import { BULLET_PREFIX_RE, squash } from "./patterns";
import type { Extraction, Line, ResumeDoc, Section, SectionKind } from "./types";

const ITEM_SECTIONS = new Set<SectionKind>(["experience", "education", "projects"]);
const LIST_SECTIONS = new Set<SectionKind>(["skills", "languages", "certifications", "references", "personal"]);
const INLINE_LABEL_RE = /^([A-Za-z &/]{3,35}?)\s*[:：]\s+(\S.*)$/;

/** Lines the structure pass works on: no footers, no repeated running headers after page 1. */
export function usableLines(extraction: Extraction): Line[] {
  return extraction.lines
    .filter((l) => l.text.trim() && l.band !== "footer" && !(l.band === "header" && l.page > 1))
    .map((l) => ({ ...l, text: l.text.trim() }));
}

interface HeadingHit {
  kind: SectionKind;
  heading: string;
  standardHeading: boolean;
  remainder?: string;
}

function coreOf(text: string): string {
  return text.replace(/^[\s_\-–—=*#•|]+|[\s_\-–—=*#|]+$/g, "").replace(/[:：]\s*$/, "").trim();
}

export function sectionKindFromContent(lines: Line[]): SectionKind {
  let dated = 0;
  let bullets = 0;
  let edu = 0;
  let listy = 0;
  for (const l of lines) {
    if (BULLET_PREFIX_RE.test(l.text) || l.listItem) bullets++;
    else if (findDateRange(l.text)) dated++;
    if (educationLevel(l.text)) edu++;
    if (/[,|•;]/.test(l.text) && !findDateRange(l.text)) listy++;
  }
  if (edu >= 1 && dated + (lines.some((l) => findDateRange(l.text, { allowSingle: true })) ? 1 : 0) >= 1 && bullets === 0) return "education";
  if (dated >= 2 || (dated >= 1 && bullets >= 2)) return "experience";
  if (lines.length > 0 && listy / lines.length >= 0.6) return "skills";
  return "other";
}

/** Split the extraction into sections (contact block first). Content-recognized sections keep standardHeading=false. */
export function splitSections(extraction: Extraction): Section[] {
  const lines = usableLines(extraction);
  const hasBoldInfo = lines.some((l) => l.bold === true);

  const dictIdx = lines.findIndex((l) => lookupHeading(coreOf(l.text)) !== undefined);
  const nameIdx = lines.slice(0, dictIdx < 0 ? lines.length : dictIdx).findIndex((l) => looksLikeName(l.text));

  const dateAhead = (idx: number, n: number) =>
    lines.slice(idx + 1, idx + 1 + n).some((l) => !BULLET_PREFIX_RE.test(l.text) && findDateRange(l.text));

  const detect = (l: Line, idx: number, current: SectionKind | undefined): HeadingHit | undefined => {
    if (BULLET_PREFIX_RE.test(l.text) || l.listItem || idx === nameIdx) return undefined;
    const core = coreOf(l.text);
    if (core.length < 3) return undefined;
    const inline = INLINE_LABEL_RE.exec(core);
    if (inline?.[1] && inline[2] && inline[1].split(" ").length <= 4) {
      const kind = lookupHeading(inline[1]);
      if (kind) return { kind, heading: inline[1].trim(), standardHeading: true, remainder: inline[2] };
    }
    if (core.length > 40 || core.split(" ").length > 5) return undefined;
    const kind = lookupHeading(core);
    if (kind) return { kind, heading: core, standardHeading: true };

    if (/[@\d]/.test(core) || /[.!?]$/.test(core) || !/\p{L}{3}/u.test(core)) return undefined;
    const isCaps = core === core.toUpperCase() && /[A-Z]{3}/.test(core);
    const isBold = hasBoldInfo && l.bold === true;
    if (!isCaps && !isBold) return undefined;
    const accept =
      current === undefined
        ? dateAhead(idx, 4) && idx !== nameIdx + 1
        : ITEM_SECTIONS.has(current)
          ? !dateAhead(idx, 2)
          : LIST_SECTIONS.has(current)
            ? dateAhead(idx, 3) || isBold
            : true;
    return accept ? { kind: "other", heading: core, standardHeading: false } : undefined;
  };

  const sections: Section[] = [];
  let cur: Section = { kind: "contact", heading: "", standardHeading: true, lines: [] };
  lines.forEach((l, idx) => {
    const hit = detect(l, idx, cur.kind === "contact" ? undefined : cur.kind);
    if (!hit) {
      cur.lines.push(l);
      return;
    }
    sections.push(cur);
    cur = { kind: hit.kind, heading: hit.heading, standardHeading: hit.standardHeading, lines: [] };
    if (hit.remainder) cur.lines.push({ ...l, text: hit.remainder });
  });
  sections.push(cur);

  for (const s of sections) {
    if (!s.standardHeading && s.kind === "other") s.kind = sectionKindFromContent(s.lines);
  }
  return sections.filter((s) => s.kind !== "contact" || s.lines.length > 0);
}

export function buildResumeDoc(extraction: Extraction): ResumeDoc {
  const kept = splitSections(extraction);

  const of = (kind: SectionKind) => kept.filter((s) => s.kind === kind).flatMap((s) => s.lines);
  const contactLines = of("contact");
  const fallbackText = kept
    .filter((s) => s.kind !== "references")
    .flatMap((s) => s.lines.map((l) => l.text))
    .join("\n");
  const summaryText = squash(of("summary").map((l) => l.text).join(" "));

  return {
    schemaVersion: 1,
    basics: {
      ...parseContact(contactLines.map((l) => l.text), fallbackText),
      ...(summaryText ? { summary: summaryText } : {}),
    },
    work: parseWork(of("experience")),
    education: parseEducation(of("education")),
    skills: parseSkills(of("skills")),
    projects: parseProjects(of("projects")),
    certifications: parseCertifications(of("certifications")),
    languages: parseLanguages(of("languages")),
    sections: kept.map((s) => ({ kind: s.kind, heading: s.heading, standardHeading: s.standardHeading, lineCount: s.lines.length })),
  };
}

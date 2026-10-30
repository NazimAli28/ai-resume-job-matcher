/**
 * Shapes shared by extraction (files → lines), structure detection (lines → ResumeDoc) and
 * the rule engine (→ findings + scores). Spec: docs/prd/05-ai-engine.md §2–§3.
 */

export type Band = "header" | "footer" | "body";

/** One visual line in reading order as a simple parser would see it (raster order for PDF). */
export interface Line {
  text: string;
  page: number; // 1-based
  /** PDF only: distance from the top of the page as a fraction 0–1. */
  top?: number;
  /** PDF only: left edge as a fraction of page width 0–1. */
  left?: number;
  fontSize?: number;
  bold?: boolean;
  band: Band;
  inTable?: boolean;
  inTextbox?: boolean;
  listItem?: boolean;
}

export interface ExtractFeatures {
  /** Text found only in page header/footer bands (PDF top/bottom 6%) or DOCX header*.xml/footer*.xml. */
  headerFooterText: string;
  /** Share of body characters inside tables / text boxes (DOCX) or ruled grids (PDF, best effort). */
  tableTextShare: number;
  textboxTextShare: number;
  /** Pages where a two-column layout was detected. */
  columnPages: number[];
  /** Embedded drawings/images count (DOCX w:drawing; PDF image XObjects when detectable). */
  images: number;
  /** Text that is hidden: white text, vanish, tiny fonts. */
  hiddenText: string[];
  /** Replacement chars, private-use glyphs, letter-spaced runs. */
  garbledCount: number;
}

export interface Extraction {
  kind: "PDF" | "DOCX";
  pageCount: number;
  lines: Line[];
  /** Naive reading-order text ("what an ATS likely sees"), ≤ 30k chars. */
  atsText: string;
  charsPerPage: number[];
  features: ExtractFeatures;
}

export interface PartialDate {
  year: number;
  month?: number;
  raw: string;
}
export interface DateRange {
  start?: PartialDate;
  end?: PartialDate;
  isCurrent: boolean;
  raw: string;
}

export type SectionKind =
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "references"
  | "personal"
  | "other";

export interface Section {
  kind: SectionKind;
  heading: string; // as written ("" for the contact block)
  /** True when the heading matched our dictionary; false = recognized by content only. */
  standardHeading: boolean;
  lines: Line[];
}

export interface Bullet {
  id: string;
  text: string;
  hasMetric: boolean;
}

export interface WorkItem {
  id: string;
  title: string;
  employer: string;
  location?: string;
  dates?: DateRange;
  bullets: Bullet[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degreeRaw: string;
  dates?: DateRange;
  grade?: string;
}

/** Structured resume (deterministic first pass; Phase 4 adds the AI semantic pass + verification). */
export interface ResumeDoc {
  schemaVersion: 1;
  basics: {
    name?: string;
    headline?: string;
    email?: string;
    phone?: string;
    location?: string;
    profiles: { network: "LINKEDIN" | "GITHUB" | "PORTFOLIO" | "OTHER"; url: string }[];
    summary?: string;
  };
  work: WorkItem[];
  education: EducationItem[];
  skills: string[];
  projects: { id: string; name: string; bullets: Bullet[] }[];
  certifications: string[];
  languages: string[];
  sections: { kind: SectionKind; heading: string; standardHeading: boolean; lineCount: number }[];
}

export type Severity = "ERR" | "WARN" | "TIP";

export interface Finding {
  ruleId: string; // "P2", "R3", "PII1"
  severity: Severity;
  category: "parse" | "readability" | "privacy";
  title: string; // short, plain
  message: string; // the fix, in plain English
  /** Quote of the line(s) the finding is about, if any (masked for PII rules). */
  evidence?: string[];
  /** P8 counts per role, capped at 2. */
  multiplier?: number;
}

export interface Analysis {
  engineVersion: string;
  parseHealth: number;
  readability: number;
  readabilityParts: Record<string, number>;
  findings: Finding[];
}

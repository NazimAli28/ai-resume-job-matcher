import type { DateRange, ResumeDoc } from "../resume/types";

/**
 * A document as a flat list of blocks, shared by the PDF and DOCX writers so both files say the
 * same thing. One column, standard headings, real text: what applicant tracking systems read best (TLR-015).
 */
export type Block =
  | { kind: "name"; text: string }
  | { kind: "contact"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "title"; text: string }
  | { kind: "meta"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "para"; text: string }
  | { kind: "gap" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (d?: { year: number; month?: number }) => (d ? `${d.month ? `${MONTHS[d.month - 1]} ` : ""}${d.year}` : "");

export function formatRange(r?: DateRange): string {
  if (!r) return "";
  const end = r.isCurrent ? "Present" : fmt(r.end);
  const start = fmt(r.start);
  return start && end && start !== end ? `${start} – ${end}` : start || end || r.raw;
}

export function contactLine(doc: ResumeDoc): string {
  const b = doc.basics;
  return [b.location, b.phone, b.email, ...b.profiles.map((p) => p.url.replace(/^https?:\/\/(www\.)?/, ""))].filter(Boolean).join(" | ");
}

export function resumeBlocks(doc: ResumeDoc): Block[] {
  const out: Block[] = [];
  const b = doc.basics;
  if (b.name) out.push({ kind: "name", text: b.name });
  if (b.headline) out.push({ kind: "meta", text: b.headline });
  const contact = contactLine(doc);
  if (contact) out.push({ kind: "contact", text: contact });

  if (b.summary) out.push({ kind: "heading", text: "Summary" }, { kind: "para", text: b.summary });

  if (doc.work.length) {
    out.push({ kind: "heading", text: "Experience" });
    doc.work.forEach((w, i) => {
      if (i) out.push({ kind: "gap" });
      out.push({ kind: "title", text: [w.title, w.employer].filter(Boolean).join(", ") });
      const meta = [w.location, formatRange(w.dates)].filter(Boolean).join(" | ");
      if (meta) out.push({ kind: "meta", text: meta });
      for (const bl of w.bullets) out.push({ kind: "bullet", text: bl.text });
    });
  }
  if (doc.projects.length) {
    out.push({ kind: "heading", text: "Projects" });
    doc.projects.forEach((p, i) => {
      if (i) out.push({ kind: "gap" });
      out.push({ kind: "title", text: p.name });
      for (const bl of p.bullets) out.push({ kind: "bullet", text: bl.text });
    });
  }
  if (doc.education.length) {
    out.push({ kind: "heading", text: "Education" });
    doc.education.forEach((e, i) => {
      if (i) out.push({ kind: "gap" });
      out.push({ kind: "title", text: [e.degreeRaw, e.institution].filter(Boolean).join(", ") });
      const meta = [formatRange(e.dates), e.grade].filter(Boolean).join(" | ");
      if (meta) out.push({ kind: "meta", text: meta });
    });
  }
  if (doc.skills.length) out.push({ kind: "heading", text: "Skills" }, { kind: "para", text: doc.skills.join(", ") });
  if (doc.certifications.length) {
    out.push({ kind: "heading", text: "Certifications" });
    for (const c of doc.certifications) out.push({ kind: "bullet", text: c });
  }
  if (doc.languages.length) out.push({ kind: "heading", text: "Languages" }, { kind: "para", text: doc.languages.join(", ") });
  return out;
}

export interface LetterInput {
  name?: string;
  contact: string;
  date: string;
  recipient?: string;
  company?: string;
  paragraphs: string[];
}

export function letterBlocks(l: LetterInput): Block[] {
  const out: Block[] = [];
  if (l.name) out.push({ kind: "name", text: l.name });
  if (l.contact) out.push({ kind: "contact", text: l.contact });
  out.push({ kind: "gap" }, { kind: "para", text: l.date }, { kind: "gap" });
  if (l.company) out.push({ kind: "para", text: l.company }, { kind: "gap" });
  out.push({ kind: "para", text: `Dear ${l.recipient?.trim() || "Hiring Manager"},` }, { kind: "gap" });
  for (const p of l.paragraphs) out.push({ kind: "para", text: p }, { kind: "gap" });
  out.push({ kind: "para", text: "Sincerely," });
  if (l.name) out.push({ kind: "para", text: l.name });
  return out;
}

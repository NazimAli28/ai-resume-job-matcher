import { findEmails, findPhones } from "../contact";
import {
  CNIC_CONTEXT_RE,
  CNIC_RE,
  IBAN_PK_RE,
  OLD_NIC_RE,
  PK_MOBILE_RE,
  URL_RE,
} from "../patterns";
import { splitSections } from "../structure";
import type { Extraction, Finding, Severity } from "../types";
import { finding, type AnalyzeOpts } from "./shared";

const C = "privacy" as const;
const DOT = "•";

/** "35202-1234567-1" -> "CNIC 35202-•••••••-1": never shows more than 6 of 13 digits. */
export function maskCnic(digits: string): string {
  return `CNIC ${digits.slice(0, 5)}-${DOT.repeat(7)}-${digits.slice(12, 13)}`;
}
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}${DOT.repeat(3)}@${domain}`;
}
/** Keep the first 2 and last 2 digits. */
export function maskPhone(phone: string): string {
  const total = phone.replace(/\D/g, "").length;
  let i = 0;
  return phone.replace(/\d/g, (d) => {
    i++;
    return i <= 2 || i > total - 2 ? d : DOT;
  });
}

export interface CnicHit {
  masked: string;
  confidence: "HIGH" | "MEDIUM";
  index: number;
}

const rangesOf = (text: string, re: RegExp) => [...text.matchAll(re)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length] as const);
const overlaps = (a: readonly [number, number], rs: (readonly [number, number])[]) => rs.some((r) => a[0] < r[1] && r[0] < a[1]);

/** Find CNIC / old NIC numbers in one line of text. Phones, IBANs and URLs are never CNICs. */
export function findCnics(text: string): CnicHit[] {
  const out: CnicHit[] = [];
  const skip = [...rangesOf(text, PK_MOBILE_RE), ...rangesOf(text, URL_RE), ...rangesOf(text, IBAN_PK_RE)];
  const near = (s: number, e: number) => CNIC_CONTEXT_RE.test(text.slice(Math.max(0, s - 40), Math.min(text.length, e + 40)));
  for (const m of text.matchAll(CNIC_RE)) {
    const s = m.index ?? 0;
    const e = s + m[0].length;
    if (overlaps([s, e], skip)) continue;
    const digits = `${m[1]}${m[2]}${m[3]}`;
    const hyphenated = /^\d{5}-\d{7}-\d$/.test(m[0]);
    const confidence = hyphenated || near(s, e) ? "HIGH" : /^[1-7]/.test(digits) ? "MEDIUM" : undefined;
    if (confidence) out.push({ masked: maskCnic(digits), confidence, index: s });
  }
  for (const m of text.matchAll(OLD_NIC_RE)) {
    const s = m.index ?? 0;
    if (near(s, s + m[0].length) && !overlaps([s, s + m[0].length], skip)) {
      out.push({ masked: `NIC ${DOT.repeat(3)}-${DOT.repeat(2)}-${DOT.repeat(6)}`, confidence: "HIGH", index: s });
    }
  }
  return out;
}

interface LabelRule {
  id: string;
  re: RegExp;
  evidence: (m: RegExpExecArray) => string;
  pk: Severity;
  intl: Severity;
  title: string;
  message: string;
}

const label = (m: RegExpExecArray) => `${m[0].replace(/\s+/g, " ").replace(/[:\-\s]+$/, "").trim()}: ${DOT.repeat(4)}`;

const LABEL_RULES: LabelRule[] = [
  { id: "PII4", re: /\b(?:date\s*of\s*birth|d\.?o\.?b\.?)\b\s*[:\-]?|\bborn\s*(?:on|in)?\s*[:\-]?\s*(?=\d|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/gi,
    evidence: label, pk: "TIP", intl: "WARN", title: "Date of birth", message: "Date of birth is not needed for most private-sector and all international applications." },
  { id: "PII4", re: /\bage\s*:?\s*\d{2}\b/gi, evidence: () => `Age: ${DOT.repeat(2)}`, pk: "TIP", intl: "WARN", title: "Age", message: "Date of birth is not needed for most private-sector and all international applications." },
  { id: "PII5", re: /\b(?:father'?s?|husband'?s?)\s*name\s*[:\-]?|\b(?:s\/o|d\/o|w\/o)\b/gi, evidence: label, pk: "TIP", intl: "WARN", title: "Father's or husband's name", message: "Father's name belongs on application forms, not your resume." },
  { id: "PII6", re: /\breligion\s*[:\-]|\bsect\s*:/gi, evidence: label, pk: "WARN", intl: "WARN", title: "Religion", message: "Religion is not relevant to your qualifications. We recommend removing it." },
  { id: "PII7", re: /\bmarital\s*status\b\s*[:\-]?|\b(?:status|gender|sex)\s*[:\-]\s*(?:married|single|unmarried|divorced|male|female)\b/gi, evidence: label, pk: "TIP", intl: "WARN", title: "Marital status or gender", message: "Marital status is not needed on a resume." },
  { id: "PII8", re: /\bdomicile\s*[:\-]/gi, evidence: label, pk: "TIP", intl: "WARN", title: "Domicile", message: "Domicile matters only for government quota posts." },
];

const PASSPORT_RE = /passport\s*(?:no\.?|#|number)\s*[:\-]?\s*([A-Z]{2}\d{7})\b/gi;
const LICENCE_RE = /driving\s*licen[cs]e\s*(?:no\.?|#|number)?\s*[:\-]?\s*[A-Z0-9-]{6,}/gi;
const ADDRESS_RE = /\b(?:house|h\.?\s?#|flat|plot|street|st\.|block|sector|phase)\s*(?:no\.?|#)?\s*[A-Za-z]?-?\d+[A-Za-z]?\b/gi;
const WORK_AUTH_RE = /work\s*authori[sz]ation|\bvisa\b|citizen|green\s*card|work\s*permit|right\s*to\s*work|relocat|sponsorship|authori[sz]ed\s*to\s*work/i;

export function piiFindings(x: Extraction, opts: AnalyzeOpts): Finding[] {
  const intl = opts.targetMarket === "INTERNATIONAL";
  const out: Finding[] = [];
  const lines = x.lines.map((l) => l.text);

  const cnics = lines.flatMap((t) => findCnics(t).map((h) => h.masked));
  if (cnics.length) {
    out.push(finding(C, "PII1", "ERR", "CNIC number on your resume",
      "Your CNIC number should never be on a resume (identity-theft risk). Give it only on official application forms.", [...new Set(cnics)]));
  }

  const docIds: string[] = [];
  for (const t of lines) {
    for (const m of t.matchAll(PASSPORT_RE)) docIds.push(`Passport no. ${(m[1] ?? "").slice(0, 2)}${DOT.repeat(7)}`);
    for (const m of t.matchAll(LICENCE_RE)) docIds.push(`Driving licence no. ${DOT.repeat(6)}`);
    for (const m of t.matchAll(IBAN_PK_RE)) docIds.push(`IBAN ${m[0].slice(0, 4)}${DOT.repeat(20)}`);
  }
  if (docIds.length) {
    out.push(finding(C, "PII2", "ERR", "ID document or bank number", "Remove ID document numbers from your resume.", [...new Set(docIds)]));
  }

  for (const rule of LABEL_RULES) {
    const ev = new Set<string>();
    for (const t of lines) for (const m of t.matchAll(rule.re)) ev.add(rule.evidence(m as RegExpExecArray));
    if (ev.size) out.push(finding(C, rule.id, intl ? rule.intl : rule.pk, rule.title, rule.message, [...ev]));
  }

  // Address and references need to know which section a line sits in.
  const sections = splitSections(x);
  const early = sections.filter((s) => s.kind === "contact" || s.kind === "personal").flatMap((s) => s.lines.map((l) => l.text));
  const addr = new Set<string>();
  for (const t of early) for (const m of t.matchAll(ADDRESS_RE)) addr.add(`${m[0].replace(/\d/g, DOT)} ${DOT.repeat(3)}`);
  if (addr.size) out.push(finding(C, "PII9", "TIP", "Full street address", "City is enough; a full address is unnecessary.", [...addr]));

  if (intl && !WORK_AUTH_RE.test(lines.join("\n"))) {
    out.push(finding(C, "PII10", "TIP", "No work authorization stated",
      "State your work authorization or relocation status (e.g. 'Open to relocation, requires visa sponsorship')."));
  }

  const refs = sections.filter((s) => s.kind === "references").flatMap((s) => s.lines.map((l) => l.text));
  const refEv = refs.flatMap((t) => [...findEmails(t).map(maskEmail), ...findPhones(t).map(maskPhone)]);
  if (refEv.length) {
    out.push(finding(C, "PII11", "TIP", "Referee contact details",
      "Use 'References available on request' to protect your referees' privacy.", [...new Set(refEv)]));
  }
  return out;
}

import { DOC_TITLES, JOB_TITLE_RE, COMPANY_RE, lookupHeading } from "./lexicon";
import {
  COUNTRY_RE,
  EMAIL_RE,
  LOCATION_SEG_RE,
  PHONE_CANDIDATE_RE,
  PK_CITY_RE,
  PK_MOBILE_RE,
  URL_RE,
  squash,
} from "./patterns";
import type { ResumeDoc } from "./types";

type Basics = ResumeDoc["basics"];

export function looksLikeName(text: string): boolean {
  const t = squash(text);
  if (t.length < 3 || t.length > 50 || /[@\d]/.test(t)) return false;
  const words = t.split(" ");
  if (words.length < 2 || words.length > 5) return false;
  if (!words.every((w) => /^[\p{L}][\p{L}.'’-]*$/u.test(w))) return false;
  if (DOC_TITLES.has(t.toLowerCase()) || lookupHeading(t)) return false;
  if (JOB_TITLE_RE.test(t) || COMPANY_RE.test(t) || PK_CITY_RE.test(t) || COUNTRY_RE.test(t)) return false;
  return true;
}

/** First name-like line among the given texts. */
export function detectName(texts: string[]): { name: string; index: number } | undefined {
  const index = texts.findIndex(looksLikeName);
  const found = texts[index];
  return found === undefined ? undefined : { name: squash(found), index };
}

export function findEmails(text: string): string[] {
  return [...text.matchAll(EMAIL_RE)].map((m) => m[0]);
}

const isDateRangeish = (s: string) => /(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present)/i.test(s);

export function findPhones(text: string): string[] {
  const out: string[] = [];
  const pk = [...text.matchAll(PK_MOBILE_RE)];
  for (const m of pk) out.push(m[0].trim());
  for (const m of text.matchAll(PHONE_CANDIDATE_RE)) {
    const raw = m[0];
    const digits = raw.replace(/\D/g, "");
    const start = m.index ?? 0;
    if (digits.length < 9 || digits.length > 15) continue;
    if (pk.some((p) => start < (p.index ?? 0) + p[0].length && (p.index ?? 0) < start + raw.length)) continue;
    if (/^\d{5}[-\s]?\d{7}[-\s]?\d$/.test(raw.trim())) continue; // CNIC shape, not a phone
    if (isDateRangeish(raw)) continue;
    out.push(raw.trim());
  }
  return out;
}

export function findProfiles(text: string): Basics["profiles"] {
  const stripped = text.replace(EMAIL_RE, " ");
  const seen = new Set<string>();
  const out: Basics["profiles"] = [];
  for (const m of stripped.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;)]+$/, "");
    const key = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const network = /linkedin\.com/i.test(url)
      ? "LINKEDIN"
      : /github\.com/i.test(url)
        ? "GITHUB"
        : /behance|dribbble|medium\.com|portfolio|\.dev\b|\.me\b/i.test(url)
          ? "PORTFOLIO"
          : "OTHER";
    out.push({ network, url });
  }
  return out;
}

const CITY_COUNTRY_RE = /^[A-Z][A-Za-z.' ]{1,30},\s*([A-Z][A-Za-z.' ]{1,30})$/;

export function isLocationSegment(seg: string): boolean {
  const s = seg.replace(/^(?:address|location|city|based in)\s*[:\-]\s*/i, "").trim();
  if (!s || s.length > 60 || /[@\d]/.test(s)) return false;
  if (LOCATION_SEG_RE.test(s)) return true;
  const m = CITY_COUNTRY_RE.exec(s);
  if (!m?.[1]) return false;
  const tail = m[1].trim();
  return COUNTRY_RE.test(tail) || PK_CITY_RE.test(s.split(",")[0] ?? "") || /^[A-Z]{2}$/.test(tail);
}

const SEG_SPLIT = /\s*[|•·●▪◦]\s*|\s{3,}|\s+[–—]\s+/;

function isContactSegment(seg: string): boolean {
  return /@/.test(seg) || findPhones(seg).length > 0 || /(?:https?:\/\/|www\.|linkedin\.com|github\.com)/i.test(seg);
}

/** Parse the contact block (lines before the first heading) with whole-document fallbacks. */
export function parseContact(blockTexts: string[], fallbackText: string): Omit<Basics, "summary"> {
  const block = blockTexts.join("\n");
  const basics: Omit<Basics, "summary"> = { profiles: [] };

  const nameHit = detectName(blockTexts);
  if (nameHit) basics.name = nameHit.name;

  basics.email = findEmails(block)[0] ?? findEmails(fallbackText)[0];
  basics.phone = findPhones(block)[0] ?? findPhones(fallbackText)[0];
  const profiles = findProfiles(block);
  basics.profiles = profiles.length ? profiles : findProfiles(fallbackText);

  const after = nameHit ? blockTexts.slice(nameHit.index + 1) : blockTexts;
  for (const text of after) {
    for (const raw of text.split(SEG_SPLIT)) {
      const seg = squash(raw);
      if (!seg) continue;
      if (isLocationSegment(seg)) {
        basics.location ??= seg.replace(/^(?:address|location|city|based in)\s*[:\-]\s*/i, "");
        continue;
      }
      if (isContactSegment(seg) || /^(?:email|e-mail|phone|mobile|cell|tel|contact)\b/i.test(seg)) continue;
      const words = seg.split(" ");
      if (!basics.headline && words.length <= 10 && seg.length <= 80 && !/^\d/.test(seg)) basics.headline = seg;
    }
  }
  return basics;
}

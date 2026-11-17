import { maskPii } from "../ai/sanitize";
import { OLD_NIC_RE, PHONE_CANDIDATE_RE, URL_RE } from "../resume/patterns";

/** What we know identifies this person: names, and the employers and schools on their resume. */
export interface KnownIds {
  names: string[];
  employers: string[];
  schools: string[];
}

/** Employers that say nothing about who someone is. Masking them would only lose meaning. */
const GENERIC_EMPLOYERS = new Set(["freelance", "freelancer", "self-employed", "self employed", "independent", "n/a", "na", "none", "various", "confidential"]);

/** Street-level address parts (house, street, block, sector...). A city on its own is kept: jobs need it. */
const ADDRESS_RE =
  /(?:\b(?:house|flat|plot|apartment|apt|shop|bungalow)\s*(?:no\.?|#|number)?|\bh\s*(?:#|\.\s*no\.?))\s*[#:]?\s*[\w/-]*\d[\w/-]*|\b(?:street|st|road|rd|lane|ln|block|sector|mohallah|mohalla|gali|chak)\s*(?:no\.?|#)?\s*[A-Za-z]?[-\s]?\d[\w/-]*/gi;

/** "Block B", "Sector F": a capital letter on its own. Case-sensitive, so "block a request" is left alone. */
const LETTER_BLOCK_RE = /\b(?:[Bb]lock|[Ss]ector)\s+[A-Z](?![\w-])/g;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function termsRe(terms: string[]): RegExp | null {
  const list = [...new Set(terms.map(clean).filter((t) => t.length >= 3))].sort((a, b) => b.length - a.length);
  if (!list.length) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${list.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu");
}

/** Full names and their parts ("Ayesha Khan" → "Ayesha Khan", "Ayesha", "Khan"). */
function nameTerms(names: string[]) {
  const out: string[] = [];
  for (const n of names.map(clean).filter(Boolean)) {
    out.push(n);
    for (const part of n.split(/[\s.]+/)) if (part.length >= 3) out.push(part);
  }
  return out;
}

/** Build the scrubber once per person, then run it over every string in an example. */
export function makeScrubber(known: KnownIds) {
  const names = termsRe(nameTerms(known.names));
  const employers = termsRe(known.employers.filter((e) => !GENERIC_EMPLOYERS.has(clean(e).toLowerCase())));
  const schools = termsRe(known.schools);

  return (text: string): string => {
    let t = maskPii(text).replace(OLD_NIC_RE, "{{PII_REMOVED_ID}}");
    t = t.replace(URL_RE, "{{LINK}}");
    t = t.replace(PHONE_CANDIDATE_RE, (m) => {
      const digits = m.replace(/\D/g, "").length;
      return digits >= 10 && digits <= 15 ? "{{PII_PHONE}}" : m;
    });
    t = t.replace(ADDRESS_RE, "{{ADDRESS}}").replace(LETTER_BLOCK_RE, "{{ADDRESS}}");
    if (schools) t = t.replace(schools, "{{SCHOOL}}");
    if (employers) t = t.replace(employers, "{{COMPANY}}");
    if (names) t = t.replace(names, "{{NAME}}");
    return t;
  };
}

/** Every string inside a JSON value is scrubbed; keys, numbers and structure stay. */
export function deidentify(value: unknown, scrub: (s: string) => string): unknown {
  if (typeof value === "string") return scrub(value);
  if (Array.isArray(value)) return value.map((v) => deidentify(v, scrub));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deidentify(v, scrub)]));
  return value;
}

import type { DateRange, PartialDate } from "./types";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const MONTH = String.raw`(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)`;
const YEAR = String.raw`(?:19|20)\d{2}`;
const DATE = String.raw`(?:${MONTH}\.?[\s,'/-]*${YEAR}|\d{1,2}[/.-]${YEAR}|${YEAR})`;
const CURRENT = String.raw`(?:present|current(?:ly)?|till\s*date|to\s*date|till\s*now|till\s*today|now|ongoing|date|today)`;
const SEP = String.raw`(?:\s*[-–—‒]\s*|\s+(?:to|until|till)\s+|\s*[-–—‒]\s*(?:to\s+)?)`;

const RANGE_RE = new RegExp(String.raw`(?<![\w/])(${DATE})${SEP}(${DATE}|${CURRENT})(?![\w])`, "i");
const SINGLE_RE = new RegExp(String.raw`(?<![\w/])(${DATE})(?![\w])`, "i");
const CURRENT_RE = new RegExp(`^${CURRENT}$`, "i");

function parseToken(raw: string): PartialDate | undefined {
  const t = raw.trim();
  const named = new RegExp(`^(${MONTH})\\.?[\\s,'/-]*(${YEAR})$`, "i").exec(t);
  if (named?.[1] && named[2]) {
    return { year: Number(named[2]), month: MONTHS[named[1].slice(0, 3).toLowerCase()], raw: t };
  }
  const numeric = /^(\d{1,2})[/.-]((?:19|20)\d{2})$/.exec(t);
  if (numeric?.[1] && numeric[2]) {
    const month = Number(numeric[1]);
    if (month < 1 || month > 12) return undefined;
    return { year: Number(numeric[2]), month, raw: t };
  }
  if (new RegExp(`^${YEAR}$`).test(t)) return { year: Number(t), raw: t };
  return undefined;
}

export interface FoundRange {
  range: DateRange;
  index: number;
  length: number;
}

/** Find the first date range in a line, e.g. "Jan 2022 – Present". `allowSingle` also accepts a lone date/year. */
export function findDateRange(text: string, opts: { allowSingle?: boolean } = {}): FoundRange | undefined {
  const m = RANGE_RE.exec(text);
  if (m?.[1] && m[2]) {
    const start = parseToken(m[1]);
    const endIsCurrent = CURRENT_RE.test(m[2].trim());
    const end = endIsCurrent ? undefined : parseToken(m[2]);
    if (start && (end || endIsCurrent)) {
      return { range: { start, end, isCurrent: endIsCurrent, raw: m[0] }, index: m.index, length: m[0].length };
    }
  }
  if (opts.allowSingle) {
    const s = SINGLE_RE.exec(text);
    const start = s?.[1] ? parseToken(s[1]) : undefined;
    if (s && start) {
      return { range: { start, end: start, isCurrent: false, raw: s[0] }, index: s.index, length: s[0].length };
    }
  }
  return undefined;
}

export function parseDateRange(text: string, opts: { allowSingle?: boolean } = {}): DateRange | undefined {
  return findDateRange(text, opts)?.range;
}

/** Months since year 0, or undefined when no year. Missing month counts as January (start) for ordering. */
export function monthIndex(d: PartialDate | undefined, fallbackMonth = 1): number | undefined {
  if (!d) return undefined;
  return d.year * 12 + ((d.month ?? fallbackMonth) - 1);
}

/** Style key for consistency checks: month-name length and separators, numeric month, or year only. */
export function detectDateStyle(range: DateRange): string {
  const raw = range.start?.raw ?? range.raw;
  const name = new RegExp(`^(${MONTH})`, "i").exec(raw);
  if (name?.[1]) {
    const word = /^[a-z]+/i.exec(raw)?.[0] ?? "";
    const kind = word.length <= 3 ? "MON" : "MONTH";
    const sep = /[a-z]\.?([\s,'/-]*)\d/i.exec(raw)?.[1] ?? " ";
    return `${kind}${/-/.test(sep) ? "-" : /\//.test(sep) ? "/" : "_"}YYYY`;
  }
  if (/^\d{1,2}[/.-]/.test(raw)) {
    const sep = /^\d{1,2}([/.-])/.exec(raw)?.[1] ?? "/";
    return `MM${sep}YYYY`;
  }
  return "YYYY";
}

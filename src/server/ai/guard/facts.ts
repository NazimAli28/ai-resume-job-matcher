import { skillsIn } from "../../match/taxonomy";

/**
 * The fact checker (05 §7.4). Every sentence the AI writes about the candidate passes through here
 * before anyone sees it. It compares the claims in the text with what the cited evidence says, in
 * code, so a convincing model can't talk its way past it.
 */

export type GuardResult =
  | { action: "PASS" }
  /** Plausible, but the user has to confirm it first. `numbers` are the new figures to blank out. */
  | { action: "ASK"; reason: "NEW_NUMBER" | "STRONGER_CLAIM" | "WIDER_SCOPE"; detail: string[]; numbers: string[] }
  /** Never shown: it states something the evidence doesn't. */
  | { action: "BLOCK"; reason: "NEW_SKILL" | "NEW_YEAR" | "NEW_NAME" | "NO_EVIDENCE"; detail: string[] };

export interface GuardInput {
  /** The generated text. */
  text: string;
  /** Text of everything the generator cited: resume lines, FactBank statements. */
  evidence: string[];
  /** The line being rewritten, for the claim-strength check. */
  original?: string;
  /** Extra names and numbers allowed but not counted as candidate skills (cover letter: the job post and the user's notes). */
  context?: string[];
}

const YEAR_RE = /\b(?:19|20)\d{2}\b/g;
// A figure: digits with separators, an optional magnitude word, or a percent. Years are handled separately.
const NUMBER_RE = /(?<![\w.])\d[\d,]*(?:\.\d+)?\s?(?:%|k\b|m\b|x\b|lakhs?\b|lacs?\b|crores?\b|million\b|billion\b|thousand\b)?/gi;
const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100, thousand: 1000, dozen: 12,
};
const NUMBER_WORD_RE = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b(?:\\s+(?:percent|per cent))?`, "gi");

/** "1,200" → "1200", "10k" → "10000", "30 %" → "30%". Comparable however it's written. */
export function normalizeNumber(raw: string): string {
  const m = raw.trim().toLowerCase().match(/^([\d,]*\.?\d+)\s?(%|k|m|x|lakhs?|lacs?|crores?|million|billion|thousand)?$/);
  if (!m) return raw.trim().toLowerCase();
  const n = Number(m[1].replace(/,/g, ""));
  const unit = m[2] ?? "";
  if (unit === "%") return `${n}%`;
  if (unit === "x") return `${n}x`;
  const mult: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, billion: 1e9, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, crore: 1e7, crores: 1e7 };
  return String(n * (mult[unit] ?? 1));
}

export function numbersIn(text: string): string[] {
  const noYears = text.replace(YEAR_RE, " ");
  const found = (noYears.match(NUMBER_RE) ?? []).map(normalizeNumber);
  for (const m of noYears.matchAll(NUMBER_WORD_RE)) {
    const n = NUMBER_WORDS[m[1].toLowerCase()];
    found.push(/percent|per cent/i.test(m[0]) ? `${n}%` : String(n));
  }
  return [...new Set(found)];
}

export const yearsIn = (text: string) => [...new Set(text.match(YEAR_RE) ?? [])];

// Capitalized words that aren't names: sentence words, months, common resume vocabulary.
const COMMON = new Set(
  (
    "a an and the i in on at of for to with by from as is was were be been my our we our team teams this that these those it its " +
    "january february march april may june july august september october november december jan feb mar apr jun jul aug sep sept oct nov dec " +
    "monday tuesday wednesday thursday friday saturday sunday " +
    "dear sincerely regards hiring manager team role position company job candidate experience skills summary education projects project " +
    "certifications languages english urdu " +
    "led built designed developed managed created implemented improved reduced increased delivered launched owned worked helped supported " +
    "contributed assisted wrote maintained migrated automated analyzed coordinated handled trained mentored organized prepared tested " +
    "used using via yes no not also more most best new senior junior lead head intern internship bachelor bachelors master masters degree " +
    "university college school institute department lab final year fyp thesis course coursework student students client clients customer customers " +
    "user users product products service services system systems app apps application applications web mobile api apis rest ui ux qa"
  ).split(/\s+/),
);

/** Proper-noun-looking tokens: capitalized, not starting a sentence, not everyday words. */
export function namesIn(text: string): string[] {
  const out: string[] = [];
  const sentences = text.split(/(?<=[.!?:;•\n])\s+|\s+[-–—]\s+/);
  for (const s of sentences) {
    const tokens = s.match(/[A-Za-z][A-Za-z0-9&'.+#-]*/g) ?? [];
    tokens.forEach((t, i) => {
      const clean = t.replace(/['’](?:s|d|ll|m|ve|re|t)$/i, "").replace(/[.'-]+$/, "");
      if (i === 0 || clean.length < 2) return;
      if (!/^[A-Z]/.test(clean)) return;
      if (COMMON.has(clean.toLowerCase()) || COMMON.has(clean.toLowerCase().replace(/s$/, ""))) return;
      out.push(clean);
    });
  }
  return [...new Set(out)];
}

// Claim strength, weakest to strongest (05 §7.4.3). Climbing more than one rung needs the user's word.
const LADDER: string[][] = [
  ["assisted", "helped", "observed", "shadowed", "learned", "participated"],
  ["supported", "contributed", "collaborated", "worked"],
  ["built", "developed", "created", "implemented", "designed", "wrote", "delivered", "improved", "reduced", "increased", "automated", "maintained"],
  ["led", "managed", "coordinated", "mentored", "drove", "directed", "supervised"],
  ["owned", "headed", "founded", "spearheaded", "architected", "established"],
];
const rung = (text: string): number | undefined => {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let best: number | undefined;
  for (const w of words.slice(0, 6)) {
    const r = LADDER.findIndex((level) => level.includes(w));
    if (r >= 0) best = Math.max(best ?? -1, r);
  }
  return best;
};

const SCOPE_RE = /\b(?:all|entire|every|company[- ]wide|organization[- ]wide|organisation[- ]wide|end[- ]to[- ]end|single[- ]handedly|sole(?:ly)?|production|enterprise[- ]wide|nationwide|globally)\b/gi;

const words = (texts: string[]) => {
  const set = new Set<string>();
  for (const t of texts) for (const w of t.toLowerCase().match(/[a-z0-9][a-z0-9&'.+#-]*/g) ?? []) {
    const c = w.replace(/['’]s$/, "").replace(/[.'-]+$/, "");
    set.add(c);
    set.add(c.replace(/s$/, ""));
  }
  return set;
};

export function checkClaim(input: GuardInput): GuardResult {
  const text = input.text.trim();
  if (!text) return { action: "BLOCK", reason: "NO_EVIDENCE", detail: [] };
  const evidence = input.evidence.filter((e) => e.trim());
  const allowedText = [...evidence, ...(input.original ? [input.original] : [])];
  const contextText = [...allowedText, ...(input.context ?? [])];

  // 1. Dates: a year the evidence doesn't contain.
  const knownYears = new Set(yearsIn(contextText.join(" ")));
  const newYears = yearsIn(text).filter((y) => !knownYears.has(y));
  if (newYears.length) return { action: "BLOCK", reason: "NEW_YEAR", detail: newYears };

  // 2. Skills and tools: only what the candidate's own evidence shows. The job post never counts.
  const knownSkills = new Set(skillsIn(allowedText.join("\n")));
  const newSkills = skillsIn(text).filter((s) => !knownSkills.has(s));
  if (newSkills.length) return { action: "BLOCK", reason: "NEW_SKILL", detail: newSkills };

  // 3. Names: employers, products, places, titles the evidence never mentions.
  const known = words(contextText);
  const newNames = namesIn(text).filter((n) => !known.has(n.toLowerCase()) && !known.has(n.toLowerCase().replace(/s$/, "")));
  if (newNames.length) return { action: "BLOCK", reason: "NEW_NAME", detail: newNames };

  // 4. Numbers: never invented. The user can fill one in.
  const knownNumbers = new Set(numbersIn(contextText.join(" ")));
  const newNumbers = numbersIn(text).filter((n) => !knownNumbers.has(n));
  if (newNumbers.length) return { action: "ASK", reason: "NEW_NUMBER", detail: newNumbers, numbers: newNumbers };

  // 5. Claim strength and scope.
  if (input.original) {
    const before = rung(input.original);
    const after = rung(text);
    if (before !== undefined && after !== undefined && after - before > 1) return { action: "ASK", reason: "STRONGER_CLAIM", detail: [text.split(/\s+/).slice(0, 3).join(" ")], numbers: [] };
  }
  const knownScope = new Set((allowedText.join(" ").match(SCOPE_RE) ?? []).map((s) => s.toLowerCase()));
  const newScope = [...new Set((text.match(SCOPE_RE) ?? []).map((s) => s.toLowerCase()))].filter((s) => !knownScope.has(s));
  if (newScope.length) return { action: "ASK", reason: "WIDER_SCOPE", detail: newScope, numbers: [] };

  return { action: "PASS" };
}

/** Replace figures the user must supply with "[X]". Used when a new number turns a rewrite into a question. */
export function blankNumbers(text: string, numbers: string[]): string {
  if (!numbers.length) return text;
  const set = new Set(numbers);
  // Years first in the alternation, so "2023" is never mistaken for a figure.
  const re = new RegExp(`(${YEAR_RE.source})|${NUMBER_RE.source}`, "gi");
  return text.replace(re, (m, year) => (year || !set.has(normalizeNumber(m)) ? m : m.trim().endsWith("%") ? "[X]%" : "[X]"));
}

/** Bracketed placeholders still waiting for the user, e.g. "[X]" or "[Hiring manager name]". */
export const placeholdersIn = (text: string) => [...new Set(text.match(/\[[^\]\n]{1,40}\]/g) ?? [])];

// "I'd use", "I haven't", "I plan to learn": talking about a skill without claiming it.
const HYPOTHETICAL_RE = /\b(?:would|could|will|wouldn't|won't|couldn't|isn't|is not|aren't|don't have|do not have|not on my|plan(?:ning)? to|going to|want to|aim to|intend to|haven't|have not|hasn't|not yet|never|learn(?:ing)?|study(?:ing)?|practi[cs]e|explore|get up to speed)\b|\b\w+'(?:d|ll)\b/i;
// Past-tense claims of doing something.
const PAST_CLAIM_RE = /\b(?:used|built|deployed|worked|developed|created|managed|led|wrote|ran|set up|configured|implemented|containeri[sz]ed|shipped|migrated|maintained|designed|owned|launched|delivered|have used|have worked|experience (?:with|in))\b/i;

/**
 * For model answers and cover letters: a skill from the question or the job (the topic) may be
 * mentioned only in a clause that doesn't claim it ("I'd start with Docker's guide", "I haven't used
 * Docker yet"). Any clause that claims past use of it is blocked, as is everything checkClaim blocks.
 */
// Negated or conditional verbs aren't claims: "haven't used", "would use", "I'd write".
const claimsPast = (s: string) => PAST_CLAIM_RE.test(s.replace(/(?:\b(?:haven't|have not|hasn't|has not|never|didn't|did not|not yet|would|will|could)|'d|'ll)\s+(?:\w+\s+)?\w+/gi, ""));

export function checkTopicSentence(input: GuardInput & { topic: string[] }): GuardResult {
  const hypothetical = HYPOTHETICAL_RE.test(input.text) && !claimsPast(input.text);
  const context = [...(input.context ?? []), ...input.topic, ...(hypothetical ? namesIn(input.text) : [])];
  const base = checkClaim({ ...input, evidence: [...input.evidence, ...input.topic], context });
  if (base.action === "BLOCK") return base;
  const own = new Set(skillsIn(input.evidence.join("\n")));
  const borrowed = skillsIn(input.text).filter((s) => !own.has(s));
  const clauses = input.text.split(/[,;:]|\s(?:and|but|so|while|because|which|then)\s/i);
  // A sentence that is forward-looking or a denial as a whole needs no clause check.
  for (const id of hypothetical ? [] : borrowed) {
    for (const c of clauses) {
      if (skillsIn(c).includes(id) && (!HYPOTHETICAL_RE.test(c) || claimsPast(c))) return { action: "BLOCK", reason: "NEW_SKILL", detail: [id] };
    }
  }
  if (base.action === "ASK" && base.reason !== "NEW_NUMBER" && hypothetical) return { action: "PASS" };
  return base;
}

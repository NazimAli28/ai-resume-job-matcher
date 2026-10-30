import type { SectionKind } from "./types";

/** Lowercase, drop punctuation/decoration and collapse spaces so headings compare reliably. */
export function normalizeHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/[:：]+\s*$/, "")
    .replace(/[^a-z&\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HEADINGS: Record<Exclude<SectionKind, "contact">, string[]> = {
  summary: [
    "summary", "profile", "professional summary", "career summary", "executive summary", "personal summary",
    "profile summary", "professional profile", "personal profile", "about me", "about", "objective",
    "career objective", "professional objective", "job objective", "overview", "career profile", "summary of qualifications",
  ],
  experience: [
    "experience", "work experience", "professional experience", "employment history", "work history",
    "employment", "career history", "professional background", "relevant experience", "employment experience",
    "work experience and internships", "internships", "internship experience", "industry experience",
    "career experience", "experience summary", "job history", "professional history",
  ],
  education: [
    "education", "academic qualifications", "qualifications", "academic background", "educational background",
    "education and training", "academics", "academic record", "educational qualifications", "academic profile",
    "education qualification", "education and qualifications", "academic history",
  ],
  skills: [
    "skills", "technical skills", "core competencies", "key skills", "core skills", "skills summary", "areas of expertise",
    "expertise", "competencies", "technical expertise", "professional skills", "skills and tools", "tools and technologies",
    "technologies", "skills and abilities", "skill set", "skillset", "technical proficiencies", "it skills", "soft skills",
    "skills and competencies", "key competencies",
  ],
  projects: [
    "projects", "personal projects", "academic projects", "key projects", "selected projects", "project experience",
    "technical projects", "notable projects", "side projects", "portfolio", "final year project", "fyp",
  ],
  certifications: [
    "certifications", "certificates", "licenses and certifications", "certifications and licenses", "courses",
    "training", "trainings", "courses and certifications", "professional certifications", "training and certifications",
    "certifications and courses", "licences and certifications", "professional development", "workshops",
  ],
  languages: ["languages", "language skills", "language proficiency", "spoken languages"],
  references: ["references", "reference", "referees", "professional references"],
  personal: [
    "personal information", "personal details", "personal data", "personal particulars", "bio data", "biodata",
    "personal info", "contact", "contact information", "contact details", "contact me",
  ],
  other: [
    "awards", "honors", "honours", "awards and honors", "achievements", "accomplishments", "awards and achievements",
    "interests", "hobbies", "hobbies and interests", "volunteer", "volunteering", "volunteer experience", "publications",
    "extracurricular activities", "extra curricular activities", "co curricular activities", "activities",
    "leadership", "leadership and activities", "declaration", "additional information", "other", "miscellaneous",
    "scholarships", "affiliations", "memberships", "community involvement", "key achievements", "research",
  ],
};

export const HEADING_MAP: Map<string, SectionKind> = new Map(
  (Object.entries(HEADINGS) as [SectionKind, string[]][]).flatMap(([kind, names]) => names.map((n) => [n, kind] as const)),
);

export function lookupHeading(text: string): SectionKind | undefined {
  return HEADING_MAP.get(normalizeHeading(text));
}

/** Title lines that precede the contact block and are never the candidate's name. */
export const DOC_TITLES = new Set(["resume", "curriculum vitae", "cv", "my resume", "resume of", "curriculum vitae of"]);

/** Irregular past forms; regular forms are derived in pastForm(). */
const IRREGULAR_PAST: Record<string, string> = {
  lead: "led", build: "built", run: "ran", write: "wrote", make: "made", drive: "drove", grow: "grew", win: "won",
  teach: "taught", oversee: "oversaw", sell: "sold", begin: "began", spend: "spent", bring: "brought", hold: "held",
  undertake: "undertook", withstand: "withstood", take: "took", give: "gave", find: "found", keep: "kept", send: "sent",
  speak: "spoke", draw: "drew", choose: "chose", rebuild: "rebuilt", overhaul: "overhauled", set: "set", cut: "cut",
  put: "put", spearhead: "spearheaded", shrink: "shrank", slash: "slashed", forecast: "forecast", broadcast: "broadcast",
};
const DOUBLE_FINAL = new Set(["plan", "ship", "map", "drop", "program", "submit", "refer", "stop", "equip", "scan", "model", "label", "travel"]);

// Base forms, en-US with en-GB variants listed explicitly.
const VERB_BASES = (
  "achieve accelerate administer advise analyze analyse architect assemble assess assist audit author automate boost " +
  "budget build calculate chair clarify coach collaborate compile complete conceive conduct configure consolidate " +
  "construct consult contribute control convert coordinate create cultivate deliver demonstrate deploy design " +
  "detect determine develop devise diagnose direct document draft drive edit eliminate enable engineer enhance " +
  "ensure establish estimate evaluate execute expand expedite facilitate finalize finalise forecast formulate foster " +
  "generate guide handle identify implement improve increase initiate innovate inspect install integrate interview " +
  "introduce investigate launch lead leverage maintain manage map mentor migrate minimize minimise model monitor " +
  "motivate navigate negotiate onboard operate optimize optimise orchestrate organize organise oversee partner " +
  "perform pilot plan present prioritize prioritise process procure produce program promote propose prototype provide " +
  "publish raise rebuild recommend reconcile recruit redesign reduce refactor refine regulate release reorganize " +
  "reorganise replace report research resolve restructure retain review revise revamp run safeguard save schedule " +
  "secure select serve simplify solve source spearhead standardize standardise streamline strengthen submit supervise " +
  "support sustain synthesize teach test track train transform translate troubleshoot upgrade utilize utilise validate " +
  "verify visualize visualise write secure win earn exceed outperform operationalize digitize digitise cut " +
  "decrease grow resolve rewrite scale ship spin triage unify volunteer represent organise attend"
).split(/\s+/);

export function pastForm(base: string): string {
  const irregular = IRREGULAR_PAST[base];
  if (irregular) return irregular;
  if (base.endsWith("e")) return `${base}d`;
  if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}ied`;
  if (DOUBLE_FINAL.has(base)) return `${base}${base.slice(-1)}ed`;
  return `${base}ed`;
}

export const ACTION_VERBS_BASE = new Set(VERB_BASES);
export const ACTION_VERBS_PAST = new Set([...ACTION_VERBS_BASE].map(pastForm));
/** Third-person present ("manages") also counts as an action verb. */
const ACTION_VERBS_3P = new Set(
  [...ACTION_VERBS_BASE].map((b) => (/(?:s|x|z|ch|sh)$/.test(b) ? `${b}es` : /[^aeiou]y$/.test(b) ? `${b.slice(0, -1)}ies` : `${b}s`)),
);

export type VerbForm = "past" | "present" | "none";
/** Classify the first word of a bullet. */
export function verbForm(firstWord: string): VerbForm {
  const w = firstWord.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "none";
  if (ACTION_VERBS_PAST.has(w)) return "past";
  if (ACTION_VERBS_BASE.has(w) || ACTION_VERBS_3P.has(w)) return "present";
  return "none";
}

export const BUZZWORDS = [
  "hard-working", "hardworking", "hard working", "team player", "synergy", "go-getter", "go getter", "result-oriented",
  "results-oriented", "result oriented", "dynamic", "self-motivated", "self motivated", "detail-oriented", "detail oriented",
  "passionate", "think outside the box", "out-of-the-box", "motivated", "proactive", "fast learner", "quick learner",
  "highly motivated", "excellent communication skills", "jack of all trades", "guru", "ninja", "rockstar", "responsible for",
];

export const OBJECTIVE_CLICHES = [
  /seeking a (?:challenging|rewarding|suitable|responsible)/i,
  /(?:challenging|rewarding) (?:position|role|opportunity|career)/i,
  /(?:to )?utili[sz]e my (?:skills|knowledge|abilities)/i,
  /(?:grow|growth) (?:with|within) (?:a|an|the) (?:reputable|dynamic|progressive|leading)/i,
  /(?:reputable|reputed|progressive|esteemed) (?:organi[sz]ation|company|firm|institution)/i,
  /to (?:obtain|secure|get) a (?:position|job|role)/i,
  /looking for (?:a )?(?:challenging|suitable) /i,
];

/** Capital "I" only when standing alone (not "I/O", "Phase I."), plus my/me/myself in any case of the first letter. */
export const FIRST_PERSON_RE = /(?<![\w/.-])I(?![\w/.+#-])|\b(?:[Mm]y|[Mm]e|[Mm]yself)\b/;

/** [US stem, UK stem, suffix alternatives]; matched as whole words. */
const SPELLING_STEMS: [string, string, string][] = [
  ["organiz", "organis", "e|ed|es|ing|ation|ations|er|ers"],
  ["analyz", "analys", "e|ed|es|ing|er|ers"],
  ["optimiz", "optimis", "e|ed|es|ing|ation"],
  ["recogniz", "recognis", "e|ed|es|ing"],
  ["realiz", "realis", "e|ed|es|ing"],
  ["summariz", "summaris", "e|ed|es|ing"],
  ["utiliz", "utilis", "e|ed|es|ing|ation"],
  ["prioritiz", "prioritis", "e|ed|es|ing"],
  ["customiz", "customis", "e|ed|es|ing|ation"],
  ["standardiz", "standardis", "e|ed|es|ing|ation"],
  ["minimiz", "minimis", "e|ed|es|ing"],
  ["maximiz", "maximis", "e|ed|es|ing"],
  ["modeliz", "modelis", "e|ed|es|ing"],
  ["finaliz", "finalis", "e|ed|es|ing"],
  ["specializ", "specialis", "e|ed|es|ing|ation"],
  ["authoriz", "authoris", "e|ed|es|ing|ation"],
  ["color", "colour", "s|ed|ing|ful"],
  ["behavior", "behaviour", "s|al"],
  ["center", "centre", "s|ed"],
  ["labor", "labour", "s|ed"],
  ["favor", "favour", "s|ed|able"],
  ["catalog", "catalogue", "s|ed"],
  ["defense", "defence", ""],
  ["fulfill", "fulfil", "s|ed|ing|ment"],
  ["enroll", "enrol", "s|ed|ing|ment"],
  ["judgment", "judgement", "s"],
  ["model", "modell", "ing|ed"],
  ["travel", "travell", "ing|ed|er|ers"],
];
/** Stems whose bare form is a common word (model, travel), so a suffix is mandatory. */
const SUFFIX_REQUIRED = new Set(["model", "travel"]);
export const SPELLING_PAIRS = SPELLING_STEMS.map(([us, uk, suf]) => {
  const tail = suf ? `(?:${suf})${SUFFIX_REQUIRED.has(us) ? "" : "?"}` : "";
  return {
    us,
    uk,
    usRe: new RegExp(String.raw`\b${us}${tail}\b`, "i"),
    ukRe: new RegExp(String.raw`\b${uk}${tail}\b`, "i"),
  };
});

/** Acronym <-> spelled-out pairs (R7). SQL is acronym-only, so it is intentionally absent. */
export const ACRONYM_PAIRS: { acronym: string; full: string }[] = [
  { acronym: "SEO", full: "Search Engine Optimization" },
  { acronym: "CRM", full: "Customer Relationship Management" },
  { acronym: "ERP", full: "Enterprise Resource Planning" },
  { acronym: "KPI", full: "Key Performance Indicator" },
  { acronym: "ROI", full: "Return on Investment" },
  { acronym: "API", full: "Application Programming Interface" },
  { acronym: "CMS", full: "Content Management System" },
  { acronym: "PPC", full: "Pay-Per-Click" },
  { acronym: "SaaS", full: "Software as a Service" },
  { acronym: "QA", full: "Quality Assurance" },
  { acronym: "HR", full: "Human Resources" },
  { acronym: "AWS", full: "Amazon Web Services" },
  { acronym: "NLP", full: "Natural Language Processing" },
  { acronym: "SDLC", full: "Software Development Life Cycle" },
  { acronym: "OOP", full: "Object-Oriented Programming" },
  { acronym: "ETL", full: "Extract, Transform, Load" },
  { acronym: "MIS", full: "Management Information System" },
  { acronym: "SEM", full: "Search Engine Marketing" },
  { acronym: "B2B", full: "Business to Business" },
  { acronym: "UX", full: "User Experience" },
  { acronym: "UI", full: "User Interface" },
  { acronym: "GAAP", full: "Generally Accepted Accounting Principles" },
];

export type EducationLevel =
  | "SECONDARY"
  | "HIGHER_SECONDARY"
  | "DIPLOMA"
  | "BACHELOR"
  | "MASTER"
  | "MPHIL"
  | "DOCTORATE";

/** Highest level first. Short abbreviations are case-sensitive so words like "be" or "ma" do not match. */
const LEVEL_PATTERNS: [EducationLevel, RegExp][] = [
  ["DOCTORATE", /\bPh\.?\s?D\b|\bDoctor(?:ate)?\b|\bDPhil\b/i],
  ["MPHIL", /\bM\.?\s?Phil\b/i],
  ["MASTER", /\b(?:Master(?:s|'s)?|MSc|M\.Sc\.?|MBA|MS|M\.S\.?|MA|M\.A\.?|MCS|MIT|MEng|M\.E\.?|MPA|LLM|MCom|M\.Com)\b/],
  ["MASTER", /\bMaster/i],
  ["BACHELOR", /\b(?:Bachelor(?:s|'s)?|BSc|B\.Sc\.?|BS|B\.S\.?|BE|B\.E\.?|BBA|MBBS|LLB|BA|B\.A\.?|BCom|B\.Com|BEng|BTech|B\.Tech|BDS|Pharm-?D|DPT)\b|\bBS[A-Z]{2,3}\b/],
  ["BACHELOR", /\bBachelor/i],
  ["DIPLOMA", /\b(?:DAE|Diploma|Associate Degree|Post[- ]?graduate Diploma|PGD)\b/i],
  ["HIGHER_SECONDARY", /\b(?:FSc|F\.Sc\.?|ICS|I\.?Com|ICom|FA|F\.A\.?|HSSC|Intermediate|A[- ]?Levels?|Higher Secondary|Pre[- ]?Engineering|Pre[- ]?Medical)\b/i],
  ["SECONDARY", /\b(?:Matric(?:ulation)?|Metric|SSC|O[- ]?Levels?|Secondary School|Secondary)\b/i],
];
// Abbreviations in patterns above are only trusted when written upper/mixed case; lowercase words
// like "ma" or "be" are filtered below.
const AMBIGUOUS_LOWER = new Set(["ms", "ma", "be", "ba", "fa", "mit", "ics", "bs", "mba"]);

export function educationLevel(text: string): EducationLevel | undefined {
  for (const [level, re] of LEVEL_PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    if (AMBIGUOUS_LOWER.has(m[0].toLowerCase()) && m[0] === m[0].toLowerCase()) continue;
    return level;
  }
  return undefined;
}

/** Words that mark an institution name. */
export const INSTITUTION_RE =
  /\b(?:university|college|institute|school|academy|polytechnic|campus|nust|nuces|comsats|lums|iba|uet|giki|ned|aku|pieas|bahria|iqra|szabist|superior|cadet|board|iub|iiui|riphah|ucp|umt|uol|gcu|fccu)\b/i;

export const JOB_TITLE_RE =
  /\b(?:engineer|developer|manager|officer|analyst|intern|lead|head|director|consultant|designer|executive|assistant|specialist|coordinator|administrator|accountant|teacher|lecturer|professor|associate|supervisor|architect|technician|representative|scientist|writer|trainee|president|founder|co-founder|owner|agent|clerk|programmer|tester|instructor|trainer|advisor|adviser|auditor|editor|strategist|planner|operator|recruiter|nurse|doctor|pharmacist|salesman|sales|fellow|researcher|freelancer|volunteer|apprentice|cashier|receptionist|secretary|principal|controller|ceo|cto|cfo|coo|vp|sde|swe|devops|qa|ux|ui)\b/i;

export const COMPANY_RE =
  /\b(?:ltd|limited|inc|llc|llp|corp|corporation|company|co\.|pvt|private|technologies|technology|solutions|bank|systems|group|software|services|studio|studios|labs|agency|enterprises|industries|international|global|associates|consulting|network|networks|holdings|telecom|foundation|hospital|school|university|college|institute|partners|ventures|tech|soft|works)\b/i;

import { SKILLS, TAXONOMY_VERSION, type SkillEntry } from "./taxonomy-data";

export { TAXONOMY_VERSION };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Word edges that also respect C++, C#, Node.js and "CI/CD". */
const termRe = (term: string, flags: string) => new RegExp(`(?<![\\w+#.])${escapeRe(term).replace(/\s+/g, "\\s+")}(?![\\w+#]|\\.\\w)`, flags);

const compiled = SKILLS.map((s) => ({
  entry: s,
  // Case matters only for single tokens ("Go", "React", "AML"). A multi-word phrase can't be mistaken for an everyday word.
  res: [s.label, ...s.aliases].map((t) => ({
    re: termRe(t, s.guard?.caseSensitive && !/\s/.test(t.trim()) ? "" : "i"),
    // Plain words like "Go" or "Spring" need context. "golang", "Node.js" and "Spring Framework" don't.
    plainWord: /^[A-Za-z]+$/.test(t) && (t === s.label || /^[A-Z]/.test(t)),
  })),
  context: s.guard?.requireContext?.map((c) => termRe(c, "i")),
}));
const byId = new Map(compiled.map((c) => [c.entry.id, c]));

/** "Go, Python, Docker": in a comma-separated list a capitalized word is a skill, not an everyday word. */
const isList = (text: string) => (text.match(/,/g) ?? []).length >= 2 && text.length / ((text.match(/,/g) ?? []).length + 1) < 30;

function hits(c: (typeof compiled)[number], text: string): boolean {
  const found = c.res.filter((r) => r.re.test(text));
  if (!found.length) return false;
  if (!c.context || found.some((r) => !r.plainWord)) return true;
  return isList(text) || c.context.some((re) => re.test(text));
}

/** Skills proved by a skill: itself plus everything it implies, transitively. */
function closure(id: string, seen = new Set<string>()): Set<string> {
  if (seen.has(id)) return seen;
  seen.add(id);
  for (const p of byId.get(id)?.entry.implies ?? []) closure(p, seen);
  return seen;
}

/** Map a term from a job post to the dictionary. A requirement isn't guarded by context: the post already said it. */
export function canonicalize(term: string): SkillEntry | undefined {
  const t = term.trim().toLowerCase();
  return SKILLS.find((s) => s.label.toLowerCase() === t || s.aliases.some((a) => a.toLowerCase() === t));
}

/** Does this text show the term? Via the dictionary (aliases, children imply parents) or, for unknown terms, the literal words. */
export function textShows(text: string, term: string): boolean {
  const entry = canonicalize(term);
  if (!entry) return termRe(term.trim(), "i").test(text);
  for (const c of compiled) {
    if (closure(c.entry.id).has(entry.id) && hits(c, text)) return true;
  }
  return false;
}

/** Does the text use the term's own words, rather than a skill that implies it? */
export function textNames(text: string, term: string): boolean {
  return termRe(term.trim(), "i").test(text);
}

/** Every dictionary skill mentioned in a text (used for skills-list normalization and tests). */
export function skillsIn(text: string): string[] {
  return compiled.filter((c) => hits(c, text)).map((c) => c.entry.id);
}

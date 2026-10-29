// Tiny local skill dictionary for the demo. The real app uses the taxonomy in PRD 05 §4.
// Each entry: canonical name + patterns that count as a hit (aliases).

export interface SkillDef {
  name: string;
  patterns: RegExp[];
}

export const SKILLS: SkillDef[] = [
  { name: "React", patterns: [/\breact(\.?js)?\b(?! testing)/i] },
  { name: "TypeScript", patterns: [/\btypescript\b/i] },
  { name: "JavaScript", patterns: [/\bjavascript\b/i, /\bes6\b/i] },
  { name: "Next.js", patterns: [/\bnext\.?js\b/i] },
  { name: "Node.js", patterns: [/\bnode(\.?js)?\b/i, /\bexpress\b/i] },
  { name: "REST APIs", patterns: [/\brest(ful)?\b/i] },
  { name: "GraphQL", patterns: [/\bgraphql\b/i] },
  { name: "Redux", patterns: [/\bredux\b/i, /\bzustand\b/i] },
  { name: "Jest", patterns: [/\bjest\b/i, /\btesting library\b/i, /\bunit tests?\b/i] },
  { name: "Testing", patterns: [/\btest(s|ing)?\b/i] },
  { name: "HTML", patterns: [/\bhtml5?\b/i] },
  { name: "CSS", patterns: [/\bcss3?\b/i, /\btailwind\b/i, /\bsass\b/i] },
  { name: "Tailwind", patterns: [/\btailwind\b/i] },
  { name: "Git", patterns: [/\bgit\b/i, /\bgithub\b/i] },
  { name: "Docker", patterns: [/\bdocker\b/i, /\bcontainer/i] },
  { name: "Kubernetes", patterns: [/\bkubernetes\b/i, /\bk8s\b/i] },
  { name: "AWS", patterns: [/\baws\b/i, /\bamazon web services\b/i] },
  { name: "SQL", patterns: [/\bsql\b/i, /\bpostgres(ql)?\b/i, /\bmysql\b/i] },
  { name: "Python", patterns: [/\bpython\b/i] },
  { name: "PHP", patterns: [/\bphp\b/i, /\blaravel\b/i] },
  { name: "Vue", patterns: [/\bvue(\.?js)?\b/i] },
  { name: "Angular", patterns: [/\bangular\b/i] },
  { name: "Accessibility", patterns: [/\baccessib/i, /\bwcag\b/i, /\ba11y\b/i] },
  { name: "Performance", patterns: [/\bperformance\b/i, /\bweb vitals\b/i] },
  { name: "CI/CD", patterns: [/\bci\/cd\b/i, /\bgithub actions\b/i, /\bpipelines?\b/i] },
  { name: "Figma", patterns: [/\bfigma\b/i] },
  { name: "Design systems", patterns: [/\bdesign systems?\b/i, /\bcomponent librar/i, /\breusable components?\b/i] },
  { name: "Data visualization", patterns: [/\bdata visuali[sz]ation\b/i, /\bcharts?\b/i, /\bd3\b/i] },
  { name: "PWA", patterns: [/\bpwa\b/i, /\bservice workers?\b/i, /\boffline-first\b/i] },
];

/** Requirements a resume can't prove either way (PRD 05 §5.2 UNKNOWN). */
export const UNVERIFIABLE = /communicat|team ?player|self.?motivated|passion|attitude|willing|availab|fast learner|problem.solving|ownership|detail.oriented|work independently|english/i;

export const YEARS = /(\d+)\s*\+?\s*(?:-\s*\d+\s*)?(?:years?|yrs?)/i;
export const DEGREE = /\b(bs|bsc|b\.s\.|be|bachelor'?s?|degree|ms|msc|master'?s?)\b/i;

export function skillsIn(text: string): SkillDef[] {
  const found = SKILLS.filter((s) => s.patterns.some((p) => p.test(text)));
  // "Testing" and "CSS" are umbrella entries: drop them when a more specific hit exists.
  const names = new Set(found.map((s) => s.name));
  return found.filter((s) => !(s.name === "Testing" && names.has("Jest")) && !(s.name === "CSS" && names.has("Tailwind") && !/\bcss\b/i.test(text)));
}

export function skillDef(name: string): SkillDef | undefined {
  return SKILLS.find((s) => s.name.toLowerCase() === name.toLowerCase());
}

/** Does `text` mention the skill (by alias) or the raw requirement words? */
export function mentions(text: string, skill: string): boolean {
  const def = skillDef(skill);
  if (def) return def.patterns.some((p) => p.test(text));
  const s = skill.trim().toLowerCase();
  return s.length > 1 && text.toLowerCase().includes(s);
}

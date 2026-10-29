import type { ResumeSection } from "@/demo/types";

export interface ParsedResume {
  contact: { label: string; value: string; note?: string }[];
  experience: { heading: string; title: string; org: string; dates: string; bullets: string[] }[];
  skills: string[];
  education: string[];
  projects: string[];
  /** Headings we mapped to a standard section by guessing. */
  guessed: { heading: string; as: string }[];
}

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
const PHONE = /\+?\d[\d\sx-]{8,}\d|\+?\d[\dx\s-]{8,}/i;

export function maskEmail(e: string) {
  const [u, d] = e.split("@");
  return `${u.slice(0, 1)}•••@${d}`;
}

export function maskPhone(p: string) {
  const digits = p.replace(/[^\dx]/gi, "");
  return `${p.trim().slice(0, 3)} ••• ••••${digits.slice(-2)}`;
}

const STANDARD: [RegExp, string][] = [
  [/^(experience|work experience|employment|professional experience)$/i, "Experience"],
  [/^(education|academic)/i, "Education"],
  [/^skills?/i, "Skills"],
  [/^projects?/i, "Projects"],
  [/^summary|^profile|^objective/i, "Summary"],
];
const GUESS_EXPERIENCE = /journey|career|work|history/i;

function classify(heading: string): { kind: string; guessed: boolean } {
  for (const [re, kind] of STANDARD) if (re.test(heading.trim())) return { kind, guessed: false };
  if (GUESS_EXPERIENCE.test(heading)) return { kind: "Experience", guessed: true };
  return { kind: "Other", guessed: false };
}

/** Deterministic, display-only reading of the sample's sections (stands in for the real parser). */
export function parseSections(sections: ResumeSection[]): ParsedResume {
  const out: ParsedResume = { contact: [], experience: [], skills: [], education: [], projects: [], guessed: [] };

  const header = sections[0];
  if (header) {
    const tokens = header.lines.flatMap((l) => l.split(" · ").map((t) => t.trim()));
    const [name, ...rest] = tokens;
    if (name) out.contact.push({ label: "Name", value: name });
    for (const t of rest) {
      if (EMAIL.test(t)) out.contact.push({ label: "Email", value: maskEmail(t.match(EMAIL)![0]) });
      else if (/cnic/i.test(t)) out.contact.push({ label: "CNIC", value: "Found and hidden", note: "Never sent to AI and never needed on a resume." });
      else if (/linkedin|github/i.test(t)) out.contact.push({ label: "Link", value: t });
      else if (PHONE.test(t)) out.contact.push({ label: "Phone", value: maskPhone(t) });
      else out.contact.push({ label: "Location", value: t });
    }
  }

  for (const s of sections.slice(1)) {
    const { kind, guessed } = classify(s.heading);
    if (guessed) out.guessed.push({ heading: s.heading, as: kind });
    if (kind === "Experience") {
      let cur: ParsedResume["experience"][number] | null = null;
      for (const line of s.lines) {
        const m = /^(.+?) — (.+?) · (.+)$/.exec(line);
        if (m) {
          cur = { heading: s.heading, title: m[1], org: m[2], dates: m[3], bullets: [] };
          out.experience.push(cur);
        } else cur?.bullets.push(line);
      }
    } else if (kind === "Skills") out.skills.push(...s.lines.flatMap((l) => l.split(",").map((x) => x.trim()).filter(Boolean)));
    else if (kind === "Education") out.education.push(...s.lines);
    else if (kind === "Projects") out.projects.push(...s.lines);
  }
  return out;
}

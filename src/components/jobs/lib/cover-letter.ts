// Local cover-letter template. Uses ONLY profile/resume facts plus the job's title and company.
// Anything about the company itself is a visible [placeholder] (PRD 02 CVL-003, CVL-009).

import type { CoverLetter, Experience, Job, Profile, Project, User } from "@/demo/types";
import type { EffectiveRequirement } from "./match";
import { professionalMonths } from "./match";
import { mentions } from "./skills";

export type Length = CoverLetter["length"];
export type Tone = CoverLetter["tone"];

export interface LetterInput {
  user: User;
  profile: Profile;
  job: Job;
  reqs: EffectiveRequirement[];
  experiences: Experience[];
  projects: Project[];
  length: Length;
  tone: Tone;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const noDot = (s: string) => s.replace(/[.\s]+$/, "");

/** "Built 14 screens." → "I built 14 screens" (first person, the user's own words). */
function firstPerson(bullet: string) {
  const b = noDot(bullet);
  if (/^responsible for/i.test(b)) return `I was ${lowerFirst(b)}`;
  return `I ${lowerFirst(b)}`;
}

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function experienceTotal(profile: Profile) {
  const m = professionalMonths(profile);
  const y = Math.floor(m / 12);
  if (y < 1) return null;
  return m % 12 >= 6 ? `over ${y} year${y === 1 ? "" : "s"}` : `${y} year${y === 1 ? "" : "s"}`;
}

export function writeLetter(i: LetterInput): string {
  const { job, profile, user, length, tone } = i;
  const company = job.company || "your team";
  const bulletsPer = length === "SHORT" ? 1 : length === "MEDIUM" ? 2 : 3;
  const strongMust = i.reqs.filter((r) => r.type === "MUST_HAVE" && r.cls === "STRONG" && r.evidence);
  const jobSkills = Array.from(new Set(strongMust.map((r) => r.skill))).filter((s) => s.length < 30);
  const total = experienceTotal(profile);
  const current = i.experiences[0];

  const greeting = tone === "FRIENDLY" ? "Hi [hiring manager's name]," : "Dear [hiring manager's name],";

  const opening =
    tone === "PROFESSIONAL"
      ? `I am writing to apply for the ${job.title} role at ${company}.`
      : tone === "FRIENDLY"
        ? `I was glad to see the ${job.title} opening at ${company}, and I'd love to be considered.`
        : `I'm applying for the ${job.title} role at ${company}, and my experience lines up closely with what you're looking for.`;
  const intro = current
    ? `${opening} I currently work as a ${current.title} at ${current.employer}${total ? `, with ${total} of full-time experience` : ""}.`
    : opening;

  const paragraphs: string[] = [intro];

  // One paragraph per selected experience, preferring bullets that match the job.
  i.experiences.forEach((e, idx) => {
    const ranked = [...e.bullets].sort((a, b) => Number(jobSkills.some((s) => mentions(b, s))) - Number(jobSkills.some((s) => mentions(a, s))));
    const picked = ranked.slice(0, idx === 0 ? bulletsPer : Math.max(1, bulletsPer - 1));
    if (!picked.length) return;
    const lead = idx === 0 ? `At ${e.employer}, ` : `Before that, as a ${e.title} at ${e.employer}, `;
    const sentences = picked.map((b, n) => (n === 0 ? `${lead}${firstPerson(b)}.` : `${firstPerson(b)}.`));
    paragraphs.push(sentences.join(" "));
  });

  if (i.projects.length && length !== "SHORT") {
    const p = i.projects.map((x) => `${x.name} (${lowerFirst(noDot(x.summary))}, built with ${list(x.tech)})`);
    paragraphs.push(`Outside work, I built ${list(p)}.`);
  }

  if (length === "LONG") {
    const facts = profile.factBank.filter((f) => f.source === "USER").slice(0, 1);
    facts.forEach((f) => paragraphs.push(`${firstPerson(f.fact)}.`));
  }

  if (jobSkills.length) {
    const fit =
      tone === "CONFIDENT"
        ? `Your posting asks for ${list(jobSkills.slice(0, 3))}, and each of these shows up in my day-to-day work.`
        : `Your posting asks for ${list(jobSkills.slice(0, 3))}, which I have used in my work so far.`;
    paragraphs.push(`${fit} I'm drawn to ${company} because [one thing you admire about ${company}].`);
  } else {
    paragraphs.push(`I'm drawn to ${company} because [one thing you admire about ${company}].`);
  }

  const closing =
    tone === "PROFESSIONAL"
      ? "Thank you for considering my application. I would welcome the chance to discuss how I can contribute to your team."
      : tone === "FRIENDLY"
        ? "Thanks for reading. I'd be happy to chat whenever suits you."
        : "I'd welcome a conversation about how I can help your team ship. Thank you for your time.";
  paragraphs.push(closing);

  const signOff = tone === "FRIENDLY" ? "Best regards," : "Sincerely,";
  return `${greeting}\n\n${paragraphs.join("\n\n")}\n\n${signOff}\n${user.name}`;
}

export function placeholdersIn(text: string): string[] {
  return Array.from(new Set(text.match(/\[[^\]]+\]/g) ?? []));
}

export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

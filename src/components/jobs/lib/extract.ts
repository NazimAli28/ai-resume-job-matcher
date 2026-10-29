// Simulated job extraction for the demo. The real app runs a deterministic pre-pass and then
// Haiku (PRD 02 JOB-003). Here: headings, "-" bullet lines and a few patterns. Text is data only.

import type { Job, JobRequirement, Profile, RequirementType, ResumeVersion } from "@/demo/types";
import { classify } from "./match";
import { skillsIn } from "./skills";

export interface DraftRequirement {
  key: string;
  text: string;
  type: RequirementType;
}

export interface Extracted {
  title: string;
  company: string;
  location: string;
  workMode: Job["workMode"];
  salary: string;
  requirements: DraftRequirement[];
}

const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Peshawar", "Faisalabad", "Multan", "Quetta", "Sialkot", "Hyderabad", "Dubai", "Riyadh", "London"];
const BULLET = /^\s*[-•*–]\s+/;
const NICE_HEADING = /nice to have|nice-to-have|preferred|bonus|good to have|a plus|plus points/i;
const MUST_HEADING = /requirement|must have|must-have|qualifications|what we.?re looking for|you have|skills/i;
const SKIP_HEADING = /responsibilit|what you.?ll do|about (us|the role|the company)|benefits|we offer|perks|how to apply/i;

function field(lines: string[], label: RegExp): string {
  for (const l of lines) {
    const m = l.match(label);
    if (m) return m[1].trim();
  }
  return "";
}

export function extractJob(text: string): Extracted {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  let title = field(nonEmpty, /^(?:job title|title|role|position)\s*[:\-]\s*(.+)$/i);
  if (!title) {
    const m = text.match(/\b(?:hiring|looking for|seeking)\s+(?:an?\s+)?((?:senior |junior |lead )?[A-Z][\w.+#/ ]{2,40}?(?:developer|engineer|designer|manager|analyst|intern|specialist|lead))\b/i);
    if (m) title = m[1].trim();
  }
  if (!title && nonEmpty[0] && nonEmpty[0].length <= 60 && !BULLET.test(nonEmpty[0])) title = nonEmpty[0];

  let company = field(nonEmpty, /^(?:company|employer|organi[sz]ation)\s*[:\-]\s*(.+)$/i);
  if (!company) {
    const m = text.match(/\b(?:at|join)\s+([A-Z][\w&.]*(?:\s+[A-Z][\w&.]*){0,3})/);
    if (m) company = m[1].replace(/[.,]$/, "");
  }

  const location = field(nonEmpty, /^location\s*[:\-]\s*(.+)$/i) || CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(text)) || "";
  const workMode: Job["workMode"] = /\bremote\b/i.test(text) ? "Remote" : /\bhybrid\b/i.test(text) ? "Hybrid" : "On-site";
  const salary = field(nonEmpty, /^(?:salary|compensation|pay)\s*[:\-]\s*(.+)$/i) || (text.match(/\b(?:PKR|Rs\.?|USD|\$)\s?[\d,.]+k?(?:\s?[–-]\s?[\d,.]+k?)?(?:\s?\/\s?\w+)?/i)?.[0] ?? "");

  const requirements: DraftRequirement[] = [];
  let type: RequirementType = "MUST_HAVE";
  let skip = false;
  lines.forEach((l, i) => {
    if (!l) return;
    if (!BULLET.test(l)) {
      if (NICE_HEADING.test(l)) { type = "NICE_TO_HAVE"; skip = false; }
      else if (SKIP_HEADING.test(l)) skip = true;
      else if (MUST_HEADING.test(l)) { type = "MUST_HAVE"; skip = false; }
      return;
    }
    if (skip) return;
    const t = l.replace(BULLET, "").trim();
    if (t) requirements.push({ key: `d${i}`, text: t, type: NICE_HEADING.test(t) ? "NICE_TO_HAVE" : type });
  });

  return { title, company, location, workMode, salary, requirements };
}

/**
 * Turn reviewed draft lines into JobRequirements. A line naming several known skills
 * ("Strong React and TypeScript") becomes one requirement per skill, like the sample data.
 */
export function toRequirements(drafts: DraftRequirement[], profile: Profile, resume?: ResumeVersion): JobRequirement[] {
  const out: JobRequirement[] = [];
  drafts.forEach((d) => {
    const found = skillsIn(d.text);
    const skills = found.length && !/\d+\s*\+?\s*(years?|yrs?)/i.test(d.text) ? found.map((s) => s.name) : [d.text.replace(/[.;]$/, "")];
    skills.forEach((skill) => {
      out.push({ id: `r${out.length + 1}`, text: d.text, skill, type: d.type, ...classify(d.text, skill, profile, resume) });
    });
  });
  return out;
}

export const EXAMPLE_JOB = {
  description: `Frontend Engineer (React)
Company: Sukkur Fintech
Location: Karachi (hybrid, 3 days in office)
Salary: PKR 200k–260k / month

We're hiring a Frontend Engineer to build the web app our merchants use to track payments.

What you'll do:
- Build new screens for the merchant dashboard
- Work with designers and backend engineers

Requirements:
- 2+ years of professional frontend experience
- React and TypeScript
- Experience integrating REST APIs
- Writing unit tests
- Good communication skills

Nice to have:
- Next.js
- Docker
- GraphQL`,
  url: "https://example.com/careers/sukkur-frontend",
};

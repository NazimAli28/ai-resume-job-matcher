// Tailoring helpers: locally generated suggestions (for jobs without seeded ones) and
// applying accepted edits to a ResumeVersion. Never introduces facts the user hasn't given.

import type { Job, ResumeSection, ResumeVersion, Suggestion } from "@/demo/types";
import type { EffectiveRequirement } from "./match";
import { mentions, skillDef } from "./skills";

export const PLACEHOLDER = /\[[^\]]+\]/;

/** A QUESTION that asks whether the user has a missing skill. It inserts into Skills only once answered. */
export function isSkillQuestion(s: Suggestion) {
  return s.kind === "QUESTION" && s.before === "";
}

export function needsAnswer(s: Suggestion) {
  return s.kind === "QUESTION" && (isSkillQuestion(s) || PLACEHOLDER.test(s.after));
}

function skillsSection(resume: ResumeVersion) {
  return resume.sections.find((s) => /skill/i.test(s.heading));
}

/**
 * Small, honest suggestion set for a job, built in code from its PARTIAL/MISSING requirements:
 * reorder skills, ask about each missing skill, and reuse evidence-only rewrites of the user's own bullets.
 */
export function generateSuggestions(job: Job, reqs: EffectiveRequirement[], resume: ResumeVersion, seeded: Suggestion[]): Suggestion[] {
  const out: Suggestion[] = [];
  const id = (n: string) => `loc-${job.id}-${n}`;
  const skills = skillsSection(resume);
  const skillsLine = skills?.lines[0];

  // 1. Reorder skills so the job's requirements come first (wording-only).
  if (skills && skillsLine) {
    const items = skillsLine.split(/,\s*/);
    const wanted = reqs.filter((r) => r.cls !== "UNKNOWN").map((r) => r.skill);
    const score = (item: string) => {
      const i = wanted.findIndex((w) => mentions(item, w) || item.toLowerCase() === w.toLowerCase());
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    const sorted = items.map((it, i) => ({ it, i, s: score(it) })).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.it);
    if (sorted.join(", ") !== items.join(", ")) {
      out.push({
        id: id("reorder"), jobId: job.id, kind: "REORDER", section: skills.heading, before: skillsLine, after: sorted.join(", "),
        reason: "Puts the skills this job asks for first. Same skills, new order.",
        evidence: { section: skills.heading, text: skillsLine }, status: "PENDING", safe: true,
      });
    }
  }

  // 2. A question for each missing skill. Nothing is added unless the user answers.
  reqs
    .filter((r) => r.cls === "MISSING" && skillDef(r.skill))
    .forEach((r) => {
      out.push({
        id: id(`q-${r.id}`), jobId: job.id, kind: "QUESTION", section: skills?.heading ?? "Skills", before: "", after: r.skill,
        reason: `The job lists “${r.text}”. Your resume doesn't mention ${r.skill}, so we won't add it unless you tell us where you used it.`,
        question: `Have you used ${r.skill}? Where?`, status: "PENDING", safe: false,
      });
    });

  // 3. Evidence-only rewrites of the user's own bullets (no new facts), reused across jobs.
  const lines = new Set(resume.sections.flatMap((s) => s.lines));
  const seen = new Set<string>();
  seeded
    .filter((s) => s.kind === "REWRITE" && s.safe && lines.has(s.before))
    .forEach((s) => {
      if (seen.has(s.before)) return;
      seen.add(s.before);
      out.push({ ...s, id: id(`rw-${s.id}`), jobId: job.id, status: "PENDING", reason: `${s.reason} Rewritten from your own words only.` });
    });

  return out;
}

/** Apply accepted suggestions to sections. CNIC lines are always left out (product rule 4). */
export function applyEdits(resume: ResumeVersion, suggestions: Suggestion[]): ResumeSection[] {
  const accepted = suggestions.filter((s) => s.status === "ACCEPTED");
  const byLine = new Map(accepted.filter((s) => s.before).map((s) => [s.before, s]));
  const addSkills = accepted.filter(isSkillQuestion).map((s) => s.after);
  return resume.sections.map((sec) => {
    const lines = sec.lines
      .filter((l) => !/\bCNIC\b/i.test(l))
      .map((l) => {
        const s = byLine.get(l);
        return s ? s.after : l;
      });
    if (addSkills.length && /skill/i.test(sec.heading) && lines.length) {
      const have = lines[0];
      const extra = addSkills.filter((k) => !mentions(have, k));
      if (extra.length) lines[0] = `${have}, ${extra.join(", ")}`;
    }
    return { heading: sec.heading, lines };
  });
}

export function resumeAsText(sections: ResumeSection[]): string {
  return sections
    .map((s) => (s.heading === "Header" ? s.lines.join("\n") : `${s.heading}\n${s.lines.join("\n")}`))
    .join("\n\n");
}

export function nextLabel(resumes: ResumeVersion[]) {
  const max = resumes.reduce((m, r) => Math.max(m, Number(r.label.replace(/\D/g, "")) || 0), 0);
  return `v${max + 1}`;
}

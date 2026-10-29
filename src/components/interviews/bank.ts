// Local question bank for the demo. Questions are templates filled with the job's
// requirements and the user's real employers/projects. Nothing here is invented
// about the candidate: it only names things that exist in their profile.

import { TODAY } from "@/lib/dates";
import type {
  Difficulty, InterviewQuestion, InterviewSession, InterviewType, Job, Persona, Profile,
} from "@/demo/types";

export type Category =
  | "INTRO" | "MOTIVATION" | "GAP" | "CONFLICT" | "PRESSURE" | "FEEDBACK" | "LEARNING" | "LEADERSHIP"
  | "ACHIEVEMENT" | "CHALLENGE" | "QUALITY" | "PROJECT" | "TECH" | "AVAILABILITY" | "TEAM" | "STRENGTH"
  | "FUTURE" | "OTHER";

/** Category is derived from the question text so seeded sessions classify the same way as new ones. */
const CATEGORY_RULES: [RegExp, Category][] = [
  [/tell me about yourself/i, "INTRO"],
  [/^why /i, "MOTIVATION"],
  [/get up to speed/i, "GAP"],
  [/disagree/i, "CONFLICT"],
  [/deadline|under pressure|tight/i, "PRESSURE"],
  [/feedback|criticism/i, "FEEDBACK"],
  [/learn something new|learn.*quickly/i, "LEARNING"],
  [/ownership|beyond your/i, "LEADERSHIP"],
  [/proud of/i, "ACHIEVEMENT"],
  [/hardest|difficult (bug|problem)/i, "CHALLENGE"],
  [/why did you choose/i, "PROJECT"],
  [/reliable|how do you test|quality/i, "QUALITY"],
  [/when could you start/i, "AVAILABILITY"],
  [/stay in sync/i, "TEAM"],
  [/strength/i, "STRENGTH"],
  [/three years/i, "FUTURE"],
];

export function categoryOf(q: Pick<InterviewQuestion, "text" | "kind">): Category {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(q.text)) return cat;
  return q.kind === "TECHNICAL" ? "TECH" : "OTHER";
}

/** Categories whose good answers contain a result (used by the follow-up heuristic). */
export const NEEDS_RESULT: Category[] = ["ACHIEVEMENT", "CONFLICT", "CHALLENGE", "PRESSURE", "FEEDBACK", "LEARNING", "LEADERSHIP"];

export interface Tokens {
  company: string;
  role: string;
  employer: string;
  location: string;
  workMode: string;
  projects: { name: string; tech: string }[];
  skills: string[];
  gap?: string;
}

const GENERIC_SKILL = /yrs|years|degree|experience/i;

export function jobSkills(job: Job, profile: Profile): string[] {
  const fromJob = job.requirements
    .filter((r) => r.type === "MUST_HAVE" && !GENERIC_SKILL.test(r.skill))
    .map((r) => r.skill);
  const fromNice = job.requirements
    .filter((r) => r.type === "NICE_TO_HAVE" && !GENERIC_SKILL.test(r.skill) && r.matchClass === "STRONG")
    .map((r) => r.skill);
  const fromProfile = profile.skills.map((s) => s.name);
  return [...new Set([...fromJob, ...fromNice, ...fromProfile])];
}

export function tokensFor(job: Job, profile: Profile): Tokens {
  const gapReq =
    job.requirements.find((r) => r.matchClass === "MISSING" && !GENERIC_SKILL.test(r.skill) && r.type === "MUST_HAVE") ??
    job.requirements.find((r) => r.matchClass === "PARTIAL" && !GENERIC_SKILL.test(r.skill)) ??
    job.requirements.find((r) => r.matchClass === "MISSING" && !GENERIC_SKILL.test(r.skill)) ??
    job.requirements.find((r) => r.matchClass === "UNKNOWN" && !GENERIC_SKILL.test(r.skill));
  const skills = jobSkills(job, profile);
  return {
    company: job.company,
    role: job.title,
    employer: profile.experiences[0]?.employer ?? "your current employer",
    location: job.location,
    workMode: job.workMode,
    projects: profile.projects.map((p) => ({ name: p.name, tech: p.tech[0] ?? "that stack" })),
    skills: skills.length ? skills : ["your main language"],
    gap: gapReq?.skill,
  };
}

interface Item {
  kind: InterviewQuestion["kind"];
  text: string;
  why: string;
  targets: string;
}

const pad = (arr: string[], i: number) => arr[i % arr.length];

function behavioralPool(t: Tokens): Item[] {
  const a = pad(t.skills, 0);
  const testing = t.skills.find((s) => /test|jest/i.test(s)) ?? a;
  return [
    { kind: "BEHAVIORAL", text: `Tell me about a feature or project at ${t.employer} you're proud of. What was your part, and what was the result?`, why: "Checks ownership and whether you can show impact.", targets: `Resume: ${t.employer}` },
    { kind: "BEHAVIORAL", text: "Describe a time you disagreed with a teammate about a technical decision. What happened?", why: "Tests collaboration and how you handle conflict.", targets: "Teamwork" },
    { kind: "BEHAVIORAL", text: `Tell me about the hardest problem you've solved with ${a}. How did you approach it?`, why: `${a} is a must-have for this role, so they want a real example of depth.`, targets: `Skill: ${a}` },
    { kind: "BEHAVIORAL", text: `How do you make sure your ${a} work is reliable before it ships?`, why: "Checks your habits around quality and testing.", targets: `Skill: ${testing}` },
    { kind: "BEHAVIORAL", text: "Describe a time you had a tight deadline. How did you decide what to cut and what to keep?", why: "Tests prioritization under pressure.", targets: "Working under pressure" },
    { kind: "BEHAVIORAL", text: t.projects[0] ? `Tell me about a time you had to learn something new quickly, for example while building ${t.projects[0].name}.` : "Tell me about a time you had to learn something new quickly.", why: "Shows how you learn and whether you can ramp up on a new stack.", targets: t.projects[0] ? `Project: ${t.projects[0].name}` : "Learning" },
    { kind: "BEHAVIORAL", text: "Tell me about feedback that was hard to hear. What did you change afterwards?", why: "Checks self-awareness and growth.", targets: "Growth" },
    { kind: "BEHAVIORAL", text: "Describe a time you took ownership of something beyond your assigned tasks.", why: "Looks for initiative and follow-through.", targets: "Ownership" },
  ];
}

function technicalPool(t: Tokens): Item[] {
  const out: Item[] = [];
  const s = (i: number) => pad(t.skills, i);
  const skillQ = (i: number, n: 1 | 2 | 3 | 6 | 7): Item => {
    const k = s(i);
    const tpl = {
      1: [`How have you used ${k} in your work, and what trade-offs did you run into?`, "Probes real experience with a requirement, not definitions."],
      2: [`Explain ${k} to a teammate who hasn't used it. When would you choose it, and when wouldn't you?`, "Checks depth and whether you can explain clearly."],
      3: [`Walk me through how you'd track down a slow or buggy screen in a ${k} application.`, "Checks your debugging process step by step."],
      6: [`How do you keep a ${k} codebase maintainable as it grows?`, "Looks for judgment about structure, not memorized rules."],
      7: [`How do you test your ${k} work, and what do those tests catch?`, "Checks testing habits tied to a real stack."],
    }[n];
    return { kind: "TECHNICAL", text: tpl[0], why: tpl[1], targets: `Skill: ${k}` };
  };
  const projQ = (i: number): Item | undefined => {
    const p = t.projects[i];
    if (!p) return undefined;
    return {
      kind: "TECHNICAL",
      text: `On ${p.name}, why did you choose ${p.tech}? What would you change if you rebuilt it?`,
      why: "Probes a project from your resume to see whether the choices were yours.",
      targets: `Project: ${p.name}`,
    };
  };
  const gapQ: Item | undefined = t.gap
    ? {
        kind: "TECHNICAL",
        text: `The job mentions ${t.gap}, and your resume doesn't show it clearly. How would you get up to speed?`,
        why: "One honest gap question: interviewers like to hear a real plan, not a bluff.",
        targets: `Gap: ${t.gap}`,
      }
    : undefined;
  const seq: (Item | undefined)[] = [
    skillQ(0, 1), projQ(0), skillQ(1, 1), gapQ, skillQ(0, 2), skillQ(0, 7), skillQ(0, 3), skillQ(1, 2),
    skillQ(0, 6), projQ(1), skillQ(1, 3), skillQ(1, 6), skillQ(1, 7), skillQ(2, 1), skillQ(2, 2),
  ];
  for (const it of seq) if (it && !out.some((o) => o.text === it.text)) out.push(it);
  return out;
}

function hrPool(t: Tokens): Item[] {
  return [
    { kind: "HR", text: `Tell me about yourself and why you're interested in ${t.role} work at ${t.company}.`, why: "Opens the conversation and checks how well you connect your story to the role.", targets: "Role fit" },
    { kind: "HR", text: `Why ${t.company}, and why this role now?`, why: "Checks motivation and whether you looked into the company.", targets: `Company: ${t.company}` },
    { kind: "HR", text: `When could you start, and is there anything about ${t.location} (${t.workMode.toLowerCase()}) we should talk through?`, why: "Practical fit: notice period, location and work mode.", targets: "Logistics" },
    { kind: "HR", text: "What would your teammates say is your biggest strength, and what are you still working on?", why: "Checks self-awareness and honesty.", targets: "Self-awareness" },
    { kind: "HR", text: `How do you like to work with teammates and stay in sync on a ${t.workMode.toLowerCase()} team?`, why: "Checks working style against the job's work mode.", targets: `Work mode: ${t.workMode}` },
    { kind: "HR", text: "Where do you want to be in three years, and how would this role help?", why: "Checks whether your goals fit what the role offers.", targets: "Career direction" },
    { kind: "HR", text: `What's prompting you to look for a new role after your time at ${t.employer}?`, why: "Interviewers listen for reasons that are about moving toward something.", targets: `Resume: ${t.employer}` },
  ];
}

function fill(primary: Item[], extra: Item[][], n: number): Item[] {
  const out: Item[] = [];
  for (const it of [...primary, ...extra.flat()]) {
    if (out.length >= n) break;
    if (!out.some((o) => o.text === it.text)) out.push(it);
  }
  return out;
}

export interface SessionConfig {
  jobId: string;
  type: InterviewType;
  questionCount: 5 | 10 | 15;
  difficulty: Difficulty;
  persona: Persona;
}

export function buildQuestions(cfg: SessionConfig, job: Job, profile: Profile): InterviewQuestion[] {
  const t = tokensFor(job, profile);
  const beh = behavioralPool(t);
  const tech = technicalPool(t);
  const hr = hrPool(t);
  const n = cfg.questionCount;
  let items: Item[];
  if (cfg.type === "BEHAVIORAL") items = fill(beh, [hr], n);
  else if (cfg.type === "TECHNICAL") items = fill(tech, [beh, hr], n);
  else if (cfg.type === "HR") items = fill(hr, [beh], n);
  else {
    const body: Item[] = [];
    const slots = n - 1 - (n >= 10 ? 1 : 0);
    let ti = 0;
    let bi = 0;
    for (let i = 0; i < slots; i++) {
      if (i % 2 === 0 && ti < tech.length) body.push(tech[ti++]);
      else if (bi < beh.length) body.push(beh[bi++]);
      else if (ti < tech.length) body.push(tech[ti++]);
    }
    items = fill([hr[0], ...body, ...(n >= 10 ? [hr[1]] : [])], [tech, beh, hr], n);
  }
  const suffix = cfg.difficulty === "HARD" ? " Be specific about trade-offs and numbers." : "";
  return items.map((it, i) => ({
    id: `q${i + 1}`,
    text: it.text + suffix,
    kind: it.kind,
    whyAsked: it.why,
    targets: it.targets,
  }));
}

function mentions(text: string, skill: string): boolean {
  const s = skill.toLowerCase();
  const lower = text.toLowerCase();
  if (lower.includes(s)) return true;
  if (s === "testing") return /test/.test(lower);
  return false;
}

export interface Coverage {
  requirements: { id: string; text: string; skill: string; mustHave: boolean; covered: boolean; gap: boolean; matchClass: Job["requirements"][number]["matchClass"] }[];
  resumeItems: string[];
}

/** What the questions will probe: job requirements and resume items. */
export function coverageFor(questions: InterviewQuestion[], job: Job): Coverage {
  const blob = questions.map((q) => `${q.text} ${q.targets}`);
  const requirements = job.requirements
    .filter((r) => !GENERIC_SKILL.test(r.skill))
    .map((r) => ({
      id: r.id,
      text: r.text,
      skill: r.skill,
      mustHave: r.type === "MUST_HAVE",
      covered: blob.some((b) => mentions(b, r.skill)),
      gap: questions.some((q) => q.targets === `Gap: ${r.skill}`),
      matchClass: r.matchClass,
    }));
  const resumeItems = [
    ...new Set(
      questions
        .map((q) => q.targets)
        .filter((x) => x.startsWith("Resume: ") || x.startsWith("Project: "))
        .map((x) => x.replace(/^(Resume|Project): /, "")),
    ),
  ];
  return { requirements, resumeItems };
}

export function createSession(cfg: SessionConfig, job: Job, profile: Profile): InterviewSession {
  return {
    id: `iv${Date.now().toString(36)}`,
    jobId: cfg.jobId,
    type: cfg.type,
    difficulty: cfg.difficulty,
    persona: cfg.persona,
    questionCount: cfg.questionCount,
    status: "IN_PROGRESS",
    createdAt: `${TODAY}T${new Date().toISOString().slice(11, 19)}Z`,
    questions: buildQuestions(cfg, job, profile),
    answers: [],
    evaluations: [],
  };
}

export const FOLLOW_UP_CAP: Record<5 | 10 | 15, number> = { 5: 3, 10: 6, 15: 8 };
export const LENGTHS: (5 | 10 | 15)[] = [5, 10, 15];
export const SOFT_TARGET_SECONDS = 120;

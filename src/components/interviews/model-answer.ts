// Model answers are built ONLY from the resume/profile and the fact bank.
// Where a fact is missing the text keeps a visible [placeholder] and the
// "Built from" list says so. Nothing is invented.

import type { Experience, InterviewQuestion, Job, Profile, Project } from "@/demo/types";
import { categoryOf, type Category } from "./bank";

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const stripDot = (s: string) => s.replace(/\.+$/, "").trim();
const article = (s: string) => (/^[aeiou]/i.test(s) ? "an" : "a");

/** "Built X" -> "I built X"; "Responsible for X" -> "I was responsible for X". */
function iBullet(b: string): string {
  const s = stripDot(b);
  return /^responsible for/i.test(s) ? `I was ${lowerFirst(s)}` : `I ${lowerFirst(s)}`;
}
const iFact = (f: string) => `I ${lowerFirst(stripDot(f))}`;

interface Found { bullet: string; exp: Experience }

function findBullet(profile: Profile, re: RegExp): Found | undefined {
  for (const exp of profile.experiences)
    for (const bullet of exp.bullets) if (re.test(bullet)) return { bullet, exp };
  return undefined;
}

const src = (f: Found) => `Resume, ${f.exp.employer}: "${f.bullet}"`;
const NO_MATCH = "No matching example in your resume or fact bank, so this is a template. Fill it with a real story.";

export interface ModelAnswer { text: string; sources: string[] }

function template(parts: string, extra?: string[]): ModelAnswer {
  return { text: parts, sources: extra ?? [NO_MATCH] };
}

export function modelAnswerFor(q: InterviewQuestion, job: Job, profile: Profile): ModelAnswer {
  const cat: Category = categoryOf(q);
  const cur = profile.experiences[0];
  const prev = profile.experiences[1];
  const employer = cur?.employer ?? "[your employer]";
  const numeric = findBullet(profile, /\d/) ?? (cur ? { bullet: cur.bullets[0] ?? "", exp: cur } : undefined);
  const userFacts = profile.factBank.filter((f) => f.source === "USER");

  switch (cat) {
    case "INTRO": {
      if (!cur || !numeric) return template(`I'm [your current role] at [employer]. [Add one real thing you built.] I'm interested in ${job.company} because [add one specific thing about ${job.company}'s product or team].`);
      const prevBullet = prev?.bullets[0];
      const text = [
        `I'm ${article(cur.title)} ${cur.title.toLowerCase()} at ${cur.employer}.`,
        `${iBullet(numeric.bullet)}.`,
        prev && prevBullet ? `Before that I was ${article(prev.title)} ${prev.title.toLowerCase()} at ${prev.employer}, where ${iBullet(prevBullet)}.` : "",
        `I'm interested in ${job.company} because [add one specific thing about ${job.company}'s product or team].`,
      ].filter(Boolean).join(" ");
      const sources = [src(numeric), ...(prev && prevBullet ? [`Resume, ${prev.employer}: "${prevBullet}"`] : [])];
      return { text, sources };
    }
    case "ACHIEVEMENT": {
      if (!numeric) return template(`At [employer], I [what you built]. My part was [your own actions]. The result was [add the real result].`);
      const second = findBullet(profile, /test|reusable/i);
      const extra = second && second.bullet !== numeric.bullet && !/^responsible/i.test(second.bullet) ? `I also ${lowerFirst(stripDot(second.bullet))}.` : "";
      const hasImpact = /\d/.test(numeric.bullet);
      const text = [
        `At ${numeric.exp.employer}, ${iBullet(numeric.bullet)}.`,
        extra,
        hasImpact ? "" : "[Add the real result and who benefited.]",
        "[Add one challenge you solved along the way.]",
      ].filter(Boolean).join(" ");
      return { text, sources: [src(numeric), ...(extra && second ? [src(second)] : [])] };
    }
    case "CHALLENGE": {
      const f = userFacts[0];
      if (f)
        return {
          text: `${iFact(f.fact)}. [Add the hardest part and how you handled it.] [Add the real result.]`,
          sources: [`Fact bank: ${f.fact}`],
        };
      return template(`The hardest problem I solved was [describe the real problem]. I approached it by [your steps]. The result was [add the real result].`);
    }
    case "QUALITY": {
      const t = findBullet(profile, /test/i);
      if (!t) return template(`Before shipping I [your real checks]. [Add one real bug that a check caught.]`);
      const f = userFacts.find((x) => /typescript|migration/i.test(x.fact));
      const text = [
        `${iBullet(t.bullet)}.`,
        f ? `Beyond tests, ${iFact(f.fact)}.` : "",
        "[Add one real bug your tests or reviews caught.]",
      ].filter(Boolean).join(" ");
      return { text, sources: [src(t), ...(f ? [`Fact bank: ${f.fact}`] : [])] };
    }
    case "LEARNING": {
      const p: Project | undefined = profile.projects[0];
      if (!p) return template(`I had to learn [what] quickly because [why]. I [your steps]. The result was [add the real result].`);
      const text = `One example is ${p.name}, ${article(p.summary)} ${lowerFirst(stripDot(p.summary))}, built with ${p.tech.join(", ")}. [Add what you had to learn and how you picked it up.] [Add what you finished or shipped.]`;
      return { text, sources: [`Resume, Projects: ${p.name}: ${p.summary}`] };
    }
    case "LEADERSHIP": {
      const f = userFacts.find((x) => /^led|lead/i.test(x.fact));
      if (f) return { text: `${iFact(f.fact)}. [Add why you took it on without being asked.] [Add the real result.]`, sources: [`Fact bank: ${f.fact}`] };
      return template(`At [employer], I noticed [real situation] and took ownership of [what]. I [your actions]. The result was [add the real result].`);
    }
    case "MOTIVATION": {
      const strong = job.requirements.filter((r) => r.matchClass === "STRONG" && r.type === "MUST_HAVE" && !/yrs|degree/i.test(r.skill)).map((r) => r.skill);
      if (!cur || !numeric) return template(`I want this role because [specific reason]. [Add one specific thing you learned about ${job.company}.]`);
      const text = [
        `At ${cur.employer}, ${iBullet(numeric.bullet)}.`,
        strong.length ? `This role asks for ${[...new Set(strong)].slice(0, 2).join(" and ")}, which I use in my current job.` : "",
        `[Add one specific thing you learned about ${job.company}'s product or team, and why it matters to you.]`,
      ].filter(Boolean).join(" ");
      return { text, sources: [src(numeric), `Job requirements: ${job.title} at ${job.company}`] };
    }
    case "GAP": {
      const skill = q.targets.replace(/^Gap: /, "");
      const req = job.requirements.find((r) => r.skill === skill);
      if (req?.matchClass === "PARTIAL" && req.evidence)
        return {
          text: `On my resume, the closest evidence is "${req.evidence.text}". That is not the same as full production use, and I'd say so plainly. [Add the first concrete step you would take to get up to speed on ${skill}, and by when.]`,
          sources: [`Resume, ${req.evidence.section}: "${req.evidence.text}"`],
        };
      if (req?.matchClass === "UNKNOWN")
        return template(`I haven't described ${skill} work on my resume. [Add a real example if you have one; otherwise say how you would learn it.]`, ["Your resume does not mention it either way. Add a real example to your fact bank if you have one."]);
      const top = numeric;
      return {
        text: `I haven't used ${skill} in professional work yet, and I'd rather say that plainly. ${top ? `Where I do have depth: ${iBullet(top.bullet)}.` : ""} [Add the first concrete step you would take to learn ${skill}, and by when.]`.replace("  ", " "),
        sources: top ? [src(top)] : [NO_MATCH],
      };
    }
    case "PROJECT": {
      const name = q.targets.replace(/^Project: /, "");
      const p = profile.projects.find((x) => x.name === name);
      if (!p) return template(`I chose [tech] because [your real reason]. If I rebuilt it I would [one real change].`);
      return {
        text: `${p.name} is ${article(p.summary)} ${lowerFirst(stripDot(p.summary))}; it uses ${p.tech.join(", ")}. I chose ${p.tech[0] ?? "[tech]"} because [add your real reason]. If I rebuilt it, I would [add one real change].`,
        sources: [`Resume, Projects: ${p.name}: ${p.summary}`],
      };
    }
    case "TECH": {
      const skill = q.targets.replace(/^Skill: /, "");
      const re = new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const f = findBullet(profile, re);
      if (f) return { text: `${iBullet(f.bullet)} (${f.exp.employer}). [Add one trade-off you faced and how you decided.]`, sources: [src(f)] };
      const p = profile.projects.find((x) => x.tech.some((t) => re.test(t)));
      if (p) return { text: `I have used ${skill} on my project ${p.name}, ${article(p.summary)} ${lowerFirst(stripDot(p.summary))}. [Add a trade-off or limitation you hit.] [Add whether you used it at work.]`, sources: [`Resume, Projects: ${p.name}: ${p.summary}`] };
      const s = profile.skills.find((x) => re.test(x.name));
      if (s) return { text: `${s.name} is on my skills list${s.level ? ` (${s.level.toLowerCase()})` : ""}, but I don't have a worked example written down yet. [Add one real example before using this answer.]`, sources: [`Resume, Skills: ${s.name}`] };
      return template(`I haven't used ${skill} yet. [Say what you have used that is closest, and how you would learn ${skill}.]`);
    }
    case "STRENGTH": {
      const s = profile.skills.find((x) => x.level === "Expert" || x.level === "Strong");
      const f = s ? findBullet(profile, new RegExp(s.name.split(/[ /]/)[0], "i")) : undefined;
      if (s && f) return { text: `One strength is ${s.name}: ${iBullet(f.bullet)}. [Add one real thing you are still working on, and what you're doing about it.]`, sources: [`Resume, Skills: ${s.name}`, src(f)] };
      return template(`My strength is [a real strength with one example]. I'm still working on [a real area] by [what you're doing].`);
    }
    default:
      return template(`In my work at ${employer}, [describe the real situation]. I [your own actions]. The result was [add the real result].`);
  }
}

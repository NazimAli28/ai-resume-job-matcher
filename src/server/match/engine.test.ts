import { describe, expect, it } from "vitest";
import type { ResumeDoc } from "../resume/types";
import { band, buildMatchProfile, computeMatch, nextSteps, seniorityLevel, titleFit, type MatchRequirement } from "./engine";
import { canonicalize, textShows } from "./taxonomy";
import { SKILLS } from "./taxonomy-data";

const NOW = new Date("2026-06-01T00:00:00Z");
const bullet = (text: string) => ({ id: "b", text, hasMetric: false });

/** The worked example in PRD 05 §5.4. */
const DOC: ResumeDoc = {
  schemaVersion: 1,
  basics: { profiles: [], location: "Lahore, Pakistan" },
  work: [
    {
      id: "w1",
      title: "Junior Software Engineer",
      employer: "Kinara",
      dates: { start: { year: 2024, month: 12, raw: "12/2024" }, isCurrent: true, raw: "12/2024 – Present" },
      bullets: [bullet("Built REST APIs in Node.js/Express serving 20k daily requests"), bullet("Developed React dashboards for 3 clients"), bullet("Wrote JavaScript utilities for the billing team")],
    },
  ],
  education: [{ id: "e1", institution: "FAST", degreeRaw: "BS Computer Science" }],
  skills: ["Git", "TypeScript"],
  projects: [{ id: "p1", name: "Shop", bullets: [bullet("Designed a PostgreSQL schema for orders")] }],
  certifications: [],
  languages: [],
  sections: [],
};
const profile = (extra: Parameters<typeof buildMatchProfile>[1] = {}) => buildMatchProfile(DOC, { now: NOW, ...extra });

const req = (id: string, text: string, o: Partial<MatchRequirement> = {}): MatchRequirement => ({
  id,
  text,
  kind: "TOOL",
  priority: "MUST_HAVE",
  hard: false,
  skillTerm: text,
  ...o,
});
const REQS: MatchRequirement[] = [
  req("js", "JavaScript"),
  req("react", "React"),
  req("node", "Node.js"),
  req("rest", "REST APIs"),
  req("git", "Git"),
  req("sql", "SQL"),
  req("docker", "Docker", { priority: "NICE_TO_HAVE" }),
  req("aws", "AWS", { priority: "NICE_TO_HAVE" }),
  req("ts", "TypeScript", { priority: "NICE_TO_HAVE" }),
  req("yrs", "1+ years of experience", { kind: "YEARS", hard: true, years: 1, skillTerm: null }),
  req("deg", "BS Computer Science", { kind: "EDUCATION", degreeLevel: "BACHELOR", skillTerm: null }),
  req("loc", "Based in Lahore", { kind: "LOCATION", skillTerm: null }),
];
const TITLE = "Junior Full-Stack Developer";
const cls = (r: ReturnType<typeof computeMatch>, id: string) => r.items.find((i) => i.requirementId === id);

describe("JobMatch formula (05 §5)", () => {
  const r = computeMatch(TITLE, REQS, profile());

  it("reproduces the worked example: 80, Strong", () => {
    expect(r.score).toBe(80);
    expect(band(r.score)).toBe("Strong");
    expect(r.factors.map((f) => f.value)).toEqual([92, 17, 100, 75, 100]);
  });

  it("classifies by where the evidence is", () => {
    expect(cls(r, "react")).toMatchObject({ cls: "STRONG", credit: 1, evidenceQuality: 1 });
    expect(cls(r, "js")).toMatchObject({ cls: "STRONG", evidenceQuality: 0.6 });
    expect(cls(r, "git")).toMatchObject({ cls: "PARTIAL", credit: 0.5, evidenceQuality: 0.3 });
    expect(cls(r, "sql")?.cls).toBe("STRONG"); // PostgreSQL proves SQL
    expect(cls(r, "docker")).toMatchObject({ cls: "MISSING", credit: 0 });
  });

  it("is deterministic", () => {
    expect(computeMatch(TITLE, REQS, profile())).toEqual(r);
  });

  it("caps at 60 for one missing hard requirement and 45 for two", () => {
    const three = REQS.map((q) => (q.id === "yrs" ? { ...q, years: 3 } : q));
    const one = computeMatch(TITLE, three, profile());
    expect(one.score).toBe(60);
    expect(one.cap).toBe(60);
    const two = computeMatch(TITLE, [...three, req("k8s", "Kubernetes", { hard: true })], profile());
    expect(two.score).toBeLessThanOrEqual(45);
  });

  it("leaves UNKNOWN out of the score (founder decision)", () => {
    const withSoft = computeMatch(TITLE, [...REQS, req("soft", "Team player", { kind: "SOFT", skillTerm: null })], profile());
    expect(cls(withSoft, "soft")?.cls).toBe("UNKNOWN");
    expect(withSoft.score).toBe(r.score);
  });

  it("never treats a missing skill as present just because the user has years", () => {
    const m = computeMatch(TITLE, [req("y", "1+ years of Kubernetes", { kind: "YEARS", hard: true, years: 1, skillTerm: "Kubernetes" })], profile());
    expect(cls(m, "y")?.cls).toBe("MISSING");
  });

  it("flags low confidence with few checkable must-haves", () => {
    expect(computeMatch(TITLE, [req("soft", "Team player", { kind: "SOFT", skillTerm: null })], profile()).lowConfidence).toBe(true);
    expect(r.lowConfidence).toBe(false);
  });
});

describe("user answers", () => {
  const withOverride = (id: string, override: MatchRequirement["override"], extra: Parameters<typeof buildMatchProfile>[1] = {}) =>
    computeMatch(TITLE, REQS.map((q) => (q.id === id ? { ...q, override } : q)), profile(extra));

  it("a yes with no details is PARTIAL at most", () => {
    expect(cls(withOverride("docker", "CONFIRM"), "docker")).toMatchObject({ cls: "PARTIAL", credit: 0.5 });
  });

  it("evidence in the user's own words makes it STRONG, also on other jobs", () => {
    const facts = [{ skillName: "Docker", statement: "I set up Docker for local development on an internal tool" }];
    const a = withOverride("docker", "ADD_EVIDENCE", { facts });
    expect(cls(a, "docker")).toMatchObject({ cls: "STRONG", evidence: { section: "Your evidence" } });
    expect(a.score).toBeGreaterThan(computeMatch(TITLE, REQS, profile()).score);
    expect(cls(computeMatch("DevOps Engineer", [req("d", "Docker")], profile({ facts })), "d")?.cls).toBe("STRONG");
  });

  it("rejecting overrides evidence on the resume", () => {
    expect(cls(withOverride("react", "REJECT"), "react")).toMatchObject({ cls: "MISSING", credit: 0 });
  });

  it("learning is PARTIAL weighted by self-rating (founder decision)", () => {
    expect(cls(withOverride("docker", "LEARNING"), "docker")).toMatchObject({ cls: "PARTIAL", credit: 0.5, learning: true });
    const rated = withOverride("docker", "LEARNING", { skills: [{ name: "Docker", level: 1 }] });
    expect(cls(rated, "docker")).toMatchObject({ cls: "PARTIAL", credit: 0.25 });
  });

  it("next steps stay honest and never say to add a keyword", () => {
    const steps = nextSteps(computeMatch(TITLE, [...REQS, req("k8s", "Kubernetes")], profile()));
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.join(" ")).not.toMatch(/keyword/i);
    expect(steps.join(" ")).toMatch(/If you've used it|If it's true/);
  });
});

describe("titles and seniority", () => {
  it("reads the seniority ladder", () => {
    expect(seniorityLevel("Software Engineering Intern")).toBe(0);
    expect(seniorityLevel("Junior Developer")).toBe(1);
    expect(seniorityLevel("Senior Accountant")).toBe(3);
    expect(seniorityLevel("Software Engineer")).toBeUndefined();
  });

  it("scores same family higher than an unrelated job", () => {
    expect(titleFit("Backend Developer", ["Web Developer"], [])).toBeGreaterThan(titleFit("Staff Nurse", ["Web Developer"], []));
    expect(titleFit("Marketing Manager", ["Accountant"], [])).toBeLessThan(0.6);
  });
});

describe("skill dictionary", () => {
  it("has unique ids and valid implications", () => {
    const ids = new Set(SKILLS.map((s) => s.id));
    expect(ids.size).toBe(SKILLS.length);
    for (const s of SKILLS) for (const i of s.implies ?? []) expect(ids.has(i), `${s.id} implies ${i}`).toBe(true);
  });

  it("no alias belongs to two skills", () => {
    const seen = new Map<string, string>();
    for (const s of SKILLS) {
      for (const a of [s.label, ...s.aliases].map((x) => x.toLowerCase())) {
        const prior = seen.get(a);
        if (!s.guard?.caseSensitive) expect(prior === undefined || prior === s.id, `${a}: ${prior} and ${s.id}`).toBe(true);
        seen.set(a, s.id);
      }
    }
  });

  it("handles the ambiguous tokens (05 §4.2)", () => {
    expect(textShows("Wrote JavaScript utilities", "Java")).toBe(false);
    expect(textShows("Built services in Java", "JavaScript")).toBe(false);
    expect(textShows("I react quickly to incidents", "React")).toBe(false);
    expect(textShows("Built dashboards in React", "React")).toBe(true);
    expect(textShows("I excel at planning", "Excel")).toBe(false);
    expect(textShows("Built reports in Excel", "Excel")).toBe(true);
    expect(textShows("We go to clients weekly", "Go")).toBe(false);
    expect(textShows("Wrote C++ drivers", "C#")).toBe(false);
    expect(textShows("Spring 2024 semester project", "Spring Framework")).toBe(false);
  });

  it("lets a child prove its parent, never the reverse", () => {
    expect(textShows("Designed a PostgreSQL schema", "SQL")).toBe(true);
    expect(textShows("Wrote SQL reports", "PostgreSQL")).toBe(false);
    expect(textShows("Used postgres in production", "PostgreSQL")).toBe(true);
  });

  it("matches a term it doesn't know by its literal words only", () => {
    expect(canonicalize("Blorptech Studio")).toBeUndefined();
    expect(textShows("Used Blorptech Studio daily", "Blorptech Studio")).toBe(true);
    expect(textShows("Used other tools daily", "Blorptech Studio")).toBe(false);
  });
});

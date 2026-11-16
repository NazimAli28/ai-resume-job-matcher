import { describe, expect, it } from "vitest";
import type { MatchItem } from "../match/engine";
import type { ResumeDoc } from "../resume/types";
import { applySuggestions, buildEvidence, deterministicSuggestions, fillTemplate, validateSuggestions, type RawSuggestion } from "./core";

// Synthetic person; no real data.
const doc: ResumeDoc = {
  schemaVersion: 1,
  basics: { name: "Sara Ahmed", profiles: [], summary: "Developer who builds web apps." },
  work: [
    {
      id: "w1",
      title: "Developer",
      employer: "Example Soft",
      bullets: [
        { id: "b1", text: "Worked on APIs in Node.js for the billing team", hasMetric: false },
        { id: "b2", text: "Helped migrate reports to PostgreSQL", hasMetric: false },
      ],
    },
  ],
  education: [],
  skills: ["JavaScript", "Git"],
  projects: [],
  certifications: [],
  languages: [],
  sections: [],
};
const evidence = buildEvidence(doc, { facts: [], profileSkills: [] });
const reqs = [
  { id: "r1", text: "REST APIs in Node.js", skillTerm: "Node.js", kind: "TOOL" },
  { id: "r2", text: "Docker", skillTerm: "Docker", kind: "TOOL" },
  { id: "r3", text: "PostgreSQL", skillTerm: "PostgreSQL", kind: "TOOL" },
];
const raw = (r: Partial<RawSuggestion>): RawSuggestion => ({ kind: "REWRITE", targetId: "b1", newText: "", question: "", citeIds: ["b1"], reqIds: ["r1"], rationale: "Uses the job's wording.", ...r });

describe("validating AI suggestions (TLR-003/004)", () => {
  it("keeps a faithful rewrite that uses the job's wording", () => {
    const { suggestions, stats } = validateSuggestions([raw({ newText: "Developed Node.js APIs for the billing team" })], { doc, evidence, reqs });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ kind: "REWRITE", after: "Developed Node.js APIs for the billing team", reqTexts: ["REST APIs in Node.js"] });
    expect(stats.kept).toBe(1);
  });
  it("blocks job wording the evidence doesn't support ('REST' when the line only says APIs)", () => {
    const { stats } = validateSuggestions([raw({ newText: "Developed REST APIs in Node.js for the billing team" })], { doc, evidence, reqs });
    expect(stats.kept).toBe(0);
  });
  it("never shows an added Docker, and turns an invented metric into a question", () => {
    const { suggestions, stats } = validateSuggestions(
      [raw({ newText: "Built Node.js APIs and shipped them in Docker containers" }), raw({ targetId: "b2", citeIds: ["b2"], newText: "Helped migrate reports to PostgreSQL, increasing sales by 30%" })],
      { doc, evidence, reqs },
    );
    // Docker is a job skill the evidence doesn't show: it may only appear as a yes/no question, never as a ready change.
    expect(suggestions.filter((s) => (s.after ?? s.template ?? "").includes("Docker")).every((s) => s.kind === "QUESTION" && s.answerType === "YES_NO" && !s.after)).toBe(true);
    expect(suggestions[0].question).toContain("Docker");
    expect(suggestions[1]).toMatchObject({ kind: "QUESTION", answerType: "NUMBER" });
    expect(suggestions[1].template).toContain("[X]%");
    expect(suggestions[1].template).not.toContain("30");
    expect(stats.asked).toBe(2);
  });
  it("blocks a skill the job doesn't even ask for", () => {
    const { suggestions, stats } = validateSuggestions([raw({ newText: "Built Node.js APIs and deployed them on Kubernetes" })], { doc, evidence, reqs });
    expect(suggestions).toHaveLength(0);
    expect(stats.blocked.NEW_SKILL).toBe(1);
  });
  it("asks when a rewrite borrows details from another line", () => {
    const { suggestions } = validateSuggestions([raw({ targetId: "b2", citeIds: ["b2"], newText: "Helped migrate billing reports to PostgreSQL" })], { doc, evidence, reqs });
    expect(suggestions[0]).toMatchObject({ kind: "QUESTION", answerType: "YES_NO" });
    expect(suggestions[0].question).toContain("billing");
  });
  it("asks before upgrading 'helped' to 'led'", () => {
    const { suggestions } = validateSuggestions([raw({ targetId: "b2", citeIds: ["b2"], newText: "Led the migration of reports to PostgreSQL" })], { doc, evidence, reqs });
    expect(suggestions[0]).toMatchObject({ kind: "QUESTION", answerType: "YES_NO" });
  });
  it("drops unknown targets, ignores unknown citations, and keeps one change per line", () => {
    const { suggestions, stats } = validateSuggestions(
      [raw({ targetId: "zzz", newText: "x" }), raw({ newText: "Developed APIs in Node.js for billing", citeIds: ["fact:nope"] }), raw({ newText: "Built Node.js APIs for the billing team" })],
      { doc, evidence, reqs },
    );
    expect(stats.blocked.UNKNOWN_TARGET).toBe(1);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].basedOn.map((b) => b.id)).toEqual(["b1"]);
  });
  it("accepts a model question only if the rest of the template is true", () => {
    const ok = validateSuggestions([raw({ kind: "QUESTION", newText: "Built Node.js APIs for the billing team, serving [X] users", question: "How many users?" })], { doc, evidence, reqs });
    expect(ok.suggestions[0]).toMatchObject({ kind: "QUESTION", question: "How many users?" });
    const bad = validateSuggestions([raw({ kind: "QUESTION", newText: "Built Node.js APIs on Kubernetes for [X] users", question: "How many?" })], { doc, evidence, reqs });
    expect(bad.suggestions).toHaveLength(0);
  });
});

describe("suggestions from code", () => {
  const items = [
    { requirementId: "r1", cls: "STRONG", priority: "MUST_HAVE" },
    { requirementId: "r2", cls: "MISSING", priority: "MUST_HAVE" },
    { requirementId: "r3", cls: "PARTIAL", priority: "MUST_HAVE" },
  ] as unknown as MatchItem[];
  const out = deterministicSuggestions({ doc, evidence, items, reqs });
  it("adds a skill the resume shows but doesn't list", () => {
    expect(out.filter((s) => s.kind === "SKILL_ADD").map((s) => s.skill)).toEqual(expect.arrayContaining(["Node.js", "PostgreSQL"]));
  });
  it("asks about a missing must-have instead of adding it", () => {
    const gap = out.find((s) => s.kind === "GAP_QUESTION");
    expect(gap?.skill).toBe("Docker");
    expect(out.some((s) => s.kind === "SKILL_ADD" && s.skill === "Docker")).toBe(false);
  });
});

describe("applying changes (TLR-010/012)", () => {
  it("applies only accepted changes, in a stable order", () => {
    const { suggestions } = validateSuggestions([raw({ newText: "Developed Node.js APIs for the billing team" })], { doc, evidence, reqs });
    const all = [
      { ...suggestions[0], status: "APPLIED" as const },
      { id: "x", kind: "SKILL_ADD" as const, status: "APPLIED" as const, targetId: "skills", targetLabel: "Skills", after: "Node.js", rationale: "", reqIds: [], reqTexts: [], basedOn: [] },
      { id: "y", kind: "SKILL_ADD" as const, status: "DISMISSED" as const, targetId: "skills", targetLabel: "Skills", after: "PostgreSQL", rationale: "", reqIds: [], reqTexts: [], basedOn: [] },
    ];
    const { doc: next, changes } = applySuggestions(doc, all);
    expect(next.work[0].bullets[0].text).toBe("Developed Node.js APIs for the billing team");
    expect(next.skills).toEqual(["JavaScript", "Git", "Node.js"]);
    expect(changes).toHaveLength(2);
    expect(doc.work[0].bullets[0].text).toBe("Worked on APIs in Node.js for the billing team"); // parent untouched
  });
  it("fills placeholders with short plain answers only", () => {
    expect(fillTemplate("Served [X] daily users", "1,200")).toBe("Served 1,200 daily users");
    expect(fillTemplate("Cut costs by [X]%", "25")).toBe("Cut costs by 25%");
    expect(fillTemplate("Cut costs by [X]%", "25%")).toBe("Cut costs by 25%");
    expect(fillTemplate("Served [X] users", "<script>")).toBeNull();
  });
});

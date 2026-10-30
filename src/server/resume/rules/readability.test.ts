import { describe, expect, it } from "vitest";
import { buildResumeDoc } from "../structure";
import { CLEAN_RESUME, linesFrom, makeExtraction } from "../testing";
import { analyze } from "./index";

const opts = { targetMarket: "PK_LOCAL" as const, fileBytes: 100_000, now: new Date("2026-06-01") };
const run = (text: string) => {
  const x = makeExtraction(linesFrom(text));
  return analyze(x, buildResumeDoc(x), opts);
};
const has = (a: ReturnType<typeof run>, id: string) => a.findings.some((f) => f.ruleId === id);

const wrap = (summary: string, bullets: string[], extra = "") => `Zara Malik
zara@example.com | 0300-1234567
Summary
${summary}
Experience
Marketing Executive | Delta Ltd | Jan 2022 – Present
${bullets.map((b) => `- ${b}`).join("\n")}
${extra}`;

const GOOD = [
  "Led a campaign that grew leads by 40%",
  "Managed a budget of PKR 2M across 3 channels",
  "Built weekly reports for 12 stakeholders",
];

describe("Readability", () => {
  const clean = run(CLEAN_RESUME);

  it("scores a clean resume well with parts in [0,1]", () => {
    expect(clean.readability).toBeGreaterThanOrEqual(70);
    for (const v of Object.values(clean.readabilityParts)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(clean.readabilityParts.R2).toBe(1);
  });

  it("lowers R2 and R3 for bullets without verbs or numbers", () => {
    const a = run(wrap("Marketer.", ["Responsible for social media", "Various tasks and duties", "Team work and reporting"]));
    expect(a.readabilityParts.R2).toBeLessThan(0.5);
    expect(a.readabilityParts.R3).toBe(0);
    expect(has(a, "R2")).toBe(true);
    expect(has(a, "R3")).toBe(true);
    expect(a.readability).toBeLessThan(run(wrap("Marketer.", GOOD)).readability);
  });

  it("R5 fires on first person and buzzwords", () => {
    const a = run(wrap("I am a hard-working team player and go-getter.", ["I managed my own campaigns", ...GOOD]));
    const r5 = a.findings.filter((f) => f.ruleId === "R5");
    expect(r5.map((f) => f.title).join(" ")).toContain("First-person");
    expect(r5.some((f) => f.message === "Replace 'hard-working' with a specific example.")).toBe(true);
    expect(a.readabilityParts.R5).toBeLessThan(0.7);
  });

  it("R8 fires on objective cliches", () => {
    const a = run(wrap("Seeking a challenging position in a reputable organization to utilize my skills.", GOOD));
    expect(has(a, "R8")).toBe(true);
    expect(a.readabilityParts.R8).toBe(0.5);
    expect(run(wrap("Marketing lead with 5 years in B2C growth.", GOOD)).readabilityParts.R8).toBe(1);
  });

  it("R6 fires on mixed UK and US spelling", () => {
    const a = run(wrap("Marketer.", ["Organized events across 3 cities", "Optimised budgets worth PKR 2M", ...GOOD]));
    const f = a.findings.find((f) => f.ruleId === "R6");
    expect(f?.evidence?.join(" ")).toContain("Mixed US and UK spelling");
    expect(a.readabilityParts.R6).toBeLessThan(1);
    expect(has(run(wrap("Marketer.", ["Organized events across 3 cities", "Optimized budgets worth PKR 2M", ...GOOD])), "R6")).toBe(false);
  });

  it("R6 flags present-tense verbs in past roles; R4 flags length", () => {
    const text = `Zara Malik
zara@example.com | 0300-1234567
Experience
Analyst | Old Co | 2015 - 2017
- Manage weekly reports
- Build dashboards
Marketing Executive | Delta Ltd | Jan 2022 – Present
- Led a campaign that grew leads by 40%`;
    const x = makeExtraction(linesFrom(text), { pageCount: 4 });
    const a = analyze(x, buildResumeDoc(x), opts);
    expect(a.findings.find((f) => f.ruleId === "R6")?.evidence?.join(" ")).toContain("present-tense");
    expect(a.findings.find((f) => f.ruleId === "R4")?.message).toBe("Aim for 2 pages for your experience level.");
  });

  it("R7 asks for acronym and spelled-out forms together", () => {
    const a = run(wrap("SEO specialist.", GOOD, "Skills\nSEO, CRM"));
    expect(a.findings.find((f) => f.ruleId === "R7")?.message).toBe("Write 'Search Engine Optimization (SEO)' once so both forms are searchable.");
    expect(has(run(wrap("Search Engine Optimization (SEO) specialist.", GOOD)), "R7")).toBe(false);
  });
});

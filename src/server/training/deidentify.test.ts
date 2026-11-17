import { describe, expect, it } from "vitest";
import { parseAiAnswer } from "@/config/ai-help";
import { deidentify, makeScrubber } from "./deidentify";

const scrub = makeScrubber({ names: ["Ayesha Siddiqui", "Tariq Mehmood"], employers: ["Northwind Traders", "Freelance"], schools: ["Lakeside University"] });

describe("de-identification", () => {
  it("removes contact details, IDs and links", () => {
    const out = scrub("Email ayesha.s@example.com, call 0300-1234567 or +44 20 7946 0958. CNIC 35202-1234567-1. Old NIC 123-45-678901. See linkedin.com/in/ayesha and https://ayesha.dev/work");
    expect(out).not.toMatch(/example\.com|1234567|7946|35202|678901|linkedin|ayesha\.dev/i);
    expect(out).toContain("{{PII_EMAIL}}");
    expect(out).toContain("{{PII_PHONE}}");
    expect(out).toContain("{{PII_REMOVED_ID}}");
    expect(out).toContain("{{LINK}}");
  });

  it("removes the person's names, employers and schools, including name parts", () => {
    const out = scrub("Ayesha Siddiqui worked at Northwind Traders after Lakeside University. Siddiqui led the team; Ayesha's manager agreed.");
    expect(out).not.toMatch(/Ayesha|Siddiqui|Northwind|Lakeside/);
    expect(out).toContain("{{NAME}}");
    expect(out).toContain("{{COMPANY}}");
    expect(out).toContain("{{SCHOOL}}");
  });

  it("removes street addresses but keeps the city and skills", () => {
    const out = scrub("House No. 12, Street 5, Block B, Gulberg, Lahore. H# 7 Sector G-11. Skills: HTML5, Office 365, Node.js.");
    expect(out).not.toMatch(/No\. 12|Street 5|Block B|H# 7|G-11/);
    expect(out).toContain("Lahore");
    expect(out).toMatch(/HTML5.*Office 365.*Node\.js/);
  });

  it("keeps generic employers and ordinary words", () => {
    const out = scrub("Freelance developer. Built APIs with a team of 4. Grew revenue 20% in 2023.");
    expect(out).toBe("Freelance developer. Built APIs with a team of 4. Grew revenue 20% in 2023.");
  });

  it("walks JSON and leaves structure, numbers and keys alone", () => {
    const out = deidentify({ name: "Tariq Mehmood", score: 4, items: [{ text: "Mail tariq@example.com" }] }, scrub);
    expect(out).toEqual({ name: "{{NAME}}", score: 4, items: [{ text: "Mail {{PII_EMAIL}}" }] });
  });
});

describe("the AI-improvement question", () => {
  it("accepts only an explicit Yes or No", () => {
    expect(parseAiAnswer("yes")).toBe(true);
    expect(parseAiAnswer("no")).toBe(false);
    for (const v of [null, undefined, "", "YES", "true", "on", 1]) expect(parseAiAnswer(v)).toBeNull();
  });
});

describe("which answers count", () => {
  it("only answers under the current wording", async () => {
    const { isCurrentAnswer } = await import("@/config/ai-help");
    expect(isCurrentAnswer("privacy@2026-11-18")).toBe(true);
    expect(isCurrentAnswer("privacy@2027-01-02")).toBe(true);
    expect(isCurrentAnswer("privacy@2026-10-30")).toBe(false);
    expect(isCurrentAnswer("privacy@2026-11-04")).toBe(false);
    expect(isCurrentAnswer("marketing@2026-11-18")).toBe(false);
  });
});

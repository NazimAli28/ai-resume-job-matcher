import { describe, expect, it } from "vitest";
import { educationLevel } from "./lexicon";
import { buildResumeDoc } from "./structure";
import { CLEAN_RESUME, linesFrom, makeExtraction } from "./testing";

const docOf = (text: string) => buildResumeDoc(makeExtraction(linesFrom(text)));

describe("buildResumeDoc on a clean single-column resume", () => {
  const doc = docOf(CLEAN_RESUME);

  it("reads the contact block", () => {
    expect(doc.basics.name).toBe("Ayesha Khan");
    expect(doc.basics.headline).toBe("Lead Software Engineer");
    expect(doc.basics.email).toBe("ayesha.khan@example.com");
    expect(doc.basics.phone).toBe("+92 300 1234567");
    expect(doc.basics.location).toBe("Lahore, Pakistan");
    expect(doc.basics.profiles).toEqual([{ network: "LINKEDIN", url: "linkedin.com/in/ayeshakhan" }]);
    expect(doc.basics.summary).toContain("Backend engineer");
  });

  it("finds two roles with title, employer, dates and bullets", () => {
    expect(doc.work).toHaveLength(2);
    const [a, b] = doc.work;
    expect(a).toMatchObject({ title: "Senior Software Engineer", employer: "Acme Technologies" });
    expect(a?.dates).toMatchObject({ isCurrent: true, start: { year: 2022, month: 1 } });
    expect(a?.bullets).toHaveLength(3);
    expect(a?.bullets.map((x) => x.hasMetric)).toEqual([true, true, false]);
    expect(b).toMatchObject({ title: "Software Engineer", employer: "Beta Solutions Pvt Ltd", location: "Lahore" });
    expect(b?.dates).toMatchObject({ isCurrent: false, start: { year: 2019, month: 3 }, end: { year: 2021, month: 12 } });
    expect(b?.bullets).toHaveLength(3);
    expect(b?.bullets[2]?.hasMetric).toBe(true);
  });

  it("reads education and skills", () => {
    expect(doc.education).toHaveLength(1);
    const e = doc.education[0]!;
    expect(e.degreeRaw).toBe("BS Computer Science");
    expect(educationLevel(e.degreeRaw)).toBe("BACHELOR");
    expect(e.institution).toContain("FAST NUCES");
    expect(e.dates?.start?.year).toBe(2015);
    expect(e.grade).toContain("3.4/4.0");
    expect(doc.skills).toEqual(["Python", "TypeScript", "PostgreSQL", "Docker", "AWS (EC2, S3)", "Git"]);
  });

  it("is deterministic with stable prefixed ids", () => {
    expect(docOf(CLEAN_RESUME)).toEqual(doc);
    expect(doc.work[0]?.id).toMatch(/^w_[0-9a-z]{6}$/);
    expect(doc.work[0]?.bullets[0]?.id).toMatch(/^b_[0-9a-z]{6}$/);
    expect(doc.education[0]?.id).toMatch(/^e_[0-9a-z]{6}$/);
  });
});

describe("structure edge cases", () => {
  it("joins wrapped bullet continuations", () => {
    const doc = docOf(`Sam Lee
Experience
Developer at Acme Ltd | 2020 - 2022
• Built an internal tool that tracks hiring
  progress for the whole company
• Wrote tests`);
    expect(doc.work[0]?.bullets.map((b) => b.text)).toEqual([
      "Built an internal tool that tracks hiring progress for the whole company",
      "Wrote tests",
    ]);
  });

  it("recognizes a content-based heading as non-standard", () => {
    const doc = docOf(`Sana Ahmed
sana@example.com
MY JOURNEY
Data Analyst, Acme Corp Jan 2020 – Mar 2022
- Built dashboards
Analyst | Beta Ltd | 2018 - 2019
- Cleaned data`);
    const s = doc.sections.find((x) => x.heading === "MY JOURNEY");
    expect(s).toMatchObject({ kind: "experience", standardHeading: false });
    expect(doc.work).toHaveLength(2);
  });

  it("handles inline 'Skills: a, b' headings and dictionary variants", () => {
    const doc = docOf(`Ali Raza
Technical Skills: React, Node.js; SQL
Academic Qualifications
MSc Physics, University of Punjab, 2014 - 2016`);
    expect(doc.skills).toEqual(["React", "Node.js", "SQL"]);
    expect(educationLevel(doc.education[0]!.degreeRaw)).toBe("MASTER");
    expect(doc.education[0]?.institution).toBe("University of Punjab");
  });
});

describe("educationLevel", () => {
  it.each([
    ["Matric", "SECONDARY"],
    ["O Levels", "SECONDARY"],
    ["FSc Pre-Engineering", "HIGHER_SECONDARY"],
    ["Intermediate (ICS)", "HIGHER_SECONDARY"],
    ["A Levels", "HIGHER_SECONDARY"],
    ["DAE Electrical", "DIPLOMA"],
    ["BS Software Engineering", "BACHELOR"],
    ["BBA", "BACHELOR"],
    ["MBBS", "BACHELOR"],
    ["LLB", "BACHELOR"],
    ["MSc Chemistry", "MASTER"],
    ["MBA Finance", "MASTER"],
    ["MPhil Economics", "MPHIL"],
    ["PhD Computer Science", "DOCTORATE"],
  ])("%s -> %s", (text, level) => expect(educationLevel(text)).toBe(level));
});

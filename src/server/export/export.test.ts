import { describe, expect, it } from "vitest";
import { extract } from "../resume/extract";
import { analyze } from "../resume/rules";
import { buildResumeDoc } from "../resume/structure";
import type { ResumeDoc } from "../resume/types";
import { letterBlocks, resumeBlocks } from "./blocks";
import { renderDocx } from "./docx";
import { renderPdf, wrap } from "./pdf";

// Synthetic person; no real data.
const doc: ResumeDoc = {
  schemaVersion: 1,
  basics: {
    name: "Ayesha Khan",
    headline: "Backend Developer",
    email: "ayesha.khan@example.com",
    phone: "+92 300 1234567",
    location: "Lahore, Pakistan",
    profiles: [{ network: "LINKEDIN", url: "https://linkedin.com/in/ayesha-khan-example" }],
    summary: "Backend developer with three years of experience building REST APIs in Node.js and PostgreSQL for fintech products.",
  },
  work: [
    {
      id: "w1",
      title: "Software Engineer",
      employer: "Example Systems",
      location: "Lahore",
      dates: { start: { year: 2022, month: 3, raw: "Mar 2022" }, isCurrent: true, raw: "Mar 2022 – Present" },
      bullets: [
        { id: "b1", text: "Built REST APIs in Node.js for the billing team, serving 1,200 daily users", hasMetric: true },
        { id: "b2", text: "Reduced report generation time from 2 hours to 15 minutes by rewriting PostgreSQL queries", hasMetric: true },
        { id: "b3", text: "Wrote integration tests with Jest and set up GitHub Actions for every pull request", hasMetric: false },
      ],
    },
    {
      id: "w2",
      title: "Junior Developer",
      employer: "Sample Labs",
      location: "Karachi",
      dates: { start: { year: 2020, month: 7, raw: "Jul 2020" }, end: { year: 2022, month: 2, raw: "Feb 2022" }, isCurrent: false, raw: "Jul 2020 – Feb 2022" },
      bullets: [
        { id: "b4", text: "Maintained an internal dashboard in React used by 40 support agents", hasMetric: true },
        { id: "b5", text: "Fixed 120 bugs reported by customers across three releases", hasMetric: true },
      ],
    },
  ],
  education: [
    { id: "e1", institution: "University of the Punjab", degreeRaw: "BS Computer Science", dates: { start: { year: 2016, raw: "2016" }, end: { year: 2020, raw: "2020" }, isCurrent: false, raw: "2016 – 2020" }, grade: "CGPA 3.4/4.0" },
  ],
  skills: ["Node.js", "TypeScript", "PostgreSQL", "React", "Jest", "Git"],
  projects: [{ id: "p1", name: "Expense Tracker", bullets: [{ id: "b6", text: "Built a personal expense tracker with React and Firebase", hasMetric: false }] }],
  certifications: ["AWS Certified Cloud Practitioner"],
  languages: ["English", "Urdu"],
  sections: [],
};

describe("export writers", () => {
  it("wraps long lines inside the page width", () => {
    const lines = wrap("word ".repeat(200), 10, 487);
    expect(lines.length).toBeGreaterThan(5);
  });

  for (const kind of ["PDF", "DOCX"] as const) {
    it(`a ${kind} export reads back with the same structure and full parse health (TLR-015)`, async () => {
      const blocks = resumeBlocks(doc);
      const buf = kind === "PDF" ? renderPdf(blocks, { title: "Resume", author: doc.basics.name }) : await renderDocx(blocks, { title: "Resume", author: doc.basics.name });
      const ex = await extract(buf);
      expect(ex.kind).toBe(kind);
      const back = buildResumeDoc(ex);
      expect(back.basics.name).toBe("Ayesha Khan");
      expect(back.basics.email).toBe("ayesha.khan@example.com");
      expect(back.work.length).toBe(2);
      expect(back.work.flatMap((w) => w.bullets).length).toBe(5);
      expect(back.education.length).toBe(1);
      expect(back.skills).toEqual(expect.arrayContaining(["Node.js", "PostgreSQL", "React"]));
      const a = analyze(ex, back, { targetMarket: "PK_LOCAL", fileBytes: buf.length });
      expect(a.parseHealth).toBeGreaterThanOrEqual(90);
    });
  }

  it("writes a cover letter both ways", async () => {
    const blocks = letterBlocks({ name: "Ayesha Khan", contact: "Lahore | ayesha.khan@example.com", date: "16 November 2026", company: "Acme", paragraphs: ["I am applying for the Backend Developer role.", "I built REST APIs in Node.js."] });
    const pdf = await extract(renderPdf(blocks, { title: "Cover letter" }));
    expect(pdf.lines.map((l) => l.text).join("\n")).toContain("I built REST APIs in Node.js.");
    const docx = await extract(await renderDocx(blocks, { title: "Cover letter" }));
    expect(docx.lines.map((l) => l.text).join("\n")).toContain("Dear Hiring Manager,");
  });
});

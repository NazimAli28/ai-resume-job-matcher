import { describe, expect, it } from "vitest";
import { buildResumeDoc } from "../structure";
import { CLEAN_RESUME, linesFrom, makeExtraction } from "../testing";
import type { Extraction, Line } from "../types";
import { analyze } from "./index";

const opts = { targetMarket: "PK_LOCAL" as const, fileBytes: 100_000 };
const run = (x: Extraction, o = opts) => analyze(x, buildResumeDoc(x), o);
const ids = (a: ReturnType<typeof run>) => a.findings.map((f) => f.ruleId);

describe("ParseHealth", () => {
  it("scores a clean single-column resume at 85 or more with no parse ERR", () => {
    const a = run(makeExtraction(linesFrom(CLEAN_RESUME)));
    expect(a.engineVersion).toBe("rules@1.0.0");
    expect(a.parseHealth).toBeGreaterThanOrEqual(85);
    expect(a.findings.filter((f) => f.category === "parse" && f.severity === "ERR")).toEqual([]);
    expect(ids(a)).not.toContain("P2");
    expect(ids(a)).not.toContain("P5");
    expect(ids(a)).not.toContain("P8");
  });

  it("P2 ERR when contact details sit only in the header band", () => {
    const text = CLEAN_RESUME.split("\n")
      .filter((l) => l.trim())
      .slice(3)
      .join("\n");
    const header = linesFrom("[h] Ayesha Khan\n[h] ayesha.khan@example.com | +92 300 1234567");
    const x = makeExtraction([...header, ...linesFrom(text)]);
    const f = run(x).findings.find((f) => f.ruleId === "P2");
    expect(f?.severity).toBe("ERR");
    expect(f?.message).toBe("Move your name, email and phone into the main body at the top. Some systems skip headers and footers.");
  });

  it("P1 caps an image-only file at 10", () => {
    const x = makeExtraction(linesFrom("Ayesha Khan"), { charsPerPage: [40] });
    const a = run(x);
    expect(ids(a)).toContain("P1");
    expect(a.parseHealth).toBeLessThanOrEqual(10);
  });

  it("P4 WARN for a two-column layout", () => {
    const lines: Line[] = [];
    for (let i = 0; i < 8; i++) {
      lines.push({ text: `Left column line number ${i}`, page: 1, band: "body", left: 0.05, top: 0.1 + i * 0.08 });
      lines.push({ text: `Right column line number ${i}`, page: 1, band: "body", left: 0.55, top: 0.1 + i * 0.08 });
    }
    const a = run(makeExtraction(lines));
    expect(a.findings.find((f) => f.ruleId === "P4")?.severity).toBe("WARN");
    const flagged = run(makeExtraction(linesFrom(CLEAN_RESUME), { features: { ...makeExtraction([]).features, columnPages: [1] } }));
    expect(ids(flagged)).toContain("P4");
  });

  it("P5 WARN for a non-standard heading that holds roles", () => {
    const text = `Sana Ahmed
sana@example.com | 0300-1234567
Summary
Analyst with data experience.
MY JOURNEY
Data Analyst | Acme Corp | Jan 2020 – Mar 2022
- Built dashboards used by 40 managers
Analyst | Beta Ltd | 2018 - 2019
- Cleaned survey data`;
    const f = run(makeExtraction(linesFrom(text))).findings.find((f) => f.ruleId === "P5" && f.title.includes("MY JOURNEY"));
    expect(f?.severity).toBe("WARN");
    expect(f?.message).toContain("Rename 'MY JOURNEY' to a standard heading like 'Experience'");
  });

  it("P3, P6, P7, P8, P9, P12 fire on their triggers", () => {
    const base = makeExtraction(linesFrom(CLEAN_RESUME));
    const bad = makeExtraction(
      [...base.lines, ...linesFrom("[t] Mar 2019 - Dec 2021\nCore skills ●●●●○")],
      { features: { ...base.features, garbledCount: 2, images: 1, hiddenText: ["keyword stuffing"] }, pageCount: 7 },
    );
    const a = run(bad, { ...opts, fileBytes: 3 * 1024 * 1024 });
    for (const id of ["P3", "P6", "P7", "P9", "P12"]) expect(ids(a)).toContain(id);
    expect(a.findings.find((f) => f.ruleId === "P7")?.severity).toBe("ERR");
    expect(a.parseHealth).toBe(0);
    const soft = run(base, { ...opts, fileBytes: 3 * 1024 * 1024 });
    expect(soft.findings.find((f) => f.ruleId === "P7")?.severity).toBe("WARN");
    expect(soft.parseHealth).toBeGreaterThan(0);
  });

  it("P8 flags a role with no employer and sorts ERR before WARN before TIP", () => {
    const text = `Sam Lee
sam@example.com | 0300-1234567
Experience
Developer | Jan 2020 – Present
* Built a tool`;
    const a = run(makeExtraction(linesFrom(text)));
    expect(ids(a)).toContain("P8");
    const order = a.findings.map((f) => ({ ERR: 0, WARN: 1, TIP: 2 })[f.severity]);
    expect(order).toEqual([...order].sort());
    expect(ids(a)).toContain("P10");
  });

  it("never uses the forbidden phrase in any copy", () => {
    const a = run(makeExtraction(linesFrom(CLEAN_RESUME)), { ...opts });
    expect(JSON.stringify(a).toLowerCase()).not.toContain("ats score");
  });
});

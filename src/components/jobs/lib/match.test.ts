import { describe, expect, it } from "vitest";
import { initialState } from "@/demo/data";
import type { Job, JobRequirement } from "@/demo/types";
import { CAP_ONE_GAP, CAP_TWO_GAPS, liveMatch, scoreJob, WEIGHTS } from "./match";

const req = (id: string, type: JobRequirement["type"], matchClass: JobRequirement["matchClass"]): JobRequirement => ({
  id,
  text: id,
  skill: id,
  type,
  matchClass,
  note: "",
});

const job = (requirements: JobRequirement[]): Job => ({ ...initialState.jobs[0], id: "t", requirements });
const full = { title: 100, thresholds: 100 };

describe("JobMatch formula", () => {
  it("weights add up to 100", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("seeded demo scores match the formula", () => {
    const expected: Record<string, number> = { j1: 78, j2: 38, j3: 75, j4: 85, j5: 80, j6: 90, j7: 52, j8: 45, j9: 97 };
    for (const j of initialState.jobs) {
      if (!(j.id in expected)) continue;
      expect(liveMatch(initialState, j).before.score, j.id).toBe(expected[j.id]);
    }
  });

  it("one missing must-have caps the score", () => {
    const r = scoreJob(job([req("a", "MUST_HAVE", "STRONG"), req("b", "MUST_HAVE", "STRONG"), req("c", "MUST_HAVE", "MISSING")]), initialState.profile, full);
    expect(r.score).toBeLessThanOrEqual(CAP_ONE_GAP);
    expect(r.hardGaps).toHaveLength(1);
  });

  it("two missing must-haves cap lower", () => {
    const r = scoreJob(
      job([req("a", "MUST_HAVE", "STRONG"), req("b", "MUST_HAVE", "MISSING"), req("c", "MUST_HAVE", "MISSING")]),
      initialState.profile,
      full,
    );
    expect(r.score).toBeLessThanOrEqual(CAP_TWO_GAPS);
  });

  it("partial counts half of strong on must-haves", () => {
    const strong = scoreJob(job([req("a", "MUST_HAVE", "STRONG")]), initialState.profile, full);
    const partial = scoreJob(job([req("a", "MUST_HAVE", "PARTIAL")]), initialState.profile, full);
    const must = (r: typeof strong) => r.factors.find((f) => f.key === "must")!.value;
    expect(must(partial)).toBe(must(strong) / 2);
  });
});

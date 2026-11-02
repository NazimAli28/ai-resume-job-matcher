import { describe, expect, it } from "vitest";
import { computeDashboard, furthest, needsAttention, nextBestAction, type AppRow, type AttentionInput } from "./analytics";
import { cell, toCsv } from "./csv";
import { dayNumber, today, type Status } from "./constants";

const NOW = new Date("2026-11-03T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

let seq = 0;
function app(path: [Status, number][], extra: Partial<AppRow> = {}): AppRow {
  const applied = path.find(([s]) => s === "APPLIED");
  return {
    id: `a${seq++}`,
    status: path[path.length - 1][0],
    source: "LINKEDIN",
    appliedAt: applied ? daysAgo(applied[1]) : null,
    createdAt: daysAgo(path[0][1]),
    matchScore: null,
    resumeVersionId: null,
    resumeLabel: null,
    history: path.map(([toStatus, n]) => ({ toStatus, changedAt: daysAgo(n) })),
    ...extra,
  };
}

describe("funnel", () => {
  it("counts the furthest stage reached, including skipped stages and later rejections", () => {
    const d = computeDashboard(
      [
        app([["SAVED", 20]]),
        app([["APPLIED", 20]]),
        app([["APPLIED", 20], ["SCREENING", 15], ["REJECTED", 10]]),
        app([["APPLIED", 20], ["INTERVIEWING", 10]]),
        app([["APPLIED", 20], ["SCREENING", 18], ["ASSESSMENT", 15], ["INTERVIEWING", 10], ["OFFER", 5]]),
      ],
      { now: NOW },
    );
    expect(d.applied).toBe(4);
    expect(d.funnel.map((f) => f.count)).toEqual([4, 3, 2, 2, 1, 0]);
    expect(d.funnel[1].conversion).toBe(75);
    expect(d.interviewRate).toEqual({ n: 4, count: 2, pct: 50 });
    expect(d.offerRate.count).toBe(1);
    expect(d.counts).toMatchObject({ total: 5, saved: 1, active: 3, interviewing: 1, offers: 1, rejected: 1 });
  });

  it("doesn't count a job rejected before applying as applied", () => {
    expect(furthest(app([["SAVED", 3], ["WITHDRAWN", 1]]))).toBe(0);
    expect(computeDashboard([app([["SAVED", 3], ["WITHDRAWN", 1]])], { now: NOW }).applied).toBe(0);
  });

  it("divides by nothing safely", () => {
    const d = computeDashboard([], { now: NOW });
    expect(d.interviewRate.pct).toBeNull();
    expect(d.funnel.every((f) => f.count === 0 && !f.conversion)).toBe(true);
    expect(d.weekly).toHaveLength(12);
  });
});

describe("replies and timing", () => {
  it("counts a rejection as a reply but not ghosting or withdrawing", () => {
    const d = computeDashboard(
      [
        app([["APPLIED", 20], ["REJECTED", 18]]),
        app([["APPLIED", 20], ["GHOSTED", 1]]),
        app([["APPLIED", 20], ["WITHDRAWN", 2]]),
        app([["APPLIED", 20], ["SCREENING", 10]]),
      ],
      { now: NOW },
    );
    expect(d.responseRate).toEqual({ n: 4, count: 2, pct: 50 });
  });

  it("hides time metrics below n=3 and gives median and average at n=3", () => {
    const two = computeDashboard([app([["APPLIED", 9], ["SCREENING", 7]]), app([["APPLIED", 9], ["SCREENING", 5]])], { now: NOW });
    expect(two.time.firstResponse).toEqual({ n: 2, median: null, average: null });
    const three = computeDashboard([app([["APPLIED", 20], ["SCREENING", 18]]), app([["APPLIED", 20], ["SCREENING", 16]]), app([["APPLIED", 20], ["SCREENING", 11]])], { now: NOW });
    expect(three.time.firstResponse).toEqual({ n: 3, median: 4, average: 5 });
  });
});

describe("range and breakdowns", () => {
  it("filters by the applied date but keeps the 12-week chart whole", () => {
    const rows = [app([["APPLIED", 5]]), app([["APPLIED", 40]]), app([["APPLIED", 200]])];
    expect(computeDashboard(rows, { now: NOW, rangeDays: 30 }).applied).toBe(1);
    expect(computeDashboard(rows, { now: NOW, rangeDays: 90 }).applied).toBe(2);
    expect(computeDashboard(rows, { now: NOW }).applied).toBe(3);
    expect(computeDashboard(rows, { now: NOW, rangeDays: 30 }).weekly.reduce((s, w) => s + w.value, 0)).toBe(2);
  });

  it("starts weeks on Monday", () => {
    // 2026-11-03 is a Tuesday, so yesterday and today share a week and last Sunday doesn't.
    const d = computeDashboard([app([["APPLIED", 0]]), app([["APPLIED", 1]]), app([["APPLIED", 2]])], { now: NOW });
    expect(d.weekly[11]).toEqual({ label: "2 Nov", value: 2 });
    expect(d.weekly[10].value).toBe(1);
  });

  it("groups by source, resume and fit band", () => {
    const d = computeDashboard(
      [
        app([["APPLIED", 9], ["INTERVIEWING", 3]], { source: "ROZEE_PK", resumeVersionId: "r1", resumeLabel: "v1", matchScore: 49 }),
        app([["APPLIED", 9]], { source: "ROZEE_PK", resumeVersionId: "r1", resumeLabel: "v1", matchScore: 50 }),
        app([["APPLIED", 9]], { source: "LINKEDIN", matchScore: 85 }),
        app([["SAVED", 9]], { source: "INDEED", matchScore: 90 }),
      ],
      { now: NOW },
    );
    expect(d.bySource.map((s) => [s.label, s.n, s.interviews])).toEqual([["Rozee.pk", 2, 1], ["LinkedIn", 1, 0]]);
    expect(d.byResume.map((s) => [s.label, s.n])).toEqual([["v1", 2], ["No resume linked", 1]]);
    expect(d.byBand.map((b) => [b.key, b.n])).toEqual([["0-49", 1], ["50-69", 1], ["85+", 1]]);
  });
});

describe("needs attention", () => {
  const base: AttentionInput = { id: "x", company: "Acme", title: "Dev", status: "APPLIED", lastActivityAt: NOW, nextActionAt: null, nextActionNote: null, deadline: null, nudgeSnoozedUntil: null, rounds: [] };
  const kinds = (a: Partial<AttentionInput>) => needsAttention([{ ...base, ...a }], NOW).map((i) => i.kind);

  it("nudges a follow-up at 7 quiet days and suggests ghosting at 21", () => {
    expect(kinds({ lastActivityAt: daysAgo(6) })).toEqual([]);
    expect(kinds({ lastActivityAt: daysAgo(7) })).toEqual(["FOLLOW_UP"]);
    expect(kinds({ lastActivityAt: daysAgo(21) })).toEqual(["GHOSTED"]);
  });

  it("uses 14 days after a past interview round", () => {
    expect(kinds({ status: "INTERVIEWING", lastActivityAt: daysAgo(14), rounds: [{ scheduledAt: daysAgo(15) }] })).toEqual(["GHOSTED"]);
    expect(kinds({ status: "INTERVIEWING", lastActivityAt: daysAgo(13), rounds: [{ scheduledAt: daysAgo(15) }] })).toEqual([]);
  });

  it("stays quiet when snoozed, closed, or a round is coming", () => {
    expect(kinds({ lastActivityAt: daysAgo(30), nudgeSnoozedUntil: daysAgo(-2) })).toEqual([]);
    expect(kinds({ lastActivityAt: daysAgo(30), status: "REJECTED" })).toEqual([]);
    expect(kinds({ lastActivityAt: daysAgo(30), rounds: [{ scheduledAt: daysAgo(-3) }] })).toEqual(["ROUND"]);
    expect(kinds({ lastActivityAt: daysAgo(30), rounds: [{ scheduledAt: daysAgo(-9) }] })).toEqual([]);
  });

  it("flags reminders that are due and deadlines two days out", () => {
    expect(needsAttention([{ ...base, nextActionAt: today(daysAgo(2)), nextActionNote: "Call" }], NOW)[0].message).toBe("Call: 2 days overdue");
    expect(kinds({ nextActionAt: today(daysAgo(-1)) })).toEqual([]);
    expect(kinds({ status: "SAVED", deadline: today(daysAgo(-2)) })).toEqual(["DEADLINE"]);
    expect(kinds({ status: "SAVED", deadline: today(daysAgo(-3)) })).toEqual([]);
  });
});

describe("next best action", () => {
  const s = { hasResume: true, onboarded: true, jobs: 0, applications: 0, attention: [], saved: [] };
  it("walks the core path in order", () => {
    expect(nextBestAction({ ...s, onboarded: false }).href).toBe("/app/onboarding");
    expect(nextBestAction({ ...s, hasResume: false }).href).toBe("/app/resumes");
    expect(nextBestAction(s).href).toBe("/app/jobs/new");
    expect(nextBestAction({ ...s, jobs: 1 }).href).toBe("/app/applications/new");
    expect(nextBestAction({ ...s, applications: 1, saved: [{ id: "a", company: "Acme" }] }).href).toBe("/app/applications/a");
    expect(nextBestAction({ ...s, applications: 1 }).title).toBe("You're up to date");
  });
});

describe("dates", () => {
  it("rolls the day over at midnight Pakistan time, and keeps date-only values on their day", () => {
    expect(today(new Date("2026-11-03T18:59:00Z")).toISOString().slice(0, 10)).toBe("2026-11-03");
    expect(today(new Date("2026-11-03T19:01:00Z")).toISOString().slice(0, 10)).toBe("2026-11-04");
    const d = new Date("2026-11-03T00:00:00Z");
    expect(today(d).getTime()).toBe(d.getTime());
    expect(dayNumber(d)).toBe(dayNumber(new Date("2026-11-03T18:00:00Z")));
  });
});

describe("csv", () => {
  it("neutralizes spreadsheet formulas and quotes values", () => {
    expect(cell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(cell("+92 300")).toBe(`"'+92 300"`);
    expect(cell("@me")).toBe(`"'@me"`);
    expect(cell("-1")).toBe(`"'-1"`);
    expect(cell(null)).toBe('""');
    expect(cell(5)).toBe('"5"');
    expect(toCsv([["a", "b"], ["c, d", 'e"f']])).toBe('﻿"a","b"\r\n"c, d","e""f"');
  });
});

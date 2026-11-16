import { describe, expect, it } from "vitest";
import { blockedBy, budgetMessage, DEFAULT_LIMITS, limitsSchema, parseLimits, windowStarts, type Spent } from "./limits";

const none: Spent = { globalDay: 0, globalMonth: 0, userDay: 0, userWeek: 0, userMonth: 0 };

describe("spend windows", () => {
  it("weeks start on Monday 00:00 UTC", () => {
    // Wednesday 2026-11-18 10:00 UTC → Monday 2026-11-16
    expect(windowStarts(new Date("2026-11-18T10:00:00Z")).week.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    // Sunday stays in the week that began the Monday before
    expect(windowStarts(new Date("2026-11-22T23:59:00Z")).week.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    // Monday is its own start
    expect(windowStarts(new Date("2026-11-23T00:00:00Z")).week.toISOString()).toBe("2026-11-23T00:00:00.000Z");
  });

  it("day and month start at UTC midnight", () => {
    const w = windowStarts(new Date("2026-12-03T18:30:00Z"));
    expect(w.day.toISOString()).toBe("2026-12-03T00:00:00.000Z");
    expect(w.month.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});

describe("blockedBy", () => {
  const L = DEFAULT_LIMITS;
  it("lets a call through under every limit", () => {
    expect(blockedBy({ ...none, userDay: 0.19, userWeek: 0.49, userMonth: 0.99, globalDay: 0.9, globalMonth: 7 }, L)).toBeNull();
  });
  it("names the limit that was reached", () => {
    expect(blockedBy({ ...none, userDay: 0.2 }, L)).toEqual({ scope: "USER", period: "day" });
    expect(blockedBy({ ...none, userWeek: 0.5 }, L)).toEqual({ scope: "USER", period: "week" });
    expect(blockedBy({ ...none, userMonth: 1 }, L)).toEqual({ scope: "USER", period: "month" });
    expect(blockedBy({ ...none, globalDay: 1 }, L)).toEqual({ scope: "GLOBAL", period: "day" });
    expect(blockedBy({ ...none, globalMonth: 7.5 }, L)).toEqual({ scope: "GLOBAL", period: "month" });
  });
  it("a limit of 0 turns that window off", () => {
    expect(blockedBy(none, { ...L, userDaily: 0 })).toEqual({ scope: "USER", period: "day" });
  });
});

describe("stored limits", () => {
  it("missing or broken values fall back to the defaults, never to no limit", () => {
    expect(parseLimits(undefined)).toEqual(DEFAULT_LIMITS);
    expect(parseLimits({ userDaily: "lots" })).toEqual(DEFAULT_LIMITS);
    expect(parseLimits({ ...DEFAULT_LIMITS, userWeekly: -1 })).toEqual(DEFAULT_LIMITS);
  });
  it("keeps valid saved values", () => {
    const saved = { globalDaily: 2, globalMonthly: 7, userDaily: 0.1, userWeekly: 0.3, userMonthly: 0.8 };
    expect(parseLimits(saved)).toEqual(saved);
  });
  it("rejects a daily limit above the weekly one", () => {
    expect(limitsSchema.safeParse({ ...DEFAULT_LIMITS, userDaily: 0.6 }).success).toBe(false);
    expect(limitsSchema.safeParse({ ...DEFAULT_LIMITS, globalDaily: 8 }).success).toBe(false);
  });
});

describe("messages", () => {
  it("says which allowance ran out and when it comes back", () => {
    expect(budgetMessage({ reason: "USER_BUDGET", period: "week" }, "x")).toMatch(/this week's AI allowance.*Monday/);
    expect(budgetMessage({ reason: "GLOBAL_BUDGET", period: "month" }, "x")).toMatch(/everyone.*1st/);
    expect(budgetMessage({ reason: "FAILED" }, "fallback")).toBe("fallback");
  });
});

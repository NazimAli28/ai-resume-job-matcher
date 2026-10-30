import { describe, expect, it } from "vitest";
import { basicsSchema, experienceSchema, factSchema, onboardingSchema, skillSchema } from "./schemas";

describe("profile schemas", () => {
  it("rejects CNIC numbers anywhere", () => {
    expect(factSchema.safeParse({ statement: "My CNIC is 35202-1234567-1 for verification" }).success).toBe(false);
    expect(experienceSchema.safeParse({ title: "Dev", employer: "X", startDate: "2023-01", bullets: "Did 3520212345671 things" }).success).toBe(false);
  });

  it("splits bullets by line and strips markers", () => {
    const r = experienceSchema.parse({ title: "Dev", employer: "Kinara", startDate: "2023-02", endDate: "", bullets: "- Built X\n\n• Shipped Y\n" });
    expect(r.bullets).toEqual(["Built X", "Shipped Y"]);
    expect(r.endDate).toBeNull();
  });

  it("refuses an end date before the start", () => {
    expect(experienceSchema.safeParse({ title: "Dev", employer: "X", startDate: "2024-05", endDate: "2023-01" }).success).toBe(false);
  });

  it("only accepts https links", () => {
    expect(basicsSchema.safeParse({ targetMarket: "PK_LOCAL", linkedinUrl: "http://linkedin.com/in/x" }).success).toBe(false);
    expect(basicsSchema.parse({ targetMarket: "PK_LOCAL", linkedinUrl: "https://linkedin.com/in/x" }).linkedinUrl).toBe("https://linkedin.com/in/x");
  });

  it("caps target roles at 5", () => {
    expect(onboardingSchema.safeParse({ targetMarket: "PK_LOCAL", targetTitles: "a\nb\nc\nd\ne\nf" }).success).toBe(false);
  });

  it("keeps skill level within 1-5", () => {
    expect(skillSchema.safeParse({ name: "React", level: "6" }).success).toBe(false);
    expect(skillSchema.parse({ name: " React ", level: "2", years: "" })).toEqual({ name: "React", level: 2, years: null });
  });

  it("requires a meaningful evidence statement", () => {
    expect(factSchema.safeParse({ statement: "short" }).success).toBe(false);
  });
});

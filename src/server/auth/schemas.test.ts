import { describe, expect, it } from "vitest";
import { newPasswordSchema, safeNext, signUpSchema } from "./schemas";

describe("auth schemas", () => {
  it("requires 10+ char passwords and the consent box", () => {
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "short", accept: "on" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "long-enough-pw" }).success).toBe(false);
    const ok = signUpSchema.safeParse({ email: " A@B.co ", password: "long-enough-pw", accept: "on" });
    expect(ok.success && ok.data.email).toBe("a@b.co");
  });

  it("checks the confirmation matches", () => {
    expect(newPasswordSchema.safeParse({ password: "long-enough-pw", confirm: "different-pw" }).success).toBe(false);
  });

  it("blocks open redirects", () => {
    expect(safeNext("/app/jobs")).toBe("/app/jobs");
    expect(safeNext("//evil.com")).toBe("/app");
    expect(safeNext("https://evil.com")).toBe("/app");
    expect(safeNext("/\\evil.com")).toBe("/app");
    expect(safeNext(null)).toBe("/app");
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: {} }));
vi.mock("../http/request", () => ({ pepperHash: (v: string) => v }));

const { scrub } = await import("./errors");

describe("scrub", () => {
  it("removes emails, phone numbers and CNIC-like runs", () => {
    const out = scrub("User ayesha.khan@example.com, CNIC 35202-1234567-1, phone +92 300 1234567 failed");
    expect(out).not.toMatch(/example\.com|35202|1234567/);
    expect(out).toContain("[email]");
    expect(out).toContain("[number]");
  });

  it("caps length", () => {
    expect(scrub("x".repeat(900))).toHaveLength(500);
  });
});

import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCsp } from "@/config/csp";
import { readCentralDirectory, readEntry } from "../resume/files/zip";
import { limitFor } from "../usage/limits";
import { crc32, zipChunks } from "./zip";

async function zipOf(entries: { name: string; data: Buffer }[]) {
  const parts: Buffer[] = [];
  for await (const c of zipChunks(entries)) parts.push(c);
  return Buffer.concat(parts);
}

describe("zip writer", () => {
  it("computes the standard checksum", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });

  it("writes an archive our own strict reader opens, with the same contents", async () => {
    const json = Buffer.from(JSON.stringify({ name: "Ayesha", note: "اردو ✓" }));
    // Random, because very repetitive data trips the reader's zip-bomb guard.
    const big = randomBytes(200_000);
    const zip = await zipOf([{ name: "data.json", data: json }, { name: "files/a b.pdf", data: big }, { name: "README.txt", data: Buffer.from("hi") }]);
    const dir = readCentralDirectory(zip);
    expect([...dir.keys()]).toEqual(["data.json", "files/a b.pdf", "README.txt"]);
    expect(readEntry(zip, dir.get("data.json")!).equals(json)).toBe(true);
    expect(readEntry(zip, dir.get("files/a b.pdf")!).equals(big)).toBe(true);
  });

  it("handles an empty list", async () => {
    expect((await zipOf([])).length).toBe(22);
  });
});

describe("plan limits", () => {
  it("doubles free limits in the beta, per PRD §5b", () => {
    expect(limitFor({ plan: "FREE", isBetaUser: true }, "ANALYSIS")).toBe(6);
    expect(limitFor({ plan: "FREE", isBetaUser: false }, "ANALYSIS")).toBe(3);
    expect(limitFor({ plan: "FREE", isBetaUser: true }, "MOCK_INTERVIEW")).toBe(4);
    expect(limitFor({ plan: "PRO", isBetaUser: true }, "TAILORED_VERSION")).toBe(30);
    expect(limitFor({ plan: "SPRINT", isBetaUser: false }, "ANALYSIS")).toBe(40);
  });
});

describe("script policy", () => {
  it("allows only nonce scripts and never unsafe-inline for scripts", () => {
    const csp = buildCsp("abc", "https://x.supabase.co", false);
    const script = csp.split("; ").find((d) => d.startsWith("script-src"));
    expect(script).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("connect-src 'self' https://x.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("adds eval and the reload socket in development only", () => {
    expect(buildCsp("n", undefined, true)).toContain("'unsafe-eval'");
    expect(buildCsp("n", undefined, false)).not.toContain("unsafe-eval");
    expect(buildCsp("n", undefined, false)).not.toContain("ws://");
  });
});

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { docx, para } from "./files/fixtures";

// End-to-end against the real database + private storage bucket. Runs locally only.
config({ path: ".env.local", quiet: true });
vi.mock("server-only", () => ({}));
const hasEnv = Boolean(process.env.DATABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!hasEnv)("resume upload end to end", async () => {
  if (!hasEnv) return;
  const { db } = await import("../db");
  const svc = await import("./service");
  const { supabaseAdmin } = await import("../supabase/admin");
  // Created lazily: the describe body is evaluated even when skipped (CI has no env).
  const browser = hasEnv ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!) : (null as never);
  const user = randomUUID();
  const other = randomUUID();

  const resume = docx(
    [
      para("Ayesha Khan"),
      para("ayesha.khan@example.com | 0300-1234567 | Lahore"),
      para("EXPERIENCE", { bold: true }),
      para("Frontend Developer, Kinara Software, Feb 2023 – Present"),
      para("Built 14 React screens used by 300+ dispatchers", { list: true }),
      para("Cut page load time by 40% by code-splitting routes", { list: true }),
      para("EDUCATION", { bold: true }),
      para("BS Computer Science, FAST NUCES, 2018 – 2022, CGPA 3.4/4.0"),
      para("SKILLS", { bold: true }),
      para("React, TypeScript, Next.js, REST APIs, Git, Jest"),
      para("CNIC: 35202-1234567-1"),
    ].join(""),
  );

  async function upload(uid: string, name: string, bytes: Buffer) {
    const r = await svc.createUpload(uid, { name, size: bytes.length }, { consentGiven: true, consentIpPrefix: "203.0.113.0/24" });
    const { error } = await browser.storage.from("resumes").uploadToSignedUrl(r.path, r.token, bytes, {
      contentType: name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(error).toBeNull();
    return r;
  }

  beforeAll(async () => {
    await db.user.createMany({ data: [user, other].map((id) => ({ id, email: `e2e-${id}@test.invalid` })) });
  });

  afterAll(async () => {
    const ups = await db.resumeUpload.findMany({ where: { userId: { in: [user, other] } } });
    if (ups.length) await supabaseAdmin().storage.from("resumes").remove(ups.map((u) => u.storageKey));
    await db.user.deleteMany({ where: { id: { in: [user, other] } } });
    await db.$disconnect();
  });

  it("uploads, analyzes and stores a version; flags the CNIC", async () => {
    const r = await upload(user, "Ayesha Khan CV.docx", resume);
    const done = await svc.finalizeUpload(user, r.uploadId);
    expect(done.ok).toBe(true);
    const v = await svc.getVersion(user, (done as { versionId: string }).versionId);
    expect(v?.label).toBe("v1");
    expect(v?.upload?.atsText).toContain("Kinara Software");
    const a = v!.analyses[0];
    expect(a.parseHealth).toBeGreaterThan(0);
    const findings = a.findings as { ruleId: string; evidence?: string[] }[];
    const cnic = findings.find((f) => f.ruleId === "PII1");
    expect(cnic).toBeTruthy();
    expect(JSON.stringify(findings)).not.toContain("1234567-1");
    expect(await db.consentRecord.count({ where: { userId: user, type: "SENSITIVE_DATA" } })).toBe(1);
  });

  it("rejects a disguised file and deletes it from storage", async () => {
    const fake = Buffer.from("MZ this is an executable pretending to be a resume, padded ".repeat(20));
    const r = await upload(user, "resume.pdf", fake);
    const done = await svc.finalizeUpload(user, r.uploadId);
    expect(done).toEqual({ ok: false, reason: "WRONG_TYPE" });
    const row = await db.resumeUpload.findUnique({ where: { id: r.uploadId } });
    expect(row?.status).toBe("REJECTED");
    expect(row?.fileDeletedAt).not.toBeNull();
    const { data } = await supabaseAdmin().storage.from("resumes").list(`u/${user}/uploads`);
    expect(data?.some((f) => r.uploadId && f.name.startsWith(r.uploadId))).toBe(false);
  });

  it("another user can't finalize, read, download or delete someone else's resume", async () => {
    const r = await upload(user, "cv.docx", resume);
    await expect(svc.finalizeUpload(other, r.uploadId)).rejects.toBeInstanceOf(svc.NotFoundError);
    const done = await svc.finalizeUpload(user, r.uploadId);
    const id = (done as { versionId: string }).versionId;
    expect(await svc.getVersion(other, id)).toBeNull();
    await expect(svc.originalDownloadUrl(other, id)).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.deleteVersion(other, id)).rejects.toBeInstanceOf(svc.NotFoundError);
    expect((await svc.listVersions(other)).length).toBe(0);
  });

  it("the browser key cannot read the private bucket directly", async () => {
    const up = await db.resumeUpload.findFirst({ where: { userId: user, status: "PARSED" } });
    const { data } = await browser.storage.from("resumes").download(up!.storageKey);
    expect(data).toBeNull();
  });

  it("deleting the last version removes the stored file", async () => {
    const versions = await svc.listVersions(user);
    for (const v of versions) await svc.deleteVersion(user, v.id);
    expect(await svc.listVersions(user)).toHaveLength(0);
    expect(await db.resumeUpload.count({ where: { userId: user, status: "PARSED" } })).toBe(0);
  });
});

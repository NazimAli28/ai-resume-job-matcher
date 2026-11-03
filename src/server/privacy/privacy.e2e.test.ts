import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readCentralDirectory, readEntry } from "../resume/files/zip";
import { zipChunks } from "./zip";

// End-to-end against the real database and storage. Runs locally only.
config({ path: ".env.local", quiet: true });
vi.mock("server-only", () => ({}));
const hasEnv = Boolean(process.env.DATABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!hasEnv)("export, deletion and daily job end to end", async () => {
  if (!hasEnv) return;
  const { db } = await import("../db");
  const { supabaseAdmin } = await import("../supabase/admin");
  const { exportEntries, collectUserData } = await import("./export");
  const { requestDeletion, cancelDeletion, finalizeDueDeletions, purgeAccount, UNDO_DAYS } = await import("./deletion");
  const { runDaily } = await import("../tasks/daily");
  const { pepperHash } = await import("../http/request");
  const { assertQuota, recordUsage, usageFor, QuotaError } = await import("../usage/service");
  const { track } = await import("../events");
  const storage = () => supabaseAdmin().storage.from("resumes");

  const user = randomUUID();
  const other = randomUUID();
  const email = (id: string) => `e2e-${id}@test.invalid`;
  const uploadId = randomUUID();
  const key = `u/${user}/uploads/${uploadId}.pdf`;
  const fileBytes = Buffer.from("%PDF-1.4 fake file for the export test");

  async function seed(id: string, secret: string) {
    await db.user.create({ data: { id, email: email(id) } });
    const version = await db.resumeVersion.create({ data: { userId: id, label: "v1", name: secret, source: "MANUAL", targetMarket: "PK_LOCAL", content: { secret }, contentHash: "h" } });
    const job = await db.job.create({ data: { userId: id, title: secret, rawText: secret, textHash: randomUUID() } });
    await db.application.create({
      data: {
        userId: id,
        company: secret,
        title: "Dev",
        resumeVersionId: version.id,
        jobId: job.id,
        history: { create: { userId: id, toStatus: "APPLIED" } },
        contacts: { create: { userId: id, name: secret } },
        rounds: { create: { userId: id, type: "HR" } },
      },
    });
    await db.resumeVersion.update({ where: { id: version.id }, data: { lockedAt: new Date(), state: "LOCKED" } });
    await db.consentRecord.create({ data: { userId: id, type: "TERMS", granted: true, docVersion: "t" } });
    await db.auditLog.create({ data: { action: "LOGIN", subjectUserId: id, ipPrefix: "1.2.3.0/24" } });
    await db.aiRequest.create({ data: { userId: id, task: "t", promptVersion: "p", model: "m", status: "OK", costUsd: 0.01 } });
    await track(id, "SIGNED_IN");
  }

  beforeAll(async () => {
    await seed(user, "mine-secret");
    await seed(other, "other-secret");
    await db.resumeUpload.create({ data: { id: uploadId, userId: user, storageKey: key, originalName: "cv.pdf", sizeBytes: fileBytes.length, status: "PARSED" } });
    const { error } = await storage().upload(key, fileBytes, { contentType: "application/pdf" });
    if (error) throw new Error(error.message);
  });

  afterAll(async () => {
    await storage().remove([key]);
    await db.user.deleteMany({ where: { id: { in: [user, other] } } });
    const hashes = [user, other].map((id) => pepperHash(id));
    await db.deletionLedger.deleteMany({ where: { userIdHash: { in: hashes } } });
    await db.productEvent.deleteMany({ where: { userIdHash: { in: hashes } } });
    await db.$disconnect();
  });

  it("exports the user's rows and files, and nothing of anyone else's", async () => {
    const parts: Buffer[] = [];
    for await (const c of zipChunks(exportEntries(user))) parts.push(c);
    const zip = Buffer.concat(parts);
    const dir = readCentralDirectory(zip);
    expect(dir.has("README.txt")).toBe(true);
    expect(readEntry(zip, dir.get(`files/${uploadId}-cv.pdf`)!).equals(fileBytes)).toBe(true);

    const json = readEntry(zip, dir.get("data.json")!).toString();
    const data = JSON.parse(json);
    expect(json).toContain("mine-secret");
    expect(json).not.toContain("other-secret");
    expect(json).not.toContain(other);
    expect(data.applications[0].contacts[0].name).toBe("mine-secret");
    expect(data.applications[0].history).toHaveLength(1);
    expect(data.applications[0].rounds).toHaveLength(1);
    expect(data.consents).toHaveLength(1);
    expect(data.activity[0].action).toBe("LOGIN");
    expect(Object.keys(await collectUserData(user))).toEqual(expect.arrayContaining(["account", "profile", "jobs", "resumeVersions", "usage", "feedback"]));
  });

  it("stops at the monthly limit, and only counts what's recorded", async () => {
    const { limit } = await usageFor(other, "COVER_LETTER");
    await assertQuota(other, "COVER_LETTER");
    for (let i = 0; i < limit; i++) await recordUsage(other, "COVER_LETTER");
    await expect(assertQuota(other, "COVER_LETTER")).rejects.toThrow(QuotaError);
    expect((await usageFor(user, "COVER_LETTER")).used).toBe(0);
  });

  it("respects the opt-out for usage counts", async () => {
    const hash = pepperHash(other);
    const before = await db.productEvent.count({ where: { userIdHash: hash } });
    await db.consentRecord.create({ data: { userId: other, type: "ANALYTICS_COOKIES", granted: false, docVersion: "t" } });
    await track(other, "SIGNED_IN");
    expect(await db.productEvent.count({ where: { userIdHash: hash } })).toBe(before);
  });

  it("can be undone within the window, and only purges after it", async () => {
    await requestDeletion(user);
    expect((await db.user.findUniqueOrThrow({ where: { id: user } })).deletedAt).not.toBeNull();
    expect(await cancelDeletion(user)).toBe(true);
    expect((await db.user.findUniqueOrThrow({ where: { id: user } })).deletedAt).toBeNull();
    expect(await cancelDeletion(user)).toBe(false);

    await requestDeletion(user);
    // Inside the window nothing is touched, even though the job runs.
    const soon = new Date(Date.now() + (UNDO_DAYS - 1) * 86_400_000);
    const r = await finalizeDueDeletions(soon);
    expect(r.done).toBe(0);
    expect(await db.user.findUnique({ where: { id: user } })).not.toBeNull();
  });

  it("removes every trace after the window and leaves other accounts alone", async () => {
    const later = new Date(Date.now() + (UNDO_DAYS + 1) * 86_400_000);
    // The test users have no sign-in record, which the purge treats as already gone.
    const r = await finalizeDueDeletions(later);
    expect(r.done).toBeGreaterThanOrEqual(1);

    expect(await db.user.findUnique({ where: { id: user } })).toBeNull();
    expect(await db.application.count({ where: { userId: user } })).toBe(0);
    expect(await db.resumeVersion.count({ where: { userId: user } })).toBe(0);
    expect(await db.job.count({ where: { userId: user } })).toBe(0);
    expect(await db.contact.count({ where: { userId: user } })).toBe(0);
    expect(await db.consentRecord.count({ where: { userId: user } })).toBe(0);
    expect(await db.resumeUpload.count({ where: { userId: user } })).toBe(0);
    expect(await db.auditLog.count({ where: { subjectUserId: user } })).toBe(0);
    expect(await db.aiRequest.count({ where: { userId: user } })).toBe(0);
    expect(await db.productEvent.count({ where: { userIdHash: pepperHash(user) } })).toBe(0);
    const { data } = await storage().list(`u/${user}/uploads`);
    expect(data ?? []).toHaveLength(0);
    expect(await db.deletionLedger.count({ where: { emailHash: pepperHash(email(user)) } })).toBe(1);

    expect(await db.user.findUnique({ where: { id: other } })).not.toBeNull();
    expect(await db.application.count({ where: { userId: other } })).toBe(1);
    await expect(purgeAccount(user)).resolves.toBeUndefined();
  }, 30_000);

  it("the admin figures compute, and the guard masks emails", async () => {
    const { adminOverview, adminUsers } = await import("../admin/metrics");
    const { maskEmail } = await import("../admin/guard");
    const m = await adminOverview();
    expect(m.users.total).toBeGreaterThanOrEqual(1);
    expect(m.ai.costMonth).toBeGreaterThanOrEqual(0);
    expect(m.funnel.map((f) => f.name)).toContain("SIGNED_IN");
    const page = await adminUsers(0);
    expect(page.rows.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(page.rows[0])).not.toContain("content");
    expect(maskEmail("sample@example.com")).toBe("sa***@example.com");
  }, 30_000);

  it("the daily job tidies expired rows and reports each step", async () => {
    const stale = randomUUID();
    await db.rateLimitBucket.create({ data: { key: `e2e:${stale}`, windowStart: new Date(0), count: 1, expiresAt: new Date(1000) } });
    const out = await runDaily();
    expect(out.logs).not.toBe("failed");
    expect(out.uploads).not.toBe("failed");
    expect(out.deletions).not.toBe("failed");
    expect(await db.rateLimitBucket.count({ where: { key: `e2e:${stale}` } })).toBe(0);
  }, 30_000);
});

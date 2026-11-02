import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { newApplicationSchema, roundSchema } from "./schemas";

// End-to-end against the real database. Runs locally only.
config({ path: ".env.local", quiet: true });
vi.mock("server-only", () => ({}));
const hasEnv = Boolean(process.env.DATABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!hasEnv)("tracker end to end", async () => {
  if (!hasEnv) return;
  const { db } = await import("../db");
  const svc = await import("./service");
  const resumes = await import("../resume/service");
  const jobs = await import("../match/service");
  const user = randomUUID();
  const other = randomUUID();
  const content = { schemaVersion: 1, basics: { profiles: [] }, work: [], education: [], skills: [], projects: [], certifications: [], languages: [], sections: [] };

  const newVersion = (label: string, userId = user) => db.resumeVersion.create({ data: { userId, label, name: "CV", source: "MANUAL", targetMarket: "PK_LOCAL", content, contentHash: label } });
  const input = (o: Record<string, unknown> = {}) =>
    newApplicationSchema.parse({ company: "Acme", title: "Backend Developer", location: "", url: "", source: "ROZEE_PK", sourceDetail: "", deadline: "", salaryExpected: "", priority: "2", jobId: "", resumeVersionId: "", status: "SAVED", appliedAt: "", notes: "", ...o });

  beforeAll(async () => {
    await db.user.createMany({ data: [user, other].map((id) => ({ id, email: `e2e-${id}@test.invalid` })) });
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: [user, other] } } });
    await db.$disconnect();
  });

  it("adds an application by hand, with its first history row", async () => {
    const a = await svc.createApplication(user, input());
    const view = await svc.getApplication(user, a.id);
    expect(view?.status).toBe("SAVED");
    expect(view?.appliedAt).toBeNull();
    expect(view?.history.map((h) => [h.fromStatus, h.toStatus])).toEqual([[null, "SAVED"]]);
  });

  it("backdates an application, and records the move on that day", async () => {
    const a = await svc.createApplication(user, input({ company: "Backdated", status: "APPLIED", appliedAt: "2026-10-01" }));
    const view = await svc.getApplication(user, a.id);
    expect(view?.appliedAt?.toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(view?.history[0].changedAt.toISOString().slice(0, 10)).toBe("2026-10-01");
  });

  it("writes history for every move, sets appliedAt, and undo leaves no trace", async () => {
    const a = await svc.createApplication(user, input({ company: "Mover" }));
    const moved = await svc.moveApplication(user, a.id, "APPLIED", null);
    let view = await svc.getApplication(user, a.id);
    expect(view?.status).toBe("APPLIED");
    expect(view?.appliedAt).not.toBeNull();
    expect(view?.history.map((h) => h.toStatus)).toEqual(["SAVED", "APPLIED"]);

    await svc.undoMove(user, a.id, moved.historyId!);
    view = await svc.getApplication(user, a.id);
    expect(view?.status).toBe("SAVED");
    expect(view?.appliedAt).toBeNull();
    expect(view?.history).toHaveLength(1);

    // Moving to the current stage writes nothing.
    expect((await svc.moveApplication(user, a.id, "SAVED", null)).historyId).toBeNull();
    // Reopening a closed application is allowed and logged.
    await svc.moveApplication(user, a.id, "REJECTED", "Not a fit");
    await svc.moveApplication(user, a.id, "APPLIED", null);
    view = await svc.getApplication(user, a.id);
    expect(view?.history.map((h) => h.toStatus)).toEqual(["SAVED", "REJECTED", "APPLIED"]);
    expect(view?.history[1].note).toBe("Not a fit");
  });

  it("won't undo anything but the newest move", async () => {
    const a = await svc.createApplication(user, input({ company: "Undo" }));
    const first = await svc.moveApplication(user, a.id, "APPLIED", null);
    await svc.moveApplication(user, a.id, "SCREENING", null);
    await expect(svc.undoMove(user, a.id, first.historyId!)).rejects.toThrow(svc.NotFoundError);
  });

  it("locks the linked version: the database refuses content changes", async () => {
    const v = await newVersion("locked");
    const a = await svc.createApplication(user, input({ company: "Lock", resumeVersionId: v.id }));
    const after = await db.resumeVersion.findUniqueOrThrow({ where: { id: v.id } });
    expect(after.state).toBe("LOCKED");
    expect(after.lockedAt).not.toBeNull();
    await expect(db.resumeVersion.update({ where: { id: v.id }, data: { content: { changed: true } } })).rejects.toThrow();
    expect((await svc.getApplication(user, a.id))?.resumeVersion?.id).toBe(v.id);
  });

  it("keeps a deleted resume until the last application using it goes, then removes it", async () => {
    const v = await newVersion("kept");
    const a = await svc.createApplication(user, input({ company: "Keep1", resumeVersionId: v.id }));
    const b = await svc.createApplication(user, input({ company: "Keep2", resumeVersionId: v.id }));

    await resumes.deleteVersion(user, v.id);
    const soft = await db.resumeVersion.findUniqueOrThrow({ where: { id: v.id } });
    expect(soft.deletedAt).not.toBeNull();
    expect((await svc.getApplication(user, a.id))?.resumeVersion?.deletedAt).not.toBeNull();
    // A deleted version can't be newly linked.
    await expect(svc.linkResume(user, a.id, v.id)).rejects.toThrow(svc.NotFoundError);

    await svc.deleteApplication(user, a.id);
    expect(await db.resumeVersion.findUnique({ where: { id: v.id } })).not.toBeNull();
    await svc.deleteApplication(user, b.id);
    expect(await db.resumeVersion.findUnique({ where: { id: v.id } })).toBeNull();
  });

  it("fully deletes a locked resume once no application uses it", async () => {
    const v = await newVersion("released");
    const a = await svc.createApplication(user, input({ company: "Release", resumeVersionId: v.id }));
    await svc.deleteApplication(user, a.id);
    await resumes.deleteVersion(user, v.id);
    expect(await db.resumeVersion.findUnique({ where: { id: v.id } })).toBeNull();
  });

  it("survives deleting the job, with its copy of the post and score", async () => {
    const v = await newVersion("job");
    const rawText = `Post text ${randomUUID()}`;
    const job = await db.job.create({ data: { userId: user, title: "Dev", rawText, textHash: randomUUID() } });
    await db.jobMatch.create({ data: { userId: user, jobId: job.id, resumeVersionId: v.id, score: 72, factors: [], items: [], engineVersion: "t", inputsHash: "t" } });
    const a = await svc.createApplication(user, input({ company: "FromJob", jobId: job.id, resumeVersionId: v.id }));
    expect(a.jobText).toBe(rawText);
    expect(a.matchScore).toBe(72);

    await jobs.deleteJob(user, job.id);
    const view = await svc.getApplication(user, a.id);
    expect(view?.jobId).toBeNull();
    expect(view?.jobText).toBe(rawText);
    expect(view?.matchScore).toBe(72);
  });

  it("finds a duplicate regardless of case and punctuation", async () => {
    await svc.createApplication(user, input({ company: "Dup Ltd.", title: "QA-Lead" }));
    expect(await svc.findDuplicate(user, "dup ltd", "qa lead")).not.toBeNull();
    expect(await svc.findDuplicate(user, "dup ltd", "qa manager")).toBeNull();
    expect(await svc.findDuplicate(other, "dup ltd", "qa lead")).toBeNull();
  });

  it("adds a round without changing the stage, and snoozing leaves status and history alone", async () => {
    const a = await svc.createApplication(user, input({ company: "Round", status: "APPLIED" }));
    await svc.addRound(user, a.id, roundSchema.parse({ type: "HR", scheduledAt: "2026-12-01T05:00:00.000Z", notes: "" }));
    await svc.snoozeNudge(user, a.id);
    const view = await svc.getApplication(user, a.id);
    expect(view?.status).toBe("APPLIED");
    expect(view?.history).toHaveLength(1);
    expect(view?.rounds[0].scheduledAt?.toISOString()).toBe("2026-12-01T05:00:00.000Z");
    expect(view?.nudgeSnoozedUntil).not.toBeNull();
  });

  it("blocks another account everywhere", async () => {
    const v = await newVersion("mine");
    const a = await svc.createApplication(user, input({ company: "Private", resumeVersionId: v.id }));
    await svc.addRound(user, a.id, roundSchema.parse({ type: "HR", scheduledAt: "", notes: "" }));
    const contact = await db.contact.create({ data: { userId: user, applicationId: a.id, name: "Sara" } });
    const round = await db.interviewRound.findFirstOrThrow({ where: { applicationId: a.id } });
    const denied = svc.NotFoundError;

    expect(await svc.getApplication(other, a.id)).toBeNull();
    expect(await svc.listApplications(other)).toEqual([]);
    await expect(svc.moveApplication(other, a.id, "OFFER", null)).rejects.toThrow(denied);
    await expect(svc.undoMove(other, a.id, randomUUID())).rejects.toThrow(denied);
    await expect(svc.setNotes(other, a.id, "x")).rejects.toThrow(denied);
    await expect(svc.setReminder(other, a.id, { nextActionAt: null, nextActionNote: null })).rejects.toThrow(denied);
    await expect(svc.snoozeNudge(other, a.id)).rejects.toThrow(denied);
    await expect(svc.linkResume(other, a.id, null)).rejects.toThrow(denied);
    await expect(svc.deleteApplication(other, a.id)).rejects.toThrow(denied);
    await expect(svc.addRound(other, a.id, { type: "HR", scheduledAt: null, notes: null })).rejects.toThrow(denied);
    await expect(svc.setRoundOutcome(other, round.id, "PASSED")).rejects.toThrow(denied);
    await expect(svc.deleteRound(other, round.id)).rejects.toThrow(denied);
    await expect(svc.deleteContact(other, contact.id)).rejects.toThrow(denied);
    await expect(svc.addContact(other, a.id, { name: "x", role: "OTHER", email: null, phone: null, linkedinUrl: null, notes: null })).rejects.toThrow(denied);

    // Nor can someone link another account's resume or job to their own application.
    const theirs = await svc.createApplication(other, input({ company: "Theirs" }));
    await expect(svc.linkResume(other, theirs.id, v.id)).rejects.toThrow(denied);
    await expect(svc.createApplication(other, input({ company: "Steal", resumeVersionId: v.id }))).rejects.toThrow(denied);
    expect((await db.application.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("SAVED");
  });

  it("rejects a CNIC and script links at the boundary", () => {
    expect(newApplicationSchema.safeParse({ ...baseRaw(), notes: "CNIC 35202-1234567-1" }).success).toBe(false);
    expect(newApplicationSchema.safeParse({ ...baseRaw(), url: "javascript:alert(1)" }).success).toBe(false);
    expect(newApplicationSchema.safeParse({ ...baseRaw(), company: "  " }).success).toBe(false);
    expect(newApplicationSchema.safeParse(baseRaw()).success).toBe(true);
  });
  const baseRaw = () => ({ company: "A", title: "B", location: "", url: "", source: "OTHER", sourceDetail: "", deadline: "", salaryExpected: "", priority: "2", jobId: "", resumeVersionId: "", status: "SAVED", appliedAt: "", notes: "" });

  it("deleting an account removes everything, even with a linked resume", async () => {
    const gone = randomUUID();
    await db.user.create({ data: { id: gone, email: `e2e-${gone}@test.invalid` } });
    const v = await newVersion("gone", gone);
    const a = await svc.createApplication(gone, input({ company: "Gone", resumeVersionId: v.id, status: "APPLIED" }));
    await db.user.delete({ where: { id: gone } });
    expect(await db.application.findUnique({ where: { id: a.id } })).toBeNull();
    expect(await db.resumeVersion.findUnique({ where: { id: v.id } })).toBeNull();
    expect(await db.applicationStatusHistory.count({ where: { userId: gone } })).toBe(0);
  });
});

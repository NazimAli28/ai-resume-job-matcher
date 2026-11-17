import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createMockProvider } from "../ai/provider/mock";

// End-to-end against the real database with a fake AI. No real AI call is made.
config({ path: ".env.local", quiet: true });
vi.mock("server-only", () => ({}));
const hasEnv = Boolean(process.env.DATABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!hasEnv)("AI-improvement examples end to end", async () => {
  if (!hasEnv) return;
  const { db } = await import("../db");
  const t = await import("./service");
  const jobs = await import("../match/service");
  const tailor = await import("../tailor/service");
  const { collectUserData } = await import("../privacy/export");
  const { requestDeletion } = await import("../privacy/deletion");
  const user = randomUUID();
  let versionId = "";

  const JD = `Backend Developer at Acme, Lahore. Node.js is required. Docker is required. Send your CV to hr@acme.example or call 0300-7654321. ${"Duties include building services. ".repeat(8)}`;
  const provider = createMockProvider({
    extract_job: {
      isJobPost: true, title: "Backend Developer", company: "Acme", location: "Lahore", workMode: "ONSITE", seniorityHint: null, responsibilities: [], suspiciousInstructions: false,
      requirements: [{ text: "Node.js", quote: "Node.js is required", kind: "TOOL", priority: "MUST_HAVE", hard: false, skillTerm: "Node.js", years: null, degreeLevel: null }],
    },
    suggest_edits: {
      suggestions: [{ kind: "REWRITE", targetId: "b1", newText: "Built Node.js services at Northwind Traders for the payments team", question: "", citeIds: ["b1"], reqIds: [], rationale: "Clearer verb." }],
    },
  });
  const mine = () => db.trainingExample.findMany({ where: { subjectHash: t.subjectHash(user) }, orderBy: { createdAt: "asc" } });
  const answer = (granted: boolean) => db.consentRecord.create({ data: { userId: user, type: "TRAINING_OPT_IN", granted, docVersion: "privacy@2026-11-18" } });
  const addJob = () => jobs.createJob(user, { resumeVersionId: versionId, rawText: `${JD} ${randomUUID()}`, url: null, source: "LINKEDIN", sourceDetail: null, title: null, company: null, allowDuplicate: true }, provider);

  beforeAll(async () => {
    await db.user.create({ data: { id: user, email: `e2e-${user}@test.invalid`, name: "Zainab Qureshi" } });
    const content = {
      schemaVersion: 1, basics: { name: "Zainab Qureshi", email: "zainab.q@example.com", phone: "+92 300 1234567", location: "Lahore", profiles: [], summary: "Zainab is a developer who builds backend services and internal tools for online payments." },
      education: [{ id: "e1", institution: "Lakeside University", degreeRaw: "BS Computer Science" }], projects: [], certifications: [], languages: [], sections: [], skills: ["Git"],
      work: [{ id: "w", title: "Developer", employer: "Northwind Traders", bullets: [{ id: "b1", text: "Worked on Node.js services at Northwind Traders for the payments team", hasMetric: false }] }],
    };
    versionId = (await db.resumeVersion.create({ data: { userId: user, label: "v1", name: "CV", source: "MANUAL", targetMarket: "PK_LOCAL", content, contentHash: "h1" } })).id;
  });

  afterAll(async () => {
    await db.trainingExample.deleteMany({ where: { subjectHash: t.subjectHash(user) } });
    await db.aiRequest.deleteMany({ where: { userId: user } });
    await db.user.deleteMany({ where: { id: user } });
    await db.$disconnect();
  });

  it("saves nothing before the person answers, and nothing after No", async () => {
    expect(await t.hasAnswered(user)).toBe(false);
    await addJob();
    expect(await mine()).toHaveLength(0);
    // A Yes from the old, differently worded Settings switch neither counts as an answer nor starts collection.
    await db.consentRecord.create({ data: { userId: user, type: "TRAINING_OPT_IN", granted: true, docVersion: "privacy@2026-10-30" } });
    expect(await t.hasAnswered(user)).toBe(false);
    await addJob();
    expect(await mine()).toHaveLength(0);
    await answer(false);
    expect(await t.hasAnswered(user)).toBe(true);
    await addJob();
    expect(await mine()).toHaveLength(0);
  });

  it("after Yes, saves a de-identified example without the user ID", async () => {
    await answer(true);
    const job = await addJob();
    const rows = await mine();
    expect(rows).toHaveLength(1);
    const ex = rows[0];
    expect(ex.task).toBe("extract_job");
    expect(ex.refHash).toBeTruthy();
    const all = JSON.stringify(ex);
    expect(all).not.toContain(user);
    expect(all).not.toMatch(/hr@acme|7654321/);
    expect(JSON.stringify(ex.input)).toContain("Node.js is required");

    // The person corrects what the AI read: recorded as an edit, with the corrected list.
    const req = await db.jobRequirement.findFirstOrThrow({ where: { jobId: job.id } });
    await jobs.updateRequirement(user, req.id, { text: "Node.js and TypeScript", priority: "MUST_HAVE" });
    const edited = (await mine())[0];
    expect(edited.outcome).toBe("EDITED");
    expect(JSON.stringify(edited.edited)).toContain("Node.js and TypeScript");
  });

  it("removes the person's name and employer from resume suggestions, and records accept then edit", async () => {
    const job = await addJob();
    const session = await tailor.generate(user, job.id, versionId, { provider });
    const ex = (await mine()).find((r) => r.task === "suggest_edits")!;
    const text = JSON.stringify([ex.input, ex.output]);
    expect(text).not.toMatch(/Zainab|Qureshi|Northwind|Lakeside|zainab\.q@|1234567/);
    expect(text).toContain("{{COMPANY}}");

    const s = (session.suggestions as unknown as { id: string; before?: string }[]).find((x) => x.before)!;
    await tailor.setStatus(user, session.id, s.id, "APPLIED");
    expect((await db.trainingExample.findUniqueOrThrow({ where: { id: ex.id } })).outcome).toBe("ACCEPTED");
    await tailor.editSuggestion(user, session.id, s.id, "Built payment services in Node.js at Northwind Traders");
    const after = await db.trainingExample.findUniqueOrThrow({ where: { id: ex.id } });
    expect(after.outcome).toBe("EDITED");
    expect(JSON.stringify(after.edited)).toContain("Built payment services in Node.js at {{COMPANY}}");
  });

  it("includes the examples in the person's data download", async () => {
    const data = await collectUserData(user);
    expect(data.aiExamples.length).toBe((await mine()).length);
    expect(data.aiExamples.length).toBeGreaterThan(0);
  });

  it("deletes examples older than 2 years and keeps newer ones", async () => {
    const old = await db.trainingExample.create({ data: { subjectHash: t.subjectHash(user), task: "t", promptVersion: "p", model: "m", input: "x", output: "y", createdAt: new Date(Date.now() - (t.RETENTION_DAYS + 1) * 86_400_000) } });
    const before = (await mine()).length;
    await t.purgeOldExamples();
    expect(await db.trainingExample.findUnique({ where: { id: old.id } })).toBeNull();
    expect((await mine()).length).toBe(before - 1);
  });

  it("switching off deletes every example", async () => {
    expect((await mine()).length).toBeGreaterThan(0);
    await answer(false);
    await t.deleteExamplesFor(user);
    expect(await mine()).toHaveLength(0);
    await addJob();
    expect(await mine()).toHaveLength(0);
  });

  it("deleting the account deletes examples straight away", async () => {
    await answer(true);
    await addJob();
    expect((await mine()).length).toBe(1);
    await requestDeletion(user);
    expect(await mine()).toHaveLength(0);
    await db.user.update({ where: { id: user }, data: { deletedAt: null } });
  });
});

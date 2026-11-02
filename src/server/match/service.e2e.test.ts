import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createMockProvider } from "../ai/provider/mock";
import type { AiProvider } from "../ai/provider/types";
import { AiInvalidOutputError } from "../ai/provider/types";
import type { MatchItem } from "./engine";

// End-to-end against the real database with a fake AI. Runs locally only; no real AI call is made.
config({ path: ".env.local", quiet: true });
vi.mock("server-only", () => ({}));
const hasEnv = Boolean(process.env.DATABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!hasEnv)("job matching end to end", async () => {
  if (!hasEnv) return;
  const { db } = await import("../db");
  const svc = await import("./service");
  const { runAiTask, SPEND, AiUnavailableError } = await import("../ai/run");
  const { extractJobRequest } = await import("../ai/tasks/extract-job");
  const user = randomUUID();
  const other = randomUUID();
  let versionId = "";

  const JD = `Backend Developer at Acme, Lahore. We need 3+ years of experience. Node.js is required. Docker is a plus. Must be a team player. ${"Duties include building services. ".repeat(8)}`;
  const extraction = {
    isJobPost: true,
    title: "Backend Developer",
    company: "Acme",
    location: "Lahore",
    workMode: "ONSITE",
    seniorityHint: null,
    requirements: [
      { text: "Node.js", quote: "Node.js is required", kind: "TOOL", priority: "MUST_HAVE", hard: false, skillTerm: "Node.js", years: null, degreeLevel: null },
      { text: "Docker", quote: "Docker is a plus", kind: "TOOL", priority: "NICE_TO_HAVE", hard: false, skillTerm: "Docker", years: null, degreeLevel: null },
      { text: "Team player", quote: "team player", kind: "SOFT", priority: "MUST_HAVE", hard: false, skillTerm: null, years: null, degreeLevel: null },
      { text: "Made up by the model", quote: "this is not in the post", kind: "TOOL", priority: "MUST_HAVE", hard: true, skillTerm: "Cobol", years: null, degreeLevel: null },
    ],
    responsibilities: ["Build services"],
    suspiciousInstructions: false,
  };
  const provider = createMockProvider({ extract_job: extraction });
  const input = (o = {}) => ({ resumeVersionId: versionId, rawText: JD, url: null, source: "LINKEDIN" as const, sourceDetail: null, title: null, company: null, allowDuplicate: false, ...o });
  const itemsOf = (m: { items: unknown }) => m.items as MatchItem[];

  beforeAll(async () => {
    await db.user.createMany({ data: [user, other].map((id) => ({ id, email: `e2e-${id}@test.invalid` })) });
    const content = {
      schemaVersion: 1,
      basics: { profiles: [] },
      work: [{ id: "w", title: "Web Developer", employer: "Kinara", dates: { start: { year: 2023, month: 1, raw: "" }, isCurrent: true, raw: "" }, bullets: [{ id: "b", text: "Built 5 Node.js services", hasMetric: true }] }],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      sections: [],
    };
    const v = await db.resumeVersion.create({ data: { userId: user, label: "v1", name: "CV", source: "MANUAL", targetMarket: "PK_LOCAL", content, contentHash: "h" } });
    versionId = v.id;
  });

  afterAll(async () => {
    await db.aiRequest.deleteMany({ where: { userId: { in: [user, other] } } });
    await db.user.deleteMany({ where: { id: { in: [user, other] } } });
    await db.$disconnect();
  });

  it("creates a job, drops what the post doesn't quote, and computes a match", async () => {
    const job = await svc.createJob(user, input(), provider);
    const view = await svc.getJobView(user, job.id);
    expect(job).toMatchObject({ title: "Backend Developer", company: "Acme", source: "LINKEDIN" });
    expect(view?.job.requirements.map((r) => r.text)).toEqual(["Node.js", "Docker", "Team player"]);
    const items = itemsOf(view!.match!);
    expect(items.find((i) => i.text === "Node.js")).toMatchObject({ cls: "STRONG" });
    expect(items.find((i) => i.text === "Docker")).toMatchObject({ cls: "MISSING" });
    expect(items.find((i) => i.text === "Team player")).toMatchObject({ cls: "UNKNOWN" });
  });

  it("logs metadata only for the AI call", async () => {
    const row = await db.aiRequest.findFirst({ where: { userId: user } });
    expect(row).toMatchObject({ task: "extract_job", status: "OK" });
    expect(JSON.stringify(row)).not.toContain("Acme");
  });

  it("finds a duplicate before any AI call", async () => {
    const dup = await svc.findDuplicate(user, JD.toUpperCase());
    expect(dup?.title).toBe("Backend Developer");
    expect(await svc.findDuplicate(other, JD)).toBeNull();
  });

  it("the evidence answer saves a fact, raises the score, and stores nothing when nothing changed", async () => {
    const job = (await svc.listJobs(user))[0];
    const before = (await svc.getJobView(user, job.id))!;
    const again = (await svc.getJobView(user, job.id))!;
    expect(again.match!.id).toBe(before.match!.id);

    const docker = before.job.requirements.find((r) => r.text === "Docker")!;
    await svc.addEvidence(user, docker.id, "I set up Docker for local development at my last job");
    const after = (await svc.getJobView(user, job.id))!;
    expect(itemsOf(after.match!).find((i) => i.text === "Docker")).toMatchObject({ cls: "STRONG" });
    expect(after.match!.score).toBeGreaterThan(before.match!.score);
    expect(after.previous?.score).toBe(before.match!.score);
    expect(await db.factBankItem.count({ where: { userId: user, skillName: "Docker", source: "MATCH_QUESTION" } })).toBe(1);

    // Nothing was written to the resume.
    const v = await db.resumeVersion.findUnique({ where: { id: versionId } });
    expect(JSON.stringify(v?.content)).not.toContain("Docker");
  });

  it("another user gets nothing", async () => {
    const job = (await svc.listJobs(user))[0];
    const reqId = (await db.jobRequirement.findFirst({ where: { jobId: job.id } }))!.id;
    expect(await svc.getJobView(other, job.id)).toBeNull();
    expect(await svc.listJobs(other)).toEqual([]);
    await expect(svc.setOverride(other, reqId, "REJECT")).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.addEvidence(other, reqId, "I definitely have this skill")).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.updateRequirement(other, reqId, { text: "Hacked", priority: "MUST_HAVE" })).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.deleteRequirement(other, reqId)).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.addRequirement(other, job.id, { text: "Hacked", priority: "MUST_HAVE" })).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.deleteJob(other, job.id)).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.recompute(other, job.id, versionId)).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.createJob(other, input(), provider)).rejects.toBeInstanceOf(svc.NotFoundError);
    expect(await db.jobRequirement.findUnique({ where: { id: reqId } })).not.toBeNull();
  });

  it("rejects a post that isn't a job", async () => {
    const notJob = createMockProvider({ extract_job: { ...extraction, isJobPost: false, requirements: [] } });
    await expect(svc.createJob(user, input({ rawText: `${JD} variant` }), notJob)).rejects.toBeInstanceOf(svc.NotAJobError);
  });

  it("retries an unusable answer once, then fails softly and logs both", async () => {
    const calls = vi.fn();
    const bad: AiProvider = {
      id: "mock",
      generateStructured: async () => {
        calls();
        throw new AiInvalidOutputError({ inTok: 10, outTok: 5, cachedTok: 0 }, 0.000001);
      },
    };
    const before = await db.aiRequest.count({ where: { userId: other } });
    await expect(runAiTask(other, extractJobRequest(JD), bad)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(calls).toHaveBeenCalledTimes(2);
    expect(await db.aiRequest.count({ where: { userId: other, status: "INVALID_OUTPUT" } })).toBe(before + 2);
  });

  it("stops at the user's budget before calling the AI", async () => {
    await db.aiRequest.create({ data: { userId: other, task: "extract_job", promptVersion: "t", model: "t", costUsd: SPEND.userDaily, status: "OK" } });
    const calls = vi.fn();
    const p: AiProvider = { id: "mock", generateStructured: async () => { calls(); throw new Error("should not run"); } };
    await expect(runAiTask(other, extractJobRequest(JD), p)).rejects.toMatchObject({ reason: "USER_BUDGET" });
    expect(calls).not.toHaveBeenCalled();
  });

  it("deleting a job removes its requirements and results; the resume stays", async () => {
    const job = (await svc.listJobs(user))[0];
    await svc.deleteJob(user, job.id);
    expect(await db.jobRequirement.count({ where: { jobId: job.id } })).toBe(0);
    expect(await db.jobMatch.count({ where: { jobId: job.id } })).toBe(0);
    expect(await db.resumeVersion.count({ where: { id: versionId } })).toBe(1);
  });
});

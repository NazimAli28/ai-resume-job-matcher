import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createMockProvider } from "../ai/provider/mock";
import type { Suggestion } from "./core";

// End-to-end against the real database with a scripted AI. Runs locally only; no real AI call is made.
config({ path: ".env.local", quiet: true });
vi.mock("server-only", () => ({}));
const hasEnv = Boolean(process.env.DATABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!hasEnv)("tailoring end to end", async () => {
  if (!hasEnv) return;
  const { db } = await import("../db");
  const svc = await import("./service");
  const jobs = await import("../match/service");
  const { usageFor } = await import("../usage/service");
  const user = randomUUID();
  const other = randomUUID();
  let versionId = "";
  let jobId = "";

  const JD = `Backend Developer at Acme, Lahore. Node.js is required. Docker is required. ${"Duties include building services. ".repeat(8)}`;
  const extraction = {
    isJobPost: true, title: "Backend Developer", company: "Acme", location: "Lahore", workMode: "ONSITE", seniorityHint: null, responsibilities: [], suspiciousInstructions: false,
    requirements: [
      { text: "Node.js", quote: "Node.js is required", kind: "TOOL", priority: "MUST_HAVE", hard: false, skillTerm: "Node.js", years: null, degreeLevel: null },
      { text: "Docker", quote: "Docker is required", kind: "TOOL", priority: "MUST_HAVE", hard: false, skillTerm: "Docker", years: null, degreeLevel: null },
    ],
  };
  const suggestions = {
    suggestions: [
      { kind: "REWRITE", targetId: "b1", newText: "Developed Node.js services for the payments team", question: "", citeIds: ["b1"], reqIds: [], rationale: "Clearer verb." },
      { kind: "REWRITE", targetId: "b2", newText: "Wrote tests that cut bugs by 40%", question: "", citeIds: ["b2"], reqIds: [], rationale: "Adds a result." },
      { kind: "REWRITE", targetId: "zz", newText: "Nonsense", question: "", citeIds: [], reqIds: [], rationale: "" },
    ],
  };
  const provider = createMockProvider({ extract_job: extraction, suggest_edits: suggestions });

  beforeAll(async () => {
    await db.user.createMany({ data: [user, other].map((id) => ({ id, email: `e2e-${id}@test.invalid` })) });
    const content = {
      schemaVersion: 1, basics: { name: "Test Person", email: "test.person@example.com", phone: "+92 300 1234567", location: "Lahore", profiles: [], summary: "Developer who builds and maintains backend services and internal tools for online payments." }, education: [{ id: "e1", institution: "Example University", degreeRaw: "BS Computer Science", dates: { start: { year: 2018, raw: "2018" }, end: { year: 2022, raw: "2022" }, isCurrent: false, raw: "2018 – 2022" } }], projects: [], certifications: [], languages: [], sections: [], skills: ["Git"],
      work: [{ id: "w", title: "Developer", employer: "Example Soft", dates: { start: { year: 2023, month: 1, raw: "Jan 2023" }, isCurrent: true, raw: "Jan 2023 – Present" }, bullets: [
        { id: "b1", text: "Worked on Node.js services for the payments team", hasMetric: false },
        { id: "b2", text: "Wrote tests for the checkout code", hasMetric: false },
      ] }],
    };
    const v = await db.resumeVersion.create({ data: { userId: user, label: "v1", name: "CV", source: "MANUAL", targetMarket: "PK_LOCAL", content, contentHash: "h1" } });
    versionId = v.id;
    jobId = (await jobs.createJob(user, { resumeVersionId: versionId, rawText: JD, url: null, source: "LINKEDIN", sourceDetail: null, title: null, company: null, allowDuplicate: false }, provider)).id;
  });

  afterAll(async () => {
    await db.aiRequest.deleteMany({ where: { userId: { in: [user, other] } } });
    await db.user.deleteMany({ where: { id: { in: [user, other] } } });
    await db.$disconnect();
  });

  const list = async () => ((await svc.getSession(user, jobId, versionId))!.suggestions as unknown as Suggestion[]);

  it("generates checked suggestions, counts one use, and reuses identical inputs for free", async () => {
    const s = await svc.generate(user, jobId, versionId, { provider });
    const items = s.suggestions as unknown as Suggestion[];
    expect(items.find((x) => x.targetId === "b1")).toMatchObject({ kind: "REWRITE", after: "Developed Node.js services for the payments team" });
    expect(items.find((x) => x.targetId === "b2")).toMatchObject({ kind: "QUESTION", answerType: "NUMBER" });
    expect(items.find((x) => x.targetId === "b2")!.template).toContain("[X]%");
    expect(items.some((x) => x.targetId === "zz")).toBe(false);
    expect(items.find((x) => x.kind === "SKILL_ADD")?.skill).toBe("Node.js");
    expect(items.find((x) => x.kind === "GAP_QUESTION")?.skill).toBe("Docker");
    expect((await usageFor(user, "TAILORED_VERSION")).used).toBe(1);

    const again = await svc.generate(user, jobId, versionId, { provider });
    expect(again.id).toBe(s.id);
    expect((await usageFor(user, "TAILORED_VERSION")).used).toBe(1);
  });

  it("answering a figure turns the question into a confirmed fact and a ready change", async () => {
    const q = (await list()).find((x) => x.targetId === "b2")!;
    await expect(svc.answer(user, (await svc.getSession(user, jobId, versionId))!.id, q.id, "<b>")).rejects.toThrow();
    const sessionId = (await svc.getSession(user, jobId, versionId))!.id;
    await svc.answer(user, sessionId, q.id, "25");
    const after = (await list()).find((x) => x.id === q.id)!;
    expect(after).toMatchObject({ kind: "REWRITE", status: "PENDING", after: "Wrote tests that cut bugs by 25%" });
    expect(await db.factBankItem.count({ where: { userId: user, statement: "Wrote tests that cut bugs by 25%" } })).toBe(1);
  });

  it("a gap answer becomes evidence for the skill and nothing is added to the resume", async () => {
    const gap = (await list()).find((x) => x.kind === "GAP_QUESTION")!;
    const sessionId = (await svc.getSession(user, jobId, versionId))!.id;
    await svc.answer(user, sessionId, gap.id, "Used Docker to run local databases in my final year project");
    expect(await db.factBankItem.count({ where: { userId: user, skillName: "Docker", source: "MATCH_QUESTION" } })).toBe(1);
  });

  it("accept all, undo one, and save a new version with a re-checked analysis", async () => {
    const sessionId = (await svc.getSession(user, jobId, versionId))!.id;
    await svc.setAll(user, sessionId, "accept");
    const b1 = (await list()).find((x) => x.targetId === "b1")!;
    await svc.setStatus(user, sessionId, b1.id, "PENDING");
    const v = await svc.finalize(user, sessionId);
    expect(v).toMatchObject({ source: "TAILORED", parentId: versionId, jobId });
    const content = v.content as { work: { bullets: { text: string }[] }[]; skills: string[] };
    expect(content.work[0].bullets[0].text).toBe("Worked on Node.js services for the payments team"); // undone
    expect(content.work[0].bullets[1].text).toBe("Wrote tests that cut bugs by 25%");
    expect(content.skills).toContain("Node.js");
    expect(content.skills).not.toContain("Docker");
    const analysis = await db.resumeAnalysis.findFirst({ where: { resumeVersionId: v.id } });
    expect(analysis!.parseHealth).toBeGreaterThanOrEqual(90);
    const parent = await db.resumeVersion.findUnique({ where: { id: versionId } });
    expect((parent!.content as { work: { bullets: { text: string }[] }[] }).work[0].bullets[1].text).toBe("Wrote tests for the checkout code");
  });

  it("another account can't see or change any of it", async () => {
    const sessionId = (await svc.getSession(user, jobId, versionId))!.id;
    const b1 = (await list()).find((x) => x.targetId === "b1")!;
    await expect(svc.generate(other, jobId, versionId, { provider })).rejects.toThrow(svc.NotFoundError);
    await expect(svc.setStatus(other, sessionId, b1.id, "APPLIED")).rejects.toThrow(svc.NotFoundError);
    await expect(svc.answer(other, sessionId, b1.id, "1")).rejects.toThrow(svc.NotFoundError);
    await expect(svc.finalize(other, sessionId)).rejects.toThrow(svc.NotFoundError);
    expect(await svc.getSession(other, jobId, versionId)).toBeNull();
  });
});

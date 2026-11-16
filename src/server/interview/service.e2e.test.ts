import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createMockProvider } from "../ai/provider/mock";

// End-to-end against the real database with a scripted AI. Runs locally only; no real AI call is made.
config({ path: ".env.local", quiet: true });
vi.mock("server-only", () => ({}));
const hasEnv = Boolean(process.env.DATABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!hasEnv)("mock interview end to end", async () => {
  if (!hasEnv) return;
  const { db } = await import("../db");
  const svc = await import("./service");
  const { usageFor } = await import("../usage/service");
  const user = randomUUID();
  const other = randomUUID();
  let versionId = "";

  const blueprint = { questions: [1, 2, 3, 4, 5].map((slot) => ({ slot, question: `Question number ${slot}?`, competency: "Delivery", keyPoints: ["situation", "your action", "a result"], whyAsked: "To see how you work." })) };
  const noResult = { situation: { present: true, quote: "billing reports were slow" }, task: { present: false, quote: "" }, action: { present: true, quote: "I rewrote the queries" }, result: { present: false, quote: "" }, metrics: [], keyPointsCovered: [1, 2], offTopic: false };
  const evaluation = {
    dims: [
      { dim: "SPECIFICITY", score: 4, quote: "I rewrote the queries" },
      { dim: "RELEVANCE", score: 5, quote: "billing reports were slow" },
      { dim: "CLARITY", score: 4, quote: "this quote is not in the answer" },
      { dim: "ACCURACY", score: 4, quote: "I rewrote the queries" },
      { dim: "DEPTH", score: 3, quote: "I rewrote the queries" },
      { dim: "REASONING", score: 3, quote: "" },
      { dim: "COMMUNICATION", score: 4, quote: "billing reports were slow" },
    ],
    labels: ["MISSING_RESULT"],
    whatWentWrong: "The answer never says what changed.",
    oneLineFix: "End with the result.",
  };
  const modelAnswer = { sentences: [
    { text: "At Example Soft I rewrote slow MySQL queries for monthly reports.", citeIds: ["b1"], isPlaceholder: false },
    { text: "That cut the report time by 70% for the finance team at Systems Limited.", citeIds: ["b1"], isPlaceholder: false },
    { text: "The result was [your measurable result].", citeIds: [], isPlaceholder: true },
  ] };
  const provider = createMockProvider({ interview_blueprint: blueprint, check_answer: noResult, evaluate_answer: evaluation, model_answer: modelAnswer });
  const ANSWER = "Our billing reports were slow, so I rewrote the queries one by one and tested each change against last month's numbers before shipping it to everyone.";

  beforeAll(async () => {
    await db.user.createMany({ data: [user, other].map((id) => ({ id, email: `e2e-${id}@test.invalid` })) });
    const content = { schemaVersion: 1, basics: { profiles: [] }, education: [], projects: [], certifications: [], languages: [], sections: [], skills: ["MySQL"],
      work: [{ id: "w", title: "Developer", employer: "Example Soft", bullets: [{ id: "b1", text: "Rewrote slow MySQL queries for monthly reports at Example Soft", hasMetric: false }] }] };
    versionId = (await db.resumeVersion.create({ data: { userId: user, label: "v1", name: "CV", source: "MANUAL", targetMarket: "PK_LOCAL", content, contentHash: "h" } })).id;
  });

  afterAll(async () => {
    await db.aiRequest.deleteMany({ where: { userId: { in: [user, other] } } });
    await db.user.deleteMany({ where: { id: { in: [user, other] } } });
    await db.$disconnect();
  });

  let sessionId = "";
  const cfg = () => ({ jobId: null, resumeVersionId: versionId, targetRole: "Backend Developer", type: "MIXED" as const, count: 5 as const, difficulty: "STANDARD" as const, persona: "HIRING_MANAGER" as const, timerSec: 120 });

  it("writes a 5-question session without charging the quota yet", async () => {
    const s = await svc.createSession(user, cfg(), provider);
    sessionId = s.id;
    const full = (await svc.getSession(user, s.id))!;
    expect(full.questions).toHaveLength(5);
    expect(full.questions.every((q) => /^Question number \d\?$/.test(q.text))).toBe(true);
    expect((await usageFor(user, "MOCK_INTERVIEW")).used).toBe(0);
  });

  it("asks at most two follow-ups for a missing result, then moves on", async () => {
    let s = (await svc.getSession(user, sessionId))!;
    const motivation = svc.currentQuestion(s)!;
    expect(motivation.kind).toBe("MOTIVATION");
    expect((await svc.submitAnswer(user, sessionId, motivation.id, { text: ANSWER, durationSec: 40, hintUsed: false }, provider)).followUp).toBe(false); // never followed up
    s = (await svc.getSession(user, sessionId))!;
    const first = svc.currentQuestion(s)!;
    expect(first.kind).toBe("RESUME_PROBE");
    expect((await svc.submitAnswer(user, sessionId, first.id, { text: ANSWER, durationSec: 60, hintUsed: true }, provider)).followUp).toBe(true);
    s = (await svc.getSession(user, sessionId))!;
    const fu1 = svc.currentQuestion(s)!;
    expect(fu1.parentId).toBe(first.id);
    expect(fu1.text).toMatch(/outcome/);
    await svc.submitAnswer(user, sessionId, fu1.id, { text: ANSWER, durationSec: 30, hintUsed: false }, provider);
    s = (await svc.getSession(user, sessionId))!;
    const fu2 = svc.currentQuestion(s)!;
    expect(fu2.parentId).toBe(first.id);
    expect((await svc.submitAnswer(user, sessionId, fu2.id, { text: ANSWER, durationSec: 30, hintUsed: false }, provider)).followUp).toBe(false);
    s = (await svc.getSession(user, sessionId))!;
    expect(svc.currentQuestion(s)!.parentId).toBeNull();
  });

  it("skips, ends early, scores with verified quotes, and counts one use", async () => {
    let s = (await svc.getSession(user, sessionId))!;
    await svc.skipQuestion(user, sessionId, svc.currentQuestion(s)!.id);
    s = (await svc.getSession(user, sessionId))!;
    const done = await svc.finish(user, sessionId, provider);
    expect(done.status).toBe("COMPLETED");
    expect(done.overall).toBeGreaterThan(0);
    s = (await svc.getSession(user, sessionId))!;
    const first = s.questions.find((q) => q.kind === "RESUME_PROBE")!;
    const dims = (first.answers[0].evaluation as { dims: { dim: string; score: number | null }[] }).dims;
    expect(dims.find((d) => d.dim === "CLARITY")?.score ?? dims.find((d) => d.dim === "COMMUNICATION")?.score).not.toBe(5);
    const report = done.report as { answered: number; skipped: number; hintsUsed: number; followUps: number };
    expect(report).toMatchObject({ answered: 2, skipped: 3, hintsUsed: 1, followUps: 2 });
    expect((await usageFor(user, "MOCK_INTERVIEW")).used).toBe(1);
    await svc.finish(user, sessionId, provider);
    expect((await usageFor(user, "MOCK_INTERVIEW")).used).toBe(1);
  });

  it("a model answer never keeps an invented metric or employer", async () => {
    const s = (await svc.getSession(user, sessionId))!;
    const first = s.questions.find((q) => q.kind === "RESUME_PROBE")!;
    const m = await svc.modelAnswer(user, sessionId, first.id, provider);
    const text = m.sentences.map((x) => x.text).join(" ");
    expect(text).toContain("rewrote slow MySQL queries");
    expect(text).not.toMatch(/70%|Systems Limited/);
    expect(m.groundedness).toBe("PARTIAL_TEMPLATE");
  });

  it("a retry keeps both attempts", async () => {
    const s = (await svc.getSession(user, sessionId))!;
    const first = s.questions.find((q) => q.kind === "RESUME_PROBE")!;
    await svc.retry(user, sessionId, first.id, ANSWER, provider);
    const again = (await svc.getSession(user, sessionId))!.questions.find((q) => q.id === first.id)!;
    expect(again.answers.map((a) => a.attempt)).toEqual([1, 2]);
  });

  it("another account can't open, answer, score or delete it", async () => {
    const s = (await svc.getSession(user, sessionId))!;
    expect(await svc.getSession(other, sessionId)).toBeNull();
    await expect(svc.submitAnswer(other, sessionId, s.questions[0].id, { text: ANSWER, durationSec: 1, hintUsed: false }, provider)).rejects.toThrow(svc.NotFoundError);
    await expect(svc.finish(other, sessionId, provider)).rejects.toThrow(svc.NotFoundError);
    await expect(svc.modelAnswer(other, sessionId, s.questions[0].id, provider)).rejects.toThrow(svc.NotFoundError);
    await expect(svc.deleteSession(other, sessionId)).rejects.toThrow(svc.NotFoundError);
  });
});

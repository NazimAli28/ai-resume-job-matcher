import "server-only";
import type { ExampleOutcome, Prisma } from "@/generated/prisma/client";
import { isCurrentAnswer } from "@/config/ai-help";
import { db } from "../db";
import { pepperHash } from "../http/request";
import { captureError } from "../observability/errors";
import type { ResumeDoc } from "../resume/types";
import { deidentify, makeScrubber, type KnownIds } from "./deidentify";

/** Examples are kept for 2 years at most; the daily job deletes older ones. */
export const RETENTION_DAYS = 730;

/** Separate hash domains, so these can't be matched against analytics or error hashes. */
export const subjectHash = (userId: string) => pepperHash(`training-subject:${userId}`);
const refHash = (kind: RefKind, id: string) => pepperHash(`training-ref:${kind}:${id}`);

/** What an example is about, so the person's later action can be added to it. */
export type RefKind = "job" | "tailor" | "letter" | "interview" | "iv-question" | "iv-model" | "prep";

/** The person's latest answer. No answer, or No, means nothing is collected. */
const latestAnswer = (userId: string) =>
  db.consentRecord.findFirst({ where: { userId, type: "TRAINING_OPT_IN" }, orderBy: { createdAt: "desc" }, select: { granted: true, docVersion: true } });

export async function isOptedIn(userId: string): Promise<boolean> {
  const row = await latestAnswer(userId);
  return row?.granted === true && isCurrentAnswer(row.docVersion);
}

/** Has the person answered the current question? An answer to the older, differently worded switch doesn't count. */
export async function hasAnswered(userId: string): Promise<boolean> {
  const row = await latestAnswer(userId);
  return Boolean(row && isCurrentAnswer(row.docVersion));
}

async function knownIds(userId: string): Promise<KnownIds> {
  const [user, profile, versions] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
    db.profile.findUnique({ where: { userId }, select: { fatherName: true, experiences: { select: { employer: true } }, educations: { select: { institution: true } } } }),
    db.resumeVersion.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5, select: { content: true } }),
  ]);
  const docs = versions.map((v) => v.content as unknown as ResumeDoc);
  return {
    names: [user?.name, profile?.fatherName, ...docs.map((d) => d.basics?.name)].filter((x): x is string => Boolean(x)),
    employers: [...(profile?.experiences ?? []).map((e) => e.employer), ...docs.flatMap((d) => (d.work ?? []).map((w) => w.employer))],
    schools: [...(profile?.educations ?? []).map((e) => e.institution), ...docs.flatMap((d) => (d.education ?? []).map((e) => e.institution))],
  };
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

/**
 * Save one de-identified example, only if the person said Yes. Never throws: collecting must not
 * break the feature the person is using.
 */
export async function collect(userId: string, ex: { task: string; promptVersion: string; model: string; input: string; output: unknown }): Promise<string | null> {
  try {
    if (!(await isOptedIn(userId))) return null;
    const scrub = makeScrubber(await knownIds(userId));
    const row = await db.trainingExample.create({
      data: { subjectHash: subjectHash(userId), task: ex.task, promptVersion: ex.promptVersion, model: ex.model, input: json(deidentify(ex.input, scrub)), output: json(deidentify(ex.output, scrub)) },
      select: { id: true },
    });
    return row.id;
  } catch (e) {
    await captureError(e, { source: "ACTION", route: "training:collect", userId });
    return null;
  }
}

/** Tie an example to what it was about. A repeat for the same thing counts as a retry. */
export async function attach(exampleId: string | null | undefined, kind: RefKind, id: string) {
  if (!exampleId) return;
  try {
    const ref = refHash(kind, id);
    const earlier = await db.trainingExample.count({ where: { refHash: ref } });
    await db.trainingExample.update({ where: { id: exampleId }, data: { refHash: ref, ...(earlier ? { signals: json({ attempt: earlier + 1 }) } : {}) } });
  } catch (e) {
    await captureError(e, { source: "ACTION", route: "training:attach" });
  }
}

/**
 * Record what the person did with the latest example about this thing. Their own edits are
 * de-identified the same way. `onlyIfIgnored` keeps an earlier, stronger signal (an edit beats an export).
 */
export async function recordOutcome(
  userId: string,
  kind: RefKind,
  id: string,
  patch: { outcome?: ExampleOutcome; edited?: unknown; signals?: Record<string, unknown>; onlyIfIgnored?: boolean },
) {
  try {
    const row = await db.trainingExample.findFirst({ where: { refHash: refHash(kind, id), subjectHash: subjectHash(userId) }, orderBy: { createdAt: "desc" }, select: { id: true, outcome: true, signals: true } });
    if (!row) return;
    if (patch.onlyIfIgnored && row.outcome !== "IGNORED") return;
    const scrub = patch.edited === undefined ? null : makeScrubber(await knownIds(userId));
    await db.trainingExample.update({
      where: { id: row.id },
      data: {
        ...(patch.outcome ? { outcome: patch.outcome } : {}),
        ...(scrub ? { edited: json(deidentify(patch.edited, scrub)) } : {}),
        ...(patch.signals ? { signals: json({ ...((row.signals as Record<string, unknown> | null) ?? {}), ...patch.signals }) } : {}),
      },
    });
  } catch (e) {
    await captureError(e, { source: "ACTION", route: "training:outcome", userId });
  }
}

/** Opt-out and account deletion: every example from this person goes. */
export async function deleteExamplesFor(userId: string) {
  const { count } = await db.trainingExample.deleteMany({ where: { subjectHash: subjectHash(userId) } });
  return count;
}

export async function purgeOldExamples(now = new Date()) {
  const { count } = await db.trainingExample.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - RETENTION_DAYS * 86_400_000) } } });
  return count;
}

/** For the person's own data download. */
export function examplesFor(userId: string) {
  return db.trainingExample.findMany({
    where: { subjectHash: subjectHash(userId) },
    orderBy: { createdAt: "asc" },
    select: { task: true, promptVersion: true, model: true, input: true, output: true, outcome: true, edited: true, signals: true, createdAt: true },
  });
}

/** Counts only, for Admin. No example content. */
export async function trainingStats() {
  const [byTask, answers] = await Promise.all([
    db.trainingExample.groupBy({ by: ["task", "outcome"], _count: true, orderBy: { task: "asc" } }),
    db.$queryRaw<{ granted: boolean; people: bigint }[]>`
      SELECT granted, COUNT(*) AS people FROM (
        SELECT DISTINCT ON ("userId") "userId", granted FROM "ConsentRecord"
        WHERE type = 'TRAINING_OPT_IN' ORDER BY "userId", "createdAt" DESC
      ) latest GROUP BY granted`,
  ]);
  const yes = Number(answers.find((a) => a.granted)?.people ?? 0);
  const no = Number(answers.find((a) => !a.granted)?.people ?? 0);
  return { byTask: byTask.map((r) => ({ task: r.task, outcome: r.outcome, count: r._count })), yes, no };
}

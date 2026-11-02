import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { purgeVersion } from "../resume/service";
import { dayNumber, rank, today, type Status } from "./constants";
import type { contactSchema, detailsSchema, newApplicationSchema, reminderSchema, roundSchema } from "./schemas";

export class NotFoundError extends Error {}
export class LimitError extends Error {}

const MAX_APPLICATIONS = 5000;
const MAX_CHILDREN = 50;
const DUPLICATE_WINDOW_DAYS = 90;
const UNDO_WINDOW_MS = 2 * 60_000;
const SNOOZE_DAYS = 14;

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

async function owned(userId: string, id: string) {
  const a = await db.application.findFirst({ where: { id, userId } });
  if (!a) throw new NotFoundError();
  return a;
}

async function ownedVersion(userId: string, id: string) {
  const v = await db.resumeVersion.findFirst({ where: { id, userId, deletedAt: null }, select: { id: true, lockedAt: true } });
  if (!v) throw new NotFoundError();
  return v;
}

/** Linking is what makes a version immutable: the DB trigger refuses content changes from now on. */
const lockVersion = (userId: string, id: string) => db.resumeVersion.updateMany({ where: { id, userId, lockedAt: null }, data: { lockedAt: new Date(), state: "LOCKED" } });

/** TRK-008: same company and title within 90 days. */
export async function findDuplicate(userId: string, company: string, title: string) {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 86_400_000);
  const recent = await db.application.findMany({ where: { userId, createdAt: { gte: since } }, select: { id: true, company: true, title: true, createdAt: true } });
  const c = normalize(company);
  const t = normalize(title);
  return recent.find((a) => normalize(a.company) === c && normalize(a.title) === t) ?? null;
}

export async function createApplication(userId: string, input: z.output<typeof newApplicationSchema>) {
  if ((await db.application.count({ where: { userId } })) >= MAX_APPLICATIONS) throw new LimitError();
  const job = input.jobId ? await db.job.findFirst({ where: { id: input.jobId, userId }, select: { id: true, rawText: true } }) : null;
  if (input.jobId && !job) throw new NotFoundError();
  if (input.resumeVersionId) await ownedVersion(userId, input.resumeVersionId);

  const match = job
    ? await db.jobMatch.findFirst({
        where: { userId, jobId: job.id, ...(input.resumeVersionId ? { resumeVersionId: input.resumeVersionId } : {}) },
        orderBy: { createdAt: "desc" },
        select: { score: true },
      })
    : null;

  const now = new Date();
  const isApplied = input.status === "APPLIED";
  // Nobody has applied in the future; a mistyped date counts as today.
  const appliedAt = isApplied ? (input.appliedAt && input.appliedAt < today(now) ? input.appliedAt : today(now)) : null;
  // A backdated application records the move on the day it really happened, so the time metrics stay true.
  const changedAt = appliedAt && dayNumber(appliedAt) < dayNumber(now) ? appliedAt : now;

  const created = await db.application.create({
    data: {
      userId,
      jobId: job?.id ?? null,
      resumeVersionId: input.resumeVersionId,
      company: input.company,
      title: input.title,
      location: input.location,
      url: input.url,
      source: input.source,
      sourceDetail: input.sourceDetail,
      jobText: job?.rawText ?? null,
      matchScore: match?.score ?? null,
      status: input.status,
      appliedAt,
      deadline: input.deadline,
      salaryExpected: input.salaryExpected,
      priority: input.priority,
      notes: input.notes,
      lastActivityAt: changedAt,
      history: { create: { userId, toStatus: input.status, changedAt } },
    },
  });
  if (input.resumeVersionId) await lockVersion(userId, input.resumeVersionId);
  return created;
}

export async function listApplications(userId: string) {
  return db.application.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      resumeVersion: { select: { id: true, label: true, name: true } },
      history: { select: { toStatus: true, fromStatus: true, changedAt: true, note: true }, orderBy: { changedAt: "asc" } },
      rounds: { select: { scheduledAt: true } },
    },
  });
}

export async function getApplication(userId: string, id: string) {
  return db.application.findFirst({
    where: { id, userId },
    include: {
      resumeVersion: { select: { id: true, label: true, name: true, deletedAt: true } },
      job: { select: { id: true } },
      history: { orderBy: { changedAt: "asc" } },
      rounds: { orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }] },
      contacts: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** Any move is allowed (TRK-021) and always writes a history row in the same transaction. */
export async function moveApplication(userId: string, id: string, toStatus: Status, note: string | null) {
  const a = await owned(userId, id);
  if (a.status === toStatus) return { historyId: null, from: a.status };
  const now = new Date();
  const [row] = await db.$transaction([
    db.applicationStatusHistory.create({ data: { userId, applicationId: id, fromStatus: a.status, toStatus, note, changedAt: now } }),
    db.application.update({
      where: { id },
      data: {
        status: toStatus,
        lastActivityAt: now,
        nudgeSnoozedUntil: null,
        appliedAt: a.appliedAt ?? (rank(toStatus) >= rank("APPLIED") ? today(now) : null),
      },
    }),
  ]);
  return { historyId: row.id, from: a.status };
}

/** Takes a just-made move back and removes its row, so a slip of the mouse doesn't count in the funnel. */
export async function undoMove(userId: string, id: string, historyId: string) {
  const a = await owned(userId, id);
  const rows = await db.applicationStatusHistory.findMany({ where: { userId, applicationId: id }, orderBy: { changedAt: "asc" } });
  const last = rows[rows.length - 1];
  if (!last || last.id !== historyId || !last.fromStatus || Date.now() - last.changedAt.getTime() > UNDO_WINDOW_MS) throw new NotFoundError();
  const rest = rows.slice(0, -1);
  const everApplied = rest.some((r) => rank(r.toStatus) >= rank("APPLIED"));
  await db.$transaction([
    db.applicationStatusHistory.delete({ where: { id: last.id } }),
    db.application.update({ where: { id: a.id }, data: { status: last.fromStatus, appliedAt: everApplied ? a.appliedAt : null } }),
  ]);
}

export async function updateDetails(userId: string, id: string, data: z.output<typeof detailsSchema>) {
  await owned(userId, id);
  await db.application.update({ where: { id }, data });
}

export async function setNotes(userId: string, id: string, notes: string | null) {
  await owned(userId, id);
  await db.application.update({ where: { id }, data: { notes, lastActivityAt: new Date() } });
}

export async function setReminder(userId: string, id: string, data: z.output<typeof reminderSchema>) {
  await owned(userId, id);
  await db.application.update({ where: { id }, data: { nextActionAt: data.nextActionAt, nextActionNote: data.nextActionAt ? data.nextActionNote : null } });
}

/** Choose the exact version sent. An earlier choice stays locked: it may have been sent elsewhere. */
export async function linkResume(userId: string, id: string, versionId: string | null) {
  const a = await owned(userId, id);
  if (versionId) await ownedVersion(userId, versionId);
  await db.application.update({ where: { id }, data: { resumeVersionId: versionId, lastActivityAt: new Date() } });
  if (versionId) await lockVersion(userId, versionId);
  if (a.resumeVersionId && a.resumeVersionId !== versionId) await purgeIfUnused(userId, a.resumeVersionId);
}

/** Hide a follow-up or ghosting suggestion for a while. Status and history stay as they are (TRK-042, TRK-044). */
export async function snoozeNudge(userId: string, id: string) {
  await owned(userId, id);
  await db.application.update({ where: { id }, data: { nudgeSnoozedUntil: new Date(Date.now() + SNOOZE_DAYS * 86_400_000) } });
}

export async function addRound(userId: string, applicationId: string, data: z.output<typeof roundSchema>) {
  await owned(userId, applicationId);
  if ((await db.interviewRound.count({ where: { applicationId } })) >= MAX_CHILDREN) throw new LimitError();
  await db.$transaction([
    db.interviewRound.create({ data: { userId, applicationId, ...data } }),
    db.application.update({ where: { id: applicationId }, data: { lastActivityAt: new Date() } }),
  ]);
}

export async function setRoundOutcome(userId: string, roundId: string, outcome: "PENDING" | "PASSED" | "FAILED" | "UNKNOWN") {
  const r = await db.interviewRound.findFirst({ where: { id: roundId, userId } });
  if (!r) throw new NotFoundError();
  await db.$transaction([
    db.interviewRound.update({ where: { id: r.id }, data: { outcome } }),
    db.application.update({ where: { id: r.applicationId }, data: { lastActivityAt: new Date() } }),
  ]);
  return r.applicationId;
}

export async function deleteRound(userId: string, roundId: string) {
  const r = await db.interviewRound.findFirst({ where: { id: roundId, userId } });
  if (!r) throw new NotFoundError();
  await db.interviewRound.delete({ where: { id: r.id } });
  return r.applicationId;
}

export async function addContact(userId: string, applicationId: string, data: z.output<typeof contactSchema>) {
  await owned(userId, applicationId);
  if ((await db.contact.count({ where: { applicationId } })) >= MAX_CHILDREN) throw new LimitError();
  await db.contact.create({ data: { userId, applicationId, ...data } });
}

export async function deleteContact(userId: string, contactId: string) {
  const c = await db.contact.findFirst({ where: { id: contactId, userId } });
  if (!c) throw new NotFoundError();
  await db.contact.delete({ where: { id: c.id } });
  return c.applicationId;
}

/** A deleted resume is only kept for the applications that used it; the last one leaving takes it with it. */
async function purgeIfUnused(userId: string, versionId: string) {
  const v = await db.resumeVersion.findFirst({ where: { id: versionId, userId }, select: { deletedAt: true, _count: { select: { applications: true } } } });
  if (v?.deletedAt && v._count.applications === 0) await purgeVersion(userId, versionId);
}

export async function deleteApplication(userId: string, id: string) {
  const a = await owned(userId, id);
  await db.application.delete({ where: { id: a.id } });
  if (a.resumeVersionId) await purgeIfUnused(userId, a.resumeVersionId);
}

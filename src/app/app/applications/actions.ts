"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/user";
import { track } from "@/server/events";
import { captureError } from "@/server/observability/errors";
import { rateLimit } from "@/server/ratelimit";
import { contactSchema, detailsSchema, moveSchema, newApplicationSchema, notesSchema, outcomeSchema, reminderSchema, roundSchema } from "@/server/tracker/schemas";
import * as tracker from "@/server/tracker/service";

type Fail = { ok: false; error: string; field?: string };
type Done = { ok: true } | Fail;

const uuid = z.uuid();
const STALE: Fail = { ok: false, error: "That didn't work. Refresh the page." };

const firstIssue = (e: z.ZodError): Fail => {
  const i = e.issues[0];
  return { ok: false, error: i?.message ?? "Please check the form.", field: i?.path[0]?.toString() };
};

function refresh(id?: string | void) {
  revalidatePath("/app");
  revalidatePath("/app/applications");
  if (id) revalidatePath(`/app/applications/${id}`);
}

/** Runs a change, then refreshes the dashboard, the board and the application's page. */
async function change<T>(route: string, run: (userId: string) => Promise<T>, idOf?: (result: T) => string | void): Promise<{ ok: true; value: T } | Fail> {
  const user = await requireUser();
  if (!(await rateLimit(`tracker:edit:${user.id}`, 300, 3600)).ok) return { ok: false, error: "Too many changes in a short time. Please wait a little." };
  try {
    const value = await run(user.id);
    refresh(idOf?.(value));
    return { ok: true, value };
  } catch (e) {
    if (e instanceof tracker.NotFoundError) return { ok: false, error: "That item no longer exists. Refresh the page." };
    if (e instanceof tracker.LimitError) return { ok: false, error: "You've reached the limit for this. Delete something you no longer need and try again." };
    await captureError(e, { source: "ACTION", route: `app/applications:${route}`, userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

const done = (r: { ok: true } | Fail): Done => (r.ok ? { ok: true } : r);

export type CreateResult = { ok: true; id: string } | { ok: false; duplicate: { id: string; createdAt: string } } | Fail;

export async function createApplicationAction(input: unknown): Promise<CreateResult> {
  const user = await requireUser();
  const parsed = newApplicationSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  if (!parsed.data.allowDuplicate) {
    const dup = await tracker.findDuplicate(user.id, parsed.data.company, parsed.data.title);
    if (dup) return { ok: false, duplicate: { id: dup.id, createdAt: dup.createdAt.toISOString() } };
  }
  const r = await change("create", (u) => tracker.createApplication(u, parsed.data));
  if (!r.ok) return r;
  await track(user.id, "APPLICATION_ADDED");
  if (parsed.data.status === "APPLIED") await track(user.id, "MARKED_APPLIED");
  return { ok: true, id: r.value.id };
}

export type MoveResult = { ok: true; historyId: string | null } | Fail;

export async function moveApplicationAction(id: unknown, input: unknown): Promise<MoveResult> {
  const appId = uuid.safeParse(id);
  const parsed = moveSchema.safeParse(input);
  if (!appId.success || !parsed.success) return STALE;
  const r = await change("move", (u) => tracker.moveApplication(u, appId.data, parsed.data.toStatus, parsed.data.note), () => appId.data);
  if (!r.ok) return r;
  if (parsed.data.toStatus === "APPLIED" && r.value.historyId) await track((await requireUser()).id, "MARKED_APPLIED");
  return { ok: true, historyId: r.value.historyId };
}

export async function undoMoveAction(id: unknown, historyId: unknown): Promise<Done> {
  const appId = uuid.safeParse(id);
  const row = uuid.safeParse(historyId);
  if (!appId.success || !row.success) return STALE;
  return done(await change("undo", (u) => tracker.undoMove(u, appId.data, row.data), () => appId.data));
}

export async function updateDetailsAction(id: unknown, input: unknown): Promise<Done> {
  const appId = uuid.safeParse(id);
  if (!appId.success) return STALE;
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  return done(await change("details", (u) => tracker.updateDetails(u, appId.data, parsed.data), () => appId.data));
}

export async function setNotesAction(id: unknown, input: unknown): Promise<Done> {
  const appId = uuid.safeParse(id);
  if (!appId.success) return STALE;
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  return done(await change("notes", (u) => tracker.setNotes(u, appId.data, parsed.data.notes), () => appId.data));
}

export async function setReminderAction(id: unknown, input: unknown): Promise<Done> {
  const appId = uuid.safeParse(id);
  if (!appId.success) return STALE;
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  return done(await change("reminder", (u) => tracker.setReminder(u, appId.data, parsed.data), () => appId.data));
}

export async function linkResumeAction(id: unknown, versionId: unknown): Promise<Done> {
  const appId = uuid.safeParse(id);
  const version = z.union([uuid, z.literal("")]).safeParse(versionId);
  if (!appId.success || !version.success) return STALE;
  return done(await change("link-resume", (u) => tracker.linkResume(u, appId.data, version.data || null), () => appId.data));
}

export async function snoozeNudgeAction(id: unknown): Promise<Done> {
  const appId = uuid.safeParse(id);
  if (!appId.success) return STALE;
  return done(await change("snooze", (u) => tracker.snoozeNudge(u, appId.data), () => appId.data));
}

export async function addRoundAction(id: unknown, input: unknown): Promise<Done> {
  const appId = uuid.safeParse(id);
  if (!appId.success) return STALE;
  const parsed = roundSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  return done(await change("add-round", (u) => tracker.addRound(u, appId.data, parsed.data), () => appId.data));
}

export async function setRoundOutcomeAction(roundId: unknown, outcome: unknown): Promise<Done> {
  const id = uuid.safeParse(roundId);
  const value = outcomeSchema.safeParse(outcome);
  if (!id.success || !value.success) return STALE;
  return done(await change("round-outcome", (u) => tracker.setRoundOutcome(u, id.data, value.data), (appId) => appId));
}

export async function deleteRoundAction(roundId: unknown): Promise<Done> {
  const id = uuid.safeParse(roundId);
  if (!id.success) return STALE;
  return done(await change("delete-round", (u) => tracker.deleteRound(u, id.data), (appId) => appId));
}

export async function addContactAction(id: unknown, input: unknown): Promise<Done> {
  const appId = uuid.safeParse(id);
  if (!appId.success) return STALE;
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  return done(await change("add-contact", (u) => tracker.addContact(u, appId.data, parsed.data), () => appId.data));
}

export async function deleteContactAction(contactId: unknown): Promise<Done> {
  const id = uuid.safeParse(contactId);
  if (!id.success) return STALE;
  return done(await change("delete-contact", (u) => tracker.deleteContact(u, id.data), (appId) => appId));
}

export async function deleteApplicationAction(id: unknown): Promise<Done> {
  const appId = uuid.safeParse(id);
  if (!appId.success) return STALE;
  return done(await change("delete", (u) => tracker.deleteApplication(u, appId.data)));
}

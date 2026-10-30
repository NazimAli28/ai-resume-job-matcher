"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/user";
import { clientIp, ipPrefix } from "@/server/http/request";
import { captureError } from "@/server/observability/errors";
import { rateLimit } from "@/server/ratelimit";
import { REJECT_MESSAGE, RejectError } from "@/server/resume/files/sniff";
import * as resumes from "@/server/resume/service";

type Fail = { ok: false; error: string };

const startSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().positive(),
  consent: z.boolean(),
});

/** Reserve an upload and get a one-time signed URL for the browser to send the file to private storage. */
export async function startUpload(input: unknown): Promise<{ ok: true; uploadId: string; path: string; token: string } | Fail> {
  const user = await requireUser();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That file couldn't be read. Please choose it again." };
  if (!user.emailVerified) return { ok: false, error: "Please confirm your email before uploading." };
  if (!(await rateLimit(`resume:upload:${user.id}`, 10, 3600)).ok) return { ok: false, error: "You've uploaded several files in a short time. Please wait a little and try again." };
  try {
    const r = await resumes.createUpload(user.id, parsed.data, { consentGiven: parsed.data.consent, consentIpPrefix: ipPrefix(await clientIp()) });
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof RejectError) return { ok: false, error: REJECT_MESSAGE[e.reason] };
    if (e instanceof resumes.QuotaError) return { ok: false, error: `You've used this month's ${resumes.MONTHLY_ANALYSES} free analyses. They reset on the 1st.` };
    if (e instanceof Error && e.message === "consent_required") return { ok: false, error: "Please tick the box to confirm how we handle sensitive details." };
    await captureError(e, { source: "ACTION", route: "app/resumes:start", userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

/** The file is in storage: check it by content, extract and analyze it. */
export async function finishUpload(uploadId: unknown): Promise<{ ok: true; versionId: string } | Fail> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(uploadId);
  if (!id.success) return { ok: false, error: "Upload not found. Please try again." };
  try {
    const r = await resumes.finalizeUpload(user.id, id.data);
    revalidatePath("/app/resumes");
    revalidatePath("/app");
    return r.ok ? r : { ok: false, error: REJECT_MESSAGE[r.reason] };
  } catch (e) {
    if (e instanceof resumes.NotFoundError) return { ok: false, error: "Upload not found. Please try again." };
    await captureError(e, { source: "ACTION", route: "app/resumes:finish", userId: user.id });
    return { ok: false, error: "We couldn't analyze that file. Please try again, or re-save it as PDF or Word." };
  }
}

export async function deleteResume(versionId: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(versionId);
  if (!id.success) return { ok: false, error: "Resume not found." };
  try {
    await resumes.deleteVersion(user.id, id.data);
  } catch (e) {
    if (e instanceof resumes.NotFoundError) return { ok: false, error: "Resume not found." };
    await captureError(e, { source: "ACTION", route: "app/resumes:delete", userId: user.id });
    return { ok: false, error: "Something went wrong on our side." };
  }
  revalidatePath("/app/resumes");
  return { ok: true };
}

export async function downloadOriginal(versionId: unknown): Promise<{ ok: true; url: string } | Fail> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(versionId);
  if (!id.success) return { ok: false, error: "Resume not found." };
  try {
    return { ok: true, url: await resumes.originalDownloadUrl(user.id, id.data) };
  } catch (e) {
    if (e instanceof resumes.NotFoundError) return { ok: false, error: "The original file is no longer stored." };
    await captureError(e, { source: "ACTION", route: "app/resumes:download", userId: user.id });
    return { ok: false, error: "Something went wrong on our side." };
  }
}

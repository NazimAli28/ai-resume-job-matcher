"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireAdminRole } from "@/server/admin/guard";
import { audit } from "@/server/audit";
import { isRecentlySignedIn } from "@/server/auth/user";
import { db } from "@/server/db";
import { clientIp, ipPrefix } from "@/server/http/request";
import { text } from "@/server/profile/schemas";
import { rateLimit } from "@/server/ratelimit";
import { ACCENT_TAG } from "@/server/settings/app-settings";
import { supabaseServer } from "@/server/supabase/server";

type Done = { ok: true } | { ok: false; error: string };

const uuid = z.uuid();
const STALE: Done = { ok: false, error: "That didn't work. Refresh the page." };

/** Every admin change: re-checked, limited, and written to the audit log with who did it. */
async function adminChange(action: string, metadata: Record<string, string | boolean>, run: (adminId: string) => Promise<void>, subjectUserId?: string): Promise<Done> {
  const admin = await requireAdmin();
  if (!(await rateLimit(`admin:${admin.id}`, 120, 3600)).ok) return { ok: false, error: "Too many changes. Please wait a little." };
  await run(admin.id);
  await audit(action, { actorId: admin.id, subjectUserId, ipPrefix: ipPrefix(await clientIp()), metadata });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const setSetting = (key: string, value: boolean | string, adminId: string) =>
  db.appSetting.upsert({ where: { key }, create: { key, value, updatedBy: adminId }, update: { value, updatedBy: adminId } });

export async function setKillSwitchAction(disabled: unknown): Promise<Done> {
  if (typeof disabled !== "boolean") return STALE;
  return adminChange("ADMIN_AI_KILL_SWITCH", { disabled }, async (id) => {
    await setSetting("ai_disabled", disabled, id);
  });
}

export async function setDefaultAccentAction(accent: unknown): Promise<Done> {
  const parsed = z.enum(["lime", "mint", "cyan", "magenta"]).safeParse(accent);
  if (!parsed.success) return STALE;
  const r = await adminChange("ADMIN_DEFAULT_ACCENT", { accent: parsed.data }, async (id) => {
    await setSetting("default_accent", parsed.data, id);
  });
  if (r.ok) {
    revalidateTag(ACCENT_TAG, { expire: 0 });
    revalidatePath("/", "layout");
  }
  return r;
}

export async function setBlockedAction(userId: unknown, blocked: unknown, reason: unknown): Promise<Done> {
  const id = uuid.safeParse(userId);
  if (!id.success || typeof blocked !== "boolean") return STALE;
  const why = text(200).safeParse(reason);
  if (!why.success) return { ok: false, error: why.error.issues[0]?.message ?? "Please check the reason." };
  if (blocked && !why.data) return { ok: false, error: "Add a short reason. It goes in the audit log." };
  const admin = await requireAdmin();
  if (admin.id === id.data) return { ok: false, error: "You can't block your own account." };
  return adminChange(blocked ? "ADMIN_USER_BLOCKED" : "ADMIN_USER_UNBLOCKED", { reason: why.data }, async () => {
    await db.user.updateMany({ where: { id: id.data }, data: { blockedAt: blocked ? new Date() : null } });
  }, id.data);
}

export async function resolveErrorAction(errorId: unknown): Promise<Done> {
  const id = uuid.safeParse(errorId);
  if (!id.success) return STALE;
  return adminChange("ADMIN_ERROR_RESOLVED", { errorId: id.data }, async () => {
    await db.errorEvent.updateMany({ where: { id: id.data }, data: { resolvedAt: new Date() } });
  });
}

export async function markFeedbackReadAction(feedbackId: unknown): Promise<Done> {
  const id = uuid.safeParse(feedbackId);
  if (!id.success) return STALE;
  return adminChange("ADMIN_FEEDBACK_READ", { feedbackId: id.data }, async () => {
    await db.feedback.updateMany({ where: { id: id.data }, data: { readAt: new Date() } });
  });
}

// ───────────────────────────── Second factor ─────────────────────────────

const MFA_LIMIT: Done = { ok: false, error: "Too many attempts. Please wait a few minutes." };

export type EnrollResult = { ok: true; factorId: string; qr: string; secret: string } | { ok: false; error: string };

/** Starts authenticator setup. A half-finished earlier attempt is cleared first, or Supabase refuses a new one. */
export async function startMfaEnrollAction(): Promise<EnrollResult> {
  const admin = await requireAdminRole();
  if (!(await rateLimit(`admin:mfa:${admin.id}`, 10, 900)).ok) return { ok: false, error: "Too many attempts. Please wait a few minutes." };
  const supabase = await supabaseServer();
  const { data: list } = await supabase.auth.mfa.listFactors();
  if (list?.totp?.some((f) => f.status === "verified")) return { ok: false, error: "An authenticator is already set up. Enter its code instead." };
  // Without this, a stolen session could add its own authenticator and pass the second step.
  if (!(await isRecentlySignedIn())) return { ok: false, error: "For your security, sign out and sign in again, then set up your authenticator." };
  await audit("ADMIN_MFA_ENROLL_STARTED", { actorId: admin.id, subjectUserId: admin.id, ipPrefix: ipPrefix(await clientIp()) });
  for (const f of list?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Admin" });
  if (error || !data) return { ok: false, error: "We couldn't start the setup. Please try again." };
  return { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Checks a 6-digit code. Success raises this session to the second-factor level. */
export async function verifyMfaAction(code: unknown, enrollingFactorId?: unknown): Promise<Done> {
  const admin = await requireAdminRole();
  if (!(await rateLimit(`admin:mfa:${admin.id}`, 10, 900)).ok) return MFA_LIMIT;
  const parsed = z.string().regex(/^\d{6}$/).safeParse(code);
  if (!parsed.success) return { ok: false, error: "Enter the 6-digit code from your authenticator app." };

  const supabase = await supabaseServer();
  const { data: list } = await supabase.auth.mfa.listFactors();
  const known = list?.all ?? [];
  const factorId = known.find((f) => f.id === enrollingFactorId && f.factor_type === "totp")?.id ?? list?.totp?.find((f) => f.status === "verified")?.id;
  if (!factorId) return { ok: false, error: "No authenticator found. Please set one up." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: parsed.data });
  await audit(error ? "ADMIN_MFA_FAILED" : "ADMIN_MFA_PASSED", { actorId: admin.id, subjectUserId: admin.id, ipPrefix: ipPrefix(await clientIp()) });
  return error ? { ok: false, error: "That code didn't work. Check it and try again." } : { ok: true };
}

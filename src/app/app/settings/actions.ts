"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LEGAL } from "@/config/legal";
import { audit } from "@/server/audit";
import { currentSession, isRecentlySignedIn, requireUser } from "@/server/auth/user";
import { db } from "@/server/db";
import { clientIp, ipPrefix } from "@/server/http/request";
import { captureError } from "@/server/observability/errors";
import { cancelDeletion, requestDeletion } from "@/server/privacy/deletion";
import { text } from "@/server/profile/schemas";
import { rateLimit } from "@/server/ratelimit";
import { supabaseServer } from "@/server/supabase/server";

type Done = { ok: true } | { ok: false; error: string };

const consentSchema = z.object({ type: z.enum(["TRAINING_OPT_IN", "ANALYTICS_COOKIES", "MARKETING_EMAIL"]), granted: z.boolean() });

/** Each change is a new row, so the history of what was agreed and when is kept. */
export async function setConsentAction(input: unknown): Promise<Done> {
  const user = await requireUser();
  const parsed = consentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That didn't work. Refresh the page." };
  if (!(await rateLimit(`settings:consent:${user.id}`, 30, 3600)).ok) return { ok: false, error: "Too many changes. Please wait a little." };
  const prefix = ipPrefix(await clientIp());
  await db.consentRecord.create({ data: { userId: user.id, type: parsed.data.type, granted: parsed.data.granted, docVersion: LEGAL.privacy, ipPrefix: prefix } });
  await audit("CONSENT_CHANGED", { subjectUserId: user.id, ipPrefix: prefix, metadata: { type: parsed.data.type, granted: parsed.data.granted } });
  revalidatePath("/app/settings");
  return { ok: true };
}

const feedbackSchema = text(2000, 5);

export async function sendFeedbackAction(message: unknown): Promise<Done> {
  const user = await requireUser();
  const parsed = feedbackSchema.safeParse(message);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your message." };
  if (!(await rateLimit(`settings:feedback:${user.id}`, 5, 3600)).ok) return { ok: false, error: "You've sent several messages recently. Please wait a little." };
  try {
    await db.feedback.create({ data: { userId: user.id, message: parsed.data } });
    return { ok: true };
  } catch (e) {
    await captureError(e, { source: "ACTION", route: "app/settings:feedback", userId: user.id });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

/** Sign in again, then come back. Works the same for a password and for Google. */
export async function confirmIdentityAction(form: FormData): Promise<void> {
  const back = form.get("back") === "blocked" ? "/blocked" : "/app/settings";
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: "local" });
  redirect(`/login?error=reauth&next=${encodeURIComponent(back)}`);
}

export async function deleteAccountAction(confirm: unknown): Promise<Done> {
  const user = await requireUser({ allowBlocked: true, allowMissingConsent: true });
  if (confirm !== "DELETE") return { ok: false, error: "Type DELETE in capitals to confirm." };
  if (!(await isRecentlySignedIn())) return { ok: false, error: "For your security, please confirm it's you first." };
  await requestDeletion(user.id, ipPrefix(await clientIp()));
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: "others" });
  redirect("/account-deleted");
}

export async function cancelDeletionAction(): Promise<void> {
  const session = await currentSession();
  if (!session) redirect("/login?next=/account-deleted");
  // Someone at a forgotten signed-in browser mustn't be able to undo the owner's decision.
  if (!(await isRecentlySignedIn())) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?error=reauth&next=/account-deleted");
  }
  await cancelDeletion(session.id, ipPrefix(await clientIp()));
  redirect("/app");
}

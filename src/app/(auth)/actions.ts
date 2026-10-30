"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";
import { FEATURES } from "@/config/features";
import { audit } from "@/server/audit";
import { isBreachedPassword } from "@/server/auth/breached";
import { recordSignupConsent } from "@/server/auth/consent";
import { newPasswordSchema, resetRequestSchema, safeNext, signInSchema, signUpSchema } from "@/server/auth/schemas";
import { syncUser } from "@/server/auth/user";
import { env } from "@/server/env";
import { clientIp, ipPrefix, pepperHash } from "@/server/http/request";
import { captureError } from "@/server/observability/errors";
import { rateLimit } from "@/server/ratelimit";
import { supabaseServer } from "@/server/supabase/server";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: string } | undefined;

const fields = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0] ?? "form"), i.message]));
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
const EMAIL_OFF: FormState = { error: "Email sign-in is not available during the beta. Please continue with Google." };
const BREACHED = "This password has appeared in a data breach. Please choose a different one.";

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  if (!FEATURES.EMAIL_PASSWORD_AUTH) return EMAIL_OFF;
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fields(parsed.error) };
  const { email, password, name, marketing } = parsed.data;
  const ip = await clientIp();
  if (!(await rateLimit(`auth:signup:ip:${pepperHash(ip)}`, 5, 3600)).ok) return { error: TOO_MANY };
  if (await isBreachedPassword(password)) return { fieldErrors: { password: BREACHED } };

  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${env().NEXT_PUBLIC_APP_URL}/auth/callback?next=/app`, data: { full_name: name || undefined } },
    });
    if (error) {
      if (error.status === 429) return { error: TOO_MANY };
      if (error.code === "email_address_invalid") return { fieldErrors: { email: "Use an email address you can receive mail at." } };
      return { error: "We couldn't create the account. Check the details and try again." };
    }
    // An existing email comes back with no identities. We answer exactly as for a new account (no enumeration).
    if (data.user && data.user.identities && data.user.identities.length > 0) {
      await syncUser(data.user);
      await recordSignupConsent(data.user.id, marketing === "on", ipPrefix(ip));
      await audit("SIGNUP", { subjectUserId: data.user.id, ipPrefix: ipPrefix(ip) });
    }
  } catch (err) {
    await captureError(err, { source: "ACTION", route: "auth/signUp" });
    return { error: "Something went wrong on our side. Please try again." };
  }
  redirect("/check-email?for=signup");
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  if (!FEATURES.EMAIL_PASSWORD_AUTH) return EMAIL_OFF;
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fields(parsed.error) };
  const { email, password } = parsed.data;
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`auth:login:ip:${pepperHash(ip)}`, 20, 900),
    rateLimit(`auth:login:email:${pepperHash(email)}`, 8, 900),
  ]);
  if (!byIp.ok || !byEmail.ok) return { error: TOO_MANY };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return { error: "Please confirm your email first. Check your inbox for the link." };
    return { error: "Email or password is incorrect." };
  }
  await syncUser(data.user);
  await audit("LOGIN", { subjectUserId: data.user.id, ipPrefix: ipPrefix(ip), metadata: { method: "password" } });
  redirect(safeNext(form.get("next")?.toString()));
}

export async function signInWithGoogle(form: FormData): Promise<void> {
  const next = safeNext(form.get("next")?.toString());
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${env().NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  if (!FEATURES.EMAIL_PASSWORD_AUTH) return EMAIL_OFF;
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fields(parsed.error) };
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`auth:reset:ip:${pepperHash(ip)}`, 10, 3600),
    rateLimit(`auth:reset:email:${pepperHash(parsed.data.email)}`, 3, 3600),
  ]);
  if (byIp.ok && byEmail.ok) {
    const supabase = await supabaseServer();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env().NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
    });
  }
  // Same answer whether or not the account exists, and whether or not we throttled.
  return { ok: "If an account exists for that email, we've sent a link to reset the password. It expires in 1 hour." };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  if (!FEATURES.EMAIL_PASSWORD_AUTH) return EMAIL_OFF;
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fields(parsed.error) };
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return { error: "Your reset link has expired. Request a new one." };
  if (await isBreachedPassword(parsed.data.password)) return { fieldErrors: { password: BREACHED } };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "We couldn't update the password. Request a new reset link and try again." };
  // A reset ends every other session (AUTH-006).
  await supabase.auth.signOut({ scope: "others" });
  await audit("PASSWORD_CHANGED", { subjectUserId: uid, ipPrefix: ipPrefix(await clientIp()) });
  redirect("/app?password=updated");
}

export async function acceptCurrentTerms(form: FormData): Promise<void> {
  if (form.get("accept") !== "on") redirect("/consent?error=required");
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  await syncUser(data.user);
  await recordSignupConsent(data.user.id, form.get("marketing") === "on", ipPrefix(await clientIp()));
  redirect(safeNext(form.get("next")?.toString()));
}

export async function signOut(form: FormData): Promise<void> {
  const everywhere = form.get("scope") === "global";
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  await supabase.auth.signOut({ scope: everywhere ? "global" : "local" });
  const uid = data?.claims?.sub as string | undefined;
  if (uid) await audit(everywhere ? "LOGOUT_ALL" : "LOGOUT", { subjectUserId: uid });
  redirect("/login?signed=out");
}

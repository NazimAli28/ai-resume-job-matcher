import "server-only";
import type { User as AuthUser } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { LEGAL } from "@/config/legal";
import type { User } from "@/generated/prisma/client";
import { db } from "../db";
import { supabaseServer } from "../supabase/server";

/** Mirror the Supabase auth user into our User table (id = auth id). Safe to call on every sign-in. */
export async function syncUser(au: AuthUser): Promise<User> {
  const email = (au.email ?? "").toLowerCase();
  const name = (au.user_metadata?.full_name as string | undefined) ?? (au.user_metadata?.name as string | undefined) ?? null;
  return db.user.upsert({
    where: { id: au.id },
    create: { id: au.id, email, emailVerified: Boolean(au.email_confirmed_at), name },
    update: { email, emailVerified: Boolean(au.email_confirmed_at), ...(name ? { name } : {}) },
  });
}

/** True when the user's latest TERMS and PRIVACY acceptances match the current document versions. */
export async function hasCurrentConsent(userId: string): Promise<boolean> {
  const rows = await db.consentRecord.findMany({
    where: { userId, type: { in: ["TERMS", "PRIVACY"] } },
    orderBy: { createdAt: "desc" },
  });
  const latest = (t: "TERMS" | "PRIVACY") => rows.find((r) => r.type === t);
  const terms = latest("TERMS");
  const privacy = latest("PRIVACY");
  return Boolean(terms?.granted && terms.docVersion === LEGAL.terms && privacy?.granted && privacy.docVersion === LEGAL.privacy);
}

/** Signed-in user id from the verified JWT, or null. */
export const currentUserId = cache(async (): Promise<string | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

/**
 * Every signed-in page and action starts here. Redirects instead of returning when the
 * visitor is signed out, deleted, blocked, or hasn't accepted the current terms.
 */
export const requireUser = cache(async (opts: { allowMissingConsent?: boolean } = {}): Promise<User> => {
  const id = await currentUserId();
  if (!id) redirect("/login");

  let user = await db.user.findUnique({ where: { id } });
  if (!user) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
    user = await syncUser(data.user);
  }
  if (user.deletedAt) redirect("/account-deleted");
  if (user.blockedAt) redirect("/blocked");
  if (!opts.allowMissingConsent && !(await hasCurrentConsent(user.id))) redirect("/consent");

  // Activity marker for idle-session and inactivity-purge rules; written at most every 5 minutes.
  if (Date.now() - user.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  }
  return user;
});

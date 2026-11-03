import "server-only";
import type { User as AuthUser } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { LEGAL } from "@/config/legal";
import type { User } from "@/generated/prisma/client";
import { db } from "../db";
import { DEV_LOGIN_COOKIE, DEV_USER_ID, isDevLoginAllowed } from "./dev-login";
import { supabaseServer } from "../supabase/server";

/** Mirror the Supabase auth user into our User table (id = auth id). Safe to call on every sign-in. */
export async function syncUser(au: AuthUser, opts: { signedIn?: boolean } = {}): Promise<User> {
  const email = (au.email ?? "").toLowerCase();
  const name = (au.user_metadata?.full_name as string | undefined) ?? (au.user_metadata?.name as string | undefined) ?? null;
  return db.user.upsert({
    where: { id: au.id },
    create: { id: au.id, email, emailVerified: Boolean(au.email_confirmed_at), name },
    // Only a real sign-in restarts the idle clock.
    update: { email, emailVerified: Boolean(au.email_confirmed_at), ...(opts.signedIn ? { lastSeenAt: new Date() } : {}), ...(name ? { name } : {}) },
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

export interface Session {
  id: string;
  /** When the user last proved who they are (the latest entry in the JWT's amr claim). */
  authAt: Date | null;
  /** "aal2" once a second factor has been passed in this session. */
  aal: string | null;
}

/** The signed-in session from the verified JWT, or null. */
export const currentSession = cache(async (): Promise<Session | null> => {
  if (process.env.NODE_ENV === "development") {
    const [jar, h] = await Promise.all([cookies(), headers()]);
    const hostname = (h.get("host") ?? "").split(":")[0] ?? "";
    if (jar.get(DEV_LOGIN_COOKIE)?.value === "1" && isDevLoginAllowed(hostname)) return { id: DEV_USER_ID, authAt: new Date(), aal: "aal2" };
  }
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const stamps = Array.isArray(claims.amr) ? claims.amr.map((m) => (typeof m === "object" && m ? Number((m as { timestamp?: number }).timestamp) : NaN)).filter(Number.isFinite) : [];
  return { id: claims.sub as string, authAt: stamps.length ? new Date(Math.max(...stamps) * 1000) : null, aal: (claims.aal as string | undefined) ?? null };
});

export const currentUserId = cache(async (): Promise<string | null> => (await currentSession())?.id ?? null);

const RECENT_MS = 15 * 60 * 1000;
const IDLE_MS = 7 * 86_400_000;
const ABSOLUTE_MS = 30 * 86_400_000;

export const isSessionExpired = (lastSeenAt: Date, authAt: Date | null) => Date.now() - lastSeenAt.getTime() > IDLE_MS || Boolean(authAt && Date.now() - authAt.getTime() > ABSOLUTE_MS);

/** Did this session sign in within the last 15 minutes? Export, deletion and password change ask for this. */
export async function isRecentlySignedIn(): Promise<boolean> {
  const s = await currentSession();
  return Boolean(s?.authAt && Date.now() - s.authAt.getTime() < RECENT_MS);
}

/**
 * Every signed-in page and action starts here. Redirects instead of returning when the
 * visitor is signed out, deleted, blocked, or hasn't accepted the current terms.
 * allowBlocked is only for a blocked person's own export and delete (ADM-006).
 */
export const requireUser = cache(async (opts: { allowMissingConsent?: boolean; allowBlocked?: boolean } = {}): Promise<User> => {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { id } = session;

  let user = await db.user.findUnique({ where: { id } });
  if (!user) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
    user = await syncUser(data.user);
  }
  if (user.deletedAt) redirect("/account-deleted");
  if (user.blockedAt && !opts.allowBlocked) redirect("/blocked");
  // Session limits (PRD §5b): 7 days idle, 30 days from sign-in. The route clears the cookies.
  if (isSessionExpired(user.lastSeenAt, session.authAt)) redirect("/auth/expired");
  if (!opts.allowMissingConsent && !(await hasCurrentConsent(user.id))) redirect("/consent");

  // Activity marker for idle-session and inactivity-purge rules; written at most every 5 minutes.
  if (Date.now() - user.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  }
  return user;
});

import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/server/audit";
import { safeNext } from "@/server/auth/schemas";
import { syncUser } from "@/server/auth/user";
import { ipPrefix } from "@/server/http/request";
import { captureError } from "@/server/observability/errors";
import { supabaseServer } from "@/server/supabase/server";

/**
 * Landing point for Google sign-in (?code=) and for email links: confirm signup and reset password
 * (?code= with PKCE, or ?token_hash=&type= when the email template links here directly).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));

  try {
    const supabase = await supabaseServer();
    let user = null;
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return fail("link");
      user = data.user;
    } else if (tokenHash && type) {
      const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (error) return fail("link");
      user = data.user;
    } else {
      return fail("link");
    }
    if (!user) return fail("link");

    await syncUser(user);
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const method = user.app_metadata?.provider === "google" ? "google" : type ?? "email_link";
    await audit("LOGIN", { subjectUserId: user.id, ipPrefix: ip ? ipPrefix(ip) : undefined, metadata: { method } });
    return NextResponse.redirect(new URL(next, url.origin));
  } catch (err) {
    await captureError(err, { source: "ROUTE", route: "/auth/callback" });
    return fail("server");
  }
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/config/csp";
import { DEV_LOGIN_COOKIE, isDevLoginAllowed } from "@/server/auth/dev-login";

/**
 * Runs before matching requests: refreshes the Supabase session cookie, keeps signed-out visitors out of
 * /app and /admin, and sets a per-request script policy on every page handling passwords or personal data.
 * Authorization still happens again on the server for every query (this is a convenience gate, not the
 * security boundary).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Next reads the nonce from this request header and stamps it on its own scripts.
  const csp = buildCsp(btoa(crypto.randomUUID()), url, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  const pass = () => {
    const r = NextResponse.next({ request: { headers: requestHeaders } });
    r.headers.set("Content-Security-Policy", csp);
    return r;
  };

  let response = pass();
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => {
          request.cookies.set(name, value);
          requestHeaders.set("cookie", request.cookies.toString());
        });
        response = pass();
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims verifies the JWT; do not trust getSession() on the server.
  const { data } = await supabase.auth.getClaims();
  const devLogin = request.cookies.get(DEV_LOGIN_COOKIE)?.value === "1" && isDevLoginAllowed(request.nextUrl.hostname);
  const signedIn = Boolean(data?.claims?.sub) || devLogin;
  const path = request.nextUrl.pathname;

  // A redirect carries any refreshed session cookies, or a rotated token would be lost.
  const redirectTo = (pathname: string, search: string) => {
    const to = request.nextUrl.clone();
    to.pathname = pathname;
    to.search = search;
    const r = NextResponse.redirect(to);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!signedIn && (path.startsWith("/app") || path.startsWith("/admin"))) return redirectTo("/login", `?next=${encodeURIComponent(path)}`);
  if (signedIn && (path === "/login" || path === "/signup")) return redirectTo("/app", "");
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/login", "/signup", "/auth/:path*", "/reset-password", "/forgot-password", "/check-email", "/consent", "/blocked", "/account-deleted"],
};

import { NextResponse, type NextRequest } from "next/server";
import { currentSession, isSessionExpired } from "@/server/auth/user";
import { db } from "@/server/db";
import { supabaseServer } from "@/server/supabase/server";

/**
 * A session past its time limit ends here, because pages can't clear cookies while rendering. It re-checks
 * the limit, so a link from another site can't sign a person out.
 */
export async function GET(request: NextRequest) {
  const session = await currentSession();
  const user = session ? await db.user.findUnique({ where: { id: session.id }, select: { lastSeenAt: true } }) : null;
  if (session && user && !isSessionExpired(user.lastSeenAt, session.authAt)) return NextResponse.redirect(new URL("/app", request.nextUrl.origin));
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/login?error=expired", request.nextUrl.origin));
}

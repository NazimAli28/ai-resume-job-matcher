import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { LEGAL } from "@/config/legal";
import { DEV_LOGIN_COOKIE, DEV_USER_ID, isDevLoginAllowed } from "@/server/auth/dev-login";
import { db } from "@/server/db";

/**
 * Local test sign-in: `npm run dev` on localhost only. It has no password and only ever opens one
 * test account. In a production build NODE_ENV is fixed to "production", so this always answers 404.
 */
export async function GET(request: Request) {
  if (!isDevLoginAllowed(new URL(request.url).hostname)) notFound();

  const jar = await cookies();
  if (new URL(request.url).searchParams.has("out")) {
    jar.delete(DEV_LOGIN_COOKIE);
    redirect("/");
  }

  await db.user.upsert({
    where: { id: DEV_USER_ID },
    create: { id: DEV_USER_ID, email: "dev-test@test.invalid", emailVerified: true, name: "Test User" },
    update: {},
  });
  const hasTerms = await db.consentRecord.findFirst({ where: { userId: DEV_USER_ID, type: "TERMS", docVersion: LEGAL.terms } });
  if (!hasTerms) {
    await db.consentRecord.createMany({
      data: [
        { userId: DEV_USER_ID, type: "TERMS", granted: true, docVersion: LEGAL.terms },
        { userId: DEV_USER_ID, type: "PRIVACY", granted: true, docVersion: LEGAL.privacy },
      ],
    });
  }
  jar.set(DEV_LOGIN_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/app");
}

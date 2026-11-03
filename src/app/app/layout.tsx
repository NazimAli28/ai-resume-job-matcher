import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/app-nav/app-nav";
import { PRODUCT_NAME } from "@/config/brand";
import { requireUser } from "@/server/auth/user";
import { getProfileSummary } from "@/server/profile/service";

export const metadata: Metadata = { title: { default: PRODUCT_NAME, template: `%s · ${PRODUCT_NAME}` } };

// Signed-in area. requireUser() re-checks the session, deletion/block state and consent on every request.
export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  const profile = await getProfileSummary(user.id);
  return (
    <div className="ambient flex min-h-screen flex-col lg:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <AppNav
        account={{
          name: user.name,
          email: user.email,
          isAdmin: user.role === "ADMIN",
          profile: {
            headline: profile?.headline ?? null,
            city: profile?.city ?? null,
            targetTitles: profile?.targetTitles ?? [],
            onboarded: Boolean(profile?.onboardedAt),
            skills: profile?._count.skills ?? 0,
            roles: profile?._count.experiences ?? 0,
            evidence: profile?._count.facts ?? 0,
          },
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:pt-8">
          {children}
        </main>
        <footer className="flex flex-wrap justify-center gap-x-5 gap-y-1 px-4 pb-6 text-[13px] text-muted">
          <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/legal/ai" className="hover:text-ink">How we use AI</Link>
          <Link href="/legal/acceptable-use" className="hover:text-ink">Acceptable use</Link>
          <Link href="/legal/cookies" className="hover:text-ink">Cookies</Link>
        </footer>
      </div>
    </div>
  );
}

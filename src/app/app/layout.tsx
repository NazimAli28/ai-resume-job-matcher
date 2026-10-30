import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/landing/site-header";
import { PRODUCT_NAME } from "@/config/brand";
import { requireUser } from "@/server/auth/user";

export const metadata: Metadata = { title: { default: PRODUCT_NAME, template: `%s · ${PRODUCT_NAME}` } };

// Signed-in area. requireUser() re-checks the session, deletion/block state and consent on every request.
export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  return (
    <div className="ambient flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 px-3 pt-3">
        <div className="card mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 backdrop-blur-xl [background:color-mix(in_oklab,var(--surface)_82%,transparent)]">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[16rem] truncate text-sm text-muted sm:block">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold hover:bg-sunken">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        {children}
      </main>
      <footer className="flex flex-wrap justify-center gap-x-5 gap-y-1 px-4 pb-6 text-[13px] text-muted">
        <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/legal/ai" className="hover:text-ink">How we use AI</Link>
      </footer>
    </div>
  );
}

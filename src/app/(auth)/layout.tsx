import Link from "next/link";
import { Logo } from "@/components/landing/site-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ambient flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link href="/demo" className="text-sm font-semibold text-muted hover:text-ink">
          Try the demo
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="card relative w-full max-w-md overflow-hidden p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full blur-3xl"
            style={{ background: "rgb(var(--hl-rgb) / 0.16)" }}
          />
          <div className="relative">{children}</div>
        </div>
      </main>
      <footer className="flex flex-wrap justify-center gap-x-5 gap-y-1 px-4 pb-6 text-[13px] text-muted">
        <Link href="/legal/terms" className="hover:text-ink">
          Terms
        </Link>
        <Link href="/legal/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <Link href="/legal/ai" className="hover:text-ink">
          How we use AI
        </Link>
      </footer>
    </div>
  );
}

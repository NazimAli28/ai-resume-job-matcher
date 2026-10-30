import Link from "next/link";
import { Logo } from "@/components/landing/site-header";

export default function LegalLayout({ children }: LayoutProps<"/legal">) {
  return (
    <div className="ambient flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link href="/login" className="text-sm font-semibold text-muted hover:text-ink">
          Sign in
        </Link>
      </header>
      <main id="main" className="w-full flex-1 px-4 pb-16 pt-6 sm:px-6">
        <div className="card mx-auto max-w-4xl p-6 sm:p-10">{children}</div>
      </main>
    </div>
  );
}

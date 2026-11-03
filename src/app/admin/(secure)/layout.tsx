import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/landing/site-header";
import { requireAdmin } from "@/server/admin/guard";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/errors", "Errors"],
  ["/admin/audit", "Audit log"],
  ["/admin/feedback", "Feedback"],
  ["/app", "Back to app"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="ambient flex min-h-screen flex-col">
      <header className="px-3 pt-3">
        <div className="card mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
          <Logo compact />
          <nav aria-label="Admin" className="flex flex-wrap items-center gap-1">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} className="inline-flex min-h-10 items-center rounded-xl px-2 text-sm font-semibold text-muted hover:bg-sunken hover:text-ink sm:px-3">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">{children}</main>
    </div>
  );
}

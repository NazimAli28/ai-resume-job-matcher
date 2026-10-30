import Link from "next/link";
import type { ReactNode } from "react";

/** Shared frame for legal pages: title, version, review status and a readable column. */
export function LegalDoc({ title, version, updated, children }: { title: string; version: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] font-bold leading-tight">{title}</h1>
        <p className="text-sm text-muted">
          Version {version} · Last updated {updated}
        </p>
        <p className="rounded-xl bg-sunken px-4 py-3 text-sm">
          <strong>Beta version.</strong> This document is written in plain English for our free beta and has not yet been
          reviewed by a lawyer. We will publish a reviewed version before any paid plan launches, and tell you what changed.
        </p>
      </header>
      <div className="legal flex flex-col gap-5 text-[16px] leading-relaxed [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
      <nav className="flex flex-wrap gap-x-5 gap-y-1 border-t border-rule pt-5 text-sm text-muted">
        <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-ink">Privacy Policy</Link>
        <Link href="/legal/ai" className="hover:text-ink">How we use AI</Link>
      </nav>
    </article>
  );
}

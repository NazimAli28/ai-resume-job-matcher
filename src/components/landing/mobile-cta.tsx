"use client";

import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useScrolledPast } from "./hooks";

/** Floating bottom CTA pill on small screens, shown once the hero CTAs have scrolled away. */
export function MobileCtaBar() {
  const visible = useScrolledPast(560);

  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-3 z-30 transition-[transform,opacity] duration-300 md:hidden",
        "mb-[env(safe-area-inset-bottom)]",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[140%] opacity-0",
      )}
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="flex items-center justify-between gap-3 rounded-full border border-rule bg-surface/85 py-2 pl-5 pr-2 shadow-[var(--card-shadow-hover)] backdrop-blur-xl">
        <p className="text-sm leading-tight text-muted">
          <span className="block font-semibold text-ink">Free during beta</span>
          Sample data, no account
        </p>
        <ButtonLink href="/app" variant="primary" size="md" className="glow">
          Try the demo
        </ButtonLink>
      </div>
    </div>
  );
}

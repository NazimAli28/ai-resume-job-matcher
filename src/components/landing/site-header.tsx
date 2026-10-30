"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme/use-theme";
import { ButtonLink, IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { LOGO_MARK, PRODUCT_NAME } from "@/config/brand";
import { useScrolledPast } from "./hooks";

export const ANCHORS = [
  { id: "how-it-works", label: "How it works" },
  { id: "product", label: "Product" },
  { id: "trust", label: "Why trust it" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

/** `compact` shows the name only from md up (for headers that also carry navigation). */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label={`${PRODUCT_NAME} home`} className="flex shrink-0 items-center gap-2.5 rounded-full py-1 pr-2">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-[10px] bg-hl font-display text-[15px] font-extrabold text-on-hl glow"
      >
        {LOGO_MARK}
      </span>
      <span
        className={`hidden whitespace-nowrap font-display text-[15px] font-bold leading-tight sm:text-[17px] ${compact ? "lg:inline" : "min-[400px]:inline"}`}
      >
        {PRODUCT_NAME}
      </span>
    </Link>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <IconButton
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="size-11 rounded-full"
      onClick={() => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden size-5 dark:block" aria-hidden />
      <Moon className="size-5 dark:hidden" aria-hidden />
    </IconButton>
  );
}

/** Which page section is in the middle of the viewport (for the nav's active pill). */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const IDS = ANCHORS.map((a) => a.id);

/** Transparent bar at the top of the page; becomes a floating glass pill once you scroll. */
export function SiteHeader() {
  const scrolled = useScrolledPast(24);
  const active = useActiveSection(IDS);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div
        className={cn(
          "mx-auto flex h-16 items-center justify-between gap-3 rounded-full border pl-3 pr-2 transition-[max-width,background-color,border-color,box-shadow] duration-300",
          scrolled
            ? "max-w-5xl border-rule bg-surface/75 shadow-[var(--card-shadow-hover)] backdrop-blur-xl"
            : "max-w-6xl border-transparent bg-transparent",
        )}
      >
        <Logo />
        <nav aria-label="Page sections" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {ANCHORS.map((a) => {
              const on = active === a.id;
              return (
                <li key={a.id} className="relative">
                  {on && (
                    <motion.span
                      layoutId="nav-active"
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-sunken"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <a
                    href={`#${a.id}`}
                    aria-current={on ? "location" : undefined}
                    className={cn(
                      "relative inline-flex h-10 items-center rounded-full px-3.5 text-[14px] font-semibold transition-colors",
                      on ? "text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {a.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-full px-3 text-[14px] font-semibold text-muted hover:text-ink">
            Sign in
          </Link>
          {/* Wrapper does the hiding: the button's own inline-flex would beat `hidden`. Phones get the bottom CTA bar instead. */}
          <span className="hidden sm:block">
            <ButtonLink href="/demo" variant="primary" size="md">
              Try the demo
            </ButtonLink>
          </span>
        </div>
      </div>
    </header>
  );
}

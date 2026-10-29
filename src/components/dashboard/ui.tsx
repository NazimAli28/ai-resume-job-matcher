"use client";
import { useSkipMotion } from "@/components/ui/motion";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { RANGE_OPTIONS, type Range } from "./logic";

/** Card heading: icon chip, title, optional subtitle and a right-side action. */
export function CardHeader({
  icon: Icon,
  title,
  id,
  sub,
  action,
}: {
  icon: LucideIcon;
  title: string;
  id: string;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-hl-soft text-hl-ink">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="truncate text-base font-bold leading-tight">
            {title}
          </h2>
          {sub && <p className="truncate text-sm text-muted">{sub}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Neutral tints for initials tiles, mixed from ink and surface tokens (no hard-coded colors). */
const TINTS = [7, 11, 15, 19, 23];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function CompanyTile({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const tint = TINTS[hash(name) % TINTS.length];
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-xl border border-rule font-display font-bold text-ink",
        size === "sm" ? "size-9 text-[13px]" : "size-10 text-sm",
      )}
      style={{ background: `color-mix(in oklab, var(--ink) ${tint}%, var(--surface))` }}
    >
      {initials}
    </span>
  );
}

/** Compact segmented control for the time range. The active pill slides between options. */
export function RangeControl({ value, onChange }: { value: Range; onChange: (v: Range) => void }) {
  const reduce = useSkipMotion();
  return (
    <div role="radiogroup" aria-label="Time range" className="inline-flex rounded-xl border border-rule bg-sunken/70 p-1">
      {RANGE_OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const i = RANGE_OPTIONS.findIndex((x) => x.value === value);
              const next = RANGE_OPTIONS[(i + (e.key === "ArrowRight" ? 1 : RANGE_OPTIONS.length - 1)) % RANGE_OPTIONS.length];
              onChange(next.value);
              (e.currentTarget.parentElement?.querySelectorAll("button")[RANGE_OPTIONS.indexOf(next)] as HTMLButtonElement | undefined)?.focus();
            }}
            tabIndex={active ? 0 : -1}
            className={cn(
              "relative h-9 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-hl-ink",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="dash-range-pill"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-lg border border-rule bg-surface shadow-sm"
                aria-hidden
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Small text link used in card headers. */
export const linkClass = "inline-flex min-h-11 items-center text-sm font-semibold text-ink underline-offset-4 hover:underline";

"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { animate, motion } from "motion/react";
import { AlertOctagon, AlertTriangle, Info, Lightbulb, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { RingScore } from "@/components/ui/charts";
import type { Severity } from "@/demo/types";
import { cn } from "@/lib/cn";

/* Small visual helpers shared by the resume, onboarding and job screens. */

type PillKind = "tabs" | "filter" | "radio";

/**
 * Animated pill switch. `tabs` = tablist, `radio` = single choice radiogroup, `filter` = pressed buttons.
 * The active pill glides between options (shared layout), and stays put when reduced motion is on.
 */
export function PillTabs<T extends string>({
  value,
  onChange,
  options,
  label,
  kind = "tabs",
  panelId,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  label: string;
  kind?: PillKind;
  panelId?: string;
  className?: string;
}) {
  const uid = useId();
  const reduce = useSkipMotion();
  const role = kind === "tabs" ? "tablist" : kind === "radio" ? "radiogroup" : "group";
  const itemRole = kind === "tabs" ? "tab" : kind === "radio" ? "radio" : undefined;

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (kind === "filter") return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : options.length - 1)) % options.length;
    onChange(options[next].value);
    document.getElementById(`${uid}-${options[next].value}`)?.focus();
  };

  return (
    <div
      role={role}
      aria-label={label}
      className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-rule bg-sunken p-1 [scrollbar-width:none]", className)}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            id={`${uid}-${o.value}`}
            type="button"
            role={itemRole}
            aria-selected={kind === "tabs" ? active : undefined}
            aria-checked={kind === "radio" ? active : undefined}
            aria-pressed={kind === "filter" ? active : undefined}
            aria-controls={kind === "tabs" ? panelId : undefined}
            tabIndex={kind === "filter" || active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(o.value)}
            className="relative min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold"
          >
            {active && (
              <motion.span
                layoutId={uid}
                className="absolute inset-0 rounded-full bg-hl glow"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
              />
            )}
            <span className={cn("relative z-10 flex items-center gap-1.5 transition-colors", active ? "text-on-hl" : "text-muted hover:text-ink")}>
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** RingScore whose number and arc count up from the previous value. Respects reduced motion. */
export function AnimatedRing({ value, delay = 0, ...rest }: ComponentProps<typeof RingScore> & { delay?: number }) {
  const reduce = useSkipMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(from.current, value, {
      duration: 1,
      delay,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (x) => {
        from.current = x;
        setShown(Math.round(x));
      },
    });
    return () => controls.stop();
  }, [value, reduce, delay]);

  return <RingScore {...rest} value={reduce ? value : shown} />;
}

/** Horizontal bar that grows to its value once (var(--viz) mark, text stays in ink/muted). */
export function ValueBar({ value, label, className, delay = 0 }: { value: number; label: string; className?: string; delay?: number }) {
  const reduce = useSkipMotion();
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-sunken", className)}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: "var(--viz)", minWidth: v > 0 ? 6 : 0 }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${v}%` }}
        transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] }}
      />
    </div>
  );
}

const SEV_ICON: Record<Severity, { icon: LucideIcon; className: string }> = {
  HIGH: { icon: AlertOctagon, className: "bg-warn-soft text-warn" },
  MEDIUM: { icon: AlertTriangle, className: "bg-partial-soft text-partial" },
  LOW: { icon: Info, className: "bg-sunken text-muted" },
  TIP: { icon: Lightbulb, className: "bg-hl-soft text-hl-ink" },
};

/** Rounded icon chip for a severity. Decorative: the severity word is always shown next to it. */
export function SeverityIcon({ value, className }: { value: Severity; className?: string }) {
  const { icon: Icon, className: tone } = SEV_ICON[value];
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tone, className)}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/** Icon chip used as a card anchor. */
export function IconChip({ icon: Icon, emphasis, className }: { icon: LucideIcon; emphasis?: boolean; className?: string }) {
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", emphasis ? "bg-hl text-on-hl glow" : "bg-hl-soft text-hl-ink", className)}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/** Illustration-like icon stack: one glowing tile with two tilted tiles behind it. */
export function IconComposition({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <div className={cn("relative grid size-20 place-items-center", className)} aria-hidden>
      <span className="absolute size-14 -rotate-12 rounded-2xl border border-rule bg-sunken" style={{ transform: "translate(-14px, 4px) rotate(-12deg)" }} />
      <span className="absolute size-14 rounded-2xl border border-rule bg-hl-soft" style={{ transform: "translate(14px, 2px) rotate(10deg)" }} />
      <span className="relative grid size-16 place-items-center rounded-2xl bg-hl text-on-hl glow">
        <Icon className="size-8" />
      </span>
    </div>
  );
}

/** A sheet of paper: subtle layered shadow and generous margins, for resumes and letters. */
export function Paper({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <article
      aria-label={label}
      className={cn(
        "relative rounded-md border border-rule bg-surface px-5 py-7 shadow-[0_1px_0_rgb(0_0_0/0.04),0_2px_6px_-2px_rgb(0_0_0/0.12),0_28px_48px_-28px_rgb(0_0_0/0.32)] sm:px-10 sm:py-11",
        className,
      )}
    >
      {children}
    </article>
  );
}

/** Deterministic neutral tile colors from a name, using tokens only. */
const TILES = [
  "bg-hl-soft text-hl-ink",
  "bg-partial-soft text-partial",
  "bg-warn-soft text-warn",
  "bg-sunken text-ink",
  "bg-ink text-paper",
  "bg-hl text-on-hl",
];

export function CompanyTile({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-display font-bold",
        size === "lg" ? "size-16 rounded-2xl text-3xl" : size === "md" ? "size-12 rounded-xl text-xl" : "size-9 rounded-lg text-base",
        TILES[h % TILES.length],
        className,
      )}
    >
      {initial}
    </span>
  );
}

/** Shimmer skeleton of a resume page, used while simulated AI work runs. */
export function DocSkeleton({ className }: { className?: string }) {
  const widths = ["w-2/5", "w-3/5", "w-full", "w-11/12", "w-4/5", "w-full", "w-2/3", "w-1/2"];
  return (
    <div aria-hidden className={cn("flex flex-col gap-2.5 rounded-md border border-rule bg-surface p-5 shadow-sm", className)}>
      {widths.map((w, i) => (
        <span key={i} className={cn("shimmer h-2.5 rounded-full", w, i === 0 && "h-4")} />
      ))}
    </div>
  );
}

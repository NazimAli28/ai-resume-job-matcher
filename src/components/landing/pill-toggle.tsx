"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Two-to-four option toggle built on native radios (arrow keys work), with a sliding thumb.
 * The thumb uses the accent fill: the active choice is a confirmed state.
 */
export function PillToggle<T extends string>({
  value,
  onChange,
  options,
  legend,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  legend: string;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cn("inline-flex rounded-full border border-rule bg-surface p-1 shadow-[var(--card-shadow)]", className)}>
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              "relative inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hl-ink",
              active ? "text-on-hl" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${name}-thumb`}
                aria-hidden
                className="absolute inset-0 rounded-full bg-hl glow"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className="relative">{o.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Accessible on/off switch with a visible label and optional description. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
  id: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-3", disabled && "opacity-60")}>
      <div className="min-w-0">
        <label htmlFor={id} className="font-semibold">{label}</label>
        {description && <p id={`${id}-desc`} className="text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group grid h-11 w-14 shrink-0 place-items-center disabled:cursor-not-allowed"
      >
        <span className={cn("relative h-7 w-12 rounded-full border transition-all", checked ? "border-hl-ink bg-hl glow" : "border-rule-strong bg-sunken")}>
          <span className={cn("absolute top-0.5 size-5 rounded-full shadow-sm transition-all duration-200", checked ? "left-[22px] bg-on-hl" : "left-0.5 bg-ink")} />
        </span>
      </button>
    </div>
  );
}

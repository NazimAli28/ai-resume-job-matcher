"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Controlled, keyboard-navigable tabs (arrow keys move between tabs). */
export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
  children,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: ReactNode }[];
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    onChange(tabs[next].value);
    document.getElementById(`${id}-tab-${tabs[next].value}`)?.focus();
  };
  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-rule [scrollbar-width:none]">
        {tabs.map((t, i) => (
          <button
            key={t.value}
            id={`${id}-tab-${t.value}`}
            role="tab"
            type="button"
            aria-selected={value === t.value}
            aria-controls={`${id}-panel`}
            tabIndex={value === t.value ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative -mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
              value === t.value ? "border-hl-ink text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" className="pt-5">
        {children}
      </div>
    </div>
  );
}

"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import type { MatchOverride } from "@/demo/types";
import { cn } from "@/lib/cn";

export type OverrideChoice = MatchOverride | "CLEAR";

const ITEMS: { value: OverrideChoice; label: string }[] = [
  { value: "CONFIRM", label: "Confirm I have this" },
  { value: "REJECT", label: "I don't have this" },
  { value: "LEARNING", label: "I'm learning this" },
  { value: "ADD_EVIDENCE", label: "Add evidence" },
];

/** Small menu button with arrow-key navigation; closes on Escape or outside click. */
export function OverrideMenu({ current, label, onPick }: { current?: MatchOverride; label: string; onPick: (v: OverrideChoice) => void }) {
  const [open, setOpen] = useState(false);
  const reduce = useSkipMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const id = useId();
  const items = current ? [...ITEMS, { value: "CLEAR" as const, label: "Undo my change" }] : ITEMS;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    wrap.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onKey = (e: KeyboardEvent) => {
    const els = Array.from(wrap.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? []);
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      wrap.current?.querySelector<HTMLButtonElement>("[aria-haspopup]")?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    }
  };

  return (
    <div ref={wrap} className="relative" onKeyDown={onKey}>
      <Button size="sm" variant="ghost" aria-haspopup="menu" aria-expanded={open} aria-controls={id} aria-label={`Correct this: ${label}`} onClick={() => setOpen((o) => !o)} className="h-11 sm:h-9">
        Correct this
        <ChevronDown className="size-4" aria-hidden />
      </Button>
      <AnimatePresence>
      {open && (
        <motion.div
          id={id}
          role="menu"
          initial={reduce ? false : { opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
          style={{ transformOrigin: "top right" }}
          className="absolute right-0 z-20 mt-1 w-56 rounded-2xl border border-rule bg-surface p-1.5 shadow-lg"
        >
          {items.map((it) => (
            <button
              key={it.value}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                setOpen(false);
                onPick(it.value);
              }}
              className={cn(
                "flex min-h-11 w-full items-center rounded-[var(--radius-sm)] px-3 text-left text-sm hover:bg-sunken focus:bg-sunken focus:outline-none",
                current === it.value && "font-semibold",
              )}
            >
              {it.label}
              {current === it.value && <span className="sr-only"> (current)</span>}
            </button>
          ))}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { Check, ChevronDown, Rocket } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useDemo } from "@/demo/store";

/** Getting-started checklist. Renders nothing once every step is done. */
export function GettingStarted() {
  const { state } = useDemo();
  const reduce = useSkipMotion();
  const [open, setOpen] = useState(true);
  const items = [
    { label: "Analyze your resume", done: state.resumes.length > 0 || state.usage.analyses > 0, href: "/demo/resumes" },
    { label: "Add a job you want", done: state.jobs.length > 0, href: "/demo/jobs" },
    { label: "Tailor your resume once", done: state.resumes.some((r) => r.origin === "TAILORED") || state.usage.tailored > 0, href: "/demo/jobs" },
    { label: "Practice one mock interview", done: state.interviews.length > 0, href: "/demo/interviews/new" },
  ];
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <section aria-labelledby="gs-title" className="card overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="gs-list"
        onClick={() => setOpen(!open)}
        className="flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-hl-soft text-hl-ink">
          <Rocket className="size-[18px]" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span id="gs-title" className="font-bold">
            Getting started <span className="font-normal text-muted">{doneCount} of {items.length} done</span>
          </span>
          <span className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-sunken" aria-hidden>
            <span className="meter-fill block h-full rounded-full" style={{ width: `${pct}%`, background: "var(--viz)" }} />
          </span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id="gs-list"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="grid gap-1 px-5 pb-4 sm:grid-cols-2"
          >
            {items.map((i) => (
              <li key={i.label}>
                <Link href={i.href} className="flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-sunken">
                  <span
                    aria-hidden
                    className={cn("grid size-6 shrink-0 place-items-center rounded-full border", i.done ? "border-hl-ink bg-hl text-on-hl" : "border-rule-strong")}
                  >
                    {i.done && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span className={i.done ? "text-muted line-through" : "font-semibold"}>{i.label}</span>
                  <span className="sr-only">{i.done ? "Done" : "Not done yet"}</span>
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

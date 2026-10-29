"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { STATUS_LABEL } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { PIPELINE } from "@/demo/labels";
import type { Application } from "@/demo/types";
import { AppCard } from "./app-card";
import { COLUMN_TONE, columnOf, type ColumnId } from "./helpers";

const STAGES: { id: ColumnId | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  ...PIPELINE.map((s) => ({ id: s as ColumnId, label: STATUS_LABEL[s] })),
  { id: "CLOSED", label: "Closed" },
];

/** Mobile replacement for the board: stage chips filter a single-column list. */
export function StageList({
  apps,
  onOpen,
  onMove,
}: {
  apps: Application[];
  onOpen: (id: string) => void;
  onMove: (id: string, s: Application["status"]) => void;
}) {
  const reduce = useSkipMotion();
  const [stage, setStage] = useState<ColumnId | "ALL">("ALL");
  const shown = stage === "ALL" ? apps : apps.filter((a) => columnOf(a.status) === stage);
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Filter by stage" className="sticky top-[4.5rem] z-20 flex gap-2 overflow-x-auto bg-paper/90 py-2 backdrop-blur -mx-3 px-3 sm:-mx-5 sm:px-5 lg:-ml-3 lg:-mr-6 lg:pl-3 lg:pr-6">
        {STAGES.map((s) => {
          const count = s.id === "ALL" ? apps.length : apps.filter((a) => columnOf(a.status) === s.id).length;
          const on = stage === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => setStage(s.id)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all",
                on ? "border-hl-ink bg-hl-soft glow" : "border-rule bg-surface text-muted",
              )}
            >
              {s.label}
              <span className={cn("rounded-full px-2 text-xs font-bold tabular-nums", s.id === "ALL" ? "bg-sunken text-ink" : COLUMN_TONE[s.id])}>{count}</span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && <p className="py-8 text-center text-muted">Nothing in this stage yet.</p>}
      <AnimatePresence mode="popLayout" initial={false}>
        {shown.map((a) => (
          <motion.div
            key={a.id}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AppCard app={a} onOpen={onOpen} onMove={onMove} showStatus />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

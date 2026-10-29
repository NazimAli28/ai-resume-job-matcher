"use client";

import { ChevronLeft, ChevronRight, FileText, GripVertical } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useState, type DragEvent } from "react";
import { STATUS_LABEL } from "@/components/ui/chip";
import { initialState } from "@/demo/data";
import { SOURCE_LABEL } from "@/demo/labels";
import type { ApplicationStatus } from "@/demo/types";
import { cn } from "@/lib/cn";
import { useReduced } from "./hooks";

const STAGES: ApplicationStatus[] = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER"];

const CARDS = ["a2", "a4", "a1"].map((id) => {
  const a = initialState.applications.find((x) => x.id === id)!;
  const version = initialState.resumes.find((r) => r.id === a.resumeVersionId)!.label;
  return {
    id: a.id,
    company: a.company,
    title: a.title,
    version,
    source: SOURCE_LABEL[a.source],
    status: a.status,
  };
});

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

/** A tiny board. Drag with a mouse, or use the move buttons (keyboard and touch). Cards glide between columns. */
export function MiniTracker() {
  const reduce = useReduced();
  const [status, setStatus] = useState<Record<string, ApplicationStatus>>(
    Object.fromEntries(CARDS.map((c) => [c.id, c.status])),
  );
  const [over, setOver] = useState<ApplicationStatus | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  const move = (id: string, to: ApplicationStatus) => {
    setStatus((s) => ({ ...s, [id]: to }));
    const c = CARDS.find((x) => x.id === id)!;
    setAnnounce(`${c.company} moved to ${STATUS_LABEL[to]}. Still linked to resume ${c.version}.`);
  };

  const onDrop = (e: DragEvent, to: ApplicationStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id && status[id] && status[id] !== to) move(id, to);
    setOver(null);
    setDragging(null);
  };

  return (
    <div className="@container flex flex-col gap-3">
      <LayoutGroup>
        {/* Columns follow the tracker's own width, not the window: 2 across in a half panel, 4 in a full row. */}
        <div className="grid gap-3 @sm:grid-cols-2 @4xl:grid-cols-4">
          {STAGES.map((stage, si) => {
            const cards = CARDS.filter((c) => status[c.id] === stage);
            return (
              <section
                key={stage}
                aria-label={`${STATUS_LABEL[stage]}: ${cards.length}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(stage);
                }}
                onDragLeave={() => setOver((o) => (o === stage ? null : o))}
                onDrop={(e) => onDrop(e, stage)}
                className={cn(
                  "flex min-h-36 flex-col gap-2 rounded-2xl border border-dashed p-2 transition-[background-color,border-color,box-shadow]",
                  over === stage ? "border-hl-ink/60 bg-hl-soft/60 glow" : "border-transparent bg-sunken",
                )}
              >
                <h4 className="flex items-center justify-between px-1.5 pt-1 text-sm font-semibold">
                  {STATUS_LABEL[stage]}
                  <span className="grid min-w-6 place-items-center rounded-full bg-surface px-1.5 text-[12px] tabular-nums text-muted">
                    {cards.length}
                  </span>
                </h4>
                {cards.map((c) => (
                  <motion.div key={c.id} layoutId={reduce ? undefined : `trk-${c.id}`} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
                    <article
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragging(c.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      className={cn(
                        "flex cursor-grab flex-col gap-2 rounded-xl border border-rule bg-surface p-3 shadow-[var(--card-shadow)] transition-[opacity,box-shadow] active:cursor-grabbing",
                        dragging === c.id && "opacity-50",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-sunken font-display text-[12px] font-bold text-muted">
                          {initials(c.company)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold leading-snug">{c.company}</p>
                          <p className="truncate text-[12px] text-muted">{c.title}</p>
                        </div>
                        <GripVertical className="mt-1 hidden size-4 shrink-0 text-muted sm:block" aria-hidden />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-hl-soft px-2 text-[12px] font-semibold leading-6 text-hl-ink">
                          <FileText className="size-3" aria-hidden />
                          Sent with {c.version}
                        </span>
                        <span className="text-[12px] text-muted">via {c.source}</span>
                      </div>
                      <div className="flex justify-between gap-1 border-t border-rule pt-1">
                        <button
                          type="button"
                          disabled={si === 0}
                          onClick={() => move(c.id, STAGES[si - 1])}
                          aria-label={si > 0 ? `Move ${c.company} back to ${STATUS_LABEL[STAGES[si - 1]]}` : `${c.company} is in the first stage`}
                          className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink disabled:opacity-30"
                        >
                          <ChevronLeft className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          disabled={si === STAGES.length - 1}
                          onClick={() => move(c.id, STAGES[si + 1])}
                          aria-label={
                            si < STAGES.length - 1 ? `Move ${c.company} to ${STATUS_LABEL[STAGES[si + 1]]}` : `${c.company} is in the last stage`
                          }
                          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-muted hover:bg-sunken hover:text-ink disabled:opacity-30"
                        >
                          {si < STAGES.length - 1 ? STATUS_LABEL[STAGES[si + 1]] : "Last stage"}
                          <ChevronRight className="size-4" aria-hidden />
                        </button>
                      </div>
                    </article>
                  </motion.div>
                ))}
              </section>
            );
          })}
        </div>
      </LayoutGroup>
      <p aria-live="polite" className="min-h-6 text-sm text-muted">
        {announce || "Drag a card, or use its arrows. The resume version stays attached wherever the card goes."}
      </p>
    </div>
  );
}

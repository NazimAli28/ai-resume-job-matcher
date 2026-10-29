"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { MatchChip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { useReduced } from "./hooks";
import { sampleJob, sampleResume } from "./sample";

/** Requirement chips; hovering, focusing or tapping one shows the resume line behind it. */
export function MatchExplorer() {
  const reduce = useReduced();
  const [selected, setSelected] = useState("r4");
  const paneId = useId();
  const req = sampleJob.requirements.find((r) => r.id === selected)!;
  const section = req.evidence ? sampleResume.sections.find((s) => s.heading === req.evidence!.section) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2" aria-label="Requirements in the sample job">
        {sampleJob.requirements.map((r) => {
          const active = r.id === selected;
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-pressed={active}
                aria-controls={paneId}
                onMouseEnter={() => setSelected(r.id)}
                onFocus={() => setSelected(r.id)}
                onClick={() => setSelected(r.id)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pl-3 pr-1.5 text-[14px] font-semibold transition-[border-color,background-color,box-shadow]",
                  active ? "border-hl-ink/50 bg-surface glow" : "border-rule bg-surface hover:border-rule-strong",
                )}
              >
                {r.skill}
                <MatchChip value={r.matchClass} />
              </button>
            </li>
          );
        })}
      </ul>

      <div id={paneId} aria-live="polite" className="relative min-h-[212px] rounded-2xl border border-rule bg-sunken/60 p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={req.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-3"
          >
            <p className="text-sm text-muted">
              The job asks for: <span className="font-semibold text-ink">&ldquo;{req.text}&rdquo;</span>
            </p>
            {section && req.evidence ? (
              <div className="rounded-xl border border-rule bg-surface px-3 py-2.5 text-[13px] leading-relaxed">
                <p className="pb-1 font-bold">{section.heading}</p>
                <ul className="flex flex-col gap-0.5">
                  {section.lines
                    .filter((line) => line === req.evidence!.text || section.lines.length <= 3)
                    .map((line) => (
                      <li key={line} className={line === req.evidence!.text ? "" : "text-muted"}>
                        {line === req.evidence!.text ? <mark className="hl hl-sweep">{line}</mark> : line}
                      </li>
                    ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-rule-strong px-3 py-4 text-sm text-muted">
                No line in your resume shows this yet.
              </p>
            )}
            <div className="flex items-start gap-2">
              <MatchChip value={req.matchClass} />
              <p className="text-[14px]">{req.note}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

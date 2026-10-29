"use client";

import { motion } from "motion/react";
import { RingScore } from "@/components/ui/charts";
import { EstimateTag, SeverityChip } from "@/components/ui/chip";
import { bandFor } from "@/components/ui/score";
import { cn } from "@/lib/cn";
import { useReduced } from "./hooks";
import { HERO_FINDINGS, findingById, sampleResume } from "./sample";

function ScoreTile({ title, value, items }: { title: string; value: number; items: { label: string; value: number }[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <div className="flex items-center gap-3">
        <RingScore value={value} size={60} stroke={6} label={title} />
        <div className="flex flex-col gap-1 leading-tight">
          <span className="font-semibold">{title}</span>
          <span className="text-sm font-semibold text-hl-ink">{bandFor(value).word}</span>
          <EstimateTag className="self-start" />
        </div>
      </div>
      <dl className="flex flex-col gap-1 text-[13px]">
        {items.map((i) => (
          <div key={i.label} className="flex justify-between gap-3">
            <dt className="text-muted">{i.label}</dt>
            <dd className="font-semibold tabular-nums">{i.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Scores and numbered findings shown once the playground check finishes. */
export function DemoResults({
  activeFinding,
  pinned,
  onHover,
  onPick,
}: {
  activeFinding: string | null;
  pinned: string | null;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
}) {
  const reduce = useReduced();
  const appear = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay: 0.06 * i, ease: [0.2, 0.7, 0.2, 1] as const },
        };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <motion.div {...appear(0)}>
          <ScoreTile title="Parse health" value={sampleResume.parseHealth} items={sampleResume.parseBreakdown} />
        </motion.div>
        <motion.div {...appear(1)}>
          <ScoreTile title="Readability" value={sampleResume.readability} items={sampleResume.readabilityBreakdown} />
        </motion.div>
      </div>
      <p className="text-[13px] text-muted">
        Estimates from fixed checks in code, not an &ldquo;ATS score&rdquo; and not a prediction of whether you will be
        hired.
      </p>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-bold">What to fix, with the line it comes from</h3>
        <ol className="flex flex-col gap-2">
          {HERO_FINDINGS.map((hf, i) => {
            const f = findingById(hf.id);
            const active = activeFinding === hf.id;
            return (
              <motion.li key={hf.id} {...appear(i + 2)}>
                <button
                  type="button"
                  aria-pressed={pinned === hf.id}
                  onMouseEnter={() => onHover(hf.id)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(hf.id)}
                  onBlur={() => onHover(null)}
                  onClick={() => onPick(hf.id)}
                  className={cn(
                    "flex w-full gap-3 rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200",
                    active
                      ? "border-warn bg-warn-soft/60 shadow-[var(--card-shadow-hover)]"
                      : "border-transparent bg-surface hover:-translate-y-px hover:border-rule-strong",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full text-xs font-bold",
                      active ? "bg-warn text-surface" : "bg-warn-soft text-warn",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">{f.title}</span>
                      <SeverityChip value={f.severity} />
                    </span>
                    <span className="text-[13px] text-muted">{f.fix}</span>
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

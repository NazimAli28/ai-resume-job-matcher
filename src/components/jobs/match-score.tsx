"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { EstimateTag } from "@/components/ui/chip";
import { bandFor } from "@/components/ui/score";
import { AnimatedRing, ValueBar } from "@/components/resumes/visual";
import { cn } from "@/lib/cn";
import { basisLine, CAP_ONE_GAP, CAP_TWO_GAPS, type MatchResult } from "./lib/match";

const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** Hero: big ring, band, basis, factor bars (weight × value) and an expandable exact table. */
export function MatchScore({ now, before }: { now: MatchResult; before: MatchResult }) {
  const [open, setOpen] = useState(false);
  const reduce = useSkipMotion();
  const changed = now.score !== before.score;
  const delta = now.score - before.score;
  const band = bandFor(now.score);

  return (
    <section aria-labelledby="fit-heading" className="card flex flex-col gap-6 p-5 sm:p-7">
      <h2 id="fit-heading" className="sr-only">Fit estimate</h2>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <AnimatedRing value={now.score} size={168} stroke={15} label="Fit estimate" className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="font-display text-lg font-bold">Fit estimate</span>
            <EstimateTag />
          </div>
          <p className={cn("font-display text-3xl font-bold leading-none", band.tone === "low" ? "text-warn" : "text-hl-ink")}>{band.word}</p>
          <p className="text-muted">{basisLine(now)}</p>
          <p aria-live="polite" className="text-sm">
            {changed && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold", delta > 0 ? "bg-hl-soft text-hl-ink" : "bg-warn-soft text-warn")}>
                {delta > 0 ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
                {delta > 0 ? `Up ${delta}` : `Down ${-delta}`}
                <span className="font-normal text-muted"> after your changes (was {before.score})</span>
              </span>
            )}
          </p>
        </div>
      </div>

      {now.cap !== undefined && (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          Capped at {now.cap}: {now.hardGaps.length === 1 ? "1 must-have is" : `${now.hardGaps.length} must-haves are`} missing ({now.hardGaps.map((g) => g.skill).join(", ")}).
          Without the cap it would be {Math.round(now.raw)}.
        </p>
      )}
      {now.lowConfidence && (
        <p className="text-sm text-muted">Low confidence: many must-haves are unclear or none were found. Check the requirements below.</p>
      )}

      <div>
        <h3 className="pb-3 text-sm font-semibold">What makes up the number</h3>
        <ul className="flex flex-col gap-4">
          {now.factors.map((f, i) => (
            <li key={f.key} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-semibold">{f.label}</span>
                <span className="text-sm tabular-nums text-muted">
                  {f.weight} pts × {f.value}% = <span className="font-bold text-ink">{one((f.weight * f.value) / 100)}</span>
                </span>
              </div>
              <ValueBar value={f.value} label={`${f.label}: ${f.value}% of ${f.weight} points`} delay={i * 0.06} className="h-2.5" />
            </li>
          ))}
        </ul>
      </div>

      <div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="fit-breakdown"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold hover:underline underline-offset-4"
        >
          How this number is calculated
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="fit-breakdown"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <caption className="sr-only">Fit estimate breakdown</caption>
                  <thead className="text-muted">
                    <tr className="border-b border-rule">
                      <th scope="col" className="py-2 pr-3 font-semibold">Factor</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Weight</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Your value</th>
                      <th scope="col" className="py-2 text-right font-semibold">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {now.factors.map((f) => (
                      <tr key={f.key} className="border-b border-rule align-top">
                        <th scope="row" className="py-2 pr-3 font-normal">
                          <span className="font-semibold">{f.label}</span>
                          <span className="block text-muted">{f.explanation}</span>
                        </th>
                        <td className="py-2 pr-3 text-right tabular-nums">{f.weight}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{f.value}%</td>
                        <td className="py-2 text-right tabular-nums">{one((f.weight * f.value) / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row" colSpan={3} className="py-2 pr-3 text-right font-semibold">Total</th>
                      <td className="py-2 text-right font-semibold tabular-nums">{one(now.raw)}</td>
                    </tr>
                    {now.cap !== undefined && (
                      <tr>
                        <th scope="row" colSpan={3} className="py-1 pr-3 text-right font-normal text-muted">Missing must-have cap</th>
                        <td className="py-1 text-right tabular-nums text-warn">max {now.cap}</td>
                      </tr>
                    )}
                    <tr>
                      <th scope="row" colSpan={3} className="py-1 pr-3 text-right font-normal text-muted">Shown, rounded</th>
                      <td className="py-1 text-right font-display text-base font-bold tabular-nums">{now.score}</td>
                    </tr>
                  </tfoot>
                </table>
                <p className="pt-2 text-sm text-muted">
                  Points = weight × your value. One missing must-have caps the estimate at {CAP_ONE_GAP}; two or more cap it at {CAP_TWO_GAPS}.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-sm text-muted">A fit estimate to guide your preparation, not a hiring prediction.</p>
    </section>
  );
}

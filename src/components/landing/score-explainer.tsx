"use client";

import { Calculator, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { BarChart } from "@/components/ui/charts";
import { EstimateTag, MatchChip } from "@/components/ui/chip";
import { bandFor } from "@/components/ui/score";
import { initialState } from "@/demo/data";
import type { MatchClass } from "@/demo/types";
import { cn } from "@/lib/cn";
import { useReduced } from "./hooks";
import { LiveNumber } from "./live-number";
import { CREDIT, HARD_GAP_CAP, sampleJob } from "./sample";
import { Container, GlowBlob, IconChip, SampleCaption, SectionHeading } from "./section";

const CYCLE: MatchClass[] = ["STRONG", "PARTIAL", "MISSING", "UNKNOWN"];
const CLASS_WORD: Record<MatchClass, string> = { STRONG: "Strong", PARTIAL: "Partial", MISSING: "Missing", UNKNOWN: "Unclear" };
const SHORT: Record<string, string> = { must: "Must", nice: "Nice", title: "Title", evidence: "Evidence", thresholds: "Basics" };
const baseFactors = initialState.matches.find((m) => m.jobId === sampleJob.id)!.factors;
const initialClasses = Object.fromEntries(sampleJob.requirements.map((r) => [r.id, r.matchClass])) as Record<
  string,
  MatchClass
>;

const share = (classes: MatchClass[]) =>
  classes.length ? Math.round((classes.reduce((s, c) => s + CREDIT[c], 0) / classes.length) * 100) : 100;

/** Same rule as the app: weighted factors, and a cap when a must-have is missing. */
function compute(classes: Record<string, MatchClass>) {
  const must = sampleJob.requirements.filter((r) => r.type === "MUST_HAVE");
  const nice = sampleJob.requirements.filter((r) => r.type === "NICE_TO_HAVE");
  const values: Record<string, number> = {
    must: share(must.map((r) => classes[r.id])),
    nice: share(nice.map((r) => classes[r.id])),
  };
  const factors = baseFactors.map((f) => {
    const value = values[f.key] ?? f.value;
    return { ...f, value, points: (f.weight * value) / 100, live: f.key in values };
  });
  const raw = factors.reduce((s, f) => s + f.points, 0);
  const gaps = must.filter((r) => classes[r.id] === "MISSING");
  const capped = gaps.length > 0 && raw > HARD_GAP_CAP;
  return { factors, raw, gaps, capped, score: Math.round(capped ? HARD_GAP_CAP : raw) };
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const GROUPS = [
  { type: "MUST_HAVE", label: "Must-haves" },
  { type: "NICE_TO_HAVE", label: "Nice-to-haves" },
] as const;

/** INTEREST: the interactive formula. Toggle requirement chips and the estimate recomputes in place. */
export function ScoreExplainer() {
  const reduce = useReduced();
  const [classes, setClasses] = useState(initialClasses);
  const { factors, raw, gaps, capped, score } = compute(classes);
  const band = bandFor(score);
  const changed = sampleJob.requirements.some((r) => classes[r.id] !== r.matchClass);
  const nextOf = (c: MatchClass) => CYCLE[(CYCLE.indexOf(c) + 1) % CYCLE.length];
  const cycle = (id: string) => setClasses((c) => ({ ...c, [id]: nextOf(c[id]) }));

  return (
    <section id="how-we-score" aria-labelledby="score-title" className="relative scroll-mt-24 py-20 sm:py-28">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          id="score-title"
          title="How we score a job match"
          intro="The number is arithmetic in code, not an AI's opinion: five factors with fixed weights, and a cap when a must-have is missing. Tap a requirement and watch it recompute."
        />

        <div className="card relative overflow-hidden">
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            {/* Result */}
            <div className="relative flex flex-col gap-6 overflow-hidden border-b border-rule p-5 sm:p-8 lg:border-b-0 lg:border-r">
              <GlowBlob className="-left-20 -top-24 size-80" />
              <div className="relative flex items-center gap-3">
                <IconChip icon={Calculator} strong />
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Job match</span>
                  <EstimateTag />
                </div>
              </div>
              <div className="relative flex items-end gap-4">
                <LiveNumber
                  value={score}
                  className="font-display text-[96px] font-extrabold leading-[0.85] tracking-[-0.04em] tabular-nums text-glow sm:text-[120px]"
                />
                <div className="flex flex-col pb-2">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={band.word}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className={cn("text-xl font-bold", band.tone === "low" ? "text-warn" : "text-hl-ink")}
                    >
                      {band.word}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-sm text-muted">out of 100</span>
                </div>
              </div>
              <p className="sr-only" aria-live="polite">
                Job match estimate {score} out of 100, {band.word}.
                {capped ? ` Capped at ${HARD_GAP_CAP} because a must-have is missing.` : ""}
              </p>

              {/* Contribution bar: each segment's width is its weight; the fill is the points earned. */}
              <div className="relative flex flex-col gap-2">
                <div className="flex h-5 w-full gap-1" aria-hidden>
                  {factors.map((f) => (
                    <div key={f.key} className="h-full overflow-hidden rounded-md bg-sunken" style={{ width: `${f.weight}%` }}>
                      <div
                        className="h-full rounded-md bg-hl transition-[width] duration-500 ease-out"
                        style={{ width: `${f.value}%` }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[13px] text-muted">Segment width is the weight. The fill is how much of it you earn.</p>
              </div>

              <div
                className={cn(
                  "relative rounded-xl px-4 py-3 text-sm transition-colors",
                  capped ? "bg-warn-soft text-warn" : "border border-rule bg-surface text-muted",
                )}
              >
                {capped
                  ? `Capped at ${HARD_GAP_CAP}: ${gaps.map((g) => g.skill).join(" and ")} ${gaps.length > 1 ? "are" : "is"} a must-have you don't show. A missing must-have caps the match, however strong the rest is.`
                  : gaps.length
                    ? `A must-have is missing, but the total is already under the cap of ${HARD_GAP_CAP}.`
                    : `No must-have is missing, so there is no cap. Mark one as missing to see the cap of ${HARD_GAP_CAP} apply.`}
              </div>

              <div className="relative flex flex-col gap-2">
                <p className="text-sm font-semibold">Points earned per factor</p>
                <BarChart
                  data={factors.map((f) => ({ label: SHORT[f.key] ?? f.label, value: Math.round(f.points * 10) / 10 }))}
                  label={`Points earned per factor: ${factors.map((f) => `${f.label} ${fmt(f.points)} of ${f.weight}`).join(", ")}`}
                  height={130}
                  highlightLast={false}
                />
              </div>
            </div>

            {/* Requirements and formula */}
            <div className="flex flex-col gap-6 p-5 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold leading-tight">{sampleJob.title}</h3>
                  <p className="text-sm text-muted">{sampleJob.company}, sample job</p>
                </div>
                <button
                  type="button"
                  onClick={() => setClasses(initialClasses)}
                  disabled={!changed}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  Reset
                </button>
              </div>
              <p className="-mt-3 text-sm text-muted">
                Tap a chip to change it. Strong counts fully, partial and unclear count half, missing counts zero.
              </p>

              {GROUPS.map((g) => (
                <div key={g.type} className="flex flex-col gap-2">
                  <h4 className="text-sm font-semibold text-muted">{g.label}</h4>
                  <ul className="flex flex-wrap gap-2">
                    {sampleJob.requirements
                      .filter((r) => r.type === g.type)
                      .map((r) => (
                        <li key={r.id}>
                          <motion.button
                            type="button"
                            whileTap={reduce ? undefined : { scale: 0.95 }}
                            onClick={() => cycle(r.id)}
                            aria-label={`${r.skill}: ${CLASS_WORD[classes[r.id]]}. Change to ${CLASS_WORD[nextOf(classes[r.id])]}`}
                            className={cn(
                              "inline-flex min-h-11 items-center gap-2 rounded-full border bg-surface py-1 pl-3.5 pr-1.5 text-[14px] font-semibold transition-[border-color,box-shadow]",
                              classes[r.id] === "STRONG" ? "border-hl-ink/40 hover:glow" : "border-rule hover:border-rule-strong",
                            )}
                          >
                            {r.skill}
                            <MatchChip value={classes[r.id]} />
                          </motion.button>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}

              <table className="w-full text-left text-[14px]">
                <caption className="sr-only">Job match breakdown: weight times share met equals points</caption>
                <thead>
                  <tr className="border-b border-rule-strong text-[13px] text-muted">
                    <th scope="col" className="py-2 pr-2 font-semibold">Factor</th>
                    <th scope="col" className="py-2 pr-2 text-right font-semibold">Weight</th>
                    <th scope="col" className="py-2 pr-2 text-right font-semibold">Met</th>
                    <th scope="col" className="py-2 text-right font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {factors.map((f) => (
                    <tr key={f.key} className="border-b border-rule align-top">
                      <th scope="row" className="py-2 pr-2 font-semibold">
                        {f.label}
                        {f.live && <span className="ml-1.5 rounded-full bg-hl-soft px-1.5 text-[11px] text-hl-ink">live</span>}
                      </th>
                      <td className="py-2 pr-2 text-right tabular-nums text-muted">{f.weight}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-muted">&times; {f.value}%</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{fmt(f.points)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={3} className="py-2 pr-2 font-semibold">
                      {capped ? `Total ${fmt(raw)}, capped at` : "Total"}
                    </th>
                    <td className="py-2 text-right font-bold tabular-nums">{capped ? HARD_GAP_CAP : fmt(raw)}</td>
                  </tr>
                </tfoot>
              </table>
              <SampleCaption>Example output (sample data): Ayesha&rsquo;s v3 against a sample job</SampleCaption>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

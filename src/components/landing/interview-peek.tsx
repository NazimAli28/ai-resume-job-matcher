"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { RingScore } from "@/components/ui/charts";
import { EstimateTag } from "@/components/ui/chip";
import { bandFor } from "@/components/ui/score";
import { Tabs } from "@/components/ui/tabs";
import { useReduced } from "./hooks";
import { sampleInterview } from "./sample";

const PICKS = ["q3", "q2", "q5"] as const;
type Pick = (typeof PICKS)[number];

/** Shows "[Add …]" gaps in a model answer as visible placeholders, never filled in for the user. */
function WithPlaceholders({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/).map((part, i) =>
        part.startsWith("[") ? (
          <span key={i} className="rounded-[4px] border border-dashed border-warn px-1 text-warn">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** Interview report peek: question tabs, a score ring, rubric bars with quotes, and a model answer. */
export function InterviewPeek() {
  const reduce = useReduced();
  const [pick, setPick] = useState<Pick>("q3");
  const [view, setView] = useState<"rubric" | "model">("rubric");
  const q = sampleInterview.questions.find((x) => x.id === pick)!;
  const ev = sampleInterview.evaluations.find((x) => x.questionId === pick)!;
  const band = bandFor(ev.overall);

  return (
    <Tabs
      value={pick}
      onChange={setPick}
      label="Sample interview questions"
      tabs={PICKS.map((id, i) => ({ value: id, label: `Question ${i + 1}` }))}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <RingScore value={ev.overall} size={72} stroke={7} label={`Answer estimate, ${band.word}`} className="shrink-0" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="font-display text-[17px] font-bold leading-snug">&ldquo;{q.text}&rdquo;</p>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className={band.tone === "low" ? "font-semibold text-warn" : "font-semibold text-hl-ink"}>
                {band.word}
              </span>
              <EstimateTag />
            </p>
          </div>
        </div>

        <div role="radiogroup" aria-label="Show" className="flex gap-1 rounded-xl border border-rule bg-surface p-1">
          {(
            [
              ["rubric", "How it was scored"],
              ["model", "Model answer"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={`min-h-10 flex-1 rounded-lg px-3 text-[13px] font-semibold transition-colors ${view === v ? "bg-hl text-on-hl" : "text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "rubric" ? (
          <>
            <ul className="flex flex-col gap-3" aria-label="Rubric scores with quotes from the answer">
              {ev.rubric.map((r, i) => (
                <li key={r.dimension} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-[14px]">
                    <span className="font-semibold">{r.dimension}</span>
                    <span className="tabular-nums text-muted">{r.score} of 5</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
                    <motion.div
                      key={`${pick}-${r.dimension}`}
                      className="h-full rounded-full bg-viz"
                      initial={reduce ? false : { width: 0 }}
                      animate={{ width: `${(r.score / 5) * 100}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
                    />
                  </div>
                  <p className="text-[13px] text-muted">
                    {r.quote && (
                      <>
                        <mark className="hl">&ldquo;{r.quote}&rdquo;</mark>{" "}
                      </>
                    )}
                    {r.comment}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-1 border-l-2 border-warn pl-3">
              <p className="text-sm font-semibold">What was missing</p>
              <p className="text-[15px]">{ev.whatWasMissing}</p>
            </div>
          </>
        ) : (

          <div className="flex flex-col gap-2 rounded-2xl bg-sunken/70 p-4">
            <p className="text-sm font-semibold">A model answer, built only from your facts</p>
            <p className="text-[15px] leading-relaxed">
              <WithPlaceholders text={ev.modelAnswer} />
            </p>
            <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Built from">
              {ev.modelAnswerSources.map((s) => (
                <li key={s} className="rounded-full border border-rule bg-surface px-2.5 py-0.5 text-[12px]">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Tabs>
  );
}

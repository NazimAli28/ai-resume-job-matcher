"use client";

import { Check, CircleHelp, FolderCheck, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { useReduced } from "./hooks";
import { SampleCaption } from "./section";

type Step = "ask" | "describe" | "saved" | "declined";

/** Keep the visitor's text short and plain; it is their fact, we only store and reuse it. */
const clean = (s: string) => s.replace(/[<>[\]]/g, "").slice(0, 120).trim();

const PREFILL = "Set up Docker Compose for our local dev environment at Kinara Software";

/**
 * The evidence loop, on the sample job: a requirement the resume doesn't show is never added.
 * We ask. "Yes" plus a short description becomes saved evidence the next suggestion may use;
 * "No" leaves it missing.
 */
export function EvidenceLoop() {
  const reduce = useReduced();
  const [step, setStep] = useState<Step>("ask");
  const [text, setText] = useState(PREFILL);
  const inputId = useId();
  const fact = clean(text);

  const fade = reduce
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.25 } };

  return (
    <div className="flex flex-col gap-4">
      {/* The requirement, as the job match shows it */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rule bg-surface p-4">
        <div className="min-w-0">
          <p className="text-[13px] text-muted">Indus Systems, Frontend Developer · nice-to-have</p>
          <p className="font-display text-xl font-bold">Docker</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[13px] font-bold transition-colors",
            step === "saved" ? "bg-hl text-on-hl glow" : "bg-warn-soft text-warn",
          )}
        >
          {step === "saved" ? "Met: your confirmed fact" : "Missing from your resume"}
        </span>
      </div>

      <div className="min-h-[13.5rem]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {step === "ask" && (
            <motion.div key="ask" {...fade} className="flex flex-col gap-3 rounded-2xl bg-sunken/70 p-4">
              <p className="flex items-start gap-2 font-semibold">
                <CircleHelp className="mt-0.5 size-5 shrink-0 text-hl-ink" aria-hidden />
                We won&apos;t add Docker for you. Have you actually used it?
              </p>
              <p className="text-sm text-muted">
                A job description lists what they want, not what you did. Only you can confirm it.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep("describe")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-hl px-4 font-semibold text-on-hl glow"
                >
                  <Check className="size-4" aria-hidden /> Yes, I have
                </button>
                <button
                  type="button"
                  onClick={() => setStep("declined")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rule bg-surface px-4 font-semibold"
                >
                  <X className="size-4" aria-hidden /> No, not yet
                </button>
              </div>
            </motion.div>
          )}

          {step === "describe" && (
            <motion.form
              key="describe"
              {...fade}
              onSubmit={(e) => {
                e.preventDefault();
                if (fact) setStep("saved");
              }}
              className="flex flex-col gap-3 rounded-2xl bg-sunken/70 p-4"
            >
              <label htmlFor={inputId} className="font-semibold">
                Where and how did you use it? One line is enough.
              </label>
              <textarea
                id={inputId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={120}
                rows={2}
                className="w-full resize-none rounded-xl border border-rule bg-surface px-3 py-2 text-ink focus:border-hl-ink focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!fact}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-hl px-4 font-semibold text-on-hl glow disabled:opacity-50"
                >
                  <FolderCheck className="size-4" aria-hidden /> Save as evidence
                </button>
                <span className="text-[13px] text-muted">Sample text. Change it if you like.</span>
              </div>
            </motion.form>
          )}

          {step === "saved" && (
            <motion.div key="saved" {...fade} className="flex flex-col gap-3">
              <div className="rounded-2xl border border-hl-ink/40 bg-hl-soft/50 p-4">
                <p className="text-[13px] font-semibold text-muted">Saved to your evidence</p>
                <p className="mt-1">&ldquo;{fact}&rdquo;</p>
                <p className="mt-2 text-[13px] text-muted">Reused for every future job that asks for Docker. Edit or delete it in your profile.</p>
              </div>
              <div className="rounded-2xl border border-rule bg-surface p-4">
                <p className="text-[13px] font-semibold text-muted">Suggested skills line, now allowed</p>
                <p className="mt-1">
                  React, TypeScript, Next.js, REST APIs, <span className="hl hl-sweep font-semibold">Docker (local dev environments)</span>
                </p>
              </div>
            </motion.div>
          )}

          {step === "declined" && (
            <motion.div key="declined" {...fade} className="flex flex-col gap-3 rounded-2xl bg-sunken/70 p-4">
              <p className="font-semibold">Then it stays missing. Nothing is added to your resume.</p>
              <p className="text-sm text-muted">
                It&apos;s a nice-to-have, so your fit estimate barely moves. If it were a must-have, we&apos;d tell you it caps the
                estimate, so you can decide whether to apply or learn it first.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3">
        <SampleCaption>Sample data: Ayesha&apos;s resume and a real-style job post</SampleCaption>
        {step !== "ask" && (
          <button
            type="button"
            onClick={() => {
              setStep("ask");
              setText(PREFILL);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
          >
            <RotateCcw className="size-4" aria-hidden /> Start over
          </button>
        )}
      </div>
    </div>
  );
}

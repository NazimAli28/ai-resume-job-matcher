"use client";

import { Check, FileUp, FlaskConical, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useState, type ChangeEvent } from "react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { DemoResults } from "./demo-results";
import { STAGES, nextPhase, reached, type Phase } from "./demo-stages";
import { useReduced } from "./hooks";
import { ResumeSheet } from "./resume-sheet";
import { Container, GlowBlob, IconChip, SampleCaption, SectionHeading } from "./section";

/** Horizontal stepper with a glowing fill that follows the simulated stages. */
function Stepper({ phase }: { phase: Phase }) {
  const doneCount = phase === "done" ? STAGES.length : Math.max(0, STAGES.findIndex((s) => s.key === phase));
  const pct = phase === "idle" ? 0 : (Math.min(doneCount + (phase === "done" ? 0 : 0.5), STAGES.length) / STAGES.length) * 100;
  return (
    <div className="flex flex-col gap-3">
      <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-hl glow"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </div>
      <ol className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4" aria-label="What the check does">
        {STAGES.map((s) => {
          const done = reached(phase, s.key) && phase !== s.key;
          const now = phase === s.key;
          return (
            <li key={s.key} className={cn("flex items-start gap-2 text-[13px] leading-snug", !done && !now && "text-muted")}>
              <span
                aria-hidden
                className={cn(
                  "mt-px grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors",
                  done ? "border-hl-ink bg-hl text-on-hl" : now ? "border-ink" : "border-rule-strong",
                )}
              >
                {done && <Check className="size-2.5" strokeWidth={4} />}
                {now && <span className="size-1.5 animate-pulse rounded-full bg-ink" />}
              </span>
              <span className={cn(now && "font-semibold text-ink")}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * INTEREST: the "Try it" playground over Ayesha's sample resume.
 * Simulated: stage timings are fixed and results come from the demo data set.
 * Clicking a finding outlines its line on the sheet and scrolls it into view if needed.
 */
export function Playground() {
  const reduce = useReduced();
  const [phase, setPhase] = useState<Phase>("idle");
  const [pinned, setPinned] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const activeFinding = hovered ?? pinned;
  const [fileNote, setFileNote] = useState<string | null>(null);
  const fileId = useId();
  const running = phase !== "idle" && phase !== "done";

  useEffect(() => {
    if (!running) return;
    const stage = STAGES.find((s) => s.key === phase);
    const t = window.setTimeout(() => setPhase((p) => nextPhase(p)), stage?.ms ?? 900);
    return () => window.clearTimeout(t);
  }, [phase, running]);

  const start = () => {
    setPinned(null);
    setHovered(null);
    setPhase("reading");
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.files?.[0]?.name;
    e.target.value = ""; // never read or keep the file
    if (!name) return;
    setFileNote(
      `You picked “${name}”. This demo always checks the sample resume, so your file was not opened or uploaded.`,
    );
    start();
  };

  const pick = (id: string) => {
    setPinned(id);
    const el = document.querySelector(`[data-finding="${id}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 80 || r.bottom > window.innerHeight) {
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
  };

  const currentStage = STAGES.find((s) => s.key === phase);

  return (
    <section id="try" aria-labelledby="try-title" className="relative scroll-mt-24 overflow-x-clip py-20 sm:py-28">
      <div aria-hidden className="absolute inset-0 bg-sunken/70 [mask-image:linear-gradient(180deg,transparent,black_12%,black_88%,transparent)]" />
      <GlowBlob className="left-1/2 top-24 size-[40rem] -translate-x-1/2 opacity-70" />
      <Container className="relative flex flex-col gap-10">
        <SectionHeading
          id="try-title"
          center
          title="Try it on a real-looking resume"
          intro="Run the check on Ayesha's sample resume. Watch personal details get masked, then click any finding to see the exact line it comes from."
        />

        <div className="card relative overflow-hidden p-3 sm:p-5">
          <div className="flex flex-col gap-5 px-1 pb-5 pt-1 sm:px-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <IconChip icon={FlaskConical} strong={phase !== "idle"} />
                <div className="leading-tight">
                  <p className="font-display text-lg font-bold">Sample resume check</p>
                  <p className="text-[13px] text-muted">
                    {phase === "done" ? "Checked in 4 steps. 5 findings." : running ? `${currentStage?.label}…` : "Ready when you are"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {phase === "idle" && (
                  <>
                    <button type="button" onClick={start} className={buttonClass("primary", "md", "glow")}>
                      Check this sample resume
                    </button>
                    <label
                      htmlFor={fileId}
                      className={buttonClass(
                        "secondary",
                        "md",
                        "cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hl-ink",
                      )}
                    >
                      <FileUp className="size-4" aria-hidden />
                      Pick a file instead
                      <input id={fileId} type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={onFile} />
                    </label>
                  </>
                )}
                {running && (
                  <button type="button" onClick={() => setPhase("done")} className={buttonClass("ghost", "md")}>
                    Skip to the results
                  </button>
                )}
                {phase === "done" && (
                  <button
                    type="button"
                    onClick={() => {
                      setFileNote(null);
                      start();
                    }}
                    className={buttonClass("secondary", "md")}
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    Run it again
                  </button>
                )}
              </div>
            </div>
            <Stepper phase={phase} />
            <p aria-live="polite" className="sr-only">
              {currentStage ? `${currentStage.label}…` : phase === "done" ? "Check finished. 5 findings." : ""}
            </p>
            {fileNote && phase !== "idle" && (
              <p className="rounded-xl border border-rule bg-sunken px-3 py-2 text-[13px] text-muted">{fileNote}</p>
            )}
          </div>

          <div className="grid gap-5 rounded-2xl bg-sunken p-3 sm:p-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-7">
            <div className="flex min-w-0 flex-col gap-2">
              <ResumeSheet phase={phase} activeFinding={activeFinding} />
              <SampleCaption>Example output (sample data): Ayesha&rsquo;s resume, version 3</SampleCaption>
            </div>
            <div className="flex min-w-0 flex-col gap-5 lg:pt-1">
              {phase === "done" ? (
                <>
                  <DemoResults activeFinding={activeFinding} pinned={pinned} onHover={setHovered} onPick={pick} />
                  <Link href="/demo" className={buttonClass("ink", "md", "self-start")}>
                    Open the full report in the demo
                  </Link>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-col gap-2 rounded-xl bg-surface p-4">
                      <div className={cn("h-3 w-2/5 rounded-full", running ? "shimmer" : "bg-sunken")} />
                      <div className={cn("h-2.5 w-4/5 rounded-full", running ? "shimmer" : "bg-sunken")} />
                      <div className={cn("h-2.5 w-3/5 rounded-full", running ? "shimmer" : "bg-sunken")} />
                    </div>
                  ))}
                  <p className="text-[13px] text-muted">
                    {running
                      ? "Results appear here when the check finishes."
                      : "The demo uses a sample resume either way. Your file is never opened or uploaded here."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

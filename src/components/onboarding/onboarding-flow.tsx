"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, FileText, Globe2, PartyPopper, Sparkles, Target, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnalysisProgress, ResumeSourcePicker, useAnalysisRun } from "@/components/resumes/analysis-run";
import { ScorePair } from "@/components/resumes/scores";
import { Button, ButtonLink } from "@/components/ui/button";
import { SeverityChip } from "@/components/ui/chip";
import { useDemo } from "@/demo/store";
import type { ResumeVersion, Severity, TargetMarket } from "@/demo/types";
import { cn } from "@/lib/cn";
import { SeverityIcon } from "@/components/resumes/visual";
import { MarketChoice } from "./market-choice";
import { RoleChips } from "./role-chips";

const STEPS: { title: string; hint: string; icon: LucideIcon }[] = [
  { title: "Where are you applying?", hint: "This tunes the advice we give you.", icon: Globe2 },
  { title: "Which roles?", hint: "Up to five. We use them to judge fit.", icon: Target },
  { title: "Your resume", hint: "Pick the sample or choose a file.", icon: FileText },
  { title: "Your first read", hint: "Here is what a system reads from your resume.", icon: Sparkles },
];
const SEVERITY_ORDER: Severity[] = ["HIGH", "MEDIUM", "LOW", "TIP"];

function topFixes(resume: ResumeVersion) {
  return resume.findings
    .filter((f) => !f.resolved)
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    .slice(0, 3);
}

/** Step progress: a filling bar plus one node per step. */
function Progress({ step }: { step: number }) {
  const pct = ((step - 1) / (STEPS.length - 1)) * 100;
  return (
    <ol className="relative grid grid-cols-4" aria-label="Progress">
      <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-5 h-1 -translate-y-1/2 rounded-full bg-rule" />
      <span
        aria-hidden
        className="absolute left-[12.5%] top-5 h-1 -translate-y-1/2 rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct * 0.75}%`, background: "var(--viz)" }}
      />
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        const Icon = s.icon;
        return (
          <li key={s.title} aria-current={current ? "step" : undefined} className="relative flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "grid size-10 place-items-center rounded-full border-2 transition-all duration-300",
                done ? "border-hl-ink bg-hl text-on-hl" : current ? "scale-110 border-hl-ink bg-surface text-hl-ink glow" : "border-rule bg-surface text-muted",
              )}
            >
              {done ? <Check className="size-5" strokeWidth={3} aria-hidden /> : <Icon className="size-5" aria-hidden />}
            </span>
            <span className={cn("hidden text-xs font-semibold sm:block", current ? "text-ink" : "text-muted")}>{s.title.replace("?", "")}</span>
            <span className="sr-only">
              {s.title}
              {done ? " (done)" : current ? " (current)" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const reduce = useSkipMotion();
  const { state, dispatch, atLimit, activeResume } = useDemo();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [market, setMarket] = useState<TargetMarket | null>(null);
  const [roles, setRoles] = useState<string[] | null>(null);
  const limited = atLimit("analyses");

  const run = useAnalysisRun(() => dispatch({ type: "UPDATE_USER", patch: { onboarded: true } }));

  const chosenMarket = market ?? state.user.targetMarket;
  const chosenRoles = roles ?? state.user.targetRoles;
  const shown: ResumeVersion | undefined = run.result ?? (limited && step === 4 ? activeResume : undefined);

  const goStep = (n: number) => {
    setDir(n >= step ? 1 : -1);
    setStep(n);
    window.scrollTo({ top: 0 });
  };

  const meta = STEPS[step - 1];
  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 40 * dir },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -40 * dir },
      };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-2xl flex-col justify-center gap-6 py-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="font-semibold">Step {step} of 4</span>
        {step < 4 && (
          <ButtonLink href="/demo" variant="ghost" size="sm">
            Skip setup
          </ButtonLink>
        )}
      </div>

      <div className="card overflow-hidden p-5 sm:p-8">
        <Progress step={step} />

        <div className="pt-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} {...slide} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }} className="flex flex-col gap-7">
              <header className="flex flex-col gap-1.5">
                <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{meta.title}</h1>
                <p className="text-muted">{meta.hint}</p>
              </header>

              {step === 1 && (
                <section className="flex flex-col gap-6">
                  <MarketChoice value={chosenMarket} onChange={setMarket} />
                  <div>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        dispatch({ type: "SET_TARGET_MARKET", market: chosenMarket });
                        goStep(2);
                      }}
                    >
                      Continue
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="flex flex-col gap-6">
                  <RoleChips roles={chosenRoles} onChange={setRoles} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="lg" onClick={() => goStep(1)}>
                      <ArrowLeft className="size-4" aria-hidden />
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        dispatch({ type: "UPDATE_USER", patch: { targetRoles: chosenRoles } });
                        goStep(3);
                      }}
                    >
                      {chosenRoles.length ? "Continue" : "Skip for now"}
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className="flex flex-col gap-6">
                  {limited ? (
                    <div className="flex flex-col gap-4 rounded-2xl border border-rule-strong p-5">
                      <h2 className="font-display text-lg font-bold">You have used all your analyses for now</h2>
                      <p className="text-muted">
                        The free plan includes {state.limits.analyses} resume analyses ({state.usage.analyses} used). You can
                        still look at your current resume&apos;s report.
                      </p>
                      <div>
                        <Button variant="primary" onClick={() => goStep(4)}>
                          See my current resume&apos;s report
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ResumeSourcePicker
                      onStart={(source) => {
                        goStep(4);
                        run.start(source);
                      }}
                    />
                  )}
                  <div>
                    <Button variant="ghost" size="lg" onClick={() => goStep(2)}>
                      <ArrowLeft className="size-4" aria-hidden />
                      Back
                    </Button>
                  </div>
                </section>
              )}

              {step === 4 && run.status === "running" && (
                <section className="flex flex-col gap-4" aria-busy="true">
                  <p className="text-muted">Checking the sample resume. This takes a few seconds.</p>
                  <AnalysisProgress stage={run.stage} />
                </section>
              )}

              {step === 4 && shown && run.status !== "running" && (
                <section className="flex flex-col gap-8">
                  <p className="flex items-start gap-3 text-muted">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-hl text-on-hl glow">
                      <PartyPopper className="size-5" aria-hidden />
                    </span>
                    <span className="pt-1">
                      {run.result
                        ? "This is what a system reads from the sample resume. Scores are estimates, not a verdict."
                        : "Here is your current resume. Scores are estimates, not a verdict."}
                    </span>
                  </p>
                  <ScorePair resume={shown} size={120} />
                  <div className="flex flex-col gap-3">
                    <h2 className="font-display text-lg font-bold">Top fixes</h2>
                    <ol className="flex flex-col gap-2.5">
                      {topFixes(shown).map((f, i) => (
                        <motion.li
                          key={f.id}
                          initial={reduce ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + i * 0.12, duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                          className="flex items-start gap-3 rounded-2xl border border-rule bg-surface p-3.5"
                        >
                          <SeverityIcon value={f.severity} />
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">
                                {i + 1}. {f.title}
                              </span>
                              <SeverityChip value={f.severity} />
                            </div>
                            <p className="text-sm text-muted">{f.fix}</p>
                          </div>
                        </motion.li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" size="lg" onClick={() => router.push("/demo")}>
                      Go to dashboard
                    </Button>
                    <ButtonLink href={`/demo/resumes/${shown.id}`} size="lg">
                      See the full report
                    </ButtonLink>
                  </div>
                </section>
              )}

              {step === 4 && !shown && run.status === "idle" && (
                <section className="flex flex-col gap-4">
                  <p className="text-muted">No resume has been analyzed yet.</p>
                  <div>
                    <Button size="lg" onClick={() => goStep(3)}>
                      Choose a resume
                    </Button>
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

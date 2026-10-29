"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, ChevronDown, Lightbulb, RotateCcw, Sparkles, ThumbsUp, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { RingScore } from "@/components/ui/charts";
import { Chip, EstimateTag } from "@/components/ui/chip";
import { Textarea } from "@/components/ui/field";
import { Item, Stagger, useSkipMotion } from "@/components/ui/motion";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { bandFor } from "@/components/ui/score";
import { INTERVIEW_TYPE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { InterviewEvaluation, InterviewQuestion, InterviewSession, Job, Profile } from "@/demo/types";
import { cn } from "@/lib/cn";
import { createSession } from "./bank";
import { MarkedText, ScoreInline, WithPlaceholders } from "./parts";
import { evaluateText, followUpLines, NO_ANSWER } from "./scoring";
import { aggregate } from "./stats";

const ADVICE: Record<string, string> = {
  "STAR structure": "Tell each story in order: situation, what you did, and how it ended.",
  Specificity: "Name the project, the tool and a number in each answer.",
  Relevance: "Tie each answer to one requirement from the job.",
  Clarity: "Lead with the main point, then add detail.",
  Conciseness: "Aim for 120 to 300 words per answer.",
  Accuracy: "Use the job's exact technologies and double-check the details.",
  Depth: "Add an example from your own work and one trade-off.",
  Reasoning: "Show your steps and say why you chose them.",
  Communication: "Say the main point first.",
};

/** Horizontal bar (0 to max). Fill uses the chart color; the number and label are text, never the series color. */
function Bar({ value, max = 5, label, delay = 0 }: { value: number; max?: number; label: string; delay?: number }) {
  const reduce = useSkipMotion();
  const pct = Math.max(3, Math.min(100, (value / max) * 100));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Number(value.toFixed(1))}
      className="h-2.5 w-full overflow-hidden rounded-full bg-sunken"
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: "var(--viz)" }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, delay, ease: [0.2, 0.7, 0.2, 1] }}
      />
    </div>
  );
}

function QuestionCard({
  index, question, session, evaluation, job, profile, defaultOpen,
}: {
  index: number;
  question: InterviewQuestion;
  session: InterviewSession;
  evaluation?: InterviewEvaluation;
  job: Job | undefined;
  profile: Profile;
  defaultOpen: boolean;
}) {
  const reduce = useSkipMotion();
  const [open, setOpen] = useState(defaultOpen);
  const [retrying, setRetrying] = useState(false);
  const [retryText, setRetryText] = useState("");
  const [scoring, setScoring] = useState(false);
  const [retry, setRetry] = useState<InterviewEvaluation | null>(null);
  const answer = session.answers.find((a) => a.questionId === question.id);
  const fu = followUpLines(answer);
  const panelId = `q-panel-${question.id}`;

  const runRetry = () => {
    if (!job || !retryText.trim()) return;
    setScoring(true);
    setTimeout(() => {
      setRetry(evaluateText(question, retryText.trim(), job, profile));
      setScoring(false);
    }, 900);
  };
  const delta = retry && evaluation ? retry.overall - evaluation.overall : 0;

  return (
    <li className="card overflow-hidden">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-16 w-full items-center justify-between gap-4 p-4 text-left hover:bg-sunken/60"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-hl-soft font-display text-sm font-bold text-hl-ink">{index + 1}</span>
            <span className="font-semibold">{question.text}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {evaluation ? <ScoreInline value={evaluation.overall} className="hidden sm:inline-flex" /> : <Chip className="border border-rule text-muted">Skipped</Chip>}
            {evaluation && <span className="font-display text-xl font-bold tabular-nums sm:hidden">{evaluation.overall}</span>}
            <ChevronDown className={cn("size-5 transition-transform duration-300", open && "rotate-180")} aria-hidden />
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-6 border-t border-rule p-4 sm:p-5">
              {!evaluation || !answer?.answer.trim() ? (
                <p className="text-muted">You skipped this question, so it is not scored.</p>
              ) : (
                <>
                  <section className="flex flex-col gap-2">
                    <h4 className="font-bold">Your answer</h4>
                    <p className="whitespace-pre-wrap rounded-2xl bg-sunken p-4 leading-loose">
                      <MarkedText text={answer.answer} quotes={evaluation.rubric.map((r) => r.quote)} />
                    </p>
                    <p className="text-sm text-muted">Highlighted phrases are the evidence behind the scores below.</p>
                    {fu.question.map((fq, i) => (
                      <div key={i} className="mt-2 border-l-2 border-hl-ink/40 pl-4">
                        <p className="text-sm text-muted">Follow-up from the interviewer</p>
                        <p className="font-semibold">{fq}</p>
                        <p className="whitespace-pre-wrap leading-loose">
                          {fu.answer[i] && fu.answer[i] !== NO_ANSWER ? (
                            <MarkedText text={fu.answer[i]} quotes={evaluation.rubric.map((r) => r.quote)} />
                          ) : (
                            <span className="text-muted">No answer given.</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </section>

                  <section className="flex flex-col gap-1">
                    <h4 className="font-bold">Rubric</h4>
                    <ul className="flex flex-col gap-3">
                      {evaluation.rubric.map((r, i) => (
                        <li key={r.dimension} className="flex flex-col gap-2 rounded-2xl border border-rule p-3 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-semibold">{r.dimension}</span>
                              <span className="text-sm font-bold tabular-nums">{r.score} of 5</span>
                            </div>
                            <Bar value={r.score} label={`${r.dimension}: ${r.score} out of 5`} delay={i * 0.05} />
                            <span className="text-xs text-muted">Weight {r.weight}%</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {r.quote ? (
                              <p>
                                <span className="hl">&ldquo;{r.quote}&rdquo;</span>
                              </p>
                            ) : (
                              <p className="text-sm text-muted">Measured from the length of your answer.</p>
                            )}
                            <p className="text-sm">{r.comment}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <section className="rounded-2xl bg-hl-soft p-4">
                      <h4 className="flex items-center gap-2 font-bold text-hl-ink">
                        <ThumbsUp className="size-4" aria-hidden /> What worked
                      </h4>
                      <p className="pt-1">{evaluation.whatWorked}</p>
                    </section>
                    <section className="rounded-2xl bg-partial-soft p-4">
                      <h4 className="flex items-center gap-2 font-bold text-partial">
                        <Lightbulb className="size-4" aria-hidden /> What was missing
                      </h4>
                      <p className="pt-1">{evaluation.whatWasMissing}</p>
                    </section>
                  </div>

                  <section className="relative overflow-hidden rounded-2xl border border-hl-ink/40 bg-hl-soft p-4 glow">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-xl bg-hl text-on-hl">
                        <Sparkles className="size-4" aria-hidden />
                      </span>
                      <h4 className="font-bold">Model answer</h4>
                    </div>
                    <p className="pt-3 leading-relaxed">
                      <WithPlaceholders text={evaluation.modelAnswer} />
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-3">
                      <span className="text-sm font-semibold">Built from:</span>
                      {evaluation.modelAnswerSources.map((s) => (
                        <Chip key={s} className="border border-rule bg-surface text-ink">{s}</Chip>
                      ))}
                    </div>
                    <p className="pt-3 text-sm text-muted">
                      Written only from your resume and fact bank. Anything in [brackets] is a fact we don&apos;t have: add the real one, or leave it out.
                    </p>
                  </section>

                  <section className="flex flex-col gap-3">
                    {!retrying ? (
                      <div>
                        <Button onClick={() => setRetrying(true)}>
                          <RotateCcw className="size-4" aria-hidden /> Retry this question
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-bold">Retry this question</h4>
                        <label htmlFor={`retry-${question.id}`} className="sr-only">Your new answer</label>
                        <Textarea
                          id={`retry-${question.id}`}
                          value={retryText}
                          onChange={(e) => setRetryText(e.target.value)}
                          placeholder="Answer again, using what was missing above."
                          maxLength={3000}
                        />
                        <div>
                          <Button variant="primary" onClick={runRetry} disabled={!retryText.trim() || scoring || !job}>
                            {scoring ? "Scoring" : "Score my retry"}
                          </Button>
                        </div>
                        {scoring && <div className="shimmer h-2 rounded-full" aria-hidden />}
                      </>
                    )}
                    {retry && evaluation && (
                      <motion.div
                        initial={reduce ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-3 rounded-2xl border border-rule p-4"
                        aria-live="polite"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm text-muted">Before {evaluation.overall}, now</span>
                          <ScoreInline value={retry.overall} />
                          <motion.span
                            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.1 }}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-3 py-1 font-display text-lg font-bold",
                              delta >= 0 ? "bg-hl text-on-hl glow" : "bg-warn-soft text-warn",
                            )}
                          >
                            {delta >= 0 ? <ArrowUpRight className="size-5" aria-hidden /> : <ArrowDownRight className="size-5" aria-hidden />}
                            {delta > 0 ? `+${delta}` : delta}
                          </motion.span>
                        </div>
                        <ul className="flex flex-col gap-1 text-sm text-muted">
                          {retry.rubric.map((r) => (
                            <li key={r.dimension}>
                              {r.dimension}: {r.score} of 5. {r.comment}
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm text-muted">Your first attempt stays above. Retry scores are not added to the session score.</p>
                      </motion.div>
                    )}
                  </section>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function InterviewReport() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch, ready, jobById, atLimit } = useDemo();
  const session = state.interviews.find((s) => s.id === id);

  if (!session) {
    return ready ? (
      <EmptyState title="We couldn't find that report" body="It may have been reset with the demo data." action={<Link href="/app/interviews" className="font-semibold underline">Back to mock interviews</Link>} />
    ) : (
      <p className="py-16 text-center text-muted" role="status">Loading your report</p>
    );
  }
  if (session.status === "IN_PROGRESS") {
    return (
      <EmptyState
        title="This interview isn't finished"
        body="Finish the questions to get your report."
        action={<ButtonLink href={`/app/interviews/${session.id}`} variant="primary">Resume interview</ButtonLink>}
      />
    );
  }

  const job = jobById(session.jobId);
  const evals = session.evaluations;
  const dims = aggregate(evals);
  const strongest = dims[0];
  const weakest = dims[dims.length - 1];
  const overall = session.overall ?? (evals.length ? Math.round(evals.reduce((a, e) => a + e.overall, 0) / evals.length) : 0);
  const skipped = session.questions.length - evals.length;
  const prompted = session.answers.filter((a) => followUpLines(a).question.length > 0).length;
  const limited = atLimit("interviews");
  const band = bandFor(overall);

  const takeaways: string[] = [];
  if (strongest) takeaways.push(`Your strongest area was ${strongest.dimension.toLowerCase()} (${strongest.avg.toFixed(1)} of 5 on average).`);
  if (weakest && weakest !== strongest) takeaways.push(`Work on ${weakest.dimension.toLowerCase()} first. ${ADVICE[weakest.dimension] ?? ""}`.trim());
  if (prompted > 0) takeaways.push(`The interviewer had to prompt you on ${prompted} ${prompted === 1 ? "answer" : "answers"}. Try to include the result without being asked.`);
  else if (skipped > 0) takeaways.push(`You skipped ${skipped} ${skipped === 1 ? "question" : "questions"}. Skipped questions are not scored.`);

  const practiceAgain = () => {
    if (!job || limited) return;
    const next = createSession(
      { jobId: session.jobId, type: session.type, questionCount: session.questionCount, difficulty: session.difficulty, persona: session.persona },
      job,
      state.profile,
    );
    dispatch({ type: "SAVE_INTERVIEW", session: next });
    dispatch({ type: "INCREMENT_USAGE", key: "interviews" });
    router.push(`/app/interviews/${next.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={
          <Link href="/app/interviews" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> Mock interviews
          </Link>
        }
        title="Interview report"
        description={`${INTERVIEW_TYPE_LABEL[session.type]} practice${job ? ` for ${job.title} at ${job.company}` : ""}. Practice only: scores are feedback for you, not a prediction of any hiring decision.`}
        actions={
          <>
            <Button variant="primary" onClick={practiceAgain} disabled={!job || limited}>
              <RotateCcw className="size-4" aria-hidden /> Practice again
            </Button>
            {job && <ButtonLink href={`/app/jobs/${job.id}`}>Back to job</ButtonLink>}
          </>
        }
      />
      {limited && <p className="-mt-3 pb-4 text-sm text-muted">You have used all practice interviews on your plan, so Practice again is off.</p>}

      {evals.length === 0 ? (
        <EmptyState title="No answers to score" body="Every question was skipped. Start a new interview and answer at least one question." />
      ) : (
        <Stagger className="flex flex-col gap-6">
          <Item>
            <section className="card relative overflow-hidden p-5 sm:p-7">
              <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 size-72 rounded-full bg-hl opacity-15 blur-3xl" />
              <div className="relative grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
                <div className="flex flex-col items-center gap-3 md:items-start">
                  <RingScore value={overall} size={168} stroke={14} label="Overall interview score estimate" sublabel={band.word} />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">Overall</span>
                    <EstimateTag />
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted">
                    Average of {evals.length} scored {evals.length === 1 ? "answer" : "answers"}, each 1 to 5 per rubric dimension, weighted.
                    {skipped ? ` ${skipped} skipped.` : ""}
                  </p>
                  {strongest && weakest && (
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3 rounded-2xl bg-hl-soft p-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-hl text-on-hl"><TrendingUp className="size-5" aria-hidden /></span>
                        <div>
                          <dt className="text-sm text-muted">Strongest</dt>
                          <dd className="font-semibold">{strongest.dimension}</dd>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl bg-warn-soft p-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-warn">
                          {weakest === strongest ? <TriangleAlert className="size-5" aria-hidden /> : <TrendingDown className="size-5" aria-hidden />}
                        </span>
                        <div>
                          <dt className="text-sm text-muted">Weakest</dt>
                          <dd className="font-semibold">{weakest.dimension}</dd>
                        </div>
                      </div>
                    </dl>
                  )}
                  <ul className="flex list-disc flex-col gap-1 pl-5">
                    {takeaways.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-muted">We score what you said, not your accent or grammar.</p>
                </div>
              </div>
            </section>
          </Item>

          <Item>
            <section className="card p-5 sm:p-6" aria-labelledby="dims-h">
              <h2 id="dims-h" className="text-lg font-bold">Rubric breakdown</h2>
              <p className="pb-4 text-sm text-muted">Average per dimension across your scored answers, out of 5. Strongest first.</p>
              <ul className="flex flex-col gap-3">
                {dims.map((d, i) => (
                  <li key={d.dimension} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 sm:grid-cols-[10rem_1fr_3rem]">
                    <span className="text-sm font-semibold">{d.dimension}</span>
                    <Bar value={d.avg} label={`${d.dimension}: ${d.avg.toFixed(1)} out of 5`} delay={i * 0.06} />
                    <span className="text-right text-sm font-bold tabular-nums">{d.avg.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Item>

          <Item>
            <h2 className="pb-3 text-xl font-bold">Question by question</h2>
            <ul className="flex flex-col gap-3">
              {session.questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  index={i}
                  question={q}
                  session={session}
                  evaluation={evals.find((e) => e.questionId === q.id)}
                  job={job}
                  profile={state.profile}
                  defaultOpen={i === 0}
                />
              ))}
            </ul>
          </Item>
        </Stagger>
      )}
    </div>
  );
}

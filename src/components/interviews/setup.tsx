"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Clock, Lock, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, MatchChip } from "@/components/ui/chip";
import { Field, Select } from "@/components/ui/field";
import { Item, Stagger, useSkipMotion } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/panel";
import { useDemo } from "@/demo/store";
import { DIFFICULTY_LABEL, INTERVIEW_TYPE_LABEL, PERSONA_LABEL } from "@/demo/labels";
import type { Difficulty, InterviewType, Persona } from "@/demo/types";
import { cn } from "@/lib/cn";
import { buildQuestions, coverageFor, createSession, FOLLOW_UP_CAP, LENGTHS } from "./bank";
import { DIFF_ICON, PersonaTile, TYPE_ICON } from "./parts";

const TYPES = Object.keys(INTERVIEW_TYPE_LABEL) as InterviewType[];
const DIFFS = Object.keys(DIFFICULTY_LABEL) as Difficulty[];
const PERSONAS = Object.keys(PERSONA_LABEL) as Persona[];

const TYPE_BLURB: Record<InterviewType, string> = {
  BEHAVIORAL: "Stories from your past work",
  TECHNICAL: "Depth on the job's tools",
  MIXED: "A blend of both",
  HR: "Motivation and logistics",
};
const DIFF_BLURB: Record<Difficulty, string> = {
  EASY: "Gentle wording",
  STANDARD: "Typical interview",
  HARD: "Asks for trade-offs and numbers",
};
const MINUTES: Record<5 | 10 | 15, number> = { 5: 10, 10: 20, 15: 30 };

const isIn = <T extends string>(list: T[], v: string | null): v is T => !!v && (list as string[]).includes(v);

/** Large selectable radio card. The radio stays in the DOM (sr-only) for keyboard and screen readers. */
function OptionCard({
  name, checked, onChange, disabled, icon, title, hint,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <label
      className={cn(
        "card relative flex min-h-24 cursor-pointer flex-col gap-2 p-4 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hl-ink",
        checked ? "border-hl-ink bg-hl-soft glow" : "card-hover",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input type="radio" name={name} className="sr-only" checked={checked} disabled={disabled} onChange={onChange} />
      <div className="flex items-center justify-between">
        <span className={cn("grid size-10 place-items-center rounded-xl", checked ? "bg-hl text-on-hl" : "bg-sunken text-ink")}>{icon}</span>
        {checked && (
          <span className="grid size-6 place-items-center rounded-full bg-hl text-on-hl" aria-hidden>
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
        {disabled && <Lock className="size-4 text-muted" aria-hidden />}
      </div>
      <span className="font-semibold">{title}</span>
      {hint && <span className="-mt-1.5 text-sm text-muted">{hint}</span>}
    </label>
  );
}

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-lg font-bold">{title}</legend>
      {children}
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </fieldset>
  );
}

export function InterviewSetup() {
  const { state, dispatch, atLimit } = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useSkipMotion();
  const jobs = state.jobs.filter((j) => !j.archived);

  const qJob = params.get("job");
  const qType = params.get("type");
  const qDiff = params.get("difficulty");
  const qPersona = params.get("persona");
  const [jobId, setJobId] = useState(jobs.find((j) => j.id === qJob)?.id ?? jobs[0]?.id ?? "");
  const [type, setType] = useState<InterviewType>(isIn(TYPES, qType) ? qType : "BEHAVIORAL");
  const [count, setCount] = useState<5 | 10 | 15>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>(isIn(DIFFS, qDiff) ? qDiff : "STANDARD");
  const [persona, setPersona] = useState<Persona>(isIn(PERSONAS, qPersona) ? qPersona : "FRIENDLY_RECRUITER");

  const job = jobs.find((j) => j.id === jobId);
  const free = state.user.plan === "FREE";
  const limited = atLimit("interviews");
  const cfg = { jobId, type, questionCount: count, difficulty, persona };

  const coverage = useMemo(
    () => (job ? coverageFor(buildQuestions(cfg, job, state.profile), job) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [job, type, count, difficulty, state.profile],
  );

  const start = () => {
    if (!job || limited) return;
    const session = createSession(cfg, job, state.profile);
    dispatch({ type: "SAVE_INTERVIEW", session });
    dispatch({ type: "INCREMENT_USAGE", key: "interviews" });
    router.push(`/app/interviews/${session.id}`);
  };

  if (jobs.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Start a practice interview" description="Save a job first so the questions can be built from its requirements." />
        <Link href="/app/jobs" className="font-semibold underline">Go to jobs</Link>
      </div>
    );
  }

  const covered = coverage?.requirements.filter((r) => r.covered) ?? [];
  const skills = covered.slice(0, 4).map((r) => r.skill);
  const summary = `${count} questions, about ${MINUTES[count]} min, ${INTERVIEW_TYPE_LABEL[type].toLowerCase()}, ${DIFFICULTY_LABEL[difficulty].toLowerCase()}`;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={
          <Link href="/app/interviews" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> Mock interviews
          </Link>
        }
        title="Start a practice interview"
        description="Questions come from the job's requirements and your own resume."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <Stagger className="flex flex-col gap-6">
          <Item>
            <div className="card p-5">
              <Field label="Job" htmlFor="iv-job">
                <Select id="iv-job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}, {j.company}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Item>

          <Item>
            <Section title="Interview type">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TYPES.map((t) => {
                  const Icon = TYPE_ICON[t];
                  return (
                    <OptionCard
                      key={t}
                      name="iv-type"
                      checked={type === t}
                      onChange={() => setType(t)}
                      icon={<Icon className="size-5" aria-hidden />}
                      title={INTERVIEW_TYPE_LABEL[t]}
                      hint={TYPE_BLURB[t]}
                    />
                  );
                })}
              </div>
            </Section>
          </Item>

          <Item>
            <Section title="Length">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {LENGTHS.map((n) => (
                  <OptionCard
                    key={n}
                    name="iv-length"
                    checked={count === n}
                    onChange={() => setCount(n)}
                    disabled={n === 15 && free}
                    icon={<Clock className="size-5" aria-hidden />}
                    title={`${n} questions`}
                    hint={n === 15 ? (free ? "Pro, not on your plan" : "Pro, about 30 minutes") : `About ${MINUTES[n]} minutes`}
                  />
                ))}
              </div>
            </Section>
          </Item>

          <Item>
            <Section title="Difficulty">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {DIFFS.map((d) => {
                  const Icon = DIFF_ICON[d];
                  return (
                    <OptionCard
                      key={d}
                      name="iv-diff"
                      checked={difficulty === d}
                      onChange={() => setDifficulty(d)}
                      icon={<Icon className="size-5" aria-hidden />}
                      title={DIFFICULTY_LABEL[d]}
                      hint={DIFF_BLURB[d]}
                    />
                  );
                })}
              </div>
            </Section>
          </Item>

          <Item>
            <Section title="Interviewer" hint="The interviewer changes the wording. Scoring is identical for every interviewer.">
              <div className="grid gap-3 sm:grid-cols-2">
                {PERSONAS.map((p) => {
                  const on = persona === p;
                  return (
                    <label
                      key={p}
                      className={cn(
                        "card flex min-h-11 cursor-pointer items-center gap-3 p-4 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hl-ink",
                        on ? "border-hl-ink bg-hl-soft glow" : "card-hover",
                      )}
                    >
                      <input type="radio" name="iv-persona" className="sr-only" checked={on} onChange={() => setPersona(p)} />
                      <PersonaTile persona={p} size={48} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-semibold">{PERSONA_LABEL[p].name}</span>
                        <span className="text-sm text-muted">{PERSONA_LABEL[p].blurb}</span>
                      </span>
                      {on && (
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-hl text-on-hl" aria-hidden>
                          <Check className="size-4" strokeWidth={3} />
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </Section>
          </Item>

          {coverage && (
            <Item>
              <section className="card p-5">
                <h2 className="text-lg font-bold">What we&apos;ll cover</h2>
                <p className="pb-3 text-sm text-muted">
                  {covered.length} of {coverage.requirements.length} requirements of this job will be probed.
                  Up to {FOLLOW_UP_CAP[count]} follow-up questions if an answer is vague.
                </p>
                <ul className="flex flex-col gap-2">
                  {coverage.requirements.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <MatchChip value={r.matchClass} />
                      <span className="font-semibold">{r.skill}</span>
                      <span className="text-muted">
                        {r.covered ? (r.gap ? "gap question, asked respectfully" : "will be probed") : "not in this session"}
                      </span>
                    </li>
                  ))}
                </ul>
                {coverage.resumeItems.length > 0 && (
                  <p className="pt-3 text-sm">
                    <span className="font-semibold">From your resume: </span>
                    {coverage.resumeItems.join(", ")}
                  </p>
                )}
              </section>
            </Item>
          )}

          <Item>
            <div className="flex items-start gap-3 rounded-2xl border border-rule bg-sunken px-4 py-3 text-sm">
              <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p>
                <strong>This is practice. Don&apos;t use it during a real interview.</strong> Scores are estimates to help you improve, not a
                prediction of any hiring decision. We score what you said, not your accent or grammar.
              </p>
            </div>
          </Item>
        </Stagger>

        <aside className="lg:sticky lg:top-6" aria-label="Session summary">
          <div className="card relative overflow-hidden p-5">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-hl opacity-20 blur-3xl" />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <PersonaTile persona={persona} size={44} />
                <div className="flex flex-col">
                  <span className="text-sm text-muted">Your session</span>
                  <span className="font-semibold">{PERSONA_LABEL[persona].name}</span>
                </div>
              </div>

              <div aria-live="polite" className="flex flex-col gap-1">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={summary}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="font-display text-2xl font-bold leading-snug"
                  >
                    {count} questions, about {MINUTES[count]} min
                  </motion.p>
                </AnimatePresence>
                <p className="text-sm text-muted">
                  {INTERVIEW_TYPE_LABEL[type]} interview, {DIFFICULTY_LABEL[difficulty].toLowerCase()} difficulty.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Covers</span>
                <ul className="flex flex-wrap gap-1.5" aria-label="Skills covered">
                  <AnimatePresence initial={false}>
                    {skills.map((s) => (
                      <motion.li
                        key={s}
                        layout={!reduce}
                        initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.18 }}
                      >
                        <Chip className="bg-hl-soft text-hl-ink">{s}</Chip>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  {covered.length > skills.length && <li><Chip className="border border-rule text-muted">+{covered.length - skills.length} more</Chip></li>}
                  {covered.length === 0 && <li className="text-sm text-muted">General questions</li>}
                </ul>
              </div>

              {limited && (
                <p className="text-sm text-warn">You have used all {state.limits.interviews} practice interviews on your plan this month.</p>
              )}
              <Button variant="primary" size="lg" onClick={start} disabled={!job || limited} className="w-full">
                <Play className="size-5" aria-hidden /> Start interview
              </Button>
              <p className="sr-only">{summary}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

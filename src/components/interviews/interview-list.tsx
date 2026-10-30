"use client";

import Link from "next/link";
import { Award, CalendarCheck, ChevronRight, Mic, Sparkles, Target, TrendingUp } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { RingScore, Sparkline } from "@/components/ui/charts";
import { Item, Stagger } from "@/components/ui/motion";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { useDemo } from "@/demo/store";
import { DIFFICULTY_LABEL, INTERVIEW_TYPE_LABEL } from "@/demo/labels";
import { formatDate, relativeDay } from "@/lib/dates";
import { PersonaTile, TYPE_ICON } from "./parts";
import { summarize } from "./stats";

export function InterviewList() {
  const { state, jobById, atLimit } = useDemo();
  const sessions = [...state.interviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const stats = summarize(sessions);
  const trend = [...stats.done]
    .reverse()
    .map((s) => ({ label: `${jobById(s.jobId)?.company ?? "Session"}, ${formatDate(s.createdAt)}`, value: s.overall as number }));
  const limited = atLimit("interviews");
  const delta = trend.length > 1 ? trend[trend.length - 1].value - trend[0].value : 0;

  const cta = limited ? (
    <Button variant="primary" size="lg" disabled>Start a practice interview</Button>
  ) : (
    <ButtonLink href="/demo/interviews/new" variant="primary" size="lg">
      <Mic className="size-5" aria-hidden /> Start a practice interview
    </ButtonLink>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Mock interviews"
        description="Practice with questions built from a job's requirements and your own resume. This is practice. Don't use it during a real interview."
      />

      <Stagger className="flex flex-col gap-5">
        <Item>
          <section className="card relative overflow-hidden p-6 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-hl opacity-20 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="flex max-w-xl items-start gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-hl text-on-hl glow">
                  <Sparkles className="size-7" aria-hidden />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-2xl font-bold">Start a practice interview</h2>
                  <p className="text-muted">
                    Pick a saved job, choose the style and interviewer, and get a scored report with model answers built from your real experience.
                  </p>
                </div>
              </div>
              {cta}
            </div>
            {limited && (
              <p className="relative mt-4 rounded-xl bg-sunken px-4 py-3 text-sm">
                You have used all {state.limits.interviews} practice interviews on your plan. Review a past report below, or upgrade to practice more.
              </p>
            )}
          </section>
        </Item>

        {sessions.length === 0 ? (
          <Item>
            <EmptyState
              icon={
                <span className="grid size-16 place-items-center rounded-2xl bg-hl-soft text-hl-ink">
                  <Mic className="size-8" aria-hidden />
                </span>
              }
              title="No practice interviews yet"
              body="Pick a saved job and we will ask questions based on what it requires and what is on your resume. You get a report with model answers built from your real experience."
              action={limited ? undefined : <ButtonLink href="/demo/interviews/new" variant="primary">Start a practice interview</ButtonLink>}
            />
          </Item>
        ) : (
          <>
            <Item>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={CalendarCheck} label="Sessions done" value={stats.done.length} footnote={`${sessions.length} started in total`} />
                <StatCard
                  icon={Target}
                  label="Average score"
                  value={stats.avg}
                  footnote="Estimate across completed sessions"
                  emphasis
                  trend={trend.length > 1 ? trend : undefined}
                />
                <div className="card card-hover flex flex-col p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-hl-soft text-hl-ink">
                    <Award className="size-5" aria-hidden />
                  </span>
                  <span className="mt-4 text-sm font-semibold text-muted">Best dimension</span>
                  <span className="break-words font-display text-2xl font-bold leading-tight">{stats.best?.dimension ?? "Not yet"}</span>
                  <p className="mt-1 text-xs text-muted">
                    {stats.best ? `${stats.best.avg.toFixed(1)} of 5 on average` : "Complete a session to see it"}
                  </p>
                </div>
                <StatCard
                  icon={TrendingUp}
                  label="Practice streak"
                  value={stats.streak}
                  suffix={stats.streak === 1 ? " day" : " days"}
                  footnote={stats.lastDay ? `Last practiced ${relativeDay(stats.lastDay)}` : "No sessions yet"}
                />
              </div>
            </Item>

            <Item>
              <section className="card p-5 sm:p-6" aria-labelledby="trend-h">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="trend-h" className="text-lg font-bold">Score trend</h2>
                    <p className="text-sm text-muted">Overall score per completed session, oldest to newest. Estimates only.</p>
                  </div>
                  {trend.length > 1 && (
                    <Chip className={delta >= 0 ? "bg-hl-soft text-hl-ink" : "bg-warn-soft text-warn"}>
                      {delta >= 0 ? "Up" : "Down"} {Math.abs(delta)} points since the first
                    </Chip>
                  )}
                </div>
                {trend.length > 1 ? (
                  <Sparkline data={trend} label="Interview score trend" height={120} className="mt-4" />
                ) : (
                  <p className="pt-3 text-sm text-muted">
                    {trend.length === 1
                      ? `Your first completed session scored ${trend[0].value} (estimate). The trend appears after a second one.`
                      : "Complete a session to start your trend."}
                  </p>
                )}
              </section>
            </Item>

            <Item>
              <h2 className="pb-3 text-lg font-bold">Your sessions</h2>
              <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {sessions.map((s) => {
                  const job = jobById(s.jobId);
                  const answered = s.answers.filter((a) => a.answer.trim()).length;
                  const href = s.status === "IN_PROGRESS" ? `/demo/interviews/${s.id}` : `/demo/interviews/${s.id}/report`;
                  const TypeIcon = TYPE_ICON[s.type];
                  return (
                    <li key={s.id} className="min-w-0">
                      <Link href={href} className="card card-hover flex h-full items-center gap-4 p-4">
                        <PersonaTile persona={s.persona} size={52} />
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span className="truncate font-semibold">{job ? `${job.title}, ${job.company}` : "Practice interview"}</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Chip className="bg-sunken text-ink">
                              <TypeIcon className="size-3.5" aria-hidden /> {INTERVIEW_TYPE_LABEL[s.type]}
                            </Chip>
                            <Chip className="border border-rule text-muted">{DIFFICULTY_LABEL[s.difficulty]}</Chip>
                            {s.status === "IN_PROGRESS" && <Chip className="bg-partial-soft text-partial">In progress</Chip>}
                            {s.status === "ABANDONED" && <Chip className="border border-rule text-muted">Ended early</Chip>}
                          </div>
                          <span className="text-sm text-muted">
                            {formatDate(s.createdAt)}. {answered} of {s.questions.length} answered.
                          </span>
                        </div>
                        {s.status === "COMPLETED" && typeof s.overall === "number" ? (
                          <RingScore value={s.overall} size={64} stroke={7} label="Overall score estimate" />
                        ) : (
                          <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Item>
          </>
        )}
      </Stagger>
    </div>
  );
}

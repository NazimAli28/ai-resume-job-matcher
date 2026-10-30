"use client";

import { Mic, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { RingScore, Sparkline } from "@/components/ui/charts";
import { EstimateTag } from "@/components/ui/chip";
import { bandFor } from "@/components/ui/score";
import { formatDate, relativeDay } from "@/lib/dates";
import { INTERVIEW_TYPE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import { completedSessions, dimensions, nextInterview } from "./logic";
import { CardHeader, linkClass } from "./ui";

export function InterviewReadinessCard() {
  const { state, jobById } = useDemo();
  const sessions = completedSessions(state.interviews);
  const last = sessions[sessions.length - 1];
  const upcoming = nextInterview(state.applications);
  const practiceHref = upcoming ? `/demo/interviews/new?job=${upcoming.app.jobId}` : "/demo/interviews/new";
  const practiceLabel = upcoming ? `Practice for ${upcoming.app.company}` : "Start a mock interview";

  if (!last || last.overall === undefined) {
    return (
      <section aria-labelledby="ir-title" className="card flex h-full flex-col gap-4 p-5 sm:p-6">
        <CardHeader icon={Mic} id="ir-title" title="Interview readiness" />
        <p className="text-muted">You have not practiced yet. A 5-question session takes about 10 minutes and ends with a scored report.</p>
        <div className="mt-auto"><ButtonLink href={practiceHref} variant="primary">{practiceLabel}</ButtonLink></div>
      </section>
    );
  }

  const job = jobById(last.jobId);
  const dims = dimensions(last);
  const strongest = dims[0];
  const weakest = dims[dims.length - 1];
  const trend = sessions.map((s) => ({ label: formatDate(s.createdAt), value: s.overall ?? 0 }));

  return (
    <section aria-labelledby="ir-title" className="card flex h-full flex-col gap-5 p-5 sm:p-6">
      <CardHeader
        icon={Mic}
        id="ir-title"
        title="Interview readiness"
        sub={`Last practice ${formatDate(last.createdAt)}${job ? `, ${job.company}` : ""}`}
        action={<EstimateTag />}
      />
      <div className="flex items-center gap-4">
        <RingScore value={last.overall} size={96} stroke={9} label="Last practice score estimate" sublabel={bandFor(last.overall).word} />
        <div className="flex min-w-0 flex-col gap-1 text-sm">
          <p className="font-semibold">{INTERVIEW_TYPE_LABEL[last.type]}, {last.questionCount} questions</p>
          {strongest && (
            <p className="flex items-center gap-1.5">
              <TrendingUp className="size-4 shrink-0 text-hl-ink" aria-hidden />
              <span className="text-muted">Strongest:</span>
              <span className="truncate font-semibold">{strongest.dimension}</span>
              <span className="tabular-nums text-muted">{strongest.avg.toFixed(1)}/5</span>
            </p>
          )}
          {weakest && weakest !== strongest && (
            <p className="flex items-center gap-1.5">
              <TrendingDown className="size-4 shrink-0 text-warn" aria-hidden />
              <span className="text-muted">Work on:</span>
              <span className="truncate font-semibold">{weakest.dimension}</span>
              <span className="tabular-nums text-muted">{weakest.avg.toFixed(1)}/5</span>
            </p>
          )}
        </div>
      </div>
      {trend.length > 1 ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted">Score across {trend.length} sessions</p>
          <Sparkline data={trend} label="Practice score by session" height={40} />
        </div>
      ) : (
        <p className="rounded-xl bg-sunken/70 px-3 py-2.5 text-sm text-muted">Your trend line appears after your second session.</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        <ButtonLink href={practiceHref} variant="primary" size="sm">
          {practiceLabel}
        </ButtonLink>
        <Link href={`/demo/interviews/${last.id}/report`} className={linkClass}>
          See the report
        </Link>
      </div>
      {upcoming && (
        <p className="-mt-2 text-xs text-muted">
          {upcoming.app.company} round {relativeDay(upcoming.round.at)}, {formatDate(upcoming.round.at)}
        </p>
      )}
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/profile-real/section-card";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/server/auth/user";
import { listSessions } from "@/server/interview/service";
import { usageFor } from "@/server/usage/service";

export const metadata: Metadata = { title: "Mock interviews" };

const TYPE: Record<string, string> = { BEHAVIORAL: "Behavioral", TECHNICAL: "Technical", MIXED: "Mixed", HR: "HR" };
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });

export default async function InterviewsPage() {
  const user = await requireUser();
  const [sessions, quota] = await Promise.all([listSessions(user.id), usageFor(user.id, "MOCK_INTERVIEW")]);
  const scored = sessions.filter((s) => s.overall !== null).reverse();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[32px] font-bold leading-tight">Mock interviews</h1>
          <p className="text-sm text-muted">Practice only. Scores are feedback for you, not a prediction of any hiring decision. Don&apos;t use this during a real interview.</p>
        </div>
        <ButtonLink href="/app/interviews/new" variant="primary">New practice interview</ButtonLink>
      </div>
      <p className="text-sm text-muted">{quota.used} of {quota.limit} scored sessions used this month. A session counts only once its first answer is scored.</p>

      {scored.length > 1 && (
        <SectionCard id="trend" title="Your progress" intro="Overall score (estimate) of each finished session, oldest first. Compared only with yourself.">
          <ol className="flex flex-wrap items-end gap-2" aria-label="Scores over time">
            {scored.map((s) => (
              <li key={s.id} className="flex flex-col items-center gap-1 text-[13px]">
                <span className="w-8 rounded-t-md bg-viz" style={{ height: `${Math.max(6, s.overall! * 1.2)}px` }} aria-hidden />
                <span className="font-semibold tabular-nums">{s.overall}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      <SectionCard id="sessions" title="Sessions">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">No sessions yet. Start one from a job, or practice for a role in general.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-rule">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <Link href={s.status === "COMPLETED" ? `/app/interviews/${s.id}/report` : `/app/interviews/${s.id}`} className="flex min-w-0 flex-col hover:underline">
                  <span className="break-words font-semibold">{s.job ? `${s.job.title}${s.job.company ? `, ${s.job.company}` : ""}` : s.targetRole ?? "General practice"}</span>
                  <span className="text-[13px] text-muted">{TYPE[s.type]} · {s.questionCount} questions · {fmt(s.createdAt)}</span>
                </Link>
                <span className="text-sm font-semibold tabular-nums">
                  {s.status === "COMPLETED" ? (s.overall !== null ? `${s.overall} (estimate)` : "Not scored") : s.status === "ACTIVE" ? "In progress" : "Closed"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

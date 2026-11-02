import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/profile-real/section-card";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/server/auth/user";
import { band } from "@/server/match/engine";
import { JOB_SOURCES } from "@/server/match/schemas";
import { listJobs } from "@/server/match/service";

export const metadata: Metadata = { title: "Jobs" };

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const sourceLabel = (k: string) => JOB_SOURCES.find(([s]) => s === k)?.[1] ?? "Other";

export default async function JobsPage() {
  const user = await requireUser();
  const jobs = await listJobs(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[32px] font-bold leading-tight">Jobs</h1>
          <p className="text-muted">Every post you&apos;ve compared with your resume. Scores are estimates, not hiring predictions.</p>
        </div>
        <ButtonLink href="/app/jobs/new" variant="primary">
          <Plus className="size-4" aria-hidden /> Match a job
        </ButtonLink>
      </div>

      {jobs.length === 0 ? (
        <SectionCard id="empty" title="No jobs yet" intro="Paste a job post to see how your resume compares and what to fix first.">
          <div>
            <ButtonLink href="/app/jobs/new" variant="primary">Match your first job</ButtonLink>
          </div>
        </SectionCard>
      ) : (
        <ul className="flex flex-col gap-3">
          {jobs.map((j) => {
            const score = j.matches[0]?.score;
            return (
              <li key={j.id}>
                <Link href={`/app/jobs/${j.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-rule-strong">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="break-words font-semibold">{j.title}</span>
                    <span className="break-words text-sm text-muted">
                      {[j.company, j.location, sourceLabel(j.source), fmt(j.createdAt)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {score !== undefined && (
                    <span className="rounded-full bg-sunken px-3 py-1 text-sm font-semibold tabular-nums">
                      {score} · {band(score)} <span className="font-normal text-muted">estimate</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

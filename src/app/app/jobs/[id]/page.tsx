import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddRequirement, DeleteJob, ResumePicker } from "@/components/jobs-real/job-controls";
import { RequirementRow } from "@/components/jobs-real/requirement-row";
import { SectionCard } from "@/components/profile-real/section-card";
import { ButtonLink } from "@/components/ui/button";
import { RingScore } from "@/components/ui/charts";
import { requireUser } from "@/server/auth/user";
import { db } from "@/server/db";
import { band, nextSteps, summaryLine, type Factor, type MatchClass, type MatchItem, type MatchResult } from "@/server/match/engine";
import { getJobView } from "@/server/match/service";

export const metadata: Metadata = { title: "Job match" };

const GROUPS: { cls: MatchClass; title: string; intro: string }[] = [
  { cls: "MISSING", title: "Missing", intro: "Not on your resume. If you do have one of these, tell us. If not, that's useful to know too." },
  { cls: "PARTIAL", title: "Partly shown", intro: "Mentioned, but not backed by your work yet." },
  { cls: "UNKNOWN", title: "Unclear", intro: "A resume can't prove these, so they aren't in the score." },
  { cls: "STRONG", title: "Shown", intro: "Backed by something on your resume or in your evidence bank." },
];

export default async function JobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ resume?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { resume } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const view = await getJobView(user.id, id, typeof resume === "string" && /^[0-9a-f-]{36}$/i.test(resume) ? resume : undefined);
  if (!view) notFound();
  const { job, versions, match, previous, resumeVersionId } = view;
  const tracked = await db.application.findFirst({ where: { userId: user.id, jobId: job.id }, select: { id: true } });

  const items = (match?.items ?? []) as unknown as MatchItem[];
  const factors = (match?.factors ?? []) as unknown as Factor[];
  const result = match ? ({ items, factors, score: match.score, raw: match.score, lowConfidence: match.lowConfidence, engineVersion: match.engineVersion } satisfies MatchResult) : null;
  const delta = match && previous ? match.score - previous.score : 0;
  const steps = result ? nextSteps(result) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/jobs" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">
          Back to jobs
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="break-words font-display text-[32px] font-bold leading-tight">{job.title}</h1>
            <p className="break-words text-sm text-muted">{[job.company, job.location].filter(Boolean).join(" · ") || "Company not stated"}</p>
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
                Open the post <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {tracked ? (
              <ButtonLink href={`/app/applications/${tracked.id}`} size="sm">Open in tracker</ButtonLink>
            ) : (
              <ButtonLink href={`/app/applications/new?job=${job.id}${resumeVersionId ? `&resume=${resumeVersionId}` : ""}`} size="sm" variant="primary">Track this application</ButtonLink>
            )}
            <DeleteJob jobId={job.id} />
          </div>
        </div>
      </div>

      {job.injectionSuspect && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          This post contains text aimed at software or AI rather than at people. We treated it as plain text and it can&apos;t change your score, but be careful with this listing.
        </p>
      )}

      {!match || !result || !resumeVersionId ? (
        <SectionCard id="no-resume" title="Upload a resume to see your match" intro="The resume this job was compared with has been deleted.">
          <div>
            <ButtonLink href="/app/resumes" variant="primary">Go to resumes</ButtonLink>
          </div>
        </SectionCard>
      ) : (
        <>
          <section className="card flex flex-col gap-5 p-6" aria-labelledby="fit-h">
            <div className="flex flex-wrap items-center gap-5">
              <RingScore value={match.score} label="Job match (estimate)" sublabel="estimate" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 id="fit-h" className="font-display text-lg font-bold">
                  {band(match.score)} fit (estimate)
                  {delta !== 0 && (
                    <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-[13px] font-semibold tabular-nums">
                      {delta > 0 ? "+" : ""}
                      {delta} since your last change
                    </span>
                  )}
                </h2>
                <p className="text-sm">{summaryLine(result)}</p>
                {match.cap !== null && <p className="text-sm text-muted">A required item is missing, so this estimate is capped at {match.cap}.</p>}
                {match.lowConfidence && <p className="text-sm text-muted">Low confidence: few requirements could be checked. Add or edit them below.</p>}
                <p className="text-[13px] text-muted">A fit estimate to guide your preparation, not a hiring prediction.</p>
              </div>
              <div className="w-full sm:w-64">
                <ResumePicker jobId={job.id} value={resumeVersionId} versions={versions} />
              </div>
            </div>
          </section>

          {steps.length > 0 && (
            <SectionCard id="next" title="What to do next">
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
                {steps.map((s) => (
                  <li key={s} className="break-words">{s}</li>
                ))}
              </ol>
            </SectionCard>
          )}

          {GROUPS.map((g) => {
            const list = items.filter((i) => i.cls === g.cls);
            if (!list.length) return null;
            return (
              <SectionCard key={g.cls} id={`group-${g.cls}`} title={`${g.title} (${list.length})`} intro={g.intro}>
                <ul className="flex flex-col gap-3">
                  {list.map((i) => (
                    <RequirementRow key={`${i.requirementId}:${i.text}:${i.priority}`} item={i} />
                  ))}
                </ul>
              </SectionCard>
            );
          })}

          <SectionCard id="add" title="Requirements" intro="We read these from the post. Fix anything we got wrong and the estimate updates.">
            <AddRequirement jobId={job.id} />
          </SectionCard>

          <SectionCard id="how" title="How this estimate was calculated" intro="Calculated by code from the table below. AI only reads the post; it never sets a number.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-rule text-left text-muted">
                    <th scope="col" className="py-2 pr-3 font-semibold">Factor</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Your value</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Weight</th>
                    <th scope="col" className="py-2 text-right font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {factors.map((f) => (
                    <tr key={f.key} className="border-b border-rule align-top last:border-0">
                      <th scope="row" className="py-2 pr-3 text-left font-normal">
                        <span className="font-semibold">{f.label}</span>
                        <span className="block text-[13px] text-muted">{f.explanation}</span>
                      </th>
                      <td className="py-2 pr-3 text-right tabular-nums">{f.value}%</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{f.weight}</td>
                      <td className="py-2 text-right tabular-nums">{((f.weight * f.value) / 100).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      <details className="card p-6">
        <summary className="flex min-h-11 cursor-pointer items-center font-display text-lg font-bold">The original post</summary>
        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-sunken p-4 text-[13px]" tabIndex={0} aria-label="Original job post">
          {job.rawText}
        </pre>
      </details>
    </div>
  );
}

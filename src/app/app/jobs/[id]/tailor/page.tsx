import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/profile-real/section-card";
import { ResumePicker } from "@/components/jobs-real/job-controls";
import { ResumePreview } from "@/components/tailor/resume-preview";
import { BulkBar, GenerateButton, SuggestionList } from "@/components/tailor/tailor-board";
import { requireUser } from "@/server/auth/user";
import { db } from "@/server/db";
import type { ResumeDoc } from "@/server/resume/types";
import { applySuggestions, type GuardStats, type Suggestion } from "@/server/tailor/core";
import { getSession } from "@/server/tailor/service";
import { usageFor } from "@/server/usage/service";

export const metadata: Metadata = { title: "Improve my resume" };
// Generating suggestions can take up to a minute or two.
export const maxDuration = 120;

const isUuid = (s?: string) => !!s && /^[0-9a-f-]{36}$/i.test(s);

export default async function TailorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ resume?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { resume } = await searchParams;
  if (!isUuid(id)) notFound();
  const job = await db.job.findFirst({ where: { id, userId: user.id }, select: { id: true, title: true, company: true } });
  if (!job) notFound();
  const versions = await db.resumeVersion.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, label: true, name: true, content: true } });
  const lastUsed = await db.jobMatch.findFirst({ where: { userId: user.id, jobId: id }, orderBy: { createdAt: "desc" }, select: { resumeVersionId: true } });
  const pick = [isUuid(resume) ? resume : undefined, lastUsed?.resumeVersionId, versions[0]?.id].find((v) => v && versions.some((x) => x.id === v));
  const version = versions.find((v) => v.id === pick);

  const back = (
    <Link href={`/app/jobs/${job.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">
      Back to the job
    </Link>
  );
  if (!version) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <SectionCard id="none" title="Upload a resume first" intro="Suggestions are made from your own resume, so we need one to start.">
          <Link href="/app/resumes" className="font-semibold underline underline-offset-4">Go to resumes</Link>
        </SectionCard>
      </div>
    );
  }

  const [session, quota] = await Promise.all([getSession(user.id, job.id, version.id), usageFor(user.id, "TAILORED_VERSION")]);
  const suggestions = (session?.suggestions ?? []) as unknown as Suggestion[];
  const stats = session?.stats as unknown as (GuardStats & { aiFailed?: boolean }) | undefined;
  const { doc: preview, changes } = applySuggestions(version.content as unknown as ResumeDoc, suggestions);
  const pending = suggestions.filter((s) => s.status === "PENDING");
  const ready = pending.filter((s) => s.after && s.kind !== "QUESTION" && s.kind !== "GAP_QUESTION").length;
  const questions = pending.filter((s) => s.kind === "QUESTION" || s.kind === "GAP_QUESTION").length;
  const accepted = suggestions.filter((s) => s.status === "APPLIED" && s.after).length;
  const blocked = stats ? Object.values(stats.blocked).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {back}
        <h1 className="break-words font-display text-[32px] font-bold leading-tight">Improve my resume for {job.title}</h1>
        <p className="text-sm text-muted">
          Every suggestion comes from your own resume and the facts you&apos;ve confirmed. Anything new, like a figure or a skill, is asked, never added for you.
        </p>
      </div>

      <section className="card flex flex-col gap-4 p-5" aria-label="Setup">
        <div className="w-full sm:w-80">
          <ResumePicker jobId={job.id} value={version.id} versions={versions.map((v) => ({ id: v.id, label: v.label, name: v.name }))} basePath={`/app/jobs/${job.id}/tailor`} />
        </div>
        {!session ? (
          <>
            <p className="text-sm">
              Uses 1 of your {quota.limit} tailored resumes this month ({quota.used} used). Refreshing within 24 hours is free.
            </p>
            <GenerateButton jobId={job.id} versionId={version.id} />
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">
              {ready} ready to use, {questions} need your input, {accepted} accepted.
            </p>
            {stats?.aiFailed && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">The AI part didn&apos;t answer this time, so these are only the suggestions our own rules can make. Try refreshing later. This didn&apos;t use your quota.</p>}
            {blocked > 0 && <p className="text-[13px] text-muted">Our fact check removed {blocked} AI suggestion{blocked === 1 ? "" : "s"} that said something your resume doesn&apos;t.</p>}
            <BulkBar jobId={job.id} sessionId={session.id} ready={ready} accepted={accepted} />
            <GenerateButton jobId={job.id} versionId={version.id} again />
          </>
        )}
      </section>

      {session && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard id="suggestions" title="Suggestions" intro="Accept what's right, edit wording to your own, and answer questions only with what's true.">
            {suggestions.length ? <SuggestionList suggestions={suggestions} jobId={job.id} sessionId={session.id} /> : <p className="text-sm text-muted">No changes to suggest: this resume already reads well for this job.</p>}
          </SectionCard>
          <SectionCard id="preview" title="Preview" intro={changes.length ? `${changes.length} change${changes.length === 1 ? "" : "s"} accepted so far.` : "Accepted changes show here."}>
            <ResumePreview doc={preview} changed={new Set(changes.map((c) => c.targetId))} />
          </SectionCard>
        </div>
      )}
    </div>
  );
}

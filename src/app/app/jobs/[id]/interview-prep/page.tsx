import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrepButton } from "@/components/interview/interview-ui";
import { SectionCard } from "@/components/profile-real/section-card";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/server/auth/user";
import { db } from "@/server/db";
import { getPrep, type PrepQuestion } from "@/server/interview/service";

export const metadata: Metadata = { title: "Interview prep" };
export const maxDuration = 120;

const GROUPS: { key: PrepQuestion["group"]; title: string }[] = [
  { key: "TECHNICAL", title: "Technical" },
  { key: "BEHAVIORAL", title: "Behavioral" },
  { key: "HR_SITUATIONAL", title: "HR and situational" },
  { key: "CANDIDATE_SPECIFIC", title: "About your resume" },
];

export default async function PrepPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const job = await db.job.findFirst({ where: { id, userId: user.id }, select: { id: true, title: true } });
  if (!job) notFound();
  const [prep, lastUsed] = await Promise.all([getPrep(user.id, job.id), db.jobMatch.findFirst({ where: { userId: user.id, jobId: id }, orderBy: { createdAt: "desc" }, select: { resumeVersionId: true } })]);
  const questions = (prep?.questions as unknown as PrepQuestion[] | undefined) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={`/app/jobs/${job.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">Back to the job</Link>
        <h1 className="break-words font-display text-[32px] font-bold leading-tight">Interview prep: {job.title}</h1>
        <p className="text-sm text-muted">Questions you&apos;re likely to be asked, with how to shape your answer. Hints point only to your own experience; where you don&apos;t have a match, you get a template instead.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <PrepButton jobId={job.id} versionId={prep?.resumeVersionId ?? lastUsed?.resumeVersionId ?? null} again={!!prep} />
        <ButtonLink href={`/app/interviews/new?job=${job.id}`}>Practice out loud in a mock interview</ButtonLink>
      </div>
      {GROUPS.map((g) => {
        const list = questions.filter((q) => q.group === g.key);
        if (!list.length) return null;
        return (
          <SectionCard key={g.key} id={`prep-${g.key}`} title={`${g.title} (${list.length})`}>
            <ol className="flex flex-col gap-4">
              {list.map((q, i) => (
                <li key={i} className="flex flex-col gap-1.5 border-b border-rule pb-4 last:border-0 last:pb-0">
                  <p className="break-words font-semibold">{q.question}</p>
                  {q.gap && <p className="w-fit rounded-full bg-warn-soft px-2 py-0.5 text-[13px] font-semibold text-warn">Probes a gap: {q.gap}. Be ready to address it honestly.</p>}
                  <p className="text-sm text-muted"><span className="font-semibold">Why they ask: </span>{q.whyAsked}</p>
                  <p className="text-sm"><span className="font-semibold">How to answer: </span>{q.structure}</p>
                  <p className="text-sm"><span className="font-semibold">{q.hintFromYou ? "From your experience: " : "Hint: "}</span>{q.hint}</p>
                </li>
              ))}
            </ol>
          </SectionCard>
        );
      })}
    </div>
  );
}

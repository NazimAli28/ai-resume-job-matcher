import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormAlert } from "@/components/auth/auth-ui";
import { LetterEditor, LetterOptions } from "@/components/cover-letter/letter-editor";
import { SectionCard } from "@/components/profile-real/section-card";
import { requireUser } from "@/server/auth/user";
import { getLetter } from "@/server/cover-letter/service";
import { db } from "@/server/db";
import { usageFor } from "@/server/usage/service";

export const metadata: Metadata = { title: "Cover letter" };
export const maxDuration = 120;

export default async function CoverLetterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ export?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const job = await db.job.findFirst({ where: { id, userId: user.id }, select: { id: true, title: true, company: true } });
  if (!job) notFound();
  const [versions, letter, quota, lastUsed] = await Promise.all([
    db.resumeVersion.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, label: true, name: true } }),
    getLetter(user.id, job.id),
    usageFor(user.id, "COVER_LETTER"),
    db.jobMatch.findFirst({ where: { userId: user.id, jobId: id }, orderBy: { createdAt: "desc" }, select: { resumeVersionId: true } }),
  ]);
  const defaultVersion = [letter?.resumeVersionId, lastUsed?.resumeVersionId, versions[0]?.id].find((v) => v && versions.some((x) => x.id === v));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={`/app/jobs/${job.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">Back to the job</Link>
        <h1 className="break-words font-display text-[32px] font-bold leading-tight">Cover letter for {job.title}</h1>
        <p className="text-sm text-muted">
          A first draft from your own resume and facts. Our fact check removes any sentence that says something about you, or about {job.company ?? "the company"}, that we can&apos;t trace back to you or the job post.
        </p>
      </div>
      {sp.export === "placeholders" && <FormAlert>Fill in or remove the bracketed parts, like [X], before downloading.</FormAlert>}

      {!defaultVersion ? (
        <SectionCard id="none" title="Upload a resume first" intro="The letter is written from your own resume.">
          <Link href="/app/resumes" className="font-semibold underline underline-offset-4">Go to resumes</Link>
        </SectionCard>
      ) : (
        <>
          <SectionCard id="options" title={letter ? "Options" : "Write a draft"} intro={letter ? undefined : `Uses 1 of your ${quota.limit} cover letters this month (${quota.used} used). New drafts for this job within 24 hours are free.`}>
            <LetterOptions
              jobId={job.id}
              versions={versions}
              hasLetter={!!letter}
              initial={{ resumeVersionId: defaultVersion, length: letter?.length ?? "MEDIUM", tone: letter?.tone ?? "PROFESSIONAL", recipient: letter?.recipient ?? "", notes: letter?.notes ?? "" }}
            />
          </SectionCard>
          {letter && (
            <SectionCard id="letter" title="Your letter" intro={letter.droppedCount ? `Our fact check removed ${letter.droppedCount} sentence${letter.droppedCount === 1 ? "" : "s"} the AI couldn't support. Edit freely: these are your words now.` : "Edit freely: these are your words now."}>
              <LetterEditor jobId={job.id} letterId={letter.id} initialText={letter.text} initialRecipient={letter.recipient ?? ""} history={(letter.history as { text: string; savedAt: string }[] | null) ?? []} />
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

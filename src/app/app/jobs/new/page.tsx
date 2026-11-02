import type { Metadata } from "next";
import Link from "next/link";
import { NewJobForm } from "@/components/jobs-real/new-job-form";
import { SectionCard } from "@/components/profile-real/section-card";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/server/auth/user";
import { JD_MAX, JD_MIN, JOB_SOURCES } from "@/server/match/schemas";
import { listVersions } from "@/server/resume/service";

export const metadata: Metadata = { title: "Match a job" };
// Reading the post can take a while; the default limit may be too short.
export const maxDuration = 60;

export default async function NewJobPage() {
  const user = await requireUser();
  const versions = (await listVersions(user.id)).map((v) => ({ id: v.id, label: v.label, name: v.name }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/jobs" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">
          Back to jobs
        </Link>
        <h1 className="font-display text-[32px] font-bold leading-tight">Match a job</h1>
        <p className="max-w-2xl text-muted">Pick a resume and paste the post. You&apos;ll see what you already show, what&apos;s missing, and we&apos;ll ask about the rest.</p>
      </div>
      {versions.length === 0 ? (
        <SectionCard id="no-resume" title="Upload a resume first" intro="A match compares a job with a resume, so you'll need one here.">
          <div>
            <ButtonLink href="/app/resumes" variant="primary">Go to resumes</ButtonLink>
          </div>
        </SectionCard>
      ) : (
        <section className="card p-6">
          <NewJobForm versions={versions} sources={JOB_SOURCES} min={JD_MIN} max={JD_MAX} />
        </section>
      )}
    </div>
  );
}

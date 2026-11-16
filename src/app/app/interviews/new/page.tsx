import type { Metadata } from "next";
import Link from "next/link";
import { SetupForm } from "@/components/interview/interview-ui";
import { SectionCard } from "@/components/profile-real/section-card";
import { requireUser } from "@/server/auth/user";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "New practice interview" };
export const maxDuration = 120;

export default async function NewInterviewPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const user = await requireUser();
  const { job } = await searchParams;
  const [jobs, versions] = await Promise.all([
    db.job.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, title: true, company: true } }),
    db.resumeVersion.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, label: true, name: true } }),
  ]);
  const initialJob = job && jobs.some((j) => j.id === job) ? job : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/interviews" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">Back to interviews</Link>
        <h1 className="font-display text-[32px] font-bold leading-tight">New practice interview</h1>
        <p className="rounded-xl bg-sunken px-4 py-3 text-sm">
          Practice tool. Scores are feedback for you, not a prediction of any hiring decision. Do not use it during a real interview.
        </p>
      </div>
      <SectionCard id="setup" title="Set it up" intro="One question at a time, like the real thing. No feedback until the end, then a full report with a model answer for each question.">
        <SetupForm
          plan={user.plan}
          initialJob={initialJob}
          jobs={jobs.map((j) => ({ id: j.id, label: `${j.title}${j.company ? `, ${j.company}` : ""}` }))}
          versions={versions.map((v) => ({ id: v.id, label: `${v.label} · ${v.name}` }))}
        />
      </SectionCard>
    </div>
  );
}

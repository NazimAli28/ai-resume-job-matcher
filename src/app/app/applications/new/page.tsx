import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/tracker/application-form";
import { requireUser } from "@/server/auth/user";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Add application" };

const isId = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

export default async function NewApplicationPage({ searchParams }: { searchParams: Promise<{ job?: string; resume?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [jobs, versions] = await Promise.all([
    db.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, title: true, company: true, location: true, url: true, source: true, sourceDetail: true },
    }),
    db.resumeVersion.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, label: true, name: true } }),
  ]);
  const jobId = isId(sp.job) && jobs.some((j) => j.id === sp.job) ? sp.job : "";
  const resumeId = isId(sp.resume) && versions.some((v) => v.id === sp.resume) ? sp.resume : "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/applications" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">Back to tracker</Link>
        <h1 className="font-display text-[32px] font-bold leading-tight">Add an application</h1>
        <p className="text-muted">Type the details yourself or start from a job you matched. No AI is used here.</p>
      </div>
      <ApplicationForm jobs={jobs} versions={versions} jobId={jobId} resumeId={resumeId} />
    </div>
  );
}

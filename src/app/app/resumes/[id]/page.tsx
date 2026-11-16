import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormAlert } from "@/components/auth/auth-ui";
import { SectionCard } from "@/components/profile-real/section-card";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { FindingsReport, FoundSummary } from "@/components/resumes-real/report-sections";
import { VersionActions } from "@/components/resumes-real/version-actions";
import { RingScore } from "@/components/ui/charts";
import { requireUser } from "@/server/auth/user";
import { getVersion } from "@/server/resume/service";
import type { Finding, ResumeDoc } from "@/server/resume/types";

export const metadata: Metadata = { title: "Resume report" };

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function ResumeReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tailored?: string; export?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await getVersion(user.id, id);
  if (!v) notFound();
  const sp = await searchParams;

  const a = v.analyses[0];
  const findings = (a?.findings ?? []) as unknown as Finding[];
  const doc = v.content as unknown as ResumeDoc | null;
  const meta = [v.upload?.kind, v.upload?.pageCount ? `${v.upload.pageCount} page${v.upload.pageCount === 1 ? "" : "s"}` : null, fmt(v.createdAt)].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href="/app/resumes" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">
          Back to resumes
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-display text-[32px] font-bold leading-tight">
              <span className="mr-2 rounded-full bg-hl-soft px-2.5 py-0.5 align-middle text-[15px] font-semibold text-hl-ink">{v.label}</span>
              <span className="break-words">{v.name}</span>
            </h1>
            <p className="text-sm text-muted">{meta}</p>
          </div>
          <VersionActions versionId={v.id} canDownload={!!v.upload && !v.upload.fileDeletedAt} />
        </div>
      </div>

      {sp.tailored === "1" && <FormAlert tone="ok">Saved as a new version. Your original is unchanged. Download it below, or check it against the job again.</FormAlert>}
      {sp.export === "cnic" && <FormAlert>This resume contains a CNIC number. Remove it before downloading: a resume should never carry it.</FormAlert>}

      <SectionCard id="download" title="Download a clean copy" intro="A single-column file with standard headings and real text, the layout applicant tracking systems read best.">
        <div className="flex flex-wrap gap-2">
          <a href={`/app/resumes/${v.id}/export?format=pdf`} className={buttonClass("primary")}><Download className="size-4" aria-hidden /> PDF</a>
          <a href={`/app/resumes/${v.id}/export?format=docx`} className={buttonClass("secondary")}><Download className="size-4" aria-hidden /> Word (DOCX)</a>
          {v.jobId && <ButtonLink href={`/app/jobs/${v.jobId}?resume=${v.id}`} variant="ghost">See the job match</ButtonLink>}
        </div>
      </SectionCard>

      {a && (
        <SectionCard id="scores" title="Scores" intro="Both are estimates calculated by code from the checks below. They don't predict hiring decisions.">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-center gap-4">
              <RingScore value={a.parseHealth} label="Parse health (estimate)" sublabel="estimate" />
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-semibold">Parse health (estimate)</h3>
                <p className="text-sm text-muted">Can software read your file the way you meant it?</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <RingScore value={a.readability} label="Readability (estimate)" sublabel="estimate" />
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-semibold">Readability (estimate)</h3>
                <p className="text-sm text-muted">How easily a person can skim and understand it.</p>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      <FindingsReport findings={findings} />

      {doc && <FoundSummary doc={doc} />}

      {v.upload?.atsText && (
        <details className="card group p-6">
          <summary className="flex min-h-11 cursor-pointer items-center font-display text-lg font-bold">What a simple parser likely sees</summary>
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-muted">This is the plain text we pulled out, in reading order. Real systems vary, so treat it as a rough guide.</p>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-sunken p-4 font-mono text-[13px]" tabIndex={0} aria-label="Extracted resume text">
              {v.upload.atsText}
            </pre>
          </div>
        </details>
      )}

      <p className="rounded-xl bg-sunken px-4 py-3 text-sm text-muted">
        These checks are calculated by code. AI suggestions to improve wording arrive in a later update.
      </p>
    </div>
  );
}

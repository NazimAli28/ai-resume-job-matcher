import type { Metadata } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/profile-real/section-card";
import { Uploader } from "@/components/resumes-real/uploader";
import { UPLOAD_LIMITS } from "@/server/resume/files/sniff";
import { analysesThisMonth, hasSensitiveConsent, listVersions, MONTHLY_ANALYSES } from "@/server/resume/service";
import { requireUser } from "@/server/auth/user";

export const metadata: Metadata = { title: "Resumes" };

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function ResumesPage() {
  const user = await requireUser();
  const [versions, used, consented] = await Promise.all([listVersions(user.id), analysesThisMonth(user.id), hasSensitiveConsent(user.id)]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-bold leading-tight">Your resumes</h1>

      <SectionCard
        id="upload"
        title="Check a resume"
        intro="Upload a PDF or Word file. We check whether software can read it and how it reads to a person. These are calculated by code, not guessed."
      >
        <Uploader used={used} limit={MONTHLY_ANALYSES} needsConsent={!consented} maxBytes={UPLOAD_LIMITS.maxBytes} maxPages={UPLOAD_LIMITS.maxPages} />
      </SectionCard>

      <section aria-labelledby="versions-h" className="flex flex-col gap-3">
        <h2 id="versions-h" className="font-display text-lg font-bold">
          Saved versions
        </h2>
        {versions.length === 0 ? (
          <div className="card flex flex-col gap-2 p-6 text-sm text-muted">
            <p className="font-semibold text-ink">No resumes yet.</p>
            <p>When you upload one, we check 30+ things in three groups:</p>
            <ul className="list-disc pl-5">
              <li>Parse: columns, tables, headers, hidden or garbled text that software can misread.</li>
              <li>Readability: structure, dates, bullet length and clarity for a person skimming.</li>
              <li>Privacy: details like a CNIC number that shouldn&apos;t be on a resume.</li>
            </ul>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {versions.map((v) => {
              const a = v.analyses[0];
              return (
                <li key={v.id}>
                  <Link href={`/app/resumes/${v.id}`} className="card card-hover flex min-h-11 flex-col gap-2 p-5">
                    <span className="flex items-baseline gap-2">
                      <span className="rounded-full bg-hl-soft px-2.5 py-0.5 text-[13px] font-semibold text-hl-ink">{v.label}</span>
                      <span className="min-w-0 break-words font-display text-base font-bold">{v.name}</span>
                    </span>
                    <span className="text-sm text-muted">
                      {[v.upload?.kind, v.upload?.pageCount ? `${v.upload.pageCount} page${v.upload.pageCount === 1 ? "" : "s"}` : null, fmt(v.createdAt)].filter(Boolean).join(" · ")}
                    </span>
                    {a ? (
                      <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span>
                          Parse health <strong className="tabular-nums">{a.parseHealth}</strong> <span className="text-muted">(estimate)</span>
                        </span>
                        <span>
                          Readability <strong className="tabular-nums">{a.readability}</strong> <span className="text-muted">(estimate)</span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted">No analysis yet.</span>
                    )}
                    <span className="text-sm font-semibold text-hl-ink">View report</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

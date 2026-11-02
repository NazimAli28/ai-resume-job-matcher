import { AlertTriangle, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/profile-real/section-card";
import {
  AddContact,
  AddRound,
  DeleteApplication,
  DetailsForm,
  NotesControl,
  ReminderControl,
  RemoveContact,
  ResumeLink,
  RoundControls,
  StatusControl,
} from "@/components/tracker/detail-controls";
import { LocalTime } from "@/components/tracker/local-time";
import { StatusChip } from "@/components/ui/chip";
import { requireUser } from "@/server/auth/user";
import { db } from "@/server/db";
import { band } from "@/server/match/engine";
import { JOB_SOURCES } from "@/server/match/schemas";
import { CONTACT_ROLES, fmtDay, rank, ROUND_TYPES, STATUS_LABELS, toDateInput } from "@/server/tracker/constants";
import { getApplication } from "@/server/tracker/service";

export const metadata: Metadata = { title: "Application" };

const label = (list: readonly (readonly [string, string])[], k: string) => list.find(([s]) => s === k)?.[1] ?? "Other";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [a, versions] = await Promise.all([
    getApplication(user.id, id),
    db.resumeVersion.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, label: true, name: true } }),
  ]);
  if (!a) notFound();

  const sent = rank(a.status) >= rank("APPLIED") || a.appliedAt !== null;
  const facts = [a.location, label(JOB_SOURCES, a.source), a.appliedAt ? `Applied ${fmtDay(a.appliedAt)}` : null, a.deadline ? `Deadline ${fmtDay(a.deadline)}` : null].filter(Boolean).join(" · ");
  const rv = a.resumeVersion;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/applications" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">Back to tracker</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words font-display text-[32px] font-bold leading-tight">{a.company}</h1>
              <StatusChip value={a.status} />
            </div>
            <p className="break-words font-semibold">{a.title}</p>
            <p className="break-words text-sm text-muted">{facts}</p>
            {a.url && (
              <a href={a.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
                Open the post <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
          {a.jobId && (
            <Link href={`/app/jobs/${a.jobId}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">See the job match</Link>
          )}
        </div>
      </div>

      <SectionCard id="stage" title="Stage" intro="Every change is kept in the timeline below.">
        <StatusControl key={a.status} id={a.id} status={a.status} />
      </SectionCard>

      <SectionCard id="reminder" title="Next step" intro="We show this on your home page when it's due.">
        <ReminderControl id={a.id} date={toDateInput(a.nextActionAt)} note={a.nextActionNote ?? ""} />
      </SectionCard>

      <SectionCard id="resume" title="Resume sent">
        {rv ? (
          <p className="text-sm">
            {rv.deletedAt ? (
              <span className="font-semibold">{rv.label} · {rv.name}</span>
            ) : (
              <Link href={`/app/resumes/${rv.id}`} className="font-semibold underline underline-offset-4">{rv.label} · {rv.name}</Link>
            )}
            {rv.deletedAt && <span className="text-muted"> (removed from your resumes; the record is kept while an application uses it)</span>}
          </p>
        ) : (
          sent && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-warn">
              <AlertTriangle className="size-4 shrink-0" aria-hidden /> No resume linked: you won&apos;t know what you sent.
            </p>
          )
        )}
        <ResumeLink key={a.resumeVersionId ?? "none"} id={a.id} value={rv && !rv.deletedAt ? rv.id : ""} versions={versions} />
        {a.matchScore !== null && (
          <p className="text-sm text-muted">
            Fit when linked: <span className="font-semibold tabular-nums text-ink">{a.matchScore}</span> · {band(a.matchScore)} (estimate, not a hiring prediction)
          </p>
        )}
      </SectionCard>

      <SectionCard id="rounds" title="Interview rounds" intro="Rounds don't change the stage. Move it to Interviewing when you're ready.">
        {a.rounds.length === 0 ? (
          <p className="text-sm text-muted">No rounds yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {a.rounds.map((r) => {
              const name = `${label(ROUND_TYPES, r.type)} round`;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rule p-3">
                  <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                    <span className="font-semibold">{name}</span>
                    <span className="text-muted">{r.scheduledAt ? <LocalTime iso={r.scheduledAt.toISOString()} /> : "No date set"}</span>
                    {r.notes && <span className="break-words">{r.notes}</span>}
                  </div>
                  <RoundControls roundId={r.id} outcome={r.outcome} label={name} />
                </li>
              );
            })}
          </ul>
        )}
        <AddRound id={a.id} />
      </SectionCard>

      <SectionCard id="people" title="People" intro="Who you've dealt with here. This stays in your tracker and is never sent to the AI.">
        {a.contacts.length === 0 ? (
          <p className="text-sm text-muted">No one added yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {a.contacts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rule p-3">
                <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                  <span className="break-words font-semibold">{c.name} <span className="font-normal text-muted">· {label(CONTACT_ROLES, c.role)}</span></span>
                  <span className="break-words text-muted">{[c.email, c.phone].filter(Boolean).join(" · ")}</span>
                  {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="w-fit font-semibold underline underline-offset-4">LinkedIn</a>}
                </div>
                <RemoveContact contactId={c.id} name={c.name} />
              </li>
            ))}
          </ul>
        )}
        <AddContact id={a.id} />
      </SectionCard>

      <SectionCard id="notes" title="Notes">
        <NotesControl id={a.id} value={a.notes ?? ""} />
      </SectionCard>

      <SectionCard id="timeline" title="Timeline">
        <ol className="flex flex-col gap-2 text-sm">
          {[...a.history].reverse().map((h) => (
            <li key={h.id} className="flex flex-col border-l-2 border-rule pl-3">
              <span className="font-semibold">{h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} to ${STATUS_LABELS[h.toStatus]}` : `Added as ${STATUS_LABELS[h.toStatus]}`}</span>
              <span className="text-[13px] text-muted"><LocalTime iso={h.changedAt.toISOString()} /></span>
              {h.note && <span className="break-words">{h.note}</span>}
            </li>
          ))}
        </ol>
      </SectionCard>

      <details className="card p-6">
        <summary className="flex min-h-11 cursor-pointer items-center font-display text-lg font-bold">Edit details</summary>
        <div className="pt-3">
          <DetailsForm
            id={a.id}
            value={{
              company: a.company,
              title: a.title,
              location: a.location ?? "",
              url: a.url ?? "",
              source: a.source,
              sourceDetail: a.sourceDetail ?? "",
              deadline: toDateInput(a.deadline),
              salaryExpected: a.salaryExpected?.toString() ?? "",
              priority: String(a.priority),
            }}
          />
        </div>
      </details>

      {a.jobText && (
        <details className="card p-6">
          <summary className="flex min-h-11 cursor-pointer items-center font-display text-lg font-bold">The post, as it was when you added it</summary>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-sunken p-4 text-[13px]" tabIndex={0} aria-label="Saved job post">{a.jobText}</pre>
        </details>
      )}

      <div><DeleteApplication id={a.id} /></div>
    </div>
  );
}

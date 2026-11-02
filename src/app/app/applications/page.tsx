import { Download, Plus } from "lucide-react";
import type { Metadata } from "next";
import { SectionCard } from "@/components/profile-real/section-card";
import { Tracker, type TrackerCard } from "@/components/tracker/tracker";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { requireUser } from "@/server/auth/user";
import { JOB_SOURCES } from "@/server/match/schemas";
import { dayNumber, fmtDay } from "@/server/tracker/constants";
import { listApplications } from "@/server/tracker/service";

export const metadata: Metadata = { title: "Tracker" };

const sourceLabel = (k: string) => JOB_SOURCES.find(([s]) => s === k)?.[1] ?? "Other";

export default async function ApplicationsPage() {
  const user = await requireUser();
  const apps = await listApplications(user.id);
  const now = new Date();
  const todayN = dayNumber(now);

  const cards: TrackerCard[] = apps.map((a) => ({
    id: a.id,
    company: a.company,
    title: a.title,
    status: a.status,
    source: a.source,
    sourceLabel: sourceLabel(a.source),
    matchScore: a.matchScore,
    resumeLabel: a.resumeVersion ? `${a.resumeVersion.label} · ${a.resumeVersion.name}` : null,
    daysInStage: Math.max(0, todayN - dayNumber(a.history[a.history.length - 1]?.changedAt ?? a.createdAt)),
    appliedOn: a.appliedAt ? fmtDay(a.appliedAt) : null,
    appliedSort: a.appliedAt?.getTime() ?? 0,
    nextAction: a.nextActionAt ? `${a.nextActionNote ?? "Reminder"}: ${fmtDay(a.nextActionAt)}` : null,
    overdue: Boolean(a.nextActionAt && dayNumber(a.nextActionAt) <= todayN),
  }));

  return (
    <ToastProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[32px] font-bold leading-tight">Application tracker</h1>
            <p className="text-muted">Where every application stands, and exactly which resume you sent.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cards.length > 0 && (
              <>
                {/* Plain links: these are file downloads, not page changes. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/app/applications/export" className={buttonClass("secondary")}>
                  <Download className="size-4" aria-hidden /> Export CSV
                </a>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/app/applications/export?file=history" className={buttonClass("ghost")}>
                  Status history CSV
                </a>
              </>
            )}
            <ButtonLink href="/app/applications/new" variant="primary">
              <Plus className="size-4" aria-hidden /> Add application
            </ButtonLink>
          </div>
        </div>

        {cards.length === 0 ? (
          <SectionCard id="empty" title="Your pipeline is empty" intro="Add a job you're thinking about applying to. Tracking is unlimited and doesn't use AI.">
            <div>
              <ButtonLink href="/app/applications/new" variant="primary">Add your first application</ButtonLink>
            </div>
          </SectionCard>
        ) : (
          <Tracker cards={cards} />
        )}
      </div>
    </ToastProvider>
  );
}

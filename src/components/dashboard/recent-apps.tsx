"use client";

import { ListChecks } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Chip, StatusChip } from "@/components/ui/chip";
import { bandFor } from "@/components/ui/score";
import { cn } from "@/lib/cn";
import { relativeDay } from "@/lib/dates";
import { useDemo } from "@/demo/store";
import type { Application } from "@/demo/types";
import { CardHeader, CompanyTile, linkClass } from "./ui";

function FitBadge({ app }: { app: Application }) {
  const { matchFor } = useDemo();
  const m = matchFor(app.jobId);
  if (!m) return <span className="text-sm text-muted">No estimate</span>;
  const band = bandFor(m.score);
  return (
    <span className="inline-flex items-baseline gap-1.5 text-sm" title="Fit estimate for this job">
      <span className="font-bold tabular-nums">{m.score}</span>
      <span className={cn("font-semibold", band.tone === "low" ? "text-warn" : "text-hl-ink")}>{band.word}</span>
    </span>
  );
}

function VersionChip({ app }: { app: Application }) {
  const { resumeById } = useDemo();
  const r = resumeById(app.resumeVersionId);
  if (!r) return null;
  if (!app.appliedAt) return <Chip className="border border-dashed border-rule-strong text-xs leading-5 text-muted">Not sent yet</Chip>;
  return (
    <Link
      href={`/demo/resumes/${r.id}`}
      className="inline-flex min-h-7 items-center whitespace-nowrap rounded-full border border-rule px-2.5 text-xs font-semibold hover:border-rule-strong hover:bg-sunken"
    >
      Sent with {r.label}
    </Link>
  );
}

export function RecentApplications() {
  const { state } = useDemo();
  const apps = [...state.applications].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);

  return (
    <section aria-labelledby="recent-title" className="@container card flex h-full flex-col gap-4 p-5 sm:p-6">
      <CardHeader
        icon={ListChecks}
        id="recent-title"
        title="Recent applications"
        sub="Most recently updated first"
        action={<Link href="/demo/applications" className={linkClass}>View all</Link>}
      />
      {apps.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted">Once you apply somewhere, it shows up here with the resume version you sent.</p>
          <ButtonLink href="/demo/applications" variant="primary">Add an application</ButtonLink>
        </div>
      ) : (
        <div className="flex flex-col">
          <div
            aria-hidden
            className="hidden grid-cols-[minmax(0,1fr)_7rem_6rem_6.5rem_5.5rem] gap-3 border-b border-rule pb-2 text-xs font-semibold text-muted @2xl:grid"
          >
            <span>Company and role</span>
            <span>Status</span>
            <span>Fit estimate</span>
            <span>Resume</span>
            <span className="text-right">Updated</span>
          </div>
          <ul className="flex flex-col divide-y divide-rule">
            {apps.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-1 items-center gap-x-3 gap-y-2 py-3 @2xl:grid-cols-[minmax(0,1fr)_7rem_6rem_6.5rem_5.5rem]"
              >
                <Link href={`/demo/applications?open=${a.id}`} className="flex min-w-0 items-center gap-3 rounded-xl">
                  <CompanyTile name={a.company} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold hover:underline">{a.company}</span>
                    <span className="block truncate text-sm text-muted">{a.title}</span>
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-12 @2xl:contents">
                  <span className="@2xl:pl-0"><StatusChip value={a.status} /></span>
                  <span>
                    <span className="sr-only">Fit estimate: </span>
                    <FitBadge app={a} />
                  </span>
                  <span><VersionChip app={a} /></span>
                  <span className="text-sm text-muted @2xl:text-right">
                    <span className="@2xl:sr-only">Updated </span>
                    {relativeDay(a.updatedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

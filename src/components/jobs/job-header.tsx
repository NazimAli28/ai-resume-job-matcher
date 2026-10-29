import { Banknote, Building2, CalendarDays, ExternalLink, Home, MapPin, Radar } from "lucide-react";
import { Chip, StatusChip } from "@/components/ui/chip";
import { CompanyTile } from "@/components/resumes/visual";
import { SOURCE_LABEL } from "@/demo/labels";
import type { Application, Job } from "@/demo/types";
import { formatDate } from "@/lib/dates";

export function JobHeader({ job, application }: { job: Job; application?: Application }) {
  const ModeIcon = job.workMode === "Remote" ? Home : Building2;
  return (
    <header className="card mb-6 flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <CompanyTile name={job.company} size="lg" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{job.title}</h1>
          <p className="text-lg text-muted">{job.company}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Job details">
        <li>
          <Chip className="bg-sunken text-ink">
            <MapPin className="size-3.5" aria-hidden />
            <span className="sr-only">Location: </span>
            {job.location}
          </Chip>
        </li>
        <li>
          <Chip className="bg-sunken text-ink">
            <ModeIcon className="size-3.5" aria-hidden />
            <span className="sr-only">Work mode: </span>
            {job.workMode}
          </Chip>
        </li>
        <li>
          <Chip className="bg-sunken text-ink">
            <Radar className="size-3.5" aria-hidden />
            <span className="sr-only">Found on: </span>
            {SOURCE_LABEL[job.source]}
            {job.sourceDetail ? `: ${job.sourceDetail}` : ""}
          </Chip>
        </li>
        <li>
          <Chip className="bg-sunken text-ink">
            <Banknote className="size-3.5" aria-hidden />
            <span className="sr-only">Salary: </span>
            {job.salary ?? "Salary not stated"}
          </Chip>
        </li>
        <li>
          <Chip className="bg-sunken text-ink">
            <CalendarDays className="size-3.5" aria-hidden />
            Saved {formatDate(job.addedAt)}
          </Chip>
        </li>
      </ul>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-hl-ink underline-offset-4 hover:underline">
            Open the original post
            <ExternalLink className="size-4" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
        {application && (
          <span className="flex items-center gap-1.5 text-muted">
            <Chip className="bg-hl-soft text-hl-ink">Tracked</Chip>
            <StatusChip value={application.status} />
          </span>
        )}
        {job.archived && <Chip className="border border-rule text-muted">Archived</Chip>}
      </div>
    </header>
  );
}

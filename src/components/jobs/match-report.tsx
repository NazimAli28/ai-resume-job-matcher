"use client";

import { ChevronDown, FileText } from "lucide-react";
import { Item, Stagger } from "@/components/ui/motion";
import { BackLink } from "./back-link";
import { JobActions } from "./job-actions";
import { JobHeader } from "./job-header";
import { JobNotFound, Loading } from "./job-not-found";
import { MatchScore } from "./match-score";
import { RequirementsMatrix } from "./requirements-matrix";
import { useJob } from "./use-job";

export function MatchReport() {
  const { ready, job, match, application, activeResume } = useJob();
  if (!ready) return <Loading />;
  if (!job || !match) return <JobNotFound />;

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink href="/demo/jobs" label="All jobs" />
      <JobHeader job={job} application={application} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Stagger className="flex min-w-0 flex-col gap-8">
          <Item className="flex flex-col gap-2">
            <MatchScore now={match.now} before={match.before} />
            <p className="px-1 text-sm text-muted">Compared with your active resume, {activeResume.label}: {activeResume.name}.</p>
          </Item>
          <RequirementsMatrix jobId={job.id} reqs={match.now.reqs} />
          <Item>
            <details className="group card">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-sunken">
                    <FileText className="size-4" aria-hidden />
                  </span>
                  Original job description
                </span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="whitespace-pre-wrap border-t border-rule px-4 py-3 text-sm leading-relaxed">{job.description}</div>
            </details>
          </Item>
        </Stagger>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <JobActions job={job} application={application} />
        </aside>
      </div>
    </div>
  );
}

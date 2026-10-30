"use client";

import { Archive, ArchiveRestore, FileText, KanbanSquare, Mic, PenLine, Rocket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useDemo } from "@/demo/store";
import type { Application, Job } from "@/demo/types";
import { TrackDialog } from "./track-dialog";

export function JobActions({ job, application }: { job: Job; application?: Application }) {
  const { dispatch } = useDemo();
  const toast = useToast();
  const [tracking, setTracking] = useState(false);

  const archive = () => {
    const archived = !job.archived;
    dispatch({ type: "ARCHIVE_JOB", id: job.id, archived });
    toast(archived ? "Job archived. It's hidden from your list." : "Job restored to your list", {
      label: "Undo",
      onClick: () => dispatch({ type: "ARCHIVE_JOB", id: job.id, archived: !archived }),
    });
  };

  return (
    <section aria-labelledby="next-heading" className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-hl text-on-hl glow">
          <Rocket className="size-5" aria-hidden />
        </span>
        <h2 id="next-heading" className="font-display text-xl font-bold">What to do next</h2>
      </div>
      <div className="flex flex-col gap-2">
        <ButtonLink href={`/demo/jobs/${job.id}/tailor`} variant="primary" className="justify-start">
          <PenLine className="size-4" aria-hidden />
          Tailor my resume
        </ButtonLink>
        <ButtonLink href={`/demo/jobs/${job.id}/cover-letter`} className="justify-start">
          <FileText className="size-4" aria-hidden />
          Write a cover letter
        </ButtonLink>
        <ButtonLink href={`/demo/interviews/new?job=${job.id}`} className="justify-start">
          <Mic className="size-4" aria-hidden />
          Practice for this job
        </ButtonLink>
        {application ? (
          <Link href="/demo/applications" className="inline-flex min-h-11 items-center gap-2 px-4 text-[15px] font-semibold text-hl-ink underline-offset-4 hover:underline">
            <KanbanSquare className="size-4" aria-hidden />
            Already tracked: view in applications
          </Link>
        ) : (
          <Button className="justify-start" onClick={() => setTracking(true)}>
            <KanbanSquare className="size-4" aria-hidden />
            Track application
          </Button>
        )}
        <Button variant="ghost" className="justify-start text-muted" onClick={archive}>
          {job.archived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
          {job.archived ? "Restore job" : "Archive job"}
        </Button>
      </div>
      {tracking && <TrackDialog job={job} open onClose={() => setTracking(false)} />}
    </section>
  );
}

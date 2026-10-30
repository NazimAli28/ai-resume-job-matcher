"use client";

import { SearchX } from "lucide-react";
import { IconComposition } from "@/components/resumes/visual";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";

export function JobNotFound() {
  return (
    <EmptyState
      icon={<IconComposition icon={SearchX} />}
      title="We couldn't find this job"
      body="It may have been removed, or the demo was reset. Go back to your jobs and pick another one."
      action={<ButtonLink href="/demo/jobs">Back to jobs</ButtonLink>}
    />
  );
}

export function Loading() {
  return (
    <div role="status" className="mx-auto flex max-w-5xl flex-col gap-4 py-6">
      <span className="sr-only">Loading your demo data</span>
      <div aria-hidden className="shimmer h-40 rounded-[20px]" />
      <div aria-hidden className="shimmer h-64 rounded-[20px]" />
    </div>
  );
}

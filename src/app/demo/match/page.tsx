"use client";

import { MatchComposer } from "@/components/match/match-composer";
import { PageHeader } from "@/components/ui/panel";

export default function MatchPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Match a job"
        description="Choose a resume, paste the job description, and see which requirements you meet, what's missing, and what to fix."
      />
      <MatchComposer />
    </div>
  );
}

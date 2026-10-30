"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useDemo } from "@/demo/store";
import { liveMatch } from "./lib/match";

/** The job for the current /demo/jobs/[id] route plus its live (override-aware) match. */
export function useJob() {
  const params = useParams<{ id: string }>();
  const demo = useDemo();
  const job = demo.jobById(params.id);
  const match = useMemo(() => (job ? liveMatch(demo.state, job) : undefined), [demo.state, job]);
  const application = demo.state.applications.find((a) => a.jobId === params.id);
  return { ...demo, id: params.id, job, match, application };
}

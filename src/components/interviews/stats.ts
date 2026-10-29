import type { InterviewEvaluation, InterviewSession } from "@/demo/types";
import { daysBetween } from "@/lib/dates";
import { normDim } from "./scoring";

export function aggregate(evals: InterviewEvaluation[]) {
  const map = new Map<string, number[]>();
  for (const e of evals) for (const r of e.rubric) {
    const k = normDim(r.dimension);
    map.set(k, [...(map.get(k) ?? []), r.score]);
  }
  return [...map.entries()]
    .map(([dimension, s]) => ({ dimension, avg: s.reduce((a, b) => a + b, 0) / s.length }))
    .sort((a, b) => b.avg - a.avg);
}

/** Summary numbers for the interviews list, all computed from saved sessions. */
export function summarize(sessions: InterviewSession[]) {
  const done = sessions.filter((s) => s.status === "COMPLETED" && typeof s.overall === "number");
  const avg = done.length ? Math.round(done.reduce((a, s) => a + (s.overall as number), 0) / done.length) : 0;
  const dims = aggregate(done.flatMap((s) => s.evaluations));
  const days = [...new Set(sessions.map((s) => s.createdAt.slice(0, 10)))].sort().reverse();
  let streak = 0;
  if (days.length && daysBetween(days[0]) <= 1) {
    streak = 1;
    for (let i = 1; i < days.length; i++) {
      if (daysBetween(days[i], days[i - 1]) === 1) streak++;
      else break;
    }
  }
  return { done, avg, best: dims[0], lastDay: days[0], streak };
}

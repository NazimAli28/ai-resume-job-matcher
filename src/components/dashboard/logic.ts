import { ACTIVE_STATUSES, isClosed } from "@/components/applications/helpers";
import type { Point } from "@/components/ui/charts";
import { TODAY, daysBetween, formatDate } from "@/lib/dates";
import { PIPELINE, SOURCE_LABEL } from "@/demo/labels";
import type { Application, ApplicationStatus, DemoState, InterviewSession, RoundType } from "@/demo/types";

export interface NextBestAction {
  kind: "FOLLOW_UP" | "PRACTICE" | "FIX_FINDINGS" | "TAILOR" | "ALL_CLEAR";
  title: string;
  why: string;
  cta: string;
  href: string;
  /** Set for follow-ups so the card can offer "Mark done". */
  applicationId?: string;
}

const REPLIED: ApplicationStatus[] = ["SCREENING", "ASSESSMENT", "INTERVIEWING", "OFFER", "ACCEPTED", "REJECTED"];

export function followUps(apps: Application[], withinDays = 7): Application[] {
  return apps
    .filter((a) => a.nextAction && !isClosed(a.status) && daysBetween(TODAY, a.nextAction.due) <= withinDays)
    .sort((a, b) => a.nextAction!.due.localeCompare(b.nextAction!.due));
}

/** Priority: overdue follow-up, interview within 3 days with no practice, unresolved HIGH findings, saved job not tailored. */
export function nextBestAction(state: DemoState): NextBestAction {
  const overdue = followUps(state.applications, 0)[0];
  if (overdue?.nextAction) {
    const d = daysBetween(TODAY, overdue.nextAction.due);
    return {
      kind: "FOLLOW_UP",
      title: `${overdue.nextAction.label} with ${overdue.company}`,
      why: d === 0 ? "This was due today. A short, polite message keeps you on their radar." : `This was due ${-d} day${d === -1 ? "" : "s"} ago. Sending it now is better than not at all.`,
      cta: "Open application",
      href: `/demo/applications?open=${overdue.id}`,
      applicationId: overdue.id,
    };
  }

  for (const app of state.applications) {
    if (isClosed(app.status)) continue;
    const round = app.rounds.find((r) => !r.done && daysBetween(TODAY, r.at) >= 0 && daysBetween(TODAY, r.at) <= 3);
    const practiced = state.interviews.some((i) => i.jobId === app.jobId);
    if (round && !practiced) {
      return {
        kind: "PRACTICE",
        title: `Practice for your ${app.company} interview`,
        why: `Your round is ${daysBetween(TODAY, round.at) === 0 ? "today" : `in ${daysBetween(TODAY, round.at)} days`} and you have not practiced for this job yet.`,
        cta: "Start practice",
        href: `/demo/interviews/new?job=${app.jobId}`,
      };
    }
  }

  const resume = state.resumes.find((r) => r.id === state.activeResumeId) ?? state.resumes[0];
  const high = resume?.findings.filter((f) => f.severity === "HIGH" && !f.resolved) ?? [];
  if (resume && high.length > 0) {
    return {
      kind: "FIX_FINDINGS",
      title: `Fix ${high.length} high-priority ${high.length === 1 ? "issue" : "issues"} in ${resume.label}`,
      why: "These can hide your experience from automated parsers or distract a recruiter. Each fix explains what we saw.",
      cta: "Review findings",
      href: `/demo/resumes/${resume.id}`,
    };
  }

  const saved = state.applications.find(
    (a) => a.status === "SAVED" && !state.resumes.some((r) => r.tailoredForJobId === a.jobId),
  );
  if (saved) {
    return {
      kind: "TAILOR",
      title: `Tailor your resume for ${saved.company}`,
      why: `You saved ${saved.title} but have not adapted a resume for it. We suggest wording from your own experience only.`,
      cta: "Review the job",
      href: `/demo/jobs/${saved.jobId}`,
    };
  }

  return {
    kind: "ALL_CLEAR",
    title: "You are up to date",
    why: "No follow-ups, interviews or resume issues need you right now. Saving another job is a good next step.",
    cta: "Add a job",
    href: "/demo/jobs",
  };
}

export function stats(apps: Application[]) {
  const sent = apps.filter((a) => a.appliedAt);
  const replied = sent.filter((a) => a.history.some((h) => REPLIED.includes(h.status)));
  return {
    active: apps.filter((a) => ACTIVE_STATUSES.includes(a.status)).length,
    interviews: apps.filter((a) => a.history.some((h) => h.status === "INTERVIEWING")).length,
    offers: apps.filter((a) => a.history.some((h) => h.status === "OFFER" || h.status === "ACCEPTED")).length,
    sent: sent.length,
    replied: replied.length,
  };
}

export function ghostCandidates(apps: Application[]): Application[] {
  return apps.filter(
    (a) => ["APPLIED", "SCREENING", "ASSESSMENT"].includes(a.status) && daysBetween(a.updatedAt) >= 21,
  );
}

/* ------------------------------------------------------------------ */
/* v2 dashboard computations. Everything below is derived from state.  */
/* ------------------------------------------------------------------ */

export type Range = "4" | "8" | "ALL";
export const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "4", label: "4 weeks" },
  { value: "8", label: "8 weeks" },
  { value: "ALL", label: "All" },
];

const day = (iso: string) => iso.slice(0, 10);

function addDays(iso: string, n: number): string {
  const d = new Date(day(iso) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `iso` (weeks run Monday to Sunday). */
export function weekStart(iso: string): string {
  const d = new Date(day(iso) + "T00:00:00Z");
  return addDays(day(iso), -((d.getUTCDay() + 6) % 7));
}

export interface Week {
  start: string;
  /** Sunday that closes the week. */
  end: string;
  label: string;
}

/** Date the application was sent: its APPLIED history entry, else appliedAt. */
export function appliedDate(a: Application): string | undefined {
  return a.history.find((h) => h.status === "APPLIED")?.at ?? a.appliedAt;
}

/** First date the employer replied (any status past APPLIED, including a rejection). */
export function firstReplyDate(a: Application): string | undefined {
  return a.history.find((h) => REPLIED.includes(h.status))?.at;
}

/**
 * Week buckets ending on Sundays, newest last. The current week (containing TODAY) is included.
 * "ALL" starts at the week of the earliest sent application (capped at 26 weeks).
 */
export function weeksFor(range: Range, apps: Application[]): Week[] {
  const current = weekStart(TODAY);
  let n: number;
  if (range === "ALL") {
    const dates = apps.map(appliedDate).filter((d): d is string => !!d).sort();
    const first = dates[0] ? weekStart(dates[0]) : current;
    n = Math.min(26, Math.max(1, Math.round(daysBetween(first, current) / 7) + 1));
  } else {
    n = Number(range);
  }
  return Array.from({ length: n }, (_, i) => {
    const start = addDays(current, -7 * (n - 1 - i));
    return { start, end: addDays(start, 6), label: formatDate(start) };
  });
}

function bucket(weeks: Week[], dates: (string | undefined)[]): Point[] {
  return weeks.map((w) => ({
    label: w.label,
    value: dates.filter((d) => d && day(d) >= w.start && day(d) <= w.end).length,
  }));
}

export function inWindow(weeks: Week[], iso: string | undefined): boolean {
  return !!iso && day(iso) >= weeks[0].start && day(iso) <= TODAY;
}

export function rangePhrase(range: Range): string {
  return range === "ALL" ? "all time" : `in ${range} wks`;
}

export function rangeSentence(range: Range): string {
  return range === "ALL" ? "since your first application" : `in the last ${range} weeks`;
}

const isInterviewRound = (t: RoundType) => t !== "TAKE_HOME";

export function overview(state: DemoState, range: Range) {
  const apps = state.applications;
  const weeks = weeksFor(range, apps);
  const s = stats(apps);

  const sentPerWeek = bucket(weeks, apps.map(appliedDate));
  const repliesPerWeek = bucket(weeks, apps.map(firstReplyDate));
  const sentInRange = sentPerWeek.reduce((n, p) => n + p.value, 0);
  const repliesInRange = repliesPerWeek.reduce((n, p) => n + p.value, 0);

  const openApps = apps.filter((a) => !isClosed(a.status));
  const upcomingRounds = openApps.flatMap((a) =>
    a.rounds.filter((r) => !r.done && isInterviewRound(r.type) && day(r.at) >= TODAY).map((r) => ({ app: a, round: r })),
  );
  const roundsHeldInRange = apps.flatMap((a) => a.rounds).filter((r) => r.done && isInterviewRound(r.type) && inWindow(weeks, r.at)).length;
  const practiceDone = state.interviews.filter((i) => i.status === "COMPLETED").length;

  const offersInRange = apps.filter((a) => a.history.some((h) => (h.status === "OFFER" || h.status === "ACCEPTED") && inWindow(weeks, h.at))).length;

  const fits = state.jobs
    .filter((j) => !j.archived)
    .map((j) => state.matches.find((m) => m.jobId === j.id)?.score)
    .filter((v): v is number => v !== undefined);
  const avgFit = fits.length ? Math.round(fits.reduce((a, b) => a + b, 0) / fits.length) : null;

  return {
    weeks,
    s,
    sentPerWeek,
    repliesPerWeek,
    sentInRange,
    repliesInRange,
    responseRate: s.sent ? Math.round((s.replied / s.sent) * 100) : 0,
    upcomingRounds,
    roundsHeldInRange,
    practiceDone,
    offersInRange,
    avgFit,
    fitCount: fits.length,
  };
}

/** Momentum = share of active applications with any activity in the last 14 days (from updatedAt). */
export function momentum(apps: Application[]) {
  const active = apps.filter((a) => ACTIVE_STATUSES.includes(a.status));
  const moving = active.filter((a) => daysBetween(a.updatedAt) <= 14);
  return { moving: moving.length, active: active.length, pct: active.length ? Math.round((moving.length / active.length) * 100) : 0 };
}

/** Counts for the current Monday–Sunday week, for the greeting line. */
export function thisWeek(apps: Application[]) {
  const start = weekStart(TODAY);
  const end = addDays(start, 6);
  const within = (d?: string) => !!d && day(d) >= start && day(d) <= end;
  return {
    sent: apps.filter((a) => within(appliedDate(a))).length,
    interviews: apps.filter((a) => !isClosed(a.status)).flatMap((a) => a.rounds).filter((r) => !r.done && isInterviewRound(r.type) && within(r.at) && day(r.at) >= TODAY).length,
    due: apps.filter((a) => a.nextAction && !isClosed(a.status) && day(a.nextAction.due) <= end).length,
  };
}

/** Pipeline funnel: applications that reached each stage or a later one (SAVED to OFFER). */
export function funnel(apps: Application[]) {
  const stages = PIPELINE.slice(0, PIPELINE.indexOf("OFFER") + 1);
  const reach = apps.map((a) =>
    Math.max(-1, ...[a.status, ...a.history.map((h) => h.status)].map((st) => PIPELINE.indexOf(st))),
  );
  return stages.map((st, i) => ({ status: st, value: reach.filter((r) => r >= i).length }));
}

export function sources(apps: Application[]) {
  const counts = new Map<string, number>();
  for (const a of apps) counts.set(SOURCE_LABEL[a.source], (counts.get(SOURCE_LABEL[a.source]) ?? 0) + 1);
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/* Upcoming timeline ------------------------------------------------- */

export type UpcomingKind = "INTERVIEW" | "TAKE_HOME" | "FOLLOW_UP" | "DECISION";

export interface UpcomingItem {
  key: string;
  app: Application;
  label: string;
  due: string;
  kind: UpcomingKind;
  /** Next actions can be checked off (with undo); scheduled rounds are shown for context only. */
  checkable: boolean;
}

const ROUND_LABEL: Record<RoundType, string> = {
  HR: "HR round",
  TECHNICAL: "Technical round",
  FINAL: "Final round",
  PANEL: "Panel interview",
  TAKE_HOME: "Take-home due",
  OTHER: "Interview",
};

export function upcoming(apps: Application[], withinDays = 14): UpcomingItem[] {
  const items: UpcomingItem[] = [];
  for (const a of apps) {
    if (isClosed(a.status)) continue;
    const na = a.nextAction;
    const matched = na ? a.rounds.find((r) => !r.done && day(r.at) === day(na.due)) : undefined;
    if (na && daysBetween(TODAY, na.due) <= withinDays) {
      items.push({
        key: `na-${a.id}`,
        app: a,
        label: na.label,
        due: na.due,
        kind: matched ? (matched.type === "TAKE_HOME" ? "TAKE_HOME" : "INTERVIEW") : a.status === "OFFER" ? "DECISION" : "FOLLOW_UP",
        checkable: true,
      });
    }
    for (const r of a.rounds) {
      if (r.done || r === matched || day(r.at) < TODAY || daysBetween(TODAY, r.at) > withinDays) continue;
      items.push({ key: `rd-${r.id}`, app: a, label: ROUND_LABEL[r.type], due: r.at, kind: r.type === "TAKE_HOME" ? "TAKE_HOME" : "INTERVIEW", checkable: false });
    }
  }
  return items.sort((x, y) => x.due.localeCompare(y.due));
}

/** Next scheduled interview round (not a take-home) across open applications. */
export function nextInterview(apps: Application[]) {
  return apps
    .filter((a) => !isClosed(a.status))
    .flatMap((a) => a.rounds.filter((r) => !r.done && isInterviewRound(r.type) && day(r.at) >= TODAY).map((round) => ({ app: a, round })))
    .sort((x, y) => x.round.at.localeCompare(y.round.at))[0];
}

/* Interview readiness ----------------------------------------------- */

export function completedSessions(sessions: InterviewSession[]) {
  return sessions
    .filter((s) => s.status === "COMPLETED" && s.overall !== undefined)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Average rubric score (1–5) per dimension across one session's evaluations, best first. */
export function dimensions(session: InterviewSession) {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const e of session.evaluations)
    for (const r of e.rubric) {
      const cur = acc.get(r.dimension) ?? { sum: 0, n: 0 };
      acc.set(r.dimension, { sum: cur.sum + r.score, n: cur.n + 1 });
    }
  return [...acc.entries()]
    .map(([dimension, { sum, n }]) => ({ dimension, avg: Math.round((sum / n) * 10) / 10, n }))
    .sort((a, b) => b.avg - a.avg || a.dimension.localeCompare(b.dimension));
}

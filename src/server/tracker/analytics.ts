import { JOB_SOURCES } from "../match/schemas";
import { dayDate, dayNumber, rank, type Status } from "./constants";

/** Pure dashboard arithmetic. All of it comes from the user's own records; nothing here predicts an outcome. */

export interface AppRow {
  id: string;
  status: Status;
  source: string;
  appliedAt: Date | null;
  createdAt: Date;
  matchScore: number | null;
  resumeVersionId: string | null;
  resumeLabel: string | null;
  history: { toStatus: Status; changedAt: Date }[];
}

export interface Rate {
  n: number;
  count: number;
  /** Null when there's nothing to divide by. */
  pct: number | null;
}

export interface TimeStat {
  n: number;
  median: number | null;
  average: number | null;
}

export interface Breakdown {
  key: string;
  label: string;
  n: number;
  responses: number;
  interviews: number;
  offers: number;
}

/** DSH-021: below this, values are greyed with a warning. */
export const SMALL_SAMPLE = 5;
/** DSH-011: time metrics need at least this many. */
export const MIN_TIME_SAMPLE = 3;

const RANK_APPLIED = rank("APPLIED");
const RANK_SCREENING = rank("SCREENING");
const RANK_INTERVIEWING = rank("INTERVIEWING");
const RANK_OFFER = rank("OFFER");

/** Skipped stages count as passed: reaching Interviewing means the application also got past Applied (DSH-010). */
export const furthest = (a: Pick<AppRow, "status" | "history">) => Math.max(rank(a.status), ...a.history.map((h) => rank(h.toStatus)));

const rate = (count: number, n: number): Rate => ({ n, count, pct: n ? Math.round((count / n) * 100) : null });

function timeStat(values: number[], min = MIN_TIME_SAMPLE): TimeStat {
  if (values.length < min) return { n: values.length, median: null, average: null };
  const s = [...values].sort((x, y) => x - y);
  const mid = s.length >> 1;
  return {
    n: s.length,
    median: Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2),
    average: Math.round(s.reduce((sum, v) => sum + v, 0) / s.length),
  };
}

/** A reply from the employer: any later stage, or a rejection. Ghosted and withdrawn aren't replies. */
function firstResponse(a: AppRow) {
  if (!a.appliedAt) return null;
  const applied = dayNumber(a.appliedAt);
  const hits = a.history
    .filter((h) => (rank(h.toStatus) >= RANK_SCREENING || h.toStatus === "REJECTED") && dayNumber(h.changedAt) >= applied)
    .sort((x, y) => x.changedAt.getTime() - y.changedAt.getTime());
  return hits[0] ?? null;
}

function breakdown(rows: AppRow[], keyOf: (a: AppRow) => { key: string; label: string } | null): Breakdown[] {
  const groups = new Map<string, Breakdown>();
  for (const a of rows) {
    const k = keyOf(a);
    if (!k) continue;
    const g = groups.get(k.key) ?? { ...k, n: 0, responses: 0, interviews: 0, offers: 0 };
    const top = furthest(a);
    g.n += 1;
    if (firstResponse(a)) g.responses += 1;
    if (top >= RANK_INTERVIEWING) g.interviews += 1;
    if (top >= RANK_OFFER) g.offers += 1;
    groups.set(k.key, g);
  }
  return [...groups.values()].sort((x, y) => y.n - x.n || x.label.localeCompare(y.label));
}

export const MATCH_BANDS = [
  { key: "0-49", min: 0, max: 49 },
  { key: "50-69", min: 50, max: 69 },
  { key: "70-84", min: 70, max: 84 },
  { key: "85+", min: 85, max: 100 },
];

const sourceLabel = (k: string) => JOB_SOURCES.find(([s]) => s === k)?.[1] ?? "Other";

export function computeDashboard(all: AppRow[], opts: { now?: Date; rangeDays?: number | null } = {}) {
  const now = opts.now ?? new Date();
  const todayN = dayNumber(now);
  const inRange = opts.rangeDays ? all.filter((a) => todayN - dayNumber(a.appliedAt ?? a.createdAt) < opts.rangeDays!) : all;
  const applied = inRange.filter((a) => furthest(a) >= RANK_APPLIED);

  const countStatus = (...s: Status[]) => inRange.filter((a) => s.includes(a.status)).length;
  const reached = (r: number) => applied.filter((a) => furthest(a) >= r).length;

  const stages: Status[] = ["APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEWING", "OFFER", "ACCEPTED"];
  const funnel = stages.map((stage, i) => {
    const count = reached(rank(stage));
    const prev = i ? reached(rank(stages[i - 1])) : null;
    return { stage, count, conversion: prev ? Math.round((count / prev) * 100) : null };
  });

  // Twelve weeks ending this week, Monday first. Always the same span so the chart reads the same at any range.
  const weekStart = (n: number) => n - ((n + 3) % 7);
  const thisWeek = weekStart(todayN);
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const start = thisWeek - (11 - i) * 7;
    return {
      label: dayDate(start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
      value: all.filter((a) => a.appliedAt && weekStart(dayNumber(a.appliedAt)) === start).length,
    };
  });

  const responses = applied.map(firstResponse);
  const toInterview = applied.flatMap((a) => {
    const hit = a.history.filter((h) => rank(h.toStatus) >= RANK_INTERVIEWING).sort((x, y) => x.changedAt.getTime() - y.changedAt.getTime())[0];
    return hit && a.appliedAt ? [Math.max(0, dayNumber(hit.changedAt) - dayNumber(a.appliedAt))] : [];
  });
  const inStage = inRange
    .filter((a) => rank(a.status) >= 0 && a.status !== "ACCEPTED")
    .map((a) => todayN - dayNumber(a.history.reduce((latest, h) => (h.changedAt > latest ? h.changedAt : latest), a.createdAt)));

  return {
    counts: {
      total: inRange.length,
      saved: countStatus("SAVED"),
      active: countStatus("APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEWING", "OFFER"),
      interviewing: countStatus("INTERVIEWING"),
      offers: countStatus("OFFER", "ACCEPTED"),
      rejected: countStatus("REJECTED"),
      ghosted: countStatus("GHOSTED"),
    },
    applied: applied.length,
    responseRate: rate(responses.filter(Boolean).length, applied.length),
    interviewRate: rate(reached(RANK_INTERVIEWING), applied.length),
    offerRate: rate(reached(RANK_OFFER), applied.length),
    funnel,
    weekly,
    time: {
      firstResponse: timeStat(responses.flatMap((h, i) => (h ? [Math.max(0, dayNumber(h.changedAt) - dayNumber(applied[i].appliedAt!))] : []))),
      toInterview: timeStat(toInterview),
      inStage: timeStat(inStage),
    },
    bySource: breakdown(applied, (a) => ({ key: a.source, label: sourceLabel(a.source) })),
    byResume: breakdown(applied, (a) => (a.resumeVersionId ? { key: a.resumeVersionId, label: a.resumeLabel ?? "Resume" } : { key: "none", label: "No resume linked" })),
    byBand: breakdown(applied, (a) => {
      if (a.matchScore === null) return null;
      const b = MATCH_BANDS.find((x) => a.matchScore! >= x.min && a.matchScore! <= x.max);
      return b ? { key: b.key, label: b.key } : null;
    }).sort((x, y) => MATCH_BANDS.findIndex((b) => b.key === x.key) - MATCH_BANDS.findIndex((b) => b.key === y.key)),
  };
}

export type Dashboard = ReturnType<typeof computeDashboard>;

// ───────────────────────────── Next best action ─────────────────────────────

export interface NextAction {
  title: string;
  body: string;
  href: string;
  cta: string;
}

/** Rule-based, not AI: the first thing on the core path that isn't done yet. */
export function nextBestAction(s: { hasResume: boolean; onboarded: boolean; jobs: number; applications: number; attention: AttentionItem[]; saved: { id: string; company: string }[] }): NextAction {
  if (!s.onboarded) return { title: "Set up your profile", body: "Suggestions may only use what's in your profile and resume, so a few minutes now pays off.", href: "/app/onboarding", cta: "Set up your profile" };
  if (!s.hasResume) return { title: "Upload your resume", body: "See whether software can read it and how it reads to a person.", href: "/app/resumes", cta: "Upload a resume" };
  const top = s.attention[0];
  if (top) return { title: `${top.company}: ${top.title}`, body: top.message, href: `/app/applications/${top.applicationId}`, cta: "Open application" };
  if (s.applications === 0) {
    return s.jobs > 0
      ? { title: "Start tracking", body: "You've matched a job. Add it to your tracker to follow it through.", href: "/app/applications/new", cta: "Add an application" }
      : { title: "Add a job", body: "Paste a post to compare it with your resume, or add one you've already applied to.", href: "/app/jobs/new", cta: "Match a job" };
  }
  if (s.saved[0]) return { title: `Ready to apply to ${s.saved[0].company}?`, body: "It's still saved. When you've applied, move it to Applied and link the resume you sent.", href: `/app/applications/${s.saved[0].id}`, cta: "Open application" };
  return { title: "You're up to date", body: "Nothing needs you right now. Add another job when you find one.", href: "/app/applications/new", cta: "Add an application" };
}

// ───────────────────────────── Needs attention ─────────────────────────────

export const FOLLOW_UP_DAYS = 7;
export const GHOST_DAYS = 21;
export const GHOST_DAYS_AFTER_ROUND = 14;
const WAITING: Status[] = ["APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEWING"];
const CLOSED_OR_DONE: Status[] = ["ACCEPTED", "REJECTED", "WITHDRAWN", "GHOSTED"];

export interface AttentionInput {
  id: string;
  company: string;
  title: string;
  status: Status;
  lastActivityAt: Date;
  nextActionAt: Date | null;
  nextActionNote: string | null;
  deadline: Date | null;
  nudgeSnoozedUntil: Date | null;
  rounds: { scheduledAt: Date | null }[];
}

export type AttentionKind = "REMINDER" | "ROUND" | "DEADLINE" | "GHOSTED" | "FOLLOW_UP";

export interface AttentionItem {
  applicationId: string;
  kind: AttentionKind;
  company: string;
  title: string;
  message: string;
  /** Sort key: the sooner or more overdue, the lower. */
  when: number;
}

const inDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);

/** Rule-based. Ghosting is only ever suggested: the user decides, and dismissing it changes nothing (TRK-042). */
export function needsAttention(apps: AttentionInput[], now = new Date()): AttentionItem[] {
  const todayN = dayNumber(now);
  const out: AttentionItem[] = [];
  for (const a of apps) {
    if (CLOSED_OR_DONE.includes(a.status)) continue;
    const base = { applicationId: a.id, company: a.company, title: a.title };

    if (a.nextActionAt && dayNumber(a.nextActionAt) <= todayN) {
      const late = todayN - dayNumber(a.nextActionAt);
      const what = a.nextActionNote ?? "Your reminder";
      out.push({ ...base, kind: "REMINDER", when: dayNumber(a.nextActionAt), message: late ? `${what}: ${late} day${late === 1 ? "" : "s"} overdue` : `${what}: due today` });
    }
    for (const r of a.rounds) {
      if (!r.scheduledAt || r.scheduledAt < now) continue;
      const days = dayNumber(r.scheduledAt) - todayN;
      if (days <= 7) out.push({ ...base, kind: "ROUND", when: dayNumber(r.scheduledAt), message: `Interview round ${inDays(days)}` });
    }
    if (a.status === "SAVED" && a.deadline) {
      const days = dayNumber(a.deadline) - todayN;
      if (days >= 0 && days <= 2) out.push({ ...base, kind: "DEADLINE", when: dayNumber(a.deadline), message: `Application deadline ${inDays(days)}` });
    }

    if (!WAITING.includes(a.status) || (a.nudgeSnoozedUntil && a.nudgeSnoozedUntil > now)) continue;
    const quiet = todayN - dayNumber(a.lastActivityAt);
    const hadRound = a.rounds.some((r) => r.scheduledAt && r.scheduledAt < now);
    const hasUpcoming = a.rounds.some((r) => r.scheduledAt && r.scheduledAt >= now);
    if (hasUpcoming) continue;
    if (quiet >= (hadRound ? GHOST_DAYS_AFTER_ROUND : GHOST_DAYS)) {
      out.push({ ...base, kind: "GHOSTED", when: todayN, message: `No update in ${quiet} days. Mark as ghosted?` });
    } else if (a.status === "APPLIED" && quiet >= FOLLOW_UP_DAYS) {
      out.push({ ...base, kind: "FOLLOW_UP", when: todayN, message: `No update in ${quiet} days. Send a follow-up?` });
    }
  }
  return out.sort((x, y) => x.when - y.when);
}

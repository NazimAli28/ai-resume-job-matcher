/** Shared by server and client: statuses, labels and the day arithmetic behind every date in the tracker. */

export const PIPELINE = ["SAVED", "APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEWING", "OFFER", "ACCEPTED"] as const;
export const CLOSED = ["REJECTED", "WITHDRAWN", "GHOSTED"] as const;
export const STATUSES = [...PIPELINE, ...CLOSED] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  ASSESSMENT: "Assessment",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  GHOSTED: "Ghosted",
};

export const ROUND_TYPES = [
  ["HR", "HR"],
  ["TECHNICAL", "Technical"],
  ["FINAL", "Final"],
  ["PANEL", "Panel"],
  ["OTHER", "Other"],
] as const;

export const ROUND_OUTCOMES = [
  ["PENDING", "Waiting"],
  ["PASSED", "Passed"],
  ["FAILED", "Not passed"],
  ["UNKNOWN", "Don't know"],
] as const;

export const CONTACT_ROLES = [
  ["RECRUITER", "Recruiter"],
  ["HIRING_MANAGER", "Hiring manager"],
  ["REFERRER", "Referrer"],
  ["INTERVIEWER", "Interviewer"],
  ["OTHER", "Other"],
] as const;

/** Position in the pipeline; -1 for closed statuses, which aren't stages anyone progresses through. */
export const rank = (s: Status) => (PIPELINE as readonly string[]).indexOf(s);

const DAY = 86_400_000;
// Days roll over at midnight Pakistan time (market: Pakistan first). Date-only values are stored at UTC midnight,
// which this offset leaves on the same day. A per-user time zone can replace it when the product goes global.
const OFFSET = 5 * 3_600_000;

export const dayNumber = (d: Date) => Math.floor((d.getTime() + OFFSET) / DAY);
export const dayDate = (n: number) => new Date(n * DAY);
export const today = (now = new Date()) => dayDate(dayNumber(now));
export const toDateInput = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
export const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

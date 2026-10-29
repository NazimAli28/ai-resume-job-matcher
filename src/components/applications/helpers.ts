import { CLOSED, PIPELINE } from "@/demo/labels";
import type { Application, ApplicationStatus } from "@/demo/types";
import { TODAY, daysBetween } from "@/lib/dates";

export type ColumnId = ApplicationStatus | "CLOSED";

export const ALL_STATUSES: ApplicationStatus[] = [...PIPELINE, ...CLOSED];

export function columnOf(status: ApplicationStatus): ColumnId {
  return CLOSED.includes(status) ? "CLOSED" : status;
}

/** Status given to a card dropped on a column. Dropping on "Closed" means rejected; use the menu for withdrawn/ghosted. */
export function statusForColumn(col: ColumnId): ApplicationStatus {
  return col === "CLOSED" ? "REJECTED" : col;
}

export const isClosed = (s: ApplicationStatus) => CLOSED.includes(s);

/** Applications that count as live: sent and not finished. */
export const ACTIVE_STATUSES: ApplicationStatus[] = ["APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEWING", "OFFER"];

export function dueDays(app: Application): number | null {
  return app.nextAction ? daysBetween(TODAY, app.nextAction.due) : null;
}

export function isOverdue(app: Application): boolean {
  const d = dueDays(app);
  return d !== null && d <= 0 && !isClosed(app.status);
}

export function monthYear(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** Count-badge tone per kanban column (tokens only). */
export const COLUMN_TONE: Record<ColumnId, string> = {
  SAVED: "bg-sunken text-ink",
  APPLIED: "bg-partial-soft text-partial",
  SCREENING: "bg-partial-soft text-partial",
  ASSESSMENT: "bg-hl-soft text-hl-ink",
  INTERVIEWING: "bg-hl-soft text-hl-ink",
  OFFER: "bg-hl text-on-hl",
  ACCEPTED: "bg-hl text-on-hl",
  REJECTED: "bg-warn-soft text-warn",
  WITHDRAWN: "bg-warn-soft text-warn",
  GHOSTED: "bg-warn-soft text-warn",
  CLOSED: "bg-warn-soft text-warn",
};

const RESPONDED: ApplicationStatus[] = ["SCREENING", "ASSESSMENT", "INTERVIEWING", "OFFER", "ACCEPTED", "REJECTED"];

/** Summary numbers for the tracker header, computed from the applications passed in. */
export function trackerStats(apps: Application[]) {
  const sent = apps.filter((a) => a.appliedAt || a.history.some((h) => h.status === "APPLIED"));
  const responded = sent.filter((a) => a.history.some((h) => RESPONDED.includes(h.status)) || RESPONDED.includes(a.status));
  return {
    active: apps.filter((a) => ACTIVE_STATUSES.includes(a.status)).length,
    interviewing: apps.filter((a) => a.status === "INTERVIEWING").length,
    offers: apps.filter((a) => a.status === "OFFER" || a.status === "ACCEPTED").length,
    responseRate: sent.length ? Math.round((responded.length / sent.length) * 100) : 0,
    sent: sent.length,
    responded: responded.length,
  };
}

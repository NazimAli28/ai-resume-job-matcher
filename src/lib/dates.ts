/** The demo's fixed "today", so sample data stays meaningful whenever it's opened. */
export const TODAY = "2026-10-21";

const DAY = 86_400_000;

export function daysBetween(fromIso: string, toIso: string = TODAY): number {
  return Math.round((Date.parse(toIso.slice(0, 10)) - Date.parse(fromIso.slice(0, 10))) / DAY);
}

/** "21 Oct" or "21 Oct 2025" when the year differs from the demo year. */
export function formatDate(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const sameYear = d.getUTCFullYear() === Number(TODAY.slice(0, 4));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" });
}

/** "today", "tomorrow", "in 3 days", "2 days ago". */
export function relativeDay(iso: string): string {
  const n = daysBetween(TODAY, iso);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

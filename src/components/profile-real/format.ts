/** Date helpers for the profile screens. All dates are stored as UTC month starts. */

export function monthLabel(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : "";
}

/** Date to the YYYY-MM string a month input expects. */
export function monthValue(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 7) : "";
}

/** "Mar 2022 – Present" for roles; "Mar 2022 – Jun 2024" or a single date for the rest. */
export function periodLabel(start: Date | null, end: Date | null, openEnded = false): string {
  const s = monthLabel(start);
  const e = monthLabel(end);
  if (openEnded) return `${s} – ${e || "Present"}`;
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

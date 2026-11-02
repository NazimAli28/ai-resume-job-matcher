import { requireUser } from "@/server/auth/user";
import { rateLimit } from "@/server/ratelimit";
import { STATUS_LABELS, toDateInput } from "@/server/tracker/constants";
import { toCsv } from "@/server/tracker/csv";
import { listApplications } from "@/server/tracker/service";
import { JOB_SOURCES } from "@/server/match/schemas";

export const dynamic = "force-dynamic";

const sourceLabel = (k: string) => JOB_SOURCES.find(([s]) => s === k)?.[1] ?? "Other";

/** The user's own applications as CSV (TRK-050). ?file=history gives the status changes as a second file. */
export async function GET(request: Request) {
  const user = await requireUser();
  if (!(await rateLimit(`tracker:export:${user.id}`, 30, 3600)).ok) return new Response("Too many downloads. Please wait a little.", { status: 429 });
  const apps = await listApplications(user.id);
  const history = new URL(request.url).searchParams.get("file") === "history";

  const rows = history
    ? [
        ["Company", "Title", "From", "To", "Changed at (UTC)", "Note"],
        ...apps.flatMap((a) => a.history.map((h) => [a.company, a.title, h.fromStatus ? STATUS_LABELS[h.fromStatus] : "", STATUS_LABELS[h.toStatus], h.changedAt.toISOString(), h.note])),
      ]
    : [
        ["Company", "Title", "Location", "Status", "Source", "Source detail", "Applied", "Deadline", "Next action", "Next action date", "Expected salary", "Match estimate when linked", "Resume version", "Link", "Notes"],
        ...apps.map((a) => [
          a.company,
          a.title,
          a.location,
          STATUS_LABELS[a.status],
          sourceLabel(a.source),
          a.sourceDetail,
          toDateInput(a.appliedAt),
          toDateInput(a.deadline),
          a.nextActionNote,
          toDateInput(a.nextActionAt),
          a.salaryExpected,
          a.matchScore,
          a.resumeVersion ? `${a.resumeVersion.label} ${a.resumeVersion.name}` : "",
          a.url,
          a.notes,
        ]),
      ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${history ? "application-history" : "applications"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

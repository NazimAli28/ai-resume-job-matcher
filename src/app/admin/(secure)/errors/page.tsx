import type { Metadata } from "next";
import { ResolveError } from "@/components/admin/controls";
import { LocalTime } from "@/components/tracker/local-time";
import { requireAdmin } from "@/server/admin/guard";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Errors" };

export default async function AdminErrorsPage() {
  await requireAdmin();
  const errors = await db.errorEvent.findMany({ where: { resolvedAt: null }, orderBy: { lastSeenAt: "desc" }, take: 100, select: { id: true, source: true, route: true, errorClass: true, message: true, count: true, lastSeenAt: true } });
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-bold leading-tight">Open errors</h1>
      {errors.length === 0 ? (
        <p className="text-muted">Nothing open.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {errors.map((e) => (
            <li key={e.id} className="card flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="break-words font-semibold">{e.errorClass} · {e.route ?? e.source}</span>
                <span className="break-words text-muted">{e.message}</span>
                <span className="text-[13px] text-muted">Seen {e.count} time{e.count === 1 ? "" : "s"}, last <LocalTime iso={e.lastSeenAt.toISOString()} /></span>
              </div>
              <ResolveError id={e.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

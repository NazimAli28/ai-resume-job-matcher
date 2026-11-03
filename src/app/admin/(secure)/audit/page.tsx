import type { Metadata } from "next";
import Link from "next/link";
import { LocalTime } from "@/components/tracker/local-time";
import { requireAdmin } from "@/server/admin/guard";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  await requireAdmin();
  const { action } = await searchParams;
  const filter = typeof action === "string" && /^[A-Z_]{1,40}$/.test(action) ? action : undefined;
  const [rows, actions] = await Promise.all([
    db.auditLog.findMany({ where: filter ? { action: filter } : {}, orderBy: { createdAt: "desc" }, take: 100 }),
    db.auditLog.groupBy({ by: ["action"], _count: true, orderBy: { action: "asc" } }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-bold leading-tight">Audit log</h1>
      <nav aria-label="Filter by event" className="flex flex-wrap gap-1 text-sm">
        <Link href="/admin/audit" className={`inline-flex min-h-10 items-center rounded-xl px-3 font-semibold ${filter ? "text-muted hover:bg-sunken" : "bg-hl-soft"}`}>All</Link>
        {actions.map((a) => (
          <Link key={a.action} href={`/admin/audit?action=${a.action}`} className={`inline-flex min-h-10 items-center rounded-xl px-3 font-semibold ${filter === a.action ? "bg-hl-soft" : "text-muted hover:bg-sunken"}`}>
            {a.action} ({a._count})
          </Link>
        ))}
      </nav>
      <div className="card overflow-x-auto p-4" tabIndex={0} aria-label="Audit log table">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">When</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Event</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Account</th>
              <th scope="col" className="py-2 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-rule align-top last:border-0">
                <td className="whitespace-nowrap py-2 pr-3 text-muted"><LocalTime iso={r.createdAt.toISOString()} /></td>
                <th scope="row" className="py-2 pr-3 text-left font-semibold">{r.action}</th>
                <td className="py-2 pr-3 font-mono text-[13px] text-muted">{r.subjectUserId?.slice(0, 8) ?? "none"}</td>
                <td className="break-words py-2 text-[13px] text-muted">{r.metadata ? JSON.stringify(r.metadata) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

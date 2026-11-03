import type { Metadata } from "next";
import Link from "next/link";
import { BlockUser } from "@/components/admin/controls";
import { maskEmail, requireAdmin } from "@/server/admin/guard";
import { adminUsers } from "@/server/admin/metrics";
import { fmtDay } from "@/server/tracker/constants";

export const metadata: Metadata = { title: "Users" };

/** Accounts and counts only. There is deliberately no way to open anyone's resumes, jobs or notes from here (ADM-002). */
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await requireAdmin();
  const { page: rawPage } = await searchParams;
  const page = Math.max(0, Math.min(10_000, Number.parseInt(rawPage ?? "0", 10) || 0));
  const { rows, more } = await adminUsers(page);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-bold leading-tight">Users</h1>
      <div className="card overflow-x-auto p-4" tabIndex={0} aria-label="Users table">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">Account</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Joined</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Last active</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Resumes / jobs / applications</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Status</th>
              <th scope="col" className="py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const label = maskEmail(u.email);
              return (
                <tr key={u.id} className="border-b border-rule last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">
                    {label}
                    <span className="block text-[13px] font-normal text-muted">{u.role} · {u.plan}{u.emailVerified ? "" : " · unconfirmed"}</span>
                  </th>
                  <td className="whitespace-nowrap py-2 pr-3 text-muted">{fmtDay(u.createdAt)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-muted">{fmtDay(u.lastSeenAt)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{u._count.versions} / {u._count.jobs} / {u._count.applications}</td>
                  <td className="py-2 pr-3">{u.deletedAt ? "Being deleted" : u.blockedAt ? "Blocked" : "Active"}</td>
                  <td className="py-2">{u.id !== admin.id && <BlockUser userId={u.id} blocked={Boolean(u.blockedAt)} label={label} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 text-sm font-semibold">
        {page > 0 && <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={`/admin/users?page=${page - 1}`}>Newer</Link>}
        {more && <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={`/admin/users?page=${page + 1}`}>Older</Link>}
      </div>
    </div>
  );
}

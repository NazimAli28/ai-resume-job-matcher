import type { Metadata } from "next";
import { MarkRead } from "@/components/admin/controls";
import { LocalTime } from "@/components/tracker/local-time";
import { maskEmail, requireAdmin } from "@/server/admin/guard";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Feedback" };

export default async function AdminFeedbackPage() {
  await requireAdmin();
  const items = await db.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { email: true } } } });
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-bold leading-tight">Feedback</h1>
      {items.length === 0 ? (
        <p className="text-muted">No messages yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((f) => (
            <li key={f.id} className="card flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[13px] text-muted">{maskEmail(f.user.email)} · <LocalTime iso={f.createdAt.toISOString()} /></span>
                <p className="whitespace-pre-wrap break-words">{f.message}</p>
              </div>
              {!f.readAt && <MarkRead id={f.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

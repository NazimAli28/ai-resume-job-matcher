"use client";

import { CalendarClock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_LABEL, StatusChip } from "@/components/ui/chip";
import { bandFor } from "@/components/ui/score";
import { cn } from "@/lib/cn";
import { TODAY, formatDate, relativeDay } from "@/lib/dates";
import { SOURCE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { Application } from "@/demo/types";
import { ALL_STATUSES, isOverdue } from "./helpers";
import { InitialTile } from "./tile";

export function NextAction({ app, className }: { app: Application; className?: string }) {
  if (!app.nextAction) return null;
  const overdue = isOverdue(app);
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-sm",
        overdue ? "w-fit rounded-full bg-warn-soft px-2.5 py-0.5 font-semibold text-warn" : "text-muted",
        className,
      )}
    >
      <CalendarClock className="size-4 shrink-0" aria-hidden />
      <span>
        {app.nextAction.label}, {relativeDay(app.nextAction.due)}
        {overdue && app.nextAction.due < TODAY ? " (overdue)" : ""}
      </span>
    </p>
  );
}

export function ResumeChip({ app }: { app: Application }) {
  const { resumeById } = useDemo();
  const r = resumeById(app.resumeVersionId);
  if (!r) return null;
  return (
    <Link
      href={`/demo/resumes/${r.id}`}
      className="inline-flex min-h-7 items-center rounded-full border border-rule px-2.5 text-[13px] font-semibold hover:border-hl-ink hover:bg-hl-soft"
    >
      Sent with {r.label}
    </Link>
  );
}

export function MoveSelect({ app, onMove }: { app: Application; onMove: (id: string, s: Application["status"]) => void }) {
  return (
    <select
      aria-label={`Move ${app.company} to another stage`}
      value=""
      onChange={(e) => e.target.value && onMove(app.id, e.target.value as Application["status"])}
      className="h-11 w-full rounded-xl border border-rule bg-surface px-2 text-sm text-muted hover:border-rule-strong"
    >
      <option value="">Move to…</option>
      {ALL_STATUSES.filter((s) => s !== app.status).map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

/** Presentational card used by the board, the drag overlay and the mobile list. */
export function AppCard({
  app,
  onOpen,
  onMove,
  handle,
  showStatus,
  floating,
}: {
  app: Application;
  onOpen?: (id: string) => void;
  onMove?: (id: string, s: Application["status"]) => void;
  handle?: ReactNode;
  showStatus?: boolean;
  floating?: boolean;
}) {
  const { matchFor } = useDemo();
  const m = matchFor(app.jobId);
  return (
    <div
      className={cn("card flex flex-col gap-2.5 p-3", !floating && "card-hover", floating && "scale-[1.03] rotate-1 border-hl-ink cursor-grabbing")}
      style={floating ? { boxShadow: "0 24px 48px -12px rgb(0 0 0 / 0.35), 0 0 0 1px rgb(var(--hl-rgb) / 0.45)" } : undefined}
    >
      <div className="flex items-start gap-3">
        <InitialTile name={app.company} size={40} />
        <button type="button" onClick={() => onOpen?.(app.id)} className="min-h-11 min-w-0 flex-1 text-left">
          <span className="block truncate font-semibold">{app.company}</span>
          <span className="block truncate text-sm text-muted">{app.title}</span>
        </button>
        {handle}
      </div>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
        {showStatus && <StatusChip value={app.status} />}
        {m && (
          <span className="rounded-full bg-hl-soft px-2 py-0.5 text-xs font-semibold text-hl-ink">{bandFor(m.score).word} match</span>
        )}
        <span>{SOURCE_LABEL[app.source]}</span>
        {app.appliedAt && <span>Applied {formatDate(app.appliedAt)}</span>}
      </div>
      <div>
        <ResumeChip app={app} />
      </div>
      <NextAction app={app} />
      {onMove && <MoveSelect app={app} onMove={onMove} />}
    </div>
  );
}

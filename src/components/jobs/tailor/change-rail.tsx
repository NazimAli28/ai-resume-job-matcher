"use client";

import { Check, Download, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ResumeVersion } from "@/demo/types";
import { KIND_LABEL } from "./bits";
import type { SuggestionApi } from "./use-suggestions";

/** Small progress ring showing accepted/total. Text carries the numbers; the arc is the mark. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 88;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${done} of ${total} changes accepted`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--viz)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
          style={{ filter: "drop-shadow(0 0 6px rgb(var(--hl-rgb) / 0.35))" }}
        />
      </svg>
      <div aria-hidden className="absolute inset-0 grid place-items-center">
        <span className="font-display text-xl font-bold tabular-nums leading-none">
          {done}
          <span className="text-sm font-semibold text-muted">/{total}</span>
        </span>
      </div>
    </div>
  );
}

export function ChangeRail({
  api,
  onAcceptSafe,
  onSave,
  onDownload,
  saved,
  limitReached,
  limit,
}: {
  api: SuggestionApi;
  onAcceptSafe: () => void;
  onSave: () => void;
  onDownload: () => void;
  saved?: ResumeVersion;
  limitReached: boolean;
  limit: number;
}) {
  const accepted = api.list.filter((s) => s.status === "ACCEPTED").length;
  const pending = api.list.filter((s) => s.status === "PENDING");
  const skipped = api.list.filter((s) => s.status === "REJECTED").length;
  const safePending = pending.filter((s) => s.safe && s.kind !== "QUESTION").length;

  return (
    <aside aria-label="Changes" className="card flex flex-col gap-4 bg-surface/80 p-4 backdrop-blur-md lg:sticky lg:top-6">
      <div className="flex items-center gap-4">
        <ProgressRing done={accepted} total={api.list.length} />
        <dl className="grid flex-1 grid-cols-3 gap-2 text-center" aria-live="polite">
          <div><dt className="text-xs text-muted">Accepted</dt><dd className="font-display text-xl font-bold tabular-nums">{accepted}</dd></div>
          <div><dt className="text-xs text-muted">Pending</dt><dd className="font-display text-xl font-bold tabular-nums">{pending.length}</dd></div>
          <div><dt className="text-xs text-muted">Skipped</dt><dd className="font-display text-xl font-bold tabular-nums">{skipped}</dd></div>
        </dl>
      </div>

      <Button onClick={onAcceptSafe} disabled={!safePending}>
        <Sparkles className="size-4" aria-hidden />
        Accept all wording-only changes{safePending ? ` (${safePending})` : ""}
      </Button>
      <p className="-mt-2 text-xs text-muted">Changes that add a claim or need your answer stay for you to review one by one.</p>

      {pending.length > 0 && (
        <nav aria-label="Pending changes">
          <h3 className="pb-1 text-sm font-semibold">Still to review</h3>
          <ul className="flex max-h-60 flex-col overflow-y-auto">
            {pending.map((s) => (
              <li key={s.id}>
                <a href={`#chg-${s.id}`} className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-2 text-sm hover:bg-sunken">
                  <span className="truncate">{KIND_LABEL[s.kind]}: {s.section}</span>
                  {!s.safe && <span className="shrink-0 rounded-full bg-warn-soft px-2 text-xs font-semibold text-warn">claim</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="flex flex-col gap-2 border-t border-rule pt-4">
        {saved ? (
          <p className="flex items-start gap-2 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-hl text-on-hl">
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </span>
            <span>
              Saved as <span className="font-semibold">{saved.label}: {saved.name}</span>.{" "}
              <Link href="/demo/resumes" className="font-semibold text-hl-ink underline underline-offset-4">See your resumes</Link>
            </span>
          </p>
        ) : limitReached ? (
          <p className="rounded-xl bg-sunken p-3 text-sm">
            You&apos;ve used all {limit} tailored versions on your plan this month. You can still copy changes from the Suggestions only tab.
          </p>
        ) : (
          <Button variant="primary" onClick={onSave} disabled={!accepted}>
            <Save className="size-4" aria-hidden />
            Save as new version
          </Button>
        )}
        {!saved && !accepted && !limitReached && <p className="text-xs text-muted">Accept at least one change to save a new version.</p>}
        <Button onClick={onDownload}>
          <Download className="size-4" aria-hidden />
          Download
        </Button>
      </div>
    </aside>
  );
}

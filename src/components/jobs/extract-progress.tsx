import { Check, ClipboardPaste, Loader2, ScanSearch, ListChecks } from "lucide-react";
import { cn } from "@/lib/cn";

const FLOW = [
  { label: "Paste", icon: ClipboardPaste },
  { label: "Read", icon: ScanSearch },
  { label: "Review", icon: ListChecks },
] as const;

/** Three-step header for the add-job sheet: paste, read, review. `index` is the current step (0-2). */
export function JobStepper({ index }: { index: number }) {
  return (
    <ol className="relative mb-6 grid grid-cols-3" aria-label="Progress">
      <span aria-hidden className="absolute left-[16.7%] right-[16.7%] top-4 h-0.5 -translate-y-1/2 rounded-full bg-rule" />
      <span
        aria-hidden
        className="absolute left-[16.7%] top-4 h-0.5 -translate-y-1/2 rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${index * 33.3}%`, background: "var(--viz)" }}
      />
      {FLOW.map((s, i) => {
        const Icon = s.icon;
        const done = i < index;
        const current = i === index;
        return (
          <li key={s.label} aria-current={current ? "step" : undefined} className="relative flex flex-col items-center gap-1">
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full border-2 transition-all",
                done ? "border-hl-ink bg-hl text-on-hl" : current ? "border-hl-ink bg-surface text-hl-ink glow" : "border-rule bg-surface text-muted",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <Icon className="size-4" aria-hidden />}
            </span>
            <span className={cn("text-xs font-semibold", current ? "text-ink" : "text-muted")}>
              {s.label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Honest stage labels while the (simulated) extraction runs, with a shimmering preview of the requirement list. */
export function ExtractProgress({ stages, current }: { stages: string[]; current: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-5">
      <p className="rounded-xl bg-sunken px-3 py-2 text-sm text-muted">This is a demo, so the reading happens in your browser with simple rules.</p>
      <ol className="flex flex-col gap-3">
        {stages.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-3", i > current && "text-muted")}>
            {i < current ? (
              <span className="grid size-6 place-items-center rounded-full bg-hl text-on-hl">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
            ) : i === current ? (
              <span className="grid size-6 place-items-center rounded-full border-2 border-hl-ink glow">
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
              </span>
            ) : (
              <span className="size-6 rounded-full border-2 border-rule" aria-hidden />
            )}
            <span className={cn(i === current && "font-semibold")}>{s}</span>
            {i < current && <span className="sr-only">(done)</span>}
          </li>
        ))}
      </ol>
      <div aria-hidden className="flex flex-col gap-3 rounded-2xl border border-rule p-4">
        {[3, 5, 4, 5].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="shimmer h-6 w-16 rounded-full" />
            <span className="shimmer h-3 rounded-full" style={{ width: `${w * 15}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

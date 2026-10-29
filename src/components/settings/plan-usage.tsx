"use client";

import { RingScore } from "@/components/ui/charts";
import { cn } from "@/lib/cn";
import { useDemo } from "@/demo/store";
import type { Usage } from "@/demo/types";

const METERS: { key: keyof Usage; label: string }[] = [
  { key: "analyses", label: "Resume analyses" },
  { key: "tailored", label: "Tailored versions" },
  { key: "coverLetters", label: "Cover letters" },
  { key: "interviews", label: "Mock interviews" },
];

export function PlanUsage() {
  const { state } = useDemo();
  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-hl px-3 py-0.5 text-sm font-bold text-on-hl glow">Free beta</span>
        <span className="text-muted">Everything is free while we test. These limits reset every month.</span>
      </p>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METERS.map(({ key, label }) => {
          const used = state.usage[key];
          const max = state.limits[key];
          const full = used >= max;
          const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
          return (
            <li key={key} className={cn("flex flex-col items-center gap-2 rounded-2xl border p-4 text-center", full ? "border-warn/50 bg-warn-soft" : "border-rule bg-sunken/50")}>
              <RingScore value={pct} size={84} stroke={9} label={`${label}: ${used} of ${max} used`} sublabel={`${used}/${max}`} />
              <span className="text-sm font-semibold">{label}</span>
              <span className={cn("text-xs tabular-nums", full ? "font-semibold text-warn" : "text-muted")}>
                {full ? "Limit reached" : `${max - used} left`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">
        Paid plans are planned for later (a monthly Pro plan and a short job-hunt Sprint pass). Nothing to buy now, and we will tell you well before anything changes.
      </p>
    </div>
  );
}

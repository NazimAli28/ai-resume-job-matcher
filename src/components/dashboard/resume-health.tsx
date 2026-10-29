"use client";

import { ArrowDownRight, ArrowUpRight, FileText } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { RingScore } from "@/components/ui/charts";
import { EstimateTag, SeverityChip } from "@/components/ui/chip";
import { bandFor } from "@/components/ui/score";
import { cn } from "@/lib/cn";
import { useDemo } from "@/demo/store";
import type { Severity } from "@/demo/types";
import { CardHeader, linkClass } from "./ui";

const SEVERITY_ORDER: Severity[] = ["HIGH", "MEDIUM", "LOW", "TIP"];

function Delta({ now, before, versus }: { now: number; before?: number; versus?: string }) {
  if (before === undefined) return <span className="text-xs text-muted">First version</span>;
  const d = now - before;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold",
        d > 0 ? "bg-hl-soft text-hl-ink" : d < 0 ? "bg-warn-soft text-warn" : "bg-sunken text-muted",
      )}
    >
      {d > 0 && <ArrowUpRight className="size-3.5" aria-hidden />}
      {d < 0 && <ArrowDownRight className="size-3.5" aria-hidden />}
      {d === 0 ? `Same as ${versus}` : `${d > 0 ? "+" : "−"}${Math.abs(d)} vs ${versus}`}
    </span>
  );
}

export function ResumeHealthCard() {
  const { state, activeResume: r } = useDemo();
  if (!r) {
    return (
      <section aria-labelledby="rh-title" className="card flex h-full flex-col gap-4 p-5 sm:p-6">
        <CardHeader icon={FileText} id="rh-title" title="Resume health" />
        <p className="text-muted">Upload a resume to see how well parsers can read it.</p>
        <div><ButtonLink href="/app/resumes" variant="primary">Analyze a resume</ButtonLink></div>
      </section>
    );
  }
  const older = state.resumes
    .filter((x) => x.createdAt < r.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const open = r.findings
    .filter((f) => !f.resolved)
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  const rings = [
    { title: "Parse health", value: r.parseHealth, before: older?.parseHealth },
    { title: "Readability", value: r.readability, before: older?.readability },
  ];

  return (
    <section aria-labelledby="rh-title" className="card flex h-full flex-col gap-5 p-5 sm:p-6">
      <CardHeader
        icon={FileText}
        id="rh-title"
        title="Resume health"
        sub={`${r.label}, ${r.name}`}
        action={<EstimateTag />}
      />
      <div className="grid grid-cols-2 gap-3">
        {rings.map((g) => (
          <div key={g.title} className="flex flex-col items-center gap-2 rounded-2xl bg-sunken/60 px-2 py-4 text-center">
            <RingScore value={g.value} size={88} stroke={8} label={`${g.title} estimate`} sublabel={bandFor(g.value).word} />
            <span className="text-sm font-semibold">{g.title}</span>
            <Delta now={g.value} before={g.before} versus={older?.label} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">
          {open.length === 0 ? "No open fixes. Nice work." : `${open.length} open ${open.length === 1 ? "fix" : "fixes"}, top ${Math.min(2, open.length)}:`}
        </p>
        {open.length > 0 && (
          <ul className="flex flex-col gap-2">
            {open.slice(0, 2).map((f) => (
              <li key={f.id} className="flex items-start gap-2">
                <SeverityChip value={f.severity} />
                <span className="pt-0.5 text-sm leading-snug">{f.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-auto">
        <Link href={`/app/resumes/${r.id}`} className={linkClass}>
          Review fixes
        </Link>
      </div>
    </section>
  );
}

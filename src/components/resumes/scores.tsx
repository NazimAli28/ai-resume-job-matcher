"use client";

import { EstimateTag } from "@/components/ui/chip";
import { bandFor } from "@/components/ui/score";
import type { ResumeVersion } from "@/demo/types";
import { cn } from "@/lib/cn";
import { AnimatedRing, ValueBar } from "./visual";

/** One big ring with band word, estimate tag and basis line. */
function ScoreRing({ title, value, basis, size, delay }: { title: string; value: number; basis: string; size: number; delay?: number }) {
  const band = bandFor(value);
  return (
    <div className="flex items-center gap-4">
      <AnimatedRing value={value} size={size} stroke={Math.round(size / 10)} label={title} delay={delay} />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-lg font-bold">{title}</span>
          <EstimateTag />
        </div>
        <span className={cn("font-semibold", band.tone === "low" ? "text-warn" : "text-hl-ink")}>{band.word}</span>
        <p className="text-sm text-muted">{basis}</p>
      </div>
    </div>
  );
}

/** ParseHealth and Readability side by side, each with its basis line. */
export function ScorePair({ resume, className, size = 112 }: { resume: ResumeVersion; className?: string; size?: number }) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2", className)}>
      <ScoreRing
        title="Parse health"
        value={resume.parseHealth}
        size={size}
        basis={`How reliably a system can read this file. From ${resume.parseBreakdown.length} checks, listed in the report.`}
      />
      <ScoreRing
        title="Readability"
        value={resume.readability}
        size={size}
        delay={0.15}
        basis={`How easy it is to skim. From ${resume.readabilityBreakdown.length} checks, listed in the report.`}
      />
    </div>
  );
}

/** One row per check: label, value and a bar. */
export function BreakdownRows({
  rows,
  heading,
}: {
  rows: { label: string; value: number }[];
  heading: string;
}) {
  return (
    <div>
      <h3 className="pb-3 text-sm font-semibold">{heading}</h3>
      <ul className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <li key={r.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
            <span className="text-sm">{r.label}</span>
            <span className="text-sm font-semibold tabular-nums">{r.value}</span>
            <ValueBar value={r.value} label={`${r.label}: ${r.value} out of 100`} delay={i * 0.05} className="col-span-2 h-1.5" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Report hero: two large rings, each with its check breakdown underneath. */
export function ScoreHero({ resume }: { resume: ResumeVersion }) {
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-10">
      <div className="flex flex-col gap-6">
        <ScoreRing
          title="Parse health"
          value={resume.parseHealth}
          size={132}
          basis={`How reliably a system can read this file. From ${resume.parseBreakdown.length} checks.`}
        />
        <BreakdownRows heading="Parse health checks" rows={resume.parseBreakdown} />
      </div>
      <div className="flex flex-col gap-6 md:border-l md:border-rule md:pl-10">
        <ScoreRing
          title="Readability"
          value={resume.readability}
          size={132}
          delay={0.15}
          basis={`How easy it is to skim. From ${resume.readabilityBreakdown.length} checks.`}
        />
        <BreakdownRows heading="Readability checks" rows={resume.readabilityBreakdown} />
      </div>
    </div>
  );
}

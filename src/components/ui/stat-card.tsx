"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Sparkline, type Point } from "./charts";
import { AnimatedNumber } from "./motion";

/**
 * Dashboard stat card: icon chip, count-up value, a delta pill that says what changed in words,
 * and an optional sparkline. Optional href makes the whole card a link.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  delta,
  trend,
  footnote,
  href,
  emphasis,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  delta?: { value: string; direction: "up" | "down" | "flat"; good?: boolean };
  trend?: Point[];
  footnote?: ReactNode;
  href?: string;
  emphasis?: boolean;
}) {
  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            emphasis ? "bg-hl text-on-hl glow" : "bg-hl-soft text-hl-ink",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex max-w-full items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold",
              delta.direction === "flat"
                ? "bg-sunken text-muted"
                : delta.good === false
                  ? "bg-warn-soft text-warn"
                  : "bg-hl-soft text-hl-ink",
            )}
          >
            {delta.direction === "up" && <ArrowUpRight className="size-3.5" aria-hidden />}
            {delta.direction === "down" && <ArrowDownRight className="size-3.5" aria-hidden />}
            {delta.value}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-muted">{label}</span>
          <AnimatedNumber value={value} suffix={suffix} className="font-display text-[34px] font-bold leading-tight tabular-nums" />
        </div>
        {trend && trend.length > 1 && <Sparkline data={trend} label={`${label} trend`} className="w-20 shrink-0 2xl:w-24" height={36} />}
      </div>
      {footnote && <p className="mt-1 text-xs text-muted">{footnote}</p>}
    </>
  );
  const cls = "card card-hover flex h-full flex-col p-5";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

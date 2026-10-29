"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/*
 * Chart kit (inline SVG, no library). Rules from the dataviz skill:
 * - single-series marks use --viz (validated ≥3:1 on light and dark surfaces);
 * - thin marks, 2px lines, rounded data ends, recessive axes;
 * - every chart has an accessible summary and a hover/focus tooltip;
 * - text uses ink/muted tokens, never the series color.
 */

export interface Point {
  label: string;
  value: number;
}

/** Tiny trend line with soft area fill. Hover/focus a point to read it. */
export function Sparkline({
  data,
  label,
  height = 40,
  className,
}: {
  data: Point[];
  label: string;
  height?: number;
  className?: string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const w = 120;
  const h = height;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((d, i) => [i * step, h - 4 - (d.value / max) * (h - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const last = data[data.length - 1];

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="block h-full w-full overflow-visible"
        style={{ height: h }}
        role="img"
        aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--viz)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--viz)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" stroke="var(--viz)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="draw" />
        {pts.map(([x], i) => (
          <rect key={i} x={x - step / 2} y={0} width={step} height={h} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover !== null && <circle cx={pts[hover][0]} cy={pts[hover][1]} r="3.5" fill="var(--viz)" stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-paper shadow" style={{ left: `${(pts[hover][0] / w) * 100}%` }}>
          {data[hover].label}: {data[hover].value}
        </div>
      )}
      <span className="sr-only">Latest: {last?.label} {last?.value}</span>
    </div>
  );
}

/** Single-value ring (0–100) with the number in the middle. */
export function RingScore({
  value,
  size = 96,
  stroke = 9,
  label,
  sublabel,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  sublabel?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${value} out of 100`} className="-rotate-90">
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
      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="flex flex-col items-center leading-none">
          <span className="font-display font-bold tabular-nums" style={{ fontSize: size * 0.28 }}>
            {value}
          </span>
          {sublabel && <span className="mt-1 text-[11px] font-semibold text-muted">{sublabel}</span>}
        </div>
      </div>
    </div>
  );
}

/** Vertical bar chart for a short series (e.g. applications per week). Hover/focus bars for values. */
export function BarChart({
  data,
  label,
  height = 160,
  highlightLast = true,
  className,
}: {
  data: Point[];
  label: string;
  height?: number;
  highlightLast?: boolean;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = [0, Math.ceil(max / 2), max];
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="relative flex gap-2" style={{ height }}>
        <div className="-my-1.5 flex w-5 flex-col justify-between text-right text-[11px] tabular-nums text-muted" aria-hidden>
          {[...ticks].reverse().map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="relative flex flex-1 items-end gap-[6px] border-b border-rule pb-0" role="list" aria-label={label}>
          {ticks.slice(1).map((t) => (
            <div key={t} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed border-rule" style={{ bottom: `${(t / max) * 100}%` }} />
          ))}
          {data.map((d, i) => {
            const isLast = highlightLast && i === data.length - 1;
            return (
              <div key={d.label} role="listitem" className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <button
                  type="button"
                  aria-label={`${d.label}: ${d.value}`}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="w-full rounded-t-[4px] transition-[height,opacity] duration-500 ease-out focus-visible:outline-2"
                  style={{
                    height: `${(d.value / max) * 100}%`,
                    minHeight: d.value ? 4 : 2,
                    background: "var(--viz)",
                    opacity: hover === null ? (isLast ? 1 : 0.82) : hover === i ? 1 : 0.45,
                    boxShadow: hover === i ? "0 0 18px -2px rgb(var(--hl-rgb) / 0.55)" : undefined,
                  }}
                />
                {hover === i && (
                  <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-paper">
                    {d.value}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-[6px] pl-7 text-[11px] text-muted" aria-hidden>
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center">
            {d.label}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

/** Horizontal funnel: one row per stage, bar length = count, label + count in text tokens. */
export function Funnel({ data, label, className }: { data: Point[]; label: string; className?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className={cn("flex flex-col gap-2.5", className)} aria-label={label}>
      {data.map((d, i) => (
        <li key={d.label} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
          <span className="truncate text-muted">{d.label}</span>
          <div className="h-2.5 rounded-full bg-sunken">
            <div
              className="meter-fill h-2.5 rounded-full"
              style={{
                width: `${Math.max(d.value ? 4 : 0, (d.value / max) * 100)}%`,
                background: "var(--viz)",
                opacity: 1 - i * 0.1,
                animationDelay: `${i * 70}ms`,
              }}
            />
          </div>
          <span className="text-right font-semibold tabular-nums">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

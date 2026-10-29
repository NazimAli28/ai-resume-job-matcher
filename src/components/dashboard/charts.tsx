"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { BarChart3, Filter, Globe2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { BarChart, Funnel } from "@/components/ui/charts";
import { STATUS_LABEL } from "@/components/ui/chip";
import { useDemo } from "@/demo/store";
import { funnel, overview, rangeSentence, sources, type Range } from "./logic";
import { CardHeader, linkClass } from "./ui";

export function WeeklyChart({ range }: { range: Range }) {
  const { state } = useDemo();
  const reduce = useSkipMotion();
  const o = overview(state, range);
  const data = o.sentPerWeek;
  const best = data.reduce((m, p) => Math.max(m, p.value), 0);
  const avg = data.length ? Math.round((o.sentInRange / data.length) * 10) / 10 : 0;

  return (
    <section aria-labelledby="weekly-title" className="card flex h-full flex-col gap-5 p-5 sm:p-6">
      <CardHeader icon={BarChart3} id="weekly-title" title="Applications per week" sub="Weeks run Monday to Sunday. The last bar is this week." />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={range}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
        >
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <dt className="text-sm text-muted">Sent {rangeSentence(range)}</dt>
              <dd className="font-display text-2xl font-bold tabular-nums">{o.sentInRange}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Weekly average</dt>
              <dd className="font-display text-2xl font-bold tabular-nums">{avg}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Best week</dt>
              <dd className="font-display text-2xl font-bold tabular-nums">{best}</dd>
            </div>
          </dl>
        </motion.div>
      </AnimatePresence>
      <BarChart data={data} height={180} label={`Applications sent per week ${rangeSentence(range)}: ${data.map((d) => `week of ${d.label}, ${d.value}`).join("; ")}`} className="mt-auto" />
    </section>
  );
}

export function PipelineCard() {
  const { state } = useDemo();
  const rows = funnel(state.applications);
  const sent = rows.find((r) => r.status === "APPLIED")?.value ?? 0;
  const interviewed = rows.find((r) => r.status === "INTERVIEWING")?.value ?? 0;
  return (
    <section aria-labelledby="pipe-title" className="card flex h-full flex-col gap-5 p-5 sm:p-6">
      <CardHeader
        icon={Filter}
        id="pipe-title"
        title="Pipeline"
        sub="Applications that reached each stage"
        action={<Link href="/app/applications" className={linkClass}>Open board</Link>}
      />
      <Funnel data={rows.map((r) => ({ label: STATUS_LABEL[r.status], value: r.value }))} label="Applications that reached each stage or later" />
      <p className="mt-auto rounded-xl bg-sunken/70 px-3 py-2.5 text-sm">
        <span className="font-semibold">
          {interviewed} of {sent} {sent === 1 ? "application" : "applications"}
        </span>{" "}
        <span className="text-muted">reached interviews{sent ? ` (${Math.round((interviewed / sent) * 100)}%)` : ""}.</span>
      </p>
    </section>
  );
}

export function SourcesCard() {
  const { state } = useDemo();
  const rows = sources(state.applications);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = state.applications.length;
  const [hover, setHover] = useState<string | null>(null);
  return (
    <section aria-labelledby="src-title" className="card flex h-full flex-col gap-5 p-5 sm:p-6">
      <CardHeader icon={Globe2} id="src-title" title="Where your applications come from" sub={`${total} tracked ${total === 1 ? "application" : "applications"}`} />
      {rows.length === 0 ? (
        <p className="text-muted">Add an application and pick where you found it to see this breakdown.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Applications by source, most first">
          {rows.map((r, i) => (
            <li
              key={r.label}
              className="flex flex-col gap-1.5"
              onMouseEnter={() => setHover(r.label)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={hover === r.label ? "font-semibold text-ink" : "text-ink"}>{r.label}</span>
                <span className="tabular-nums text-muted">
                  <span className="font-semibold text-ink">{r.value}</span>
                  {hover === r.label && <span> ({Math.round((r.value / total) * 100)}%)</span>}
                </span>
              </div>
              <div className="h-2 rounded-full bg-sunken">
                <div
                  className="meter-fill h-2 rounded-full transition-opacity"
                  style={{
                    width: `${(r.value / max) * 100}%`,
                    background: "var(--viz)",
                    opacity: hover && hover !== r.label ? 0.45 : 1,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

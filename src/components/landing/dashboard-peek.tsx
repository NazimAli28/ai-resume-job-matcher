"use client";

import { MessageSquareReply, Send } from "lucide-react";
import { BarChart, type Point } from "@/components/ui/charts";
import { StatCard } from "@/components/ui/stat-card";
import { initialState } from "@/demo/data";
import { daysBetween, formatDate, TODAY } from "@/lib/dates";

// Everything below is computed from the demo data set; nothing is typed in by hand.
const WEEKS = 6;
const applied = initialState.applications.filter((a) => a.appliedAt);
const heardBack = initialState.applications.filter((a) => a.appliedAt && a.status !== "APPLIED").length;
const rejected = initialState.applications.filter((a) => a.status === "REJECTED").length;

const perWeek: Point[] = Array.from({ length: WEEKS }, (_, i) => {
  const k = WEEKS - 1 - i; // weeks ago
  const start = new Date(Date.parse(TODAY) - (k * 7 + 6) * 86_400_000).toISOString().slice(0, 10);
  const value = applied.filter((a) => {
    const d = daysBetween(a.appliedAt!);
    return d >= k * 7 && d <= k * 7 + 6;
  }).length;
  return { label: formatDate(start), value };
});

const thisWeek = perWeek[perWeek.length - 1].value;

/** Dashboard preview: two stat cards and applications per week, from Ayesha's sample data. */
export function DashboardPeek() {
  return (
    <div className="@container flex flex-col gap-4">
      <div className="grid gap-3 @lg:grid-cols-2">
        <StatCard
          icon={Send}
          label="Applications sent"
          value={applied.length}
          emphasis
          delta={{ value: `${thisWeek} this week`, direction: thisWeek ? "up" : "flat" }}
          trend={perWeek}
        />
        <StatCard
          icon={MessageSquareReply}
          label="Heard back"
          value={heardBack}
          footnote={`Of ${applied.length} sent. Rejections count too: ${rejected} so far.`}
        />
      </div>
      <div className="rounded-2xl border border-rule bg-surface p-4">
        <p className="pb-3 text-sm font-semibold">Applications per week</p>
        <BarChart
          data={perWeek}
          label={`Applications per week, last ${WEEKS} weeks: ${perWeek.map((p) => `week of ${p.label} ${p.value}`).join(", ")}`}
          height={110}
        />
      </div>
    </div>
  );
}

"use client";

import { useStoredString } from "@/components/applications/use-stored-state";
import { PipelineCard, SourcesCard, WeeklyChart } from "@/components/dashboard/charts";
import { GettingStarted } from "@/components/dashboard/checklist";
import { GhostingNudge } from "@/components/dashboard/ghosting-nudge";
import { GreetingCard, NextActionCard } from "@/components/dashboard/hero";
import { MatchComposer } from "@/components/match/match-composer";
import { InterviewReadinessCard } from "@/components/dashboard/interview-readiness";
import { RANGE_OPTIONS, type Range } from "@/components/dashboard/logic";
import { RecentApplications } from "@/components/dashboard/recent-apps";
import { ResumeHealthCard } from "@/components/dashboard/resume-health";
import { StatsRow } from "@/components/dashboard/stats";
import { UpcomingCard } from "@/components/dashboard/upcoming";
import { RangeControl } from "@/components/dashboard/ui";
import { Item, Stagger } from "@/components/ui/motion";

export default function DashboardPage() {
  const [raw, setRange] = useStoredString("arw-dash-range", "8");
  const range: Range = RANGE_OPTIONS.some((o) => o.value === raw) ? (raw as Range) : "8";

  return (
    <div className="flex flex-col gap-5">
      <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-6 xl:grid-cols-12">
        <Item className="md:col-span-6 xl:col-span-7">
          <GreetingCard />
        </Item>
        <Item className="md:col-span-6 xl:col-span-5">
          <NextActionCard />
        </Item>
      </Stagger>

      {/* The app's main action, right under the greeting. */}
      <MatchComposer compact />

      <GhostingNudge />
      <GettingStarted />

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Your numbers</h2>
          <p className="text-sm text-muted">Counted from your tracker. The range changes the weekly chart and the change badges.</p>
        </div>
        <RangeControl value={range} onChange={(v) => setRange(v)} />
      </div>

      {/* 2 → 3+2 → 5 across: five cards in one row only once each has room for its badge and sparkline. */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 2xl:grid-cols-5">
        <StatsRow range={range} />
      </Stagger>

      <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-6 xl:grid-cols-12">
        <Item className="md:col-span-6 xl:col-span-8">
          <WeeklyChart range={range} />
        </Item>
        <Item className="md:col-span-6 xl:col-span-4">
          <PipelineCard />
        </Item>
        <Item className="md:col-span-3 xl:col-span-4">
          <ResumeHealthCard />
        </Item>
        <Item className="md:col-span-3 xl:col-span-4">
          <InterviewReadinessCard />
        </Item>
        <Item className="md:col-span-6 xl:col-span-4">
          <SourcesCard />
        </Item>
        <Item className="md:col-span-6 xl:col-span-5">
          <UpcomingCard />
        </Item>
        <Item className="md:col-span-6 xl:col-span-7">
          <RecentApplications />
        </Item>
      </Stagger>
    </div>
  );
}

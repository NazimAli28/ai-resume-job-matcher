"use client";

import { Award, Briefcase, Gauge, MessageSquareReply, Mic } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Item } from "@/components/ui/motion";
import { useDemo } from "@/demo/store";
import { overview, rangePhrase, type Range } from "./logic";

const up = (n: number, range: Range, noun = "") =>
  ({ value: `+${n}${noun} ${rangePhrase(range)}`, direction: n > 0 ? "up" : "flat" }) as const;

/** Stat cards row. Every number comes from overview(state, range). */
export function StatsRow({ range }: { range: Range }) {
  const { state } = useDemo();
  const o = overview(state, range);
  const nextRound = o.upcomingRounds.length;

  return (
    <>
      <Item className="lg:col-span-2 2xl:col-span-1 [&>*]:h-full">
        <StatCard
          icon={Briefcase}
          label="Active applications"
          value={o.s.active}
          emphasis
          delta={up(o.sentInRange, range, " sent")}
          trend={o.sentPerWeek}
          footnote={`${o.s.sent} sent in total, ${o.s.active} still open`}
          href="/demo/applications"
        />
      </Item>
      <Item className="lg:col-span-2 2xl:col-span-1 [&>*]:h-full">
        <StatCard
          icon={Mic}
          label="Interviews scheduled"
          value={nextRound}
          delta={up(o.roundsHeldInRange, range, " held")}
          footnote={`${o.practiceDone} practice ${o.practiceDone === 1 ? "session" : "sessions"} done, ${o.s.interviews} ${o.s.interviews === 1 ? "application" : "applications"} reached interviews`}
          href="/demo/interviews"
        />
      </Item>
      <Item className="lg:col-span-2 2xl:col-span-1 [&>*]:h-full">
        <StatCard
          icon={Award}
          label="Offers"
          value={o.s.offers}
          delta={up(o.offersInRange, range)}
          footnote={o.s.offers ? "Compare offers in the tracker" : "None yet. Keep going."}
          href="/demo/applications"
        />
      </Item>
      <Item className="lg:col-span-3 2xl:col-span-1 [&>*]:h-full">
        <StatCard
          icon={MessageSquareReply}
          label="Response rate"
          value={o.responseRate}
          suffix="%"
          delta={up(o.repliesInRange, range, " replies")}
          trend={o.repliesPerWeek}
          footnote={`${o.s.replied} of ${o.s.sent} heard back, rejections included`}
          href="/demo/applications"
        />
      </Item>
      <Item className="sm:col-span-2 lg:col-span-3 2xl:col-span-1 [&>*]:h-full">
        {o.avgFit === null ? (
          <StatCard icon={Gauge} label="Average fit estimate" value={0} footnote="Add a job to see how your resume fits it" href="/demo/jobs" />
        ) : (
          <StatCard
            icon={Gauge}
            label="Average fit estimate"
            value={o.avgFit}
            footnote={`Estimate across ${o.fitCount} saved ${o.fitCount === 1 ? "job" : "jobs"}, not a hiring prediction`}
            href="/demo/jobs"
          />
        )}
      </Item>
    </>
  );
}

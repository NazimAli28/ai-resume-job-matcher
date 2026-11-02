"use client";

import { Award, CalendarCheck, Send, Workflow } from "lucide-react";
import type { Point } from "@/components/ui/charts";
import { StatCard } from "@/components/ui/stat-card";

/** Client side because the icons are components, which can't be passed down from a server page. */
export function DashboardStats({ applied, active, interviewing, offers, trend, closed }: { applied: number; active: number; interviewing: number; offers: number; trend: Point[]; closed: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard icon={Send} label="Applied" value={applied} trend={trend} href="/app/applications" emphasis />
      <StatCard icon={Workflow} label="In progress" value={active} footnote={closed} href="/app/applications" />
      <StatCard icon={CalendarCheck} label="Interviewing" value={interviewing} href="/app/applications" />
      <StatCard icon={Award} label="Offers" value={offers} href="/app/applications" />
    </div>
  );
}

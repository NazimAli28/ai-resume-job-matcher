"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { CalendarClock, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { TODAY, daysBetween, formatDate, relativeDay } from "@/lib/dates";
import { useDemo } from "@/demo/store";
import { upcoming, type UpcomingKind } from "./logic";
import { CardHeader, CompanyTile, linkClass } from "./ui";

const KIND: Record<UpcomingKind, { label: string; className: string }> = {
  INTERVIEW: { label: "Interview", className: "bg-hl-soft text-hl-ink" },
  TAKE_HOME: { label: "Take-home", className: "bg-partial-soft text-partial" },
  DECISION: { label: "Offer reply", className: "bg-hl text-on-hl" },
  FOLLOW_UP: { label: "Follow-up", className: "border border-rule text-muted" },
};

export function UpcomingCard() {
  const { state, dispatch } = useDemo();
  const toast = useToast();
  const reduce = useSkipMotion();
  const items = upcoming(state.applications);

  const checkOff = (id: string) => {
    const app = state.applications.find((a) => a.id === id);
    if (!app?.nextAction) return;
    const prev = app.nextAction;
    dispatch({ type: "UPDATE_APPLICATION", id, patch: { nextAction: undefined } });
    toast(`Marked done: ${prev.label}, ${app.company}`, {
      label: "Undo",
      onClick: () => dispatch({ type: "UPDATE_APPLICATION", id, patch: { nextAction: prev } }),
    });
  };

  return (
    <section aria-labelledby="up-title" className="card flex h-full flex-col gap-4 p-5 sm:p-6">
      <CardHeader
        icon={CalendarClock}
        id="up-title"
        title="Upcoming"
        sub="Next 14 days, plus anything overdue"
        action={<Link href="/app/applications" className={linkClass}>Tracker</Link>}
      />
      {items.length === 0 ? (
        <p className="text-muted">Nothing scheduled. Add a next action or an interview round to any application to see it here.</p>
      ) : (
        <ol className="relative flex flex-col">
          <span aria-hidden className="absolute bottom-5 left-[19px] top-5 w-px bg-rule" />
          <AnimatePresence initial={false}>
            {items.map((it) => {
              const d = daysBetween(TODAY, it.due);
              const urgent = d <= 0;
              const k = KIND[it.kind];
              return (
                <motion.li
                  key={it.key}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.2 } }}
                  className="relative flex items-center gap-3 py-2"
                >
                  <CompanyTile name={it.app.company} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate font-semibold">{it.label}</span>
                      <Chip className={cn("text-xs leading-5", k.className)}>{k.label}</Chip>
                    </p>
                    <p className="truncate text-sm">
                      <Link href={`/app/applications?open=${it.app.id}`} className="text-muted underline-offset-4 hover:text-ink hover:underline">
                        {it.app.company}
                      </Link>
                      <span className={cn(urgent ? "font-semibold text-warn" : "text-muted")}>
                        {", "}
                        {d < 0 ? `overdue, was ${relativeDay(it.due)}` : relativeDay(it.due)}
                        {d > 1 ? `, ${formatDate(it.due)}` : ""}
                      </span>
                    </p>
                  </div>
                  {it.checkable ? (
                    <button
                      type="button"
                      onClick={() => checkOff(it.app.id)}
                      aria-label={`Mark done: ${it.label}, ${it.app.company}`}
                      className="group grid size-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-hl-soft hover:text-hl-ink focus-visible:outline-2 focus-visible:outline-hl-ink"
                    >
                      <span className="grid size-6 place-items-center rounded-full border-2 border-rule-strong transition-colors group-hover:border-hl-ink">
                        <Check className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={3} aria-hidden />
                      </span>
                    </button>
                  ) : (
                    <span className="w-11 shrink-0" aria-hidden />
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </section>
  );
}

"use client";

import { CalendarCheck, CheckCircle2, Mic, Send, Sparkles } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { RingScore } from "@/components/ui/charts";
import { useToast } from "@/components/ui/toast";
import { TODAY } from "@/lib/dates";
import { useDemo } from "@/demo/store";
import { momentum, nextBestAction, thisWeek, type NextBestAction } from "./logic";

const noop = () => () => {};
function greetingNow() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Uses the viewer's clock on the client; the server renders a neutral greeting. */
function useGreeting() {
  return useSyncExternalStore(noop, greetingNow, () => "Hello");
}

const LONG_DATE = new Date(TODAY + "T00:00:00Z").toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function GreetingCard() {
  const { state } = useDemo();
  const greeting = useGreeting();
  const first = state.user.name.split(" ")[0];
  const w = thisWeek(state.applications);
  const m = momentum(state.applications);

  const summary =
    w.sent + w.interviews + w.due === 0
      ? "A quiet week so far. Nothing is due, so it's a good time to save a new job."
      : `This week: ${plural(w.sent, "application", "applications")} sent, ${plural(w.interviews, "interview", "interviews")} coming up and ${plural(w.due, "action", "actions")} due.`;

  const pills = [
    { icon: Send, label: "Sent this week", value: w.sent },
    { icon: Mic, label: "Interviews ahead", value: w.interviews },
    { icon: CalendarCheck, label: "Actions due", value: w.due },
  ];

  return (
    <section aria-labelledby="hello-title" className="card relative flex h-full flex-col gap-6 overflow-hidden p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm font-semibold text-muted">{LONG_DATE}</p>
        <h1 id="hello-title" className="font-display text-[30px] font-bold leading-[1.1] sm:text-[38px]">
          {greeting}, {first}
        </h1>
        <p className="max-w-md text-muted">{summary}</p>
        <ul className="mt-1 flex flex-wrap gap-2" aria-label="This week at a glance">
          {pills.map((p) => (
            <li key={p.label} className="inline-flex items-center gap-2 rounded-full border border-rule bg-sunken/60 py-1 pl-1.5 pr-3 text-sm">
              <span className="grid size-6 place-items-center rounded-full bg-surface text-hl-ink">
                <p.icon className="size-3.5" aria-hidden />
              </span>
              <span className="font-bold tabular-nums">{p.value}</span>
              <span className="text-muted">{p.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:gap-2 sm:text-center">
        <RingScore value={m.pct} size={116} stroke={10} label="Job search momentum, percent of active applications with activity in the last 14 days" sublabel="momentum" />
        <p className="max-w-[11rem] text-sm text-muted">
          <span className="font-semibold text-ink">
            {m.moving} of {m.active}
          </span>{" "}
          active applications moved in the last 14 days
        </p>
      </div>
    </section>
  );
}

function secondaryFor(a: NextBestAction): { label: string; href: string } {
  switch (a.kind) {
    case "PRACTICE":
      return { label: "Open tracker", href: "/demo/applications" };
    case "FIX_FINDINGS":
      return { label: "See all versions", href: "/demo/resumes" };
    case "TAILOR":
      return { label: "Open tracker", href: "/demo/applications" };
    case "ALL_CLEAR":
      return { label: "Practice an interview", href: "/demo/interviews/new" };
    default:
      return { label: "Open tracker", href: "/demo/applications" };
  }
}

/** The one primary card, computed from state by nextBestAction(). */
export function NextActionCard() {
  const { state, dispatch } = useDemo();
  const toast = useToast();
  const a = nextBestAction(state);
  const second = secondaryFor(a);

  const markDone = () => {
    const app = state.applications.find((x) => x.id === a.applicationId);
    if (!app?.nextAction) return;
    const prev = app.nextAction;
    dispatch({ type: "UPDATE_APPLICATION", id: app.id, patch: { nextAction: undefined } });
    toast(`Marked done: ${prev.label}, ${app.company}`, {
      label: "Undo",
      onClick: () => dispatch({ type: "UPDATE_APPLICATION", id: app.id, patch: { nextAction: prev } }),
    });
  };

  return (
    <section aria-labelledby="nba-title" className="card relative flex h-full flex-col overflow-hidden p-6 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full blur-3xl"
        style={{ background: "rgb(var(--hl-rgb) / 0.18)" }}
      />
      <div className="relative flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-hl text-on-hl glow">
          <Sparkles className="size-[18px]" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-muted">Your next best action</p>
      </div>
      <h2 id="nba-title" className="relative mt-4 font-display text-[22px] font-bold leading-snug sm:text-2xl">
        {a.title}
      </h2>
      <p className="relative mt-2 text-muted">{a.why}</p>
      <div className="relative mt-auto flex flex-wrap gap-2 pt-5">
        <ButtonLink href={a.href} variant="primary" className="glow">
          {a.cta}
        </ButtonLink>
        {a.kind === "FOLLOW_UP" && a.applicationId ? (
          <Button onClick={markDone}>
            <CheckCircle2 className="size-4" aria-hidden />
            Mark done
          </Button>
        ) : (
          <ButtonLink href={second.href}>{second.label}</ButtonLink>
        )}
      </div>
    </section>
  );
}

"use client";

import { Bell, Database, Globe, Gauge, Palette, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Item, Stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { Appearance } from "./appearance";
import { DataSection } from "./data-section";
import { Market } from "./market";
import { Notifications } from "./notifications";
import { PlanUsage } from "./plan-usage";
import { Privacy } from "./privacy";

const SECTIONS: { id: string; title: string; icon: LucideIcon }[] = [
  { id: "s-appearance", title: "Appearance", icon: Palette },
  { id: "s-market", title: "Target market", icon: Globe },
  { id: "s-plan", title: "Plan and usage", icon: Gauge },
  { id: "s-privacy", title: "Privacy", icon: ShieldCheck },
  { id: "s-notify", title: "Notifications", icon: Bell },
  { id: "s-data", title: "Your data", icon: Database },
];

function Block({ id, title, icon: Icon, children, danger }: { id: string; title: string; icon: LucideIcon; children: ReactNode; danger?: boolean }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className={cn("card scroll-mt-32 flex flex-col gap-4 p-5 sm:p-6", danger && "border-danger/40")}
    >
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 place-items-center rounded-xl", danger ? "bg-warn-soft text-danger" : "bg-hl-soft text-hl-ink")}>
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 id={`${id}-h`} className="text-xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** Left rail on desktop, scrollable pill bar on mobile. The active item follows the section in view. */
function SettingsNav() {
  const [active, setActive] = useState(SECTIONS[0].id);
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (id: string) => {
    setActive(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Settings sections"
      className="sticky top-[4.5rem] z-20 -mx-3 overflow-x-auto bg-paper/90 px-3 py-2 backdrop-blur sm:-mx-5 sm:px-5 lg:top-24 lg:mx-0 lg:overflow-visible lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
    >
      <ul className="flex gap-2 lg:card lg:flex-col lg:gap-1 lg:p-2">
        {SECTIONS.map((s) => {
          const on = active === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                aria-current={on ? "true" : undefined}
                onClick={() => go(s.id)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all lg:rounded-xl lg:border-transparent lg:px-3",
                  on ? "border-hl-ink bg-hl-soft text-ink glow lg:shadow-none" : "border-rule bg-surface text-muted hover:text-ink lg:bg-transparent",
                )}
              >
                <s.icon className="size-4" aria-hidden /> {s.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SettingsView() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Settings" description="Appearance, plan, privacy and your data." />
      <div className="grid items-start gap-5 lg:grid-cols-[13rem_1fr]">
        <SettingsNav />
        <Stagger className="flex min-w-0 flex-col gap-5">
          <Item><Block id="s-appearance" title="Appearance" icon={Palette}><Appearance /></Block></Item>
          <Item><Block id="s-market" title="Target market" icon={Globe}><Market /></Block></Item>
          <Item><Block id="s-plan" title="Plan and usage" icon={Gauge}><PlanUsage /></Block></Item>
          <Item><Block id="s-privacy" title="Privacy" icon={ShieldCheck}><Privacy /></Block></Item>
          <Item><Block id="s-notify" title="Notifications" icon={Bell}><Notifications /></Block></Item>
          <Item><Block id="s-data" title="Your data" icon={Database} danger><DataSection /></Block></Item>
        </Stagger>
      </div>
    </div>
  );
}

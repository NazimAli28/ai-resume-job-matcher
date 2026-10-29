"use client";

import { ArrowRight, Check, FileText, KanbanSquare, ListChecks, Mic, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useId, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { BeforeAfter } from "./before-after";
import { useReduced } from "./hooks";
import { InterviewPeek } from "./interview-peek";
import { MatchExplorer } from "./match-explorer";
import { MiniTracker } from "./mini-tracker";
import { Container, SampleCaption, SectionHeading } from "./section";

interface Feature {
  id: string;
  tab: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  give: string[];
  get: string[];
  details: string[];
  limit: string;
  demoTitle: string;
  Demo: ComponentType;
}

// Numbers come from PRD §5b (plan limits, uploads, interview). Keep them in sync.
const FEATURES: Feature[] = [
  {
    id: "resume",
    tab: "Resume check",
    icon: FileText,
    title: "Find out whether your resume can be read, and how it reads",
    summary: "Upload once. Every finding points to the exact line it came from, with a fix that uses only what you wrote.",
    give: ["Your resume as PDF or Word (up to 5 MB, 6 pages)", "Your target market: Pakistan or international"],
    get: [
      "Parse health estimate: can hiring software pull out your sections, dates and titles?",
      "Readability estimate: clear, specific, action-led bullets?",
      "Rewrites you accept or reject one by one",
      "An improved copy to download as PDF or Word after a highlighted preview, or just the suggestions to apply yourself",
    ],
    details: [
      "Missing numbers become a question or a visible placeholder, never a guess",
      "CNIC, phone, email and address are masked before any AI step",
      "Local conventions for Pakistani roles; photo and date of birth flagged for international ones",
    ],
    limit: "Free: 3 analyses a month · Pro: 40",
    demoTitle: "Before and after, tap a bullet",
    Demo: BeforeAfter,
  },
  {
    id: "match",
    tab: "Job match",
    icon: ListChecks,
    title: "See exactly which requirements you meet, and prove the rest",
    summary: "Paste a job. Each requirement is matched against your resume and saved evidence, with the line that earned its verdict.",
    give: ["The job description you paste", "The link, and where you found it (Rozee.pk, LinkedIn, referral…)"],
    get: [
      "Every requirement marked strong, partial, missing or unclear",
      "A job match estimate out of 100 with its full breakdown",
      "A tailored resume version for this job, saved and linked to it",
      "A cover letter built from the same facts",
    ],
    details: [
      "Weights: must-haves 45%, nice-to-haves 15%, title and level 15%, evidence quality 15%, years and education 10%",
      "A missing must-have caps the estimate at 60, two or more at 45",
      "Missing skills are asked about, never added (try it below the tabs)",
    ],
    limit: "Free: 3 tailored versions and 3 cover letters a month · Pro: 30 each",
    demoTitle: "Hover or tap a requirement",
    Demo: MatchExplorer,
  },
  {
    id: "interview",
    tab: "Interview coach",
    icon: Mic,
    title: "Rehearse the interview for that exact job",
    summary: "A recruiter-style mock interview built from the job post and your resume, then a report that shows what to improve.",
    give: ["The job you're preparing for", "Type, difficulty and length: 5, 10 or 15 questions", "Your typed answers (voice comes later)"],
    get: [
      "Questions from the job's real requirements, with up to 2 follow-ups each",
      "Each answer scored on a fixed rubric, with quotes from what you said",
      "A model answer that uses only your facts",
      "An overall estimate and a trend across sessions",
    ],
    details: [
      "Soft 2-minute timer per answer, adjustable",
      "Leave halfway and resume within 7 days",
      "Practice only: no overlay, no live answers in a real interview",
    ],
    limit: "Free: 2 interviews a month, up to 10 questions · Pro: 15, up to 15 questions",
    demoTitle: "A scored answer from the report",
    Demo: InterviewPeek,
  },
  {
    id: "tracker",
    tab: "Tracker",
    icon: KanbanSquare,
    title: "Know what you sent, where, and what's next",
    summary: "A board for every application that remembers the resume version you sent and where you found the job.",
    give: ["Jobs you saved here, or any application you add by hand"],
    get: [
      "Stages from Saved to Offer, plus Rejected, Withdrawn and Ghosted",
      "The exact resume version and job source on every card",
      "Next-action reminders and interview dates",
      "A dashboard: response rate, interviews, offers, applications per week",
    ],
    details: [
      "No reply in 21 days? A nudge to mark it ghosted, undoable",
      "Drag cards on desktop, tap to move on mobile",
    ],
    limit: "Unlimited on every plan",
    demoTitle: "Drag a card to a new stage",
    Demo: MiniTracker,
  },
];

function List({ label, items, strong }: { label: string; items: string[]; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[13px] font-bold uppercase tracking-wide text-muted">{label}</h4>
      <ul className="flex flex-col gap-2">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2.5 text-[15px] leading-snug">
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                strong ? "bg-hl text-on-hl" : "bg-hl-soft text-hl-ink",
              )}
            >
              <Check className="size-3" strokeWidth={3.5} aria-hidden />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** PRODUCT: one section, four tabs. Each tab says what you give, what you get, the specifics, and runs a live demo. */
export function ProductTabs() {
  const reduce = useReduced();
  const [active, setActive] = useState(0);
  const base = useId();
  const tabsRef = useRef<HTMLDivElement>(null);
  const f = FEATURES[active];

  const onKey = (e: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (active + keys[e.key] + FEATURES.length) % FEATURES.length;
    setActive(next);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <section id="product" aria-labelledby="product-title" className="scroll-mt-24 py-20 sm:py-28">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          id="product-title"
          title="Four tools, one job search"
          intro="Everything below runs on sample data. Pick a tool to see what you put in, what you get back, and the limits."
        />

        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Product features"
          onKeyDown={onKey}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]"
        >
          {FEATURES.map((x, i) => {
            const on = i === active;
            return (
              <button
                key={x.id}
                id={`${base}-tab-${x.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${base}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                className={cn(
                  "relative inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl border px-4 text-[15px] font-semibold transition-colors",
                  on ? "border-transparent text-on-hl" : "border-rule bg-surface text-ink hover:bg-sunken",
                )}
              >
                {on && (
                  <motion.span
                    layoutId={`${base}-thumb`}
                    aria-hidden
                    className="absolute inset-0 rounded-2xl bg-hl glow"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <x.icon className="relative size-[18px]" aria-hidden />
                <span className="relative">{x.tab}</span>
              </button>
            );
          })}
        </div>

        <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${f.id}`} className="card overflow-hidden p-5 sm:p-8">
          {/* Swap at once and fade the new panel in; no exit animation to wait on.
              All details stack beside the demo so both columns end at about the same height. */}
          <motion.div
            key={f.id}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
            className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10"
          >
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h3 className="text-balance text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[30px]">{f.title}</h3>
                <p className="text-pretty text-[16px] leading-relaxed text-muted">{f.summary}</p>
              </div>
              <List label="You get" items={f.get} strong />
              <List label="You give" items={f.give} />
              <List label="Good to know" items={f.details} />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
                <span className="rounded-full bg-sunken px-3 py-1.5 text-sm font-semibold">{f.limit}</span>
                <Link href="/app" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-ink underline-offset-4 hover:underline">
                  Try it in the demo <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-sunken/50 p-4 sm:p-5 lg:self-center">
              <p className="text-sm font-semibold">{f.demoTitle}</p>
              <f.Demo />
              <SampleCaption />
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

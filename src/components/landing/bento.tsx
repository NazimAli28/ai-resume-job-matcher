"use client";

import { KanbanSquare, LayoutDashboard, ListChecks, Mic, MonitorX, ShieldCheck, Wand2 } from "lucide-react";
import { BeforeAfter } from "./before-after";
import { BentoCard } from "./bento-card";
import { DashboardPeek } from "./dashboard-peek";
import { InterviewPeek } from "./interview-peek";
import { MatchExplorer } from "./match-explorer";
import { MiniTracker } from "./mini-tracker";
import { PracticeOnly } from "./practice-only";
import { PrivacyPeek } from "./privacy-peek";
import { Container, SectionHeading } from "./section";

/** DESIRE: a bento of live mini-demos, each running on Ayesha's sample data. */
export function Bento() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24 py-20 sm:py-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          id="features-title"
          title="Play with the parts that matter"
          intro="Every tile below is the real interaction, running on sample data. The app does the same with yours."
        />
        <div className="grid grid-flow-dense gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BentoCard
            icon={Wand2}
            strong
            title="Stronger bullets, no made-up numbers"
            body="Tap a bullet or flip them all. Rewrites only use what your resume already says, and a missing number becomes a question."
            className="md:col-span-2"
          >
            <BeforeAfter />
          </BentoCard>

          <BentoCard
            icon={ListChecks}
            title="See which requirements you meet"
            body="Hover or tap a requirement to see the exact line that earned its verdict."
            className="md:col-span-2"
          >
            <MatchExplorer />
          </BentoCard>

          <BentoCard
            icon={Mic}
            title="Practice, then read the report"
            body="Each answer is scored on a fixed rubric with quotes from what you said. Model answers use only your facts."
            className="md:col-span-2 lg:row-span-2"
          >
            <InterviewPeek />
          </BentoCard>

          <BentoCard
            icon={LayoutDashboard}
            title="Your search at a glance"
            body="What you sent, who replied, and how your week went."
            className="md:col-span-2"
          >
            <DashboardPeek />
          </BentoCard>

          <BentoCard
            icon={ShieldCheck}
            title="Masked before AI"
            body="Flip it to see what an AI step actually receives."
          >
            <PrivacyPeek />
          </BentoCard>

          <BentoCard icon={MonitorX} title="Practice only" body="Built to help you prepare, never to answer for you." caption={false}>
            <PracticeOnly />
          </BentoCard>

          <BentoCard
            icon={KanbanSquare}
            title="A tracker that remembers what you sent"
            body="Each card keeps the exact resume version and where you found the job, so a callback never leaves you guessing."
            className="md:col-span-2 lg:col-span-4"
          >
            <MiniTracker />
          </BentoCard>
        </div>
      </Container>
    </section>
  );
}

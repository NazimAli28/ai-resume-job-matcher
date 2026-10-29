"use client";

import { ClipboardPaste, FileUp, Wand2, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useScroll } from "motion/react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "@/lib/cn";
import { useReduced } from "./hooks";
import { Container, GlowBlob, IconChip, SectionHeading } from "./section";
import { DeviceFrame, FixScreen, JobScreen, UploadScreen } from "./story-screens";

const STEPS: { icon: LucideIcon; title: string; body: string; result: string; screen: ComponentType; url: string }[] = [
  {
    icon: FileUp,
    title: "Upload your resume",
    body: "PDF or Word. We check whether software can read it, mask personal details like your CNIC, and mark which lines already prove what you can do.",
    result: "Parse health and readability estimates, with the line behind every finding.",
    screen: UploadScreen,
    url: "Resume check",
  },
  {
    icon: ClipboardPaste,
    title: "Paste a job",
    body: "Paste the posting and note where you found it. Each requirement is matched against your resume as strong, partial, missing or unclear, with the evidence shown.",
    result: "A job match estimate you can rebuild from its breakdown.",
    screen: JobScreen,
    url: "Job match",
  },
  {
    icon: Wand2,
    title: "Fix, practice, track",
    body: "Accept edits that use your own facts, answer the questions we ask instead of guessing, rehearse a mock interview for that job, then log the application.",
    result: "A tailored version, an interview report and a tracker card that remembers what you sent.",
    screen: FixScreen,
    url: "Tailor, practice and track",
  },
];

/**
 * INTEREST: scroll-driven story. On large screens a sticky app mock crossfades between three screens
 * as each step crosses the middle of the viewport, with a progress rail beside the steps.
 * On small screens each step shows its own screen inline.
 */
export function ScrollStory() {
  const reduce = useReduced();
  const [active, setActive] = useState(0);
  const stepsRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: stepsRef, offset: ["start 55%", "end 55%"] });

  useEffect(() => {
    const items = stepsRef.current?.querySelectorAll<HTMLElement>("[data-step]");
    if (!items) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-50% 0px -49% 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const Screen = STEPS[active].screen;

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="relative scroll-mt-24 overflow-x-clip py-20 sm:py-28">
      <Container className="flex flex-col gap-12 lg:gap-4">
        <SectionHeading
          id="how-title"
          title="One evening, one job, three steps"
          intro="The same sequence works for your first application and your fortieth. Each step feeds the next, so nothing gets typed twice."
        />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          <div className="relative">
            {/* Progress rail */}
            <div aria-hidden className="absolute bottom-0 left-5 top-0 hidden w-0.5 rounded-full bg-rule lg:block">
              <motion.div
                className="h-full w-full origin-top rounded-full bg-hl glow"
                style={{ scaleY: scrollYProgress }}
              />
            </div>
            <ol ref={stepsRef} className="flex flex-col gap-14 lg:gap-0">
              {STEPS.map((s, i) => {
                const on = active === i;
                const StepScreen = s.screen;
                return (
                  <li
                    key={s.title}
                    data-step={i}
                    className="flex flex-col gap-5 lg:min-h-[72vh] lg:justify-center lg:pl-16"
                  >
                    <div
                      className={cn(
                        "relative flex flex-col gap-3 transition-opacity duration-300",
                        !on && "lg:opacity-45",
                      )}
                    >
                      <div className="flex items-center gap-3 lg:absolute lg:-left-16 lg:top-0">
                        <IconChip icon={s.icon} strong={on} className="relative z-10 size-10 transition-shadow" />
                        <span className="font-display text-sm font-bold text-muted lg:hidden">Step {i + 1}</span>
                      </div>
                      <h3 className="text-[26px] font-bold leading-tight sm:text-[30px]">
                        <span className="sr-only">Step {i + 1}: </span>
                        {s.title}
                      </h3>
                      <p className="max-w-md text-[17px] leading-relaxed text-muted">{s.body}</p>
                      <p className="max-w-md text-[15px]">
                        <span className="font-semibold">You get: </span>
                        {s.result}
                      </p>
                    </div>
                    <div className="lg:hidden" aria-hidden>
                      <DeviceFrame title={s.url}>
                        <StepScreen />
                      </DeviceFrame>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="hidden lg:block" aria-hidden>
            {/* The mock is ~575px tall: shrink it on short laptop screens so it fits while pinned, and stop pinning when even that won't fit. */}
            <div className="sticky top-[5.5rem] origin-top scale-[0.8] py-2 tall:top-28 tall:scale-100 tall:py-6 [@media(max-height:560px)]:static">
              <div className="relative">
                <GlowBlob className="-inset-10" />
                <div className="relative">
                  <DeviceFrame title={STEPS[active].url}>
                    <div className="relative min-h-[420px]">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={active}
                          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98, filter: "blur(6px)" }}
                          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                          exit={reduce ? undefined : { opacity: 0, y: -12, scale: 0.98, filter: "blur(6px)" }}
                          transition={{ duration: reduce ? 0 : 0.32, ease: [0.2, 0.7, 0.2, 1] }}
                        >
                          <Screen />
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </DeviceFrame>
                  <div className="mt-4 flex justify-center gap-2">
                    {STEPS.map((s, i) => (
                      <span
                        key={s.title}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300",
                          active === i ? "w-8 bg-hl glow" : "w-1.5 bg-rule-strong",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

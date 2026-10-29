"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useReduced } from "./hooks";

/** The four jobs the product does. The verb swaps; its object swaps with it so each line reads as a sentence. */
const JOBS = [
  { verb: "fix", rest: "your resume." },
  { verb: "tailor", rest: "it to each job." },
  { verb: "practice", rest: "the interview." },
  { verb: "track", rest: "every application." },
];

const EASE = [0.2, 0.7, 0.2, 1] as const;

function Line({ verb, rest }: { verb: string; rest: string }) {
  return (
    <>
      <span className="relative inline-block text-hl-ink text-glow">
        {verb}
        <span aria-hidden className="absolute inset-x-0 -bottom-[0.02em] h-[0.09em] rounded-full bg-hl glow" />
      </span>{" "}
      <span>{rest}</span>
    </>
  );
}

/**
 * Hero headline with an animated verb swap. Screen readers get one static sentence.
 * Every option is laid out invisibly in the same grid cell, so the swap never shifts the layout.
 * With reduced motion the first job stays put.
 */
export function HeroHeadline({ id }: { id: string }) {
  const reduce = useReduced();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % JOBS.length), 2600);
    return () => window.clearInterval(t);
  }, [reduce]);

  const job = JOBS[reduce ? 0 : i];

  return (
    <h1
      id={id}
      className="text-[clamp(32px,10.4vw,44px)] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-[64px] lg:text-[min(72px,10vh)] xl:text-[min(80px,11vh)]"
    >
      <span className="sr-only">
        The honest way to fix your resume, tailor it to each job, practice the interview and track every application.
      </span>
      <span aria-hidden className="block">
        The honest way to
      </span>
      <span aria-hidden className="grid">
        {JOBS.map((j) => (
          <span key={j.verb} className="invisible col-start-1 row-start-1">
            <Line {...j} />
          </span>
        ))}
        <AnimatePresence initial={false}>
          <motion.span
            key={job.verb}
            className="col-start-1 row-start-1"
            initial={{ opacity: 0, y: "0.35em", filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: "-0.35em", filter: "blur(10px)" }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <Line {...job} />
          </motion.span>
        </AnimatePresence>
      </span>
    </h1>
  );
}

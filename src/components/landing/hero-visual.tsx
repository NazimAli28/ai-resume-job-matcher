"use client";

import { Bell, Mic, Quote, X } from "lucide-react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { PointerEvent, ReactNode } from "react";
import { RingScore } from "@/components/ui/charts";
import { EstimateTag } from "@/components/ui/chip";
import { bandFor } from "@/components/ui/score";
import { cn } from "@/lib/cn";
import { useCanTilt, useReduced } from "./hooks";
import { sampleInterview, sampleResume } from "./sample";
import { GlowBlob } from "./section";

const SPRING = { stiffness: 140, damping: 18, mass: 0.6 };

/** A satellite card that floats gently and drifts with the pointer at its own depth. */
function Satellite({
  sx,
  sy,
  depth,
  delay,
  className,
  children,
}: {
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  depth: number;
  delay: number;
  className: string;
  children: ReactNode;
}) {
  const reduce = useReduced();
  const x = useTransform(sx, (v) => v * depth);
  const y = useTransform(sy, (v) => v * depth);
  return (
    <motion.div className={cn("absolute z-20", className)} style={{ x, y }}>
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 + delay, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -7, 0] }}
          transition={reduce ? undefined : { duration: 5 + delay * 2, repeat: Infinity, ease: "easeInOut", delay: delay * 1.5 }}
          className="rounded-2xl border border-rule bg-surface/90 shadow-[var(--card-shadow-hover)] backdrop-blur-md"
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function Skeleton({ w }: { w: string }) {
  return <span aria-hidden className="block h-[0.55em] rounded-full bg-sunken" style={{ width: w }} />;
}

/** The tilted resume "paper": evidence lines get the highlighter sweep once, on load. */
function Paper() {
  const sweep = (ms: number) => ({ animationDelay: `${ms}ms` });
  return (
    <div className="flex h-full flex-col gap-[0.9em] overflow-hidden rounded-[14px] border border-rule bg-surface p-[1.4em] text-[10px] leading-[1.55] text-ink shadow-[var(--card-shadow-hover)] sm:text-[12px]">
      <div className="flex items-start justify-between gap-3 border-b border-rule pb-[0.9em]">
        <div>
          <p className="font-display text-[1.9em] font-bold leading-none">Ayesha Khan</p>
          <p className="mt-1 text-muted">Frontend Developer, Lahore</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {["email", "phone"].map((t) => (
            <span key={t} className="rounded-[4px] border border-dashed border-rule-strong bg-sunken px-1.5 font-semibold text-muted">
              [{t}]
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[0.5em]">
        <p className="font-display text-[1.1em] font-bold">Experience</p>
        <p className="font-semibold">Frontend Developer, Kinara Software</p>
        <ul className="flex flex-col gap-[0.45em] pl-[0.9em]">
          <li>
            <mark className="hl hl-sweep" style={sweep(700)}>
              Built and maintained 14 React + TypeScript screens used by 300+ dispatchers.
            </mark>
          </li>
          <li className="underline decoration-warn decoration-wavy decoration-1 underline-offset-[4px]">
            Worked on the checkout flow, which reduced failed payments.
          </li>
          <li>
            <mark className="hl hl-sweep" style={sweep(1050)}>
              Wrote unit tests with Jest and React Testing Library.
            </mark>
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-[0.55em]">
        <p className="font-display text-[1.1em] font-bold">Projects</p>
        <p>
          <mark className="hl hl-sweep" style={sweep(1400)}>
            Rozgaar Tracker, built with Next.js
          </mark>
        </p>
        <Skeleton w="82%" />
        <Skeleton w="64%" />
      </div>

      <div className="flex flex-col gap-[0.55em]">
        <p className="font-display text-[1.1em] font-bold">Skills</p>
        <div className="flex flex-wrap gap-1">
          {["React", "TypeScript", "Jest", "Tailwind", "Git"].map((s) => (
            <span key={s} className="rounded-full bg-sunken px-2 font-semibold text-muted">
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-[0.55em]">
        <Skeleton w="90%" />
        <Skeleton w="70%" />
      </div>
    </div>
  );
}

/**
 * Hero composition: a resume card in perspective that tilts toward the pointer, with product
 * moments floating around it. Tilt and parallax are off for touch and reduced motion.
 * Fixed aspect ratio, so nothing shifts as cards animate in.
 */
export function HeroVisual() {
  const canTilt = useCanTilt();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, SPRING);
  const sy = useSpring(my, SPRING);
  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-10, 10]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!canTilt) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const iv = sampleInterview.overall ?? 72;
  const parse = sampleResume.parseHealth;

  return (
    <div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative mx-auto aspect-[10/11] w-full max-w-[540px] select-none"
      style={{ perspective: 1200 }}
      role="img"
      aria-label={`Illustration: Ayesha's sample resume with evidence lines highlighted, a parse health estimate of ${parse}, Docker flagged as missing, a follow-up reminder for today, and a mock interview estimate of ${iv}.`}
    >
      <GlowBlob className="inset-[8%]" />

      <motion.div
        className="absolute left-[11%] top-[7%] z-10 h-[86%] w-[74%] sm:left-[15%] sm:w-[66%]"
        style={{ rotateX, rotateY, rotate: -2.5, transformStyle: "preserve-3d" }}
      >
        <Paper />
      </motion.div>

      {/* Parse health ring */}
      <Satellite sx={sx} sy={sy} depth={-26} delay={0} className="right-[0%] top-[1%]">
        <div className="flex items-center gap-3 p-3 pr-4">
          <RingScore value={parse} size={56} stroke={6} label="Parse health" />
          <div className="leading-tight">
            <p className="text-[13px] font-semibold">Parse health</p>
            <p className="text-[13px] font-semibold text-hl-ink">{bandFor(parse).word}</p>
          </div>
        </div>
      </Satellite>

      {/* Missing requirement */}
      <Satellite sx={sx} sy={sy} depth={34} delay={0.15} className="left-[0%] top-[26%] sm:-left-[3%]">
        <div className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-warn">
          <span className="grid size-5 place-items-center rounded-full bg-warn-soft">
            <X className="size-3" strokeWidth={3.5} aria-hidden />
          </span>
          Missing: Docker
        </div>
      </Satellite>

      {/* Interview estimate */}
      <Satellite sx={sx} sy={sy} depth={-38} delay={0.3} className="right-[0%] top-[44%] sm:-right-[3%]">
        <div className="flex items-center gap-3 p-3 pr-4">
          <span className="grid size-9 place-items-center rounded-xl bg-hl-soft text-hl-ink">
            <Mic className="size-4" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-[12px] font-semibold text-muted">Mock interview</p>
            <p className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-bold tabular-nums">{iv}</span>
              <span className="text-[13px] font-semibold text-hl-ink">{bandFor(iv).word}</span>
            </p>
          </div>
          <EstimateTag className="hidden sm:inline" />
        </div>
      </Satellite>

      {/* Reminder */}
      <Satellite sx={sx} sy={sy} depth={22} delay={0.45} className="bottom-[9%] left-[0%] sm:-left-[4%]">
        <div className="flex items-center gap-2.5 p-2.5 pr-4">
          <span className="grid size-9 place-items-center rounded-xl bg-hl text-on-hl glow">
            <Bell className="size-4" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold">Follow up today</p>
            <p className="text-[12px] text-muted">Clifton Digital, applied 9 days ago</p>
          </div>
        </div>
      </Satellite>

      {/* Evidence line */}
      <Satellite sx={sx} sy={sy} depth={-18} delay={0.6} className="bottom-[0%] right-[2%] hidden sm:block">
        <div className="flex max-w-[240px] flex-col gap-1 p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
            <Quote className="size-3.5" aria-hidden />
            Evidence for React
          </p>
          <p className="text-[13px] leading-snug">
            <mark className="hl">14 React + TypeScript screens</mark> used by 300+ dispatchers
          </p>
        </div>
      </Satellite>
    </div>
  );
}

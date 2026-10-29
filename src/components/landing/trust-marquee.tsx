"use client";

import { Globe2, Mic, Pause, Play, Quote, ScanSearch, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { motion, useAnimationFrame, useMotionValue } from "motion/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useReduced } from "./hooks";

// Product facts only: what the checks do. No logos, no user counts.
const ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck, label: "CNIC masked" },
  { icon: ScanSearch, label: "20 parsing and readability checks" },
  { icon: Quote, label: "Evidence for every suggestion" },
  { icon: Sparkles, label: "Model answers from your own resume" },
  { icon: Mic, label: "Practice-only interviews" },
  { icon: Globe2, label: "Pakistan and international formats" },
];

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {ITEMS.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2.5 whitespace-nowrap px-6 text-[15px] font-semibold sm:px-8">
          <span className="grid size-8 place-items-center rounded-lg bg-hl-soft text-hl-ink">
            <Icon className="size-4" aria-hidden />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Infinite strip of what the product checks. Pauses on hover/focus and has a pause button.
 * With reduced motion it is a static, wrapping list.
 */
export function TrustMarquee() {
  const reduce = useReduced();
  const track = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const [paused, setPaused] = useState(false);
  const x = useMotionValue(0);

  useAnimationFrame((_, delta) => {
    if (reduce || paused || hovering.current || !track.current) return;
    const half = track.current.scrollWidth / 2;
    if (!half) return;
    let next = x.get() - delta * 0.045;
    if (next <= -half) next += half;
    x.set(next);
  });

  return (
    <section aria-label="What every check includes" className="relative border-y border-rule bg-surface/60 py-4 backdrop-blur-sm">
      {reduce ? (
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-y-3 px-4">
          {ITEMS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2.5 px-4 text-[15px] font-semibold">
              <span className="grid size-8 place-items-center rounded-lg bg-hl-soft text-hl-ink">
                <Icon className="size-4" aria-hidden />
              </span>
              {label}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center">
          <div
            className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]"
            onPointerEnter={() => (hovering.current = true)}
            onPointerLeave={() => (hovering.current = false)}
          >
            <motion.div ref={track} className="flex w-max" style={{ x }}>
              <Row />
              <Row hidden />
            </motion.div>
          </div>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play the moving list" : "Pause the moving list"}
            className={cn(
              "mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink sm:mr-4",
            )}
          >
            {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          </button>
        </div>
      )}
    </section>
  );
}

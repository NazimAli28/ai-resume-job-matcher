"use client";

import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/**
 * True when animations shouldn't hold content back: reduced motion, or a page that loaded hidden
 * (background tab, link previews) where requestAnimationFrame is paused and content would stay invisible.
 */
export function useSkipMotion() {
  const reduce = useReducedMotion();
  const hiddenAtLoad = useSyncExternalStore(
    () => () => {},
    () => document.visibilityState === "hidden",
    () => false,
  );
  return Boolean(reduce) || hiddenAtLoad;
}

/** Counts up to `value` once when scrolled into view. Screen readers get the final value. */
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useSkipMotion();
  // Real value by default (correct for screenshots, no-JS, paused tabs); the count-up only runs once in view.
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!inView || reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(value);
      return;
    }
    const controls = animate(0, value, { duration: 0.9, ease: [0.2, 0.7, 0.2, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden>
        {(reduce ? value : shown).toFixed(decimals)}
        {suffix}
      </span>
      <span className="sr-only">
        {value.toFixed(decimals)}
        {suffix}
      </span>
    </span>
  );
}

/** Container whose direct <Item> children fade/slide in one after another, once. */
export function Stagger({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useSkipMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-8% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

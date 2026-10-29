"use client";

import { motion, useInView, useSpring, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { useReduced } from "./hooks";

/**
 * A number that springs to its new value whenever it changes (and counts up the first time it is seen).
 * Decorative: pair it with an aria-live text. Reduced motion shows the value directly.
 */
export function LiveNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReduced();
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-10% 0px" });
  const spring = useSpring(0, { stiffness: 90, damping: 18 });
  const text = useTransform(spring, (v) => String(Math.round(v)));

  useEffect(() => {
    if (seen) spring.set(value);
  }, [seen, value, spring]);

  return (
    <span ref={ref} className={className} aria-hidden>
      {reduce ? value : <motion.span>{text}</motion.span>}
    </span>
  );
}

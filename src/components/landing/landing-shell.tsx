"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Landing wrapper: ambient background, and motion honours the visitor's reduced-motion setting everywhere. */
export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="ambient flex min-h-screen flex-col">{children}</div>
    </MotionConfig>
  );
}

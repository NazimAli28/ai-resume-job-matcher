"use client";

import type { LucideIcon } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconChip, SampleCaption } from "./section";

/**
 * Bento tile: lifts on hover, and an accent spotlight follows the pointer.
 * The spotlight position is a CSS variable set on pointer move (no re-render).
 */
export function BentoCard({
  icon,
  title,
  body,
  className,
  children,
  caption = true,
  strong = false,
}: {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  className?: string;
  children: ReactNode;
  caption?: boolean;
  strong?: boolean;
}) {
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <article
      onPointerMove={onMove}
      className={cn("card card-hover group relative flex min-w-0 flex-col gap-5 overflow-hidden p-5 sm:p-6", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: "radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), rgb(var(--hl-rgb) / 0.12), transparent 65%)",
        }}
      />
      <header className="relative flex items-start gap-3">
        <IconChip icon={icon} strong={strong} className="transition-shadow group-hover:glow" />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-xl font-bold leading-tight">{title}</h3>
          <div className="text-[15px] leading-relaxed text-muted">{body}</div>
        </div>
      </header>
      <div className="relative flex min-w-0 flex-1 flex-col gap-3">{children}</div>
      {caption && <SampleCaption className="relative" />}
    </article>
  );
}

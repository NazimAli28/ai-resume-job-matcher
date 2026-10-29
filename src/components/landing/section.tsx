import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Page-width container used by every landing section. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

/** Section heading: a big display title and a reading-width intro. No eyebrows. */
export function SectionHeading({
  id,
  title,
  intro,
  center = false,
  className,
}: {
  id?: string;
  title: ReactNode;
  intro?: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-4", center && "mx-auto items-center text-center", className)}>
      <h2
        id={id}
        className="text-balance text-[32px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[44px] lg:text-[52px]"
      >
        {title}
      </h2>
      {intro && <p className="text-pretty text-[17px] leading-relaxed text-muted sm:text-lg">{intro}</p>}
    </div>
  );
}

/** Caption every sample widget carries, so nobody mistakes it for a real user's result. */
export function SampleCaption({ children = "Example output (sample data)", className }: { children?: ReactNode; className?: string }) {
  return <p className={cn("text-[13px] text-muted", className)}>{children}</p>;
}

/** Rounded icon chip: the visual anchor of a card. `strong` fills it with the accent and glows. */
export function IconChip({ icon: Icon, strong = false, className }: { icon: LucideIcon; strong?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl",
        strong ? "bg-hl text-on-hl glow" : "bg-hl-soft text-hl-ink",
        className,
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}

/** Soft accent glow placed behind a composition. Purely decorative. */
export function GlowBlob({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
      style={{ background: "radial-gradient(closest-side, rgb(var(--hl-rgb) / 0.32), transparent)" }}
    />
  );
}

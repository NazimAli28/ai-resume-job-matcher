import { Briefcase, Code2, Feather, Flame, Gauge, MessageSquare, Shuffle, Smile, UserRound, Users, Zap, type LucideIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { EstimateTag } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import type { Difficulty, InterviewType, Persona } from "@/demo/types";
import { bandWord } from "./scoring";

/** Compact score: number, band word, estimate tag. */
export function ScoreInline({ value, className }: { value: number; className?: string }) {
  const low = value < 50;
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="font-display text-2xl font-bold tabular-nums">{value}</span>
      <span className={cn("text-sm font-semibold", low ? "text-warn" : "text-hl-ink")}>{bandWord(value)}</span>
      <EstimateTag className="self-center" />
    </span>
  );
}

/** Wraps rubric evidence quotes in the highlighter (they are evidence from the user's own words). */
export function MarkedText({ text, quotes }: { text: string; quotes: string[] }) {
  const wanted = [...new Set(quotes.filter((q) => q.length > 3))];
  const spans: { start: number; end: number }[] = [];
  const lower = text.toLowerCase();
  for (const q of wanted) {
    const i = lower.indexOf(q.toLowerCase());
    if (i >= 0) spans.push({ start: i, end: i + q.length });
  }
  spans.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  const out: ReactNode[] = [];
  let pos = 0;
  merged.forEach((m, i) => {
    if (m.start > pos) out.push(<Fragment key={`t${i}`}>{text.slice(pos, m.start)}</Fragment>);
    out.push(<mark key={`m${i}`} className="hl hl-sweep">{text.slice(m.start, m.end)}</mark>);
    pos = m.end;
  });
  if (pos < text.length) out.push(<Fragment key="end">{text.slice(pos)}</Fragment>);
  return <>{out}</>;
}

/** Shows [placeholders] in a model answer as visible gaps for the user to fill. */
export function WithPlaceholders({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\[[^\]]+\]$/.test(p) ? (
          <span key={i} className="rounded-[var(--radius-sm)] bg-partial-soft px-1 font-semibold text-partial">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** 1 to 5 scale with a visible number, not color alone. */
export function Scale({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={`${score} out of 5`}>
      <span className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cn("h-2.5 w-5 rounded-sm", n <= score ? (score <= 2 ? "bg-warn" : "bg-ink") : "bg-sunken")} />
        ))}
      </span>
      <span className="text-sm font-semibold tabular-nums">{score} of 5</span>
    </span>
  );
}

export function formatClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const TYPE_ICON: Record<InterviewType, LucideIcon> = { BEHAVIORAL: MessageSquare, TECHNICAL: Code2, MIXED: Shuffle, HR: UserRound };
export const DIFF_ICON: Record<Difficulty, LucideIcon> = { EASY: Feather, STANDARD: Gauge, HARD: Zap };
export const PERSONA_ICON: Record<Persona, LucideIcon> = {
  FRIENDLY_RECRUITER: Smile,
  HIRING_MANAGER: Briefcase,
  TECHNICAL_PANEL: Users,
  TOUGH_BUT_FAIR: Flame,
};
const PERSONA_TONE: Record<Persona, string> = {
  FRIENDLY_RECRUITER: "bg-hl-soft text-hl-ink",
  HIRING_MANAGER: "bg-partial-soft text-partial",
  TECHNICAL_PANEL: "bg-sunken text-ink",
  TOUGH_BUT_FAIR: "bg-warn-soft text-warn",
};

/** Interviewer avatar tile: a role icon on a token-colored rounded square. */
export function PersonaTile({ persona, size = 44, className }: { persona: Persona; size?: number; className?: string }) {
  const Icon = PERSONA_ICON[persona];
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-2xl", PERSONA_TONE[persona], className)}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}

/** Three-dot typing indicator; the global reduced-motion rule stills the bounce. */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 140}ms`, animationDuration: "900ms" }} />
      ))}
    </span>
  );
}

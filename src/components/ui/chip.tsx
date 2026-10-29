import { Check, CircleHelp, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ApplicationStatus, MatchClass, Severity } from "@/demo/types";

export function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-semibold leading-6 whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

const MATCH: Record<MatchClass, { label: string; className: string; icon: ReactNode }> = {
  STRONG: { label: "Strong", className: "bg-hl-soft text-hl-ink", icon: <Check className="size-3.5" strokeWidth={3} aria-hidden /> },
  PARTIAL: { label: "Partial", className: "bg-partial-soft text-partial", icon: <Minus className="size-3.5" strokeWidth={3} aria-hidden /> },
  MISSING: { label: "Missing", className: "bg-warn-soft text-warn", icon: <X className="size-3.5" strokeWidth={3} aria-hidden /> },
  UNKNOWN: { label: "Unclear", className: "border border-dashed border-rule-strong text-muted", icon: <CircleHelp className="size-3.5" aria-hidden /> },
};

/** Requirement match class: icon + word, never color alone. */
export function MatchChip({ value, className }: { value: MatchClass; className?: string }) {
  const m = MATCH[value];
  return (
    <Chip className={cn(m.className, className)}>
      {m.icon}
      {m.label}
    </Chip>
  );
}

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  HIGH: { label: "Fix first", className: "bg-warn-soft text-warn" },
  MEDIUM: { label: "Worth fixing", className: "bg-partial-soft text-partial" },
  LOW: { label: "Minor", className: "border border-rule text-muted" },
  TIP: { label: "Tip", className: "border border-rule text-muted" },
};

export function SeverityChip({ value }: { value: Severity }) {
  const s = SEVERITY[value];
  return <Chip className={s.className}>{s.label}</Chip>;
}

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  ASSESSMENT: "Assessment",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  GHOSTED: "Ghosted",
};

export function StatusChip({ value }: { value: ApplicationStatus }) {
  const tone =
    value === "OFFER" || value === "ACCEPTED"
      ? "bg-hl text-on-hl"
      : value === "INTERVIEWING" || value === "ASSESSMENT"
        ? "bg-hl-soft text-hl-ink"
        : value === "REJECTED" || value === "GHOSTED"
          ? "bg-warn-soft text-warn"
          : value === "WITHDRAWN"
            ? "border border-rule text-muted"
            : "bg-partial-soft text-partial";
  return <Chip className={tone}>{STATUS_LABEL[value]}</Chip>;
}

/** Small marker that a number is an estimate, not a verdict. */
export function EstimateTag({ className }: { className?: string }) {
  return (
    <span className={cn("rounded-full border border-rule px-2 text-xs font-semibold text-muted leading-5", className)}>
      Estimate
    </span>
  );
}

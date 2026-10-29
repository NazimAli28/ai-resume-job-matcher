import { cn } from "@/lib/cn";
import { EstimateTag } from "./chip";

export function bandFor(value: number): { word: string; tone: "strong" | "good" | "fair" | "low" } {
  if (value >= 80) return { word: "Strong", tone: "strong" };
  if (value >= 65) return { word: "Good", tone: "good" };
  if (value >= 50) return { word: "Fair", tone: "fair" };
  return { word: "Needs work", tone: "low" };
}

/** Thin progress meter. Fill animates once on mount. */
export function Meter({ value, label, className }: { value: number; label: string; className?: string }) {
  const tone = bandFor(value).tone;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-sunken", className)}
    >
      <div
        className={cn(
          "meter-fill h-full rounded-full",
          tone === "low" ? "bg-warn" : tone === "fair" ? "bg-rule-strong" : "bg-hl",
        )}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/**
 * Score presentation: band word first, number second, always marked as an estimate,
 * and paired with a reproducible breakdown line ("6 of 8 must-haves covered").
 */
export function ScoreBand({
  value,
  title,
  basis,
  size = "md",
  className,
}: {
  value: number;
  title: string;
  basis?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const band = bandFor(value);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="font-semibold text-ink">{title}</span>
        <EstimateTag />
      </div>
      <div className="flex items-baseline gap-3">
        <span
          className={cn(
            "font-display font-bold tabular-nums leading-none",
            size === "lg" ? "text-6xl" : size === "md" ? "text-4xl" : "text-2xl",
          )}
        >
          {value}
        </span>
        <span className={cn("font-semibold", band.tone === "low" ? "text-warn" : "text-hl-ink")}>{band.word}</span>
      </div>
      <Meter value={value} label={`${title}: ${value} out of 100, ${band.word}`} />
      {basis && <p className="text-sm text-muted">{basis}</p>}
    </div>
  );
}

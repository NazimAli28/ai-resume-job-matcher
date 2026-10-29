"use client";

import { Check, Globe2, MapPin, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TargetMarket } from "@/demo/types";

const OPTIONS: { value: TargetMarket; title: string; blurb: string; change: string; icon: LucideIcon }[] = [
  {
    value: "PK_LOCAL",
    title: "Jobs in Pakistan",
    blurb: "Local employers and Pakistani job boards.",
    icon: MapPin,
    change:
      "A photo and date of birth are common on local resumes, so we only warn about them. Your CNIC never belongs on a resume in either market.",
  },
  {
    value: "INTERNATIONAL",
    title: "International",
    blurb: "Remote roles and employers outside Pakistan.",
    icon: Globe2,
    change:
      "We flag photos, date of birth and marital status, which most international employers prefer not to see. Your CNIC never belongs on a resume.",
  },
];

export function MarketChoice({ value, onChange }: { value: TargetMarket; onChange: (v: TargetMarket) => void }) {
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">Target market</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const active = value === o.value;
          const Icon = o.icon;
          return (
            <label
              key={o.value}
              className={cn(
                "card card-hover relative flex min-h-44 cursor-pointer flex-col gap-3 p-5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hl-ink",
                active && "border-hl-ink bg-hl-soft/60 glow",
              )}
            >
              <input
                type="radio"
                name="market"
                className="sr-only"
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
              />
              <span
                className={cn(
                  "grid size-14 place-items-center rounded-2xl transition-colors",
                  active ? "bg-hl text-on-hl glow" : "bg-sunken text-ink",
                )}
              >
                <Icon className="size-7" aria-hidden />
              </span>
              <span className="font-display text-xl font-bold">{o.title}</span>
              <span className="text-muted">{o.blurb}</span>
              <span
                aria-hidden
                className={cn(
                  "absolute right-4 top-4 grid size-7 place-items-center rounded-full border-2 transition-all",
                  active ? "scale-100 border-hl-ink bg-hl text-on-hl" : "scale-90 border-rule",
                )}
              >
                {active && <Check className="size-4" strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>
      <p className="rounded-xl bg-sunken px-4 py-3 text-sm" aria-live="polite">
        <span className="font-semibold">What changes: </span>
        {current.change}
      </p>
    </fieldset>
  );
}

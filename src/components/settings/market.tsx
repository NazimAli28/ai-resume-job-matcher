"use client";

import { Check, Globe, MapPin, type LucideIcon } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useDemo } from "@/demo/store";
import type { TargetMarket } from "@/demo/types";

const CHANGES: Record<TargetMarket, string[]> = {
  PK_LOCAL: [
    "Photo, date of birth and nationality are allowed on a resume, so we do not flag them.",
    "Job sources such as Rozee.pk and Mustakbil are listed first.",
    "Your CNIC is never put on a resume, in either market.",
  ],
  INTERNATIONAL: [
    "We flag photos, date of birth, marital status and similar details, which international recruiters usually do not want.",
    "Resume length and date format checks follow common US and UK norms.",
    "Your CNIC is never put on a resume, in either market.",
  ],
};

const OPTIONS: { value: TargetMarket; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "PK_LOCAL", label: "Pakistan", hint: "Local employers", icon: MapPin },
  { value: "INTERNATIONAL", label: "International", hint: "Remote and abroad", icon: Globe },
];

export function Market() {
  const { state, dispatch } = useDemo();
  const toast = useToast();
  const market = state.user.targetMarket;
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-1.5 text-sm font-semibold">Where are you applying?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((o) => {
            const on = market === o.value;
            return (
              <label
                key={o.value}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hl-ink",
                  on ? "border-hl-ink bg-hl-soft glow" : "border-rule bg-surface hover:border-rule-strong",
                )}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="market"
                  value={o.value}
                  checked={on}
                  onChange={() => {
                    dispatch({ type: "SET_TARGET_MARKET", market: o.value });
                    toast(o.value === "PK_LOCAL" ? "Target market set to Pakistan" : "Target market set to International");
                  }}
                />
                <span className={cn("grid size-11 place-items-center rounded-xl", on ? "bg-hl text-on-hl" : "bg-sunken text-ink")}>
                  <o.icon className="size-5" aria-hidden />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">{o.label}</span>
                  <span className="text-sm text-muted">{o.hint}</span>
                </span>
                {on && <Check className="size-5" strokeWidth={3} aria-hidden />}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="rounded-2xl bg-sunken p-4">
        <p className="text-sm font-semibold">What changes</p>
        <ul className="list-disc pl-5 pt-1 text-muted">
          {CHANGES[market].map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { saveOnboarding } from "@/app/app/profile/actions";
import { AreaField, TextField } from "./fields";
import { ItemForm } from "./item-form";

const MARKETS = [
  { value: "PK_LOCAL", label: "Pakistan", text: "Jobs with Pakistani employers." },
  { value: "INTERNATIONAL", label: "Jobs abroad", text: "Roles with employers outside Pakistan." },
];

export type OnboardingValues = { targetMarket: string; targetTitles: string[]; city: string; headline: string };

export function OnboardingForm({ values }: { values: OnboardingValues }) {
  return (
    <ItemForm action={saveOnboarding} submitLabel="Save and continue" pendingLabel="Saving…">
      {(err) => (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1.5 text-sm font-semibold">Where are you applying?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {MARKETS.map((m) => (
                <label
                  key={m.value}
                  className="flex min-h-11 cursor-pointer flex-col gap-1 rounded-2xl border border-rule bg-surface p-4 has-[:checked]:border-hl-ink has-[:checked]:bg-hl-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hl-ink"
                >
                  <input type="radio" name="targetMarket" value={m.value} defaultChecked={values.targetMarket === m.value} className="sr-only" />
                  <span className="font-semibold">{m.label}</span>
                  <span className="text-sm text-muted">{m.text}</span>
                </label>
              ))}
            </div>
            {err("targetMarket") && <p className="text-[13px] text-warn">{err("targetMarket")}</p>}
          </fieldset>
          <AreaField
            name="targetTitles"
            label="Roles you want"
            optional
            rows={4}
            defaultValue={values.targetTitles.join("\n")}
            error={err("targetTitles")}
            placeholder={"Backend Developer\nSoftware Engineer"}
            hint="One per line, up to 5."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="city" label="City" optional maxLength={80} defaultValue={values.city} error={err("city")} placeholder="Lahore" autoComplete="address-level2" />
            <TextField name="headline" label="Headline" optional maxLength={120} defaultValue={values.headline} error={err("headline")} placeholder="Backend developer who ships reliable APIs" />
          </div>
        </>
      )}
    </ItemForm>
  );
}

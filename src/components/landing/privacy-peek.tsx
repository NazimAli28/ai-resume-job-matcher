"use client";

import { EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PillToggle } from "./pill-toggle";
import { useReduced } from "./hooks";

// The sample's own (already partly redacted) contact lines, and the tokens the AI step receives instead.
const FIELDS = [
  { label: "CNIC", raw: "35202-•••••••-•", token: "[CNIC]" },
  { label: "Phone", raw: "+92 3xx xxxxxxx", token: "[phone]" },
  { label: "Email", raw: "ayesha.khan@example.com", token: "[email]" },
];

/** Privacy + practice-only card body: flip between what you wrote and what the AI receives. */
export function PrivacyPeek() {
  const reduce = useReduced();
  const [view, setView] = useState<"you" | "ai">("ai");

  return (
    <div className="flex flex-col gap-4">
      <PillToggle
        legend="Which version to show"
        value={view}
        onChange={setView}
        options={[
          { value: "you", label: "You wrote" },
          { value: "ai", label: "AI sees" },
        ]}
        className="self-start"
      />
      <dl className="flex flex-col divide-y divide-rule rounded-2xl border border-rule bg-surface">
        {FIELDS.map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
            <dt className="font-semibold">{f.label}</dt>
            <dd className="relative min-w-0 truncate text-right">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={view}
                  initial={reduce ? false : { opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={reduce ? undefined : { opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.18 }}
                  className={
                    view === "ai"
                      ? "inline-block rounded-[4px] border border-dashed border-rule-strong bg-sunken px-1.5 font-semibold text-muted"
                      : "inline-block text-ink"
                  }
                >
                  {view === "ai" ? f.token : f.raw}
                </motion.span>
              </AnimatePresence>
            </dd>
          </div>
        ))}
      </dl>
      <p className="flex items-start gap-2.5 rounded-2xl bg-sunken/70 p-3 text-[14px]">
        <EyeOff className="mt-0.5 size-4 shrink-0 text-hl-ink" aria-hidden />
        <span>Masked in code before any AI step. Not used for training unless you opt in.</span>
      </p>
    </div>
  );
}

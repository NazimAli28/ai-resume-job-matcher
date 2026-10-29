"use client";

import { Camera, Check, Globe2, MapPin, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { TargetMarket } from "@/demo/types";
import { useReduced } from "./hooks";
import { PillToggle } from "./pill-toggle";
import { Container, GlowBlob, SampleCaption, SectionHeading } from "./section";

const RULES: Record<TargetMarket, string[]> = {
  PK_LOCAL: [
    "A photo and date of birth are common for local roles, so we leave them if you want them.",
    "City and country in the header, matching how local recruiters search.",
    "Your CNIC still stays off the resume.",
  ],
  INTERNATIONAL: [
    "We suggest removing the photo and date of birth, which many employers outside Pakistan avoid to reduce bias.",
    "Contact details only: name, city, email, phone and profile link.",
    "Your CNIC stays off the resume here too.",
  ],
};

/** Target-market toggle that live-changes a resume header preview. */
export function MarketToggle() {
  const reduce = useReduced();
  const [market, setMarket] = useState<TargetMarket>("PK_LOCAL");
  const local = market === "PK_LOCAL";
  const fade = reduce
    ? { initial: false as const }
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: "auto" },
        exit: { opacity: 0, height: 0 },
        transition: { duration: 0.28, ease: [0.2, 0.7, 0.2, 1] as const },
      };

  return (
    <section aria-labelledby="market-title" className="relative overflow-x-clip py-20 sm:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-7">
          <SectionHeading
            id="market-title"
            title="Built for Pakistan and beyond"
            intro="Applying in Lahore and in Dubai are different games. Pick where you're applying and the advice changes with it."
          />
          <PillToggle
            legend="Target market"
            value={market}
            onChange={setMarket}
            options={[
              { value: "PK_LOCAL", label: <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden />Pakistan local</span> },
              { value: "INTERNATIONAL", label: <span className="inline-flex items-center gap-1.5"><Globe2 className="size-4" aria-hidden />International</span> },
            ]}
            className="self-start"
          />
          <ul className="flex min-h-[168px] flex-col gap-3" aria-live="polite">
            {RULES[market].map((r) => (
              <li key={r} className="flex items-start gap-3 text-[16px]">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-hl-soft text-hl-ink">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <GlowBlob className="-inset-8" />
          <div className="card relative flex flex-col gap-5 p-6 sm:p-8" aria-label={`Resume header preview, ${local ? "Pakistan local" : "international"} format`} role="figure">
            <div className="flex items-start gap-4">
              <AnimatePresence initial={false}>
                {local && (
                  <motion.div
                    key="photo"
                    initial={reduce ? false : { opacity: 0, scale: 0.6, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: 72 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.6, width: 0 }}
                    transition={{ duration: 0.3 }}
                    className="shrink-0"
                  >
                    <div className="grid size-[72px] place-items-center rounded-2xl border border-dashed border-rule-strong bg-sunken text-muted">
                      <span className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
                        <Camera className="size-5" aria-hidden />
                        Photo
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl font-bold leading-tight sm:text-3xl">Ayesha Khan</p>
                <p className="text-muted">Frontend Developer, Lahore, Pakistan</p>
                <p className="mt-1 break-words text-[14px] text-muted">ayesha.khan@example.com, linkedin.com/in/ayesha-demo</p>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-rule rounded-2xl border border-rule text-[14px]">
              <AnimatePresence initial={false}>
                {local && (
                  <motion.div key="dob" {...fade} className="overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="font-semibold">Date of birth</span>
                      <span className="rounded-[4px] border border-dashed border-rule-strong px-1.5 text-muted">[your date]</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="font-semibold">Phone</span>
                <span className="text-muted">+92 3xx xxxxxxx</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span className="font-semibold text-muted line-through decoration-warn decoration-2">CNIC: 35202-•••••••-•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 text-[12px] font-semibold leading-6 text-warn">
                  <ShieldAlert className="size-3.5" aria-hidden />
                  Never on a resume
                </span>
              </div>
            </div>
            <SampleCaption>Example output (sample data). Format: {local ? "Pakistan local" : "International"}</SampleCaption>
          </div>
        </div>
      </Container>
    </section>
  );
}

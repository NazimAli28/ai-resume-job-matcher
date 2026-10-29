"use client";

import { Check, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useReduced } from "./hooks";
import { PillToggle } from "./pill-toggle";
import { Container, GlowBlob, SectionHeading } from "./section";

// Planned plans and prices are proposals (PRD 01 §5, [P]) and may change after the pricing survey.
type Billing = "monthly" | "pass";

const PAID: Record<Billing, { name: string; price: string; period: string; note: string; features: string[] }> = {
  monthly: {
    name: "Pro",
    price: "PKR 1,499",
    period: "a month",
    note: "Cancel in one click",
    features: ["40 resume analyses a month", "30 tailored versions and 30 cover letters", "15 mock interviews a month", "Unlimited tracking"],
  },
  pass: {
    name: "Job-search Sprint",
    price: "PKR 999",
    period: "for 2 weeks",
    note: "One-time pass, never auto-renews",
    features: ["Pro limits for 2 weeks", "Made for a focused burst of applications", "Mock interviews before the big one", "Unlimited tracking"],
  },
};

const FREE = ["3 resume analyses a month", "3 tailored versions and 3 cover letters", "2 mock interviews a month", "Unlimited tracking"];
const ALWAYS = ["Every fix for every finding", "PDF and Word export", "Export or delete your data", "CNIC masking on every plan"];

function Features({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5 text-[15px]">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-hl-soft text-hl-ink">
            <Check className="size-3" strokeWidth={3.5} aria-hidden />
          </span>
          {f}
        </li>
      ))}
    </ul>
  );
}

/** ACTION: pricing. Free beta is the highlighted card; the paid card morphs between Pro and the 2-week pass. */
export function Pricing() {
  const reduce = useReduced();
  const [billing, setBilling] = useState<Billing>("monthly");
  const paid = PAID[billing];

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="relative scroll-mt-24 overflow-x-clip py-20 sm:py-28">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <SectionHeading
            id="pricing-title"
            center
            title="Free while we're in beta"
            intro="Everything is free during beta, with free limits doubled. When paid plans arrive, this is what we plan to charge. Fixes are never paywalled."
          />
          <PillToggle
            legend="Paid plan type"
            value={billing}
            onChange={setBilling}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "pass", label: "2-week pass" },
            ]}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Free beta: the highlighted plan */}
          <div className="relative rounded-[20px] glow">
            <GlowBlob className="-inset-6" />
            <div className="card relative flex h-full flex-col gap-6 p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-xl font-bold">Free</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-hl px-2.5 text-[13px] font-semibold leading-7 text-on-hl">
                  <Sparkles className="size-3.5" aria-hidden />
                  Beta: limits doubled
                </span>
              </div>
              <p className="flex items-baseline gap-2">
                <span className="font-display text-5xl font-extrabold tracking-[-0.03em]">PKR 0</span>
                <span className="text-muted">always</span>
              </p>
              <Features items={FREE} />
              <div className="mt-auto flex flex-col gap-2">
                <ButtonLink href="/app" variant="primary" size="lg" className="glow">
                  Try the demo
                </ButtonLink>
                <p className="text-center text-[13px] text-muted">No card needed. Limits shown are after beta.</p>
              </div>
            </div>
          </div>

          {/* Paid plan, switched by the toggle */}
          <div className="card flex flex-col gap-6 p-6 sm:p-7">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={billing}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="flex flex-1 flex-col gap-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-bold">{paid.name}</h3>
                  <span className="rounded-full border border-dashed border-rule-strong px-2.5 text-[12px] font-semibold leading-6 text-muted">
                    Planned prices, may change
                  </span>
                </div>
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="text-muted">about</span>
                  <span className="font-display text-5xl font-extrabold tracking-[-0.03em]">{paid.price}</span>
                  <span className="text-muted">{paid.period}</span>
                </p>
                <Features items={paid.features} />
                <p className="mt-auto rounded-xl bg-sunken px-3 py-2.5 text-[13px] text-muted">
                  {paid.note}. Not available yet: nothing to buy during beta.
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* What every plan includes */}
          <div className="card flex flex-col gap-6 p-6 sm:p-7">
            <h3 className="font-display text-xl font-bold">On every plan</h3>
            <p className="text-[15px] text-muted">The parts that protect you are never behind a paywall.</p>
            <Features items={ALWAYS} />
            <p className="mt-auto text-[13px] text-muted">No trial that turns into a charge. Prices are shown before you sign up.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

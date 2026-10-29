"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { useReduced, scrollToId } from "./hooks";
import { Container, GlowBlob } from "./section";
import { PRODUCT_NAME } from "@/config/brand";
import { Logo } from "./site-header";

const LINES = ["Built 14 React + TypeScript screens", "Used by 300+ dispatchers", "Tests with Jest and RTL"];
const CYCLE = 4.2;

/** Small looping visual: a highlighter sweeps three evidence lines in turn, then a check pops. Static with reduced motion. */
function LoopingSheet() {
  const reduce = useReduced();
  return (
    <div aria-hidden className="relative w-full max-w-[320px] rotate-2 rounded-2xl border border-rule bg-surface p-5 shadow-[var(--card-shadow-hover)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="h-2.5 w-24 rounded-full bg-sunken" />
        <motion.span
          className="grid size-7 place-items-center rounded-full bg-hl text-on-hl glow"
          initial={false}
          animate={reduce ? { scale: 1 } : { scale: [0, 0, 1.15, 1, 1, 0] }}
          transition={reduce ? undefined : { duration: CYCLE, times: [0, 0.6, 0.7, 0.75, 0.95, 1], repeat: Infinity }}
        >
          <Check className="size-4" strokeWidth={3.5} />
        </motion.span>
      </div>
      <ul className="flex flex-col gap-2.5 text-[14px] font-semibold">
        {LINES.map((l, i) => {
          const start = 0.08 + i * 0.16;
          return (
            <li key={l} className="relative self-start">
              <motion.span
                className="absolute inset-x-[-0.25em] bottom-[0.05em] top-[0.62em] origin-left rounded-[0.3em] bg-hl/80"
                initial={false}
                animate={reduce ? { scaleX: 1 } : { scaleX: [0, 0, 1, 1, 0] }}
                transition={reduce ? undefined : { duration: CYCLE, times: [0, start, start + 0.12, 0.95, 1], repeat: Infinity, ease: "easeOut" }}
              />
              <span className="relative text-ink">{l}</span>
            </li>
          );
        })}
        <li className="h-2.5 w-4/5 rounded-full bg-sunken" />
        <li className="h-2.5 w-3/5 rounded-full bg-sunken" />
      </ul>
    </div>
  );
}

/** ACTION: closing band with a glowing CTA. */
export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="py-16 sm:py-24">
      <Container>
        <div className="card relative overflow-hidden px-6 py-12 sm:px-12 sm:py-16">
          <GlowBlob className="-right-24 -top-32 size-[30rem]" />
          <GlowBlob className="-bottom-40 -left-24 size-[24rem] opacity-60" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="flex flex-col items-start gap-6">
              <h2 id="final-title" className="text-balance text-[36px] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[56px]">
                Your next application can be the one you&rsquo;re sure about.
              </h2>
              <p className="max-w-xl text-lg text-muted">
                Open the demo with Ayesha&rsquo;s sample data and try the whole flow: resume, job, tailoring, interview and
                tracker. No account needed.
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/app" variant="primary" size="lg" className="glow">
                  Try the demo
                </ButtonLink>
                <a
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId("how-it-works");
                  }}
                  className={buttonClass("secondary", "lg")}
                >
                  See how it works
                </a>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <LoopingSheet />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

// Legal pages don't exist yet; these are placeholder links.
const LEGAL = [
  { href: "#", label: "Terms" },
  { href: "#", label: "Privacy" },
  { href: "#", label: "AI disclaimer" },
];

const SECTIONS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#try", label: "Try it" },
  { href: "#product", label: "Product" },
  { href: "#trust", label: "Why trust it" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-rule bg-surface/60 pb-28 pt-12 backdrop-blur-sm md:pb-12">
      <Container className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted">
            AI suggestions can be wrong. Review every change before you send your resume. Scores are estimates.
          </p>
          <p className="text-sm text-muted">&copy; 2026 {PRODUCT_NAME}</p>
        </div>
        <nav aria-label="Footer sections" className="flex flex-col gap-1">
          <p className="pb-1 text-sm font-semibold">On this page</p>
          {SECTIONS.map((l) => (
            <a key={l.href} href={l.href} className="inline-flex min-h-11 items-center self-start text-sm text-muted hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <nav aria-label="Legal" className="flex flex-col gap-1">
          <p className="pb-1 text-sm font-semibold">Legal</p>
          {LEGAL.map((l) => (
            <Link key={l.label} href={l.href} className="inline-flex min-h-11 items-center self-start text-sm text-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}

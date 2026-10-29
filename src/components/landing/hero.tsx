"use client";

import { Check, PlayCircle } from "lucide-react";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { HeroVisual } from "./hero-visual";
import { scrollToId } from "./hooks";
import { Container, GlowBlob } from "./section";
import { HeroHeadline } from "./word-swap";

const FACTS = ["Free during beta", "No account or card for the demo", "Your CNIC is masked before any AI step"];

/** ATTENTION: big swapping headline, two CTAs, and the layered 3D product composition. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-x-clip pb-16 pt-8 sm:pb-24 sm:pt-14">
      <GlowBlob className="-right-40 -top-40 size-[36rem] opacity-80" />
      <Container className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
        <div className="flex flex-col gap-6 tall:gap-7">
          <HeroHeadline id="hero-title" />
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted sm:text-xl">
            Paste a job and see how your resume really fits. Every finding points to a line you wrote, every edit uses
            only facts you&rsquo;ve confirmed, and the interview gets practiced before it happens.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/app" variant="primary" size="lg" className="glow">
              Try the demo
            </ButtonLink>
            <a
              href="#try"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("try");
              }}
              className={buttonClass("secondary", "lg")}
            >
              <PlayCircle className="size-5" aria-hidden />
              Watch it work
            </a>
          </div>
          <ul className="flex flex-col gap-2 text-[15px] text-muted sm:flex-row sm:flex-wrap sm:gap-x-5">
            {FACTS.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-hl-soft text-hl-ink">
                  <Check className="size-3" strokeWidth={3.5} aria-hidden />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </Container>
    </section>
  );
}

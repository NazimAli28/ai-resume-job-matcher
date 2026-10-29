"use client";

import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { useReduced } from "./hooks";
import { Container, SectionHeading } from "./section";

const FAQ = [
  {
    q: "Will it help me beat the ATS?",
    a: "No tool can honestly promise that. Applicant tracking systems differ, and most decisions are made by people reading what the system shows them. What we do: check that software can read your file (parse health), show how well your resume covers a specific job, and help you say true things more clearly. Our scores are estimates, never an “ATS score”.",
  },
  {
    q: "Will it make things up on my resume?",
    a: "No. Every edit cites a line from your resume or a fact you confirmed. When something would need a fact we don't have, like a number, we ask you or leave a visible placeholder. You accept or reject every change.",
  },
  {
    q: "What if a job asks for a skill I don't list?",
    a: "We never add it for you. The job match marks it missing and asks whether you have it. If you say yes and describe where you used it in a line, that becomes saved evidence: it can appear in suggestions and counts for every future job that asks for it. If you say no, it stays off your resume. You can edit or delete saved evidence any time in your profile.",
  },
  {
    q: "What do I actually get to download?",
    a: "Two ways to work. Either preview an improved copy with every change highlighted, then download it as PDF or Word, or take the suggestions and edit your own file. Each tailored version is saved, so your tracker shows which one you sent to which company. Cover letters download too.",
  },
  {
    q: "Is my data used to train AI?",
    a: "No, unless you opt in. The setting is off by default and you can turn it off again any time. Before any text reaches an AI model, personal details such as your CNIC, phone, email and address are masked.",
  },
  {
    q: "Does it work for Pakistani and international resumes?",
    a: "Yes. You choose a target market. For local roles it respects common Pakistani conventions; for international roles it suggests removing things like a photo or date of birth. Either way it tells you to keep your CNIC off your resume. The product is in English.",
  },
  {
    q: "Can I use the interview coach during a real interview?",
    a: "No, and it is built not to work that way. It is practice only: no hidden overlay, no live answers. You rehearse before, read the report, and walk in prepared.",
  },
  {
    q: "What is free?",
    a: "During beta, everything, with free limits doubled. After beta, the planned Free plan includes 3 resume analyses, 3 tailored versions, 3 cover letters and 2 mock interviews a month, unlimited tracking, and every fix for every finding. Export and deleting your data are always free.",
  },
];

/** Animated accordion: one open at a time, real buttons with aria-expanded. */
export function Faq() {
  const reduce = useReduced();
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();

  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-14">
        <SectionHeading
          id="faq-title"
          title="Questions, answered plainly"
          intro="The things people ask before trusting a tool with their resume."
          className="lg:sticky lg:top-28 lg:self-start"
        />
        <ul className="flex flex-col gap-3">
          {FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q} className={cn("rounded-2xl border bg-surface transition-[border-color,box-shadow]", isOpen ? "border-rule-strong shadow-[var(--card-shadow-hover)]" : "border-rule")}>
                <h3>
                  <button
                    type="button"
                    id={`${base}-q${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`${base}-a${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl px-5 py-3 text-left text-[17px] font-semibold"
                  >
                    {f.q}
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: reduce ? 0 : 0.2 }}
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full transition-colors",
                        isOpen ? "bg-hl text-on-hl glow" : "bg-sunken text-muted",
                      )}
                    >
                      <Plus className="size-4" aria-hidden />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`${base}-a${i}`}
                      role="region"
                      aria-labelledby={`${base}-q${i}`}
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduce ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-prose px-5 pb-5 leading-relaxed text-muted">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

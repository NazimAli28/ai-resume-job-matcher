import { ClipboardPaste, FileUp, Wand2, type LucideIcon } from "lucide-react";
import { Item, Stagger } from "@/components/ui/motion";
import { Container, SectionHeading } from "./section";

const STEPS: { icon: LucideIcon; title: string; body: string; result: string }[] = [
  {
    icon: FileUp,
    title: "Upload your resume",
    body: "PDF or Word. We check that software can read it, mask your CNIC and contact details, and note which lines prove what you can do.",
    result: "Parse health and readability estimates",
  },
  {
    icon: ClipboardPaste,
    title: "Paste a job you want",
    body: "Add the posting, its link and where you found it. Each requirement is matched against your resume, and anything missing becomes a question for you.",
    result: "A job match estimate with its breakdown",
  },
  {
    icon: Wand2,
    title: "Tailor, practice, track",
    body: "Accept edits built from your own facts, rehearse a mock interview for that job, then log the application with the version you sent.",
    result: "A tailored resume, an interview report, a tracker card",
  },
];

/** INTEREST: three steps, one row. The detail lives in the product tabs below. */
export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-24 py-20 sm:py-24">
      <Container className="flex flex-col gap-10">
        <SectionHeading id="how-title" title="From resume to interview in three steps" />
        <Stagger className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body, result }, i) => (
            <Item key={title} className="h-full">
              <article className="card card-hover group relative flex h-full flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-hl text-on-hl glow transition-transform duration-300 group-hover:-rotate-6">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span aria-hidden className="font-display text-5xl font-extrabold text-rule-strong">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
                  <span className="sr-only">Step {i + 1}: </span>
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed text-muted">{body}</p>
                <div className="mt-auto flex flex-col gap-1 border-t border-rule pt-4">
                  <span className="text-[13px] font-semibold text-muted">You get</span>
                  <span className="font-semibold">{result}</span>
                </div>
              </article>
            </Item>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

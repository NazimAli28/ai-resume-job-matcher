import { Download, EyeOff, Gauge, Globe2, MonitorX, ShieldCheck, type LucideIcon } from "lucide-react";
import { EvidenceLoop } from "./evidence-loop";
import { Container, IconChip, SectionHeading } from "./section";

const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: EyeOff,
    title: "Masked before any AI step",
    body: "Your CNIC, phone, email and address become placeholders like [CNIC] before text reaches an AI model. Your CNIC never goes on a resume.",
  },
  {
    icon: Gauge,
    title: "Estimates, not “ATS scores”",
    body: "Every score is computed in code from factors you can see. None of them predicts whether you'll be hired.",
  },
  {
    icon: MonitorX,
    title: "Practice only",
    body: "The interview coach helps you prepare. It never feeds you answers in a real interview.",
  },
  {
    icon: Globe2,
    title: "Pakistan first, international too",
    body: "Pick a target market per resume. Local conventions for Pakistani roles; photo and date of birth flagged for jobs abroad.",
  },
  {
    icon: Download,
    title: "Your data, your call",
    body: "Export or delete everything yourself, free. Nothing is used to train AI unless you opt in.",
  },
];

/** DESIRE: the evidence loop, live, plus the other commitments in one compact list. */
export function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="scroll-mt-24 py-20 sm:py-28">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          id="trust-title"
          title="It never adds what you don't have"
          intro="Many resume tools push you to copy keywords from the job post into your resume. We ask instead. What you confirm is saved as evidence and reused; what you don't stays off."
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <article className="card relative flex min-w-0 flex-col gap-5 overflow-hidden p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <IconChip icon={ShieldCheck} strong />
              <h3 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Try it: a skill the job wants</h3>
            </div>
            <EvidenceLoop />
          </article>

          <ul className="card flex flex-col divide-y divide-rule p-2 sm:p-3">
            {POINTS.map(({ icon, title, body }) => (
              <li key={title} className="flex items-start gap-4 p-3 sm:p-4">
                <IconChip icon={icon} />
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="font-bold leading-snug">{title}</h3>
                  <p className="text-[15px] leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

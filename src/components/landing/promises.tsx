import { Download, Gauge, ShieldCheck, Quote, type LucideIcon } from "lucide-react";
import { Item, Stagger } from "@/components/ui/motion";
import { Container, SectionHeading } from "./section";

const PROMISES: { icon: LucideIcon; title: string; how: string }[] = [
  {
    icon: Quote,
    title: "We never invent your experience",
    how: "Every suggestion cites a line from your resume or a fact you confirmed. Anything else becomes a question to you, or a visible placeholder.",
  },
  {
    icon: Gauge,
    title: "Estimates, not “ATS scores”",
    how: "Scores are computed in code from factors you can see, with the breakdown beside them. No score predicts whether you will be hired.",
  },
  {
    icon: ShieldCheck,
    title: "Masked before any AI sees it",
    how: "Your CNIC, phone, email and address are replaced with placeholders before any text is sent to an AI model.",
  },
  {
    icon: Download,
    title: "Export and delete, any time",
    how: "Download everything or delete your account yourself, free. Your data is not used to train AI unless you opt in.",
  },
];

/** Promises instead of testimonials: we're in beta and won't make any up. */
export function Promises() {
  return (
    <section aria-labelledby="promises-title" className="py-20 sm:py-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          id="promises-title"
          title="Four promises, kept in code"
          intro="No testimonials yet, because we're in beta and won't make them up. Here's what we commit to instead."
        />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, how }) => (
            <Item key={title} className="h-full">
              <div className="card card-hover group flex h-full flex-col gap-5 p-6">
                <span className="grid size-14 place-items-center rounded-2xl bg-hl text-on-hl glow transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                  <Icon className="size-7" aria-hidden />
                </span>
                <h3 className="text-[22px] font-extrabold leading-[1.1] tracking-[-0.02em]">{title}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{how}</p>
              </div>
            </Item>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

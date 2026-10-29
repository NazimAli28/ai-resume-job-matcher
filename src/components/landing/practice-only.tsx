import { Check, X } from "lucide-react";

const YES = ["Mock interviews for a real job", "Scored reports with quotes", "Model answers from your facts"];
const NO = ["Live-interview overlays", "Hidden prompts during a call", "Answers whispered to you"];

/** Practice-only promise as a two-list card: what the coach does, and what it will never do. */
export function PracticeOnly() {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2 rounded-2xl bg-hl-soft/60 p-3" aria-label="What the interview coach does">
        {YES.map((t) => (
          <li key={t} className="flex items-start gap-2 text-[14px] font-semibold">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-hl text-on-hl">
              <Check className="size-3" strokeWidth={3.5} aria-hidden />
            </span>
            {t}
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-2 rounded-2xl border border-dashed border-rule-strong p-3" aria-label="What it will never do">
        {NO.map((t) => (
          <li key={t} className="flex items-start gap-2 text-[14px] text-muted">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-warn-soft text-warn">
              <X className="size-3" strokeWidth={3.5} aria-hidden />
            </span>
            <span className="line-through decoration-rule-strong">{t}</span>
          </li>
        ))}
      </ul>
      <p className="mt-auto text-[13px] text-muted">Never built, never planned. You practice; the real interview is yours.</p>
    </div>
  );
}

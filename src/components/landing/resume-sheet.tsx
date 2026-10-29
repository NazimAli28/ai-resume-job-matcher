import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EVIDENCE_LINES, HERO_FINDINGS, sampleResume } from "./sample";
import { reached, type Phase } from "./demo-stages";

const PII = /(ayesha\.khan@example\.com|\+92 3xx xxxxxxx|35202-•••••••-•)/;
const PII_LABEL: Record<string, string> = {
  "ayesha.khan@example.com": "email",
  "+92 3xx xxxxxxx": "phone",
  "35202-•••••••-•": "CNIC",
};

/** Shows personal details as they are, or as the masked token the AI would receive. */
function withPii(text: string, masked: boolean): ReactNode {
  if (!masked) return text;
  return text.split(PII).map((part, i) =>
    PII_LABEL[part] ? (
      <span
        key={i}
        className="rounded-[4px] border border-dashed border-rule-strong bg-sunken px-1 font-semibold text-muted"
        title="Masked before any AI step"
      >
        [{PII_LABEL[part]}]<span className="sr-only"> (masked)</span>
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function Marker({ n, active }: { n: number; active: boolean }) {
  return (
    <sup
      aria-label={`Finding ${n}`}
      className={cn(
        "ml-1 inline-grid size-[18px] translate-y-[-1px] place-items-center rounded-full text-[11px] font-bold leading-none",
        active ? "bg-warn text-surface" : "bg-warn-soft text-warn",
      )}
    >
      {n}
    </sup>
  );
}

/**
 * Ayesha's sample resume rendered as a sheet of paper. As the demo phases advance,
 * PII is masked, findings get numbered markers, and evidence lines get the highlighter.
 */
export function ResumeSheet({ phase, activeFinding }: { phase: Phase; activeFinding: string | null }) {
  const masked = reached(phase, "masking");

  const decorate = (line: string, content: ReactNode, isHeading = false) => {
    const idx = HERO_FINDINGS.findIndex((f) => f.line === line);
    const finding = idx >= 0 ? HERO_FINDINGS[idx] : null;
    const shown = finding && reached(phase, finding.stage);
    const active = !!finding && activeFinding === finding.id;
    const isEvidence = EVIDENCE_LINES.includes(line) && reached(phase, "evidence");
    const delay = EVIDENCE_LINES.indexOf(line) * 260;
    return (
      <span
        data-finding={finding?.id}
        className={cn(
          "rounded-[3px] transition-[outline-color,background-color] duration-150",
          shown && "underline decoration-warn decoration-wavy decoration-1 underline-offset-[5px]",
          active && "bg-warn-soft outline-2 outline-offset-2 outline-warn",
          isHeading && "font-display",
        )}
      >
        {isEvidence ? (
          <mark className="hl hl-sweep" style={{ animationDelay: `${delay}ms` }}>
            {content}
          </mark>
        ) : (
          content
        )}
        {shown && <Marker n={idx + 1} active={active} />}
      </span>
    );
  };

  const [header, ...rest] = sampleResume.sections;
  const [nameLine, ...contact] = header.lines;
  const [name, city] = nameLine.split(" · ");

  return (
    <article
      aria-label="Sample resume: Ayesha Khan"
      className="relative rounded-xl border border-rule bg-surface px-5 py-6 shadow-[var(--card-shadow)] text-[13px] leading-relaxed text-ink sm:px-8 sm:py-8 sm:text-sm"
    >
      <header className="border-b border-rule pb-3">
        <p className="font-display text-xl font-bold sm:text-2xl">{name}</p>
        <p className="text-muted">{city}</p>
        {contact.map((line) => (
          <p key={line} className="text-muted">
            {decorate(line, withPii(line, masked))}
          </p>
        ))}
      </header>
      {rest.map((section) => (
        <section key={section.heading} className="pt-3">
          <h3 className="pb-1 text-[13px] font-bold text-ink sm:text-sm">
            {decorate(section.heading, section.heading, true)}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {section.lines.map((line) => {
              const isRole = line.includes(" — ") && line.includes(" · ");
              return (
                <li key={line} className={cn(isRole ? "pt-1 font-semibold" : "pl-3 text-ink/90", !isRole && "relative")}>
                  {!isRole && section.heading === "My Journey" && (
                    <span aria-hidden className="absolute left-0 text-muted">
                      •
                    </span>
                  )}
                  {decorate(line, line)}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </article>
  );
}

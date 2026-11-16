import { contactLine, formatRange } from "@/server/export/blocks";
import type { ResumeDoc } from "@/server/resume/types";

/** The resume as it will be exported. Changed parts carry a "Changed" label, so the mark isn't color alone (TLR-011). */
function Mark({ id, changed, children }: { id: string; changed: Set<string>; children: React.ReactNode }) {
  if (!changed.has(id)) return <>{children}</>;
  return (
    <span>
      <mark className="hl">{children}</mark> <span className="whitespace-nowrap rounded-full bg-hl-soft px-1.5 text-[11px] font-bold uppercase tracking-wide text-hl-ink">Changed</span>
    </span>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h4 className="mt-4 border-b border-rule pb-1 text-[13px] font-bold uppercase tracking-wider">{children}</h4>;
}

export function ResumePreview({ doc, changed }: { doc: ResumeDoc; changed: Set<string> }) {
  return (
    <article aria-label="Preview of the tailored resume" className="rounded-2xl border border-rule bg-surface p-5 text-[14px] leading-relaxed">
      {doc.basics.name && <p className="font-display text-xl font-bold">{doc.basics.name}</p>}
      {doc.basics.headline && <p className="text-muted">{doc.basics.headline}</p>}
      <p className="break-words text-[13px] text-muted">{contactLine(doc)}</p>
      {doc.basics.summary && (
        <>
          <H>Summary</H>
          <p className="mt-1"><Mark changed={changed} id="summary">{doc.basics.summary}</Mark></p>
        </>
      )}
      {doc.work.length > 0 && <H>Experience</H>}
      {doc.work.map((w) => (
        <div key={w.id} className="mt-2">
          <p className="font-semibold">{[w.title, w.employer].filter(Boolean).join(", ")}</p>
          <p className="text-[13px] text-muted">{[w.location, formatRange(w.dates)].filter(Boolean).join(" | ")}</p>
          <ul className="mt-1 list-disc pl-5">
            {w.bullets.map((b) => <li key={b.id} className="break-words"><Mark changed={changed} id={b.id}>{b.text}</Mark></li>)}
          </ul>
        </div>
      ))}
      {doc.projects.length > 0 && <H>Projects</H>}
      {doc.projects.map((p) => (
        <div key={p.id} className="mt-2">
          <p className="font-semibold">{p.name}</p>
          <ul className="mt-1 list-disc pl-5">
            {p.bullets.map((b) => <li key={b.id} className="break-words"><Mark changed={changed} id={b.id}>{b.text}</Mark></li>)}
          </ul>
        </div>
      ))}
      {doc.education.length > 0 && <H>Education</H>}
      {doc.education.map((e) => (
        <p key={e.id} className="mt-1">
          <span className="font-semibold">{[e.degreeRaw, e.institution].filter(Boolean).join(", ")}</span>
          <span className="text-[13px] text-muted"> {[formatRange(e.dates), e.grade].filter(Boolean).join(" | ")}</span>
        </p>
      ))}
      {doc.skills.length > 0 && (
        <>
          <H>Skills</H>
          <p className="mt-1 break-words"><Mark changed={changed} id="skills">{doc.skills.join(", ")}</Mark></p>
        </>
      )}
    </article>
  );
}

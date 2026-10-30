import { AlertTriangle } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { SectionCard } from "@/components/profile-real/section-card";
import type { Finding, ResumeDoc, Severity } from "@/server/resume/types";

const SEV: Record<Severity, { label: string; className: string; order: number }> = {
  ERR: { label: "Fix", className: "bg-warn-soft text-warn", order: 0 },
  WARN: { label: "Check", className: "bg-partial-soft text-partial", order: 1 },
  TIP: { label: "Tip", className: "border border-rule text-muted", order: 2 },
};

const CATEGORIES = [
  { key: "parse", title: "Parse", intro: "Can software read this file the way you meant?" },
  { key: "readability", title: "Readability", intro: "How the resume reads to a person skimming it." },
  { key: "privacy", title: "Privacy", intro: "Details that shouldn't be on a resume." },
] as const;

export function FindingsReport({ findings }: { findings: Finding[] }) {
  const privacyHasErr = findings.some((f) => f.category === "privacy" && f.severity === "ERR");
  const cats = privacyHasErr ? [CATEGORIES[2], CATEGORIES[0], CATEGORIES[1]] : CATEGORIES;
  return (
    <div className="flex flex-col gap-6">
      {cats.map((c) => {
        const items = findings.filter((f) => f.category === c.key).sort((a, b) => SEV[a.severity].order - SEV[b.severity].order);
        return (
          <SectionCard
            key={c.key}
            id={`findings-${c.key}`}
            title={`${c.title} (${items.length})`}
            intro={c.intro}
          >
            {items.length === 0 ? (
              <p className="text-sm text-muted">Nothing to flag here.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {items.map((f, i) => (
                  <li key={`${f.ruleId}-${i}`} className="flex flex-col gap-2 rounded-xl border border-rule p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip className={SEV[f.severity].className}>{SEV[f.severity].label}</Chip>
                      <h3 className="min-w-0 font-semibold">{f.title}</h3>
                    </div>
                    <p className="text-sm text-muted">{f.message}</p>
                    {f.evidence && f.evidence.length > 0 && (
                      <div className="flex flex-col gap-1 rounded-lg bg-sunken px-3 py-2 font-mono text-[13px] text-muted">
                        {f.evidence.map((e, j) => (
                          <span key={j} className="break-words">
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}

/** First two characters then dots, so we confirm what we found without showing all of it. */
function mask(v: string) {
  return v.length <= 2 ? "••••" : `${v.slice(0, 2)}•••`;
}

export function FoundSummary({ doc }: { doc: ResumeDoc }) {
  const b = doc.basics;
  return (
    <SectionCard id="found" title="What we found" intro="What our reader picked out of your file. If something here is wrong, a hiring system may get it wrong too.">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">Name</dt>
          <dd className="text-muted">{b.name ?? "Not found"}</dd>
        </div>
        <div>
          <dt className="font-semibold">Email</dt>
          <dd className="text-muted">{b.email ? mask(b.email) : "Not found"}</dd>
        </div>
        <div>
          <dt className="font-semibold">Phone</dt>
          <dd className="text-muted">{b.phone ? mask(b.phone) : "Not found"}</dd>
        </div>
        <div>
          <dt className="font-semibold">Education</dt>
          <dd className="text-muted">
            {doc.education.length === 0
              ? "Not found"
              : doc.education.map((e) => [e.degreeRaw, e.institution].filter(Boolean).join(", ")).join("; ")}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Roles ({doc.work.length})</h3>
        {doc.work.length === 0 ? (
          <p className="text-sm text-muted">No roles found.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {doc.work.map((w) => (
              <li key={w.id} className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-semibold">{w.title || "Untitled role"}</span>
                <span className="text-muted">
                  {[w.employer, w.dates?.raw].filter(Boolean).join(" · ") || "No employer or dates found"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Skills ({doc.skills.length})</h3>
        {doc.skills.length === 0 ? (
          <p className="text-sm text-muted">No skills found.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {doc.skills.slice(0, 40).map((s, i) => (
              <li key={`${s}-${i}`} className="rounded-full bg-hl-soft px-3 py-1 text-sm font-semibold text-hl-ink">
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Sections detected</h3>
        {doc.sections.length === 0 ? (
          <p className="text-sm text-muted">No sections detected.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {doc.sections.map((s, i) => (
              <li key={`${s.heading}-${i}`} className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1 text-sm">
                {!s.standardHeading && (
                  <>
                    <AlertTriangle className="size-3.5 text-warn" aria-hidden />
                    <span className="sr-only">Non-standard heading: </span>
                  </>
                )}
                {s.heading || s.kind}
              </li>
            ))}
          </ul>
        )}
        {doc.sections.some((s) => !s.standardHeading) && (
          <p className="text-[13px] text-muted">Headings with a warning icon aren&apos;t ones most systems expect. Common names like Experience, Education and Skills are safest.</p>
        )}
      </div>
    </SectionCard>
  );
}

"use client";

import { Fragment } from "react";
import type { ResumeFinding, ResumeSection } from "@/demo/types";
import { cn } from "@/lib/cn";
import { parseSections } from "./parsed";
import { Paper } from "./visual";

export interface Anchor {
  key: string; // "h-0" for a heading, "l-0-2" for a line
  start: number;
  end: number;
}

export const lineId = (key: string) => `line-${key}`;

/** Finds the line (or heading) holding each finding's evidence. Findings without evidence get no anchor. */
export function buildAnchors(sections: ResumeSection[], findings: ResumeFinding[]): Map<string, Anchor> {
  const map = new Map<string, Anchor>();
  for (const f of findings) {
    const ev = f.evidence;
    if (!ev) continue;
    sections.forEach((s, si) => {
      if (map.has(f.id) || s.heading !== ev.section) return;
      if (s.heading === ev.text) {
        map.set(f.id, { key: `h-${si}`, start: 0, end: ev.text.length });
        return;
      }
      s.lines.forEach((line, li) => {
        const at = line.indexOf(ev.text);
        if (!map.has(f.id) && at >= 0) map.set(f.id, { key: `l-${si}-${li}`, start: at, end: at + ev.text.length });
      });
    });
  }
  return map;
}

function Marked({ text, anchor }: { text: string; anchor?: Anchor }) {
  if (!anchor) return <>{text}</>;
  return (
    <>
      {text.slice(0, anchor.start)}
      <mark className="hl hl-sweep">{text.slice(anchor.start, anchor.end)}</mark>
      {text.slice(anchor.end)}
    </>
  );
}

function Marker({
  findings,
  activeId,
  onPick,
}: {
  findings: ResumeFinding[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  if (findings.length === 0) return <span className="w-9 shrink-0" aria-hidden />;
  return (
    <span className="flex w-9 shrink-0 flex-col items-center">
      {findings.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-label={`Show finding: ${f.title}`}
          aria-pressed={activeId === f.id}
          onClick={() => onPick(f.id)}
          className="flex size-9 items-center justify-center rounded-full hover:bg-sunken"
        >
          <span
            className={cn(
              "size-2.5 rounded-full border-2 border-ink/50",
              f.resolved ? "bg-transparent opacity-40" : "bg-ink/50",
              activeId === f.id && "border-hl-ink bg-hl",
            )}
          />
        </button>
      ))}
    </span>
  );
}

export function ResumeLines({
  sections,
  findings,
  anchors,
  activeId,
  onPick,
}: {
  sections: ResumeSection[];
  findings: ResumeFinding[];
  anchors: Map<string, Anchor>;
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const at = (key: string) => findings.filter((f) => anchors.get(f.id)?.key === key);
  const activeAnchor = activeId ? anchors.get(activeId) : undefined;
  const forKey = (key: string) => (activeAnchor?.key === key ? activeAnchor : undefined);

  return (
    <Paper className="flex flex-col gap-5 !px-3 sm:!px-6">
      {sections.map((s, si) => {
        const isHeader = si === 0 && s.heading === "Header";
        return (
          <section key={`${s.heading}-${si}`} aria-label={s.heading} className={cn(!isHeader && "border-t border-rule pt-4")}>
            <div id={lineId(`h-${si}`)} className="flex items-center scroll-mt-24">
              <Marker findings={at(`h-${si}`)} activeId={activeId} onPick={onPick} />
              <h3 className={cn("font-display font-bold", isHeader ? "sr-only" : "text-base")}>
                <Marked text={s.heading} anchor={forKey(`h-${si}`)} />
              </h3>
            </div>
            {s.lines.map((line, li) => {
              const key = `l-${si}-${li}`;
              const title = isHeader && li === 0;
              return (
                <div key={key} id={lineId(key)} className="flex items-start scroll-mt-24">
                  <Marker findings={at(key)} activeId={activeId} onPick={onPick} />
                  <p className={cn("min-h-9 flex-1 py-1.5 leading-relaxed", title && "font-display text-2xl font-bold", isHeader && !title && "text-sm text-muted")}>
                    <Marked text={line} anchor={forKey(key)} />
                  </p>
                </div>
              );
            })}
          </section>
        );
      })}
    </Paper>
  );
}

export function ParsedView({ sections }: { sections: ResumeSection[] }) {
  const p = parseSections(sections);
  return (
    <div className="card flex flex-col gap-6 p-5 sm:p-6">
      <p className="rounded-xl bg-sunken px-3 py-2 text-sm text-muted">
        This is the structured data a system builds from your resume. If something looks wrong here, it will look
        wrong to the recruiter&apos;s software too. Contact details are masked.
      </p>

      <Group title="Contact">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {p.contact.map((c, i) => (
            <Fragment key={i}>
              <dt className="text-sm text-muted">{c.label}</dt>
              <dd>
                {c.value}
                {c.note && <span className="block text-sm text-muted">{c.note}</span>}
              </dd>
            </Fragment>
          ))}
        </dl>
      </Group>

      <Group title={`Experience (${p.experience.length} ${p.experience.length === 1 ? "entry" : "entries"})`}>
        {p.guessed.map((g) => (
          <p key={g.heading} className="text-sm text-partial">
            We guessed that &quot;{g.heading}&quot; means {g.as}. A standard heading removes the guess.
          </p>
        ))}
        <ul className="flex flex-col gap-3">
          {p.experience.map((e, i) => (
            <li key={i}>
              <p className="font-semibold">{e.title}</p>
              <p className="text-sm text-muted">
                {e.org}, {e.dates}
              </p>
              <p className="text-sm text-muted">{e.bullets.length} bullets</p>
            </li>
          ))}
        </ul>
      </Group>

      <Group title={`Skills (${p.skills.length})`}>
        <ul className="flex flex-wrap gap-1.5">
          {p.skills.map((s) => (
            <li key={s} className="rounded-full border border-rule px-3 py-0.5 text-sm">
              {s}
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Education">
        <ul className="flex flex-col gap-1">
          {p.education.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </Group>

      {p.projects.length > 0 && (
        <Group title="Projects">
          <ul className="flex flex-col gap-1">
            {p.projects.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-display text-base font-bold">{title}</h3>
      {children}
    </section>
  );
}

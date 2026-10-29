"use client";

import { ShieldAlert } from "lucide-react";
import { Paper } from "@/components/resumes/visual";
import type { ResumeVersion, Suggestion } from "@/demo/types";
import { isSkillQuestion } from "../lib/tailor";
import { ChangeBlock } from "./change-block";
import type { SuggestionApi } from "./use-suggestions";

const isRoleLine = (l: string) => /\s[—–-]\s/.test(l) && /·/.test(l);

/** Path A: the full resume with each change shown inline where it happens. */
export function ResumeDiff({
  resume,
  api,
  answers,
  setAnswer,
}: {
  resume: ResumeVersion;
  api: SuggestionApi;
  answers: Record<string, string>;
  setAnswer: (id: string, v: string) => void;
}) {
  const byLine = new Map<string, Suggestion>();
  api.list.filter((s) => s.before).forEach((s) => !byLine.has(s.before) && byLine.set(s.before, s));
  const inserts = api.list.filter(isSkillQuestion);
  const allLines = new Set(resume.sections.flatMap((s) => s.lines));
  const unplaced = api.list.filter((s) => s.before && !allLines.has(s.before));

  const block = (s: Suggestion) => <ChangeBlock key={s.id} s={s} api={api} answer={answers[s.id] ?? ""} onAnswer={(v) => setAnswer(s.id, v)} />;

  return (
    <Paper label={`Resume ${resume.label} with suggested changes`}>
      {resume.sections.map((sec) => (
        <section key={sec.heading} className="border-b border-rule py-4 first:pt-0 last:border-0">
          {sec.heading !== "Header" && <h3 className="pb-2 text-base font-bold">{sec.heading}</h3>}
          <div className="flex flex-col gap-1">
            {sec.lines.map((line, i) => {
              if (/\bCNIC\b/i.test(line)) {
                return (
                  <div key={i} className="flex flex-col gap-1 py-1">
                    <del className="text-muted">{line}</del>
                    <p className="flex items-center gap-1.5 text-sm text-warn">
                      <ShieldAlert className="size-4 shrink-0" aria-hidden />
                      Left out of your tailored version. Never put your CNIC on a resume.
                    </p>
                  </div>
                );
              }
              const s = byLine.get(line);
              if (s) return block(s);
              if (sec.heading === "Header") return <p key={i} className={i === 0 ? "font-display text-xl font-bold" : "text-sm text-muted"}>{line}</p>;
              return (
                <p key={i} className={isRoleLine(line) ? "pt-2 font-semibold" : "pl-4 -indent-3 before:mr-2 before:content-['•']"}>
                  {line}
                </p>
              );
            })}
            {/skill/i.test(sec.heading) && inserts.map(block)}
          </div>
        </section>
      ))}
      {unplaced.length > 0 && (
        <section className="pt-4">
          <h3 className="text-base font-bold">Changes for lines that aren&apos;t in {resume.label}</h3>
          <p className="pb-2 text-sm text-muted">These were written for another version of your resume. Accepting them won&apos;t change this version.</p>
          {unplaced.map(block)}
        </section>
      )}
    </Paper>
  );
}

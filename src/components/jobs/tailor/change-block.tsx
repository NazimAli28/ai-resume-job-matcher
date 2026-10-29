"use client";

import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Suggestion } from "@/demo/types";
import { cn } from "@/lib/cn";
import { isSkillQuestion, needsAnswer, PLACEHOLDER } from "../lib/tailor";
import { EvidenceChip, SuggestionMeta } from "./bits";
import { QuestionField } from "./question-field";
import type { SuggestionApi } from "./use-suggestions";

/** One inline change on the resume document (path A). */
export function ChangeBlock({
  s,
  api,
  answer,
  onAnswer,
}: {
  s: Suggestion;
  api: SuggestionApi;
  answer: string;
  onAnswer: (v: string) => void;
}) {
  const insert = isSkillQuestion(s);
  const swept = api.justAccepted.has(s.id);
  const asks = needsAnswer(s) && s.status === "PENDING";
  const preview = asks && !insert && answer.trim() ? s.after.replace(PLACEHOLDER, answer.trim()) : s.after;

  return (
    <div
      id={`chg-${s.id}`}
      className={cn(
        "scroll-mt-24 -mx-2 my-2 rounded-2xl border bg-surface px-3 py-3 shadow-sm transition-colors sm:-mx-3",
        s.status === "ACCEPTED" ? "border-hl-ink/60" : "border-rule",
      )}
    >
      {/* The text itself */}
      {s.status === "ACCEPTED" ? (
        <p className="leading-relaxed">
          {s.before && <del className="mr-1.5 text-muted decoration-1">{s.before}</del>}
          <span className="sr-only">changed to </span>
          <ins className={cn("hl no-underline", swept && "hl-sweep")}>{insert ? `Adds “${s.after}” to your skills` : s.after}</ins>
        </p>
      ) : s.status === "REJECTED" ? (
        <p className="leading-relaxed">{s.before || <span className="text-muted">No change: {s.after} not added.</span>}</p>
      ) : (
        <div className="flex flex-col gap-2 leading-relaxed">
          {s.before && (
            <div className="rounded-xl border-l-4 border-warn bg-warn-soft/50 px-3 py-2">
              <p className="text-xs font-semibold text-warn">Before</p>
              <p className="text-muted">{s.before}</p>
            </div>
          )}
          <div className="rounded-xl border-l-4 border-hl-ink bg-hl-soft/60 px-3 py-2">
            <p className="text-xs font-semibold text-hl-ink">{insert ? "Would add to skills" : "Proposed"}</p>
            <p>{preview}</p>
          </div>
        </div>
      )}

      {/* Why, evidence, controls */}
      <div className="mt-2 flex flex-col gap-2 border-t border-rule pt-2">
        <SuggestionMeta s={s} />
        <p className="text-sm text-muted">{s.reason}</p>
        <EvidenceChip s={s} />
        {asks && <QuestionField s={s} value={answer} onChange={onAnswer} />}
        <div className="flex flex-wrap gap-2">
          {s.status === "PENDING" ? (
            <>
              <Button size="sm" variant="primary" disabled={asks && !answer.trim()} onClick={() => api.accept(s, answer)}>
                <Check className="size-4" aria-hidden />
                {asks ? "Accept with my answer" : "Accept"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => api.skip(s)}>
                {asks ? (insert ? "I haven't used it" : "I don't know") : "Skip"}
              </Button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center text-sm text-muted">{s.status === "ACCEPTED" ? "Accepted" : asks || s.kind === "QUESTION" ? "Kept your original" : "Skipped"}</span>
              <Button size="sm" variant="ghost" onClick={() => api.undo(s)}>
                <Undo2 className="size-4" aria-hidden />
                Undo
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

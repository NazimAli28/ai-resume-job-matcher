"use client";

import { Check, Copy, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Suggestion } from "@/demo/types";
import { cn } from "@/lib/cn";
import { copyText } from "../lib/browser";
import { isSkillQuestion, needsAnswer, PLACEHOLDER } from "../lib/tailor";
import { EvidenceChip, SuggestionMeta } from "./bits";
import { QuestionField } from "./question-field";
import type { SuggestionApi } from "./use-suggestions";

/** Path B: before/after rows for people who edit their own file. */
export function SuggestionList({ api, answers, setAnswer }: { api: SuggestionApi; answers: Record<string, string>; setAnswer: (id: string, v: string) => void }) {
  const toast = useToast();
  const n = (st: Suggestion["status"]) => api.list.filter((s) => s.status === st).length;
  const needInput = api.list.filter((s) => s.status === "PENDING" && needsAnswer(s)).length;

  const textFor = (s: Suggestion) => {
    const a = (answers[s.id] ?? "").trim();
    if (isSkillQuestion(s)) return s.after;
    return a ? s.after.replace(PLACEHOLDER, a) : s.after;
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {api.list.length} suggestions: {n("PENDING")} pending ({needInput} need your input), {n("ACCEPTED")} applied, {n("REJECTED")} dismissed.
        Copy the new text into your own file, or apply it here.
      </p>
      <ul className="flex flex-col gap-3">
        {api.list.map((s) => {
          const asks = s.status === "PENDING" && needsAnswer(s);
          const answer = answers[s.id] ?? "";
          return (
            <li key={s.id} className={cn("card p-4 sm:p-5", s.status === "ACCEPTED" && "border-hl-ink/60", s.status === "REJECTED" && "opacity-75")}>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                <SuggestionMeta s={s} />
                <span className="text-sm text-muted">{s.section}</span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border-l-4 border-warn bg-warn-soft/50 px-3 py-2">
                  <dt className="pb-1 text-xs font-semibold text-warn">Before</dt>
                  <dd className="text-muted">{s.before || "Nothing yet"}</dd>
                </div>
                <div className="rounded-xl border-l-4 border-hl-ink bg-hl-soft/60 px-3 py-2">
                  <dt className="pb-1 text-xs font-semibold text-hl-ink">After</dt>
                  <dd>
                    {isSkillQuestion(s) ? (
                      <>Add <span className={cn(s.status === "ACCEPTED" && "hl")}>{s.after}</span> to your skills</>
                    ) : (
                      <span className={cn(s.status === "ACCEPTED" && "hl", api.justAccepted.has(s.id) && "hl-sweep")}>{textFor(s)}</span>
                    )}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-col gap-2 border-t border-rule pt-3">
                <p className="text-sm text-muted">{s.reason}</p>
                <EvidenceChip s={s} />
                {asks && <QuestionField s={s} value={answer} onChange={(v) => setAnswer(s.id, v)} />}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={asks && !answer.trim()}
                    onClick={async () => toast((await copyText(textFor(s))) ? "New text copied" : "Couldn't copy. Select the text and copy it by hand.")}
                  >
                    <Copy className="size-4" aria-hidden />
                    Copy new text
                  </Button>
                  {s.status === "PENDING" ? (
                    <>
                      <Button size="sm" variant="primary" disabled={asks && !answer.trim()} onClick={() => api.accept(s, answer)}>
                        <Check className="size-4" aria-hidden />
                        Apply
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => api.skip(s)}>
                        <X className="size-4" aria-hidden />
                        Dismiss
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center px-1 text-sm text-muted">{s.status === "ACCEPTED" ? "Applied" : "Dismissed"}</span>
                      <Button size="sm" variant="ghost" onClick={() => api.undo(s)}>
                        <Undo2 className="size-4" aria-hidden />
                        Undo
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

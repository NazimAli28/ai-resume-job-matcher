"use client";

import { useState } from "react";
import { useDemo } from "@/demo/store";
import type { Job, ResumeVersion, Suggestion } from "@/demo/types";
import type { EffectiveRequirement } from "../lib/match";
import { generateSuggestions, isSkillQuestion, PLACEHOLDER } from "../lib/tailor";

// Locally generated suggestions can't be stored yet (the demo store has no ADD_SUGGESTIONS
// action), so their statuses live here for the browser session.
const localCache = new Map<string, Suggestion[]>();

export function useSuggestions(job: Job, reqs: EffectiveRequirement[], resume: ResumeVersion) {
  const { state, dispatch } = useDemo();
  const seeded = state.suggestions.filter((s) => s.jobId === job.id);
  const isSeeded = seeded.length > 0;
  const key = `${job.id}:${resume.id}`;
  const [local, setLocal] = useState<Suggestion[]>(() =>
    isSeeded ? [] : (localCache.get(key) ?? generateSuggestions(job, reqs, resume, state.suggestions)),
  );
  const [justAccepted, setJustAccepted] = useState<Set<string>>(new Set());

  const list = isSeeded ? seeded : local;

  const patch = (changes: { id: string; patch: Partial<Suggestion> }[]) => {
    if (isSeeded) {
      changes.forEach((c) => dispatch({ type: "SET_SUGGESTION", id: c.id, patch: c.patch }));
      return;
    }
    const next = local.map((s) => {
      const c = changes.find((x) => x.id === s.id);
      return c ? { ...s, ...c.patch } : s;
    });
    localCache.set(key, next);
    setLocal(next);
  };

  const markSwept = (ids: string[]) => setJustAccepted((prev) => new Set([...prev, ...ids]));

  /** Accept a change. Questions need the user's real answer, which is also saved to the fact bank. */
  const accept = (s: Suggestion, answer?: string) => {
    const a = answer?.trim();
    if (s.kind === "QUESTION") {
      if (isSkillQuestion(s)) {
        if (!a) return;
        dispatch({ type: "ADD_FACT", fact: `${s.after}: ${a}` });
        patch([{ id: s.id, patch: { status: "ACCEPTED" } }]);
      } else if (PLACEHOLDER.test(s.after)) {
        if (!a) return;
        const filled = s.after.replace(PLACEHOLDER, a);
        dispatch({ type: "ADD_FACT", fact: filled });
        patch([{ id: s.id, patch: { status: "ACCEPTED", after: filled } }]);
      } else patch([{ id: s.id, patch: { status: "ACCEPTED" } }]);
    } else patch([{ id: s.id, patch: { status: "ACCEPTED" } }]);
    markSwept([s.id]);
  };

  const undo = (s: Suggestion) => patch([{ id: s.id, patch: { status: "PENDING" } }]);
  const skip = (s: Suggestion) => patch([{ id: s.id, patch: { status: "REJECTED" } }]);

  /** Accept every pending wording-only change. Changes that add claims or need answers are left alone. */
  const acceptAllSafe = () => {
    const ids = list.filter((s) => s.status === "PENDING" && s.safe && s.kind !== "QUESTION").map((s) => s.id);
    patch(ids.map((id) => ({ id, patch: { status: "ACCEPTED" as const } })));
    markSwept(ids);
    return ids.length;
  };

  return { list, isSeeded, accept, undo, skip, acceptAllSafe, justAccepted };
}

export type SuggestionApi = ReturnType<typeof useSuggestions>;

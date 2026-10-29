"use client";

import { Briefcase, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { monthYear } from "@/components/applications/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useDemo } from "@/demo/store";
import type { Experience } from "@/demo/types";
import { cn } from "@/lib/cn";
import { EditableText } from "./editable-text";
import { SectionCard } from "./section-card";

function Bullets({ exp }: { exp: Experience }) {
  const { state, dispatch } = useDemo();
  const [draft, setDraft] = useState("");
  const save = (bullets: string[]) =>
    dispatch({
      type: "UPDATE_PROFILE",
      patch: { experiences: state.profile.experiences.map((e) => (e.id === exp.id ? { ...e, bullets } : e)) },
    });
  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col">
        {exp.bullets.map((b, i) => (
          <li key={`${i}-${b}`} className="flex items-start gap-1 border-b border-rule last:border-0">
            <div className="min-w-0 flex-1 py-1">
              <EditableText value={b} label={`bullet ${i + 1} at ${exp.employer}`} multiline onSave={(v) => save(exp.bullets.map((x, j) => (j === i ? v : x)))} />
            </div>
            <button
              type="button"
              aria-label={`Delete bullet ${i + 1} at ${exp.employer}`}
              onClick={() => save(exp.bullets.filter((_, j) => j !== i))}
              className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-sunken hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          save([...exp.bullets, draft.trim()]);
          setDraft("");
        }}
      >
        <Input aria-label={`Add a bullet at ${exp.employer}`} placeholder="Add a bullet. Use only things you really did." value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" aria-label="Add bullet"><Plus className="size-4" aria-hidden /></Button>
      </form>
    </div>
  );
}

export function ExperienceSection() {
  const { state } = useDemo();
  const list = state.profile.experiences;
  return (
    <SectionCard id="exp-title" title="Experience" icon={Briefcase} count={list.length}>
      <ol className="flex flex-col">
        {list.map((e, i) => (
          <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
            {i < list.length - 1 && <span aria-hidden className="absolute left-[9px] top-6 h-[calc(100%-1.25rem)] w-0.5 rounded-full bg-rule-strong" />}
            <span
              aria-hidden
              className={cn("relative mt-1.5 size-5 shrink-0 rounded-full", i === 0 ? "border-4 border-hl bg-surface glow" : "border-2 border-rule-strong bg-sunken")}
            />
            <article className="flex min-w-0 flex-1 flex-col gap-2">
              <header>
                <h3 className="text-base font-bold">{e.title}, {e.employer}</h3>
                <p className="text-sm text-muted">
                  {e.location}. {monthYear(e.start)} to {e.end ? monthYear(e.end) : "Present"}
                </p>
              </header>
              <Bullets exp={e} />
            </article>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

"use client";

import { Check } from "lucide-react";
import { PillTabs } from "@/components/resumes/visual";
import { cn } from "@/lib/cn";
import type { Experience, Project } from "@/demo/types";
import type { Length, Tone } from "../lib/cover-letter";

export interface Options {
  length: Length;
  tone: Tone;
  experienceIds: string[];
  projectIds: string[];
}

const LENGTH_HINT: Record<Length, string> = { SHORT: "About 150 words", MEDIUM: "About 220 words", LONG: "About 320 words" };

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function LetterOptions({
  value,
  onChange,
  experiences,
  projects,
}: {
  value: Options;
  onChange: (o: Options) => void;
  experiences: Experience[];
  projects: Project[];
}) {
  const set = (p: Partial<Options>) => onChange({ ...value, ...p });
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span aria-hidden className="text-sm font-semibold">Length</span>
        <PillTabs<Length>
          kind="radio"
          label="Length"
          value={value.length}
          onChange={(length) => set({ length })}
          options={[
            { value: "SHORT", label: "Short" },
            { value: "MEDIUM", label: "Medium" },
            { value: "LONG", label: "Long" },
          ]}
        />
        <p className="text-xs text-muted" aria-live="polite">{LENGTH_HINT[value.length]}</p>
      </div>
      <div className="flex flex-col gap-2">
        <span aria-hidden className="text-sm font-semibold">Tone</span>
        <PillTabs<Tone>
          kind="radio"
          label="Tone"
          value={value.tone}
          onChange={(tone) => set({ tone })}
          options={[
            { value: "PROFESSIONAL", label: "Professional" },
            { value: "FRIENDLY", label: "Friendly" },
            { value: "CONFIDENT", label: "Confident" },
          ]}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-1.5 text-sm font-semibold">What to feature</legend>
        {experiences.map((e) => (
          <FeatureRow key={e.id} checked={value.experienceIds.includes(e.id)} onChange={() => set({ experienceIds: toggle(value.experienceIds, e.id) })}>
            <span className="font-semibold">{e.title}</span>, {e.employer}
          </FeatureRow>
        ))}
        {projects.map((p) => (
          <FeatureRow key={p.id} checked={value.projectIds.includes(p.id)} onChange={() => set({ projectIds: toggle(value.projectIds, p.id) })}>
            <span className="font-semibold">{p.name}</span> (project)
          </FeatureRow>
        ))}
        {value.length === "SHORT" && value.projectIds.length > 0 && <p className="text-xs text-muted">Short letters leave projects out to stay brief.</p>}
      </fieldset>
    </div>
  );
}

function FeatureRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hl-ink",
        checked ? "border-hl-ink bg-hl-soft/60" : "border-rule hover:border-rule-strong",
      )}
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-md border-2", checked ? "border-hl-ink bg-hl text-on-hl" : "border-rule-strong")}>
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span>{children}</span>
    </label>
  );
}

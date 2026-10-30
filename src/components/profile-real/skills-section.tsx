"use client";

import { X } from "lucide-react";
import { useActionState } from "react";
import { deleteSkill, saveSkill } from "@/app/app/profile/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import type { SkillDto } from "./dto";
import { SelectField, TextField } from "./fields";
import { ItemForm } from "./item-form";
import { SectionCard } from "./section-card";

const LEVELS = [
  { value: "", label: "Not rated" },
  { value: "1", label: "1 Learning" },
  { value: "2", label: "2 Beginner" },
  { value: "3", label: "3 Comfortable" },
  { value: "4", label: "4 Strong" },
  { value: "5", label: "5 Expert" },
];

function Dots({ level }: { level: number }) {
  return (
    <span role="img" aria-label={`Level ${level} of 5`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`size-1.5 rounded-full ${n <= level ? "bg-hl-ink" : "bg-rule-strong"}`} />
      ))}
    </span>
  );
}

function SkillChip({ skill }: { skill: SkillDto }) {
  const [state, formAction, pending] = useActionState(deleteSkill, undefined);
  return (
    <li className="flex flex-col gap-1">
      <form action={formAction} className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface py-1 pl-3 pr-1 text-sm">
        <input type="hidden" name="id" value={skill.id} />
        <span className="font-semibold">{skill.name}</span>
        {skill.level != null && <Dots level={skill.level} />}
        {skill.level != null && skill.level <= 2 && <span className="rounded-full bg-hl-soft px-2 py-0.5 text-xs font-semibold text-hl-ink">learning</span>}
        {skill.years != null && <span className="text-muted">{skill.years}y</span>}
        <button
          type="submit"
          disabled={pending}
          aria-label={`Remove skill ${skill.name}`}
          className="-my-2 grid size-11 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink disabled:opacity-50"
        >
          <X className="size-4" aria-hidden />
        </button>
      </form>
      {state?.error && <FormAlert>{state.error}</FormAlert>}
    </li>
  );
}

export function SkillsSection({ skills }: { skills: SkillDto[] }) {
  return (
    <SectionCard id="skills" title="Skills" intro="Rated 1–2 counts as a partial match, never a full one.">
      {skills.length === 0 ? (
        <p className="text-sm text-muted">No skills yet. Add the ones you would be comfortable being asked about.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <SkillChip key={s.id} skill={s} />
          ))}
        </ul>
      )}
      <div className="rounded-2xl border border-rule bg-sunken/40 p-4">
        <ItemForm action={saveSkill} submitLabel="Add skill" resetOnOk>
          {(err) => (
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField name="name" label="Skill" required maxLength={60} error={err("name")} placeholder="Docker" hint="Adding a name you already have updates it." />
              <SelectField name="level" label="Level" optional defaultValue="" error={err("level")} options={LEVELS} />
              <TextField name="years" label="Years" optional inputMode="decimal" error={err("years")} placeholder="2" />
            </div>
          )}
        </ItemForm>
      </div>
    </SectionCard>
  );
}

"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { Check, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useDemo } from "@/demo/store";
import type { Skill } from "@/demo/types";
import { cn } from "@/lib/cn";
import { SectionCard } from "./section-card";

export function SkillsSection() {
  const { state, dispatch } = useDemo();
  const reduce = useSkipMotion();
  const [name, setName] = useState("");
  const skills = state.profile.skills;
  const save = (next: Skill[]) => dispatch({ type: "UPDATE_PROFILE", patch: { skills: next } });
  const unconfirmed = skills.filter((s) => !s.confirmed).length;

  return (
    <SectionCard id="skills-title" title="Skills" icon={Sparkles} count={skills.length}>
      <p className="max-w-prose text-muted">
        Tap a skill to confirm it. Confirmed skills (highlighted) are ones you can truly claim. Unconfirmed skills are never added to your resume by the AI; it will ask you first.
        {unconfirmed > 0 && ` ${unconfirmed} ${unconfirmed === 1 ? "skill is" : "skills are"} unconfirmed.`}
      </p>
      <ul className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {skills.map((s) => (
            <motion.li
              key={s.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "flex items-center rounded-full border transition-colors",
                s.confirmed ? "border-hl-ink/50 bg-hl-soft text-hl-ink glow" : "border-dashed border-rule-strong bg-surface text-muted",
              )}
            >
              <button
                type="button"
                role="switch"
                aria-checked={s.confirmed}
                aria-label={`${s.name}${s.level ? `, ${s.level}` : ""}: ${s.confirmed ? "confirmed. The AI may use this." : "not confirmed. The AI will not claim this."}`}
                onClick={() => save(skills.map((x) => (x.id === s.id ? { ...x, confirmed: !x.confirmed } : x)))}
                className="flex min-h-11 items-center gap-1.5 rounded-full py-1 pl-3.5 pr-1.5 text-[15px] font-semibold"
              >
                {s.confirmed && <Check className="size-4" strokeWidth={3} aria-hidden />}
                {s.name}
                {s.level && <span className="text-xs font-normal opacity-80">{s.level}</span>}
              </button>
              <button
                type="button"
                aria-label={`Remove ${s.name}`}
                onClick={() => save(skills.filter((x) => x.id !== s.id))}
                className="mr-1 grid size-8 place-items-center rounded-full opacity-70 hover:bg-sunken hover:text-danger hover:opacity-100"
              >
                <X className="size-4" aria-hidden />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n || skills.some((s) => s.name.toLowerCase() === n.toLowerCase())) return;
          save([...skills, { id: `sk${Date.now()}`, name: n, confirmed: false }]);
          setName("");
        }}
      >
        <Input aria-label="Add a skill" placeholder="Add a skill (starts unconfirmed)" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit">Add skill</Button>
      </form>
    </SectionCard>
  );
}

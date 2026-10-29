"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { AnimatePresence, motion } from "motion/react";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const SUGGESTIONS = ["Frontend Developer", "Backend Developer", "Software Engineer", "Data Analyst", "QA Engineer", "Product Manager"];
const MAX_ROLES = 5;

export function RoleChips({ roles, onChange }: { roles: string[]; onChange: (r: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const reduce = useSkipMotion();
  const full = roles.length >= MAX_ROLES;
  const has = (r: string) => roles.some((x) => x.toLowerCase() === r.toLowerCase());

  const add = (r: string) => {
    const v = r.trim();
    if (!v || has(v) || full) return;
    onChange([...roles, v]);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    add(draft);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-sm font-semibold">Your target roles</h2>
          <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-bold tabular-nums">
            {roles.length} of {MAX_ROLES}
          </span>
        </div>
        <div className="min-h-16 rounded-2xl border border-dashed border-rule-strong bg-sunken/50 p-3">
          {roles.length === 0 ? (
            <p className="py-2 text-sm text-muted">None yet. Add up to {MAX_ROLES}, or skip this step.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {roles.map((r) => (
                  <motion.li
                    key={r}
                    layout={reduce ? false : true}
                    initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    className="flex min-h-11 items-center gap-1 rounded-full bg-hl py-1 pl-4 pr-1.5 text-sm font-semibold text-on-hl glow"
                  >
                    {r}
                    <button
                      type="button"
                      aria-label={`Remove ${r}`}
                      onClick={() => onChange(roles.filter((x) => x !== r))}
                      className="flex size-9 items-center justify-center rounded-full hover:bg-black/10"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="flex items-end gap-2">
        <Field label="Add a role" htmlFor="role-input" className="flex-1">
          <Input
            id="role-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="For example, React Developer"
            disabled={full}
            maxLength={60}
          />
        </Field>
        <Button type="submit" disabled={full || !draft.trim()}>
          <Plus className="size-4" aria-hidden />
          Add
        </Button>
      </form>
      {full && <p className="-mt-3 text-sm text-muted">That is the maximum. Remove a role to add another.</p>}

      <div>
        <h2 className="pb-2 text-sm font-semibold">Suggestions</h2>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.filter((s) => !has(s)).map((s) => (
            <button
              key={s}
              type="button"
              disabled={full}
              onClick={() => add(s)}
              className={cn(
                "min-h-11 rounded-full border border-dashed border-rule-strong px-4 text-sm font-semibold transition-colors hover:border-hl-ink hover:bg-hl-soft disabled:opacity-50",
              )}
            >
              + {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

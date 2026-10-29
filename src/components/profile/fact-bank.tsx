"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { BadgeCheck, FileText, UserRound, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { useDemo } from "@/demo/store";
import { SectionCard } from "./section-card";

export function FactBank() {
  const { state, dispatch } = useDemo();
  const toast = useToast();
  const reduce = useSkipMotion();
  const [fact, setFact] = useState("");
  const bank = state.profile.factBank;

  const remove = (id: string) => {
    const before = bank;
    dispatch({ type: "REMOVE_FACT", id });
    toast("Fact removed", { label: "Undo", onClick: () => dispatch({ type: "UPDATE_PROFILE", patch: { factBank: before } }) });
  };

  return (
    <SectionCard id="fb-title" title="Fact bank" icon={BadgeCheck} count={bank.length}>
      <p className="max-w-prose text-muted">
        Facts you have confirmed. They are the only things the AI may add to your resume besides what is already there. If a fact is not here, the AI asks you instead of guessing.
      </p>
      {bank.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-rule-strong p-5 text-center">
          No facts yet. Add numbers, tools or results you can stand behind, like “Cut page load from 4s to 1.5s”.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {bank.map((f) => (
              <motion.li
                key={f.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="card card-hover flex items-start gap-2 p-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p>{f.fact}</p>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                        f.source === "RESUME" ? "bg-sunken text-ink" : "bg-hl-soft text-hl-ink",
                      )}
                    >
                      {f.source === "RESUME" ? <FileText className="size-3" aria-hidden /> : <UserRound className="size-3" aria-hidden />}
                      {f.source === "RESUME" ? "From resume" : "Added by you"}
                    </span>
                    {formatDate(f.addedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove fact: ${f.fact}`}
                  onClick={() => remove(f.id)}
                  className="-mr-1 -mt-1 grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-sunken hover:text-danger"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!fact.trim()) return;
          dispatch({ type: "ADD_FACT", fact: fact.trim() });
          toast("Fact added to your fact bank");
          setFact("");
        }}
      >
        <Input aria-label="Add a fact" placeholder="Add a fact that is true" value={fact} onChange={(e) => setFact(e.target.value)} />
        <Button type="submit" variant="primary">Add fact</Button>
      </form>
    </SectionCard>
  );
}

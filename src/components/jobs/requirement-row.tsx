"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { AnimatePresence, motion } from "motion/react";
import { Quote } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, MatchChip } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useDemo } from "@/demo/store";
import { cn } from "@/lib/cn";
import type { EffectiveRequirement } from "./lib/match";
import { mentions } from "./lib/skills";
import { OverrideMenu, type OverrideChoice } from "./override-menu";

const EDGE = { STRONG: "border-l-hl-ink", PARTIAL: "border-l-partial", MISSING: "border-l-warn", UNKNOWN: "border-l-rule-strong" } as const;

export function RequirementRow({ jobId, req, showSkill }: { jobId: string; req: EffectiveRequirement; showSkill: boolean }) {
  const { dispatch } = useDemo();
  const toast = useToast();
  const reduce = useSkipMotion();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const inputId = `ev-${jobId}-${req.id}`;

  const pick = (v: OverrideChoice) => {
    if (v === "ADD_EVIDENCE") {
      setAdding(true);
      return;
    }
    dispatch({ type: "SET_REQUIREMENT_OVERRIDE", jobId, requirementId: req.id, override: v === "CLEAR" ? undefined : v });
  };

  const saveEvidence = () => {
    const t = text.trim();
    if (!t) return;
    // Prefix the skill when the user didn't name it, so the fact stays meaningful in the fact bank.
    const fact = mentions(t, req.skill) ? t : `${req.skill}: ${t}`;
    dispatch({ type: "ADD_FACT", fact });
    dispatch({ type: "SET_REQUIREMENT_OVERRIDE", jobId, requirementId: req.id, override: "ADD_EVIDENCE" });
    toast("Saved to your fact bank and counted as evidence");
    setJustAdded(true);
    setAdding(false);
    setText("");
  };

  return (
    <motion.div
      layout={reduce ? false : "position"}
      className={cn("card grid gap-x-4 gap-y-3 border-l-4 p-4 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-start", EDGE[req.cls])}
    >
      <div className="flex flex-col gap-1.5">
        <span className="font-semibold leading-snug">{req.text}</span>
        {showSkill && <span className="text-sm text-muted">Checked as: {req.skill}</span>}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <MatchChip value={req.cls} />
          {req.learning && <Chip className="border border-rule text-muted">Learning</Chip>}
          {req.override && req.cls !== req.base && <span className="text-xs text-muted">was {req.base.toLowerCase()}</span>}
        </div>
        {req.evidence ? (
          <blockquote className="flex gap-2.5 rounded-r-xl border-l-4 border-hl-ink bg-hl-soft/60 px-3 py-2">
            <Quote className="mt-0.5 size-4 shrink-0 text-hl-ink" aria-hidden />
            <p className="text-sm leading-relaxed">
              <span className={cn("hl", justAdded && "hl-sweep")}>{req.evidence.text}</span>
              <span className="text-muted"> from {req.evidence.section}</span>
            </p>
          </blockquote>
        ) : (
          <p className="text-sm text-muted">No evidence found.</p>
        )}
        <p className="text-sm text-muted">{req.userNote ?? req.note}</p>
        <AnimatePresence initial={false}>
          {adding && (
            <motion.form
              key="add"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
              className="overflow-hidden"
              onSubmit={(e) => {
                e.preventDefault();
                saveEvidence();
              }}
            >
              <div className="flex flex-col gap-2 rounded-xl bg-sunken p-3">
                <label htmlFor={inputId} className="text-sm font-semibold">Where did you use {req.skill}? One true sentence.</label>
                <Input id={inputId} value={text} autoFocus onChange={(e) => setText(e.target.value)} placeholder={`For example: used ${req.skill} in my final-year project`} />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" variant="primary" disabled={!text.trim()}>Save evidence</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setText(""); }}>Cancel</Button>
                </div>
                <p className="text-xs text-muted">Saved to your fact bank so we can use it in suggestions and cover letters.</p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      <div className="sm:justify-self-end">
        <OverrideMenu current={req.override} label={req.text} onPick={pick} />
      </div>
    </motion.div>
  );
}

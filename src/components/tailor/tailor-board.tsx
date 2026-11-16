"use client";

import { Check, Copy, HelpCircle, Pencil, RotateCcw, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { allAction, answerAction, editAction, finalizeAction, generateAction, statusAction } from "@/app/app/jobs/[id]/tailor/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { Suggestion } from "@/server/tailor/core";

type Result = { ok: true } | { ok: false; error: string };

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const act = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (!r.ok) setError(r.error);
      else {
        after?.();
        router.refresh();
      }
    });
  return { pending, error, act };
}

export function GenerateButton({ jobId, versionId, again }: { jobId: string; versionId: string; again?: boolean }) {
  const { pending, error, act } = useAct();
  return (
    <div className="flex flex-col gap-2">
      <Button variant={again ? "secondary" : "primary"} disabled={pending} onClick={() => act(() => generateAction(jobId, versionId, again === true))} className="w-fit">
        <Sparkles className="size-4" aria-hidden />
        {pending ? "Reading your resume and the job… (up to a minute)" : again ? "Refresh suggestions" : "Suggest improvements"}
      </Button>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

const KIND_LABEL: Record<Suggestion["kind"], string> = {
  REWRITE: "Rewrite",
  QUESTION: "Needs your input",
  SKILL_ADD: "Add to skills",
  SKILL_ORDER: "Reorder skills",
  GAP_QUESTION: "Missing requirement",
};

function Card({ s, jobId, sessionId }: { s: Suggestion; jobId: string; sessionId: string }) {
  const { pending, error, act } = useAct();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(s.after ?? "");
  const [value, setValue] = useState("");
  const [copied, setCopied] = useState(false);
  const isQuestion = s.kind === "QUESTION" || s.kind === "GAP_QUESTION";
  const answered = s.kind === "GAP_QUESTION" && s.status === "APPLIED";

  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl border p-4", s.status === "APPLIED" ? "border-hl-ink/40 bg-hl-soft/40" : s.status === "DISMISSED" ? "border-rule opacity-70" : "border-rule bg-surface")}>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className={cn("rounded-full px-2 py-0.5 font-semibold", isQuestion ? "bg-warn-soft text-warn" : "bg-sunken")}>
          {isQuestion && <HelpCircle className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />}
          {KIND_LABEL[s.kind]}
        </span>
        <span className="text-muted">{s.targetLabel}</span>
        {s.status === "APPLIED" && <span className="ml-auto inline-flex items-center gap-1 font-semibold text-hl-ink"><Check className="size-3.5" aria-hidden /> {answered ? "Saved as a fact" : "Accepted"}</span>}
        {s.status === "DISMISSED" && <span className="ml-auto font-semibold text-muted">Dismissed</span>}
      </div>

      {s.before && s.kind !== "SKILL_ADD" && (
        <p className="text-sm text-muted">
          <span className="font-semibold">Now: </span>
          <span className="break-words">{s.before}</span>
        </p>
      )}

      {s.kind === "GAP_QUESTION" ? (
        <p className="text-sm font-semibold">{s.question}</p>
      ) : s.kind === "QUESTION" ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{s.question}</p>
          <p className="break-words text-sm"><span className="font-semibold">Suggested: </span>{s.template}</p>
        </div>
      ) : editing ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`edit-${s.id}`} className="text-sm font-semibold">Your wording</label>
          <Textarea id={`edit-${s.id}`} value={text} maxLength={400} onChange={(e) => setText(e.target.value)} className="min-h-20" />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={pending} onClick={() => act(() => editAction(jobId, sessionId, s.id, text), () => setEditing(false))}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="break-words text-[15px]">
          <span className="font-semibold">{s.kind === "SKILL_ADD" ? "Add: " : "Suggested: "}</span>
          <mark className="hl">{s.after}</mark>
          {s.editedByUser && <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-xs font-semibold">Edited by you</span>}
        </p>
      )}

      {s.warning && <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">{s.warning}</p>}
      <p className="text-sm text-muted">{s.rationale}</p>
      {s.reqTexts.length > 0 && <p className="text-[13px] text-muted">Helps with: {s.reqTexts.join(" · ")}</p>}
      {s.basedOn.length > 0 && (
        <details className="text-[13px] text-muted">
          <summary className="cursor-pointer font-semibold">Based on</summary>
          <ul className="mt-1 flex flex-col gap-1 pl-4">
            {s.basedOn.map((b) => (
              <li key={b.id} className="break-words">“{b.text}” <span className="opacity-80">({b.label})</span></li>
            ))}
          </ul>
        </details>
      )}

      {s.status === "PENDING" && isQuestion && (
        s.answerType === "YES_NO" ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" disabled={pending} onClick={() => act(() => answerAction(jobId, sessionId, s.id, "yes"))}>Yes, that&apos;s true</Button>
            <Button size="sm" disabled={pending} onClick={() => act(() => answerAction(jobId, sessionId, s.id, "no"))}>No</Button>
          </div>
        ) : (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); act(() => answerAction(jobId, sessionId, s.id, value), () => setValue("")); }}>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label htmlFor={`ans-${s.id}`} className="text-sm font-semibold">{s.kind === "GAP_QUESTION" ? "Where you used it (only if true)" : "Your figure (only if true)"}</label>
              <Input id={`ans-${s.id}`} value={value} onChange={(e) => setValue(e.target.value)} maxLength={s.kind === "GAP_QUESTION" ? 400 : 40} placeholder={s.kind === "GAP_QUESTION" ? "e.g. Used it in my final year project to run the database" : "e.g. 1,200"} />
            </div>
            <Button size="sm" type="submit" variant="primary" disabled={pending || !value.trim()}>Save</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => statusAction(jobId, sessionId, s.id, "DISMISSED"))}>Skip</Button>
          </form>
        )
      )}

      {!isQuestion && !editing && (
        <div className="flex flex-wrap gap-2">
          {s.status === "PENDING" && <Button size="sm" variant="primary" disabled={pending} onClick={() => act(() => statusAction(jobId, sessionId, s.id, "APPLIED"))}><Check className="size-4" aria-hidden /> Accept</Button>}
          {s.status === "APPLIED" && <Button size="sm" disabled={pending} onClick={() => act(() => statusAction(jobId, sessionId, s.id, "PENDING"))}><RotateCcw className="size-4" aria-hidden /> Undo</Button>}
          {s.status === "DISMISSED" && <Button size="sm" disabled={pending} onClick={() => act(() => statusAction(jobId, sessionId, s.id, "PENDING"))}><RotateCcw className="size-4" aria-hidden /> Restore</Button>}
          {s.status === "PENDING" && <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => statusAction(jobId, sessionId, s.id, "DISMISSED"))}><X className="size-4" aria-hidden /> Dismiss</Button>}
          {s.kind === "REWRITE" && s.status !== "DISMISSED" && <Button size="sm" variant="ghost" onClick={() => { setText(s.after ?? ""); setEditing(true); }}><Pencil className="size-4" aria-hidden /> Edit</Button>}
          {s.after && s.kind !== "SKILL_ORDER" && (
            <Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(s.after!); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }}>
              <Copy className="size-4" aria-hidden /> {copied ? "Copied" : "Copy"}
            </Button>
          )}
        </div>
      )}
      {error && <FormAlert>{error}</FormAlert>}
    </li>
  );
}

export function SuggestionList({ suggestions, jobId, sessionId }: { suggestions: Suggestion[]; jobId: string; sessionId: string }) {
  const groups: { title: string; items: Suggestion[] }[] = [
    { title: "Needs your input", items: suggestions.filter((s) => (s.kind === "QUESTION" || s.kind === "GAP_QUESTION") && s.status === "PENDING") },
    { title: "Ready to use", items: suggestions.filter((s) => s.kind !== "QUESTION" && s.kind !== "GAP_QUESTION" && s.status === "PENDING") },
    { title: "Accepted", items: suggestions.filter((s) => s.status === "APPLIED") },
    { title: "Dismissed", items: suggestions.filter((s) => s.status === "DISMISSED") },
  ];
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) =>
        g.items.length ? (
          <section key={g.title} aria-label={g.title} className="flex flex-col gap-3">
            <h3 className="font-display text-base font-bold">{g.title} ({g.items.length})</h3>
            <ul className="flex flex-col gap-3">
              {g.items.map((s) => <Card key={s.id} s={s} jobId={jobId} sessionId={sessionId} />)}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}

export function BulkBar({ jobId, sessionId, ready, accepted }: { jobId: string; sessionId: string; ready: number; accepted: number }) {
  const { pending, error, act } = useAct();
  const router = useRouter();
  const [saving, start] = useTransition();
  const [saveError, setSaveError] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {ready > 0 && <Button size="sm" disabled={pending} onClick={() => act(() => allAction(jobId, sessionId, "accept"))}>Accept all ready ({ready})</Button>}
        {accepted > 0 && <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => allAction(jobId, sessionId, "reset"))}>Undo all</Button>}
        <Button
          size="sm"
          variant="primary"
          disabled={saving || accepted === 0}
          onClick={() =>
            start(async () => {
              setSaveError("");
              const r = await finalizeAction(jobId, sessionId);
              if (r.ok) router.push(`/app/resumes/${r.versionId}?tailored=1`);
              else setSaveError(r.error);
            })
          }
        >
          {saving ? "Saving and checking…" : `Save as a new resume version${accepted ? ` (${accepted} change${accepted === 1 ? "" : "s"})` : ""}`}
        </Button>
      </div>
      {(error || saveError) && <FormAlert>{error || saveError}</FormAlert>}
    </div>
  );
}

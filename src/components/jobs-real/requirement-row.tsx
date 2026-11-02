"use client";

import { useState } from "react";
import { addEvidenceAction, deleteRequirementAction, setOverrideAction, updateRequirementAction } from "@/app/app/jobs/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { MatchChip } from "@/components/ui/chip";
import { Input, Select, Textarea } from "@/components/ui/field";
import type { MatchItem } from "@/server/match/engine";

type Mode = "" | "evidence" | "edit";

/**
 * One requirement and the honest question behind it: "do you have this?". A yes needs the user's own words,
 * which go to their evidence bank. Nothing is added to a resume from here.
 */
export function RequirementRow({ item }: { item: MatchItem }) {
  const [mode, setMode] = useState<Mode>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statement, setStatement] = useState("");
  const [text, setText] = useState(item.text);
  const [priority, setPriority] = useState(item.priority);

  async function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setBusy(true);
    setError("");
    try {
      const r = await fn();
      // The action revalidates this page, so the new score arrives with its response.
      if (r.ok) {
        setMode("");
        setStatement("");
      } else setError(r.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  const canAnswer = item.cls === "MISSING" || item.cls === "PARTIAL" || item.cls === "UNKNOWN";
  const answered = item.override === "CONFIRM" || item.override === "REJECT" || item.override === "LEARNING";

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-rule p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <MatchChip value={item.cls} />
          <span className="font-semibold break-words">{item.text}</span>
          {item.hard && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-semibold text-warn">Required</span>}
          {item.priority === "NICE_TO_HAVE" && <span className="rounded-full border border-rule px-2 py-0.5 text-[12px] text-muted">Nice to have</span>}
          {item.learning && <span className="rounded-full border border-rule px-2 py-0.5 text-[12px] text-muted">Learning</span>}
        </div>
      </div>
      <p className="text-sm text-muted">{item.reason}</p>
      {item.evidence && (
        <blockquote className="rounded-xl bg-sunken px-3 py-2 text-sm">
          <span className="block text-[13px] font-semibold text-muted">{item.evidence.section}</span>
          <span className="break-words">{item.evidence.text}</span>
        </blockquote>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {canAnswer && !answered && (
          <>
            <Button size="sm" disabled={busy} aria-expanded={mode === "evidence"} onClick={() => setMode(mode === "evidence" ? "" : "evidence")}>
              Yes, I have this
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => setOverrideAction(item.requirementId, "LEARNING"))}>
              I&apos;m learning it
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => setOverrideAction(item.requirementId, "REJECT"))}>
              I don&apos;t have it
            </Button>
          </>
        )}
        {item.cls === "STRONG" && !answered && item.override !== "ADD_EVIDENCE" && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => setOverrideAction(item.requirementId, "REJECT"))}>
            This is wrong
          </Button>
        )}
        {answered && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => setOverrideAction(item.requirementId, null))}>
            Undo my answer
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} aria-expanded={mode === "edit"} onClick={() => setMode(mode === "edit" ? "" : "edit")}>
          Edit
        </Button>
      </div>

      {mode === "evidence" && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => addEvidenceAction(item.requirementId, statement));
          }}
        >
          <label htmlFor={`ev-${item.requirementId}`} className="text-sm font-semibold">
            Where did you use it? One true sentence is enough.
          </label>
          <Textarea id={`ev-${item.requirementId}`} rows={2} maxLength={300} required value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="e.g. I set up Docker for local development on an internal tool at my last job." />
          <p className="text-[13px] text-muted">Saved to your evidence bank in your words and used on other jobs too. It isn&apos;t added to your resume unless you choose that later.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="primary" disabled={busy}>Save evidence</Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => run(() => setOverrideAction(item.requirementId, "CONFIRM"))}>
              I have it, but no details now
            </Button>
          </div>
        </form>
      )}

      {mode === "edit" && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => updateRequirementAction(item.requirementId, { text, priority }));
          }}
        >
          <label htmlFor={`txt-${item.requirementId}`} className="text-sm font-semibold">Requirement</label>
          <Input id={`txt-${item.requirementId}`} maxLength={200} required value={text} onChange={(e) => setText(e.target.value)} />
          <label htmlFor={`pri-${item.requirementId}`} className="text-sm font-semibold">Priority</label>
          <Select id={`pri-${item.requirementId}`} value={priority} onChange={(e) => setPriority(e.target.value as MatchItem["priority"])}>
            <option value="MUST_HAVE">Must have</option>
            <option value="NICE_TO_HAVE">Nice to have</option>
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="primary" disabled={busy}>Save</Button>
            <Button type="button" size="sm" variant="danger" disabled={busy} onClick={() => run(() => deleteRequirementAction(item.requirementId))}>
              Delete requirement
            </Button>
          </div>
        </form>
      )}

      {busy && (
        <p role="status" className="text-[13px] text-muted">
          Updating your estimate…
        </p>
      )}
      {error && <FormAlert>{error}</FormAlert>}
    </li>
  );
}

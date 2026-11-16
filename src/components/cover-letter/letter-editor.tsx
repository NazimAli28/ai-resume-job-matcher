"use client";

import { Copy, Download, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { generateLetterAction, restoreLetterAction, saveLetterAction } from "@/app/app/jobs/[id]/cover-letter/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type Length = "SHORT" | "MEDIUM" | "LONG";
type Tone = "PROFESSIONAL" | "FRIENDLY" | "CONFIDENT";

export function LetterOptions({ jobId, versions, initial, hasLetter }: {
  jobId: string;
  versions: { id: string; label: string; name: string }[];
  initial: { resumeVersionId: string; length: Length; tone: Tone; recipient: string; notes: string };
  hasLetter: boolean;
}) {
  const router = useRouter();
  const [o, setO] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (hasLetter && !confirm("Write a new draft? Your current text is kept in the earlier drafts list.")) return;
        start(async () => {
          setError("");
          const r = await generateLetterAction(jobId, o);
          if (r.ok) router.refresh();
          else setError(r.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Resume" htmlFor="cl-resume">
          <Select id="cl-resume" value={o.resumeVersionId} onChange={(e) => setO({ ...o, resumeVersionId: e.target.value })}>
            {versions.map((v) => <option key={v.id} value={v.id}>{v.label} · {v.name}</option>)}
          </Select>
        </Field>
        <Field label="Length" htmlFor="cl-length">
          <Select id="cl-length" value={o.length} onChange={(e) => setO({ ...o, length: e.target.value as Length })}>
            <option value="SHORT">Short (about 130 words)</option>
            <option value="MEDIUM">Medium (about 220 words)</option>
            <option value="LONG">Long (about 320 words)</option>
          </Select>
        </Field>
        <Field label="Tone" htmlFor="cl-tone">
          <Select id="cl-tone" value={o.tone} onChange={(e) => setO({ ...o, tone: e.target.value as Tone })}>
            <option value="PROFESSIONAL">Professional</option>
            <option value="FRIENDLY">Friendly</option>
            <option value="CONFIDENT">Confident</option>
          </Select>
        </Field>
      </div>
      <Field label="Recipient (optional)" htmlFor="cl-recipient" hint="Leave blank for “Dear Hiring Manager”.">
        <Input id="cl-recipient" value={o.recipient} maxLength={80} onChange={(e) => setO({ ...o, recipient: e.target.value })} />
      </Field>
      <Field label="Why this company? (optional)" htmlFor="cl-notes" hint="Anything you know and want to mention. We only say things about the company that the job post or these notes say.">
        <Textarea id="cl-notes" value={o.notes} maxLength={1000} className="min-h-20" onChange={(e) => setO({ ...o, notes: e.target.value })} />
      </Field>
      <Button type="submit" variant={hasLetter ? "secondary" : "primary"} disabled={pending} className="w-fit">
        <Sparkles className="size-4" aria-hidden /> {pending ? "Writing… (up to a minute)" : hasLetter ? "Write a new draft" : "Write my cover letter"}
      </Button>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

export function LetterEditor({ jobId, letterId, initialText, initialRecipient, history }: {
  jobId: string;
  letterId: string;
  initialText: string;
  initialRecipient: string;
  history: { text: string; savedAt: string }[];
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [recipient, setRecipient] = useState(initialRecipient);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const placeholders = [...new Set(text.match(/\[[^\]\n]{1,40}\]/g) ?? [])];
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  useEffect(() => {
    // New text from the server (a new draft or a restore) replaces what's shown.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(initialText);
  }, [initialText]);

  const save = (t: string, r: string) => {
    clearTimeout(timer.current);
    setStatus("unsaved");
    timer.current = setTimeout(async () => {
      setStatus("saving");
      const res = await saveLetterAction(jobId, letterId, t, r);
      if (res.ok) {
        setStatus("saved");
        setError("");
      } else {
        setStatus("unsaved");
        setError(res.error);
      }
    }, 900);
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Recipient" htmlFor="cl-to">
        <Input id="cl-to" value={recipient} maxLength={80} placeholder="Hiring Manager" onChange={(e) => { setRecipient(e.target.value); save(text, e.target.value); }} />
      </Field>
      <Field label="Letter" htmlFor="cl-text" hint={`${words} words · ${status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Not saved yet"}. Greeting and sign-off are added when you download.`}>
        <Textarea id="cl-text" value={text} maxLength={5000} className="min-h-80 font-[inherit]" onChange={(e) => { setText(e.target.value); save(e.target.value, recipient); }} />
      </Field>
      {placeholders.length > 0 && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Fill in or remove {placeholders.join(", ")} before downloading. We never guess figures for you.
        </p>
      )}
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex flex-wrap gap-2">
        <a aria-disabled={placeholders.length > 0 || status !== "saved"} href={`/app/jobs/${jobId}/cover-letter/export?format=pdf`} className={buttonClass("primary", "md", placeholders.length || status !== "saved" ? "pointer-events-none opacity-50" : "")}><Download className="size-4" aria-hidden /> PDF</a>
        <a aria-disabled={placeholders.length > 0 || status !== "saved"} href={`/app/jobs/${jobId}/cover-letter/export?format=docx`} className={buttonClass("secondary", "md", placeholders.length || status !== "saved" ? "pointer-events-none opacity-50" : "")}><Download className="size-4" aria-hidden /> Word (DOCX)</a>
        <Button onClick={async () => { try { await navigator.clipboard.writeText(`Dear ${recipient.trim() || "Hiring Manager"},\n\n${text}\n\nSincerely,`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }}>
          <Copy className="size-4" aria-hidden /> {copied ? "Copied" : "Copy text"}
        </Button>
      </div>
      {history.length > 0 && (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer font-semibold">Earlier drafts ({history.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {history.map((h, i) => (
              <li key={h.savedAt + i} className="flex flex-col gap-1 rounded-xl border border-rule p-3">
                <p className="text-[13px] text-muted">{new Date(h.savedAt).toLocaleString()}</p>
                <p className="line-clamp-3 break-words">{h.text}</p>
                <Button size="sm" variant="ghost" className="w-fit" onClick={async () => { const r = await restoreLetterAction(jobId, letterId, i); if (r.ok) router.refresh(); else setError(r.error); }}>
                  <RotateCcw className="size-4" aria-hidden /> Use this draft
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

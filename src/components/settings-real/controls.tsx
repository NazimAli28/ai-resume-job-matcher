"use client";

import { useState } from "react";
import { confirmIdentityAction, deleteAccountAction, sendFeedbackAction, setConsentAction } from "@/app/app/settings/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

export function ConsentToggle({ type, label, hint, checked }: { type: string; label: string; hint: string; checked: boolean }) {
  const [on, setOn] = useState(checked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col gap-1">
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-[var(--viz)]"
          checked={on}
          disabled={busy}
          onChange={async (e) => {
            const next = e.target.checked;
            setOn(next);
            setBusy(true);
            setError("");
            try {
              const r = await setConsentAction({ type, granted: next });
              if (!r.ok) {
                setOn(!next);
                setError(r.error);
              }
            } catch {
              setOn(!next);
              setError("That didn't save. Please try again.");
            }
            setBusy(false);
          }}
        />
        <span>
          <span className="font-semibold">{label}</span>
          <span className="block text-muted">{hint}</span>
        </span>
      </label>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

export function ConfirmIdentity({ reason, back }: { reason: string; back?: "blocked" }) {
  return (
    <form action={confirmIdentityAction} className="flex flex-col items-start gap-2">
      <p className="text-sm text-muted">{reason}</p>
      {back && <input type="hidden" name="back" value={back} />}
      <Button type="submit">Sign in again to confirm it&apos;s you</Button>
    </form>
  );
}

export function DeleteAccount({ recent, back }: { recent: boolean; back?: "blocked" }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!recent) return <ConfirmIdentity reason="Deleting your account needs a fresh sign-in." back={back} />;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await deleteAccountAction(typed);
          if (r && !r.ok) setError(r.error);
        } catch (err) {
          // A successful delete ends in a redirect, which arrives here as a thrown signal.
          if (!(err instanceof Error && err.message === "NEXT_REDIRECT")) setError("Something went wrong. Please try again.");
        }
        setBusy(false);
      }}
    >
      <Field label="Type DELETE to confirm" htmlFor="delete-confirm">
        <Input id="delete-confirm" autoComplete="off" className="max-w-56" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </Field>
      <div>
        <Button type="submit" variant="danger" disabled={busy || typed !== "DELETE"}>Delete my account</Button>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setSent(false);
        try {
          const r = await sendFeedbackAction(message);
          if (r.ok) {
            setMessage("");
            setSent(true);
          } else setError(r.error);
        } catch {
          setError("Something went wrong. Please try again.");
        }
        setBusy(false);
      }}
    >
      <Field label="Your message" htmlFor="feedback-message" hint="Only what you type here is sent. Please don't paste your resume.">
        <Textarea id="feedback-message" required minLength={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>Send</Button>
        <span aria-live="polite" className="text-sm text-muted">{sent ? "Thanks, we've got it." : ""}</span>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

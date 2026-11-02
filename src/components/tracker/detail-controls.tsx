"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  addContactAction,
  addRoundAction,
  deleteApplicationAction,
  deleteContactAction,
  deleteRoundAction,
  linkResumeAction,
  moveApplicationAction,
  setNotesAction,
  setReminderAction,
  setRoundOutcomeAction,
  snoozeNudgeAction,
  updateDetailsAction,
} from "@/app/app/applications/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { JOB_SOURCES } from "@/server/match/schemas";
import { CONTACT_ROLES, ROUND_OUTCOMES, ROUND_TYPES, STATUS_LABELS, STATUSES, type Status } from "@/server/tracker/constants";

type Result = { ok: true } | { ok: false; error: string };

/** Busy flag and plain-language error shared by every control on the page. */
function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function run(action: () => Promise<Result>) {
    setBusy(true);
    setError("");
    setSaved(false);
    let ok = false;
    try {
      const r = await action();
      if (r.ok) ok = true;
      else setError(r.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSaved(ok);
    setBusy(false);
    return ok;
  }
  return { busy, error, saved, run };
}

const Saved = ({ show, children = "Saved." }: { show: boolean; children?: ReactNode }) => (
  <span aria-live="polite" className="text-sm text-muted">{show ? children : ""}</span>
);

export function StatusControl({ id, status }: { id: string; status: Status }) {
  const { busy, error, saved, run } = useRun();
  const [to, setTo] = useState(status);
  const [note, setNote] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => moveApplicationAction(id, { toStatus: to, note }))) setNote("");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
        <Field label="Stage" htmlFor="status-to">
          <Select id="status-to" value={to} onChange={(e) => setTo(e.target.value as Status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Note (optional)" htmlFor="status-note">
          <Input id="status-note" maxLength={500} placeholder={to === "REJECTED" || to === "WITHDRAWN" ? "Reason, if you'd like to remember it" : ""} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button type="submit" disabled={busy || to === status}>Update</Button>
      </div>
      <Saved show={saved}>Stage updated.</Saved>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

export function ReminderControl({ id, date, note: initialNote }: { id: string; date: string; note: string }) {
  const { busy, error, saved, run } = useRun();
  const [nextActionAt, setDate] = useState(date);
  const [nextActionNote, setNote] = useState(initialNote);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setReminderAction(id, { nextActionAt, nextActionNote }));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
        <Field label="Remind me on" htmlFor="rem-date">
          <Input id="rem-date" type="date" value={nextActionAt} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="What to do" htmlFor="rem-note">
          <Input id="rem-note" maxLength={200} placeholder="Send a follow-up" value={nextActionNote} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>Save</Button>
      </div>
      <Saved show={saved} />
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

export function ResumeLink({ id, value, versions }: { id: string; value: string; versions: { id: string; label: string; name: string }[] }) {
  const { busy, error, saved, run } = useRun();
  return (
    <div className="flex flex-col gap-2">
      <Field label={value ? "Change the resume you sent" : "Choose the resume you sent"} htmlFor="link-resume" hint="A linked version is locked. It can't change, so this record stays true.">
        <Select id="link-resume" disabled={busy} value={value} onChange={(e) => run(() => linkResumeAction(id, e.target.value))}>
          <option value="">None linked</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>{v.label} · {v.name}</option>
          ))}
        </Select>
      </Field>
      <Saved show={saved} />
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

export function NotesControl({ id, value }: { id: string; value: string }) {
  const { busy, error, saved, run } = useRun();
  const [notes, setNotes] = useState(value);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setNotesAction(id, { notes }));
      }}
    >
      <Textarea aria-label="Notes" maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>Save notes</Button>
        <Saved show={saved} />
      </div>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

export function SnoozeButton({ id, children = "Not now" }: { id: string; children?: ReactNode }) {
  const { busy, error, run } = useRun();
  return (
    <>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => snoozeNudgeAction(id))}>{children}</Button>
      {error && <FormAlert>{error}</FormAlert>}
    </>
  );
}

export function MarkGhosted({ id }: { id: string }) {
  const { busy, error, run } = useRun();
  return (
    <>
      <Button size="sm" disabled={busy} onClick={() => run(() => moveApplicationAction(id, { toStatus: "GHOSTED" }))}>Mark as ghosted</Button>
      {error && <FormAlert>{error}</FormAlert>}
    </>
  );
}

export function AddRound({ id }: { id: string }) {
  const { busy, error, run } = useRun();
  const [type, setType] = useState("HR");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    // datetime-local is the browser's own time; turning it into an instant here keeps it right on the server.
    const scheduledAt = when ? new Date(when).toISOString() : "";
    if (await run(() => addRoundAction(id, { type, scheduledAt, notes }))) {
      setWhen("");
      setNotes("");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border-t border-rule pt-4">
      <div className="grid gap-3 sm:grid-cols-[10rem_14rem_1fr_auto] sm:items-end">
        <Field label="Round" htmlFor="round-type">
          <Select id="round-type" value={type} onChange={(e) => setType(e.target.value)}>
            {ROUND_TYPES.map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date and time" htmlFor="round-when">
          <Input id="round-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <Field label="Notes (optional)" htmlFor="round-notes">
          <Input id="round-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>Add round</Button>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

export function RoundControls({ roundId, outcome, label }: { roundId: string; outcome: string; label: string }) {
  const { busy, error, run } = useRun();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label={`Outcome of ${label}`} className="w-36" disabled={busy} value={outcome} onChange={(e) => run(() => setRoundOutcomeAction(roundId, e.target.value))}>
        {ROUND_OUTCOMES.map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </Select>
      <Button size="sm" variant="ghost" aria-label={`Remove ${label}`} disabled={busy} onClick={() => run(() => deleteRoundAction(roundId))}>Remove</Button>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

export function AddContact({ id }: { id: string }) {
  const { busy, error, run } = useRun();
  const blank = { name: "", role: "RECRUITER", email: "", phone: "", linkedinUrl: "", notes: "" };
  const [c, setC] = useState(blank);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setC((v) => ({ ...v, [k]: e.target.value }));
  return (
    <form
      className="flex flex-col gap-3 border-t border-rule pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => addContactAction(id, c))) setC(blank);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name"><Input id="c-name" required maxLength={120} value={c.name} onChange={set("name")} /></Field>
        <Field label="Role" htmlFor="c-role">
          <Select id="c-role" value={c.role} onChange={set("role")}>
            {CONTACT_ROLES.map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Email (optional)" htmlFor="c-email"><Input id="c-email" type="email" maxLength={200} value={c.email} onChange={set("email")} /></Field>
        <Field label="Phone (optional)" htmlFor="c-phone"><Input id="c-phone" type="tel" maxLength={40} value={c.phone} onChange={set("phone")} /></Field>
        <Field label="LinkedIn (optional)" htmlFor="c-li" className="sm:col-span-2"><Input id="c-li" type="url" maxLength={500} placeholder="https://" value={c.linkedinUrl} onChange={set("linkedinUrl")} /></Field>
      </div>
      <div><Button type="submit" disabled={busy}>Add person</Button></div>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

export function RemoveContact({ contactId, name }: { contactId: string; name: string }) {
  const { busy, error, run } = useRun();
  return (
    <>
      <Button size="sm" variant="ghost" aria-label={`Remove ${name}`} disabled={busy} onClick={() => run(() => deleteContactAction(contactId))}>Remove</Button>
      {error && <FormAlert>{error}</FormAlert>}
    </>
  );
}

export interface DetailsValue {
  company: string;
  title: string;
  location: string;
  url: string;
  source: string;
  sourceDetail: string;
  deadline: string;
  salaryExpected: string;
  priority: string;
}

export function DetailsForm({ id, value }: { id: string; value: DetailsValue }) {
  const { busy, error, saved, run } = useRun();
  const [d, setD] = useState(value);
  const set = (k: keyof DetailsValue) => (e: { target: { value: string } }) => setD((v) => ({ ...v, [k]: e.target.value }));
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateDetailsAction(id, d));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company" htmlFor="d-company"><Input id="d-company" required maxLength={120} value={d.company} onChange={set("company")} /></Field>
        <Field label="Job title" htmlFor="d-title"><Input id="d-title" required maxLength={120} value={d.title} onChange={set("title")} /></Field>
        <Field label="Where you found it" htmlFor="d-source">
          <Select id="d-source" value={d.source} onChange={set("source")}>
            {JOB_SOURCES.map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Source detail (optional)" htmlFor="d-sd"><Input id="d-sd" maxLength={100} value={d.sourceDetail} onChange={set("sourceDetail")} /></Field>
        <Field label="Location (optional)" htmlFor="d-loc"><Input id="d-loc" maxLength={120} value={d.location} onChange={set("location")} /></Field>
        <Field label="Link to the post (optional)" htmlFor="d-url"><Input id="d-url" type="url" maxLength={500} value={d.url} onChange={set("url")} /></Field>
        <Field label="Application deadline" htmlFor="d-deadline"><Input id="d-deadline" type="date" value={d.deadline} onChange={set("deadline")} /></Field>
        <Field label="Expected salary (PKR)" htmlFor="d-salary"><Input id="d-salary" inputMode="numeric" maxLength={10} value={d.salaryExpected} onChange={set("salaryExpected")} /></Field>
        <Field label="Priority" htmlFor="d-priority">
          <Select id="d-priority" value={d.priority} onChange={set("priority")}>
            <option value="1">High</option>
            <option value="2">Normal</option>
            <option value="3">Low</option>
          </Select>
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>Save details</Button>
        <Saved show={saved} />
      </div>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

export function DeleteApplication({ id }: { id: string }) {
  const router = useRouter();
  const { busy, error, run } = useRun();
  const [confirming, setConfirming] = useState(false);
  async function remove() {
    if (await run(() => deleteApplicationAction(id))) router.push("/app/applications");
  }
  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Delete this application and its history? This can&apos;t be undone.</span>
          <Button variant="danger" size="sm" disabled={busy} onClick={remove}>Delete</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(false)}>Keep it</Button>
        </div>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 className="size-4" aria-hidden /> Delete application
        </Button>
      )}
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

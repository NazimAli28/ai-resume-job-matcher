"use client";

import { Check, History, Plus, StickyNote, UsersRound, X, CalendarDays, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { STATUS_LABEL } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/dates";
import { InitialTile } from "./tile";
import { useDemo } from "@/demo/store";
import type { Application, Contact, InterviewRound, RoundType } from "@/demo/types";

export function Section({ title, icon: Icon, children }: { title: string; icon?: LucideIcon; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-rule bg-surface p-4">
      <h3 className="flex items-center gap-2 text-base font-bold">
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-hl-soft text-hl-ink">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        {title}
      </h3>
      {children}
    </section>
  );
}

const ROUND_LABEL: Record<RoundType, string> = {
  HR: "HR round",
  TECHNICAL: "Technical round",
  FINAL: "Final round",
  PANEL: "Panel",
  TAKE_HOME: "Take-home",
  OTHER: "Other",
};

export function Rounds({ app }: { app: Application }) {
  const { dispatch } = useDemo();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<RoundType>("TECHNICAL");
  const [at, setAt] = useState("");
  const [note, setNote] = useState("");

  const save = (rounds: InterviewRound[]) => dispatch({ type: "UPDATE_APPLICATION", id: app.id, patch: { rounds } });
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!at) return;
    save([...app.rounds, { id: `rd${Date.now()}`, type, at, note: note.trim() || undefined, done: false }]);
    setAdding(false);
    setNote("");
    setAt("");
  };

  return (
    <Section title="Interview rounds" icon={CalendarDays}>
      {app.rounds.length === 0 && !adding && <p className="text-muted">No rounds yet. Add one when you get a date.</p>}
      <ul className="flex flex-col gap-1">
        {app.rounds.map((r) => (
          <li key={r.id} className="flex items-start gap-3">
            <input
              id={`round-${r.id}`}
              type="checkbox"
              checked={r.done}
              onChange={() => save(app.rounds.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)))}
              className="mt-3.5 size-5 accent-[var(--hl-ink)]"
            />
            <label htmlFor={`round-${r.id}`} className="min-h-11 flex-1 py-2">
              <span className={r.done ? "text-muted line-through" : "font-semibold"}>{ROUND_LABEL[r.type]}</span>
              <span className="text-muted"> on {formatDate(r.at)}</span>
              {r.note && <span className="block text-sm text-muted">{r.note}</span>}
              <span className="sr-only">{r.done ? "Done" : "Not done. Tick to mark done."}</span>
            </label>
          </li>
        ))}
      </ul>
      {adding ? (
        <form onSubmit={add} className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-sunken p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Round type" htmlFor="round-type">
              <Select id="round-type" value={type} onChange={(e) => setType(e.target.value as RoundType)}>
                {(Object.keys(ROUND_LABEL) as RoundType[]).map((t) => (
                  <option key={t} value={t}>{ROUND_LABEL[t]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date" htmlFor="round-date">
              <Input id="round-date" type="date" value={at} onChange={(e) => setAt(e.target.value)} required />
            </Field>
          </div>
          <Field label="Note (optional)" htmlFor="round-note">
            <Input id="round-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm">Add round</Button>
            <Button size="sm" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div>
          <Button size="sm" onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden /> Add round</Button>
        </div>
      )}
    </Section>
  );
}

export function Contacts({ app }: { app: Application }) {
  const { dispatch } = useDemo();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const c: Contact = { id: `c${Date.now()}`, name: name.trim(), role: role.trim(), email: email.trim() || undefined };
    dispatch({ type: "UPDATE_APPLICATION", id: app.id, patch: { contacts: [...app.contacts, c] } });
    setAdding(false);
    setName(""); setRole(""); setEmail("");
  };

  return (
    <Section title="Contacts" icon={UsersRound}>
      {app.contacts.length === 0 && !adding && <p className="text-muted">Recruiters, referrers and interviewers you speak to.</p>}
      <ul className="flex flex-col gap-2">
        {app.contacts.map((c) => (
          <li key={c.id} className="flex items-start gap-3">
            <InitialTile name={c.name} size={36} round />
            <span className="min-w-0">
            <span className="font-semibold">{c.name}</span>
            {c.role && <span className="text-muted">, {c.role}</span>}
            {c.email && <a href={`mailto:${c.email}`} className="block text-sm underline-offset-4 hover:underline">{c.email}</a>}
            {c.note && <span className="block text-sm text-muted">{c.note}</span>}
            </span>
          </li>
        ))}
      </ul>
      {adding ? (
        <form onSubmit={add} className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-sunken p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="contact-name">
              <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Role" htmlFor="contact-role">
              <Input id="contact-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Recruiter" />
            </Field>
          </div>
          <Field label="Email (optional)" htmlFor="contact-email">
            <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm">Add contact</Button>
            <Button size="sm" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div>
          <Button size="sm" onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden /> Add contact</Button>
        </div>
      )}
    </Section>
  );
}

export function Notes({ app }: { app: Application }) {
  const { dispatch } = useDemo();
  const toast = useToast();
  const [draft, setDraft] = useState(app.notes);
  const dirty = draft !== app.notes;
  return (
    <Section title="Notes" icon={StickyNote}>
      <Textarea aria-label="Notes" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Interview prep, what they said, salary talk." />
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant={dirty ? "primary" : "secondary"}
          disabled={!dirty}
          onClick={() => {
            dispatch({ type: "UPDATE_APPLICATION", id: app.id, patch: { notes: draft } });
            toast("Notes saved");
          }}
        >
          Save notes
        </Button>
        {dirty && <span className="text-sm text-muted">Unsaved changes</span>}
      </div>
    </Section>
  );
}

export function Timeline({ app }: { app: Application }) {
  const items = [...app.history].reverse();
  return (
    <Section title="Status timeline" icon={History}>
      <ol className="flex flex-col">
        {items.map((h, i) => (
          <li key={`${h.status}-${h.at}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {i < items.length - 1 && <span aria-hidden className="absolute left-[9px] top-6 h-[calc(100%-1rem)] w-0.5 rounded-full bg-rule-strong" />}
            <span
              aria-hidden
              className={i === 0 ? "relative mt-1 size-5 shrink-0 rounded-full border-4 border-hl bg-surface glow" : "relative mt-1 size-5 shrink-0 rounded-full border-2 border-rule-strong bg-sunken"}
            />
            <span>
              <span className="font-semibold">{STATUS_LABEL[h.status]}</span>
              <span className="text-muted"> on {formatDate(h.at)}</span>
              {h.note && <span className="block text-sm text-muted">{h.note}</span>}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Tags({ app }: { app: Application }) {
  const { dispatch } = useDemo();
  const [value, setValue] = useState("");
  const set = (tags: string[]) => dispatch({ type: "UPDATE_APPLICATION", id: app.id, patch: { tags } });
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = value.trim().toLowerCase();
    if (t && !app.tags.includes(t)) set([...app.tags, t]);
    setValue("");
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">Tags</span>
      <div className="flex flex-wrap items-center gap-2">
        {app.tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-hl-soft py-0.5 pl-3 pr-1 text-sm font-semibold text-hl-ink">
            {t}
            <button type="button" aria-label={`Remove tag ${t}`} onClick={() => set(app.tags.filter((x) => x !== t))} className="grid size-8 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink">
              <X className="size-4" aria-hidden />
            </button>
          </span>
        ))}
        <form onSubmit={add} className="flex gap-2">
          <Input aria-label="New tag" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add a tag" className="h-10 w-36" />
          <Button type="submit" size="sm" aria-label="Add tag"><Check className="size-4" aria-hidden /></Button>
        </form>
      </div>
    </div>
  );
}

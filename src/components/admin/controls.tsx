"use client";

import { useState } from "react";
import { markFeedbackReadAction, resolveErrorAction, setBlockedAction, setDefaultAccentAction, setKillSwitchAction, setSpendLimitsAction } from "@/app/admin/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { ACCENTS } from "@/components/theme/use-theme";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

type Result = { ok: true } | { ok: false; error: string };

function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<Result>) {
    setBusy(true);
    setError("");
    try {
      const r = await action();
      if (!r.ok) setError(r.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }
  return { busy, error, run };
}

export function KillSwitch({ disabled }: { disabled: boolean }) {
  const { busy, error, run } = useRun();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">AI features are <strong>{disabled ? "OFF for everyone" : "on"}</strong>.</p>
      <div>
        <Button variant={disabled ? "primary" : "danger"} size="sm" disabled={busy} onClick={() => run(() => setKillSwitchAction(!disabled))}>
          {disabled ? "Turn AI back on" : "Turn AI off for everyone"}
        </Button>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

export function DefaultAccent({ value }: { value: string }) {
  const { busy, error, run } = useRun();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="default-accent" className="text-sm font-semibold">Accent color for new visitors</label>
      <Select id="default-accent" className="w-44" disabled={busy} value={value} onChange={(e) => run(() => setDefaultAccentAction(e.target.value))}>
        {ACCENTS.map((a) => (
          <option key={a.id} value={a.id}>{a.label}</option>
        ))}
      </Select>
      <p className="text-[13px] text-muted">People who picked their own accent keep it.</p>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

export function BlockUser({ userId, blocked, label }: { userId: string; blocked: boolean; label: string }) {
  const { busy, error, run } = useRun();
  const [reason, setReason] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!blocked && <Input aria-label={`Reason for blocking ${label}`} placeholder="Reason" maxLength={200} className="h-9 w-36 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} />}
      <Button size="sm" variant={blocked ? "secondary" : "danger"} disabled={busy} onClick={() => run(() => setBlockedAction(userId, !blocked, reason))}>
        {blocked ? "Unblock" : "Block"}
      </Button>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}

export function ResolveError({ id }: { id: string }) {
  const { busy, error, run } = useRun();
  return (
    <>
      <Button size="sm" disabled={busy} onClick={() => run(() => resolveErrorAction(id))}>Mark resolved</Button>
      {error && <FormAlert>{error}</FormAlert>}
    </>
  );
}

export function MarkRead({ id }: { id: string }) {
  const { busy, error, run } = useRun();
  return (
    <>
      <Button size="sm" disabled={busy} onClick={() => run(() => markFeedbackReadAction(id))}>Mark read</Button>
      {error && <FormAlert>{error}</FormAlert>}
    </>
  );
}

const LIMIT_FIELDS = [
  { key: "userDaily", label: "Per person, a day" },
  { key: "userWeekly", label: "Per person, a week" },
  { key: "userMonthly", label: "Per person, a month" },
  { key: "globalDaily", label: "Everyone, a day" },
  { key: "globalMonthly", label: "Everyone, a month" },
] as const;

type Limits = Record<(typeof LIMIT_FIELDS)[number]["key"], number>;

export function SpendLimits({ value, defaults }: { value: Limits; defaults: Limits }) {
  const { busy, error, run } = useRun();
  const [draft, setDraft] = useState(() => Object.fromEntries(LIMIT_FIELDS.map((f) => [f.key, String(value[f.key])])) as Record<keyof Limits, string>);
  const [saved, setSaved] = useState(false);
  const changed = LIMIT_FIELDS.some((f) => Number(draft[f.key]) !== value[f.key]);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        void run(async () => {
          const r = await setSpendLimitsAction(draft);
          if (r.ok) setSaved(true);
          return r;
        });
      }}
    >
      <p className="text-sm font-semibold">AI spend limits (USD)</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {LIMIT_FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-[13px]">
            <span className="text-muted">{f.label}</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={1000}
              step="0.01"
              required
              className="h-9 text-sm tabular-nums"
              value={draft[f.key]}
              onChange={(e) => {
                setSaved(false);
                setDraft({ ...draft, [f.key]: e.target.value });
              }}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy || !changed}>Save limits</Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setDraft(Object.fromEntries(LIMIT_FIELDS.map((f) => [f.key, String(defaults[f.key])])) as Record<keyof Limits, string>)}>
          Fill in beta defaults
        </Button>
        {saved && <span className="text-[13px] text-muted" role="status">Saved. Applies from the next AI request.</span>}
      </div>
      <p className="text-[13px] text-muted">0 turns that window off. A person&apos;s day can&apos;t be above their week, nor week above month. Keep &quot;Everyone, a month&quot; below your Anthropic console spend limit so the app stops first, with a clear message.</p>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

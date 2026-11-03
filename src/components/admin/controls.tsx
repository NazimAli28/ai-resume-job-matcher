"use client";

import { useState } from "react";
import { markFeedbackReadAction, resolveErrorAction, setBlockedAction, setDefaultAccentAction, setKillSwitchAction } from "@/app/admin/actions";
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

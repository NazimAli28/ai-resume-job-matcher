"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startMfaEnrollAction, verifyMfaAction } from "@/app/admin/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function MfaForm({ hasFactor }: { hasFactor: boolean }) {
  const router = useRouter();
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const r = await startMfaEnrollAction().catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
    if (r.ok) setEnroll(r);
    else setError(r.error);
    setBusy(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await verifyMfaAction(code, enroll?.factorId).catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
    if (r.ok) {
      router.push("/admin");
      router.refresh();
      return;
    }
    setError(r.error);
    setCode("");
    setBusy(false);
  }

  if (!hasFactor && !enroll) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted">The admin area needs a code from an authenticator app, such as Google Authenticator or Microsoft Authenticator, every time you sign in.</p>
        <div><Button variant="primary" disabled={busy} onClick={start}>Set up authenticator</Button></div>
        {error && <FormAlert>{error}</FormAlert>}
      </div>
    );
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-4">
      {enroll ? (
        <>
          <p className="text-muted">Scan this with your authenticator app, then enter the code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- a one-time data: image from Supabase */}
          <img src={enroll.qr} alt="QR code for your authenticator app. The setup key below does the same job." width={200} height={200} className="rounded-xl bg-white p-2" />
          <p className="break-all text-sm text-muted">Or enter this key by hand: <code className="font-semibold text-ink">{enroll.secret}</code></p>
        </>
      ) : (
        <p className="text-muted">Enter the code from your authenticator app.</p>
      )}
      <Field label="6-digit code" htmlFor="mfa-code">
        <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="max-w-40" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <div><Button type="submit" variant="primary" disabled={busy || code.length !== 6}>Continue</Button></div>
      {error && <FormAlert>{error}</FormAlert>}
    </form>
  );
}

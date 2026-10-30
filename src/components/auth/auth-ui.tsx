"use client";

import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function FormAlert({ tone = "error", children }: { tone?: "error" | "ok"; children: ReactNode }) {
  const Icon = tone === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <p
      role={tone === "ok" ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm",
        tone === "ok" ? "bg-hl-soft text-ink" : "bg-warn-soft text-warn",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Labeled input with its own inline error, wired for screen readers. */
export function AuthField({
  name,
  label,
  type = "text",
  autoComplete,
  error,
  hint,
  required = true,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  defaultValue?: string;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  const describedBy = [error ? `${id}-err` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {!required && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isPw && show ? "text" : type}
          autoComplete={autoComplete}
          required={required}
          defaultValue={defaultValue}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-xl border bg-surface px-3 text-ink placeholder:text-muted focus:border-hl-ink focus:outline-none",
            isPw && "pr-12",
            error ? "border-warn" : "border-rule",
          )}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink"
          >
            {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-[13px] text-warn">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children, pendingText }: { children: ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
      {pending ? pendingText : children}
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.3 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

/** Google sign-in as a separate form, so it never submits the email/password fields. */
export function GoogleButton({ action, next, label }: { action: (f: FormData) => Promise<void>; next?: string; label: string }) {
  return (
    <form action={action}>
      {next && <input type="hidden" name="next" value={next} />}
      <GoogleSubmit label={label} />
    </form>
  );
}

function GoogleSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      <GoogleMark /> {pending ? "Opening Google…" : label}
    </Button>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted" aria-hidden>
      <span className="h-px flex-1 bg-rule" />
      or
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}

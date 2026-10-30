"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword, type FormState } from "@/app/(auth)/actions";
import { AuthField, FormAlert, SubmitButton } from "./auth-ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <AuthField name="email" label="Email" type="email" autoComplete="email" error={state?.fieldErrors?.email} />
      <AuthField name="password" label="Password" type="password" autoComplete="current-password" error={state?.fieldErrors?.password} />
      <div className="-mt-1 flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <AuthField name="name" label="Your name" autoComplete="name" required={false} error={fe.name} />
      <AuthField name="email" label="Email" type="email" autoComplete="email" error={fe.email} />
      <AuthField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={fe.password}
        hint="At least 10 characters. A short phrase is easier to remember and harder to guess."
      />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="accept" required aria-invalid={!!fe.accept} className="mt-0.5 size-5 shrink-0 accent-[var(--hl-ink)]" />
        <span>
          I am 16 or older and agree to the{" "}
          <Link href="/legal/terms" target="_blank" className="font-semibold underline underline-offset-4">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" target="_blank" className="font-semibold underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {fe.accept && <p className="-mt-2 text-[13px] text-warn">{fe.accept}</p>}
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="marketing" className="mt-0.5 size-5 shrink-0 accent-[var(--hl-ink)]" />
        <span>Send me occasional product tips and news. You can unsubscribe any time.</span>
      </label>
      <SubmitButton pendingText="Creating your account…">Create account</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, undefined);
  if (state?.ok) return <FormAlert tone="ok">{state.ok}</FormAlert>;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <AuthField name="email" label="Email" type="email" autoComplete="email" error={state?.fieldErrors?.email} />
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState<FormState, FormData>(updatePassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <AuthField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        error={state?.fieldErrors?.password}
        hint="At least 10 characters."
      />
      <AuthField name="confirm" label="Confirm new password" type="password" autoComplete="new-password" error={state?.fieldErrors?.confirm} />
      <SubmitButton pendingText="Saving…">Save new password</SubmitButton>
    </form>
  );
}

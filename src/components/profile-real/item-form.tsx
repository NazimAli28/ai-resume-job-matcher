"use client";

import { useActionState, useRef, startTransition, type ReactNode } from "react";
import type { ActionState } from "@/app/app/profile/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import type { Err } from "./fields";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

/**
 * Generic form for one profile item. Submits through a transition (not the form `action` prop) so React
 * does not wipe what the person typed when validation fails.
 */
export function ItemForm({
  action,
  id,
  submitLabel,
  pendingLabel = "Saving…",
  onDone,
  onCancel,
  resetOnOk,
  children,
}: {
  action: Action;
  id?: string;
  submitLabel: string;
  pendingLabel?: string;
  onDone?: () => void;
  onCancel?: () => void;
  resetOnOk?: boolean;
  children: (err: Err) => ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await action(prev, fd);
    if (res?.ok) {
      if (resetOnOk) ref.current?.reset();
      onDone?.();
    }
    return res;
  }, undefined);

  const fieldErrors = state?.fieldErrors;
  const err: Err = (name) => fieldErrors?.[name];
  const hasFieldErrors = !!fieldErrors && Object.keys(fieldErrors).length > 0;

  return (
    <form
      ref={ref}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {id && <input type="hidden" name="id" value={id} />}
      {children(err)}
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      {fieldErrors?.form && <FormAlert>{fieldErrors.form}</FormAlert>}
      {hasFieldErrors && !fieldErrors?.form && <FormAlert>Some details need another look. They are marked above.</FormAlert>}
      {state?.ok && !onDone && <FormAlert tone="ok">{state.ok}</FormAlert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

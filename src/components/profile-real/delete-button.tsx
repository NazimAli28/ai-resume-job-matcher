"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/app/profile/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";

/** Two-step delete: the first click asks, the second one deletes. `what` names the item for screen readers. */
export function DeleteButton({
  action,
  id,
  what,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  id: string;
  what: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-2">
        {confirming ? (
          <>
            <Button key="confirm" type="submit" variant="danger" disabled={pending} aria-label={`Confirm delete ${what}`}>
              {pending ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button key="cancel" type="button" onClick={() => setConfirming(false)} disabled={pending}>
              Keep it
            </Button>
          </>
        ) : (
          <Button key="ask" type="button" variant="danger" onClick={() => setConfirming(true)} aria-label={`Delete ${what}`}>
            Delete
          </Button>
        )}
      </div>
      {state?.error && <FormAlert>{state.error}</FormAlert>}
    </form>
  );
}

"use client";

import { useCallback } from "react";
import { STATUS_LABEL } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { useDemo } from "@/demo/store";
import type { ApplicationStatus } from "@/demo/types";

/** Moves an application and shows "Moved to X" with an Undo that restores status and history. */
export function useMoveApplication() {
  const { state, dispatch } = useDemo();
  const toast = useToast();
  return useCallback(
    (id: string, status: ApplicationStatus) => {
      const app = state.applications.find((a) => a.id === id);
      if (!app || app.status === status) return;
      const prev = { status: app.status, history: app.history, appliedAt: app.appliedAt };
      dispatch({ type: "MOVE_APPLICATION", id, status });
      toast(`Moved to ${STATUS_LABEL[status]}`, {
        label: "Undo",
        onClick: () => dispatch({ type: "UPDATE_APPLICATION", id, patch: prev }),
      });
    },
    [state.applications, dispatch, toast],
  );
}

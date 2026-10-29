"use client";
import { useSkipMotion } from "@/components/ui/motion";

import { Ghost, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useStoredString } from "@/components/applications/use-stored-state";
import { useMoveApplication } from "@/components/applications/use-move";
import { Button, IconButton } from "@/components/ui/button";
import { daysBetween } from "@/lib/dates";
import { useDemo } from "@/demo/store";
import { ghostCandidates } from "./logic";

const KEY = "arw-dash-ghost-dismissed";

/** Alert card for applications with no update in 21+ days. Dismissals are remembered per viewer. */
export function GhostingNudge() {
  const { state } = useDemo();
  const move = useMoveApplication();
  const reduce = useSkipMotion();
  const [raw, setRaw] = useStoredString(KEY, "");
  const dismissed = raw ? raw.split(",") : [];
  const items = ghostCandidates(state.applications).filter((a) => !dismissed.includes(a.id));

  return (
    <AnimatePresence initial={false}>
      {items.map((a) => (
        <motion.section
          key={a.id}
          aria-label={`No reply from ${a.company}`}
          initial={reduce ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.25 } }}
          className="relative flex flex-col gap-3 overflow-hidden rounded-[20px] border border-warn/40 bg-warn-soft p-4 pr-14 sm:flex-row sm:items-center sm:gap-4 sm:p-5 sm:pr-14"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-warn">
            <Ghost className="size-5" aria-hidden />
          </span>
          <p className="flex-1">
            <span className="font-semibold">No update from {a.company} in {daysBetween(a.updatedAt)} days.</span>{" "}
            <span className="text-muted">Mark it as ghosted to keep your board accurate. You can move it back anytime.</span>
          </p>
          <div>
            <Button size="sm" variant="ink" onClick={() => move(a.id, "GHOSTED")}>
              Mark as ghosted
            </Button>
          </div>
          <IconButton
            aria-label={`Dismiss the ${a.company} reminder`}
            onClick={() => setRaw([...dismissed, a.id].join(","))}
            className="absolute right-2 top-2"
          >
            <X className="size-5" aria-hidden />
          </IconButton>
        </motion.section>
      ))}
    </AnimatePresence>
  );
}

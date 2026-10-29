// The hero demo's honest stage labels, in order. Durations are simulated (no real parsing).
export type Phase = "idle" | "reading" | "masking" | "structure" | "evidence" | "done";

export const STAGES: { key: Exclude<Phase, "idle" | "done">; label: string; ms: number }[] = [
  { key: "reading", label: "Reading your resume", ms: 900 },
  { key: "masking", label: "Masking your CNIC, phone and email", ms: 900 },
  { key: "structure", label: "Checking structure and headings", ms: 1000 },
  { key: "evidence", label: "Looking for evidence in your bullets", ms: 1200 },
];

const ORDER: Phase[] = ["idle", "reading", "masking", "structure", "evidence", "done"];

/** True once `phase` has reached (or passed) `target`. */
export function reached(phase: Phase, target: Phase): boolean {
  return ORDER.indexOf(phase) >= ORDER.indexOf(target);
}

export function nextPhase(phase: Phase): Phase {
  return ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(phase) + 1)];
}

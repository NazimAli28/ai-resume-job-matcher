// Read-only sample data for the public landing page. Everything here is derived from
// the demo data set (Ayesha's resume v3 and the Indus Systems job), so the landing page
// shows exactly what the demo app shows. Nothing is invented for marketing.
import { initialState } from "@/demo/data";
import type { MatchClass } from "@/demo/types";

export const sampleResume = initialState.resumes.find((r) => r.id === "rv3")!;
export const sampleJob = initialState.jobs.find((j) => j.id === "j1")!;
export const sampleInterview = initialState.interviews[0];

export const findingById = (id: string) => sampleResume.findings.find((f) => f.id === id)!;
export const suggestionById = (id: string) => initialState.suggestions.find((s) => s.id === id)!;

/** Lines the hero demo marks with the highlighter: strong, specific evidence. */
export const EVIDENCE_LINES = [
  "Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers.",
  "Wrote unit tests with Jest and React Testing Library for core components.",
];

/**
 * Findings the hero demo reveals, in the order they are numbered on the sheet.
 * `line` is the exact resume line the marker sits on; `stage` is when it appears.
 */
export const HERO_FINDINGS: { id: string; line: string; stage: "structure" | "evidence" }[] = [
  { id: "f1", line: "CNIC: 35202-•••••••-•", stage: "structure" },
  { id: "f2", line: "ayesha.khan@example.com · +92 3xx xxxxxxx · linkedin.com/in/ayesha-demo", stage: "structure" },
  { id: "f5", line: "My Journey", stage: "structure" },
  { id: "f3", line: "Responsible for making components reusable.", stage: "evidence" },
  { id: "f4", line: "Worked on the checkout flow, which reduced failed payments.", stage: "evidence" },
];

/** How a requirement's match class counts toward its factor (same rule as the app). */
export const CREDIT: Record<MatchClass, number> = { STRONG: 1, PARTIAL: 0.5, UNKNOWN: 0.5, MISSING: 0 };

export const HARD_GAP_CAP = 60;

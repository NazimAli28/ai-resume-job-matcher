import type { z } from "zod";

/** Spec: docs/prd/05-ai-engine.md §13. Every AI call goes through this interface. */
export type ModelTier = "fast" | "smart" | "offline";

export type TaskId =
  | "extract_resume"
  | "extract_job"
  | "explain_match"
  | "suggest_edits"
  | "tailor_version"
  | "cover_letter"
  | "interview_blueprint"
  | "interview_turn"
  | "evaluate_answer";

export interface StructuredRequest<T> {
  task: TaskId;
  promptVersion: string; // e.g. "extract_resume@v001"
  model: ModelTier;
  system: string;
  cacheablePrefix: string;
  input: string; // already PII-masked and wrapped as untrusted data
  schema: z.ZodType<T>;
  /** How hard the model thinks. Current Claude models take this instead of a temperature. */
  effort?: "low" | "medium" | "high";
  maxTokens: number;
  signal?: AbortSignal;
}

type Usage = { inTok: number; outTok: number; cachedTok: number };

/** The model answered but not in a usable shape. Tokens were still spent, so usage travels with it. */
export class AiInvalidOutputError extends Error {
  constructor(public usage: Usage = { inTok: 0, outTok: 0, cachedTok: 0 }, public costUsd = 0) {
    super("ai_invalid_output");
  }
}
export class AiRefusedError extends Error {
  constructor(public usage: Usage = { inTok: 0, outTok: 0, cachedTok: 0 }, public costUsd = 0) {
    super("ai_refused");
  }
}

export interface StructuredResult<T> {
  data: T;
  usage: { inTok: number; outTok: number; cachedTok: number };
  costUsd: number;
  latencyMs: number;
  model: string;
}

export interface AiProvider {
  id: "anthropic" | "mock";
  generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>>;
}

/** Tier → model id. Change only with an eval pass (05 §13.3). */
export const MODEL_FOR_TIER: Record<ModelTier, string> = {
  fast: "claude-haiku-5-5",
  smart: "claude-sonnet-5-5",
  offline: "claude-opus-5-5",
};

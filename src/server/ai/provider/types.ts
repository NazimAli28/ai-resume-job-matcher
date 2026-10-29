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
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
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

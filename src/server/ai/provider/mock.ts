import type { AiProvider, StructuredRequest } from "./types";

/**
 * Deterministic provider for tests and evals: returns canned outputs by task.
 * The output still goes through the request's Zod schema, like a real response.
 */
export function createMockProvider(fixtures: Partial<Record<StructuredRequest<unknown>["task"], unknown>>): AiProvider {
  return {
    id: "mock",
    async generateStructured<T>(req: StructuredRequest<T>) {
      const raw = fixtures[req.task];
      if (raw === undefined) throw new Error(`No mock fixture for task ${req.task}`);
      return {
        data: req.schema.parse(raw),
        usage: { inTok: 0, outTok: 0, cachedTok: 0 },
        costUsd: 0,
        latencyMs: 0,
        model: "mock",
      };
    },
  };
}

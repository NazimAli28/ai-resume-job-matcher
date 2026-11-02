import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MODEL_FOR_TIER, AiInvalidOutputError, AiRefusedError, type AiProvider, type ModelTier, type StructuredRequest } from "./types";

/** USD per million tokens. Verify against Anthropic's pricing page when a model changes. */
const PRICE: Record<ModelTier, { in: number; out: number; cacheRead: number }> = {
  fast: { in: 0.1, out: 0.5, cacheRead: 0.01 },
  smart: { in: 2, out: 10, cacheRead: 0.2 },
  offline: { in: 4, out: 20, cacheRead: 0.2 },
};

export function estimateCostUsd(tier: ModelTier, u: { inTok: number; outTok: number; cachedTok: number }): number {
  const p = PRICE[tier];
  return (u.inTok * p.in + u.outTok * p.out + u.cachedTok * p.cacheRead) / 1_000_000;
}

/**
 * Claude behind AiProvider. No tools are ever passed: resume and job text is untrusted input
 * (05 §8.3), so the only thing a response can do is fill the output schema, which Zod re-checks.
 */
export function createAnthropicProvider(apiKey: string, opts: { fetch?: typeof fetch } = {}): AiProvider {
  const client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1, ...(opts.fetch ? { fetch: opts.fetch } : {}) });
  return {
    id: "anthropic",
    async generateStructured<T>(req: StructuredRequest<T>) {
      const started = Date.now();
      const res = await client.messages.parse(
        {
          model: MODEL_FOR_TIER[req.model],
          max_tokens: req.maxTokens,
          system: [
            { type: "text", text: req.system },
            { type: "text", text: req.cacheablePrefix, cache_control: { type: "ephemeral" } },
          ],
          messages: [{ role: "user", content: req.input }],
          output_config: { effort: req.effort ?? "low", format: zodOutputFormat(req.schema as never) },
        },
        req.signal ? { signal: req.signal } : undefined,
      );
      const usage = {
        inTok: res.usage.input_tokens + (res.usage.cache_creation_input_tokens ?? 0),
        outTok: res.usage.output_tokens,
        cachedTok: res.usage.cache_read_input_tokens ?? 0,
      };
      const costUsd = estimateCostUsd(req.model, usage);
      const latencyMs = Date.now() - started;
      if (res.stop_reason === "refusal") throw new AiRefusedError(usage, costUsd);
      if (res.stop_reason === "max_tokens" || res.parsed_output === null) throw new AiInvalidOutputError(usage, costUsd);
      return { data: res.parsed_output as T, usage, costUsd, latencyMs, model: res.model };
    },
  };
}

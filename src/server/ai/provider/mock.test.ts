import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createMockProvider } from "./mock";

const req = { task: "extract_job" as const, promptVersion: "extract_job@v000", model: "fast" as const, system: "", cacheablePrefix: "", input: "", temperature: 0, maxTokens: 10 };

describe("mock AiProvider", () => {
  it("returns schema-validated fixtures", async () => {
    const p = createMockProvider({ extract_job: { title: "Frontend Developer" } });
    const r = await p.generateStructured({ ...req, schema: z.object({ title: z.string() }) });
    expect(r.data.title).toBe("Frontend Developer");
  });

  it("rejects output that fails the schema", async () => {
    const p = createMockProvider({ extract_job: { title: 42 } });
    await expect(p.generateStructured({ ...req, schema: z.object({ title: z.string() }) })).rejects.toThrow();
  });
});

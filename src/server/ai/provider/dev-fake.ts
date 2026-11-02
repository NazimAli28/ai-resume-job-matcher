import { SKILLS } from "../../match/taxonomy-data";
import { textShows } from "../../match/taxonomy";
import type { ExtractJobOutput } from "../tasks/extract-job";
import type { AiProvider, StructuredRequest } from "./types";

/**
 * `npm run dev` with no API key: a crude stand-in that reads job posts with a word list, so the screens can
 * be tried for free. Never used in production (see run.ts). It says nothing about how good the real AI is.
 */
function fakeExtract(input: string): ExtractJobOutput {
  const lines = input.replace(/<\/?untrusted_job>/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const requirements: ExtractJobOutput["requirements"] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const nice = /\b(plus|preferred|nice to have|bonus|advantage)\b/i.test(line);
    const years = /(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i.exec(line);
    if (years?.[1] && !seen.has("years")) {
      seen.add("years");
      requirements.push({ text: `${years[1]}+ years of experience`, quote: years[0], kind: "YEARS", priority: "MUST_HAVE", hard: /minimum|required|must|at least/i.test(line), skillTerm: null, years: Number(years[1]), degreeLevel: null });
    }
    if (/\b(bachelor'?s?|bs|bsc)\b/i.test(line) && !seen.has("degree")) {
      seen.add("degree");
      requirements.push({ text: "Bachelor's degree", quote: line.slice(0, 300), kind: "EDUCATION", priority: "MUST_HAVE", hard: false, skillTerm: null, years: null, degreeLevel: "BACHELOR" });
    }
    if (/team player|communication/i.test(line) && !seen.has("soft")) {
      seen.add("soft");
      requirements.push({ text: "Communication and teamwork", quote: line.slice(0, 300), kind: "SOFT", priority: "MUST_HAVE", hard: false, skillTerm: null, years: null, degreeLevel: null });
    }
    for (const s of SKILLS) {
      if (requirements.length >= 20 || seen.has(s.id) || !textShows(line, s.label)) continue;
      seen.add(s.id);
      requirements.push({ text: s.label, quote: line.slice(0, 300), kind: "TOOL", priority: nice ? "NICE_TO_HAVE" : "MUST_HAVE", hard: false, skillTerm: s.label, years: null, degreeLevel: null });
    }
  }
  return {
    isJobPost: requirements.length > 0,
    title: (lines[0] ?? "Untitled job").slice(0, 80),
    company: null,
    location: null,
    workMode: "UNKNOWN",
    seniorityHint: null,
    requirements,
    responsibilities: [],
    suspiciousInstructions: false,
  };
}

export const devFakeProvider: AiProvider = {
  id: "mock",
  async generateStructured<T>(req: StructuredRequest<T>) {
    if (req.task !== "extract_job") throw new Error(`The local stand-in can't do ${req.task}. Add an API key.`);
    return { data: req.schema.parse(fakeExtract(req.input)), usage: { inTok: 0, outTok: 0, cachedTok: 0 }, costUsd: 0, latencyMs: 0, model: "dev-fake" };
  },
};

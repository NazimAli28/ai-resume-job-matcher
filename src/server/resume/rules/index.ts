import type { Analysis, Extraction, ResumeDoc } from "../types";
import { piiFindings } from "./pii";
import { computeParseHealth, parseHealthFindings } from "./parse-health";
import { readability } from "./readability";
import { SEVERITY_ORDER, type AnalyzeOpts } from "./shared";

export const ENGINE_VERSION = "rules@1.0.0";
export type { AnalyzeOpts } from "./shared";

export function analyze(extraction: Extraction, doc: ResumeDoc, opts: AnalyzeOpts): Analysis {
  const parse = parseHealthFindings(extraction, doc, opts);
  const read = readability(extraction, doc, opts);
  const pii = piiFindings(extraction, opts);
  // Array.prototype.sort is stable, so rule order is kept within a severity.
  const findings = [...parse, ...pii, ...read.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return {
    engineVersion: ENGINE_VERSION,
    parseHealth: computeParseHealth(findings),
    readability: read.score,
    readabilityParts: read.parts,
    findings,
  };
}

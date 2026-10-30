import type { Finding, Severity } from "../types";

export interface AnalyzeOpts {
  targetMarket: "PK_LOCAL" | "INTERNATIONAL";
  fileBytes: number;
  /** Only used to close open-ended ("Present") date ranges; defaults to the current date. */
  now?: Date;
}

export const SEVERITY_ORDER: Record<Severity, number> = { ERR: 0, WARN: 1, TIP: 2 };

type Category = Finding["category"];

export function finding(
  category: Category,
  ruleId: string,
  severity: Severity,
  title: string,
  message: string,
  evidence?: string[],
): Finding {
  return { ruleId, severity, category, title, message, ...(evidence && evidence.length ? { evidence } : {}) };
}

/** Short, single-line quote of resume text for evidence (never used for PII rules). */
export function quote(text: string, max = 90): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

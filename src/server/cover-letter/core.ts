import { blankNumbers, checkTopicSentence } from "../ai/guard/facts";

/**
 * Company claims a letter may only make when the job post or the user's notes say so (CVL-003):
 * funding, awards, mission and values, news, reputation.
 */
const COMPANY_CLAIM_RE = /\b(?:funding|funded|raised|series [a-e]|investors?|award|awarded|mission|values|vision|culture|recent(?:ly)?|news|launch(?:ed|es)?|leader|leading|reputation|renowned|well[- ]known|known for|admire|innovative|innovation|growth|growing|fast[- ]growing|industry[- ]leading|market leader|customers love)\b/gi;

const sentences = (p: string) => p.split(/(?<=[.!?])\s+(?=[A-Z0-9"'“(])/).map((s) => s.trim()).filter(Boolean);

export interface LetterCheck {
  paragraphs: string[];
  dropped: number;
}

/**
 * Check every sentence: candidate claims against the candidate's evidence, company claims against the post
 * and the user's notes. Unsupported sentences are removed; an invented figure becomes [X] for the user.
 */
export function checkLetter(paragraphs: { text: string; citeIds: string[] }[], ctx: { evidence: { id: string; text: string }[]; post: string; notes: string | null; jobTitle: string; company: string | null }): LetterCheck {
  const candidate = ctx.evidence.map((e) => e.text);
  const companyContext = [ctx.post, ctx.notes ?? "", ctx.jobTitle, ctx.company ?? ""];
  const contextLower = companyContext.join(" ").toLowerCase();
  let dropped = 0;
  const out: string[] = [];
  for (const p of paragraphs.slice(0, 6)) {
    const kept: string[] = [];
    for (const s of sentences(p.text.replace(/\s+/g, " ").trim())) {
      const claims = [...new Set((s.match(COMPANY_CLAIM_RE) ?? []).map((w) => w.toLowerCase()))];
      if (claims.some((c) => !contextLower.includes(c))) {
        dropped++;
        continue;
      }
      // The job's skills may be mentioned honestly ("I haven't used Docker yet"), never claimed.
      const verdict = checkTopicSentence({ text: s, evidence: candidate, context: companyContext, topic: [ctx.post] });
      if (verdict.action === "BLOCK" || (verdict.action === "ASK" && verdict.reason !== "NEW_NUMBER")) {
        dropped++;
        continue;
      }
      kept.push(verdict.action === "ASK" ? blankNumbers(s, verdict.numbers) : s);
    }
    if (kept.length) out.push(kept.join(" "));
  }
  return { paragraphs: out, dropped };
}

export const letterText = (paragraphs: string[]) => paragraphs.join("\n\n");
export const letterParagraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);

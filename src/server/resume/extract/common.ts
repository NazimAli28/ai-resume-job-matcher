import type { Extraction } from "../types";

const MAX_ATS_TEXT = 30_000;

/** Replacement chars, private-use glyphs and letter-spaced runs ("E x p e r i e n c e"). */
export function garbledCount(text: string): number {
  const bad = (text.match(/[�-]/g) ?? []).length;
  const spaced = (text.match(/(?:\b\w\s){5,}\w\b/g) ?? []).length;
  return bad + spaced;
}

/** Fill atsText from the lines (header band first, as most parsers read it). */
export function summarize(e: Omit<Extraction, "atsText">): Extraction {
  const atsText = e.lines
    .map((l) => l.text)
    .join("\n")
    .slice(0, MAX_ATS_TEXT);
  return { ...e, atsText };
}

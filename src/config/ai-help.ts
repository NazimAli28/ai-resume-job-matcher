/** The AI-improvement question (founder decision 2026-11-18). Same words at signup and in Settings. */
export const AI_HELP = {
  title: "Help improve our AI?",
  body: "We keep de-identified examples (no name, email, phone or CNIC) to test and improve the AI. You can switch this off anytime in Settings and your examples are deleted.",
  yes: "Yes, help improve it",
  no: "No thanks",
} as const;

/** Only an explicit choice counts. Anything else (missing, tampered) means "ask again". */
export function parseAiAnswer(value: unknown): boolean | null {
  return value === "yes" ? true : value === "no" ? false : null;
}

/**
 * Answers count only from this policy version on. The earlier Settings switch had different wording and
 * collected nothing, so people who used it are asked once more and an old Yes doesn't start collection.
 */
export const AI_HELP_SINCE = "privacy@2026-11-18";
export const isCurrentAnswer = (docVersion: string) => docVersion.startsWith("privacy@") && docVersion >= AI_HELP_SINCE;

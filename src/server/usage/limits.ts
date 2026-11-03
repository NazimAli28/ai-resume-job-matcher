/** Plan limits per month (PRD §5b). Beta free accounts get double. */

export const USAGE_KINDS = ["ANALYSIS", "TAILORED_VERSION", "COVER_LETTER", "MOCK_INTERVIEW"] as const;
export type UsageKindName = (typeof USAGE_KINDS)[number];

export const USAGE_LABELS: Record<UsageKindName, string> = {
  ANALYSIS: "Resume checks",
  TAILORED_VERSION: "Tailored resumes",
  COVER_LETTER: "Cover letters",
  MOCK_INTERVIEW: "Mock interviews",
};

const PLAN_LIMITS = {
  FREE: { ANALYSIS: 3, TAILORED_VERSION: 3, COVER_LETTER: 3, MOCK_INTERVIEW: 2 },
  PRO: { ANALYSIS: 40, TAILORED_VERSION: 30, COVER_LETTER: 30, MOCK_INTERVIEW: 15 },
  SPRINT: { ANALYSIS: 40, TAILORED_VERSION: 30, COVER_LETTER: 30, MOCK_INTERVIEW: 15 },
} as const;

export function limitFor(user: { plan: keyof typeof PLAN_LIMITS; isBetaUser: boolean }, kind: UsageKindName) {
  const base = PLAN_LIMITS[user.plan][kind];
  return user.plan === "FREE" && user.isBetaUser ? base * 2 : base;
}

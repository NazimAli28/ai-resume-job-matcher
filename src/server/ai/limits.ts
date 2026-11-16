import { z } from "zod";

/**
 * AI spend limits in USD (PRD §5b). Admins change them in /admin; these are the beta defaults.
 * The Anthropic console spend limit ($8 a month) sits behind them, so the app stops first and politely.
 */
export const DEFAULT_LIMITS = { globalDaily: 1, globalMonthly: 7.5, userDaily: 0.2, userWeekly: 0.5, userMonthly: 1 } as const;

export type SpendLimits = { [K in keyof typeof DEFAULT_LIMITS]: number };
export type Period = "day" | "week" | "month";

const usd = z.coerce.number().finite().min(0, "Limits can't be negative.").max(1000, "That's higher than this app allows.");
export const limitsSchema = z
  .object({ globalDaily: usd, globalMonthly: usd, userDaily: usd, userWeekly: usd, userMonthly: usd })
  .refine((l) => l.userDaily <= l.userWeekly && l.userWeekly <= l.userMonthly, { message: "A person's daily limit can't be above their weekly one, nor weekly above monthly." })
  .refine((l) => l.globalDaily <= l.globalMonthly, { message: "The daily limit for everyone can't be above the monthly one." });

/** A stored value that is missing or broken falls back to the defaults, never to "no limit". */
export function parseLimits(stored: unknown): SpendLimits {
  const r = limitsSchema.safeParse(stored);
  return r.success ? r.data : { ...DEFAULT_LIMITS };
}

/** Windows are in UTC: a day starts 5 am in Pakistan, a week on Monday, a month on the 1st. */
export function windowStarts(now = new Date()) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const week = new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * 86_400_000);
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { day, week, month };
}

export type Spent = { globalDay: number; globalMonth: number; userDay: number; userWeek: number; userMonth: number };

/** Which limit, if any, blocks the next AI call. Everyone's limits are checked before the person's. */
export function blockedBy(s: Spent, l: SpendLimits): { scope: "GLOBAL" | "USER"; period: Period } | null {
  if (s.globalDay >= l.globalDaily) return { scope: "GLOBAL", period: "day" };
  if (s.globalMonth >= l.globalMonthly) return { scope: "GLOBAL", period: "month" };
  if (s.userDay >= l.userDaily) return { scope: "USER", period: "day" };
  if (s.userWeek >= l.userWeekly) return { scope: "USER", period: "week" };
  if (s.userMonth >= l.userMonthly) return { scope: "USER", period: "month" };
  return null;
}

const RESETS: Record<Period, string> = { day: "tomorrow", week: "on Monday", month: "on the 1st" };
export const resetsText = (p: Period) => RESETS[p];

/** The message a person sees when a limit stops them. Nothing is lost; it says when to come back. */
export function limitMessage(scope: "GLOBAL" | "USER", period: Period = "day") {
  const when = { day: "today's", week: "this week's", month: "this month's" }[period];
  return scope === "USER"
    ? `You've used ${when} AI allowance. It resets ${RESETS[period]}. Your work so far is saved.`
    : `AI features have reached ${when} limit for everyone during the beta. Please try again ${RESETS[period]}.`;
}

/** For an AiUnavailableError: the limit message when a limit stopped it, otherwise `fallback`. */
export function budgetMessage(e: { reason: string; period?: Period }, fallback: string) {
  if (e.reason === "USER_BUDGET") return limitMessage("USER", e.period);
  if (e.reason === "GLOBAL_BUDGET") return limitMessage("GLOBAL", e.period);
  return fallback;
}

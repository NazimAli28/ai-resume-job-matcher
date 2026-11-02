import { z } from "zod";
import { text } from "../profile/schemas";
import { JOB_SOURCES } from "../match/schemas";
import { CONTACT_ROLES, ROUND_OUTCOMES, ROUND_TYPES, STATUSES } from "./constants";

const keys = <T extends readonly (readonly [string, string])[]>(list: T) => list.map(([k]) => k) as [T[number][0], ...T[number][0][]];

const optional = (max: number) => text(max).transform((s) => s || null);

/** "2026-11-03" → that day at UTC midnight; empty → null. */
const day = z
  .string()
  .refine((s) => s === "" || (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && s >= "2000-01-01" && s <= "2100-12-31"), "Enter a valid date.")
  .transform((s) => (s ? new Date(`${s}T00:00:00.000Z`) : null));

const link = z
  .string()
  .trim()
  .max(500)
  .refine((s) => s === "" || /^https?:\/\/\S+$/i.test(s), "Enter a full link starting with https://.")
  .transform((s) => s || null);

const uuidOrNull = z
  .string()
  .refine((s) => s === "" || z.uuid().safeParse(s).success, "That choice isn't valid.")
  .transform((s) => s || null);

const details = {
  company: text(120, 1),
  title: text(120, 1),
  location: optional(120),
  url: link,
  source: z.enum(keys(JOB_SOURCES)),
  sourceDetail: optional(100),
  deadline: day,
  salaryExpected: z
    .string()
    .trim()
    .refine((s) => s === "" || (/^\d{1,10}$/.test(s) && Number(s) <= 2_000_000_000), "Enter the amount as a number.")
    .transform((s) => (s ? Number(s) : null)),
  priority: z.coerce.number().int().min(1).max(3),
};

export const detailsSchema = z.object(details);

export const newApplicationSchema = z.object({
  ...details,
  jobId: uuidOrNull,
  resumeVersionId: uuidOrNull,
  status: z.enum(["SAVED", "APPLIED"]),
  appliedAt: day,
  notes: optional(5000),
  allowDuplicate: z.boolean().default(false),
});

export const moveSchema = z.object({ toStatus: z.enum(STATUSES), note: optional(500).default(null) });
export const notesSchema = z.object({ notes: optional(5000) });
export const reminderSchema = z.object({ nextActionAt: day, nextActionNote: optional(200) });

export const roundSchema = z.object({
  type: z.enum(keys(ROUND_TYPES)),
  // The browser sends an ISO instant, so the server never has to guess the user's time zone.
  scheduledAt: z
    .string()
    .refine((s) => s === "" || !Number.isNaN(Date.parse(s)), "Enter a valid date and time.")
    .transform((s) => (s ? new Date(s) : null)),
  notes: optional(1000),
});
export const outcomeSchema = z.enum(keys(ROUND_OUTCOMES));

export const contactSchema = z.object({
  name: text(120, 1),
  role: z.enum(keys(CONTACT_ROLES)),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((s) => s === "" || z.email().safeParse(s).success, "Enter a valid email.")
    .transform((s) => s || null),
  phone: optional(40),
  linkedinUrl: link,
  notes: optional(500),
});

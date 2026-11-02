import { z } from "zod";
import { factSchema } from "../profile/schemas";

export const JD_MIN = 200;
export const JD_MAX = 20_000;

export const JOB_SOURCES = [
  ["LINKEDIN", "LinkedIn"],
  ["ROZEE_PK", "Rozee.pk"],
  ["INDEED", "Indeed"],
  ["MUSTAKBIL", "Mustakbil"],
  ["COMPANY_SITE", "Company website"],
  ["REFERRAL", "Referral"],
  ["GOVT_PORTAL", "Government portal"],
  ["JOB_FAIR", "Job fair"],
  ["RECRUITER", "Recruiter"],
  ["SOCIAL_MEDIA", "Social media"],
  ["OTHER", "Other"],
] as const;

const SOURCE_KEYS = JOB_SOURCES.map(([k]) => k) as [(typeof JOB_SOURCES)[number][0], ...(typeof JOB_SOURCES)[number][0][]];

const optional = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim() || null);

export const newJobSchema = z.object({
  resumeVersionId: z.string().uuid("Choose a resume to compare."),
  rawText: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(JD_MIN, `Paste the full job description (at least ${JD_MIN} characters).`)
        .max(JD_MAX, `Keep it under ${JD_MAX.toLocaleString("en-US")} characters.`),
    ),
  // Stored as a link only, never fetched. http(s) only, so it can't become a script link.
  url: z
    .string()
    .trim()
    .max(500)
    .refine((s) => s === "" || /^https?:\/\/\S+$/i.test(s), "Enter a full link starting with https://.")
    .transform((s) => s || null),
  source: z.enum(SOURCE_KEYS),
  sourceDetail: optional(100),
  title: optional(120),
  company: optional(120),
  allowDuplicate: z.boolean().default(false),
});

export const requirementSchema = z.object({
  text: z
    .string()
    .trim()
    .min(2, "Enter the requirement.")
    .max(200, "Keep it under 200 characters."),
  priority: z.enum(["MUST_HAVE", "NICE_TO_HAVE"]),
});

/** Same rules as the evidence bank: real length, no CNIC. */
export const evidenceSchema = factSchema.pick({ statement: true });

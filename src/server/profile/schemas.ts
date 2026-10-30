import { z } from "zod";

// CNIC (13 digits, usually 5-7-1). Never stored anywhere (PRD rule 4).
const CNIC = /\b\d{5}[-\s]?\d{7}[-\s]?\d\b/;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trimmed text without control characters; rejects anything containing a CNIC number. */
export const text = (max: number, min = 0) =>
  z
    .string()
    .transform((s) => s.replace(CONTROL, "").trim())
    .pipe(
      z
        .string()
        .min(min, min > 1 ? `Use at least ${min} characters.` : "This field is required.")
        .max(max, `Keep it under ${max} characters.`)
        .refine((s) => !CNIC.test(s), "Remove the CNIC number. It should never be on a resume or in your profile."),
    );

const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((s) => (s ?? "").replace(CONTROL, "").trim())
    .pipe(z.string().max(max, `Keep it under ${max} characters.`).refine((s) => !CNIC.test(s), "Remove the CNIC number."))
    .transform((s) => s || null);

const optionalUrl = z
  .string()
  .optional()
  .transform((s) => (s ?? "").trim())
  .pipe(z.union([z.literal(""), z.string().url("Enter a full link starting with https://").max(300).refine((u) => u.startsWith("https://"), "Use an https:// link.")]))
  .transform((s) => s || null);

/** "2024-03" (month input) → first day of that month. */
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a month.")
  .transform((s) => new Date(`${s}-01T00:00:00Z`));
const optionalMonth = z
  .string()
  .optional()
  .transform((s) => (s ?? "").trim())
  .pipe(z.union([z.literal(""), month]))
  .transform((v) => (v === "" ? null : v));

/** Textarea with one item per line → clean list. */
const lines = (maxItems: number, maxLen: number) =>
  z
    .string()
    .optional()
    .transform((s) =>
      (s ?? "")
        .split(/\r?\n/)
        .map((l) => l.replace(/^\s*[-•*]\s*/, "").replace(CONTROL, "").trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.string().max(maxLen, `Keep each line under ${maxLen} characters.`).refine((s) => !CNIC.test(s), "Remove the CNIC number."))
        .max(maxItems, `Use at most ${maxItems} lines.`),
    );

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim())
    .pipe(z.union([z.literal(""), z.string().regex(/^\d+$/, "Enter a whole number.").transform(Number).pipe(z.number().int().min(min).max(max))]))
    .transform((v) => (v === "" ? null : v));

export const marketSchema = z.enum(["PK_LOCAL", "INTERNATIONAL"]);

export const basicsSchema = z.object({
  headline: optionalText(120),
  city: optionalText(80),
  phone: optionalText(30),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  yearsExperience: optionalInt(0, 60),
  targetMarket: marketSchema,
});

export const onboardingSchema = z.object({
  targetMarket: marketSchema,
  targetTitles: lines(5, 80),
  city: optionalText(80),
  headline: optionalText(120),
});

export const skillSchema = z.object({
  name: text(60, 1),
  level: optionalInt(1, 5),
  years: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim())
    .pipe(z.union([z.literal(""), z.string().regex(/^\d+(\.\d+)?$/, "Enter a number of years.").transform(Number).pipe(z.number().min(0).max(50))]))
    .transform((v) => (v === "" ? null : v)),
});

export const experienceSchema = z
  .object({
    title: text(120, 1),
    employer: text(120, 1),
    location: optionalText(80),
    startDate: month,
    endDate: optionalMonth,
    bullets: lines(12, 300),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { message: "The end date is before the start date.", path: ["endDate"] });

export const educationSchema = z.object({
  institution: text(160, 1),
  degree: optionalText(120),
  field: optionalText(120),
  startDate: optionalMonth,
  endDate: optionalMonth,
  grade: optionalText(40),
});

export const projectSchema = z.object({
  name: text(120, 1),
  url: optionalUrl,
  description: optionalText(500),
  bullets: lines(8, 300),
  skills: lines(15, 60),
});

export const certificationSchema = z.object({
  name: text(160, 1),
  issuer: optionalText(120),
  issuedAt: optionalMonth,
  expiresAt: optionalMonth,
  credentialUrl: optionalUrl,
});

export const factSchema = z.object({
  statement: text(300, 10),
  metric: optionalText(80),
  skillName: optionalText(60),
  experienceId: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim() || null)
    .pipe(z.string().uuid().nullable()),
});

export const idSchema = z.string().uuid();

/** Per-user caps so one account can't fill the database. */
export const LIMITS = { skills: 100, experiences: 30, educations: 15, projects: 30, certifications: 30, facts: 200 } as const;

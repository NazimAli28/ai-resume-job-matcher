import "server-only";
import type { z } from "zod";
import { db } from "../db";
import type {
  basicsSchema,
  certificationSchema,
  educationSchema,
  experienceSchema,
  factSchema,
  onboardingSchema,
  projectSchema,
  skillSchema,
} from "./schemas";
import { LIMITS } from "./schemas";

/**
 * Profile data access. Every query is scoped by userId (04 §4.1): child rows carry userId and
 * updates/deletes use `where: { id, userId }`, so a guessed id from another account matches nothing.
 */

export class LimitError extends Error {
  constructor(public what: string) {
    super(`limit:${what}`);
  }
}
export class NotFoundError extends Error {}

export async function ensureProfile(userId: string) {
  return db.profile.upsert({ where: { userId }, create: { userId }, update: {} });
}

export async function getFullProfile(userId: string) {
  return db.profile.findUnique({
    where: { userId },
    include: {
      skills: { orderBy: [{ level: "desc" }, { name: "asc" }] },
      experiences: { orderBy: [{ startDate: "desc" }] },
      educations: { orderBy: [{ startDate: "desc" }] },
      projects: { orderBy: { name: "asc" } },
      certifications: { orderBy: [{ issuedAt: "desc" }] },
      facts: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function completeOnboarding(userId: string, data: z.output<typeof onboardingSchema>) {
  return db.profile.upsert({
    where: { userId },
    create: { userId, ...data, onboardedAt: new Date() },
    update: { ...data, onboardedAt: new Date() },
  });
}

export async function updateBasics(userId: string, data: z.output<typeof basicsSchema>) {
  await ensureProfile(userId);
  return db.profile.update({ where: { userId }, data });
}

export async function setTargetTitles(userId: string, titles: string[]) {
  await ensureProfile(userId);
  return db.profile.update({ where: { userId }, data: { targetTitles: titles } });
}

async function checkLimit(count: Promise<number>, max: number, what: string) {
  if ((await count) >= max) throw new LimitError(what);
}

/** Update or delete scoped to the owner; throws NotFoundError when nothing matched. */
function owned(res: { count: number }) {
  if (res.count === 0) throw new NotFoundError();
}

// ── Skills ──
export async function upsertSkill(userId: string, data: z.output<typeof skillSchema>) {
  const p = await ensureProfile(userId);
  const existing = await db.skill.findFirst({ where: { userId, profileId: p.id, name: { equals: data.name, mode: "insensitive" } } });
  if (existing) return db.skill.update({ where: { id: existing.id }, data: { level: data.level, years: data.years } });
  await checkLimit(db.skill.count({ where: { userId } }), LIMITS.skills, "skills");
  return db.skill.create({ data: { ...data, userId, profileId: p.id } });
}
export async function deleteSkill(userId: string, id: string) {
  owned(await db.skill.deleteMany({ where: { id, userId } }));
}

// ── Experience ──
export async function createExperience(userId: string, data: z.output<typeof experienceSchema>) {
  const p = await ensureProfile(userId);
  await checkLimit(db.experience.count({ where: { userId } }), LIMITS.experiences, "experiences");
  return db.experience.create({ data: { ...data, userId, profileId: p.id } });
}
export async function updateExperience(userId: string, id: string, data: z.output<typeof experienceSchema>) {
  owned(await db.experience.updateMany({ where: { id, userId }, data }));
}
export async function deleteExperience(userId: string, id: string) {
  owned(await db.experience.deleteMany({ where: { id, userId } }));
}

// ── Education ──
export async function createEducation(userId: string, data: z.output<typeof educationSchema>) {
  const p = await ensureProfile(userId);
  await checkLimit(db.education.count({ where: { userId } }), LIMITS.educations, "educations");
  return db.education.create({ data: { ...data, userId, profileId: p.id } });
}
export async function updateEducation(userId: string, id: string, data: z.output<typeof educationSchema>) {
  owned(await db.education.updateMany({ where: { id, userId }, data }));
}
export async function deleteEducation(userId: string, id: string) {
  owned(await db.education.deleteMany({ where: { id, userId } }));
}

// ── Projects ──
export async function createProject(userId: string, data: z.output<typeof projectSchema>) {
  const p = await ensureProfile(userId);
  await checkLimit(db.project.count({ where: { userId } }), LIMITS.projects, "projects");
  return db.project.create({ data: { ...data, userId, profileId: p.id } });
}
export async function updateProject(userId: string, id: string, data: z.output<typeof projectSchema>) {
  owned(await db.project.updateMany({ where: { id, userId }, data }));
}
export async function deleteProject(userId: string, id: string) {
  owned(await db.project.deleteMany({ where: { id, userId } }));
}

// ── Certifications ──
export async function createCertification(userId: string, data: z.output<typeof certificationSchema>) {
  const p = await ensureProfile(userId);
  await checkLimit(db.certification.count({ where: { userId } }), LIMITS.certifications, "certifications");
  return db.certification.create({ data: { ...data, userId, profileId: p.id } });
}
export async function updateCertification(userId: string, id: string, data: z.output<typeof certificationSchema>) {
  owned(await db.certification.updateMany({ where: { id, userId }, data }));
}
export async function deleteCertification(userId: string, id: string) {
  owned(await db.certification.deleteMany({ where: { id, userId } }));
}

// ── Evidence bank ──
async function assertOwnExperience(userId: string, experienceId: string | null) {
  if (!experienceId) return;
  const ok = await db.experience.count({ where: { id: experienceId, userId } });
  if (!ok) throw new NotFoundError();
}
export async function createFact(userId: string, data: z.output<typeof factSchema>, source: "USER" | "MATCH_QUESTION" = "USER") {
  const p = await ensureProfile(userId);
  await assertOwnExperience(userId, data.experienceId);
  await checkLimit(db.factBankItem.count({ where: { userId } }), LIMITS.facts, "facts");
  return db.factBankItem.create({ data: { ...data, source, userId, profileId: p.id, confirmedAt: new Date() } });
}
export async function updateFact(userId: string, id: string, data: z.output<typeof factSchema>) {
  await assertOwnExperience(userId, data.experienceId);
  owned(await db.factBankItem.updateMany({ where: { id, userId }, data: { ...data, confirmedAt: new Date() } }));
}
export async function deleteFact(userId: string, id: string) {
  owned(await db.factBankItem.deleteMany({ where: { id, userId } }));
}

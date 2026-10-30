"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireUser } from "@/server/auth/user";
import { captureError } from "@/server/observability/errors";
import * as profile from "@/server/profile/service";
import {
  basicsSchema,
  certificationSchema,
  educationSchema,
  experienceSchema,
  factSchema,
  idSchema,
  onboardingSchema,
  projectSchema,
  skillSchema,
} from "@/server/profile/schemas";
import { rateLimit } from "@/server/ratelimit";

export type ActionState = { ok?: string; error?: string; fieldErrors?: Record<string, string> } | undefined;

const LIMIT_LABEL: Record<string, string> = {
  skills: "100 skills",
  experiences: "30 roles",
  educations: "15 education entries",
  projects: "30 projects",
  certifications: "30 certifications",
  facts: "200 evidence items",
};

const fields = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0] ?? "form"), i.message]));

/**
 * Shared pipeline for profile writes: signed-in user → per-user write limit → Zod parse →
 * scoped service call → revalidate. Errors become messages, never stack traces.
 */
async function run<S extends z.ZodTypeAny>(
  schema: S,
  form: FormData,
  fn: (userId: string, data: z.output<S>, id?: string) => Promise<unknown>,
  okMessage: string,
): Promise<ActionState> {
  const user = await requireUser();
  if (!(await rateLimit(`profile:write:${user.id}`, 60, 60)).ok) return { error: "You're saving very quickly. Wait a moment and try again." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fields(parsed.error) };
  const rawId = form.get("id");
  const id = rawId ? idSchema.safeParse(rawId) : undefined;
  if (id && !id.success) return { error: "That item no longer exists. Refresh the page." };
  try {
    await fn(user.id, parsed.data, id?.data);
  } catch (err) {
    if (err instanceof profile.LimitError) return { error: `You've reached the limit of ${LIMIT_LABEL[err.what] ?? "items"}. Remove one to add another.` };
    if (err instanceof profile.NotFoundError) return { error: "That item no longer exists. Refresh the page." };
    await captureError(err, { source: "ACTION", route: "app/profile", userId: user.id });
    return { error: "Something went wrong on our side. Your change wasn't saved." };
  }
  revalidatePath("/app/profile");
  return { ok: okMessage };
}

async function remove(form: FormData, fn: (userId: string, id: string) => Promise<void>): Promise<ActionState> {
  const user = await requireUser();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "That item no longer exists." };
  try {
    await fn(user.id, id.data);
  } catch (err) {
    if (err instanceof profile.NotFoundError) return { error: "That item no longer exists." };
    await captureError(err, { source: "ACTION", route: "app/profile:delete", userId: user.id });
    return { error: "Something went wrong on our side." };
  }
  revalidatePath("/app/profile");
  return { ok: "Removed." };
}

// ── Onboarding ──
export async function saveOnboarding(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(onboardingSchema, form, (uid, d) => profile.completeOnboarding(uid, d), "Saved.");
  if (res?.ok) redirect("/app/profile?welcome=1");
  return res;
}

// ── Basics ──
export async function saveBasics(_: ActionState, form: FormData) {
  return run(basicsSchema, form, (uid, d) => profile.updateBasics(uid, d), "Profile details saved.");
}

// ── Skills ──
export async function saveSkill(_: ActionState, form: FormData) {
  return run(skillSchema, form, (uid, d) => profile.upsertSkill(uid, d), "Skill saved.");
}
export async function deleteSkill(_: ActionState, form: FormData) {
  return remove(form, profile.deleteSkill);
}

// ── Experience ──
export async function saveExperience(_: ActionState, form: FormData) {
  return run(experienceSchema, form, (uid, d, id) => (id ? profile.updateExperience(uid, id, d) : profile.createExperience(uid, d)), "Role saved.");
}
export async function deleteExperience(_: ActionState, form: FormData) {
  return remove(form, profile.deleteExperience);
}

// ── Education ──
export async function saveEducation(_: ActionState, form: FormData) {
  return run(educationSchema, form, (uid, d, id) => (id ? profile.updateEducation(uid, id, d) : profile.createEducation(uid, d)), "Education saved.");
}
export async function deleteEducation(_: ActionState, form: FormData) {
  return remove(form, profile.deleteEducation);
}

// ── Projects ──
export async function saveProject(_: ActionState, form: FormData) {
  return run(projectSchema, form, (uid, d, id) => (id ? profile.updateProject(uid, id, d) : profile.createProject(uid, d)), "Project saved.");
}
export async function deleteProject(_: ActionState, form: FormData) {
  return remove(form, profile.deleteProject);
}

// ── Certifications ──
export async function saveCertification(_: ActionState, form: FormData) {
  return run(
    certificationSchema,
    form,
    (uid, d, id) => (id ? profile.updateCertification(uid, id, d) : profile.createCertification(uid, d)),
    "Certification saved.",
  );
}
export async function deleteCertification(_: ActionState, form: FormData) {
  return remove(form, profile.deleteCertification);
}

// ── Evidence bank ──
export async function saveFact(_: ActionState, form: FormData) {
  return run(factSchema, form, (uid, d, id) => (id ? profile.updateFact(uid, id, d) : profile.createFact(uid, d)), "Evidence saved.");
}
export async function deleteFact(_: ActionState, form: FormData) {
  return remove(form, profile.deleteFact);
}

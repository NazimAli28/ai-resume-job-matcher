import type { getFullProfile } from "@/server/profile/service";
import { monthLabel, monthValue, periodLabel } from "./format";

type Full = NonNullable<Awaited<ReturnType<typeof getFullProfile>>>;

/** Plain, serializable shapes handed to the client sections (dates become strings). */
export type SkillDto = { id: string; name: string; level: number | null; years: number | null };
export type ExperienceDto = {
  id: string;
  title: string;
  employer: string;
  location: string;
  period: string;
  startDate: string;
  endDate: string;
  bullets: string[];
};
export type EducationDto = {
  id: string;
  institution: string;
  degree: string;
  field: string;
  grade: string;
  period: string;
  startDate: string;
  endDate: string;
};
export type ProjectDto = { id: string; name: string; url: string; description: string; bullets: string[]; skills: string[] };
export type CertificationDto = {
  id: string;
  name: string;
  issuer: string;
  credentialUrl: string;
  issuedLabel: string;
  issuedAt: string;
  expiresAt: string;
  expiresLabel: string;
};
export type FactDto = {
  id: string;
  statement: string;
  metric: string;
  skillName: string;
  experienceId: string;
  experienceLabel: string;
  source: string;
  dateLabel: string;
};

export function toDtos(p: Full) {
  const roleLabel = new Map(p.experiences.map((e) => [e.id, `${e.title} at ${e.employer}`]));
  return {
    skills: p.skills.map((s): SkillDto => ({ id: s.id, name: s.name, level: s.level, years: s.years })),
    experiences: p.experiences.map(
      (e): ExperienceDto => ({
        id: e.id,
        title: e.title,
        employer: e.employer,
        location: e.location ?? "",
        period: periodLabel(e.startDate, e.endDate, true),
        startDate: monthValue(e.startDate),
        endDate: monthValue(e.endDate),
        bullets: e.bullets,
      }),
    ),
    educations: p.educations.map(
      (e): EducationDto => ({
        id: e.id,
        institution: e.institution,
        degree: e.degree ?? "",
        field: e.field ?? "",
        grade: e.grade ?? "",
        period: periodLabel(e.startDate, e.endDate),
        startDate: monthValue(e.startDate),
        endDate: monthValue(e.endDate),
      }),
    ),
    projects: p.projects.map(
      (x): ProjectDto => ({ id: x.id, name: x.name, url: x.url ?? "", description: x.description ?? "", bullets: x.bullets, skills: x.skills }),
    ),
    certifications: p.certifications.map(
      (c): CertificationDto => ({
        id: c.id,
        name: c.name,
        issuer: c.issuer ?? "",
        credentialUrl: c.credentialUrl ?? "",
        issuedAt: monthValue(c.issuedAt),
        issuedLabel: monthLabel(c.issuedAt),
        expiresAt: monthValue(c.expiresAt),
        expiresLabel: monthLabel(c.expiresAt),
      }),
    ),
    facts: p.facts.map(
      (f): FactDto => ({
        id: f.id,
        statement: f.statement,
        metric: f.metric ?? "",
        skillName: f.skillName ?? "",
        experienceId: f.experienceId ?? "",
        experienceLabel: f.experienceId ? (roleLabel.get(f.experienceId) ?? "") : "",
        source: f.source,
        dateLabel: monthLabel(f.createdAt),
      }),
    ),
    roles: p.experiences.map((e) => ({ value: e.id, label: `${e.title} at ${e.employer}` })),
  };
}

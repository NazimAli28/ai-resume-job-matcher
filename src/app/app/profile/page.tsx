import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormAlert } from "@/components/auth/auth-ui";
import { ButtonLink } from "@/components/ui/button";
import { BasicsForm } from "@/components/profile-real/basics-form";
import { CertificationsSection } from "@/components/profile-real/certifications-section";
import { toDtos } from "@/components/profile-real/dto";
import { EducationSection } from "@/components/profile-real/education-section";
import { EvidenceSection } from "@/components/profile-real/evidence-section";
import { ExperienceSection } from "@/components/profile-real/experience-section";
import { ProjectsSection } from "@/components/profile-real/projects-section";
import { SectionCard } from "@/components/profile-real/section-card";
import { SkillsSection } from "@/components/profile-real/skills-section";
import { requireUser } from "@/server/auth/user";
import { getFullProfile } from "@/server/profile/service";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: PageProps<"/app/profile">) {
  const user = await requireUser();
  const profile = await getFullProfile(user.id);
  if (!profile || !profile.onboardedAt) redirect("/app/onboarding");
  const sp = await searchParams;
  const d = toDtos(profile);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-bold leading-tight">Your profile</h1>
      {sp.welcome === "1" && <FormAlert tone="ok">Profile started. Add your roles and skills; everything here is what suggestions are allowed to use.</FormAlert>}

      <BasicsForm
        values={{
          headline: profile.headline ?? "",
          city: profile.city ?? "",
          phone: profile.phone ?? "",
          linkedinUrl: profile.linkedinUrl ?? "",
          githubUrl: profile.githubUrl ?? "",
          portfolioUrl: profile.portfolioUrl ?? "",
          yearsExperience: profile.yearsExperience == null ? "" : String(profile.yearsExperience),
          targetMarket: profile.targetMarket,
        }}
      />

      <SectionCard
        id="roles"
        title="Target roles"
        action={
          <ButtonLink href="/app/onboarding" aria-label="Change target roles">
            Change
          </ButtonLink>
        }
      >
        {profile.targetTitles.length === 0 ? (
          <p className="text-sm text-muted">No target roles yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.targetTitles.map((t) => (
              <li key={t} className="rounded-full bg-hl-soft px-3 py-1 text-sm font-semibold text-hl-ink">
                {t}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SkillsSection skills={d.skills} />
      <EvidenceSection items={d.facts} skillNames={d.skills.map((s) => s.name)} roles={d.roles} />
      <ExperienceSection items={d.experiences} />
      <EducationSection items={d.educations} />
      <ProjectsSection items={d.projects} />
      <CertificationsSection items={d.certifications} />
    </div>
  );
}

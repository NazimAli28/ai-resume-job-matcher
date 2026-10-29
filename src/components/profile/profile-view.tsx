"use client";

import { Check, Globe, MapPin } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { RingScore } from "@/components/ui/charts";
import { Item, Stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/panel";
import { InitialTile } from "@/components/applications/tile";
import { useDemo } from "@/demo/store";
import { cn } from "@/lib/cn";
import { EditableText } from "./editable-text";
import { ExperienceSection } from "./experience-section";
import { FactBank } from "./fact-bank";
import { CertificationsSection, EducationSection, ProjectsSection } from "./other-sections";
import { SkillsSection } from "./skills-section";

const MARKET = { PK_LOCAL: "Pakistan", INTERNATIONAL: "International" } as const;

export function ProfileView() {
  const { state, dispatch } = useDemo();
  const { profile, user } = state;

  // Completeness is computed from which sections have real content.
  const checks = [
    { label: "Headline", done: profile.headline.trim().length > 0 },
    { label: "Contact links", done: Boolean(profile.phone && (profile.linkedin || profile.github)) },
    { label: "Experience", done: profile.experiences.length > 0 },
    { label: "Education", done: profile.education.length > 0 },
    { label: "Projects", done: profile.projects.length > 0 },
    { label: "Confirmed skills", done: profile.skills.some((s) => s.confirmed) },
    { label: "Certifications", done: profile.certifications.length > 0 },
    { label: "Fact bank", done: profile.factBank.length > 0 },
  ];
  const pct = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);

  return (
    <div className="mx-auto flex max-w-4xl flex-col">
      <PageHeader
        title="Your profile"
        description="The facts behind every resume and cover letter. Edit anything here; the AI only works from what is on this page."
      />
      <Stagger className="flex flex-col gap-6">
        <Item>
          <section aria-label="Profile summary" className="card relative overflow-hidden p-5 sm:p-7">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-hl opacity-20 blur-3xl" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                <InitialTile name={user.name} size={88} round className="glow" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h2 className="font-display text-2xl font-bold">{user.name}</h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip className="bg-hl-soft text-hl-ink">
                      <Globe className="size-3.5" aria-hidden /> {MARKET[user.targetMarket]} market
                    </Chip>
                    {user.city && (
                      <Chip className="border border-rule text-muted">
                        <MapPin className="size-3.5" aria-hidden /> {user.city}
                      </Chip>
                    )}
                    {user.targetRoles.map((r) => (
                      <Chip key={r} className="bg-sunken text-ink">{r}</Chip>
                    ))}
                  </div>
                  <div>
                    <p className="pb-0.5 text-sm font-semibold text-muted">Headline</p>
                    <EditableText
                      label="headline"
                      value={profile.headline}
                      onSave={(headline) => dispatch({ type: "UPDATE_PROFILE", patch: { headline } })}
                      className="flex-1 text-lg"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 md:flex-col md:items-center">
                <RingScore value={pct} size={112} stroke={11} label="Profile completeness" sublabel="complete" />
                <ul className="flex flex-wrap gap-1.5 md:max-w-48 md:justify-center" aria-label="Profile checklist">
                  {checks.filter((c) => !c.done).map((c) => (
                    <li key={c.label}><Chip className="border border-dashed border-rule-strong text-muted">Add {c.label.toLowerCase()}</Chip></li>
                  ))}
                  {pct === 100 && (
                    <li>
                      <Chip className={cn("bg-hl text-on-hl")}>
                        <Check className="size-3.5" strokeWidth={3} aria-hidden /> All sections filled
                      </Chip>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>
        </Item>
        <Item><FactBank /></Item>
        <Item><SkillsSection /></Item>
        <Item><ExperienceSection /></Item>
        <div className="grid gap-6 md:grid-cols-2">
          <Item><EducationSection /></Item>
          <Item><CertificationsSection /></Item>
        </div>
        <Item><ProjectsSection /></Item>
      </Stagger>
    </div>
  );
}

"use client";

import { Award, FolderGit2, GraduationCap, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { useDemo } from "@/demo/store";
import { SectionCard } from "./section-card";

export function EducationSection() {
  const { state } = useDemo();
  return (
    <SectionCard id="edu-title" title="Education" icon={GraduationCap} count={state.profile.education.length} className="h-full">
      <ul className="flex flex-col gap-3">
        {state.profile.education.map((e) => (
          <li key={e.id} className="rounded-2xl bg-sunken p-4">
            <h3 className="font-bold">{e.degree}</h3>
            <p className="text-sm text-muted">
              {e.school}, {e.start} to {e.end}
              {e.grade ? `, ${e.grade}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function ProjectsSection() {
  const { state } = useDemo();
  return (
    <SectionCard id="proj-title" title="Projects" icon={FolderGit2} count={state.profile.projects.length}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {state.profile.projects.map((p) => (
          <li key={p.id} className="card card-hover flex flex-col gap-2 p-4">
            <h3 className="font-bold">{p.name}</h3>
            <p>{p.summary}</p>
            <ul className="flex flex-wrap gap-1.5" aria-label={`Technologies for ${p.name}`}>
              {p.tech.map((t) => (
                <li key={t}><Chip className="bg-sunken text-ink">{t}</Chip></li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function CertificationsSection() {
  const { state, dispatch } = useDemo();
  const [value, setValue] = useState("");
  const certs = state.profile.certifications;
  const save = (next: string[]) => dispatch({ type: "UPDATE_PROFILE", patch: { certifications: next } });
  return (
    <SectionCard id="cert-title" title="Certifications" icon={Award} count={certs.length} className="h-full">
      {certs.length === 0 && <p className="text-muted">None added.</p>}
      <ul className="flex flex-col gap-2">
        {certs.map((c) => (
          <li key={c} className="flex items-center gap-2 rounded-2xl bg-sunken pl-4">
            <span className="flex-1 py-2">{c}</span>
            <button type="button" aria-label={`Remove ${c}`} onClick={() => save(certs.filter((x) => x !== c))} className="grid size-11 place-items-center rounded-xl text-muted hover:text-danger">
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim();
          if (!v || certs.includes(v)) return;
          save([...certs, v]);
          setValue("");
        }}
      >
        <Input aria-label="Add a certification" placeholder="Add a certification" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button type="submit">Add</Button>
      </form>
    </SectionCard>
  );
}

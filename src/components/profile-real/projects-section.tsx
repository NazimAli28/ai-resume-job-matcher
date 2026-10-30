"use client";

import { deleteProject, saveProject } from "@/app/app/profile/actions";
import { CrudList } from "./crud-list";
import type { ProjectDto } from "./dto";
import { AreaField, TextField } from "./fields";
import { SectionCard } from "./section-card";

export function ProjectsSection({ items }: { items: ProjectDto[] }) {
  return (
    <SectionCard id="projects" title="Projects" intro="Side projects, open source, coursework worth showing.">
      <CrudList
        items={items.map((p) => ({
          id: p.id,
          label: `project ${p.name}`,
          values: p,
          view: (
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">{p.name}</h3>
              {p.description && <p className="text-sm text-muted">{p.description}</p>}
              {p.url && (
                <a href={p.url} target="_blank" rel="noreferrer noopener" className="break-all text-sm font-semibold text-hl-ink underline-offset-4 hover:underline">
                  {p.url}
                </a>
              )}
              {p.bullets.length > 0 && (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {p.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
              {p.skills.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Skills used">
                  {p.skills.map((s) => (
                    <li key={s} className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        }))}
        save={saveProject}
        del={deleteProject}
        addLabel="Add a project"
        empty="No projects yet."
        fields={(v, err) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="name" label="Project name" required maxLength={120} defaultValue={v?.name} error={err("name")} />
              <TextField name="url" label="Link" optional type="url" defaultValue={v?.url} error={err("url")} placeholder="https://github.com/you/project" />
            </div>
            <AreaField name="description" label="Short description" optional rows={3} maxLength={500} defaultValue={v?.description} error={err("description")} />
            <AreaField name="bullets" label="What you built" optional rows={4} defaultValue={v?.bullets.join("\n")} error={err("bullets")} hint="One point per line, up to 8." />
            <AreaField name="skills" label="Skills used" optional rows={3} defaultValue={v?.skills.join("\n")} error={err("skills")} hint="One skill per line, up to 15." />
          </>
        )}
      />
    </SectionCard>
  );
}

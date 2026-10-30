"use client";

import { useState } from "react";
import { deleteExperience, saveExperience } from "@/app/app/profile/actions";
import { CrudList } from "./crud-list";
import type { ExperienceDto } from "./dto";
import { AreaField, TextField, type Err } from "./fields";
import { SectionCard } from "./section-card";

function ExperienceFields({ v, err }: { v: ExperienceDto | null; err: Err }) {
  const [current, setCurrent] = useState(v ? v.endDate === "" : false);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="title" label="Job title" required maxLength={120} defaultValue={v?.title} error={err("title")} placeholder="Software Engineer" />
        <TextField name="employer" label="Employer" required maxLength={120} defaultValue={v?.employer} error={err("employer")} placeholder="Kinara Software" />
        <TextField name="location" label="Location" optional maxLength={80} defaultValue={v?.location} error={err("location")} placeholder="Lahore" />
        <TextField name="startDate" label="Start month" required type="month" defaultValue={v?.startDate} error={err("startDate")} hint="Format: 2024-03" />
        <TextField
          name="endDate"
          label="End month"
          optional
          type="month"
          defaultValue={v?.endDate}
          disabled={current}
          error={err("endDate")}
          hint={current ? "Shown as Present." : "Format: 2025-06"}
        />
        <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold">
          <input type="checkbox" className="size-5" checked={current} onChange={(e) => setCurrent(e.target.checked)} />I work here now
        </label>
      </div>
      <AreaField
        name="bullets"
        label="What you did"
        optional
        rows={5}
        defaultValue={v?.bullets.join("\n")}
        error={err("bullets")}
        hint="One achievement per line, up to 12. Only things that are true."
      />
    </>
  );
}

export function ExperienceSection({ items }: { items: ExperienceDto[] }) {
  return (
    <SectionCard id="experience" title="Experience" intro="Newest first.">
      <CrudList
        items={items.map((e) => ({
          id: e.id,
          label: `role ${e.title} at ${e.employer}`,
          values: e,
          view: (
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">{e.title}</h3>
              <p className="text-sm text-muted">
                {e.employer}
                {e.location ? ` · ${e.location}` : ""}
              </p>
              <p className="text-sm text-muted">{e.period}</p>
              {e.bullets.length > 0 && (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {e.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ),
        }))}
        save={saveExperience}
        del={deleteExperience}
        addLabel="Add a role"
        empty="No roles yet. Add your most recent one first."
        fields={(v, err) => <ExperienceFields v={v} err={err} />}
      />
    </SectionCard>
  );
}

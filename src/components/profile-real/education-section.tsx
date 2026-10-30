"use client";

import { deleteEducation, saveEducation } from "@/app/app/profile/actions";
import { CrudList } from "./crud-list";
import type { EducationDto } from "./dto";
import { TextField } from "./fields";
import { SectionCard } from "./section-card";

export function EducationSection({ items }: { items: EducationDto[] }) {
  return (
    <SectionCard id="education" title="Education">
      <CrudList
        items={items.map((e) => ({
          id: e.id,
          label: `education ${e.institution}`,
          values: e,
          view: (
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">{e.institution}</h3>
              {(e.degree || e.field) && <p className="text-sm text-muted">{[e.degree, e.field].filter(Boolean).join(", ")}</p>}
              {(e.period || e.grade) && <p className="text-sm text-muted">{[e.period, e.grade].filter(Boolean).join(" · ")}</p>}
            </div>
          ),
        }))}
        save={saveEducation}
        del={deleteEducation}
        addLabel="Add education"
        empty="No education yet."
        fields={(v, err) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField className="sm:col-span-2" name="institution" label="School or university" required maxLength={160} defaultValue={v?.institution} error={err("institution")} />
            <TextField name="degree" label="Degree" optional maxLength={120} defaultValue={v?.degree} error={err("degree")} placeholder="BS" />
            <TextField name="field" label="Field of study" optional maxLength={120} defaultValue={v?.field} error={err("field")} placeholder="Computer Science" />
            <TextField name="startDate" label="Start month" optional type="month" defaultValue={v?.startDate} error={err("startDate")} hint="Format: 2019-09" />
            <TextField name="endDate" label="End month" optional type="month" defaultValue={v?.endDate} error={err("endDate")} hint="Format: 2023-06" />
            <TextField name="grade" label="Grade" optional maxLength={40} defaultValue={v?.grade} error={err("grade")} placeholder="3.4 CGPA" />
          </div>
        )}
      />
    </SectionCard>
  );
}

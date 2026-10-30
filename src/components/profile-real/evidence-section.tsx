"use client";

import { deleteFact, saveFact } from "@/app/app/profile/actions";
import { CrudList } from "./crud-list";
import type { FactDto } from "./dto";
import { AreaField, SelectField, TextField } from "./fields";
import { SectionCard } from "./section-card";

const SOURCE: Record<string, string> = { USER: "Added by you", MATCH_QUESTION: "From a job match question" };
const LIST_ID = "evidence-skill-names";

export function EvidenceSection({ items, skillNames, roles }: { items: FactDto[]; skillNames: string[]; roles: { value: string; label: string }[] }) {
  return (
    <SectionCard
      id="evidence"
      title="Evidence bank"
      intro="Facts you've confirmed. Suggestions may only use these and your resume. Nothing here is ever invented."
    >
      <datalist id={LIST_ID}>
        {skillNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <CrudList
        items={items.map((f) => ({
          id: f.id,
          label: `evidence ${f.statement.slice(0, 40)}`,
          values: f,
          view: (
            <div className="flex flex-col gap-2">
              <p className="text-sm">{f.statement}</p>
              {f.metric && <p className="text-sm font-semibold">{f.metric}</p>}
              <ul className="flex flex-wrap items-center gap-1.5 text-xs">
                {f.skillName && <li className="rounded-full bg-hl-soft px-2.5 py-0.5 font-semibold text-hl-ink">{f.skillName}</li>}
                {f.experienceLabel && <li className="rounded-full bg-sunken px-2.5 py-0.5 font-semibold">{f.experienceLabel}</li>}
                <li className="rounded-full border border-rule px-2.5 py-0.5 text-muted">{SOURCE[f.source] ?? "Added"}</li>
                <li className="text-muted">{f.dateLabel}</li>
              </ul>
            </div>
          ),
        }))}
        save={saveFact}
        del={deleteFact}
        addLabel="Add evidence"
        empty="Nothing here yet. Add things you have really done, in your own words."
        fields={(v, err) => (
          <>
            <AreaField
              name="statement"
              label="What you did"
              required
              rows={3}
              minLength={10}
              maxLength={300}
              defaultValue={v?.statement}
              error={err("statement")}
              placeholder="Set up Docker Compose for local development at Kinara Software"
              hint="10 to 300 characters."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="metric" label="Result or number" optional maxLength={80} defaultValue={v?.metric} error={err("metric")} placeholder="Cut build time by 40%" />
              <TextField name="skillName" label="Skill it shows" optional maxLength={60} list={LIST_ID} defaultValue={v?.skillName} error={err("skillName")} placeholder="Docker" />
            </div>
            <SelectField
              name="experienceId"
              label="Linked role"
              optional
              defaultValue={v?.experienceId ?? ""}
              error={err("experienceId")}
              options={[{ value: "", label: "Not linked to a role" }, ...roles]}
            />
          </>
        )}
      />
    </SectionCard>
  );
}

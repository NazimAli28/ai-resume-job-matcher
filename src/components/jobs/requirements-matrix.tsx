import { CircleDot, Sparkles } from "lucide-react";
import { Item, Stagger } from "@/components/ui/motion";
import { IconChip } from "@/components/resumes/visual";
import type { RequirementType } from "@/demo/types";
import type { EffectiveRequirement } from "./lib/match";
import { RequirementRow } from "./requirement-row";

const GROUPS: { type: RequirementType; title: string; hint: string; icon: typeof CircleDot }[] = [
  { type: "MUST_HAVE", title: "Must-have", hint: "These count most (45 of 100 points).", icon: CircleDot },
  { type: "NICE_TO_HAVE", title: "Nice-to-have", hint: "These add up to 15 points.", icon: Sparkles },
];

export function RequirementsMatrix({ jobId, reqs }: { jobId: string; reqs: EffectiveRequirement[] }) {
  // When one JD line was split into several skills, show which skill each row checks.
  const textCount = new Map<string, number>();
  reqs.forEach((r) => textCount.set(r.text, (textCount.get(r.text) ?? 0) + 1));

  return (
    <section aria-labelledby="reqs-heading" className="flex flex-col gap-6">
      <div>
        <h2 id="reqs-heading" className="font-display text-xl font-bold">Requirements</h2>
        <p className="text-sm text-muted">Each one is checked against your resume and profile. If we got one wrong, correct it and the estimate updates.</p>
      </div>
      {GROUPS.map((g) => {
        const rows = reqs.filter((r) => r.type === g.type);
        if (!rows.length) return null;
        return (
          <div key={g.type} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <IconChip icon={g.icon} emphasis={g.type === "MUST_HAVE"} className="size-9" />
              <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="font-display text-base font-bold">{g.title} ({rows.length})</h3>
                <span className="text-sm text-muted">{g.hint}</span>
              </div>
            </div>
            <Stagger className="flex flex-col gap-3">
              {rows.map((r) => (
                <Item key={r.id}>
                  <RequirementRow jobId={jobId} req={r} showSkill={(textCount.get(r.text) ?? 0) > 1} />
                </Item>
              ))}
            </Stagger>
          </div>
        );
      })}
      {!reqs.length && <p className="text-muted">No requirements were found for this job, so the estimate has little to go on.</p>}
    </section>
  );
}

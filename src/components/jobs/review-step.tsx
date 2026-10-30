"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { MatchChip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { ScoreBand } from "@/components/ui/score";
import { AnimatedRing } from "@/components/resumes/visual";
import { useDemo } from "@/demo/store";
import type { Job, RequirementType } from "@/demo/types";
import { toRequirements, type DraftRequirement, type Extracted } from "./lib/extract";
import { basisLine, scoreJob, thresholdsFit, titleFit } from "./lib/match";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function ReviewStep({
  initial,
  notice,
  onBack,
  onSave,
}: {
  initial: Extracted;
  notice?: string;
  onBack: () => void;
  onSave: (d: Extracted) => void;
}) {
  const { state, activeResume } = useDemo();
  const [d, setD] = useState<Extracted>(initial);
  const [confirmDup, setConfirmDup] = useState(false);
  const [nextKey, setNextKey] = useState(0);

  const set = <K extends keyof Extracted>(k: K, v: Extracted[K]) => setD((x) => ({ ...x, [k]: v }));
  const setReq = (key: string, patch: Partial<DraftRequirement>) =>
    setD((x) => ({ ...x, requirements: x.requirements.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));

  const classified = useMemo(
    () => d.requirements.map((r) => ({ draft: r, reqs: r.text.trim() ? toRequirements([r], state.profile, activeResume) : [] })),
    [d.requirements, state.profile, activeResume],
  );

  const preview = useMemo(() => {
    const reqs = classified.flatMap((c) => c.reqs);
    const job = { title: d.title, requirements: reqs } as Job;
    return scoreJob(job, state.profile, { title: titleFit(d.title, state.profile, state.user.targetRoles), thresholds: thresholdsFit(reqs) });
  }, [classified, d.title, state.profile, state.user.targetRoles]);

  const duplicate = state.jobs.find((j) => d.title && norm(j.title) === norm(d.title) && norm(j.company) === norm(d.company));

  const save = () => {
    if (duplicate && !confirmDup) {
      setConfirmDup(true);
      return;
    }
    onSave(d);
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        We read this with simple rules. Fix anything that looks wrong before saving; the estimate updates as you edit.
      </p>
      {notice && <p role="alert" className="rounded-[var(--radius-md)] bg-warn-soft px-3 py-2 text-sm text-warn">{notice}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title" htmlFor="rv-title"><Input id="rv-title" value={d.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Company" htmlFor="rv-company"><Input id="rv-company" value={d.company} onChange={(e) => set("company", e.target.value)} /></Field>
        <Field label="Location" htmlFor="rv-loc"><Input id="rv-loc" value={d.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Work mode" htmlFor="rv-mode">
          <Select id="rv-mode" value={d.workMode} onChange={(e) => set("workMode", e.target.value as Job["workMode"])}>
            <option>On-site</option>
            <option>Hybrid</option>
            <option>Remote</option>
          </Select>
        </Field>
        <Field label="Salary (optional)" htmlFor="rv-salary" className="sm:col-span-2"><Input id="rv-salary" value={d.salary} onChange={(e) => set("salary", e.target.value)} /></Field>
      </div>

      <section aria-labelledby="rv-reqs" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="rv-reqs" className="text-base font-bold">Requirements ({d.requirements.length})</h3>
          <span className="text-sm text-muted">Checked against your profile</span>
        </div>
        <ul className="flex flex-col gap-3">
          {classified.map(({ draft: r, reqs }, i) => (
            <li key={r.key} className="card flex flex-col gap-2 p-3">
              <div className="flex gap-2">
                <label htmlFor={`req-${r.key}`} className="sr-only">Requirement {i + 1}</label>
                <Input id={`req-${r.key}`} value={r.text} onChange={(e) => setReq(r.key, { text: e.target.value })} />
                <label htmlFor={`type-${r.key}`} className="sr-only">Priority for requirement {i + 1}</label>
                <Select id={`type-${r.key}`} className="w-36 shrink-0" value={r.type} onChange={(e) => setReq(r.key, { type: e.target.value as RequirementType })}>
                  <option value="MUST_HAVE">Must-have</option>
                  <option value="NICE_TO_HAVE">Nice-to-have</option>
                </Select>
                <IconButton aria-label={`Remove requirement ${i + 1}`} className="size-11 shrink-0" onClick={() => setD((x) => ({ ...x, requirements: x.requirements.filter((q) => q.key !== r.key) }))}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
              {reqs.map((q) => (
                <div key={q.id} className="flex flex-wrap items-start gap-x-2 gap-y-1 text-sm">
                  <MatchChip value={q.matchClass} />
                  {reqs.length > 1 && <span className="font-semibold">{q.skill}</span>}
                  <span className="min-w-0 flex-1 text-muted">
                    {q.evidence ? <><span className="hl">{q.evidence.text}</span> <span>({q.evidence.section})</span></> : q.note}
                  </span>
                </div>
              ))}
            </li>
          ))}
          {!d.requirements.length && <li className="rounded-2xl border border-dashed border-rule-strong p-4 text-sm text-muted">No requirements yet. Add the job&apos;s key requirements so the estimate means something.</li>}
        </ul>
        <Button
          size="sm"
          className="w-fit"
          onClick={() => {
            setD((x) => ({ ...x, requirements: [...x.requirements, { key: `n${nextKey}`, text: "", type: "MUST_HAVE" }] }));
            setNextKey((n) => n + 1);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add requirement
        </Button>
      </section>

      <div className="card flex items-center gap-5 p-5">
        <AnimatedRing value={preview.score} size={96} stroke={9} label="Fit estimate" />
        <ScoreBand className="min-w-0 flex-1" value={preview.score} title="Fit estimate" basis={basisLine(preview)} size="sm" />
      </div>

      {confirmDup && duplicate && (
        <div role="alert" className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-rule-strong p-3 text-sm">
          <p>You already saved {duplicate.title} at {duplicate.company}. Save it again anyway?</p>
          <Link href={`/demo/jobs/${duplicate.id}`} className="font-semibold text-hl-ink underline underline-offset-4">Open the saved job</Link>
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t border-rule pt-4">
        <Button variant="ghost" onClick={onBack}>Back to the description</Button>
        <Button variant="primary" onClick={save} disabled={!d.title.trim()}>
          {confirmDup ? "Save anyway" : "Save job and see the match"}
        </Button>
      </div>
    </div>
  );
}

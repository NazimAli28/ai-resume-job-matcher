"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { SOURCE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { Application, Job, JobSource } from "@/demo/types";
import { TODAY } from "@/lib/dates";

type Status = "SAVED" | "APPLIED";

export function TrackDialog({ job, open, onClose }: { job: Job; open: boolean; onClose: () => void }) {
  const { state, dispatch, activeResume } = useDemo();
  const router = useRouter();
  const toast = useToast();
  const versions = state.resumes.filter((r) => r.state !== "ARCHIVED");
  const tailored = versions.find((r) => r.tailoredForJobId === job.id);
  const [resumeId, setResumeId] = useState((tailored ?? activeResume).id);
  const [status, setStatus] = useState<Status>("APPLIED");
  const [source, setSource] = useState<JobSource>(job.source);
  const [detail, setDetail] = useState(job.sourceDetail ?? "");

  const save = () => {
    const app: Application = {
      id: `a${Date.now()}`,
      jobId: job.id,
      company: job.company,
      title: job.title,
      status,
      resumeVersionId: resumeId,
      source,
      sourceDetail: detail.trim() || undefined,
      appliedAt: status === "APPLIED" ? TODAY : undefined,
      updatedAt: TODAY,
      salary: job.salary,
      notes: "",
      tags: [],
      contacts: [],
      rounds: [],
      history: status === "APPLIED" ? [{ status: "SAVED", at: TODAY }, { status: "APPLIED", at: TODAY }] : [{ status: "SAVED", at: TODAY }],
    };
    dispatch({ type: "ADD_APPLICATION", application: app });
    onClose();
    toast(`Tracking ${job.title} at ${job.company}`, { label: "Open applications", onClick: () => router.push("/app/applications") });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Track this application"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>Add to my applications</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Resume version you're sending" htmlFor="tr-resume" hint="This version will be locked, so you always know exactly what you sent.">
          <Select id="tr-resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
            {versions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}: {r.name}{r.tailoredForJobId === job.id ? " (tailored for this job)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Segmented<Status>
          name="tr-status"
          legend="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "SAVED", label: "Saved", hint: "Not applied yet" },
            { value: "APPLIED", label: "Applied", hint: `Applied today` },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Source" htmlFor="tr-source">
            <Select id="tr-source" value={source} onChange={(e) => setSource(e.target.value as JobSource)}>
              {(Object.keys(SOURCE_LABEL) as JobSource[]).map((s) => (
                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Where exactly? (optional)" htmlFor="tr-detail">
            <Input id="tr-detail" value={detail} onChange={(e) => setDetail(e.target.value)} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { TODAY } from "@/lib/dates";
import { SOURCE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { Application, ApplicationStatus, JobSource } from "@/demo/types";
import { ALL_STATUSES } from "./helpers";

const MANUAL = "manual";
const newAppId = () => `a${Date.now()}`;

export function AddApplicationDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  // Remount the form each time the dialog opens so fields start fresh.
  return (
    <Dialog open={open} onClose={onClose} title="Add application">
      <AddForm onClose={onClose} onCreated={onCreated} />
    </Dialog>
  );
}

function AddForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { state, dispatch, activeResume } = useDemo();
  const toast = useToast();
  const tracked = new Set(state.applications.map((a) => a.jobId));
  const jobs = state.jobs.filter((j) => !j.archived);
  const [jobId, setJobId] = useState(jobs.find((j) => !tracked.has(j.id))?.id ?? MANUAL);
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [resumeId, setResumeId] = useState(activeResume.id);
  const [source, setSource] = useState<JobSource | "">("");
  const [status, setStatus] = useState<ApplicationStatus>("SAVED");

  const job = jobs.find((j) => j.id === jobId);
  const manual = jobId === MANUAL;
  const finalCompany = manual ? company.trim() : job?.company ?? "";
  const finalTitle = manual ? title.trim() : job?.title ?? "";
  const valid = finalCompany.length > 0 && finalTitle.length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const id = newAppId();
    const app: Application = {
      id,
      jobId: manual ? `manual-${id}` : jobId,
      company: finalCompany,
      title: finalTitle,
      status,
      resumeVersionId: resumeId,
      source: source || job?.source || "OTHER",
      sourceDetail: manual ? undefined : job?.sourceDetail,
      appliedAt: status === "SAVED" ? undefined : TODAY,
      updatedAt: TODAY,
      salary: job?.salary,
      notes: "",
      tags: [],
      contacts: [],
      rounds: [],
      history: [{ status, at: TODAY }],
    };
    dispatch({ type: "ADD_APPLICATION", application: app });
    toast(`Added ${finalCompany} to your tracker`);
    onClose();
    onCreated(id);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Saved job" htmlFor="add-job" hint={manual ? undefined : "Company, role and source come from the job you saved."}>
        <Select id="add-job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.company}, {j.title}
              {tracked.has(j.id) ? " (already tracked)" : ""}
            </option>
          ))}
          <option value={MANUAL}>Enter details myself</option>
        </Select>
      </Field>
      {manual && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="add-company">
            <Input id="add-company" value={company} onChange={(e) => setCompany(e.target.value)} required />
          </Field>
          <Field label="Job title" htmlFor="add-title">
            <Input id="add-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
        </div>
      )}
      <Field label="Resume version you are using" htmlFor="add-resume" hint="This version is locked once linked, so you always know what you sent.">
        <Select id="add-resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
          {state.resumes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}, {r.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source" htmlFor="add-source">
          <Select id="add-source" value={source || job?.source || "OTHER"} onChange={(e) => setSource(e.target.value as JobSource)}>
            {(Object.keys(SOURCE_LABEL) as JobSource[]).map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="add-status">
          <Select id="add-status" value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!valid}>
          Add to tracker
        </Button>
      </div>
    </form>
  );
}

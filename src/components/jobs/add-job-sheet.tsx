"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { SOURCE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { Job, JobSource } from "@/demo/types";
import { TODAY } from "@/lib/dates";
import { ExtractProgress, JobStepper } from "./extract-progress";
import { EXAMPLE_JOB, extractJob, toRequirements, type Extracted } from "./lib/extract";
import { buildJobMatch } from "./lib/match";
import { wait } from "./lib/browser";
import { ReviewStep } from "./review-step";

const MIN_CHARS = 200;
const STAGES = ["Reading the job description", "Finding the requirements", "Checking them against your profile"];

type Step = "form" | "extracting" | "review";

export function AddJobSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, activeResume } = useDemo();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>("form");
  const [stage, setStage] = useState(0);
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<JobSource>("LINKEDIN");
  const [sourceDetail, setSourceDetail] = useState("");
  const [draft, setDraft] = useState<Extracted | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("form");
    setStage(0);
    setDescription("");
    setUrl("");
    setSource("LINKEDIN");
    setSourceDetail("");
    setDraft(null);
    setError("");
  };
  const close = () => {
    if (step === "extracting") return;
    reset();
    onClose();
  };

  const extract = async () => {
    if (description.trim().length < MIN_CHARS) {
      setError(`Paste the full job description (at least ${MIN_CHARS} characters) so we can find its requirements.`);
      return;
    }
    setError("");
    setStep("extracting");
    for (let i = 0; i < STAGES.length; i++) {
      setStage(i);
      await wait(550);
    }
    const ex = extractJob(description);
    if (!ex.requirements.length) {
      setError("We couldn't find requirement lines. Lines starting with “-” are read as requirements; you can also add them by hand on the next step.");
    }
    setDraft(ex);
    setStep("review");
  };

  const save = (d: Extracted) => {
    const now = new Date().toISOString();
    const id = `j${Date.now()}`;
    const job: Job = {
      id,
      title: d.title.trim() || "Untitled role",
      company: d.company.trim() || "Unknown company",
      location: d.location.trim() || "Not stated",
      workMode: d.workMode,
      url: url.trim(),
      source,
      sourceDetail: sourceDetail.trim() || undefined,
      addedAt: `${TODAY}${now.slice(10)}`,
      salary: d.salary.trim() || undefined,
      description: description.trim(),
      requirements: toRequirements(d.requirements.filter((r) => r.text.trim()), state.profile, activeResume),
    };
    const match = buildJobMatch(job, state.profile, state.user.targetRoles, activeResume.id);
    dispatch({ type: "ADD_JOB", job, match });
    toast(`Saved ${job.title} at ${job.company}`);
    reset();
    onClose();
    router.push(`/app/jobs/${id}`);
  };

  const footer =
    step === "form" ? (
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={() => { setDescription(EXAMPLE_JOB.description); setUrl(EXAMPLE_JOB.url); setSource("COMPANY_SITE"); setError(""); }}>
          Fill with example job
        </Button>
        <Button variant="primary" onClick={extract}>Find requirements</Button>
      </div>
    ) : null;

  return (
    <Sheet open={open} onClose={close} title={step === "review" ? "Check what we found" : "Add a job"} wide footer={footer}>
      <JobStepper index={step === "form" ? 0 : step === "extracting" ? 1 : 2} />
      {step === "form" && (
        <div className="flex flex-col gap-5">
          <Field
            label="Job description"
            htmlFor="jd-text"
            hint={<>Paste only text you have the right to use. {description.trim().length} characters{description.trim().length < MIN_CHARS ? `, at least ${MIN_CHARS} needed` : ""}.</>}
          >
            <Textarea
              id="jd-text"
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? "jd-error" : undefined}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the full job post here, including the requirements."
              className="min-h-64"
            />
          </Field>
          {error && <p id="jd-error" role="alert" className="-mt-3 text-sm text-warn">{error}</p>}
          <Field label="Job link (optional)" htmlFor="jd-url" hint="Stored as a link for you. We never open it.">
            <Input id="jd-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Where did you find it?" htmlFor="jd-source">
              <Select id="jd-source" value={source} onChange={(e) => setSource(e.target.value as JobSource)}>
                {(Object.keys(SOURCE_LABEL) as JobSource[]).map((s) => (
                  <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Where exactly? (optional)" htmlFor="jd-detail" hint="For example: referred by a friend, a WhatsApp group.">
              <Input id="jd-detail" value={sourceDetail} onChange={(e) => setSourceDetail(e.target.value)} />
            </Field>
          </div>
        </div>
      )}
      {step === "extracting" && <ExtractProgress stages={STAGES} current={stage} />}
      {step === "review" && draft && (
        <ReviewStep
          initial={draft}
          notice={error}
          onBack={() => { setStep("form"); setError(""); }}
          onSave={save}
        />
      )}
    </Sheet>
  );
}

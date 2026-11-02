"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createApplicationAction } from "@/app/app/applications/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/field";
import { JOB_SOURCES } from "@/server/match/schemas";

export interface JobOption {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string | null;
  source: string;
  sourceDetail: string | null;
}

const BLANK = { company: "", title: "", location: "", url: "", source: "OTHER", sourceDetail: "" };

const fromJob = (j?: JobOption) =>
  j ? { company: j.company ?? "", title: j.title, location: j.location ?? "", url: j.url ?? "", source: j.source, sourceDetail: j.sourceDetail ?? "" } : BLANK;

export function ApplicationForm({ jobs, versions, jobId: initialJob, resumeId: initialResume }: { jobs: JobOption[]; versions: { id: string; label: string; name: string }[]; jobId: string; resumeId: string }) {
  const router = useRouter();
  const [jobId, setJobId] = useState(initialJob);
  const [resumeVersionId, setResume] = useState(initialResume);
  const [fields, setFields] = useState(() => fromJob(jobs.find((j) => j.id === initialJob)));
  const [status, setStatus] = useState<"SAVED" | "APPLIED">("SAVED");
  const [appliedAt, setAppliedAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [salaryExpected, setSalary] = useState("");
  const [priority, setPriority] = useState("2");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<{ id: string; createdAt: string } | null>(null);

  const set = (k: keyof typeof BLANK) => (e: { target: { value: string } }) => setFields((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent | null, allowDuplicate = false) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await createApplicationAction({ ...fields, jobId, resumeVersionId, status, appliedAt, deadline, salaryExpected, priority, notes, allowDuplicate });
      if (r.ok) {
        router.push(`/app/applications/${r.id}`);
        return;
      }
      if ("duplicate" in r) setDuplicate(r.duplicate);
      else setError(r.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-5 p-6">
      {jobs.length > 0 && (
        <Field label="From a job you matched" htmlFor="app-job" hint="Optional. Fills in the details and keeps a copy of the post with this application.">
          <Select
            id="app-job"
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setFields(fromJob(jobs.find((j) => j.id === e.target.value)));
            }}
          >
            <option value="">No, I&apos;ll type the details</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {[j.title, j.company].filter(Boolean).join(" at ")}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor="app-company">
          <Input id="app-company" required maxLength={120} value={fields.company} onChange={set("company")} />
        </Field>
        <Field label="Job title" htmlFor="app-title">
          <Input id="app-title" required maxLength={120} value={fields.title} onChange={set("title")} />
        </Field>
        <Field label="Where you found it" htmlFor="app-source">
          <Select id="app-source" value={fields.source} onChange={set("source")}>
            {JOB_SOURCES.map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Location (optional)" htmlFor="app-location">
          <Input id="app-location" maxLength={120} value={fields.location} onChange={set("location")} />
        </Field>
        <Field label="Link to the post (optional)" htmlFor="app-url" className="sm:col-span-2">
          <Input id="app-url" type="url" inputMode="url" maxLength={500} placeholder="https://" value={fields.url} onChange={set("url")} />
        </Field>
      </div>

      <Segmented
        name="app-status"
        legend="Where does it stand?"
        value={status}
        onChange={setStatus}
        options={[
          { value: "SAVED", label: "Saved", hint: "Thinking about applying" },
          { value: "APPLIED", label: "Applied", hint: "Already sent" },
        ]}
      />

      {status === "APPLIED" && (
        <Field label="Date you applied" htmlFor="app-applied" hint="Leave empty for today.">
          <Input id="app-applied" type="date" className="w-48" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} />
        </Field>
      )}

      <Field
        label="Resume you sent"
        htmlFor="app-resume"
        hint={resumeVersionId ? "This version will be locked to this application, so you'll always know what you sent." : status === "APPLIED" ? "No resume linked: you won't know what you sent." : "You can link it later."}
      >
        <Select id="app-resume" value={resumeVersionId} onChange={(e) => setResume(e.target.value)}>
          <option value="">None for now</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>{v.label} · {v.name}</option>
          ))}
        </Select>
      </Field>

      <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">More details (optional)</summary>
        <div className="grid gap-4 pt-2 sm:grid-cols-3">
          <Field label="Application deadline" htmlFor="app-deadline">
            <Input id="app-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <Field label="Expected salary (PKR)" htmlFor="app-salary">
            <Input id="app-salary" inputMode="numeric" maxLength={10} value={salaryExpected} onChange={(e) => setSalary(e.target.value)} />
          </Field>
          <Field label="Priority" htmlFor="app-priority">
            <Select id="app-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="1">High</option>
              <option value="2">Normal</option>
              <option value="3">Low</option>
            </Select>
          </Field>
          <Field label="Notes" htmlFor="app-notes" className="sm:col-span-3">
            <Textarea id="app-notes" maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </details>

      {error && <FormAlert>{error}</FormAlert>}
      {duplicate ? (
        <div className="flex flex-col gap-3 rounded-xl bg-warn-soft p-4 text-sm">
          <p>You already have an application for this company and title.</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/app/applications/${duplicate.id}`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Open it</Link>
            <Button disabled={busy} onClick={() => submit(null, true)}>Add another anyway</Button>
          </div>
        </div>
      ) : (
        <div>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Add to tracker"}</Button>
        </div>
      )}
    </form>
  );
}

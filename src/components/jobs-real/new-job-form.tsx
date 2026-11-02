"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createJobAction, type CreateJobResult } from "@/app/app/jobs/actions";
import { FormAlert } from "@/components/auth/auth-ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";

type Duplicate = Extract<CreateJobResult, { duplicate: unknown }>["duplicate"];

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function NewJobForm({
  versions,
  sources,
  min,
  max,
}: {
  versions: { id: string; label: string; name: string }[];
  sources: readonly (readonly [string, string])[];
  min: number;
  max: number;
}) {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [field, setField] = useState<string | undefined>();
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);

  async function submit(form: HTMLFormElement, allowDuplicate: boolean) {
    const f = new FormData(form);
    setBusy(true);
    setError("");
    setField(undefined);
    setDuplicate(null);
    let r: CreateJobResult;
    try {
      r = await createJobAction({
        resumeVersionId: String(f.get("resumeVersionId") ?? ""),
        rawText,
        url: String(f.get("url") ?? ""),
        source: String(f.get("source") ?? "OTHER"),
        sourceDetail: String(f.get("sourceDetail") ?? ""),
        title: String(f.get("title") ?? ""),
        company: String(f.get("company") ?? ""),
        allowDuplicate,
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
      return;
    }
    if (r.ok) {
      router.push(`/app/jobs/${r.jobId}`);
      return;
    }
    if ("duplicate" in r) setDuplicate(r.duplicate);
    else {
      setError(r.error);
      setField(r.field);
    }
    setBusy(false);
  }

  const length = rawText.trim().length;

  return (
    <form
      id="new-job"
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget, false);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="resumeVersionId" className="text-sm font-semibold">
          Resume to compare
        </label>
        <Select id="resumeVersionId" name="resumeVersionId" required defaultValue={versions[0]?.id} aria-invalid={field === "resumeVersionId"}>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} · {v.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rawText" className="text-sm font-semibold">
          Job description
        </label>
        <Textarea
          id="rawText"
          required
          rows={12}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          maxLength={max + 500}
          placeholder="Paste the whole job post here, including the requirements."
          aria-invalid={field === "rawText"}
          aria-describedby="rawText-hint"
        />
        <p id="rawText-hint" className="flex flex-wrap justify-between gap-x-4 text-[13px] text-muted">
          <span>Paste only text you have the right to use. AI reads this post; your resume isn&apos;t sent.</span>
          <span className="tabular-nums">
            {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
            {length > 0 && length < min ? ` (at least ${min})` : ""}
          </span>
        </p>
      </div>

      <details className="rounded-xl border border-rule p-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">Where you found it (optional)</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="source" className="text-sm font-semibold">Source</label>
            <Select id="source" name="source" defaultValue="OTHER">
              {sources.map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sourceDetail" className="text-sm font-semibold">Source detail</label>
            <Input id="sourceDetail" name="sourceDetail" maxLength={100} placeholder="e.g. referred by a classmate" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="url" className="text-sm font-semibold">Link to the post</label>
            <Input id="url" name="url" type="url" maxLength={500} placeholder="https://" aria-invalid={field === "url"} aria-describedby="url-hint" />
            <p id="url-hint" className="text-[13px] text-muted">Saved so you can find it again. We never open it.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-semibold">Job title</label>
            <Input id="title" name="title" maxLength={120} placeholder="Read from the post if blank" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="company" className="text-sm font-semibold">Company</label>
            <Input id="company" name="company" maxLength={120} placeholder="Read from the post if blank" />
          </div>
        </div>
      </details>

      {error && <FormAlert>{error}</FormAlert>}

      {duplicate && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl bg-sunken p-4">
          <p className="text-sm">
            You already saved this post on {fmt(duplicate.createdAt)}: <span className="font-semibold">{duplicate.title}</span>.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/app/jobs/${duplicate.id}`} variant="primary" size="sm">
              Open existing
            </ButtonLink>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => {
                const form = document.getElementById("new-job");
                if (form instanceof HTMLFormElement) void submit(form, true);
              }}
            >
              Save anyway
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Reading the post…" : "Compare with my resume"}
        </Button>
        <Link href="/app/jobs" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-muted hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}

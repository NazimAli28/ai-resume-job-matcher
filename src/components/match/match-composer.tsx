"use client";

import { ArrowRight, CheckCircle2, ChevronDown, ClipboardPaste, FileText, Plus, Upload, Wand2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { ExtractProgress } from "@/components/jobs/extract-progress";
import { EXAMPLE_JOB, extractJob, toRequirements, type Extracted } from "@/components/jobs/lib/extract";
import { buildJobMatch } from "@/components/jobs/lib/match";
import { wait } from "@/components/jobs/lib/browser";
import { AnalysisProgress, ResumeSourcePicker, useAnalysisRun } from "@/components/resumes/analysis-run";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { SOURCE_LABEL } from "@/demo/labels";
import { useDemo } from "@/demo/store";
import type { Job, JobSource, ResumeVersion } from "@/demo/types";
import { cn } from "@/lib/cn";
import { formatDate, TODAY } from "@/lib/dates";

const MIN_CHARS = 200;
const STAGES = ["Reading the job description", "Finding the requirements", "Checking them against your resume"];

type Phase = "compose" | "reading" | "confirm";

/** Step heading: a numbered dot that turns into a check once the step is done. */
function StepTitle({ n, done, title, hint }: { n: number; done: boolean; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold transition-colors",
          done ? "bg-hl text-on-hl glow" : "border-2 border-rule text-muted",
        )}
      >
        {done ? <CheckCircle2 className="size-4" /> : n}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-bold leading-tight">{title}</h3>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
    </div>
  );
}

function ResumeOption({ r, selected, jobName, onPick }: { r: ResumeVersion; selected: boolean; jobName?: string; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={cn(
        "relative flex w-full min-w-0 flex-col gap-2 rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow]",
        selected ? "border-hl-ink bg-hl-soft/60 glow" : "border-rule bg-surface hover:border-rule-strong hover:bg-sunken/60",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken font-display text-[13px] font-bold">{r.label}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{r.name}</span>
            <span className="block truncate text-[13px] text-muted">
              {r.origin === "TAILORED" ? `Tailored${jobName ? ` for ${jobName}` : ""}` : "Uploaded"} · {formatDate(r.createdAt)}
            </span>
          </span>
        </span>
        <span
          aria-hidden
          className={cn("mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2", selected ? "border-hl-ink bg-hl-ink" : "border-rule")}
        >
          {selected && <span className="size-2 rounded-full bg-surface" />}
        </span>
      </span>
      <span className="text-[13px] text-muted">
        Parse health <span className="font-semibold text-ink">{r.parseHealth}</span> · Readability{" "}
        <span className="font-semibold text-ink">{r.readability}</span>
      </span>
    </button>
  );
}

/**
 * The app's main action in one place: pick a resume (or upload one), paste a job, see the match.
 * `compact` is the dashboard card; the full page shows the same steps with more room.
 */
export function MatchComposer({ compact = false }: { compact?: boolean }) {
  const { state, dispatch, activeResume, jobById } = useDemo();
  const router = useRouter();
  const toast = useToast();
  const ids = useId();

  // null = follow the default resume (it can change when saved demo data loads after the first render).
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(state.resumes.length === 0);
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<JobSource>("LINKEDIN");
  const [moreOpen, setMoreOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("compose");
  const [stage, setStage] = useState(0);
  const [draft, setDraft] = useState<Extracted | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");

  const run = useAnalysisRun((v) => {
    setResumeId(v.id);
    setUploading(false);
    toast(`${v.label} uploaded and selected for this match`);
  });

  // Newest first, but keep the default resume at the front so the usual choice is one glance away.
  const resumes = [...state.resumes].sort((a, b) =>
    a.id === activeResume.id ? -1 : b.id === activeResume.id ? 1 : b.createdAt.localeCompare(a.createdAt),
  );
  const shown = compact ? resumes.slice(0, 3) : resumes;
  const resume = (resumeId && state.resumes.find((r) => r.id === resumeId)) || activeResume;
  const chars = description.trim().length;
  const jobReady = chars >= MIN_CHARS;

  const read = async () => {
    if (!jobReady) {
      setError(`Paste the full job description (at least ${MIN_CHARS} characters) so we can find its requirements.`);
      return;
    }
    setError("");
    setPhase("reading");
    for (let i = 0; i < STAGES.length; i++) {
      setStage(i);
      await wait(500);
    }
    const ex = extractJob(description);
    setDraft(ex);
    setTitle(ex.title);
    setCompany(ex.company);
    setPhase("confirm");
  };

  const save = () => {
    if (!draft) return;
    const now = new Date().toISOString();
    const id = `j${Date.now()}`;
    const job: Job = {
      id,
      title: title.trim() || "Untitled role",
      company: company.trim() || "Unknown company",
      location: draft.location.trim() || "Not stated",
      workMode: draft.workMode,
      url: url.trim(),
      source,
      addedAt: `${TODAY}${now.slice(10)}`,
      salary: draft.salary.trim() || undefined,
      description: description.trim(),
      requirements: toRequirements(draft.requirements.filter((r) => r.text.trim()), state.profile, resume),
    };
    const match = buildJobMatch(job, state.profile, state.user.targetRoles, resume.id);
    dispatch({ type: "SET_ACTIVE_RESUME", id: resume.id });
    dispatch({ type: "ADD_JOB", job, match });
    toast(`Matched ${resume.label} against ${job.title} at ${job.company}`);
    router.push(`/demo/jobs/${id}`);
  };

  if (phase === "reading") {
    return (
      <Shell compact={compact}>
        <ExtractProgress stages={STAGES} current={stage} />
      </Shell>
    );
  }

  if (phase === "confirm" && draft) {
    // Count what the job page will show: a line naming several skills becomes one requirement per skill.
    const reqs = toRequirements(draft.requirements.filter((r) => r.text.trim()), state.profile, resume);
    const must = reqs.filter((r) => r.type === "MUST_HAVE").length;
    return (
      <Shell compact={compact}>
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-hl text-on-hl glow">
              <CheckCircle2 className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold">
                Found {reqs.length} {reqs.length === 1 ? "requirement" : "requirements"}
                {reqs.length ? `, ${must} must-have` : ""}
              </h3>
              <p className="text-sm text-muted">
                Check the role name, then see how <span className="font-semibold text-ink">{resume.label}</span> matches. You can
                fix any requirement on the next page.
              </p>
            </div>
          </div>
          {!reqs.length && (
            <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
              No requirement lines found. Lines starting with &ldquo;-&rdquo; are read as requirements; you can add them by hand on
              the next page.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title" htmlFor={`${ids}-title`}>
              <Input id={`${ids}-title`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Frontend Developer" />
            </Field>
            <Field label="Company" htmlFor={`${ids}-company`}>
              <Input id={`${ids}-company`} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
            </Field>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={() => setPhase("compose")}>
              Back
            </Button>
            <Button variant="primary" onClick={save} className="glow">
              See my match <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell compact={compact}>
      <div className={cn("grid gap-6", !compact && "lg:gap-8", "xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]")}>
        {/* Step 1: resume */}
        <div className="flex min-w-0 flex-col gap-4">
          <StepTitle n={1} done={!uploading} title="Choose a resume" hint="Pick a saved version or upload a new one." />

          {uploading ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-rule-strong p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold">
                  <Upload className="size-4 text-hl-ink" aria-hidden /> Upload a resume
                </p>
                {state.resumes.length > 0 && run.status !== "running" && (
                  <button
                    type="button"
                    onClick={() => setUploading(false)}
                    aria-label="Cancel upload"
                    className="grid size-9 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              {run.status === "running" ? (
                <AnalysisProgress stage={run.stage} />
              ) : (
                <ResumeSourcePicker actionLabel="Upload and check" onStart={run.start} />
              )}
            </div>
          ) : (
            <div role="radiogroup" aria-label="Resume to match" className="flex flex-col gap-2">
              {shown.map((r) => (
                <ResumeOption
                  key={r.id}
                  r={r}
                  selected={r.id === resume.id}
                  jobName={r.tailoredForJobId ? jobById(r.tailoredForJobId)?.company : undefined}
                  onPick={() => setResumeId(r.id)}
                />
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUploading(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-rule-strong px-3 text-sm font-semibold hover:bg-sunken"
                >
                  <Plus className="size-4" aria-hidden /> Upload a new resume
                </button>
                {compact && resumes.length > shown.length && (
                  <Link href="/demo/match" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-ink">
                    All {resumes.length} versions
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: job */}
        <div className="flex min-w-0 flex-col gap-4">
          <StepTitle n={2} done={jobReady} title="Paste the job description" hint="Copy the whole post, including the requirements." />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-jd`} className="sr-only">
              Job description
            </label>
            <Textarea
              id={`${ids}-jd`}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (error) setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={`${ids}-jd-hint${error ? ` ${ids}-jd-error` : ""}`}
              placeholder={"Paste the job post here.\n\nFor example:\nRequirements:\n- 2+ years of React\n- TypeScript"}
              className={compact ? "min-h-44" : "min-h-64"}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span id={`${ids}-jd-hint`} className={cn(jobReady ? "text-hl-ink" : "text-muted")}>
                {chars ? `${chars} characters${jobReady ? ", ready" : `, at least ${MIN_CHARS} needed`}` : "Paste only text you have the right to use."}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDescription(EXAMPLE_JOB.description);
                  setUrl(EXAMPLE_JOB.url);
                  setSource("COMPANY_SITE");
                  setError("");
                }}
                className="inline-flex min-h-9 items-center gap-1.5 font-semibold text-muted hover:text-ink"
              >
                <ClipboardPaste className="size-4" aria-hidden /> Use an example job
              </button>
            </div>
            {error && (
              <p id={`${ids}-jd-error`} role="alert" className="text-sm text-warn">
                {error}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-rule">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls={`${ids}-more`}
              onClick={() => setMoreOpen((o) => !o)}
              className="flex min-h-11 w-full items-center justify-between gap-2 px-4 text-left text-sm font-semibold"
            >
              <span>
                Link and where you found it <span className="font-normal text-muted">(optional, helps your tracker)</span>
              </span>
              <ChevronDown className={cn("size-4 shrink-0 transition-transform", moreOpen && "rotate-180")} aria-hidden />
            </button>
            {moreOpen && (
              <div id={`${ids}-more`} className="grid gap-4 border-t border-rule p-4 sm:grid-cols-2">
                <Field label="Job link" htmlFor={`${ids}-url`} hint="Saved for you. We never open it.">
                  <Input id={`${ids}-url`} type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
                </Field>
                <Field label="Where did you find it?" htmlFor={`${ids}-source`}>
                  <Select id={`${ids}-source`} value={source} onChange={(e) => setSource(e.target.value as JobSource)}>
                    {(Object.keys(SOURCE_LABEL) as JobSource[]).map((s) => (
                      <option key={s} value={s}>
                        {SOURCE_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-sunken/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex min-w-0 items-center gap-2 px-1 text-sm">
              <FileText className="size-4 shrink-0 text-hl-ink" aria-hidden />
              <span className="truncate">
                {uploading ? "Finish the upload first" : (
                  <>
                    Matching <span className="font-semibold">{resume.label}</span> {resume.name}
                  </>
                )}
              </span>
            </p>
            <Button variant="primary" size="lg" onClick={read} disabled={uploading} className="glow">
              <Wand2 className="size-5" aria-hidden /> Check my match
            </Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ compact, children }: { compact: boolean; children: ReactNode }) {
  if (!compact) return <div className="card p-5 sm:p-7">{children}</div>;
  return (
    <section aria-labelledby="composer-title" className="card relative overflow-hidden p-5 sm:p-7">
      <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full blur-3xl" style={{ background: "rgb(var(--hl-rgb) / 0.14)" }} />
      <div className="relative flex flex-col gap-6">
        <div>
          <h2 id="composer-title" className="font-display text-2xl font-bold">
            Match your resume to a job
          </h2>
          <p className="text-muted">See which requirements you meet, what&apos;s missing, and what to fix. Takes two steps.</p>
        </div>
        {children}
      </div>
    </section>
  );
}

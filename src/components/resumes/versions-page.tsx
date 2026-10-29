"use client";

import { CheckCircle2, FileText, Layers, ListChecks, Lock, Plus, ShieldCheck, Upload, Wand2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { RingScore } from "@/components/ui/charts";
import { Item, Stagger } from "@/components/ui/motion";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { bandFor } from "@/components/ui/score";
import { useToast } from "@/components/ui/toast";
import { useDemo } from "@/demo/store";
import type { ResumeVersion } from "@/demo/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { AnalysisProgress, ResumeSourcePicker, useAnalysisRun } from "./analysis-run";
import { IconComposition } from "./visual";

function MiniScore({ label, value }: { label: string; value: number }) {
  const band = bandFor(value);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <RingScore value={value} size={84} stroke={8} label={label} />
      <span className="text-sm font-semibold">{label}</span>
      <span className={cn("-mt-1 text-xs font-semibold", band.tone === "low" ? "text-warn" : "text-hl-ink")}>{band.word}</span>
    </div>
  );
}

function UploadPanel({ onClose }: { onClose?: () => void }) {
  const { atLimit, state } = useDemo();
  const toast = useToast();
  const run = useAnalysisRun((v) => toast(`${v.label} added and set as your default resume.`));
  const limited = atLimit("analyses");

  if (limited) {
    return (
      <section className="card p-6">
        <h2 className="font-display text-lg font-bold">You have used all your analyses for now</h2>
        <p className="pt-1 text-muted">
          The free plan includes {state.limits.analyses} resume analyses, and {state.usage.analyses} are used. Your
          existing versions and their reports are still available.
        </p>
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-hl text-on-hl glow">
            <Upload className="size-5" aria-hidden />
          </span>
          <h2 className="font-display text-lg font-bold">Upload new version</h2>
        </div>
        {onClose && run.status !== "running" && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
      {run.status === "idle" && <ResumeSourcePicker onStart={run.start} />}
      {run.status === "running" && <AnalysisProgress stage={run.stage} />}
      {run.status === "done" && run.result && (
        <div className="flex flex-col items-start gap-4">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-hl-ink" aria-hidden />
            <span>
              <span className="font-semibold">{run.result.label} is ready.</span> It is your default resume now.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/app/resumes/${run.result.id}`} variant="primary">
              See the report
            </ButtonLink>
            <Button onClick={run.reset}>Upload another</Button>
          </div>
        </div>
      )}
    </section>
  );
}

function VersionCard({ r, isDefault, appCount }: { r: ResumeVersion; isDefault: boolean; appCount: number }) {
  const { dispatch, jobById } = useDemo();
  const toast = useToast();
  const job = r.tailoredForJobId ? jobById(r.tailoredForJobId) : undefined;
  const unresolved = r.findings.filter((f) => !f.resolved).length;
  const tailored = r.origin === "TAILORED";

  return (
    <article className={cn("card card-hover relative flex h-full flex-col gap-4 p-5", isDefault && "border-hl-ink/50")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-ink px-2.5 py-0.5 font-display text-sm font-bold text-paper">{r.label}</span>
        <Chip className={tailored ? "bg-partial-soft text-partial" : "bg-sunken text-ink"}>
          {tailored ? <Wand2 className="size-3.5" aria-hidden /> : <Upload className="size-3.5" aria-hidden />}
          {tailored ? `Tailored for ${job?.company ?? "a job"}` : "Uploaded"}
        </Chip>
        {isDefault && <Chip className="bg-hl text-on-hl glow">Default</Chip>}
      </div>

      <div className="min-w-0">
        <Link href={`/app/resumes/${r.id}`} className="font-display text-xl font-bold leading-snug after:absolute after:inset-0 after:rounded-[20px] hover:underline">
          {r.name}
        </Link>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <FileText className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{r.fileName}</span>
        </p>
        <p className="text-sm text-muted">
          {tailored ? "Tailored" : "Uploaded"} on {formatDate(r.createdAt)}
        </p>
      </div>

      <div className="flex justify-around gap-4 rounded-2xl bg-sunken/60 px-3 py-4">
        <MiniScore label="Parse health" value={r.parseHealth} />
        <MiniScore label="Readability" value={r.readability} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {appCount > 0 ? (
          <Chip className="border border-rule-strong">
            <Lock className="size-3.5" aria-hidden />
            Locked: sent with {appCount} {appCount === 1 ? "application" : "applications"}
          </Chip>
        ) : r.state === "LOCKED" ? (
          <Chip className="border border-rule-strong">
            <Lock className="size-3.5" aria-hidden />
            Locked
          </Chip>
        ) : (
          <Chip className="border border-rule text-muted">Not sent yet</Chip>
        )}
        <span className="text-sm text-muted">{unresolved} open findings</span>
      </div>

      <div className="relative z-10 mt-auto flex flex-wrap gap-2">
        <ButtonLink href={`/app/resumes/${r.id}`} size="sm">
          View report
        </ButtonLink>
        {!isDefault && (
          <Button
            size="sm"
            onClick={() => {
              dispatch({ type: "SET_ACTIVE_RESUME", id: r.id });
              toast(`${r.label} is now your default resume.`);
            }}
          >
            Set as default
          </Button>
        )}
      </div>
    </article>
  );
}

export function VersionsPage() {
  const { state, activeResume } = useDemo();
  const [uploading, setUploading] = useState(false);
  const count = (id: string) => state.applications.filter((a) => a.resumeVersionId === id).length;

  if (state.resumes.length === 0) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PageHeader title="Resumes" description="Add a resume to see how a system reads it and what to fix first." />
        <EmptyState
          icon={<IconComposition icon={FileText} />}
          title="No resume yet"
          body="Add the sample resume or choose a file to see how a system reads it and what to fix first."
        />
        <UploadPanel />
      </div>
    );
  }

  const best = Math.max(...state.resumes.map((r) => r.parseHealth));
  const openFixes = activeResume ? activeResume.findings.filter((f) => !f.resolved).length : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-2">
      <PageHeader
        title="Resumes"
        description="Every version you have, with the scores it earned. Versions linked to applications are frozen, so you always know exactly what you sent."
        actions={
          !uploading && (
            <Button variant="primary" onClick={() => setUploading(true)}>
              <Plus className="size-4" aria-hidden />
              Upload new version
            </Button>
          )
        }
      />

      <Stagger className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-3">
        <Item>
          <StatCard icon={Layers} label="Versions" value={state.resumes.length} emphasis footnote="All your saved resumes" />
        </Item>
        <Item>
          <StatCard icon={ShieldCheck} label="Best parse health" value={best} footnote="Highest estimate of any version" />
        </Item>
        <Item>
          <StatCard icon={ListChecks} label="Open fixes" value={openFixes} footnote={`In your default version, ${activeResume?.label ?? ""}`} />
        </Item>
      </Stagger>

      {uploading && (
        <div className="pb-4">
          <UploadPanel onClose={() => setUploading(false)} />
        </div>
      )}

      <Stagger className="grid gap-4 md:grid-cols-2">
        {state.resumes.map((r) => (
          <Item key={r.id} className="h-full">
            <VersionCard r={r} isDefault={r.id === state.activeResumeId} appCount={count(r.id)} />
          </Item>
        ))}
        {!uploading && (
          <Item>
            <button
              type="button"
              onClick={() => setUploading(true)}
              className="flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-rule-strong bg-surface/50 p-6 text-center transition-colors hover:border-hl-ink hover:bg-hl-soft/40 h-full"
            >
              <IconComposition icon={Upload} />
              <span className="font-display text-lg font-bold">Upload a new version</span>
              <span className="max-w-xs text-sm text-muted">Drop a PDF or DOCX, or use the sample, to see a fresh report.</span>
            </button>
          </Item>
        )}
      </Stagger>
      <p className="pt-2 text-sm text-muted">Scores are estimates of reading and parsing problems, not a verdict on you.</p>
    </div>
  );
}

"use client";

import { Check, CheckCircle2, FileText, Loader2, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { initialState } from "@/demo/data";
import { useDemo } from "@/demo/store";
import type { ResumeVersion } from "@/demo/types";
import { cn } from "@/lib/cn";
import { TODAY } from "@/lib/dates";
import { DocSkeleton } from "./visual";

/** What the user picked. The demo always analyzes the sample content either way. */
export type ResumeSource = { kind: "sample" } | { kind: "file"; fileName: string };

export const ANALYSIS_STAGES = [
  "Reading text",
  "Finding sections",
  "Checking 20 readability and parsing rules",
  "Masking personal details",
] as const;

const STAGE_MS = [700, 800, 1300, 700];
const MAX_BYTES = 5 * 1024 * 1024;

function nextLabel(resumes: ResumeVersion[]): string {
  const nums = resumes.map((r) => Number(/^v(\d+)$/.exec(r.label)?.[1] ?? 0));
  return `v${Math.max(0, ...nums) + 1}`;
}

/** Clone of the active sample version with a fresh id, label and file name; findings start unresolved. */
export function cloneSample(base: ResumeVersion, resumes: ResumeVersion[], source: ResumeSource): ResumeVersion {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tailoredForJobId: _omit, ...rest } = base;
  const stem = source.kind === "file" ? source.fileName.replace(/\.[^.]+$/, "") : "Sample resume";
  return {
    ...rest,
    id: `rv${Date.now()}`,
    label: nextLabel(resumes),
    name: stem,
    fileName: source.kind === "file" ? source.fileName : "Sample_Resume.pdf",
    createdAt: `${TODAY}T09:00:00Z`,
    origin: "UPLOAD",
    state: "DRAFT",
    findings: base.findings.map((f) => ({ ...f, resolved: false })),
  };
}

export type RunStatus = "idle" | "running" | "done";

/**
 * Simulated analysis: honest stage labels with short delays, then a clone of the sample version
 * is added to the store and one analysis is counted. Nothing is actually parsed.
 */
export function useAnalysisRun(onDone?: (v: ResumeVersion) => void) {
  const { state, dispatch } = useDemo();
  const [status, setStatus] = useState<RunStatus>("idle");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<ResumeVersion | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  const start = useCallback(
    (source: ResumeSource) => {
      const base =
        state.resumes.find((r) => r.id === state.activeResumeId && r.origin === "UPLOAD") ??
        state.resumes.find((r) => r.origin === "UPLOAD") ??
        initialState.resumes[0];
      setStatus("running");
      setStage(0);
      let at = 0;
      STAGE_MS.forEach((ms, i) => {
        at += ms;
        timers.current.push(
          window.setTimeout(() => {
            if (i < STAGE_MS.length - 1) {
              setStage(i + 1);
              return;
            }
            const version = cloneSample(base, state.resumes, source);
            dispatch({ type: "ADD_RESUME", version });
            dispatch({ type: "INCREMENT_USAGE", key: "analyses" });
            setResult(version);
            setStage(STAGE_MS.length);
            setStatus("done");
            onDone?.(version);
          }, at),
        );
      });
    },
    [dispatch, onDone, state.activeResumeId, state.resumes],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setStage(0);
    setResult(null);
  }, []);

  return { status, stage, result, start, reset };
}

/** Stepper with a progress bar and a shimmering page skeleton while the (simulated) analysis runs. */
export function AnalysisProgress({ stage }: { stage: number }) {
  const pct = Math.min(100, Math.round(((stage + 0.5) / ANALYSIS_STAGES.length) * 100));
  return (
    <div className="grid items-start gap-6 sm:grid-cols-[1fr_14rem]">
      <div className="flex flex-col gap-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
          <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: "var(--viz)" }} />
        </div>
        <ol className="flex flex-col" aria-live="polite">
          {ANALYSIS_STAGES.map((label, i) => {
            const done = i < stage;
            const current = i === stage;
            return (
              <li key={label} className={cn("relative flex items-center gap-3 pb-4 last:pb-0", !done && !current && "text-muted")}>
                {i < ANALYSIS_STAGES.length - 1 && (
                  <span aria-hidden className={cn("absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 rounded-full", done ? "bg-hl-ink" : "bg-rule")} />
                )}
                <span
                  className={cn(
                    "relative flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done ? "border-hl-ink bg-hl text-on-hl" : current ? "border-hl-ink bg-surface glow" : "border-rule bg-surface",
                  )}
                >
                  {done ? (
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  ) : current ? (
                    <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                  ) : null}
                </span>
                <span className={cn(current && "font-semibold")}>
                  {label}
                  {done && <span className="sr-only"> (done)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <DocSkeleton className="hidden sm:flex" />
    </div>
  );
}

export function PrivacyNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2.5 text-sm text-muted", className)}>
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-hl-soft text-hl-ink">
        <ShieldCheck className="size-4" aria-hidden />
      </span>
      <span className="pt-0.5">
        Your email, phone, address and CNIC are masked before any AI sees your text. Your CNIC never belongs on a
        resume, so we flag it if we find it.
      </span>
    </p>
  );
}

/** Sample vs own file chooser. The note says plainly what the demo does with a chosen file. */
export function ResumeSourcePicker({
  disabled,
  actionLabel = "Analyze resume",
  onStart,
}: {
  disabled?: boolean;
  actionLabel?: string;
  onStart: (source: ResumeSource) => void;
}) {
  const [mode, setMode] = useState<"sample" | "file">("sample");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(pdf|docx)$/i.test(f.name)) {
      setError("That file type isn't supported. Choose a PDF or DOCX file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("That file is over 5 MB. Export a smaller PDF or DOCX and try again.");
      return;
    }
    setError("");
    setFile(f);
    setMode("file");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    accept(e.dataTransfer.files[0]);
  };

  const canStart = !disabled && (mode === "sample" || !!file);

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Resume to analyze" className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          role="radio"
          aria-checked={mode === "sample"}
          onClick={() => setMode("sample")}
          className={cn(
            "card card-hover flex min-h-44 flex-col items-start gap-2 p-5 text-left",
            mode === "sample" && "border-hl-ink bg-hl-soft/60 glow",
          )}
        >
          <span className="relative mb-1 grid size-12 place-items-center rounded-2xl bg-hl-soft text-hl-ink">
            <FileText className="size-6" aria-hidden />
            <Sparkles className="absolute -right-1.5 -top-1.5 size-4 text-hl-ink" aria-hidden />
          </span>
          <span className="flex w-full items-center justify-between gap-2 font-display text-base font-bold">
            Use the sample resume
            {mode === "sample" && <CheckCircle2 className="size-5 text-hl-ink" aria-hidden />}
          </span>
          <span className="text-sm text-muted">A realistic frontend developer resume with a few common problems.</span>
        </button>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex min-h-44 flex-col items-start gap-2 rounded-[20px] border-2 border-dashed p-5 transition-colors",
            mode === "file" ? "border-hl-ink bg-hl-soft/60" : "border-rule-strong bg-surface/60",
            over && "border-hl-ink bg-hl-soft",
          )}
        >
          <span className="relative mb-1 grid size-12 place-items-center" aria-hidden>
            <FileText className="absolute size-9 text-muted/50" style={{ transform: "translate(-8px, 2px) rotate(-12deg)" }} />
            <span className="relative grid size-10 place-items-center rounded-xl bg-ink text-paper">
              <Upload className="size-5" />
            </span>
          </span>
          <span className="break-all font-display text-base font-bold">{file ? file.name : "Drop your resume here"}</span>
          <span className="text-sm text-muted">PDF or DOCX, up to 5 MB. You can also drop it here.</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            aria-label="Resume file (PDF or DOCX)"
            onChange={(e) => accept(e.target.files?.[0])}
          />
          <Button size="sm" className="mt-auto" onClick={() => inputRef.current?.click()}>
            {file ? "Choose a different file" : "Choose a file"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <p className="rounded-xl bg-sunken px-4 py-3 text-sm">
        <span className="font-semibold">This is a demo.</span> It does not read your file. Whichever you pick, it
        analyzes the sample resume so you can see how the report works.
      </p>

      <PrivacyNote />

      <div>
        <Button
          variant="primary"
          size="lg"
          disabled={!canStart}
          onClick={() => onStart(mode === "sample" || !file ? { kind: "sample" } : { kind: "file", fileName: file.name })}
        >
          <Sparkles className="size-4" aria-hidden />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
